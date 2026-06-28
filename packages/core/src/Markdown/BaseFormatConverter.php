<?php

namespace BootDesk\ChatSDK\Core\Markdown;

use BootDesk\ChatSDK\Core\Contracts\FormatConverter;
use BootDesk\ChatSDK\Core\PostableMessage;
use League\CommonMark\Environment\Environment;
use League\CommonMark\Extension\CommonMark\CommonMarkCoreExtension;
use League\CommonMark\Extension\CommonMark\Node\Block\BlockQuote;
use League\CommonMark\Extension\CommonMark\Node\Block\FencedCode;
use League\CommonMark\Extension\CommonMark\Node\Block\Heading;
use League\CommonMark\Extension\CommonMark\Node\Block\IndentedCode;
use League\CommonMark\Extension\CommonMark\Node\Block\ListBlock;
use League\CommonMark\Extension\CommonMark\Node\Block\ListItem;
use League\CommonMark\Extension\CommonMark\Node\Block\ThematicBreak;
use League\CommonMark\Extension\CommonMark\Node\Inline\Code;
use League\CommonMark\Extension\CommonMark\Node\Inline\Emphasis;
use League\CommonMark\Extension\CommonMark\Node\Inline\Image;
use League\CommonMark\Extension\CommonMark\Node\Inline\Link;
use League\CommonMark\Extension\CommonMark\Node\Inline\Strong;
use League\CommonMark\Node\Block\Document;
use League\CommonMark\Node\Block\Paragraph;
use League\CommonMark\Node\Inline\Newline;
use League\CommonMark\Node\Inline\Text;
use League\CommonMark\Parser\MarkdownParser;

abstract class BaseFormatConverter implements FormatConverter
{
    private Environment $environment;

    private MarkdownParser $parser;

    public function __construct()
    {
        $this->environment = new Environment([
            'html_input' => 'strip',
            'allow_unsafe_links' => false,
        ]);
        $this->environment->addExtension(new CommonMarkCoreExtension);
        $this->parser = new MarkdownParser($this->environment);
    }

    abstract public function toAst(string $platformText): Document;

    abstract public function fromAst(Document $ast): string;

    public function fromMarkdown(string $markdown): string
    {
        $ast = $this->parseMarkdown($markdown);

        return $this->fromAst($ast);
    }

    public function extractPlainText(string $platformText): string
    {
        $ast = $this->toAst($platformText);

        return $this->astToPlainText($ast);
    }

    public function renderPostable(PostableMessage $message): string
    {
        if ($message->isCard()) {
            return $message->content->getFallbackText();
        }

        return (string) $message->content;
    }

    protected function parseMarkdown(string $markdown): Document
    {
        return $this->parser->parse($markdown);
    }

    protected function renderMarkdown(Document $ast): string
    {
        $walker = $ast->walker();
        $output = '';
        $closeStack = [];
        $listStack = [];
        $inBlockQuote = false;

        while ($event = $walker->next()) {
            $node = $event->getNode();
            $entering = $event->isEntering();

            if ($entering) {
                switch ($node::class) {
                    case Text::class:
                        $output .= $node->getLiteral();
                        break;

                    case Strong::class:
                        $output .= '**';
                        $closeStack[] = '**';
                        break;

                    case Emphasis::class:
                        $output .= '*';
                        $closeStack[] = '*';
                        break;

                    case Heading::class:
                        $level = $node->getLevel();
                        $output .= str_repeat('#', $level).' ';
                        $closeStack[] = "\n";
                        break;

                    case Link::class:
                        $output .= '[';
                        $closeStack[] = ']('.$node->getUrl().')';
                        break;

                    case Image::class:
                        $output .= '![';
                        $closeStack[] = ']('.$node->getUrl().')';
                        break;

                    case Code::class:
                        $output .= '`'.$node->getLiteral().'`';
                        break;

                    case FencedCode::class:
                        $info = $node->getInfo() ?? '';
                        $code = rtrim($node->getLiteral(), "\n");
                        $output .= "```{$info}\n{$code}\n```";
                        break;

                    case IndentedCode::class:
                        $code = rtrim($node->getLiteral(), "\n");
                        $output .= "    {$code}";
                        break;

                    case BlockQuote::class:
                        $inBlockQuote = true;
                        $output .= '> ';
                        $closeStack[] = '';
                        break;

                    case ListBlock::class:
                        $data = $node->getListData();
                        $listStack[] = [
                            'type' => $data->type,
                            'counter' => $data->start ?? 1,
                        ];
                        break;

                    case ListItem::class:
                        $listInfo = $listStack !== [] ? $listStack[array_key_last($listStack)] : null;
                        if ($listInfo !== null && $listInfo['type'] === ListBlock::TYPE_ORDERED) {
                            $output .= "{$listInfo['counter']}. ";
                            $listStack[array_key_last($listStack)]['counter']++;
                        } else {
                            $output .= '- ';
                        }
                        break;

                    case ThematicBreak::class:
                        $output .= "---\n";
                        break;

                    case Newline::class:
                        if ($node->getType() === Newline::HARDBREAK) {
                            $output .= "  \n";
                        } else {
                            $output .= "\n";
                        }
                        break;

                    case Paragraph::class:
                        break;
                }
            } else {
                switch ($node::class) {
                    case Strong::class:
                    case Emphasis::class:
                    case Link::class:
                    case Image::class:
                    case BlockQuote::class:

                    case Heading::class:
                        if ($closeStack !== []) {
                            $output .= array_pop($closeStack);
                        }
                        break;

                    case Paragraph::class:
                        if ($listStack === []) {
                            $output .= "\n\n";
                        }
                        break;

                    case ListItem::class:
                        $output .= "\n";
                        break;

                    case ListBlock::class:
                        array_pop($listStack);
                        $output .= "\n";
                        break;
                }
            }
        }

        return trim($output);
    }

    private function astToPlainText(Document $ast): string
    {
        $walker = $ast->walker();
        $text = '';

        while ($event = $walker->next()) {
            $node = $event->getNode();
            if ($event->isEntering() && method_exists($node, 'getLiteral')) {
                $text .= $node->getLiteral();
            }
        }

        return trim($text);
    }
}
