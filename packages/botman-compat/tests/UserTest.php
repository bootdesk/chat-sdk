<?php

namespace BotMan\BotMan\Tests;

use BotMan\BotMan\User;
use PHPUnit\Framework\TestCase;

class UserTest extends TestCase
{
    public function test_user_properties(): void
    {
        $user = new User('u-123', 'John', 'Doe', 'johndoe', ['team' => 'eng']);

        $this->assertSame('u-123', $user->getId());
        $this->assertSame('John', $user->getFirstName());
        $this->assertSame('Doe', $user->getLastName());
        $this->assertSame('johndoe', $user->getUsername());
        $this->assertSame(['team' => 'eng'], $user->getInfo());
    }

    public function test_user_nullables(): void
    {
        $user = new User('u-1');

        $this->assertNull($user->getFirstName());
        $this->assertNull($user->getLastName());
        $this->assertNull($user->getUsername());
        $this->assertSame([], $user->getInfo());
    }
}
