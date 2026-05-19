<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Core\Middleware;

use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\ReceivingMiddleware;
use BootDesk\ChatSDK\Core\Contracts\SendingMiddleware;
use BootDesk\ChatSDK\Core\Contracts\WebhookEventMiddleware;
use BootDesk\ChatSDK\Core\Contracts\WebhookMiddleware;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\PostableMessage;
use BootDesk\ChatSDK\Core\SentMessage;
use BootDesk\ChatSDK\Core\WebhookEvent;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;

final class MiddlewareDispatcher
{
    /** @var array{webhook: array, receiving: array, sending: array, webhook_event: array} */
    private array $middlewares = [
        'webhook' => [],
        'receiving' => [],
        'sending' => [],
        'webhook_event' => [],
    ];

    public function addWebhook(WebhookMiddleware $middleware): void
    {
        $this->middlewares['webhook'][] = $middleware;
    }

    public function addReceiving(ReceivingMiddleware $middleware): void
    {
        $this->middlewares['receiving'][] = $middleware;
    }

    public function addSending(SendingMiddleware $middleware): void
    {
        $this->middlewares['sending'][] = $middleware;
    }

    public function addWebhookEvent(WebhookEventMiddleware $middleware): void
    {
        $this->middlewares['webhook_event'][] = $middleware;
    }

    /**
     * @param  'webhook'|'receiving'|'sending'|'webhook_event'  $type
     */
    public function getMiddlewares(string $type): array
    {
        return $this->middlewares[$type];
    }

    /**
     * @param  callable(WebhookEvent, Adapter): Adapter  $handler
     */
    public function processWebhookEvent(WebhookEvent $event, Adapter $adapter, callable $handler): Adapter
    {
        $middlewares = $this->middlewares['webhook_event'];

        if ($middlewares === []) {
            return $handler($event, $adapter);
        }

        $current = $adapter;

        foreach ($middlewares as $middleware) {
            $current = $middleware->handle($event, $current);
        }

        return $handler($event, $current);
    }

    /**
     * @param  callable(ServerRequestInterface): ResponseInterface  $handler
     */
    public function processWebhook(ServerRequestInterface $request, callable $handler): ResponseInterface
    {
        return $this->process('webhook', $request, $handler);
    }

    /**
     * @param  callable(?Message, Adapter): ?Message  $handler
     */
    public function processReceiving(?Message $message, Adapter $adapter, callable $handler): ?Message
    {
        $result = $this->process('receiving', [$message, $adapter], $handler);

        return $result instanceof Message ? $result : null;
    }

    /**
     * @param  callable(string, PostableMessage, Adapter, string): PostableMessage  $handler
     */
    public function processSending(string $threadId, PostableMessage $message, Adapter $adapter, string $operation, callable $handler): PostableMessage
    {
        $result = $this->process('sending', [$threadId, $message, $adapter, $operation], $handler);

        return $result instanceof PostableMessage ? $result : $message;
    }

    /**
     * @param  'webhook'|'receiving'|'sending'  $type
     */
    private function process(string $type, mixed $context, callable $handler): mixed
    {
        $middlewares = $this->middlewares[$type];

        if ($middlewares === []) {
            return $type === 'webhook' ? $handler($context) : $handler(...$context);
        }

        $first = $middlewares[0] ?? throw new \InvalidArgumentException("No middleware found for type: {$type}");

        return $first instanceof OnionDirection
            ? $this->processOnion($middlewares, $context, $handler)
            : $this->processForward($middlewares, $context);
    }

    /**
     * @param  array<mixed>  $middlewares
     */
    private function processOnion(array $middlewares, mixed $context, callable $handler): mixed
    {
        $pipeline = $handler;

        foreach (array_reverse($middlewares) as $middleware) {
            $prev = $pipeline;
            $pipeline = fn ($ctx): mixed => $middleware->handle($ctx, $prev);
        }

        return $pipeline($context);
    }

    /**
     * @param  array<mixed>  $middlewares
     */
    private function processForward(array $middlewares, mixed $context): mixed
    {
        $current = $context;

        foreach ($middlewares as $m) {
            $next = function (...$args) use (&$current, $m): mixed {
                $current = $args;

                return $m instanceof SendingMiddleware ? null : $args[0];
            };

            $result = $this->callMiddleware($m, $current, $next);

            if ($result === null || $result instanceof SentMessage) {
                return $result;
            }

            $current = $this->updateContext($m, $current, $result);
        }

        return $this->extractResult($current);
    }

    private function callMiddleware(object $m, mixed $context, callable $next): mixed
    {
        return $m instanceof WebhookMiddleware
            ? $m->handle($context, $next)
            : ($m instanceof ReceivingMiddleware
                ? $m->handle($context[0], $context[1], $next)
                : $m->handle($context[0], $context[1], $context[2], $context[3], $next));
    }

    private function extractResult(mixed $context): mixed
    {
        return is_array($context) ? $context[0] ?? $context[1] : $context;
    }

    private function updateContext(object $m, mixed $context, mixed $result): mixed
    {
        return $m instanceof ReceivingMiddleware
            ? [$result, $context[1]]
            : [$context[0], $result ?? $context[1], $context[2], $context[3]];
    }
}
