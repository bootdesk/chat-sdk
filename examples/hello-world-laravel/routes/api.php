<?php

use App\Http\Controllers\ChatApiController;
use App\Http\Controllers\UploadController;
use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/chats/{adapter}', WebhookController::class.'@handle');

Route::prefix('chat')->group(function () {
    Route::get('/messages', [ChatApiController::class, 'messages']);
    Route::post('/upload', [UploadController::class, 'upload']);
});
