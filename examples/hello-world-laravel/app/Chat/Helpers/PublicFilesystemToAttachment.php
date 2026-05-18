<?php

namespace App\Chat\Helpers;

use BootDesk\ChatSDK\Core\Attachment;
use BootDesk\ChatSDK\Core\Contracts\Adapter;
use BootDesk\ChatSDK\Core\Contracts\FileUploadConverter;
use BootDesk\ChatSDK\Core\FileUpload;
use Illuminate\Filesystem\LocalFilesystemAdapter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Override;

class PublicFilesystemToAttachment implements FileUploadConverter
{
    #[Override]
    public function upload(FileUpload $file, Adapter $adapter): Attachment
    {
        /**
         * @var LocalFilesystemAdapter
         */
        $diskInstance = Storage::disk('public');

        $diskInstance->put(
            path: ($storagePath = (Str::uuid().'/'.$file->filename)),
            contents: $file->data
        );

        $mimeType = $file->mimeType;

        $type = match (true) {
            str_starts_with($mimeType, 'image/') => 'image',
            str_starts_with($mimeType, 'video/') => 'video',
            str_starts_with($mimeType, 'audio/') => 'audio',
            default => 'file',
        };

        return new Attachment(
            type: $type,
            url: $diskInstance->url($storagePath),
            mimeType: $mimeType,
            name: $file->filename
        );
    }
}
