<?php

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;
use BootDesk\ChatSDK\Linear\LinearAdapter;

AdapterRegistry::register('linear', LinearAdapter::class);
