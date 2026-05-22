<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Adapters\LocalUploadableFilesystemAdapter;
use App\Http\Requests\SignedUploadConfirm;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\Str;

class UploadController extends Controller
{
    public function signedUrlRequest(Request $request): JsonResponse
    {
        $request->validate([
            'prefix' => 'string|required',
            'fileName' => 'string|required',
            'fileType' => 'string|required',
            'fileSize' => 'numeric|required|max:10000000',
        ]);

        if (str_starts_with($request->input('fileType'), 'image/') || $request->input('fileType') === 'application/pdf') {
            $fileName = $request->input('fileName');
            $filePath = rtrim($request->input('prefix'), '/').'/'.Str::uuid().'.'.pathinfo($fileName, PATHINFO_EXTENSION);

            $temporaryUrlData = Storage::temporaryUploadUrl(
                $filePath,
                now()->addMinutes(5)
            );

            return response()->json(
                array_merge($temporaryUrlData, [
                    'confirmAction' => [
                        'url' => URL::signedRoute(
                            name: 'signed-url.confirm',
                            expiration: now()->addMinutes(60),
                            absolute: false
                        ),
                        'params' => [
                            'payload' => Crypt::encryptString(
                                json_encode(
                                    [
                                        'filePath' => $filePath,
                                        'disk' => 'local',
                                    ]
                                )
                            ),
                        ],
                    ],
                ]),
                201
            );
        } else {
            abort(403, 'Must be an image');
        }
    }

    public function signedUrlConfirm(SignedUploadConfirm $request): JsonResponse
    {
        $diskName = $request->validated('disk', 'local');

        abort_if(! $diskName, 500, 'Invalid disk');

        $filePath = $request->validated('filePath');

        /**
         * @var LocalUploadableFilesystemAdapter
         */
        $diskInstance = Storage::disk($diskName);
        $fileExists = $diskInstance->exists($filePath);

        if ($fileExists) {
            return response()->json([
                'url' => $diskInstance->temporaryUrl($filePath, expiration: 600),
                'path' => $filePath,
            ]);
        } else {
            return response()->json([
                'message' => 'File doesn\'t exist',
            ], 422);
        }
    }

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
