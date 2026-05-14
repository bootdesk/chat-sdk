<?php

namespace BootDesk\ChatSDK\Laravel\Tests;

use BootDesk\ChatSDK\Laravel\ChatServiceProvider;
use Illuminate\Support\Facades\File;
use Orchestra\Testbench\TestCase;

class ChatMakeAdapterCommandTest extends TestCase
{
    private string $base;

    protected function getPackageProviders($app): array
    {
        return [ChatServiceProvider::class];
    }

    protected function setUp(): void
    {
        parent::setUp();
        $this->base = app_path('Chat/Adapters');
        File::deleteDirectory($this->base);
    }

    protected function tearDown(): void
    {
        File::deleteDirectory($this->base);
        parent::tearDown();
    }

    public function test_command_scaffolds_adapter(): void
    {
        $this->artisan('chat:make-adapter', ['name' => 'my-custom'])
            ->assertSuccessful();

        $dir = "{$this->base}/MyCustom";
        $this->assertDirectoryExists($dir);
        $this->assertFileExists("{$dir}/MyCustomAdapter.php");
        $this->assertFileExists("{$dir}/MyCustomFormatConverter.php");
        $this->assertFileExists("{$dir}/MyCustomCards.php");
        $this->assertFileExists("{$dir}/MyCustomWebhookVerifier.php");

        $content = file_get_contents("{$dir}/MyCustomAdapter.php");
        $this->assertStringContainsString('class MyCustomAdapter implements Adapter', $content);
        $this->assertStringContainsString("return 'my-custom'", $content);
    }

    public function test_command_fails_when_adapter_exists(): void
    {
        mkdir("{$this->base}/MyCustom", 0755, true);

        $this->artisan('chat:make-adapter', ['name' => 'my-custom'])
            ->assertFailed();
    }

    public function test_command_overwrites_with_force(): void
    {
        mkdir("{$this->base}/MyCustom", 0755, true);
        file_put_contents("{$this->base}/MyCustom/MyCustomAdapter.php", 'old');

        $this->artisan('chat:make-adapter', ['name' => 'my-custom', '--force' => true])
            ->assertSuccessful();

        $content = file_get_contents("{$this->base}/MyCustom/MyCustomAdapter.php");
        $this->assertStringContainsString('class MyCustomAdapter implements Adapter', $content);
    }

    public function test_kebab_case_is_normalized(): void
    {
        $this->artisan('chat:make-adapter', ['name' => 'CustomAPI'])
            ->assertSuccessful();

        $this->assertDirectoryExists("{$this->base}/CustomApi");
        $this->assertFileExists("{$this->base}/CustomApi/CustomApiAdapter.php");
    }
}
