<?php

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;
use BootDesk\ChatSDK\Web\WebAdapter;

AdapterRegistry::register('web', WebAdapter::class);
