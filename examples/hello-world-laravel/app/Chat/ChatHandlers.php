<?php

namespace App\Chat;

use BootDesk\ChatSDK\Core\ActionEvent;
use BootDesk\ChatSDK\Core\AppHomeOpenedEvent;
use BootDesk\ChatSDK\Core\AssistantContextChangedEvent;
use BootDesk\ChatSDK\Core\AssistantThreadStartedEvent;
use BootDesk\ChatSDK\Core\Attachment;
use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\ButtonStyle;
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Cards\TableAlignment;
use BootDesk\ChatSDK\Core\Cards\TextStyle;
use BootDesk\ChatSDK\Core\Channel;
use BootDesk\ChatSDK\Core\ChannelInfo;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Events\OutgoingReactionEvent;
use BootDesk\ChatSDK\Core\FileUpload;
use BootDesk\ChatSDK\Core\MemberJoinedChannelEvent;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Core\MessageDeliveredEvent;
use BootDesk\ChatSDK\Core\MessageFailedEvent;
use BootDesk\ChatSDK\Core\MessageReadEvent;
use BootDesk\ChatSDK\Core\ModalCloseEvent;
use BootDesk\ChatSDK\Core\Modals\ExternalSelect;
use BootDesk\ChatSDK\Core\Modals\Modal;
use BootDesk\ChatSDK\Core\Modals\TextInput;
use BootDesk\ChatSDK\Core\ModalSubmitEvent;
use BootDesk\ChatSDK\Core\OptionsLoadEvent;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\ReactionEvent;
use BootDesk\ChatSDK\Core\SlashCommandEvent;
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandler;
use BootDesk\ChatSDK\Web\Cards\WebAudioCard;
use BootDesk\ChatSDK\Web\Cards\WebCarouselCard;
use BootDesk\ChatSDK\Web\Cards\WebLocationCard;
use BootDesk\ChatSDK\Web\Cards\WebPollCard;
use BootDesk\ChatSDK\Web\Cards\WebProductCard;
use BootDesk\ChatSDK\Web\Cards\WebVideoCard;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Override;

