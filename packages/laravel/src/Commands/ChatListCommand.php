<?php

namespace BootDesk\ChatSDK\Laravel\Commands;

use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use Illuminate\Console\Command;

class ChatListCommand extends Command
{
    protected $signature = 'chat:list';

    protected $description = 'List configured chat adapters and their status';

    public function handle(Chat $chat): int
    {
        $adapters = config('chat.adapters', []);

        if (empty($adapters)) {
            $this->warn('No adapters configured. Edit config/chat.php to add adapters.');

            return self::SUCCESS;
        }

        $rows = [];
        foreach ($adapters as $name => $config) {
            $resolved = $chat->resolveAdapter($name);
            $rows[] = [
                $name,
                $resolved instanceof Adapter ? '<fg=green>Available</>' : '<fg=red>Not installed</>',
                $resolved instanceof Adapter ? $resolved->getName() : '-',
            ];
        }

        $this->table(['Adapter', 'Status', 'Name'], $rows);

        return self::SUCCESS;
    }
}
