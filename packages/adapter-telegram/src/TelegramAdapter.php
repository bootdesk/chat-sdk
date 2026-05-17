<?php

namespace BootDesk\ChatSDK\Telegram;

use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\ChannelInfo;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\FormatConverter;
use BootDesk\ChatSDK\Core\Exceptions\AdapterException;
use BootDesk\ChatSDK\Core\Exceptions\AuthenticationException;
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

class TelegramAdapter implements Adapter
{
    protected ?string $botUserId = null;

    protected TelegramFormatConverter $formatConverter;

    protected ?string $secretToken;

    public function __construct(
        protected readonly string $botToken,
        protected readonly ClientInterface $httpClient,
        ?string $secretToken = null,
        protected readonly string $apiUrl = 'https://api.telegram.org',
        protected readonly ?Psr17Factory $psrFactory = null,
    ) {
        $this->secretToken = $secretToken;
        $this->formatConverter = new TelegramFormatConverter;
    }

    public function getName(): string
    {
        return 'telegram';
    }

    public function getBotUserId(): ?string
    {
        return $this->botUserId;
    }

    public function verifyWebhook(ServerRequestInterface $request): ?ResponseInterface
    {
        if ($this->secretToken !== null) {
            $headerToken = $request->getHeaderLine('x-telegram-bot-api-secret-token');

            if ($headerToken === '' || ! hash_equals($this->secretToken, $headerToken)) {
                throw new AuthenticationException('Invalid Telegram secret token');
            }
        }

        return null;
    }

    public function parseWebhook(ServerRequestInterface $request): Message
    {
        $body = (string) $request->getBody();
        $update = json_decode($body, true);

        if ($update === null) {
            throw new AdapterException('Invalid JSON payload from Telegram');
        }

        $tgMessage = $update['message']
            ?? $update['edited_message']
            ?? $update['channel_post']
            ?? $update['edited_channel_post']
            ?? null;

        // Handle callback queries (inline keyboard clicks)
        if (isset($update['callback_query']) && $tgMessage === null) {
            $cq = $update['callback_query'];
            $tgMessage = $cq['message'] ?? null;
        }

        if ($tgMessage === null) {
            throw new AdapterException('No message found in Telegram update');
        }

        $chatId = (string) $tgMessage['chat']['id'];
        $messageThreadId = $tgMessage['message_thread_id'] ?? null;
        $messageId = (string) $tgMessage['message_id'];
        $text = $tgMessage['text'] ?? $tgMessage['caption'] ?? '';
        $from = $tgMessage['from'] ?? null;

        // Apply entity formatting
        $entities = $tgMessage['entities'] ?? $tgMessage['caption_entities'] ?? [];
        if (! empty($entities) && $text !== '') {
            $text = $this->applyEntities($text, $entities);
        }

        $threadId = $this->encodeThreadId([
            'chatId' => $chatId,
            'messageThreadId' => $messageThreadId,
        ]);

        $isDM = ($tgMessage['chat']['type'] ?? '') === 'private';

        return new Message(
            id: $messageId,
            threadId: $threadId,
            author: new Author(
                id: $from ? (string) $from['id'] : '',
                name: $from ? trim(($from['first_name'] ?? '').' '.($from['last_name'] ?? '')) : '',
                isBot: $from['is_bot'] ?? false,
            ),
            text: $text,
            isMention: str_contains($text, "@{$this->botUserId}"),
            isDM: $isDM,
            raw: $body,
        );
    }

    public function encodeThreadId(mixed $platformData): string
    {
        $chatId = $platformData['chatId'] ?? '';
        $threadId = $platformData['messageThreadId'] ?? '';

        if ($threadId !== '') {
            return "telegram:{$chatId}:{$threadId}";
        }

        return "telegram:{$chatId}";
    }

    public function decodeThreadId(string $threadId): mixed
    {
        $parts = explode(':', $threadId, 3);

        return [
            'chatId' => $parts[1] ?? '',
            'messageThreadId' => $parts[2] ?? null,
        ];
    }

    public function channelIdFromThreadId(string $threadId): string
    {
        return $this->decodeThreadId($threadId)['chatId'];
    }

    public function postMessage(string $threadId, PostableMessage $message): SentMessage
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->buildMessageParams($message);
        $params['chat_id'] = $decoded['chatId'];

        if ($decoded['messageThreadId'] !== null) {
            $params['message_thread_id'] = (int) $decoded['messageThreadId'];
        }

        $response = $this->apiCall('sendMessage', $params);

