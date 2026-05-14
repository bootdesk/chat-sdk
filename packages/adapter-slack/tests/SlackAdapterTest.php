<?php

namespace BootDesk\ChatSDK\Slack\Tests;

use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Slack\SlackAdapter;
use Nyholm\Psr7\Factory\Psr17Factory;
use PHPUnit\Framework\TestCase;
use Psr\Http\Client\ClientInterface;
use Psr\Http\Message\RequestInterface;
use Psr\Http\Message\ResponseInterface;

class SlackAdapterTest extends TestCase
{
    private SlackAdapter $adapter;

    private Psr17Factory $factory;

    private array $capturedRequests = [];

    protected function setUp(): void
    {
        $this->factory = new Psr17Factory;
        $this->capturedRequests = [];

        $mockClient = new class($this->capturedRequests) implements ClientInterface
        {
            private array $responses = [];

            public function __construct(private array &$captured)
            {
                $factory = new Psr17Factory;

                $this->responses = [
                    'auth.test' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode(['ok' => true, 'user_id' => 'UBOT123']))
                    ),
                    'chat.postMessage' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode(['ok' => true, 'ts' => '1234567890.123456']))
                    ),
                    'chat.update' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode(['ok' => true, 'ts' => '1234567890.654321']))
                    ),
                    'chat.delete' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode(['ok' => true]))
                    ),
                    'reactions.add' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode(['ok' => true]))
                    ),
                    'reactions.remove' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode(['ok' => true]))
                    ),
                    'conversations.replies' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode([
                            'ok' => true,
                            'messages' => [
                                ['ts' => '111.222', 'text' => 'Hello', 'user' => 'U123'],
                                ['ts' => '111.333', 'text' => 'World', 'user' => 'U456'],
                            ],
                        ]))
                    ),
                    'conversations.info' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode([
                            'ok' => true,
                            'channel' => [
                                'id' => 'C123',
                                'name' => 'general',
                                'topic' => ['value' => 'Team chat'],
                                'is_private' => false,
                            ],
                        ]))
                    ),
                    'users.info' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode([
                            'ok' => true,
                            'user' => [
                                'id' => 'U123',
                                'name' => 'johndoe',
                                'profile' => ['real_name' => 'John Doe', 'email' => 'john@test.com'],
                            ],
                        ]))
                    ),
                    'conversations.open' => $factory->createResponse(200)->withBody(
                        $factory->createStream(json_encode([
                            'ok' => true,
                            'channel' => ['id' => 'D999'],
                        ]))
                    ),
                ];
            }

            public function sendRequest(RequestInterface $request): ResponseInterface
            {
                $uri = (string) $request->getUri();
                foreach ($this->responses as $key => $response) {
                    if (str_contains($uri, $key)) {
                        $this->captured[] = $request;

                        return $response;
                    }
                }

                $factory = new Psr17Factory;

                return $factory->createResponse(200)->withBody(
                    $factory->createStream(json_encode(['ok' => true]))
                );
            }
        };

        $this->adapter = new SlackAdapter(
            botToken: 'xoxb-test-token',
            signingSecret: 'test_secret',
            httpClient: $mockClient,
            psrFactory: $this->factory,
        );
    }

    public function test_get_name(): void
    {
        $this->assertSame('slack', $this->adapter->getName());
    }

    public function test_thread_id_encoding(): void
    {
        $id = $this->adapter->encodeThreadId(['channel' => 'C123', 'thread_ts' => '1234.5678']);
        $this->assertSame('slack:C123:1234.5678', $id);
    }

    public function test_thread_id_decoding(): void
    {
        $decoded = $this->adapter->decodeThreadId('slack:C123:1234.5678');
        $this->assertSame('C123', $decoded['channel']);
        $this->assertSame('1234.5678', $decoded['thread_ts']);
    }

    public function test_channel_id_from_thread(): void
    {
        $this->assertSame('C123', $this->adapter->channelIdFromThreadId('slack:C123:1234.5678'));
    }

    public function test_url_verification_challenge(): void
    {
        $body = json_encode(['type' => 'url_verification', 'challenge' => 'abc123']);
        $request = $this->factory->createServerRequest('POST', '/webhooks/slack')
            ->withBody($this->factory->createStream($body));

        $response = $this->adapter->verifyWebhook($request);

        $this->assertNotNull($response);
        $this->assertSame(200, $response->getStatusCode());

        $data = json_decode((string) $response->getBody(), true);
        $this->assertSame('abc123', $data['challenge']);
    }

    public function test_parse_webhook_message(): void
    {
        $this->adapter->initialize($this->createMock(Chat::class));

        $body = json_encode([
            'event' => [
                'type' => 'message',
                'text' => 'Hello world',
                'user' => 'U123',
                'ts' => '1234.5678',
                'channel' => 'C456',
                'thread_ts' => '1234.5678',
            ],
        ]);

        $timestamp = (string) time();
        $signature = 'v0='.hash_hmac('sha256', "v0:{$timestamp}:{$body}", 'test_secret');

        $request = $this->factory->createServerRequest('POST', '/webhooks/slack')
            ->withHeader('X-Slack-Request-Timestamp', $timestamp)
            ->withHeader('X-Slack-Signature', $signature)
            ->withBody($this->factory->createStream($body));

        $message = $this->adapter->parseWebhook($request);

        $this->assertSame('1234.5678', $message->id);
        $this->assertSame('slack:C456:1234.5678', $message->threadId);
        $this->assertSame('U123', $message->author->id);
        $this->assertSame('Hello world', $message->text);
    }

    public function test_parse_dm_message(): void
    {
        $body = json_encode([
            'event' => [
                'type' => 'message',
                'text' => 'Private msg',
                'user' => 'U123',
                'ts' => '1234.5678',
                'channel' => 'D999',
            ],
        ]);

        $request = $this->factory->createServerRequest('POST', '/webhooks/slack')
            ->withBody($this->factory->createStream($body));

        $message = $this->adapter->parseWebhook($request);
        $this->assertTrue($message->isDM);
    }

    public function test_post_message(): void
    {
        $sent = $this->adapter->postMessage(
            'slack:C123:1234.5678',
            PostableMessage::text('Hello Slack')
        );

        $this->assertSame('1234567890.123456', $sent->id);
        $this->assertSame('slack:C123:1234.5678', $sent->threadId);
    }

    public function test_edit_message(): void
    {
        $sent = $this->adapter->editMessage(
            'slack:C123:1234.5678',
            '1234.9999',
            PostableMessage::text('Updated')
        );

        $this->assertSame('1234567890.654321', $sent->id);
    }

    public function test_delete_message(): void
    {
        $this->adapter->deleteMessage('slack:C123:1234.5678', '1234.9999');
        $this->assertTrue(true); // No exception
    }

    public function test_add_reaction(): void
    {
        $this->adapter->addReaction('slack:C123:1234.5678', '1234.9999', 'thumbsup');
        $this->assertTrue(true);
    }

    public function test_remove_reaction(): void
    {
        $this->adapter->removeReaction('slack:C123:1234.5678', '1234.9999', 'thumbsup');
        $this->assertTrue(true);
    }

    public function test_fetch_messages(): void
    {
        $result = $this->adapter->fetchMessages('slack:C123:1234.5678');

        $this->assertCount(2, $result->messages);
        $this->assertSame('111.222', $result->messages[0]->id);
    }

    public function test_fetch_thread(): void
    {
        $info = $this->adapter->fetchThread('slack:C123:1234.5678');

        $this->assertSame('slack:C123:1234.5678', $info->id);
        $this->assertSame('C123', $info->channelId);
    }

    public function test_fetch_channel_info(): void
    {
        $info = $this->adapter->fetchChannelInfo('C123');

        $this->assertSame('C123', $info->id);
        $this->assertSame('general', $info->name);
        $this->assertSame('Team chat', $info->topic);
        $this->assertFalse($info->isPrivate);
    }

    public function test_get_user(): void
    {
        $user = $this->adapter->getUser('U123');

        $this->assertSame('U123', $user->id);
        $this->assertSame('johndoe', $user->name);
        $this->assertSame('john@test.com', $user->email);
    }

    public function test_open_dm(): void
    {
        $dmChannelId = $this->adapter->openDM('U123');
        $this->assertSame('D999', $dmChannelId);
    }

    public function test_get_format_converter(): void
    {
        $this->assertNotNull($this->adapter->getFormatConverter());
    }

    public function test_initialize_resolves_bot_user_id(): void
    {
        $chat = $this->createMock(Chat::class);
        $this->adapter->initialize($chat);

        $this->assertSame('UBOT123', $this->adapter->getBotUserId());
    }

    public function test_post_message_with_card(): void
    {
        $card = Card::make()
            ->header('Deploy Ready')
            ->section(fn ($s) => $s->text('Build passed'))
            ->actions([Button::primary('Deploy', 'deploy')]);

        $sent = $this->adapter->postMessage(
            'slack:C123:1234.5678',
            PostableMessage::card($card)
        );

        $this->assertSame('1234567890.123456', $sent->id);
    }

    public function test_stream_collects_and_posts(): void
    {
        $sent = $this->adapter->stream(
            'slack:C123:1234.5678',
            ['Hello ', 'world', '!'],
        );

        $this->assertNotNull($sent);
        $this->assertSame('1234567890.123456', $sent->id);
    }

    public function test_start_typing_is_noop(): void
    {
        $this->adapter->startTyping('slack:C123:1234.5678');
        $this->assertTrue(true);
    }

    public function test_disconnect_is_noop(): void
    {
        $this->adapter->disconnect();
        $this->assertTrue(true);
    }
}
