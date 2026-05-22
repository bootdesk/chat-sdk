<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'Laravel') }} — Chat Example</title>

    @fonts

    @viteReactRefresh
    @vite(['resources/css/app.css', 'resources/js/app.jsx'])

    <style>
        :root {
            --chat-primary: #f53003;
            --chat-primary-hover: #d42a00;
            --chat-background: #ffffff;
            --chat-text: #1b1b18;
            --chat-text-secondary: #706f6c;
            --chat-border: #e3e3e0;
            --chat-surface: #f5f5f4;
            --chat-success: #22c55e;
            --chat-error: #ef4444;
        }

        /* Dark mode overrides — applied when dev uses data-chat-theme="dark" on any container */
        [data-chat-theme="dark"] {
                --chat-primary: #ff4433;
                --chat-primary-hover: #ff1a1a;
                --chat-background: #161615;
                --chat-text: #ededec;
                --chat-text-secondary: #a1a09a;
                --chat-border: #3e3e3a;
                --chat-surface: #222221;
                --chat-success: #4ade80;
                --chat-error: #f87171;
            }

        body {
            margin: 0;
            font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
            background: var(--chat-background);
            color: var(--chat-text);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .hero {
            text-align: center;
            max-width: 480px;
            padding: 2rem;
        }

        .hero h1 {
            font-size: 1.5rem;
            font-weight: 600;
            margin: 0 0 0.5rem;
        }

        .hero p {
            color: var(--chat-text-secondary);
            margin: 0 0 0.25rem;
            font-size: 0.875rem;
            line-height: 1.5;
        }
        .nav-links {
            margin-top: 1.5rem;
            display: flex;
            flex-direction: column;
            gap: 0.5rem;
        }

        .nav-links a {
            display: block;
            padding: 0.625rem 1rem;
            border-radius: 8px;
            background: var(--chat-surface);
            color: var(--chat-text);
            text-decoration: none;
            font-size: 0.875rem;
            font-weight: 500;
            transition: background 0.15s;
        }

        .nav-links a:hover {
            background: var(--chat-border);
        }

        .nav-links a span {
            display: block;
            font-size: 0.75rem;
            font-weight: 400;
            color: var(--chat-text-secondary);
            margin-top: 0.125rem;
        }
    </style>
</head>

<body>
    <div class="hero">
        <h1>BootDesk Chat</h1>
        <p>Click the chat bubble in the bottom-right corner to start a conversation.</p>
        <p>Try: <code>hello</code>, <code>order pizza</code>, <code>status</code>, <code>photo sunset</code></p>

        <div class="nav-links">
            <a href="/iframe">
                Iframe Bridge Demo
                <span>Slide-in panel with iframe + postMessage config controls</span>
            </a>
            <a href="/iframe-floating">
                Floating in Iframe
                <span>Floating widget in a phone-sized iframe preview</span>
            </a>
            <a href="/iframe-test">
                Embed Script Test
                <span>Third-party embed script — dynamic button + iframe creation</span>
            </a>
            <a href="/chat-signed-upload">
                Signed Upload Demo
                <span>Multi-step signed URL attachment upload (AttachmentUploadConfig)</span>
            </a>
        </div>
    </div>

    <div id="app"></div>
</body>

</html>
