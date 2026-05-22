<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

class PreEntryController extends Controller
{
    public function requestCode(Request $request): JsonResponse
    {
        $data = $request->validate(['email' => 'required|email']);

        $id = Str::random(16);
        $code = (string) random_int(100000, 999999);

        Cache::put("pre-entry:{$id}", [
            'code' => $code,
            'email' => $data['email'],
        ], now()->addMinutes(10));

        Log::debug("Verification code for {$data['email']}: {$code}");

        return response()->json(['id' => $id]);
    }

    public function verifyCode(Request $request): JsonResponse
    {
        $data = $request->validate([
            'id' => 'required|string',
            'code' => 'required|string|size:6',
        ]);

        $stored = Cache::get("pre-entry:{$data['id']}");

        if ($stored === null || $stored['code'] !== $data['code']) {
            return response()->json(['error' => 'Invalid code'], 422);
        }

        Cache::forget("pre-entry:{$data['id']}");

        return response()->json([
            'verifyToken' => Crypt::encryptString('verified'),
            'userId' => (string) Str::uuid(),
        ]);
    }
}
