<?php

namespace BootDesk\ChatSDK\Slack;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\ChannelInfo;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\FormatConverter;
use BootDesk\ChatSDK\Core\Exceptions\AdapterException;
use BootDesk\ChatSDK\Core\FetchOptions;
use BootDesk\ChatSDK\Core\FetchResult;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;
use BootDesk\ChatSDK\Core\ThreadInfo;
use BootDesk\ChatSDK\Core\UserInfo;
use Nyholm\Psr7\Factory\Psr17Factory;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

class SlackAdapter implements Adapter
{
    private ?string $botUserId = null;

    private SlackFormatConverter $formatConverter;

    private ?SlackWebhookVerifier $webhookVerifier = null;

    public function __construct(
        private readonly string $botToken,
        ?string $signingSecret = null,
        private readonly string $apiUrl = 'https://slack.com/api/',
        private readonly ?ClientInterface $httpClient = null,
        private readonly ?Psr17Factory $psrFactory = null,
    ) {
        $this->formatConverter = new SlackFormatConverter;

        if ($signingSecret !== null) {
            $this->webhookVerifier = new SlackWebhookVerifier($signingSecret);
        }
    }

    public function getName(): string
    {
        return 'slack';
    }

    public function getBotUserId(): ?string
    {
        return $this->botUserId;
    }

    public function verifyWebhook(ServerRequestInterface $request): ?ResponseInterface
    {
        $body = (string) $request->getBody();

        // URL verification challenge
        $payload = json_decode($body, true);
        if (is_array($payload) && ($payload['type'] ?? null) === 'url_verification') {
            $factory = $this->psrFactory ?? new Psr17Factory;

            return $factory->createResponse(200)
                ->withHeader('Content-Type', 'application/json')
                ->withBody($factory->createStream(json_encode([
                    'challenge' => $payload['challenge'],
                ])));
        }

        // Verify signature if signing secret is configured
        if ($this->webhookVerifier instanceof \BootDesk\ChatSDK\Slack\SlackWebhookVerifier) {
            $this->webhookVerifier->verify($request, $body);
        }

        return null;
    }

    public function parseWebhook(ServerRequestInterface $request): Message
    {
        $body = (string) $request->getBody();
        $payload = json_decode($body, true);

        if ($payload === null) {
            throw new AdapterException('Invalid JSON payload from Slack');
        }

        $event = $payload['event'] ?? $payload;

        $text = $event['text'] ?? '';
        $userId = $event['user'] ?? ($event['bot_id'] ?? '');
        $messageTs = $event['ts'] ?? '';
        $channelId = $event['channel'] ?? '';
        $threadTs = $event['thread_ts'] ?? $messageTs;

        $isMention = isset($event['text']) && str_contains($event['text'], "<@{$this->botUserId}>");
        $isDM = str_starts_with($channelId, 'D');

        $threadId = $this->encodeThreadId([
            'channel' => $channelId,
            'thread_ts' => $threadTs,
        ]);

        return new Message(
            id: $messageTs,
            threadId: $threadId,
            author: new Author(
                id: $userId,
                isBot: isset($event['bot_id']),
            ),
            text: $text,
            formatted: $this->formatConverter->toAst($text),
            isMention: $isMention,
            isDM: $isDM,
            raw: $body,
        );
    }

    public function encodeThreadId(mixed $platformData): string
    {
        $channel = $platformData['channel'] ?? '';
        $threadTs = $platformData['thread_ts'] ?? '';

        return "slack:{$channel}:{$threadTs}";
    }

    public function decodeThreadId(string $threadId): mixed
    {
        $parts = explode(':', $threadId, 3);

        return [
            'channel' => $parts[1] ?? '',
            'thread_ts' => $parts[2] ?? '',
        ];
    }

    public function channelIdFromThreadId(string $threadId): string
    {
        return $this->decodeThreadId($threadId)['channel'];
    }

    public function postMessage(string $threadId, PostableMessage $message): SentMessage
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->buildMessageParams($message);
        $params['channel'] = $decoded['channel'];

        if ($decoded['thread_ts'] !== '' && $decoded['thread_ts'] !== null) {
            $params['thread_ts'] = $decoded['thread_ts'];
        }

        $response = $this->apiCall('chat.postMessage', $params);

