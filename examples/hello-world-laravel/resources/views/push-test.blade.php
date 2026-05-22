<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Push Test — BootDesk Chat</title>
    <style>
        *{box-sizing:border-box;margin:0;padding:0}
        body{font-family:system-ui,sans-serif;background:#f8fafc;color:#0f172a;padding:2rem;line-height:1.5}
        h1{font-size:1.5rem;margin-bottom:0.25rem}
        .subtitle{color:#64748b;font-size:0.875rem;margin-bottom:2rem}
        .controls{margin-bottom:1.5rem;display:flex;gap:0.75rem;flex-wrap:wrap}
        .controls button{padding:0.5rem 1rem;border-radius:6px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:0.875rem}
        .controls button:hover{background:#f1f5f9}
        .card{border:1px solid #e2e8f0;border-radius:8px;background:#fff;padding:1.25rem;margin-bottom:1rem}
        .card-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:0.75rem}
        .card-header h3{font-size:1rem;font-weight:600}
        .chip{display:inline-block;padding:0.125rem 0.5rem;border-radius:4px;font-size:0.75rem;font-weight:500}
        .chip-subscribed{background:#dcfce7;color:#166534}
        .chip-error{background:#fecaca;color:#991b1b}
        .card-details{font-size:0.8125rem;color:#475569;margin-bottom:0.75rem;display:grid;grid-template-columns:auto 1fr;gap:0.25rem 0.75rem}
        .card-details dt{color:#94a3b8}
        .card-actions{display:flex;gap:0.5rem;flex-wrap:wrap;padding-top:0.75rem;border-top:1px solid #f1f5f9}
        .card-actions button{padding:0.375rem 0.75rem;border-radius:5px;border:1px solid #e2e8f0;background:#fff;cursor:pointer;font-size:0.8125rem;transition:all 0.15s}
        .card-actions button:hover{background:#f1f5f9}
        .card-actions button.primary{background:#4f46e5;color:#fff;border-color:#4f46e5}
        .card-actions button.primary:hover{background:#4338ca}
        .card-actions button.danger{background:#ef4444;color:#fff;border-color:#ef4444}
        .card-actions button.danger:hover{background:#dc2626}
        .messages-preview{margin-top:0.75rem;padding:0.75rem;background:#f8fafc;border-radius:6px;font-size:0.8125rem}
        .messages-preview .msg{display:flex;gap:0.5rem;margin-bottom:0.25rem}
        .messages-preview .msg-author{font-weight:600;color:#334155;white-space:nowrap}
        .messages-preview .msg-text{color:#64748b;overflow:hidden;text-overflow:ellipsis}
        .empty{text-align:center;padding:3rem;color:#94a3b8}
        .toast{position:fixed;bottom:1rem;right:1rem;padding:0.75rem 1.25rem;border-radius:6px;color:#fff;font-size:0.875rem;display:none;z-index:50}
        .toast.success{background:#22c55e;display:block}
        .toast.error{background:#ef4444;display:block}
        .back-link{display:inline-block;margin-bottom:1.5rem;color:#4f46e5;font-size:0.875rem;text-decoration:none}
        .back-link:hover{text-decoration:underline}
    </style>
</head>
<body>
    <a href="/" class="back-link">&larr; Back to Home</a>
    <h1>Push Notification Test</h1>
    <p class="subtitle">Manage push subscriptions and send test notifications</p>

    <div class="controls">
        <button onclick="loadSubscriptions()">Refresh</button>
        <button onclick="clearAllSubscriptions()">Clear All</button>
    </div>

    <div id="subscriptions-container">
        <div class="empty">Loading subscriptions...</div>
    </div>

    <div id="toast" class="toast"></div>

    <script>
        const API_BASE = '/api/push';

        async function loadSubscriptions() {
            const container = document.getElementById('subscriptions-container');
            container.innerHTML = '<div class="empty">Loading subscriptions...</div>';

            try {
                const res = await fetch(`${API_BASE}/subscriptions`);
                const data = await res.json();
                renderSubscriptions(data.subscriptions || []);
            } catch (err) {
                container.innerHTML = `<div class="empty">Error: ${err.message}</div>`;
            }
        }

        async function renderSubscriptions(subscriptions) {
            const container = document.getElementById('subscriptions-container');

            if (subscriptions.length === 0) {
                container.innerHTML = '<div class="empty">No push subscriptions yet. Open a chat and enable push notifications.</div>';
                return;
            }

            // Group by threadId
            const byThread = {};
            for (const sub of subscriptions) {
                const tid = sub.threadId || 'unknown';
                if (!byThread[tid]) {
                    byThread[tid] = { threadId: tid, subs: [], messages: null };
                }
                byThread[tid].subs.push(sub);
            }

            let html = '';
            const entries = Object.values(byThread);

            for (const entry of entries) {
                // Fetch message preview for this thread
                let messagePreview = '';
                try {
                    const msgRes = await fetch(`/api/chat/messages?threadId=${encodeURIComponent(entry.threadId)}&limit=5`);
                    const msgData = await msgRes.json();
                    const msgs = msgData.messages || [];
                    if (msgs.length > 0) {
                        messagePreview = msgs.slice(-3).map(m =>
                            `<div class="msg"><span class="msg-author">${escapeHtml(m.author?.name || '?')}:</span><span class="msg-text">${escapeHtml(m.text?.substring(0, 80) || '')}</span></div>`
                        ).join('');
                    }
                } catch {}

                const count = entry.subs.length;
                html += `<div class="card">
                    <div class="card-header">
                        <h3>Thread: ${escapeHtml(entry.threadId)}</h3>
                        <span class="chip chip-subscribed">${count} subscription${count > 1 ? 's' : ''}</span>
                    </div>`;

                if (messagePreview) {
                    html += `<div class="messages-preview">${messagePreview}</div>`;
                } else {
                    html += `<div class="messages-preview" style="color:#94a3b8">No recent messages</div>`;
                }

                for (const sub of entry.subs) {
                    const ep = sub.subscription?.endpoint || '';
                    const shortEp = ep.length > 60 ? ep.substring(0, 60) + '...' : ep || 'N/A';
                    html += `<div class="card-details">
                        <dt>Endpoint:</dt><dd title="${escapeHtml(ep)}">${escapeHtml(shortEp)}</dd>
                        <dt>User ID:</dt><dd>${escapeHtml(sub.userId || 'N/A')}</dd>
                        <dt>User Agent:</dt><dd>${escapeHtml((sub.userAgent || 'N/A').substring(0, 60))}</dd>
                        <dt>Created:</dt><dd>${escapeHtml(sub.createdAt || 'N/A')}</dd>
                    </div>
                    <div class="card-actions">
                        <button class="primary" onclick="sendNotification('${escapeHtml(ep)}', '${escapeHtml(entry.threadId)}', 'Hello from push test!', 'System', false)">Send Hello</button>
                        <button onclick="sendNotification('${escapeHtml(ep)}', '${escapeHtml(entry.threadId)}', 'Open this conversation!', 'Agent', true)">Send w/ Deep Link</button>
                        <button onclick="sendNotification('${escapeHtml(ep)}', '${escapeHtml(entry.threadId)}', 'Custom message at ${new Date().toLocaleTimeString()}', 'Test Bot', false)">Send Timestamp</button>
                        <button class="danger" onclick="deleteSubscription('${escapeHtml(ep)}', this)">Delete</button>
                    </div>`;
                }

                html += '</div>';
            }

            container.innerHTML = html;
        }

        async function sendNotification(endpoint, threadId, body, senderName, withDeepLink) {
            showToast('Sending...', 'success');

            try {
                const res = await fetch(`${API_BASE}/send`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                    body: JSON.stringify({
                        endpoint,
                        title: senderName,
                        body,
                        threadId,
                        messageId: crypto.randomUUID(),
                        senderName,
                        deepLink: withDeepLink ? `/chat?thread=${encodeURIComponent(threadId)}` : null,
                    }),
                });

                const data = await res.json();

                if (res.ok) {
                    showToast('Notification sent!', 'success');
                } else if (res.status === 410) {
                    showToast('Subscription expired — removed', 'error');
                    loadSubscriptions();
                } else {
                    showToast(`Error: ${data.error || 'Unknown'}`, 'error');
                }
            } catch (err) {
                showToast(`Error: ${err.message}`, 'error');
            }
        }

        async function deleteSubscription(endpoint, btn) {
            if (!confirm('Delete this subscription?')) return;

            btn.disabled = true;
            btn.textContent = 'Deleting...';

            try {
                const res = await fetch(`${API_BASE}/subscriptions?endpoint=${encodeURIComponent(endpoint)}`, {
                    method: 'DELETE',
                });

                if (res.ok) {
                    showToast('Subscription deleted', 'success');
                    loadSubscriptions();
                } else {
                    showToast('Failed to delete', 'error');
                    btn.disabled = false;
                    btn.textContent = 'Delete';
                }
            } catch (err) {
                showToast(`Error: ${err.message}`, 'error');
                btn.disabled = false;
                btn.textContent = 'Delete';
            }
        }

        async function clearAllSubscriptions() {
            if (!confirm('Delete ALL push subscriptions?')) return;

            try {
                const res = await fetch(`${API_BASE}/subscriptions`);
                const data = await res.json();
                const subs = data.subscriptions || [];

                for (const sub of subs) {
                    const ep = sub.subscription?.endpoint;
                    if (ep) {
                        await fetch(`${API_BASE}/subscriptions?endpoint=${encodeURIComponent(ep)}`, { method: 'DELETE' });
                    }
                }

                showToast(`Cleared ${subs.length} subscriptions`, 'success');
                loadSubscriptions();
            } catch (err) {
                showToast(`Error: ${err.message}`, 'error');
            }
        }

        function showToast(message, type) {
            const toast = document.getElementById('toast');
            toast.textContent = message;
            toast.className = 'toast ' + type;
            setTimeout(() => { toast.className = 'toast'; }, 3000);
        }

        function escapeHtml(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        loadSubscriptions();
    </script>
</body>
</html>
