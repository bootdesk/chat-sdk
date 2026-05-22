<?php

use App\Http\Controllers\ChatApiController;
use App\Http\Controllers\PreEntryController;
use App\Http\Controllers\PushController;
use App\Http\Controllers\UploadController;
use BootDesk\ChatSDK\Laravel\Http\Controllers\WebhookController;
use Illuminate\Support\Facades\Route;

Route::match(['get', 'post'], '/chats/{adapter}', WebhookController::class.'@handle');

Route::prefix('chat')->group(function () {
    Route::get('/messages', [ChatApiController::class, 'messages']);
    Route::post('/upload', [UploadController::class, 'upload']);
    Route::prefix('pre-entry')->group(function () {
        Route::post('/request-code', [PreEntryController::class, 'requestCode']);
        Route::post('/verify-code', [PreEntryController::class, 'verifyCode']);
    });
});

Route::post('/signed-url-request', [UploadController::class, 'signedUrlRequest']);
Route::post('/signed-url-confirm', [UploadController::class, 'signedUrlConfirm'])->name('signed-url.confirm');

Route::prefix('push')->group(function () {
    Route::get('/vapid-public-key', [PushController::class, 'vapidPublicKey']);
    Route::get('/subscriptions', [PushController::class, 'index']);
    Route::post('/subscriptions', [PushController::class, 'store']);
    Route::delete('/subscriptions', [PushController::class, 'destroy']);
    Route::post('/send', [PushController::class, 'send']);
});
