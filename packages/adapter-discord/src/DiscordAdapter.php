<?php

namespace BootDesk\ChatSDK\Discord;

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

class DiscordAdapter implements Adapter
{
    private ?string $botUserId = null;

    private DiscordFormatConverter $formatConverter;

    private ?DiscordWebhookVerifier $webhookVerifier = null;

    public function __construct(
        private readonly string $botToken,
        private readonly ClientInterface $httpClient,
        string $publicKey,
        private readonly string $applicationId,
        private readonly string $apiUrl = 'https://discord.com/api/v10',
        private readonly ?Psr17Factory $psrFactory = null,
    ) {
        $this->formatConverter = new DiscordFormatConverter;
        $this->webhookVerifier = new DiscordWebhookVerifier($publicKey);
    }

    public function getName(): string
    {
        return 'discord';
    }

    public function getBotUserId(): ?string
    {
        return $this->botUserId;
    }

    public function verifyWebhook(ServerRequestInterface $request): ?ResponseInterface
    {
        $body = (string) $request->getBody();

        $payload = json_decode($body, true);
        if (is_array($payload) && ($payload['type'] ?? 0) === 1) {
            $factory = $this->psrFactory ?? new Psr17Factory;

            return $factory->createResponse(200)
                ->withHeader('Content-Type', 'application/json')
                ->withBody($factory->createStream(json_encode(['type' => 1])));
        }

        $signature = $request->getHeaderLine('x-signature-ed25519');
        $timestamp = $request->getHeaderLine('x-signature-timestamp');

        if ($signature !== '' && $timestamp !== '') {
            $this->webhookVerifier->verify($body, $signature, $timestamp);
        }

        return null;
    }

    public function parseWebhook(ServerRequestInterface $request): Message
    {
        $body = (string) $request->getBody();
        $interaction = json_decode($body, true);

        if ($interaction === null) {
            throw new AdapterException('Invalid JSON payload from Discord');
        }

        $type = $interaction['type'] ?? 0;

        // Type 2 = APPLICATION_COMMAND, Type 3 = MESSAGE_COMPONENT
        // Type 4 = Gateway forwarded event
        if ($type === 3 && isset($interaction['data']['custom_id'])) {
            return $this->parseComponentInteraction($interaction, $body);
        }

        // For gateway-forwarded MESSAGE_CREATE events
        if (isset($interaction['type']) && str_starts_with($interaction['type'], 'GATEWAY_')) {
            return $this->parseGatewayEvent($interaction, $body);
        }

        // Fallback: parse as regular message interaction
        $channelId = $interaction['channel_id'] ?? '';
        $guildId = $interaction['guild_id'] ?? '@me';
        $user = $interaction['member']['user'] ?? $interaction['user'] ?? [];
        $text = $interaction['data']['options'][0]['value'] ?? '';

        $threadId = $this->encodeThreadId([
            'channelId' => $channelId,
            'guildId' => $guildId,
        ]);

        return new Message(
            id: $interaction['id'] ?? uniqid('dc_'),
            threadId: $threadId,
            author: new Author(
                id: $user['id'] ?? '',
                name: $user['global_name'] ?? ($user['username'] ?? ''),
                isBot: $user['bot'] ?? false,
            ),
            text: $text,
            isDM: $guildId === '@me',
            raw: $body,
        );
    }

    public function encodeThreadId(mixed $platformData): string
    {
        $channelId = $platformData['channelId'] ?? '';
        $guildId = $platformData['guildId'] ?? '@me';
        $threadId = $platformData['threadId'] ?? null;

        if ($threadId !== null && $threadId !== '') {
            return "discord:{$guildId}:{$channelId}:{$threadId}";
        }

        return "discord:{$guildId}:{$channelId}";
    }

    public function decodeThreadId(string $threadId): mixed
    {
        $parts = explode(':', $threadId, 4);

        return [
            'guildId' => $parts[1] ?? '@me',
            'channelId' => $parts[2] ?? '',
            'threadId' => $parts[3] ?? null,
        ];
    }

    public function channelIdFromThreadId(string $threadId): string
    {
        $decoded = $this->decodeThreadId($threadId);

        return $decoded['threadId'] ?? $decoded['channelId'];
    }

