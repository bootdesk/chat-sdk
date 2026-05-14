<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use BootDesk\ChatSDK\Core\Chat;

class ChatTestCommand extends Command
{
    protected $signature = 'chat:test {adapter} {message=hello}';

    protected $description = 'Send a test message through an adapter';

    public function handle(Chat $chat): int
    {
        $adapter = $this->argument('adapter');
        $text = $this->argument('message');

        $resolved = $chat->resolveAdapter($adapter);

        if ($resolved === null) {
            $this->error("Adapter '{$adapter}' is not configured.");

            return 1;
        }

        $this->info("Adapter: {$resolved->getName()}");
        $this->info("Bot user ID: " . ($resolved->getBotUserId() ?? 'unknown'));

        // List configured adapters
        $this->newLine();
        $this->info('To test webhooks, start your server and configure the platform to point to:');
        $this->line("  POST " . url("/api/webhooks/{$adapter}"));

        $this->newLine();
        $this->info('For local testing, use ngrok:');
        $this->line("  ngrok http 8000");
        $this->line("  Then set your webhook URL to: https://<ngrok-id>.ngrok.io/api/webhooks/{$adapter}");

        return 0;
    }
}
