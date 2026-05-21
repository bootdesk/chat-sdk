<?php

declare(strict_types=1);

namespace BootDesk\ChatSDK\Web;

use Psr\Http\Message\ServerRequestInterface;

/**
 * Configuration class for WebAdapter.
 *
 * Extend this class and override only the methods you need.
 * All methods return safe defaults so minimal configuration is required.
 *
 * @example
 * ```php
 * class MyAppWebConfig extends WebAdapterConfig
 * {
 *     public function getUser(ServerRequestInterface $request): ?array
 *     {
 *         $session = $request->getAttribute('session');
 *         return $session ? ['id' => $session->get('user_id'), 'name' => $session->get('user_name')] : null;
 *     }
 *
 *     public function verifySignature(ServerRequestInterface $request): bool|string
 *     {
 *         $signature = $request->getHeaderLine('X-Chat-Signature');
 *         return hash_equals($this->expectedSignature, $signature) ? true : 'Invalid signature';
 *     }
 * }
 * ```
 */
class WebAdapterConfig
{
    /**
     * Resolve the current user from the request.
     *
     * @return array{id: string, name?: string}|null User data or null if unauthenticated
     */
    public function getUser(ServerRequestInterface $request): ?array
    {
        return null;
    }

    /**
     * Build a thread ID from user and conversation identifiers.
     *
     * @param  string  $userId  The resolved user ID
     * @param  string  $conversationId  The conversation ID from the request
     */
    public function threadIdFor(string $userId, string $conversationId): string
    {
        return "web:{$userId}:{$conversationId}";
    }

    /**
     * Verify the request signature/authenticity.
     *
     * @return true|string True if valid, or an error message string if invalid
     */
    public function verifySignature(ServerRequestInterface $request): bool|string
    {
        return true;
    }
}
