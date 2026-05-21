<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Floating in Iframe — BootDesk Chat</title>

    @fonts

    @vite(['resources/css/app.css'])

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

        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
            background: #f0efed;
            color: #1b1b18;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 2rem;
        }

        .description {
            text-align: center;
            max-width: 500px;
        }

        .description h1 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 0.5rem;
        }

        .description p {
            color: #706f6c;
            font-size: 0.875rem;
            margin: 0;
            line-height: 1.5;
        }

        .phone-frame {
            position: relative;
            width: 420px;
            height: 640px;
            background: #fff;
            border-radius: 24px;
            box-shadow:
                0 0 0 1px rgba(0, 0, 0, 0.08),
                0 8px 32px rgba(0, 0, 0, 0.12);
            overflow: hidden;
        }

        .phone-frame iframe {
            width: 100%;
            height: 100%;
            border: none;
        }

        .label {
            font-size: 0.75rem;
            color: #a1a09a;
            text-align: center;
        }

        .demo-nav {
            display: flex;
            gap: 0.25rem;
            background: #e4e4e1;
            border-radius: 8px;
            padding: 0.25rem;
        }

        .demo-nav a {
            padding: 0.375rem 0.75rem;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 500;
            text-decoration: none;
            color: #706f6c;
            transition: background 0.15s, color 0.15s;
        }

        .demo-nav a:hover {
            color: #1b1b18;
        }

        .demo-nav a.active {
            background: #fff;
            color: #1b1b18;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
    </style>
</head>

<body>
    <nav class="demo-nav" style="position:fixed;top:1rem;left:50%;translate:-50%;z-index:10;">
        <a href="/">Home</a>
        <a href="/iframe">Panel</a>
        <a href="/iframe-floating" class="active">Floating</a>
        <a href="/iframe-test">Embed</a>
    </nav>

    <div class="description">
        <h1>Floating Widget in iframe</h1>
        <p>The chat widget runs inside a phone-sized iframe in floating mode. The bubble and popup are contained within the iframe.</p>
    </div>

    <div class="phone-frame">
        <iframe src="/chat-iframe-floating" title="Chat Widget"></iframe>
    </div>

    <div class="label">Click the chat bubble inside the frame</div>
</body>

</html>
