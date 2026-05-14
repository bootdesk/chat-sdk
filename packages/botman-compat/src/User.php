<?php

namespace BotMan\BotMan;

class User
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $firstName = null,
        public readonly ?string $lastName = null,
        public readonly ?string $username = null,
        public readonly ?array $extras = [],
    ) {}

    public function getFirstName(): ?string
    {
        return $this->firstName;
    }

    public function getLastName(): ?string
    {
        return $this->lastName;
    }

    public function getUsername(): ?string
    {
        return $this->username;
    }

    public function getId(): string
    {
        return $this->id;
    }

    public function getInfo(): array
    {
        return $this->extras;
    }
}