class ChatHandlers implements ChatHandler
{
    #[Override]
    public function register(Chat $chat): void
    {
        // Subscribed thread — every message goes here instead of Mention/Pattern.
        // Subscribe via the /subscribe slash command or the fallback.
        $chat->onSubscribedMessage(function (MessageContext $ctx): void {
            $ctx->thread->post("You said in this subscribed thread: {$ctx->message->text}");
        });

        // Mention handler — fires when the bot is @-mentioned outside a subscribed thread.
        $chat->onNewMention(function (MessageContext $ctx): void {
            $ctx->thread->post('You mentioned me! Use `/help` to see what I can do.');
        });

        // Pattern-matched messages (unsubscribed threads only — including DMs)
        $chat->onNewMessage('/^(hello|hi|hey)$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');

            $reply = $ctx->message->isDM
                ? 'Hey there! I\'m a bot. Send `/help` to see what I can do.'
                : 'Hey there! Mention me or send `/help` to see what I can do.';

            if ($ctx->skippedMessages) {
                $reply .= ' (Has Skipped messages: '.implode(
                    ', ',
                    \array_map(
                        fn (Message $message): string => $message->text,
                        $ctx->skippedMessages
                    )
                );
            }

            $ctx->thread->post($reply);
        });

        $chat->onNewMessage('/^order\s+(.+)$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');

            $item = trim(preg_replace('/^order\s+/i', '', $ctx->message->text));

            $card = Card::make()
                ->header("Order: {$item}")
                ->section(fn ($s) => $s->text("Confirm your order for **{$item}**?"))
                ->actions([
                    Button::primary('Confirm', 'order_confirm', ['item' => $item], actionHref: 'https://picsum.photos/seed/'.urlencode($item).'/800/200'),
                    Button::danger('Cancel', 'order_cancel', actionHref: 'https://picsum.photos/seed/cancel/800/200'),
                ]);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^status$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $card = Card::make()
                ->header('System Status')
                ->imageUrl('https://picsum.photos/seed/status/800/200', 'System status banner')
                ->text('All services are operational.', TextStyle::Bold)
                ->divider()
                ->table(
                    ['Service', 'Status', 'Uptime'],
                    [
                        ['API', '✅ Healthy', '99.9%'],
                        ['Database', '✅ Connected', '99.8%'],
                        ['Queue', '✅ Running', '100%'],
                    ],
                    [TableAlignment::Left, TableAlignment::Center, TableAlignment::Right],
                )
                ->divider()
                ->link('View detailed metrics', 'https://status.example.com')
                ->linkButton('Open Dashboard', 'https://dash.example.com', ButtonStyle::Primary);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^photo\s+(.+)$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $query = trim(preg_replace('/^photo\s+/i', '', $ctx->message->text));
            $seed = urlencode($query);

            $ctx->thread->post(new PostableMessage(
                content: "Here's a photo of **{$query}**:",
                attachments: [
                    new Attachment('image', "https://picsum.photos/seed/{$seed}/800/600"),
                ],
            ));
        });

        $chat->onNewMessage('/^photocard$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $card = Card::make()
                ->imageUrl('https://picsum.photos/seed/demo/800/600', 'Random demo photo')
                ->header('Demo Photo')
                ->text('This photo was sent via the card imageUrl system.', TextStyle::Muted);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^upload$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $path = sys_get_temp_dir().'/picsum_upload.jpg';
            file_put_contents($path, file_get_contents('https://picsum.photos/seed/upload/800/600'));

            $ctx->thread->post(new PostableMessage(
                content: 'Here is an **uploaded photo**:',
                files: [
                    FileUpload::fromFilename($path),
                ],
            ));
        });

        // Inline audio file attachment
        $chat->onNewMessage('/^audiofile$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new PostableMessage(
                content: 'Here is an **audio file**:',
                attachments: [
                    new Attachment(
                        type: 'audio',
                        url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                        name: 'SoundHelix-Song-1.mp3',
                    ),
                ],
            ));
        });

        // Inline video file attachment
        $chat->onNewMessage('/^videofile$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new PostableMessage(
                content: 'Here is a **video file**:',
                attachments: [
                    new Attachment(
                        type: 'video',
                        url: 'https://archive.org/download/BigBuckBunny_328/BigBuckBunny_512kb.mp4',
                        name: 'big-buck-bunny.mp4',
                    ),
                ],
            ));
        });

        // --- Web-native cards ---

        $chat->onNewMessage('/^video$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new WebVideoCard(
                url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
                thumbnail: 'https://img.youtube.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
                title: 'Never Gonna Give You Up',
                duration: 213,
                platform: 'youtube',
            ));
        });

        $chat->onNewMessage('/^audio$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new WebAudioCard(
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
                title: 'SoundHelix Demo',
                duration: 542,
            ));
        });

        $chat->onNewMessage('/^map$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new WebLocationCard(
                lat: 48.8566,
                lng: 2.3522,
                title: 'Paris',
                address: 'Eiffel Tower, Champ de Mars',
                zoom: 15,
            ));
        });

        $chat->onNewMessage('/^product$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new WebProductCard(
                url: 'https://picsum.photos/seed/shoe/400/400',
                title: 'Running Shoes',
                price: 89.99,
                currency: 'USD',
                badge: '20% off',
                actions: [
                    ['label' => 'Buy Now', 'actionId' => 'buy', 'value' => 'sku-run-001'],
                    ['label' => 'Details', 'actionId' => 'details', 'value' => 'sku-run-001'],
                ],
            ));
        });

        $chat->onNewMessage('/^poll$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new WebPollCard(
                question: 'What is your favorite PHP framework?',
                options: [
                    ['id' => 'laravel', 'label' => 'Laravel'],
                    ['id' => 'symfony', 'label' => 'Symfony'],
                    ['id' => 'other', 'label' => 'Other'],
                ],
                allowMultiple: false,
            ));
        });

        $chat->onNewMessage('/^carousel$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $ctx->thread->post(new WebCarouselCard(items: [
                Card::make()
                    ->header('Product A')
                    ->text('$29.99 – Premium quality')
                    ->actions([Button::primary('Buy', 'buy', ['sku' => 'a-001'])]),
                Card::make()
                    ->header('Product B')
                    ->text('$49.99 – Best seller')
                    ->actions([Button::primary('Buy', 'buy', ['sku' => 'b-002'])]),
                Card::make()
                    ->header('Product C')
                    ->text('$19.99 – Budget friendly')
                    ->actions([Button::primary('Buy', 'buy', ['sku' => 'c-003'])]),
            ]));
        });

        $chat->onNewMessage('/^bigtable$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $rows = [];
            for ($i = 1; $i <= 105; $i++) {
                $rows[] = ["Row {$i}", 'Value '.chr(65 + (($i - 1) % 26)), $i % 2 === 0 ? '✅' : '❌'];
            }

            $card = Card::make()
                ->header('Large Data Set')
                ->table(['Name', 'Code', 'Status'], $rows);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^feedback$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $card = Card::make()
                ->header('Feedback')
                ->section(fn ($s) => $s->text('Click the button below to open a feedback form.'))
                ->actions([
                    Button::primary('Open Feedback Form', 'feedback', actionHref: 'https://picsum.photos/seed/feedback/800/200'),
                ]);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^channel$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $channelId = $ctx->thread->adapter->channelIdFromThreadId($ctx->thread->id);

            $channel = new Channel($channelId, $ctx->thread->adapter);
            $info = $channel->fetchMetadata();

            if (! $info instanceof ChannelInfo) {
                $ctx->thread->post("Channel info not available for this platform.\n\n**Channel ID:** `{$channelId}`");

                return;
            }

            $card = Card::make()
                ->header('Channel Info')
                ->table(
                    ['Property', 'Value'],
                    [
                        ['ID', $info->id ?? 'N/A'],
                        ['Name', $info->name ?? 'N/A'],
                        ['Topic', $info->topic ?? 'N/A'],
                        ['Private', $info->isPrivate ? 'Yes' : 'No'],
                        ['Visibility', $info->visibility->value],
                    ],
                );

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^thread$/i', function (MessageContext $ctx): void {
            $ctx->thread->addReaction($ctx->message->id, '👍');
            $info = $ctx->thread->adapter->fetchThread($ctx->thread->id);

            $card = Card::make()
                ->header('Thread Info')
                ->table(
                    ['Property', 'Value'],
                    [
                        ['ID', $info->id],
                        ['Channel ID', $info->channelId],
                        ['Title', $info->title ?? 'N/A'],
                        ['Messages', (string) ($info->messageCount ?? 'N/A')],
                    ],
                );

            $ctx->thread->post($card);
        });

        // Slash commands — only use for platform-native features.
        // Prefer pattern-matched handlers above for cross-platform compatibility,
        // since some platforms don't support arbitrary slash command registration.
        $chat->onSlashCommand('/help', function (SlashCommandEvent $event): void {
            $event->channel->post("Available commands:\n- `hello` — greeting\n- `order <item>` — place an order\n- `photo <query>` — picsum photo\n- `photocard` — card with imageUrl\n- `upload` — binary file upload\n- `audiofile` — inline audio player\n- `videofile` — inline video player\n- `status` — system status card\n- `video` — YouTube embed card\n- `audio` — audio player card\n- `map` — location card\n- `product` — product card with buy action\n- `poll` — interactive poll card\n- `carousel` — product carousel\n- `bigtable` — large data table\n- `/subscribe` — start listening in this thread\n- `/unsubscribe` — stop");
        });

        $chat->onSlashCommand('/subscribe', function (SlashCommandEvent $event): void {
            $event->thread->subscribe();
            $event->channel->post('Subscribed to this thread. I\'ll listen to every message here.');
        });

        $chat->onSlashCommand('/unsubscribe', function (SlashCommandEvent $event): void {
            $event->thread->unsubscribe();
            $event->channel->post('Unsubscribed.');
        });

        // Actions — button clicks on order cards
        $chat->onAction('order_confirm', function (ActionEvent $event): void {
            $event->thread->post("Order confirmed! We'll process it shortly.");
        });

        $chat->onAction('order_cancel', function (ActionEvent $event): void {
            $event->thread->post('Order cancelled.');
        });

        $chat->onAction('feedback', function (ActionEvent $event): void {
            $event->openModal(new Modal(
                callbackId: 'feedback',
                title: 'Submit Feedback',
                children: [
                    new TextInput(
                        id: 'comment',
                        label: 'Comment',
                        placeholder: 'Enter your feedback...',
                        multiline: true,
                    ),
                    new ExternalSelect(
                        id: 'category',
                        label: 'Category',
                        placeholder: 'Start typing a category...',
                        minQueryLength: 1,
                    ),
                ],
                submitLabel: 'Send',
                closeLabel: 'Cancel',
                notifyOnClose: true,
            ));
        });

        // Web card actions
        $chat->onAction('buy', function (ActionEvent $event): void {
            $sku = $event->value ?? $event->data['sku'] ?? 'unknown';
            $event->thread->post("🛒 Added **{$sku}** to your cart!");
        });

        $chat->onAction('details', function (ActionEvent $event): void {
            $event->thread->post("📄 SKU `{$event->value}` — Full specs available on our website.");
        });

        $chat->onAction('poll_vote', function (ActionEvent $event): void {
            $event->thread->post("🗳️ Vote recorded for **{$event->value}**! Thanks for participating.");
        });

        // Reactions — respond to emoji reactions (adds or removes)
        $chat->onReaction(function (ReactionEvent $event): void {
            if ($event->added) {
                $event->thread->post("Thanks for the {{emoji:$event->emoji}} reaction!");
            } else {
                $event->thread->post("Too bad you removed the {{emoji:$event->emoji}} reaction!");
            }
        });

        // Persist reactions to cache so history shows them
        // Uses rawEmoji (unicode character) as the display emoji in cache
        $chat->listen(ReactionEvent::class, function (ReactionEvent $event): void {
            $cacheKey = "chat:messages:{$event->thread->id}";
            $messages = Cache::get($cacheKey, []);
            if ($messages === []) {
                return;
            }

            $userId = $event->user->id;
            $displayEmoji = $event->rawEmoji ?: $event->emoji;

            foreach ($messages as $i => $msg) {
                if (($msg['id'] ?? '') !== $event->messageId) {
                    continue;
                }

                $reactions = $msg['reactions'] ?? [];

                if ($event->added) {
                    $found = false;
                    foreach ($reactions as $j => $r) {
                        if ($r['emoji'] === $displayEmoji) {
                            if (! in_array($userId, $r['users'], true)) {
                                $reactions[$j]['users'][] = $userId;
                                $reactions[$j]['count'] = count($reactions[$j]['users']);
                            }
                            $found = true;
                            break;
                        }
                    }
                    if (! $found) {
                        $reactions[] = [
                            'emoji' => $displayEmoji,
                            'count' => 1,
                            'users' => [$userId],
                        ];
                    }
                } else {
                    foreach ($reactions as $j => $r) {
                        if ($r['emoji'] === $displayEmoji) {
                            $reactions[$j]['users'] = array_values(array_filter(
                                $r['users'],
                                fn (string $u): bool => $u !== $userId,
                            ));
                            $reactions[$j]['count'] = count($reactions[$j]['users']);
                            if ($reactions[$j]['count'] === 0) {
                                array_splice($reactions, $j, 1);
                            }
                            break;
                        }
                    }
                }

                $messages[$i]['reactions'] = $reactions;
                Cache::put($cacheKey, $messages, 3600);
                break;
            }
        });

        // Persist bot's outgoing reactions to cache (e.g., bot reacts to user's message)
        $chat->listen(OutgoingReactionEvent::class, function (OutgoingReactionEvent $event): void {
            $cacheKey = "chat:messages:{$event->threadId}";
            $messages = Cache::get($cacheKey, []);
            if ($messages === []) {
                return;
            }

            $displayEmoji = $event->rawEmoji ?: $event->emoji;

            foreach ($messages as $i => $msg) {
                if (($msg['id'] ?? '') !== $event->messageId) {
                    continue;
                }

                $reactions = $msg['reactions'] ?? [];

                if ($event->added) {
                    $found = false;
                    foreach ($reactions as $j => $r) {
                        if ($r['emoji'] === $displayEmoji) {
                            $found = true;
                            $reactions[$j]['count']++;
                            break;
                        }
                    }
                    if (! $found) {
                        $reactions[] = [
                            'emoji' => $displayEmoji,
                            'count' => 1,
                            'users' => [],
                        ];
                    }
                } else {
                    foreach ($reactions as $j => $r) {
                        if ($r['emoji'] === $displayEmoji) {
                            $reactions[$j]['count']--;
                            if ($reactions[$j]['count'] <= 0) {
                                array_splice($reactions, $j, 1);
                            }
                            break;
                        }
                    }
                }

                $messages[$i]['reactions'] = $reactions;
                Cache::put($cacheKey, $messages, 3600);
                break;
            }
        });

        // Modals — Slack view_submission / view_closed
        $chat->onModalSubmit(function (ModalSubmitEvent $event): void {
            $event->relatedThread?->post("Form **{$event->callbackId}** submitted! Values: ".json_encode($event->values));
        });

        $chat->onModalClose(function (ModalCloseEvent $event): void {
            $event->relatedThread?->post("Form **{$event->callbackId}** closed without submitting.");
        });

        // Options load — Slack external select menus
        $chat->onOptionsLoad(function (OptionsLoadEvent $event): array {
            $prefix = strtolower($event->query);
            $all = [
                ['text' => 'Bug Report', 'value' => 'bug'],
                ['text' => 'Feature Request', 'value' => 'feature'],
                ['text' => 'Performance Issue', 'value' => 'performance'],
                ['text' => 'Security Concern', 'value' => 'security'],
                ['text' => 'General Feedback', 'value' => 'general'],
            ];

            return $prefix === ''
                ? $all
                : array_values(array_filter($all, fn (array $o): bool => str_starts_with(strtolower($o['text']), $prefix)));
        });

        // Slack Assistants API
        $chat->onAssistantThreadStarted(function (AssistantThreadStartedEvent $event): void {
            $event->adapter->postMessage($event->threadId, PostableMessage::text('👋 Hello! How can I help you today?'));
        });

        $chat->onAssistantContextChanged(function (AssistantContextChangedEvent $event): void {
            $event->adapter->postMessage($event->threadId, PostableMessage::text("🔄 Context updated — I'll adjust based on the new information."));
        });

        // App Home opened
        $chat->onAppHomeOpened(function (AppHomeOpenedEvent $event): void {
            // App Home doesn't have thread posting — log or handle silently.
            // For demonstration, the app can update the home tab view via Slack API.
        });

        // Member joined channel
        $chat->onMemberJoinedChannel(function (MemberJoinedChannelEvent $event): void {
            $channel = new Channel($event->channelId, $event->adapter);
            $channel->post("Welcome <@{$event->userId}>! Type `/help` to see what I can do.");
        });

        // Message delivered/read — e.g. WhatsApp, Messenger
        $chat->onMessageDelivered(function (MessageDeliveredEvent $event): void {
            Log::info('Message has been delivered', [
                'message' => $event,
            ]);
        });

        $chat->onMessageRead(function (MessageReadEvent $event): void {
            Log::info('Message has been read', [
                'message' => $event,
            ]);
        });

        $chat->onMessageFailed(function (MessageFailedEvent $event): void {
            Log::error('Message failed to deliver', [
                'message' => $event,
            ]);
        });
    }
}
