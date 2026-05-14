<?php

namespace BootDesk\ChatSDK\WhatsApp;

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

class WhatsAppAdapter implements Adapter
{
    private ?string $botUserId = null;

    private WhatsAppFormatConverter $formatConverter;

    private ?WhatsAppWebhookVerifier $webhookVerifier = null;

    public function __construct(
        private readonly string $accessToken,
        private readonly ClientInterface $httpClient,
        private readonly string $phoneNumberId,
        ?string $appSecret = null,
        ?string $verifyToken = null,
        private readonly string $apiUrl = 'https://graph.facebook.com/v21.0',
        private readonly ?Psr17Factory $psrFactory = null,
    ) {
        $this->formatConverter = new WhatsAppFormatConverter;

        if ($appSecret !== null && $verifyToken !== null) {
            $this->webhookVerifier = new WhatsAppWebhookVerifier($appSecret, $verifyToken);
        }
    }

    public function getName(): string
    {
        return 'whatsapp';
    }

    public function getBotUserId(): ?string
    {
        return $this->botUserId;
    }

    public function verifyWebhook(ServerRequestInterface $request): ?ResponseInterface
    {
        $factory = $this->psrFactory ?? new Psr17Factory;

        // GET = verification challenge
        if (strtoupper($request->getMethod()) === 'GET') {
            if ($this->webhookVerifier instanceof WhatsAppWebhookVerifier) {
                $challenge = $this->webhookVerifier->handleVerificationChallenge($request);
                if ($challenge !== null) {
                    return $factory->createResponse(200)
                        ->withBody($factory->createStream($challenge));
                }
            }

            return $factory->createResponse(403);
        }

        // POST = verify HMAC signature
        $body = (string) $request->getBody();

        if ($this->webhookVerifier instanceof WhatsAppWebhookVerifier) {
            $this->webhookVerifier->verifyWebhookSignature($request, $body);
        }

        return null;
    }

    public function parseWebhook(ServerRequestInterface $request): Message
    {
        $body = (string) $request->getBody();
        $payload = json_decode($body, true);

        if ($payload === null) {
            throw new AdapterException('Invalid JSON payload from WhatsApp');
        }

        // Navigate the webhook envelope: entry[].changes[].value
        foreach ($payload['entry'] ?? [] as $entry) {
            foreach ($entry['changes'] ?? [] as $change) {
                if (($change['field'] ?? '') !== 'messages') {
                    continue;
                }

                $value = $change['value'] ?? [];
                $messages = $value['messages'] ?? [];
                $contacts = $value['contacts'] ?? [];
                $phoneNumberId = $value['metadata']['phone_number_id'] ?? $this->phoneNumberId;

                foreach ($messages as $msg) {
                    if (isset($msg['reaction']) || ($msg['type'] ?? '') === 'reaction') {
                        continue;
                    }

                    return $this->parseInboundMessage($msg, $contacts[0] ?? null, $phoneNumberId, $body);
                }
            }
        }

        throw new AdapterException('No message found in WhatsApp webhook payload');
    }

    public function encodeThreadId(mixed $platformData): string
    {
        $phoneNumberId = $platformData['phoneNumberId'] ?? $this->phoneNumberId;
        $userWaId = $platformData['userWaId'] ?? '';

        return "whatsapp:{$phoneNumberId}:{$userWaId}";
    }

    public function decodeThreadId(string $threadId): mixed
    {
        $parts = explode(':', $threadId, 3);

        return [
            'phoneNumberId' => $parts[1] ?? $this->phoneNumberId,
            'userWaId' => $parts[2] ?? '',
        ];
    }

    public function channelIdFromThreadId(string $threadId): string
    {
        return $this->decodeThreadId($threadId)['userWaId'];
    }

    public function postMessage(string $threadId, PostableMessage $message): SentMessage
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->buildMessageParams($message);
        $params = $this->addRecipientParam($params, $decoded['userWaId']);
        $params['messaging_product'] = 'whatsapp';

        $response = $this->apiCall("/{$this->phoneNumberId}/messages", $params);

        $msgId = $response['messages'][0]['id'] ?? uniqid('wa_', true);

