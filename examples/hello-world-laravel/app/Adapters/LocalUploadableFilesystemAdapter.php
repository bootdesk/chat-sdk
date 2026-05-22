<?php

declare(strict_types=1);

// Taken from https://raw.githubusercontent.com/mnapoli/laravel-local-temporary-upload-url/refs/tags/1.0.0/src/LocalUploadableFilesystemAdapter.php, so I don't have to fork it just to update the version number

namespace App\Adapters;

use DateTimeInterface;
use Illuminate\Filesystem\LocalFilesystemAdapter;
use Illuminate\Support\Facades\URL;
use League\Flysystem\FilesystemAdapter;
use League\Flysystem\FilesystemOperator;

/**
 * Extends the local filesystem adapter to support temporaryUploadUrl().
 *
 * This allows the same upload flow (presigned URL + direct PUT) to work
 * in local development without requiring S3/MinIO.
 */
class LocalUploadableFilesystemAdapter extends LocalFilesystemAdapter
{
    /**
     * @param  array<string, mixed>  $config
     */
    public function __construct(
        FilesystemOperator $driver,
        FilesystemAdapter $adapter,
        array $config,
        private string $routeName = 'local-storage.upload',
    ) {
        parent::__construct($driver, $adapter, $config);
    }

    /**
     * Get a temporary URL for uploading a file.
     *
     * @param  string  $path
     * @param  DateTimeInterface  $expiration
     * @param  array<string, mixed>  $options
     * @return array{0: string, 1: array<string, string>}
     */
    public function temporaryUploadUrl($path, $expiration, array $options = []): array
    {
        $url = URL::temporarySignedRoute(
            $this->routeName,
            $expiration,
            ['path' => encrypt($path)],
        );

        return [$url, []];
    }
}
