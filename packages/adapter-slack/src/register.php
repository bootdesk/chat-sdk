<?php

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;
use BootDesk\ChatSDK\Slack\SlackAdapter;

AdapterRegistry::register('slack', SlackAdapter::class);
