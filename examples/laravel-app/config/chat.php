<?php

return [

    'user_name' => env('BOT_USERNAME', 'MyBot'),

    'adapters' => [
        'slack' => [
            'bot_token' => env('SLACK_BOT_TOKEN'),
            'signing_secret' => env('SLACK_SIGNING_SECRET'),
        ],

        'telegram' => [
            'bot_token' => env('TELEGRAM_BOT_TOKEN'),
        ],

        // 'discord' => [
        //     'bot_token' => env('DISCORD_BOT_TOKEN'),
        //     'application_id' => env('DISCORD_APPLICATION_ID'),
        //     'public_key' => env('DISCORD_PUBLIC_KEY'),
        // ],
        // 'whatsapp' => [
        //     'access_token' => env('WHATSAPP_ACCESS_TOKEN'),
        //     'app_secret' => env('WHATSAPP_APP_SECRET'),
        //     'phone_number_id' => env('WHATSAPP_PHONE_NUMBER_ID'),
        //     'verify_token' => env('WHATSAPP_VERIFY_TOKEN'),
        // ],
        // 'github' => [
        //     'auth_token' => env('GITHUB_TOKEN'),
        //     'webhook_secret' => env('GITHUB_WEBHOOK_SECRET'),
        // ],
    ],

    'state' => [
        'store' => env('CHAT_STATE_STORE', 'file'),
        'prefix' => env('CHAT_STATE_PREFIX', 'chat:'),
    ],

    'handlers' => [
        \App\Chat\ChatHandlers::class,
    ],

    'concurrency' => env('CHAT_CONCURRENCY', 'drop'),

    'lock_scope' => env('CHAT_LOCK_SCOPE', 'thread'),

    'transcripts' => null,

];
