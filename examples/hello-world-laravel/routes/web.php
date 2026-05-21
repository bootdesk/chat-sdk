<?php

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