        return new SentMessage(
            id: $response['ts'],
            threadId: $threadId,
            timestamp: $response['ts'],
        );
    }

    public function editMessage(string $threadId, string $messageId, PostableMessage $message): SentMessage
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->buildMessageParams($message);
        $params['channel'] = $decoded['channel'];
        $params['ts'] = $messageId;

        $response = $this->apiCall('chat.update', $params);

        return new SentMessage(
            id: $response['ts'],
            threadId: $threadId,
            timestamp: $response['ts'],
        );
    }

    public function deleteMessage(string $threadId, string $messageId): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $this->apiCall('chat.delete', [
            'channel' => $decoded['channel'],
            'ts' => $messageId,
        ]);
    }

    public function addReaction(string $threadId, string $messageId, string $emoji): void
    {
        $this->apiCall('reactions.add', [
            'channel' => $this->channelIdFromThreadId($threadId),
            'timestamp' => $messageId,
            'name' => $emoji,
        ]);
    }

    public function removeReaction(string $threadId, string $messageId, string $emoji): void
    {
        $this->apiCall('reactions.remove', [
            'channel' => $this->channelIdFromThreadId($threadId),
            'timestamp' => $messageId,
            'name' => $emoji,
        ]);
    }

    public function startTyping(string $threadId): void
    {
        // Slack doesn't support typing indicators via API
    }

    public function fetchMessages(string $threadId, ?FetchOptions $options = null): FetchResult
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = [
            'channel' => $decoded['channel'],
            'limit' => $options->limit ?? 50,
        ];

        if ($decoded['thread_ts'] !== '') {
            $params['ts'] = $decoded['thread_ts'];
        }

        $response = $this->apiCall('conversations.replies', $params);

        $messages = [];
        foreach ($response['messages'] ?? [] as $msg) {
            $messages[] = new Message(
                id: $msg['ts'],
                threadId: $threadId,
                author: new Author(id: $msg['user'] ?? ($msg['bot_id'] ?? '')),
                text: $msg['text'] ?? '',
            );
        }

        return new FetchResult(
            messages: $messages,
            nextCursor: $response['response_metadata']['next_cursor'] ?? null,
        );
    }

    public function fetchThread(string $threadId): ThreadInfo
    {
        $decoded = $this->decodeThreadId($threadId);

        $response = $this->apiCall('conversations.replies', [
            'channel' => $decoded['channel'],
            'ts' => $decoded['thread_ts'],
            'limit' => 1,
        ]);

        $messages = $response['messages'] ?? [];

        return new ThreadInfo(
            id: $threadId,
            channelId: $decoded['channel'],
            messageCount: count($messages),
        );
    }

    public function fetchChannelInfo(string $channelId): ?ChannelInfo
    {
        $response = $this->apiCall('conversations.info', ['channel' => $channelId]);
        $channel = $response['channel'] ?? null;

        if ($channel === null) {
            return null;
        }

        return new ChannelInfo(
            id: $channel['id'],
            name: $channel['name'] ?? '',
            topic: $channel['topic']['value'] ?? null,
            isPrivate: $channel['is_private'] ?? false,
        );
    }

    public function getUser(string $userId): ?UserInfo
    {
        $response = $this->apiCall('users.info', ['user' => $userId]);
        $user = $response['user'] ?? null;

        if ($user === null) {
            return null;
        }

        return new UserInfo(
            id: $user['id'],
            name: $user['name'] ?? ($user['profile']['real_name'] ?? ''),
            email: $user['profile']['email'] ?? null,
        );
    }

    public function openDM(string $userId): ?string
    {
        $response = $this->apiCall('conversations.open', ['users' => $userId]);

        return $response['channel']['id'] ?? null;
    }

    public function getFormatConverter(): ?FormatConverter
    {
        return $this->formatConverter;
    }

    public function initialize(Chat $chat): void
    {
        // Resolve bot user ID
        if ($this->botUserId === null) {
            try {
                $auth = $this->apiCall('auth.test', []);
                $this->botUserId = $auth['user_id'] ?? null;
            } catch (AdapterException) {
                // Will retry on next request
            }
        }
    }

    public function disconnect(): void
    {
        // No persistent connection to close
    }

    public function createResponse(): ?ResponseInterface
    {
        return null;
    }

    public function stream(string $threadId, iterable $textStream, array $options = []): ?SentMessage
    {
        // Slack doesn't support native streaming
        $fullText = '';
        foreach ($textStream as $chunk) {
            $fullText .= $chunk;
        }

        if ($fullText === '') {
            return null;
        }

        return $this->postMessage($threadId, PostableMessage::text($fullText));
    }

    private function buildMessageParams(PostableMessage $message): array
    {
        if ($message->isCard()) {
            $blocks = SlackCards::toBlockKit($message->content);

            return [
                'text' => $message->content->getFallbackText(),
                'blocks' => json_encode($blocks),
            ];
        }

        return $this->formatConverter->toSlackPayload($message);
    }

    private function apiCall(string $method, array $params): array
    {
        $factory = $this->psrFactory ?? new Psr17Factory;

        $body = json_encode(array_filter($params, fn ($v): bool => $v !== null));
        $request = $factory->createRequest('POST', $this->apiUrl.$method)
            ->withHeader('Authorization', "Bearer {$this->botToken}")
            ->withHeader('Content-Type', 'application/json')
            ->withBody($factory->createStream($body));

        if ($this->httpClient instanceof \Psr\Http\Client\ClientInterface) {
            $psrResponse = $this->httpClient->sendRequest($request);
            $responseBody = (string) $psrResponse->getBody();
        } else {
            $responseBody = $this->nativeHttpPost($this->apiUrl.$method, $body);
        }

        $data = json_decode($responseBody, true);

        if (! is_array($data)) {
            throw new AdapterException("Invalid JSON response from Slack API: {$method}");
        }

        if (($data['ok'] ?? false) === false) {
            $error = $data['error'] ?? 'unknown_error';
            throw new AdapterException("Slack API error ({$method}): {$error}");
        }

        return $data;
    }

    private function nativeHttpPost(string $url, string $body): string
    {
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => implode("\r\n", [
                    'Authorization: Bearer '.$this->botToken,
                    'Content-Type: application/json',
                ]),
                'content' => $body,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents($url, false, $context);

        if ($response === false) {
            throw new AdapterException("Failed to reach Slack API: {$url}");
        }

        return $response;
    }
}
