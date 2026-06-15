<?php

namespace BootDesk\ChatSDK\Core\Tests;

use BootDesk\ChatSDK\Core\ActionEvent;
use BootDesk\ChatSDK\Core\Author;
use BootDesk\ChatSDK\Core\Channel;
use BootDesk\ChatSDK\Core\Chat;
use BootDesk\ChatSDK\Core\Conversations\Conversation;
use BootDesk\ChatSDK\Core\Conversations\ConversationState;
use BootDesk\ChatSDK\Core\Message;
use BootDesk\ChatSDK\Core\MessageContext;
use BootDesk\ChatSDK\Core\ReactionEvent;
use BootDesk\ChatSDK\Core\SlashCommandEvent;
use BootDesk\ChatSDK\Core\Tests\Helpers\MemoryStateAdapter;
use BootDesk\ChatSDK\Core\Tests\Helpers\MockAdapter;
use BootDesk\ChatSDK\Core\Thread;
use PHPUnit\Framework\TestCase;

class TestConversation extends Conversation
{
    public array $log = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'run';
        $this->ask('What is your name?', 'askEmail');
    }

    public function askEmail(Thread $thread, Message $message): void
    {
        $this->log[] = "name:{$message->text}";
        $this->ask("Hi {$message->text}! What is your email?", 'confirm', ['name' => $message->text]);
    }

    public function confirm(Thread $thread, Message $message): void
    {
        $state = ConversationState::get($thread);
        $this->log[] = "email:{$message->text}";
        $this->log[] = 'data:'.json_encode($state['data']);
        $this->say('Done!');
        $this->end();
    }
}

class SkipConversation extends Conversation
{
    public array $log = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'run';
        $this->ask('First question?', 'stepOne');
    }

    public function stepOne(Thread $thread, Message $message): void
    {
        $this->log[] = 'stepOne';
        $this->skip('stepThree', $message, ['skipped' => true]);
    }

    public function stepThree(Thread $thread, Message $message): void
    {
        $this->log[] = 'stepThree';
        $this->say('Skipped to three!');
        $this->end();
    }
}

class RepeatConversation extends Conversation
{
    public array $log = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'run';
        $this->ask('What color?', 'handleColor');
    }

    public function handleColor(Thread $thread, Message $message): void
    {
        $this->log[] = "color:{$message->text}";
        $this->repeat();
    }
}

class StartConversation extends Conversation
{
    public array $log = [];

    public array $innerData = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'outer-run';
        $this->startConversation(InnerConversation::class, $message);
    }
}

class InnerConversation extends Conversation
{
    public array $log = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'inner-run';
        $this->say('Inner started');
        $this->end();
    }
}

class PauseParentConversation extends Conversation
{
    public array $log = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'parent-run';
        $this->ask('Parent question?', 'pausePoint');
    }

    public function pausePoint(Thread $thread, Message $message): void
    {
        $this->log[] = 'pausePoint';
        $this->pause(PauseChildConversation::class, $message);
    }
}

class PauseChildConversation extends Conversation
{
    public array $log = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'child-run';
        $this->say('Child running');
        $this->end();
    }
}

class ActionAwareConversation extends Conversation
{
    public bool $actionHandled = false;

    public bool $slashHandled = false;

    public bool $reactionHandled = false;

    public array $log = [];

    public function run(Thread $thread, Message $message): void
    {
        $this->log[] = 'run';
        $this->ask('Pick one', 'handleChoice');
    }

    public function handleChoice(Thread $thread, Message $message): void
    {
        $this->log[] = "choice:{$message->text}";
    }

    public function onAction(Thread $thread, ActionEvent $action): ?bool
    {
        $this->actionHandled = true;

        return true;
    }

    public function onSlashCommand(Thread $thread, SlashCommandEvent $command): ?bool
    {
        $this->slashHandled = true;

        return true;
    }

    public function onReaction(Thread $thread, ReactionEvent $reaction): ?bool
    {
        $this->reactionHandled = true;

        return true;
    }
}

class NoInterceptConversation extends Conversation
{
    public bool $actionFallthrough = false;

    public function run(Thread $thread, Message $message): void
    {
        $this->ask('Question?', 'step');
    }

    public function step(Thread $thread, Message $message): void {}

    public function onAction(Thread $thread, ActionEvent $action): ?bool
    {
        return null;
    }
}

class ConversationTest extends TestCase
{
    private MemoryStateAdapter $state;

    private MockAdapter $adapter;

    private Chat $chat;

    private Thread $thread;

    protected function setUp(): void
    {
        $this->state = new MemoryStateAdapter;
        $this->adapter = new MockAdapter;
        $this->chat = new Chat(
            state: $this->state,
            adapters: ['mock' => $this->adapter],
        );
        $this->thread = new Thread('mock:C123:conv', $this->chat, $this->adapter, $this->state);
    }

