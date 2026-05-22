<?php

declare(strict_types=1);

// Taken from https://raw.githubusercontent.com/mnapoli/laravel-local-temporary-upload-url/refs/tags/1.0.0/src/Http/Controllers/LocalUploadController.php so I don't have to fork it just to update the version number.

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Storage;

class LocalUploadController
{
    public function __invoke(Request $request): Response
    {
        $path = decrypt($request->query('path'));

        Storage::put($path, $request->getContent());

        return response()->noContent();
    }
}