    public function postMessage(string $threadId, PostableMessage $message): SentMessage
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];

        $params = $this->buildMessageParams($message);

        $response = $this->apiCall("/channels/{$channelId}/messages", $params);

        return new SentMessage(
            id: $response['id'] ?? '',
            threadId: $threadId,
            timestamp: $response['timestamp'] ?? null,
        );
    }

    public function editMessage(string $threadId, string $messageId, PostableMessage $message): SentMessage
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];

        $params = $this->buildMessageParams($message);

        $response = $this->apiCall("/channels/{$channelId}/messages/{$messageId}", $params, 'PATCH');

        return new SentMessage(
            id: $response['id'] ?? $messageId,
            threadId: $threadId,
        );
    }

    public function deleteMessage(string $threadId, string $messageId): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];

        $this->apiCall("/channels/{$channelId}/messages/{$messageId}", [], 'DELETE');
    }

    public function addReaction(string $threadId, string $messageId, string $emoji): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];
        $encodedEmoji = urlencode($emoji);

        $this->apiCall("/channels/{$channelId}/messages/{$messageId}/reactions/{$encodedEmoji}/@me", [], 'PUT');
    }

    public function removeReaction(string $threadId, string $messageId, string $emoji): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];
        $encodedEmoji = urlencode($emoji);

        $this->apiCall("/channels/{$channelId}/messages/{$messageId}/reactions/{$encodedEmoji}/@me", [], 'DELETE');
    }

    public function startTyping(string $threadId): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];

        $this->apiCall("/channels/{$channelId}/typing", [], 'POST');
    }

    public function fetchMessages(string $threadId, ?FetchOptions $options = null): FetchResult
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];

        $params = ['limit' => $options->limit ?? 50];

        $response = $this->apiCall("/channels/{$channelId}/messages?".http_build_query($params), [], 'GET');

        $messages = [];
        foreach ($response as $msg) {
            $messages[] = new Message(
                id: $msg['id'],
                threadId: $threadId,
                author: new Author(id: $msg['author']['id'] ?? '', isBot: $msg['author']['bot'] ?? false),
                text: $msg['content'] ?? '',
            );
        }

        return new FetchResult(messages: $messages);
    }

    public function fetchThread(string $threadId): ThreadInfo
    {
        $decoded = $this->decodeThreadId($threadId);
        $channelId = $decoded['threadId'] ?? $decoded['channelId'];

        $response = $this->apiCall("/channels/{$channelId}", [], 'GET');

        return new ThreadInfo(
            id: $threadId,
            channelId: $response['parent_id'] ?? $channelId,
            messageCount: $response['message_count'] ?? 0,
        );
    }

    public function fetchChannelInfo(string $channelId): ?ChannelInfo
    {
        $response = $this->apiCall("/channels/{$channelId}", [], 'GET');

        return new ChannelInfo(
            id: $response['id'],
            name: $response['name'] ?? '',
            topic: $response['topic'] ?? null,
            isPrivate: ($response['type'] ?? 0) === 1,
        );
    }

    public function getUser(string $userId): ?UserInfo
    {
        $response = $this->apiCall("/users/{$userId}", [], 'GET');

        return new UserInfo(
            id: $response['id'],
            name: $response['global_name'] ?? ($response['username'] ?? ''),
        );
    }

    public function openDM(string $userId): ?string
    {
        $response = $this->apiCall('/users/@me/channels', [
            'recipient_id' => $userId,
        ]);

        $channelId = $response['id'] ?? null;

        if ($channelId === null) {
            return null;
        }

        return $this->encodeThreadId([
            'channelId' => $channelId,
            'guildId' => '@me',
        ]);
    }

    public function getFormatConverter(): ?FormatConverter
    {
        return $this->formatConverter;
    }

    public function initialize(Chat $chat): void
    {
        $this->botUserId = $this->applicationId;
    }

    public function disconnect(): void
    {
        // No persistent connection
    }

    public function createResponse(): ?ResponseInterface
    {
        return null;
    }

    public function stream(string $threadId, iterable $textStream, array $options = []): ?SentMessage
    {
        $fullText = '';
        foreach ($textStream as $chunk) {
            $fullText .= $chunk;
        }

        if ($fullText === '') {
            return null;
        }

        return $this->postMessage($threadId, PostableMessage::text($fullText));
    }

    private function parseComponentInteraction(array $interaction, string $rawBody): Message
    {
        $customId = $interaction['data']['custom_id'] ?? '';
        $decoded = DiscordCards::decodeCustomId($customId);

        $channelId = $interaction['channel_id'] ?? '';
        $guildId = $interaction['guild_id'] ?? '@me';
        $user = $interaction['member']['user'] ?? $interaction['user'] ?? [];

        $threadId = $this->encodeThreadId([
            'channelId' => $channelId,
            'guildId' => $guildId,
        ]);

        return new Message(
            id: $interaction['id'] ?? '',
            threadId: $threadId,
            author: new Author(
                id: $user['id'] ?? '',
                name: $user['global_name'] ?? ($user['username'] ?? ''),
                isBot: $user['bot'] ?? false,
            ),
            text: $decoded['actionId'].($decoded['value'] ? ": {$decoded['value']}" : ''),
            raw: $rawBody,
        );
    }

    private function parseGatewayEvent(array $event, string $rawBody): Message
    {
        $data = $event['data'] ?? [];

        $channelId = $data['channel_id'] ?? '';
        $guildId = $data['guild_id'] ?? '@me';
        $author = $data['author'] ?? [];
        $text = $data['content'] ?? '';

        $threadInfo = $data['thread'] ?? null;

        $threadId = $this->encodeThreadId([
            'channelId' => $threadInfo['parent_id'] ?? $channelId,
            'guildId' => $guildId,
            'threadId' => $threadInfo['id'] ?? (($data['channel_type'] ?? 0) >= 11 ? $channelId : null),
        ]);

        $isMention = $data['is_mention'] ?? false;

        return new Message(
            id: $data['id'] ?? uniqid('dc_'),
            threadId: $threadId,
            author: new Author(
                id: $author['id'] ?? '',
                name: $author['global_name'] ?? ($author['username'] ?? ''),
                isBot: $author['bot'] ?? false,
            ),
            text: $text,
            isMention: $isMention,
            isDM: $guildId === '@me',
            raw: $rawBody,
        );
    }

    private function buildMessageParams(PostableMessage $message): array
    {
        if ($message->isCard()) {
            $payload = DiscordCards::toDiscordPayload($message->content);

            return [
                'content' => $message->content->getFallbackText(),
                'embeds' => $payload['embeds'],
                'components' => $payload['components'],
            ];
        }

        $content = $this->formatConverter->convertMentionsToDiscord((string) $message->content);

        if (strlen($content) > 2000) {
            $content = substr($content, 0, 1997).'...';
        }

        return ['content' => $content];
    }

    private function apiCall(string $endpoint, array $params, string $method = 'POST'): array
    {
        $factory = $this->psrFactory ?? new Psr17Factory;
        $url = "{$this->apiUrl}{$endpoint}";

        if ($method === 'GET') {
            $request = $factory->createRequest('GET', $url)
                ->withHeader('Authorization', "Bot {$this->botToken}");
        } else {
            $body = json_encode(array_filter($params, fn ($v): bool => $v !== null));
            $request = $factory->createRequest($method, $url)
                ->withHeader('Authorization', "Bot {$this->botToken}")
                ->withHeader('Content-Type', 'application/json')
                ->withBody($factory->createStream($body));
        }

        $psrResponse = $this->httpClient->sendRequest($request);
        $responseBody = (string) $psrResponse->getBody();

        $data = json_decode($responseBody, true);

        if ($data === null) {
            return [];
        }

        if (! is_array($data)) {
            throw new AdapterException("Invalid JSON response from Discord API: {$endpoint}");
        }

        if (isset($data['code']) && $data['code'] !== 200) {
            $error = $data['message'] ?? $data['code'];
            throw new AdapterException("Discord API error ({$endpoint}): {$error}");
        }

        return $data;
    }
}