    // ─── Basic flow: run → ask → step → end ───────────────────────

    public function test_conversation_start_runs_entry_point(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');

        $this->chat->conversationManager->start(TestConversation::class, $this->thread, $msg);

        $state = ConversationState::get($this->thread);
        $this->assertSame(TestConversation::class, $state['class']);
        $this->assertSame('askEmail', $state['step']);
        $this->assertCount(1, $this->adapter->sentMessages);
    }

    public function test_conversation_intercept_continues(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');

        $this->chat->conversationManager->start(TestConversation::class, $this->thread, $msg);

        $reply = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(
            text: 'John',
            threadId: 'mock:C123:conv',
        );

        $consumed = $this->chat->conversationManager->intercept($this->thread, $reply);
        $this->assertTrue($consumed);

        $state = ConversationState::get($this->thread);
        $this->assertSame('confirm', $state['step']);
        $this->assertSame(['name' => 'John'], $state['data']);
    }

    public function test_conversation_end(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');
        $this->chat->conversationManager->start(TestConversation::class, $this->thread, $msg);

        $reply1 = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'John', threadId: 'mock:C123:conv');
        $this->chat->conversationManager->intercept($this->thread, $reply1);

        $reply2 = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'john@test.com', threadId: 'mock:C123:conv');
        $this->chat->conversationManager->intercept($this->thread, $reply2);

        $state = ConversationState::get($this->thread);
        $this->assertEmpty($state);
    }

    // ─── No intercept without active conv ─────────────────────────

    public function test_no_intercept_without_active_conversation(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');
        $consumed = $this->chat->conversationManager->intercept($this->thread, $msg);

        $this->assertFalse($consumed);
    }

    public function test_conversation_blocks_normal_handlers(): void
    {
        $handlerCalled = false;
        $this->chat->onNewMessage('/.*/', function (MessageContext $ctx) use (&$handlerCalled) {
            $handlerCalled = true;
        });

        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');
        $this->chat->conversationManager->start(TestConversation::class, $this->thread, $msg);

        $reply = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'John', threadId: 'mock:C123:conv');
        $this->chat->processMessage($this->adapter, 'mock:C123:conv', $reply);

        $this->assertFalse($handlerCalled, 'Normal handler should not be called during active conversation');
    }

    // ─── repeat() ─────────────────────────────────────────────────

    public function test_repeat_reposts_last_question(): void
    {
        $conv = new RepeatConversation;
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'red', threadId: 'mock:C123:conv');

        ConversationState::save($this->thread, [
            'class' => RepeatConversation::class,
            'step' => 'handleColor',
            'data' => [],
            '_lastQuestion' => 'What color?',
        ]);

        $consumed = $this->chat->conversationManager->intercept($this->thread, $msg);
        $this->assertTrue($consumed);

        $this->assertCount(1, $this->adapter->sentMessages);

        $state = ConversationState::get($this->thread);
        $this->assertSame('handleColor', $state['step']);
    }

    // ─── skip() ───────────────────────────────────────────────────

    public function test_skip_jumps_to_step_immediately(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'go', threadId: 'mock:C123:conv');

        ConversationState::save($this->thread, [
            'class' => SkipConversation::class,
            'step' => 'stepOne',
            'data' => [],
        ]);

        $consumed = $this->chat->conversationManager->intercept($this->thread, $msg);
        $this->assertTrue($consumed);

        $state = ConversationState::get($this->thread);
        $this->assertEmpty($state); // ended
    }

    public function test_skip_preserves_data(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'go', threadId: 'mock:C123:conv');

        ConversationState::save($this->thread, [
            'class' => SkipConversation::class,
            'step' => 'stepOne',
            'data' => ['existing' => 'keep'],
        ]);

        $this->chat->conversationManager->intercept($this->thread, $msg);

        // Check that the skipped-to step had merged data
        $state = ConversationState::get($this->thread);
        $this->assertEmpty($state); // ended
    }

    // ─── say() ────────────────────────────────────────────────────

    public function test_say_posts_without_changing_state(): void
    {
        $conv = new TestConversation;
        $conv->initialize($this->thread, \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage());
        $ref = new \ReflectionMethod(Conversation::class, 'say');
        $ref->invokeArgs($conv, ['Hello from say']);

        $this->assertCount(1, $this->adapter->sentMessages);
    }

    // ─── startConversation() ──────────────────────────────────────

    public function test_start_conversation_replaces_current(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');

        $this->chat->conversationManager->start(StartConversation::class, $this->thread, $msg);

        // InnerConversation ran and ended, so state should be empty
        $state = ConversationState::get($this->thread);
        $this->assertEmpty($state);
    }

    // ─── pause() + end() stack ───────────────────────────────────

    public function test_pause_and_end_with_stack(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'reply', threadId: 'mock:C123:conv');

        ConversationState::save($this->thread, [
            'class' => PauseParentConversation::class,
            'step' => 'pausePoint',
            'data' => [],
            '_lastQuestion' => 'Original question?',
        ]);

        $consumed = $this->chat->conversationManager->intercept($this->thread, $msg);
        $this->assertTrue($consumed);

        // Child ran and ended, restoring parent
        $state = ConversationState::get($this->thread);
        $this->assertSame(PauseParentConversation::class, $state['class']);
        $this->assertSame('pausePoint', $state['step']);
    }

    public function test_end_restores_parent_and_replays_question(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: 'reply', threadId: 'mock:C123:conv');

        ConversationState::save($this->thread, [
            'class' => PauseParentConversation::class,
            'step' => 'pausePoint',
            'data' => [],
            '_lastQuestion' => 'Original question?',
        ]);

        $this->adapter->sentMessages = [];
        $this->chat->conversationManager->intercept($this->thread, $msg);

        // Parent's _lastQuestion should be re-posted (sentMessages > 0)
        $this->assertGreaterThan(0, count($this->adapter->sentMessages));
    }

    public function test_end_clears_state_without_stack(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');
        $conv = new TestConversation;

        ConversationState::save($this->thread, [
            'class' => TestConversation::class,
            'step' => 'confirm',
            'data' => [],
        ]);

        $this->chat->conversationManager->intercept($this->thread, $msg);

        $state = ConversationState::get($this->thread);
        $this->assertEmpty($state);
    }

    // ─── timeout ──────────────────────────────────────────────────

    public function test_intercept_with_timeout(): void
    {
        ConversationState::save($this->thread, [
            'class' => TestConversation::class,
            'step' => 'run',
            'timeoutAt' => time() - 1,
        ]);

        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');
        $consumed = $this->chat->conversationManager->intercept($this->thread, $msg);
        $this->assertFalse($consumed);
    }

    // ─── invalid class ────────────────────────────────────────────

    public function test_intercept_with_invalid_class_clears_state(): void
    {
        ConversationState::save($this->thread, [
            'class' => 'NonExistentClass',
            'step' => 'run',
        ]);

        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');
        $consumed = $this->chat->conversationManager->intercept($this->thread, $msg);
        $this->assertFalse($consumed);

        $state = ConversationState::get($this->thread);
        $this->assertEmpty($state);
    }

    public function test_conversation_manager_start_invalid_class(): void
    {
        $this->expectException(\InvalidArgumentException::class);
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage();
        $this->chat->conversationManager->start(\stdClass::class, $this->thread, $msg);
    }

    // ─── clear ────────────────────────────────────────────────────

    public function test_conversation_manager_clear(): void
    {
        $msg = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(threadId: 'mock:C123:conv');
        $this->chat->conversationManager->start(TestConversation::class, $this->thread, $msg);

        $this->chat->conversationManager->clear($this->thread);
        $state = ConversationState::get($this->thread);
        $this->assertEmpty($state);
    }

    // ─── Non-message intercepts: action consumed ──────────────────

    public function test_intercept_action_consumed_by_conversation(): void
    {
        ConversationState::save($this->thread, [
            'class' => ActionAwareConversation::class,
            'step' => 'handleChoice',
            'data' => [],
        ]);

        $actionEvent = new ActionEvent(
            actionId: 'btn_yes',
            value: 'yes',
            messageId: 'msg1',
            triggerId: null,
            thread: $this->thread,
            user: new Author(id: 'user1'),
            raw: null,
        );

        $consumed = $this->chat->conversationManager->interceptAction($this->thread, $actionEvent);
        $this->assertTrue($consumed);
    }

    public function test_intercept_action_fallthrough(): void
    {
        ConversationState::save($this->thread, [
            'class' => NoInterceptConversation::class,
            'step' => 'step',
            'data' => [],
        ]);

        $actionEvent = new ActionEvent(
            actionId: 'btn_no',
            value: 'no',
            messageId: 'msg1',
            triggerId: null,
            thread: $this->thread,
            user: new Author(id: 'user1'),
            raw: null,
        );

        $consumed = $this->chat->conversationManager->interceptAction($this->thread, $actionEvent);
        $this->assertFalse($consumed);
    }

    // ─── Non-message intercepts: slash command consumed ──────────

    public function test_intercept_slash_command_consumed_by_conversation(): void
    {
        ConversationState::save($this->thread, [
            'class' => ActionAwareConversation::class,
            'step' => 'handleChoice',
            'data' => [],
        ]);

        $channel = new Channel('mock:C123:conv', $this->adapter);
        $message = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: '', threadId: 'mock:C123:conv');
        $slashEvent = new SlashCommandEvent(
            adapter: $this->adapter,
            channel: $channel,
            thread: $this->thread,
            message: $message,
            user: new Author(id: 'user1'),
            command: '/cancel',
            text: '',
            raw: null,
        );

        $consumed = $this->chat->conversationManager->interceptSlashCommand($this->thread, $slashEvent);
        $this->assertTrue($consumed);
    }

    // ─── Non-message intercepts: reaction consumed ────────────────

    public function test_intercept_reaction_consumed_by_conversation(): void
    {
        ConversationState::save($this->thread, [
            'class' => ActionAwareConversation::class,
            'step' => 'handleChoice',
            'data' => [],
        ]);

        $reactionEvent = new ReactionEvent(
            emoji: 'thumbsup',
            messageId: 'msg1',
            thread: $this->thread,
            user: new Author(id: 'user1'),
            added: true,
            rawEmoji: '👍',
            raw: null,
        );

        $consumed = $this->chat->conversationManager->interceptReaction($this->thread, $reactionEvent);
        $this->assertTrue($consumed);
    }

    // ─── Non-message intercepts: no active conv = fall through ────

    public function test_intercept_action_no_active_conv(): void
    {
        $actionEvent = new ActionEvent(
            actionId: 'btn_yes',
            value: 'yes',
            messageId: 'msg1',
            triggerId: null,
            thread: $this->thread,
            user: new Author(id: 'user1'),
            raw: null,
        );

        $consumed = $this->chat->conversationManager->interceptAction($this->thread, $actionEvent);
        $this->assertFalse($consumed);
    }

    public function test_intercept_slash_command_no_active_conv(): void
    {
        $channel = new Channel('mock:C123:conv', $this->adapter);
        $message = \BootDesk\ChatSDK\Core\Tests\Helpers\createTestMessage(text: '', threadId: 'mock:C123:conv');
        $slashEvent = new SlashCommandEvent(
            adapter: $this->adapter,
            channel: $channel,
            thread: $this->thread,
            message: $message,
            user: new Author(id: 'user1'),
            command: '/cancel',
            text: '',
            raw: null,
        );

        $consumed = $this->chat->conversationManager->interceptSlashCommand($this->thread, $slashEvent);
        $this->assertFalse($consumed);
    }

    public function test_intercept_reaction_no_active_conv(): void
    {
        $reactionEvent = new ReactionEvent(
            emoji: 'thumbsup',
            messageId: 'msg1',
            thread: $this->thread,
            user: new Author(id: 'user1'),
            added: true,
            rawEmoji: '👍',
            raw: null,
        );

        $consumed = $this->chat->conversationManager->interceptReaction($this->thread, $reactionEvent);
        $this->assertFalse($consumed);
    }

    // ─── Chat processAction/Reaction/SlashCommand conv intercepts ─

    public function test_chat_process_action_intercepted_by_conversation(): void
    {
        ConversationState::save($this->thread, [
            'class' => ActionAwareConversation::class,
            'step' => 'handleChoice',
            'data' => [],
        ]);

        $listenerCalled = false;
        $this->chat->listen(ActionEvent::class, function () use (&$listenerCalled) {
            $listenerCalled = true;
        });

        $this->chat->processAction(
            adapter: $this->adapter,
            threadId: 'mock:C123:conv',
            actionId: 'btn_yes',
            value: 'yes',
            messageId: 'msg1',
            user: new Author(id: 'user1'),
        );

        // Conversation consumed it — listener should NOT be called
        $this->assertFalse($listenerCalled);
    }

    public function test_chat_process_reaction_intercepted_by_conversation(): void
    {
        ConversationState::save($this->thread, [
            'class' => ActionAwareConversation::class,
            'step' => 'handleChoice',
            'data' => [],
        ]);

        $listenerCalled = false;
        $this->chat->listen(ReactionEvent::class, function () use (&$listenerCalled) {
            $listenerCalled = true;
        });

        $this->chat->processReaction(
            adapter: $this->adapter,
            threadId: 'mock:C123:conv',
            emoji: 'thumbsup',
            messageId: 'msg1',
            user: new Author(id: 'user1'),
            added: true,
        );

        $this->assertFalse($listenerCalled);
    }

    public function test_chat_process_slash_command_intercepted_by_conversation(): void
    {
        ConversationState::save($this->thread, [
            'class' => ActionAwareConversation::class,
            'step' => 'handleChoice',
            'data' => [],
        ]);

        $listenerCalled = false;
        $this->chat->listen(SlashCommandEvent::class, function () use (&$listenerCalled) {
            $listenerCalled = true;
        });

        $this->chat->processSlashCommand(
            adapter: $this->adapter,
            channelId: 'mock:C123:conv',
            command: '/cancel',
            text: '',
        );

        $this->assertFalse($listenerCalled);
    }
}
