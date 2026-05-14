<?php

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;
use BootDesk\ChatSDK\GitHub\GitHubAdapter;

AdapterRegistry::register('github', GitHubAdapter::class);
