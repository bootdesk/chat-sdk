<?php

namespace App\Chat;

use BootDesk\ChatSDK\Core\ActionEvent;
use BootDesk\ChatSDK\Core\Cards\Button;
use BootDesk\ChatSDK\Core\Cards\Card;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Core\ReactionEvent;
use BootDesk\ChatSDK\Core\SlashCommandEvent;
use BootDesk\ChatSDK\Laravel\Contracts\ChatHandler;

class ChatHandlers implements ChatHandler
{
    public function register(Chat $chat): void
    {
        // Match "hello" or "hi" — case insensitive
        $chat->onNewMessage('/^(hello|hi|hey)$/i', function (MessageContext $ctx) {
            $ctx->thread->post('Hey there! How can I help?');
        });

        // Match "order {something}"
        $chat->onNewMessage('/^order\s+(.+)$/i', function (MessageContext $ctx) {
            $item = trim(preg_replace('/^order\s+/i', '', $ctx->message->text));
            $ctx->setState(['pending_order' => $item]);

            $card = Card::make()
                ->header("Order: {$item}")
                ->section(fn ($s) => $s->text("Confirm your order for **{$item}**?"))
                ->actions([
                    Button::primary('Confirm', 'order_confirm', ['item' => $item]),
                    Button::danger('Cancel', 'order_cancel'),
                ]);

            $ctx->thread->post($card);
        });

        // Handle confirm action
        $chat->onAction('order_confirm', function (ActionEvent $event) {
            $event->thread->post("Order confirmed! We'll process it shortly.");
        });

        // Handle cancel action
        $chat->onAction('order_cancel', function (ActionEvent $event) {
            $event->thread->post('Order cancelled.');
        });

        // DM handler — respond differently in direct messages
        $chat->onDirectMessage(function (MessageContext $ctx) {
            $ctx->thread->post("You said: {$ctx->message->text}");
        });

        // Mention handler — respond when bot is mentioned
        $chat->onNewMention(function (MessageContext $ctx) {
            $ctx->thread->post('You mentioned me! How can I help?');
        });

        // Reaction handler
        $chat->onReaction('👍', function (ReactionEvent $event) {
            $event->thread->post('Thanks for the thumbs up!');
        });

        // Slash command handler
        $chat->onSlashCommand('/status', function (SlashCommandEvent $event) {
            $event->thread->post('All systems operational.');
        });
    }
}
