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
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\FileUpload;
use BootDesk\ChatSDK\Core\MemberJoinedChannelEvent;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Core\MessageDeliveredEvent;
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
use Override;

class ChatHandlers implements ChatHandler
{
    #[Override]
    public function register(Chat $chat): void
    {
        // Subscribed thread — every message goes here instead of Mention/Pattern.
        // Subscribe via the /subscribe slash command or the fallback.
        $chat->onSubscribedMessage(function (MessageContext $ctx) {
            $ctx->thread->post("You said in this subscribed thread: {$ctx->message->text}");
        });

        // Mention handler — fires when the bot is @-mentioned outside a subscribed thread.
        $chat->onNewMention(function (MessageContext $ctx) {
            $ctx->thread->post('You mentioned me! Use `/help` to see what I can do.');
        });

        // Pattern-matched messages (unsubscribed threads only — including DMs)
        $chat->onNewMessage('/^(hello|hi|hey)$/i', function (MessageContext $ctx) {
            $reply = $ctx->message->isDM
                ? 'Hey there! I\'m a bot. Send `/help` to see what I can do.'
                : 'Hey there! Mention me or send `/help` to see what I can do.';

            $ctx->thread->post($reply);
        });

        $chat->onNewMessage('/^order\s+(.+)$/i', function (MessageContext $ctx) {
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

        $chat->onNewMessage('/^status$/i', function (MessageContext $ctx) {
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

        $chat->onNewMessage('/^photo\s+(.+)$/i', function (MessageContext $ctx) {
            $query = trim(preg_replace('/^photo\s+/i', '', $ctx->message->text));
            $seed = urlencode($query);

            $ctx->thread->post(new PostableMessage(
                content: "Here's a photo of **{$query}**:",
                attachments: [
                    new Attachment('image', "https://picsum.photos/seed/{$seed}/800/600"),
                ],
            ));
        });

        $chat->onNewMessage('/^photocard$/i', function (MessageContext $ctx) {
            $card = Card::make()
                ->imageUrl('https://picsum.photos/seed/demo/800/600', 'Random demo photo')
                ->header('Demo Photo')
                ->text('This photo was sent via the card imageUrl system.', TextStyle::Muted);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^upload$/i', function (MessageContext $ctx) {
            $path = sys_get_temp_dir().'/picsum_upload.jpg';
            file_put_contents($path, file_get_contents('https://picsum.photos/seed/upload/800/600'));

            $ctx->thread->post(new PostableMessage(
                content: 'Here is an **uploaded photo**:',
                files: [
                    FileUpload::fromFilename($path),
                ],
            ));
        });

        $chat->onNewMessage('/^bigtable$/i', function (MessageContext $ctx) {
            $rows = [];
            for ($i = 1; $i <= 105; $i++) {
                $rows[] = ["Row {$i}", 'Value '.chr(65 + (($i - 1) % 26)), $i % 2 === 0 ? '✅' : '❌'];
            }

            $card = Card::make()
                ->header('Large Data Set')
                ->table(['Name', 'Code', 'Status'], $rows);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^feedback$/i', function (MessageContext $ctx) {
            $card = Card::make()
                ->header('Feedback')
                ->section(fn ($s) => $s->text('Click the button below to open a feedback form.'))
                ->actions([
                    Button::primary('Open Feedback Form', 'feedback', actionHref: 'https://picsum.photos/seed/feedback/800/200'),
                ]);

            $ctx->thread->post($card);
        });

        $chat->onNewMessage('/^channel$/i', function (MessageContext $ctx) {
            $parts = explode(':', $ctx->thread->id, 3);
            $channelId = $parts[1] ?? null;

            if ($channelId === null) {
                $ctx->thread->post('Could not determine channel ID.');

                return;
            }

            $channel = new Channel($channelId, $ctx->thread->adapter);
            $info = $channel->fetchMetadata();

            if ($info === null) {
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

        // Slash commands — only use for platform-native features.
        // Prefer pattern-matched handlers above for cross-platform compatibility,
        // since some platforms don't support arbitrary slash command registration.
        $chat->onSlashCommand('/help', function (SlashCommandEvent $event) {
            $event->channel->post("Available commands:\n- `hello` — greeting\n- `order <item>` — place an order\n- `photo <query>` — picsum photo\n- `photocard` — card with imageUrl\n- `upload` — binary file upload\n- `status` — system status card\n- `bigtable` — large data table\n- `/subscribe` — start listening in this thread\n- `/unsubscribe` — stop");
        });

        $chat->onSlashCommand('/subscribe', function (SlashCommandEvent $event) {
            $event->thread->subscribe();
            $event->channel->post('Subscribed to this thread. I\'ll listen to every message here.');
        });

        $chat->onSlashCommand('/unsubscribe', function (SlashCommandEvent $event) {
            $event->thread->unsubscribe();
            $event->channel->post('Unsubscribed.');
        });

        // Actions — button clicks on order cards
        $chat->onAction('order_confirm', function (ActionEvent $event) {
            $event->thread->post("Order confirmed! We'll process it shortly.");
        });

        $chat->onAction('order_cancel', function (ActionEvent $event) {
            $event->thread->post('Order cancelled.');
        });

        $chat->onAction('feedback', function (ActionEvent $event) {
            $event->openModal(new Modal(
                callbackId: 'feedback',
                title: 'Submit Feedback',
                submitLabel: 'Send',
                closeLabel: 'Cancel',
                notifyOnClose: true,
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
            ));
        });

        // Reactions — respond to emoji reactions (adds or removes)
        $chat->onReaction(function (ReactionEvent $event) {
            if ($event->added) {
                $event->thread->post("Thanks for the `:{$event->rawEmoji}:` reaction!");
            }
        });

        // Modals — Slack view_submission / view_closed
        $chat->onModalSubmit(function (ModalSubmitEvent $event) {
            $event->relatedThread?->post("Form **{$event->callbackId}** submitted! Values: ".json_encode($event->values));
        });

        $chat->onModalClose(function (ModalCloseEvent $event) {
            $event->relatedThread?->post("Form **{$event->callbackId}** closed without submitting.");
        });

        // Options load — Slack external select menus
        $chat->onOptionsLoad(function (OptionsLoadEvent $event) {
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
                : array_values(array_filter($all, fn ($o) => str_starts_with(strtolower($o['text']), $prefix)));
        });

        // Slack Assistants API
        $chat->onAssistantThreadStarted(function (AssistantThreadStartedEvent $event) {
            $event->adapter->postMessage($event->threadId, PostableMessage::text('👋 Hello! How can I help you today?'));
        });

        $chat->onAssistantContextChanged(function (AssistantContextChangedEvent $event) {
            $event->adapter->postMessage($event->threadId, PostableMessage::text("🔄 Context updated — I'll adjust based on the new information."));
        });

        // App Home opened
        $chat->onAppHomeOpened(function (AppHomeOpenedEvent $event) {
            // App Home doesn't have thread posting — log or handle silently.
            // For demonstration, the app can update the home tab view via Slack API.
        });

        // Member joined channel
        $chat->onMemberJoinedChannel(function (MemberJoinedChannelEvent $event) {
            $channel = new Channel($event->channelId, $event->adapter);
            $channel->post("Welcome <@{$event->userId}>! Type `/help` to see what I can do.");
        });

        // Message delivered/read — e.g. WhatsApp, Messenger
        $chat->onMessageDelivered(function (MessageDeliveredEvent $event) {
            // Logged or track delivery status
        });

        $chat->onMessageRead(function (MessageReadEvent $event) {
            // Logged or track read status
        });
    }
}
