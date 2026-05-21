<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $request->validate([
            'file' => ['required', 'file', 'max:10240'],
        ]);

        $file = $request->file('file');
        $name = Str::uuid().'.'.$file->getClientOriginalExtension();
        $path = $file->storeAs('uploads', $name, 'public');

        return response()->json([
            'url' => url('storage/'.$path),
        ]);
    }
}
