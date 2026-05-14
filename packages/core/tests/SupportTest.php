<?php

namespace BootDesk\ChatSDK\Core\Tests;

use BootDesk\ChatSDK\Core\Support\Arr;
use BootDesk\ChatSDK\Core\Support\Str;
use PHPUnit\Framework\TestCase;

class SupportTest extends TestCase
{
    public function test_arr_get_simple_key(): void
    {
        $this->assertSame('bar', Arr::get(['foo' => 'bar'], 'foo'));
    }

    public function test_arr_get_dot_notation(): void
    {
        $this->assertSame('baz', Arr::get(['foo' => ['bar' => 'baz']], 'foo.bar'));
    }

    public function test_arr_get_default(): void
    {
        $this->assertNull(Arr::get([], 'missing'));
        $this->assertSame('fallback', Arr::get([], 'missing', 'fallback'));
    }

    public function test_arr_get_deeply_nested(): void
    {
        $data = ['a' => ['b' => ['c' => 'deep']]];
        $this->assertSame('deep', Arr::get($data, 'a.b.c'));
    }

    public function test_arr_set_simple(): void
    {
        $data = ['foo' => 'bar'];
        Arr::set($data, 'baz', 'qux');
        $this->assertSame(['foo' => 'bar', 'baz' => 'qux'], $data);
    }

    public function test_arr_set_dot_notation(): void
    {
        $data = [];
        Arr::set($data, 'foo.bar.baz', 'deep');
        $this->assertSame(['foo' => ['bar' => ['baz' => 'deep']]], $data);
    }

    public function test_arr_set_overwrite_existing(): void
    {
        $data = ['nested' => ['key' => 'old']];
        Arr::set($data, 'nested.key', 'new');
        $this->assertSame(['nested' => ['key' => 'new']], $data);
    }

    public function test_arr_set_overwrite_non_array(): void
    {
        $data = ['nested' => 'scalar'];
        Arr::set($data, 'nested.key', 'value');
        $this->assertSame(['nested' => ['key' => 'value']], $data);
    }

    public function test_arr_except(): void
    {
        $result = Arr::except(['a' => 1, 'b' => 2, 'c' => 3], ['a', 'c']);
        $this->assertSame(['b' => 2], $result);
    }

    public function test_arr_get_invalid_key_segment(): void
    {
        $data = ['foo' => 'not_array'];
        $this->assertSame('default', Arr::get($data, 'foo.bar', 'default'));
    }

    public function test_str_starts_with(): void
    {
        $this->assertTrue(Str::startsWith('hello world', 'hello'));
        $this->assertFalse(Str::startsWith('hello world', 'world'));
    }

    public function test_str_camel(): void
    {
        $this->assertSame('helloWorld', Str::camel('hello_world'));
        $this->assertSame('fooBarBaz', Str::camel('foo_bar_baz'));
        $this->assertSame('single', Str::camel('single'));
    }

    public function test_str_snake(): void
    {
        $this->assertSame('hello_world', Str::snake('helloWorld'));
        $this->assertSame('foo_bar_baz', Str::snake('fooBarBaz'));
        $this->assertSame('single', Str::snake('single'));
    }
}
