<?php

use BootDesk\ChatSDK\Core\Support\AdapterRegistry;
use BootDesk\ChatSDK\WhatsApp\WhatsAppAdapter;

AdapterRegistry::register('whatsapp', WhatsAppAdapter::class);
