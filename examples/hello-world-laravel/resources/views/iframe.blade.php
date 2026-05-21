<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Iframe Bridge Demo — BootDesk Chat</title>

    @fonts

    @viteReactRefresh
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

        .app-header {
            background: #fff;
            border-bottom: 1px solid #e3e3e0;
            padding: 0.75rem 2rem;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .app-header h1 {
            font-size: 1rem;
            font-weight: 600;
            margin: 0;
        }

        .app-header .subtitle {
            font-size: 0.75rem;
            color: #706f6c;
        }

        .open-chat-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1.25rem;
            border: none;
            border-radius: 999px;
            background: var(--chat-primary);
            color: #fff;
            font-size: 0.875rem;
            font-weight: 500;
            font-family: inherit;
            cursor: pointer;
            transition: background 0.2s;
        }

        .open-chat-btn:hover {
            background: var(--chat-primary-hover);
        }

        .main-content {
            max-width: 640px;
            margin: 4rem auto;
            padding: 0 2rem;
        }

        .main-content h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin: 0 0 1rem;
        }

        .main-content p {
            color: #706f6c;
            font-size: 0.875rem;
            line-height: 1.6;
            margin: 0 0 0.5rem;
        }

        .main-content code {
            background: #f3f4f6;
            padding: 0.125rem 0.375rem;
            border-radius: 4px;
            font-size: 0.8125rem;
        }

        .message-log {
            margin-top: 2rem;
            border: 1px solid #e3e3e0;
            border-radius: 8px;
            background: #fff;
            overflow: hidden;
        }

        .message-log-header {
            padding: 0.5rem 0.75rem;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #706f6c;
            background: #f9fafb;
            border-bottom: 1px solid #e3e3e0;
        }

        .message-log-list {
            padding: 0.5rem 0.75rem;
            min-height: 60px;
            max-height: 200px;
            overflow-y: auto;
            font-size: 0.8125rem;
        }

        .message-log-list .entry {
            padding: 0.25rem 0;
            color: #706f6c;
        }

        .message-log-list .entry .msg-text {
            color: #1b1b18;
        }

        .message-log-list .empty {
            color: #a1a09a;
            font-style: italic;
        }

        .chat-panel-overlay {
            display: none;
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 100;
            opacity: 0;
            transition: opacity 0.2s;
        }

        .chat-panel-overlay.open {
            display: block;
            opacity: 1;
        }

        .chat-panel {
            position: fixed;
            top: 0;
            right: 0;
            bottom: 0;
            width: 420px;
            max-width: 100dvw;
            background: #fff;
            z-index: 101;
            box-shadow: -4px 0 24px rgba(0, 0, 0, 0.12);
            display: flex;
            flex-direction: column;
            transform: translateX(100%);
            transition: transform 0.25s ease;
        }

        .chat-panel.open {
            transform: translateX(0);
        }

        .chat-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0.75rem 1rem;
            border-bottom: 1px solid #e3e3e0;
        }

        .chat-panel-header .panel-title {
            font-size: 0.875rem;
            font-weight: 600;
        }

        .chat-panel-header .panel-controls {
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }

        .chat-panel-header .panel-controls input,
        .chat-panel-header .panel-controls select {
            font-size: 0.75rem;
            padding: 0.25rem 0.5rem;
            border: 1px solid #e3e3e0;
            border-radius: 4px;
            font-family: inherit;
            max-width: 120px;
        }

        .chat-panel-header button {
            background: none;
            border: none;
            cursor: pointer;
            color: #706f6c;
            padding: 0.25rem;
            border-radius: 4px;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .chat-panel-header button:hover {
            background: #f3f4f6;
            color: #1b1b18;
        }

        .chat-panel-iframe {
            flex: 1;
            border: none;
            width: 100%;
        }

        .demo-nav {
            display: flex;
            gap: 0.25rem;
            background: #f3f4f6;
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
    <header class="app-header">
        <div style="display:flex;align-items:center;gap:1rem;">
            <div>
                <h1>BootDesk Chat</h1>
                <div class="subtitle">Iframe Bridge Demo</div>
            </div>
            <nav class="demo-nav">
                <a href="/">Home</a>
                <a href="/iframe" class="active">Panel</a>
                <a href="/iframe-floating">Floating</a>
                <a href="/iframe-test">Embed</a>
            </nav>
        </div>
        <button class="open-chat-btn" id="openChatBtn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            Chat
        </button>
    </header>

    <div class="main-content">
        <h2>iframe Bridge Test</h2>
        <p>This page embeds the chat widget in an <code>&lt;iframe&gt;</code> and communicates via <code>postMessage</code>.</p>
        <p>The parent sends config overrides (title, placeholder) to the iframe. The iframe forwards every chat message back to the parent.</p>

        <div class="message-log">
            <div class="message-log-header">Messages from iframe</div>
            <div class="message-log-list" id="messageLog">
                <div class="empty">Waiting for messages...</div>
            </div>
        </div>
    </div>

    <div class="chat-panel-overlay" id="panelOverlay"></div>

    <div class="chat-panel" id="chatPanel">
        <div class="chat-panel-header">
            <span class="panel-title">Chat Widget</span>
            <div class="panel-controls">
                <input type="text" id="titleInput" value="My Own Chat" placeholder="Title" />
                <input type="text" id="placeholderInput" value="Type a message..." placeholder="Placeholder" />
                <select id="themeSelect">
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                    <option value="auto" selected>Auto</option>
                </select>
            </div>
            <button id="closePanelBtn" title="Close">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                </svg>
            </button>
        </div>
        <iframe
            class="chat-panel-iframe"
            src="/chat-iframe"
            id="chatIframe"
            title="Chat Widget"
        ></iframe>
    </div>

    <script>
        (function() {
            const iframe = document.getElementById('chatIframe');
            const panel = document.getElementById('chatPanel');
            const overlay = document.getElementById('panelOverlay');
            const openBtn = document.getElementById('openChatBtn');
            const closeBtn = document.getElementById('closePanelBtn');
            const titleInput = document.getElementById('titleInput');
            const placeholderInput = document.getElementById('placeholderInput');
            const themeSelect = document.getElementById('themeSelect');
            const messageLog = document.getElementById('messageLog');

            let isOpen = false;

            function sendConfig() {
                if (!isOpen) return;
                const theme = themeSelect.value;
                const payload = {
                    type: 'chat-config',
                    title: titleInput.value || undefined,
                    placeholder: placeholderInput.value || undefined,
                    theme: {
                        mode: theme,
                    },
                };
                if (theme === 'light' || theme === 'dark') {
                    payload.theme.cssVariables = {
                        '--chat-primary': theme === 'dark' ? '#ff4433' : '#f53003',
                    };
                }
                iframe.contentWindow.postMessage(payload, '*');
            }

            function togglePanel(open) {
                isOpen = open;
                panel.classList.toggle('open', open);
                overlay.classList.toggle('open', open);
                if (open) {
                    document.body.style.overflow = 'hidden';
                    setTimeout(sendConfig, 300);
                } else {
                    document.body.style.overflow = '';
                }
            }

            function logMessage(text) {
                const empty = messageLog.querySelector('.empty');
                if (empty) empty.remove();
                const entry = document.createElement('div');
                entry.className = 'entry';
                const time = new Date().toLocaleTimeString();
                entry.innerHTML = `<span style="color:#a1a09a;">[${time}]</span> <span class="msg-text">${text}</span>`;
                messageLog.appendChild(entry);
                messageLog.scrollTop = messageLog.scrollHeight;
            }

            openBtn.addEventListener('click', () => togglePanel(true));
            closeBtn.addEventListener('click', () => togglePanel(false));
            overlay.addEventListener('click', () => togglePanel(false));

            titleInput.addEventListener('input', sendConfig);
            placeholderInput.addEventListener('input', sendConfig);
            themeSelect.addEventListener('change', sendConfig);

            window.addEventListener('message', function(event) {
                if (event.source !== iframe.contentWindow) return;
                const data = event.data || {};
                if (data.type === 'chat-message') {
                    logMessage(data.text || '(no text)');
                }
            });

            document.addEventListener('keydown', function(e) {
                if (e.key === 'Escape' && isOpen) togglePanel(false);
            });
        })();
    </script>
</body>

</html>
