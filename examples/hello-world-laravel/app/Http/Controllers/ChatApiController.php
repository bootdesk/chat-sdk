<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;

class ChatApiController extends Controller
{
    public function messages(Request $request): JsonResponse
    {
        $threadId = $request->query('threadId', '');
        $limit = (int) $request->query('limit', 50);

        $cacheKey = "chat:messages:{$threadId}";
        $messages = Cache::get($cacheKey, []);

        $total = count($messages);
        $messages = array_slice($messages, -$limit);

        return response()->json([
            'messages' => array_values($messages),
            'hasMore' => $total > $limit,
        ]);
    }
}
