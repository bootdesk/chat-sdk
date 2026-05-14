<?php

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;
use BootDesk\ChatSDK\Telegram\TelegramAdapter;

AdapterRegistry::register('telegram', TelegramAdapter::class);
