<?php

use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/chats/{adapter}', WebhookController::class.'@handle');
