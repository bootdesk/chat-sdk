# Modals

Modals are platform-agnostic form value objects converted to each platform's native format. Currently supported by Slack (Block Kit modals).

## Creating a Modal

```php
use BootDesk\ChatSDK\Core\Modals\Modal;
use BootDesk\ChatSDK\Core\Modals\TextInput;
use BootDesk\ChatSDK\Core\Modals\Select;
use BootDesk\ChatSDK\Core\Modals\SelectOption;

$modal = Modal::make('feedback', 'Send Feedback')
    ->textInput(
        TextInput::make('title', 'Title')
            ->placeholder('Brief summary')
            ->maxLength(100)
    )
    ->textInput(
        TextInput::make('description', 'Description')
            ->multiline()
            ->placeholder('Detailed feedback...')
    )
    ->select(
        Select::make('category', 'Category')
            ->options([
                SelectOption::make('bug', 'Bug Report'),
                SelectOption::make('feature', 'Feature Request'),
                SelectOption::make('other', 'Other'),
            ])
    );
```

## Opening a Modal

From a slash command or action handler:

```php
$chat->onSlashCommand(function (SlashCommandEvent $event) {
    $modal = Modal::make('feedback', 'Submit Feedback')
        ->textInput(TextInput::make('message', 'Message'));

    $event->openModal($modal);
});
```

## Handling Submission

```php
$chat->onModalSubmit(function (ModalSubmitEvent $event) {
    $title = $event->values['title'];
    $description = $event->values['description'];
    $category = $event->values['category'];

    $event->thread->post("Thanks for your {$category} feedback!");
});
```

## Modal Elements

### Text Input

```php
TextInput::make('field_id', 'Label')
    ->placeholder('Hint text')
    ->initialValue('Default')
    ->maxLength(500)
    ->multiline()       // Textarea mode
    ->minLength(10);
```

### Select

```php
Select::make('field_id', 'Choose one')
    ->options([
        SelectOption::make('val1', 'Label 1'),
        SelectOption::make('val2', 'Label 2'),
    ])
    ->initialValue('val1')
    ->placeholder('Select...');
```

### External Select

```php
use BootDesk\ChatSDK\Core\Modals\ExternalSelect;

ExternalSelect::make('user', 'Search Users')
    ->minQueryLength(2)
    ->placeholder('Type to search...');
```

Handle the options load:

```php
$chat->onOptionsLoad(function (OptionsLoadEvent $event) {
    if ($event->actionId === 'user') {
        $users = searchUsers($event->query);
        return array_map(
            fn ($u) => SelectOption::make($u['id'], $u['name']),
            $users
        );
    }
});
```

### Radio Select

```php
use BootDesk\ChatSDK\Core\Modals\RadioSelect;

RadioSelect::make('priority', 'Priority')
    ->options([
        SelectOption::make('low', 'Low'),
        SelectOption::make('medium', 'Medium'),
        SelectOption::make('high', 'High'),
    ]);
```

## Platform Support

| Feature         | Slack |
| --------------- | ----- |
| Text Input      | ✓     |
| Select          | ✓     |
| External Select | ✓     |
| Radio Select    | ✓     |
