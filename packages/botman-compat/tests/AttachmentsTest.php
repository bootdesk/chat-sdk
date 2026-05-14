<?php

namespace BotMan\BotMan\Tests;

use BotMan\BotMan\Attachments\Audio;
use BotMan\BotMan\Attachments\File;
use BotMan\BotMan\Attachments\Image;
use BotMan\BotMan\Attachments\Location;
use BotMan\BotMan\Attachments\Video;
use PHPUnit\Framework\TestCase;

class AttachmentsTest extends TestCase
{
    public function test_image(): void
    {
        $img = new Image('https://example.com/photo.jpg', ['width' => 800]);

        $this->assertSame('https://example.com/photo.jpg', $img->getUrl());
        $this->assertSame(['width' => 800], $img->getPayload());
    }

    public function test_video(): void
    {
        $vid = new Video('https://example.com/clip.mp4');

        $this->assertSame('https://example.com/clip.mp4', $vid->getUrl());
        $this->assertNull($vid->getPayload());
    }

    public function test_audio(): void
    {
        $audio = new Audio('https://example.com/song.mp3');

        $this->assertSame('https://example.com/song.mp3', $audio->getUrl());
    }

    public function test_file(): void
    {
        $file = new File('https://example.com/doc.pdf', ['name' => 'report.pdf']);

        $this->assertSame('https://example.com/doc.pdf', $file->getUrl());
        $this->assertSame(['name' => 'report.pdf'], $file->getPayload());
    }

    public function test_location(): void
    {
        $loc = new Location(40.7128, -74.0060, ['city' => 'NYC']);

        $this->assertSame(40.7128, $loc->getLatitude());
        $this->assertSame(-74.0060, $loc->getLongitude());
        $this->assertSame(['city' => 'NYC'], $loc->getPayload());
    }

    public function test_location_url_is_empty(): void
    {
        $loc = new Location(0, 0);
        $this->assertSame('', $loc->getUrl());
    }
}
