<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Minishlink\WebPush\Subscription;
use Minishlink\WebPush\WebPush;

class PushController extends Controller
{
    private const CACHE_KEY = 'push_subscriptions';

    public function vapidPublicKey(): JsonResponse
    {
        return response()->json([
            'publicKey' => config('services.vapid.public_key'),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'userId' => 'string|required',
            'subscription' => 'array|required',
            'subscription.endpoint' => 'string|required',
            'subscription.keys' => 'array|nullable',
            'userAgent' => 'string|nullable',
            'threadId' => 'string|nullable',
        ]);

        $subscriptions = Cache::get(self::CACHE_KEY, []);
        $endpoint = $data['subscription']['endpoint'];

        $exists = false;
        foreach ($subscriptions as &$sub) {
            if ($sub['subscription']['endpoint'] ?? $endpoint === '') {
                $sub = $data;
                $exists = true;
                break;
            }
        }
        unset($sub);

        if (! $exists) {
            $data['createdAt'] = now()->toIso8601String();
            $subscriptions[] = $data;
        }

        Cache::put(self::CACHE_KEY, $subscriptions);

        return response()->json(['success' => true], 201);
    }

    public function index(): JsonResponse
    {
        $subscriptions = Cache::get(self::CACHE_KEY, []);

        return response()->json(['subscriptions' => $subscriptions]);
    }

    public function destroy(Request $request): JsonResponse
    {
        $request->validate([
            'endpoint' => 'string|required',
        ]);

        $endpoint = $request->query('endpoint');

        $subscriptions = Cache::get(self::CACHE_KEY, []);
        $subscriptions = array_values(array_filter(
            $subscriptions,
            fn ($sub) => ($sub['subscription']['endpoint'] ?? '') !== $endpoint,
        ));

        Cache::put(self::CACHE_KEY, $subscriptions);

        return response()->json(['success' => true]);
    }

    public function send(Request $request): JsonResponse
    {
        $data = $request->validate([
            'endpoint' => 'string|required',
            'title' => 'string|required',
            'body' => 'string|required',
            'threadId' => 'string|required',
            'messageId' => 'string|nullable',
            'senderName' => 'string|nullable',
            'deepLink' => 'string|nullable',
            'type' => 'string|in:chat,generic|nullable',
            'actions' => 'array|nullable',
            'actions.*.action' => 'string|required',
            'actions.*.title' => 'string|required',
            'locale' => 'string|nullable',
        ]);

        $subscriptions = Cache::get(self::CACHE_KEY, []);
        $found = null;
        foreach ($subscriptions as $sub) {
            if (($sub['subscription']['endpoint'] ?? '') === $data['endpoint']) {
                $found = $sub['subscription'];
                break;
            }
        }

        if (! $found) {
            return response()->json(['error' => 'Subscription not found'], 404);
        }

        $webPush = new WebPush(
            auth: [
                'VAPID' => [
                    'subject' => config('services.vapid.subject'),
                    'publicKey' => config('services.vapid.public_key'),
                    'privateKey' => config('services.vapid.private_key'),
                ],
            ],
        );

        $subscription = Subscription::create([
            'endpoint' => $found['endpoint'],
            'authToken' => $found['keys']['auth'] ?? null,
            'publicKey' => $found['keys']['p256dh'] ?? null,
        ]);

        $payload = json_encode([
            'threadId' => $data['threadId'],
            'messageId' => $data['messageId'] ?? (string) str()->uuid(),
            'senderName' => $data['senderName'] ?? 'System',
            'preview' => $data['body'],
            'timestamp' => (int) (microtime(true) * 1000),
            'deepLink' => $data['deepLink'] ?? null,
            'type' => $data['type'] ?? 'chat',
            'actions' => $data['actions'] ?? null,
            'locale' => $data['locale'] ?? null,
        ]);

        $options = [
            'TTL' => 86400,
            'urgency' => 'normal',
        ];

        try {
            $webPush->queueNotification($subscription, $payload, $options);

            $reports = $webPush->flush();
            $sent = false;

            foreach ($reports as $report) {
                if ($report->isSuccess()) {
                    $sent = true;
                } elseif ($report->isSubscriptionExpired()) {
                    $this->removeSubscription($found['endpoint']);

                    return response()->json(['error' => 'Subscription expired, removed'], 410);
                } else {
                    return response()->json([
                        'error' => 'Send failed',
                        'reason' => $report->getReason(),
                    ], 500);
                }
            }

            if ($sent) {
                return response()->json(['success' => true]);
            }

            return response()->json(['error' => 'No notifications sent'], 500);
        } catch (\Throwable $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function removeSubscription(string $endpoint): void
    {
        $subscriptions = Cache::get(self::CACHE_KEY, []);
        $subscriptions = array_values(array_filter(
            $subscriptions,
            fn ($sub) => ($sub['subscription']['endpoint'] ?? '') !== $endpoint,
        ));
        Cache::put(self::CACHE_KEY, $subscriptions);
    }
}
