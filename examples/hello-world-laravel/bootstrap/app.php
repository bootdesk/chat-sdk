<?php

use BootDesk\ChatSDK\Core\Exceptions\AdapterException;
use BootDesk\ChatSDK\Core\Exceptions\AuthenticationException;
use BootDesk\ChatSDK\Core\Exceptions\RateLimitException;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        api: __DIR__.'/../routes/api.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->trustProxies(at: [
            '0.0.0.0/0',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->renderable(function (AuthenticationException $e, Request $request): JsonResponse {
            return response()->json(['error' => 'Unauthorized'], 401);
        });

        $exceptions->renderable(function (RateLimitException $e, Request $request): JsonResponse {
            return response()->json(['error' => 'Rate limited'], 429);
        });

        $exceptions->renderable(function (AdapterException $e, Request $request): JsonResponse {
            Log::error('Chat adapter error', [
                'message' => $e->getMessage(),
                'adapter' => $request->route('adapter'),
            ]);

            return response()->json(['error' => 'Adapter failed'], 500);
        });

        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->wantsJson()) {
                return response()->json([
                    'error' => $e->getMessage(),
                ], status: 500);
            }
        });
    })->create();
