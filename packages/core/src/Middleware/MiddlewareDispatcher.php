<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Core\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\Contracts\WebhookMiddleware;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class MiddlewareDispatcher
{
    /** @var array<string, array{direction: 'onion'|'forward', middlewares: array}> */
    private array $config = [
        'webhook' => ['direction' => 'onion', 'middlewares' => []],
        'receiving' => ['direction' => 'forward', 'middlewares' => []],
        'sending' => ['direction' => 'forward', 'middlewares' => []],
    ];

    public function addWebhook(WebhookMiddleware $middleware): void
    {
        $this->config['webhook']['middlewares'][] = $middleware;
    }

    public function addReceiving(ReceivingMiddleware $middleware): void
    {
        $this->config['receiving']['middlewares'][] = $middleware;
    }

    public function addSending(SendingMiddleware $middleware): void
    {
        $this->config['sending']['middlewares'][] = $middleware;
    }

    public function processWebhook(ServerRequestInterface $request, callable $handler): ResponseInterface
    {
        return $this->process('webhook', $request, $handler);
    }

    public function processReceiving(?Message $message, Adapter $adapter, callable $handler): ?Message
    {
        return $this->process('receiving', [$message, $adapter], $handler);
    }

    public function processSending(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $handler): PostableMessage
    {
        $result = $this->process('sending', [$threadId, $message, $adapter, $operation], $handler);

        return $result instanceof PostableMessage ? $result : $message;
    }

    private function process(string $type, mixed $context, callable $handler): mixed
    {
        $cfg = $this->config[$type] ?? throw new \InvalidArgumentException("Unknown middleware type: {$type}");
        $middlewares = $cfg['middlewares'];

        if ($middlewares === []) {
            return $this->callHandler($type, $handler, $context);
        }

        return $cfg['direction'] === 'onion'
            ? $this->processOnion($type, $context, $handler)
            : $this->processForward($type, $context);
    }

    private function processOnion(string $type, mixed $context, callable $handler): mixed
    {
        $pipeline = fn ($ctx): mixed => $this->callHandler($type, $handler, $ctx);
        $middlewares = array_reverse($this->config[$type]['middlewares']);

        foreach ($middlewares as $m) {
            $pipeline = fn ($ctx): mixed => $this->callMiddleware($type, $m, $ctx, $pipeline);
        }

        return $pipeline($context);
    }

    private function processForward(string $type, mixed $context): mixed
    {
        $current = $context;

        foreach ($this->config[$type]['middlewares'] as $m) {
            $next = function (...$args) use ($type, &$current): mixed {
                $current = $this->rebuildContext($type, $args);

                return $type === 'sending' ? null : $current[0];
            };

            $result = $this->callMiddleware($type, $m, $current, $next);

            if ($result === null || $result instanceof SentMessage) {
                return $result;
            }

            $current = $this->updateContext($type, $current, $result);
        }

        return $this->extractResult($type, $current);
    }

    private function rebuildContext(string $type, array $args): mixed
    {
        return match ($type) {
            'receiving' => [$args[0], $args[1]],
            'sending' => [$args[0], $args[1], $args[2], $args[3]],
            default => $args[0] ?? null,
        };
    }

    private function extractResult(string $type, mixed $context): mixed
    {
        return match ($type) {
            'receiving' => $context[0],
            'sending' => $context[1],
            default => $context,
        };
    }

    private function callMiddleware(string $type, object $m, mixed $context, callable $next): mixed
    {
        return match ($type) {
            'webhook' => $m->handle($context, $next),
            'receiving' => $m->handle($context[0], $context[1], $next),
            'sending' => $m->handle($context[0], $context[1], $context[2], $context[3], $next),
            default => throw new \InvalidArgumentException("Unknown middleware type: {$type}"),
        };
    }

    private function callHandler(string $type, callable $handler, mixed $context): mixed
    {
        return match ($type) {
            'webhook' => $handler($context),
            'receiving' => $handler($context[0], $context[1]),
            'sending' => $handler($context[0], $context[1], $context[2], $context[3]),
            default => throw new \InvalidArgumentException("Unknown middleware type: {$type}"),
        };
    }

    private function updateContext(string $type, mixed $context, mixed $result): mixed
    {
        return match ($type) {
            'receiving' => [$result, $context[1]],
            'sending' => [$context[0], $result ?? $context[1], $context[2], $context[3]],
            default => $context,
        };
    }
}
