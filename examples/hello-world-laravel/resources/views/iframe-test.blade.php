<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Embed Test — BootDesk Chat</title>

    @fonts

    @vite(['resources/css/app.css', 'resources/js/embed-chat.js'])

    <style>
        * {
            box-sizing: border-box;
        }

        body {
            margin: 0;
            font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;
            background: #f9fafb;
            color: #1b1b18;
            min-height: 100vh;
        }

        .hero {
            max-width: 600px;
            margin: 0 auto;
            padding: 6rem 2rem;
            text-align: center;
        }

        .hero h1 {
            font-size: 1.75rem;
            font-weight: 600;
            margin: 0 0 0.75rem;
        }

        .hero p {
            color: #706f6c;
            font-size: 0.9375rem;
            line-height: 1.6;
            margin: 0 0 1rem;
        }

        .hero code {
            background: #f3f4f6;
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-size: 0.8125rem;
        }

        .embed-snippet {
            display: inline-block;
            background: #1e1e2e;
            color: #e2e8f0;
            font-size: 0.8125rem;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            text-align: left;
            font-family: 'SF Mono', 'Fira Code', monospace;
            line-height: 1.7;
            margin: 1rem 0 0;
            max-width: 100%;
            overflow-x: auto;
        }

        .demo-nav {
            display: flex;
            gap: 0.25rem;
            background: #f3f4f6;
            border-radius: 8px;
            padding: 0.25rem;
            width: fit-content;
            margin: 2rem auto 0;
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
    <div class="hero">
        <nav class="demo-nav">
            <a href="/">Home</a>
            <a href="/iframe">Panel</a>
            <a href="/iframe-floating">Floating</a>
            <a href="/iframe-test" class="active">Embed</a>
        </nav>

        <h1>Embed Script Test</h1>
        <p>
            This page simulates a third-party site that installs the chat widget
            via a small embed script. The script creates the floating button and
            iframe dynamically — no HTML needed.
        </p>
        <p>
            Click the chat bubble at the bottom-right. The iframe opens with a
            slide animation. Messages you send are logged to the console.
        </p>
        <div class="embed-snippet">
            &lt;script src="https://chat.example.com/embed.js"&gt;&lt;/script&gt;
        </div>
    </div>
</body>

</html>
