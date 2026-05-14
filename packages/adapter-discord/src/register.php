<?php

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;
use BootDesk\ChatSDK\Discord\DiscordAdapter;

AdapterRegistry::register('discord', DiscordAdapter::class);