        return new SentMessage(
            id: (string) $response['message_id'],
            threadId: $threadId,
            timestamp: isset($response['date']) ? (string) $response['date'] : null,
        );
    }

    public function editMessage(string $threadId, string $messageId, PostableMessage $message): SentMessage
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->buildMessageParams($message);
        $params['chat_id'] = $decoded['chatId'];
        $params['message_id'] = (int) $messageId;

        $response = $this->apiCall('editMessageText', $params);

        return new SentMessage(
            id: (string) ($response['message_id'] ?? $messageId),
            threadId: $threadId,
        );
    }

    public function deleteMessage(string $threadId, string $messageId): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $this->apiCall('deleteMessage', [
            'chat_id' => $decoded['chatId'],
            'message_id' => (int) $messageId,
        ]);
    }

    public function addReaction(string $threadId, string $messageId, string $emoji): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $this->apiCall('setMessageReaction', [
            'chat_id' => $decoded['chatId'],
            'message_id' => (int) $messageId,
            'reaction' => [['type' => 'emoji', 'emoji' => $emoji]],
        ]);
    }

    public function removeReaction(string $threadId, string $messageId, string $emoji): void
    {
        // Telegram doesn't have a direct "remove reaction" — setMessageReaction with empty clears all
        $decoded = $this->decodeThreadId($threadId);
        $this->apiCall('setMessageReaction', [
            'chat_id' => $decoded['chatId'],
            'message_id' => (int) $messageId,
            'reaction' => [],
        ]);
    }

    public function startTyping(string $threadId): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $this->apiCall('sendChatAction', [
            'chat_id' => $decoded['chatId'],
            'action' => 'typing',
        ]);
    }

    public function fetchMessages(string $threadId, ?FetchOptions $options = null): FetchResult
    {
        // Telegram doesn't have a direct message history fetch for regular chats.
        // This is a best-effort via getUpdates or forwarding.
        return new FetchResult(messages: []);
    }

    public function fetchThread(string $threadId): ThreadInfo
    {
        $decoded = $this->decodeThreadId($threadId);

        return new ThreadInfo(
            id: $threadId,
            channelId: $decoded['chatId'],
        );
    }

    public function fetchChannelInfo(string $channelId): ?ChannelInfo
    {
        $response = $this->apiCall('getChat', ['chat_id' => $channelId]);

        return new ChannelInfo(
            id: (string) $response['id'],
            name: $response['title'] ?? ($response['username'] ?? ''),
            isPrivate: ($response['type'] ?? '') === 'private',
        );
    }

    public function getUser(string $userId): ?UserInfo
    {
        $response = $this->apiCall('getChat', ['chat_id' => $userId]);

        if (($response['type'] ?? '') !== 'private') {
            return null;
        }

        return new UserInfo(
            id: (string) $response['id'],
            name: trim(($response['first_name'] ?? '').' '.($response['last_name'] ?? '')),
        );
    }

    public function openDM(string $userId): ?string
    {
        // Telegram doesn't need explicit DM opening — just send to user ID
        return $userId;
    }

    public function getFormatConverter(): ?FormatConverter
    {
        return $this->formatConverter;
    }

    public function initialize(Chat $chat): void
    {
        try {
            $me = $this->apiCall('getMe', []);
            $this->botUserId = (string) $me['id'];
        } catch (AdapterException) {
            // Will retry later
        }
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

    protected function buildMessageParams(PostableMessage $message): array
    {
        if ($message->isCard()) {
            $keyboard = TelegramCards::toInlineKeyboard($message->content);

            $params = [
                'text' => $message->content->getFallbackText(),
            ];

            if ($keyboard !== null) {
                $params['reply_markup'] = json_encode($keyboard);
            }

            return $params;
        }

        $content = (string) $message->content;

        return [
            'text' => $this->formatConverter->escapeMarkdownV2($content),
            'parse_mode' => 'MarkdownV2',
        ];
    }

    protected function apiCall(string $method, array $params): array
    {
        $factory = $this->psrFactory ?? new Psr17Factory;
        $url = "{$this->apiUrl}/bot{$this->botToken}/{$method}";

        $body = json_encode(array_filter($params, fn ($v): bool => $v !== null));
        $request = $factory->createRequest('POST', $url)
            ->withHeader('Content-Type', 'application/json')
            ->withBody($factory->createStream($body));

        $psrResponse = $this->httpClient->sendRequest($request);
        $responseBody = (string) $psrResponse->getBody();

        $data = json_decode($responseBody, true);

        if (! is_array($data)) {
            throw new AdapterException("Invalid JSON response from Telegram API: {$method}");
        }

        if (($data['ok'] ?? false) === false) {
            $error = $data['description'] ?? ($data['error_code'] ?? 'unknown_error');
            throw new AdapterException("Telegram API error ({$method}): {$error}");
        }

        $result = $data['result'] ?? $data;

        return is_array($result) ? $result : ['ok' => true];
    }

    protected function applyEntities(string $text, array $entities): string
    {
        // Sort by offset descending so replacements don't shift offsets
        usort($entities, fn (array $a, array $b): int => $b['offset'] <=> $a['offset']);

        foreach ($entities as $entity) {
            $start = $entity['offset'];
            $end = $start + $entity['length'];
            $entityText = substr($text, $start, $entity['length']);

            $replacement = match ($entity['type']) {
                'bold' => "**{$entityText}**",
                'italic' => "*{$entityText}*",
                'code' => "`{$entityText}`",
                'pre' => "```\n{$entityText}\n```",
                'strikethrough' => "~~{$entityText}~~",
                'text_link' => isset($entity['url']) ? "[{$entityText}]({$entity['url']})" : $entityText,
                default => null,
            };

            if ($replacement !== null) {
                $text = substr($text, 0, $start).$replacement.substr($text, $end);
            }
        }

        return $text;
    }
}