        return new SentMessage(
            id: $msgId,
            threadId: $threadId,
        );
    }

    public function editMessage(string $threadId, string $messageId, PostableMessage $message): SentMessage
    {
        // WhatsApp doesn't support editing messages — resend
        return $this->postMessage($threadId, $message);
    }

    public function deleteMessage(string $threadId, string $messageId): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->addRecipientParam([
            'messaging_product' => 'whatsapp',
            'message_id' => $messageId,
            'status' => 'read', // Mark as read (closest to "delete" in WhatsApp)
        ], $decoded['userWaId']);
        $this->apiCall("/{$this->phoneNumberId}/messages", $params);
    }

    public function addReaction(string $threadId, string $messageId, string $emoji): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->addRecipientParam([
            'messaging_product' => 'whatsapp',
            'type' => 'reaction',
            'reaction' => [
                'message_id' => $messageId,
                'emoji' => $emoji,
            ],
        ], $decoded['userWaId']);
        $this->apiCall("/{$this->phoneNumberId}/messages", $params);
    }

    public function removeReaction(string $threadId, string $messageId, string $emoji): void
    {
        $decoded = $this->decodeThreadId($threadId);
        $params = $this->addRecipientParam([
            'messaging_product' => 'whatsapp',
            'type' => 'reaction',
            'reaction' => [
                'message_id' => $messageId,
                'emoji' => '',
            ],
        ], $decoded['userWaId']);
        $this->apiCall("/{$this->phoneNumberId}/messages", $params);
    }

    public function startTyping(string $threadId): void
    {
        // WhatsApp doesn't support typing indicators
    }

    public function fetchMessages(string $threadId, ?FetchOptions $options = null): FetchResult
    {
        return new FetchResult(messages: []);
    }

    public function fetchThread(string $threadId): ThreadInfo
    {
        $decoded = $this->decodeThreadId($threadId);

        return new ThreadInfo(
            id: $threadId,
            channelId: $decoded['phoneNumberId'],
        );
    }

    public function fetchChannelInfo(string $channelId): ?ChannelInfo
    {
        return null;
    }

    public function getUser(string $userId): ?UserInfo
    {
        return new UserInfo(
            id: $userId,
            name: $userId,
        );
    }

    public function openDM(string $userId): ?string
    {
        // WhatsApp is always 1:1 — just return the encoded thread ID
        return $this->encodeThreadId(['userWaId' => $userId]);
    }

    public function getFormatConverter(): ?FormatConverter
    {
        return $this->formatConverter;
    }

    public function initialize(Chat $chat): void
    {
        $this->botUserId = $this->phoneNumberId;
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

    private function parseInboundMessage(array $msg, ?array $contact, string $phoneNumberId, string $rawBody): Message
    {
        $text = $msg['text']['body']
            ?? $msg['caption']
            ?? $msg['button']['text']
            ?? $msg['interactive']['button_reply']['title']
            ?? '';

        $userWaId = $msg['from'] ?? $msg['from_user_id'] ?? '';
        $msgId = $msg['id'] ?? '';

        $threadId = $this->encodeThreadId([
            'phoneNumberId' => $phoneNumberId,
            'userWaId' => $userWaId,
        ]);

        $contactName = $contact['profile']['name']
            ?? $contact['profile']['username']
            ?? $userWaId;

        return new Message(
            id: $msgId,
            threadId: $threadId,
            author: new Author(
                id: $userWaId,
                name: $contactName,
                isBot: false,
            ),
            text: $text,
            isDM: true,
            raw: $rawBody,
        );
    }

    private function addRecipientParam(array $params, string $userWaId): array
    {
        if (preg_match('/^[A-Z]{2}\./', $userWaId)) {
            $params['recipient'] = $userWaId;
        } else {
            $params['to'] = $userWaId;
        }

        return $params;
    }

    private function buildMessageParams(PostableMessage $message): array
    {
        if ($message->isTemplate()) {
            $template = $message->content;

            if ($template instanceof WhatsAppTemplate) {
                return $template->toWhatsApp();
            }

            throw new AdapterException('Unsupported template type for WhatsApp adapter');
        }

        if ($message->isCard()) {
            $interactive = WhatsAppCards::toInteractiveMessage($message->content);

            if ($interactive !== null) {
                return [
                    'type' => 'interactive',
                    'interactive' => $interactive,
                ];
            }

            return [
                'type' => 'text',
                'text' => ['body' => WhatsAppCards::cardToText($message->content)],
            ];
        }

        $content = (string) $message->content;

        return [
            'type' => 'text',
            'text' => ['body' => $content],
        ];
    }

    private function apiCall(string $endpoint, array $params): array
    {
        $factory = $this->psrFactory ?? new Psr17Factory;
        $url = "{$this->apiUrl}{$endpoint}";

        $body = json_encode(array_filter($params, fn ($v): bool => $v !== null));
        $request = $factory->createRequest('POST', $url)
            ->withHeader('Authorization', "Bearer {$this->accessToken}")
            ->withHeader('Content-Type', 'application/json')
            ->withBody($factory->createStream($body));

        $psrResponse = $this->httpClient->sendRequest($request);
        $responseBody = (string) $psrResponse->getBody();

        $data = json_decode($responseBody, true);

        if (! is_array($data)) {
            throw new AdapterException("Invalid JSON response from WhatsApp API: {$endpoint}");
        }

        if (isset($data['error'])) {
            $error = $data['error']['message'] ?? ($data['error']['code'] ?? 'unknown_error');
            throw new AdapterException("WhatsApp API error ({$endpoint}): {$error}");
        }

        return $data;
    }
}
