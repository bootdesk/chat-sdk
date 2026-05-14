<?php

use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

// Webhook endpoint for all adapters.
// Each platform sends POST requests here:
//   POST /api/webhooks/slack
//   POST /api/webhooks/telegram
//   POST /api/webhooks/discord
//   etc.
Route::match(['get', 'post'], '/api/webhooks/{adapter}', WebhookController::class);

// Optional: multi-tenant setup with tenant parameter
// Route::match(['get', 'post'], '/api/webhooks/{adapter}/{tenant?}', WebhookController::class);
