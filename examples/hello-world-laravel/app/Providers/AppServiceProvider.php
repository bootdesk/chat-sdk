<?php

namespace App\Providers;

use App\Chat\Helpers\PublicFilesystemToAttachment;
use App\Chat\Helpers\TenantAdapterResolver;
use BootDesk\ChatSDK\Core\Contracts\AdapterResolver;
use BootDesk\ChatSDK\Core\Contracts\FileUploadConverter;
use Illuminate\Support\ServiceProvider;

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

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        //
    }
}
