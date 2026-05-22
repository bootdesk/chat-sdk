<?php

namespace App\Providers;

use App\Adapters\LocalUploadableFilesystemAdapter;
use App\Chat\Helpers\PublicFilesystemToAttachment;
use App\Chat\Helpers\TenantAdapterResolver;
use BootDesk\ChatSDK\Core\Contracts\AdapterResolver;
use BootDesk\ChatSDK\Core\Contracts\FileUploadConverter;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\ServiceProvider;
use League\Flysystem\Filesystem;
use League\Flysystem\Local\LocalFilesystemAdapter as FlysystemLocalAdapter;
use League\Flysystem\UnixVisibility\PortableVisibilityConverter;
use League\Flysystem\Visibility;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(
            AdapterResolver::class,
            TenantAdapterResolver::class,
        );

        $this->app->bind(
            FileUploadConverter::class,
            PublicFilesystemToAttachment::class
        );
    }

    // Taken from https://github.com/mnapoli/laravel-local-temporary-upload-url/blob/1.0.0/src/LocalTemporaryUploadServiceProvider.php so I don't have to fork it just to update the version number.
    protected function extendLocalDrivers(): void
    {
        $disks = ['local'];
        $routeName = 'local-storage.upload';

        foreach ($disks as $diskName) {
            Storage::extend($diskName, static function ($app, $config) use ($diskName, $routeName) {
                $visibility = PortableVisibilityConverter::fromArray(
                    $config['permissions'] ?? [],
                    $config['directory_visibility'] ?? $config['visibility'] ?? Visibility::PRIVATE
                );

                $links = ($config['links'] ?? null) === 'skip'
                    ? FlysystemLocalAdapter::SKIP_LINKS
                    : FlysystemLocalAdapter::DISALLOW_LINKS;

                $adapter = new FlysystemLocalAdapter(
                    $config['root'],
                    $visibility,
                    $config['lock'] ?? LOCK_EX,
                    $links
                );

                $driver = new Filesystem($adapter, [
                    'directory_visibility' => $config['directory_visibility'] ?? $config['visibility'] ?? Visibility::PRIVATE,
                ]);

                return (new LocalUploadableFilesystemAdapter($driver, $adapter, $config, $routeName))
                    ->diskName($diskName)
                    ->shouldServeSignedUrls(
                        $config['serve'] ?? false,
                        fn () => $app['url'],
                    );
            });
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
