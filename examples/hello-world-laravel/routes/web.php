<?php

use App\Http\Controllers\LocalUploadController;
use Illuminate\Support\Facades\Route;

Route::get('/', function () {
    return view('welcome');
});

Route::get('/iframe', function () {
    return view('iframe');
});

Route::get('/chat-iframe', function () {
    return view('chat-iframe');
});

Route::get('/iframe-floating', function () {
    return view('iframe-floating');
});

Route::get('/chat-iframe-floating', function () {
    return view('chat-iframe-floating');
});

Route::get('/iframe-test', function () {
    return view('iframe-test');
});

Route::get('/chat-signed-upload', function () {
    return view('chat-signed-upload');
});

// Taken from https://github.com/mnapoli/laravel-local-temporary-upload-url/blob/1.0.0/src/LocalTemporaryUploadServiceProvider.php so I don't have to fork it just to update the version number.
Route::put('_local-storage/upload', LocalUploadController::class)
    ->name('local-storage.upload')
    ->middleware(['signed']);
