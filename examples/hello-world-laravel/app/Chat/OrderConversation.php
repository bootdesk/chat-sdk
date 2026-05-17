<?php

namespace App\Chat;

use BootDesk\ChatSDK\Core\Conversations\Conversation;
use BootDesk\ChatSDK\Core\Conversations\ConversationState;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\Thread;

class OrderConversation extends Conversation
{
    public function start(Thread $thread, Message $message): void
    {
        $this->ask($thread, 'What would you like to order?', 'handleItem');
    }

    public function handleItem(Thread $thread, Message $message): void
    {
        $item = $message->text;
        $this->ask($thread, "You want **{$item}**. How many?", 'handleQuantity', [
            'item' => $item,
        ]);
    }

    public function handleQuantity(Thread $thread, Message $message): void
    {
        $data = $this->getCurrentData($thread);
        $item = $data['item'] ?? 'unknown';
        $qty = (int) preg_replace('/[^0-9]/', '', $message->text) ?: 1;

        $this->say($thread, "Order placed: **{$qty}x {$item}**. We'll notify you when it's ready.");

        $this->end($thread);
    }

    private function getCurrentData(Thread $thread): array
    {
        $state = ConversationState::get($thread);

        return $state['data'] ?? [];
    }
}
