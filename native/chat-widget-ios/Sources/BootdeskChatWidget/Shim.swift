import Foundation

enum Shim {
    static let webViewShim: String = """
        (function () {
          'use strict';
          var _cached = [];
          var _originalPostMessage = window.parent && window.parent.postMessage;
          function _send(msg) {
            try { var json = JSON.stringify(msg); } catch (e) {
              var errJson = JSON.stringify({ type: 'chat-error', code: 'SERIALIZE_ERROR', message: 'Failed to serialize message' + e.message });
              try { if (window.parent) window.parent.postMessage(errJson, '*'); } catch (_) {}
              console.error('[ChatBridge] JSON.stringify failed:', e);
              return;
            }
            try {
              if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.chatBridge) {
                window.webkit.messageHandlers.chatBridge.postMessage(msg);
              } else if (window.AndroidBridge && window.AndroidBridge.postMessage) {
                window.AndroidBridge.postMessage(json);
              } else if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(json);
              } else if (_originalPostMessage) {
                _originalPostMessage.call(window.parent, msg, '*');
              } else {
                console.warn('[ChatBridge] No bridge API detected');
              }
            } catch (e) {
              var fallback = JSON.stringify({ type: 'chat-error', code: 'BRIDGE_ERROR', message: 'Bridge postMessage failed: ' + e.message });
              try { if (window.parent) window.parent.postMessage(fallback, '*'); } catch (_) {}
              console.error('[ChatBridge] postMessage failed:', e);
            }
          }
          window.__chatBridge = { _pushState: null, send: function(msg) { _send(msg); }, setPushState: function(status) { window.__chatBridge._pushState = status; } };
          var _batches = 0;
          window.addEventListener('chat-bridge', function(e) {
            if (_batches++ > 0) return;
            requestAnimationFrame(function() { _batches = 0; });
            var payload = e.detail;
            if (!payload || typeof payload !== 'object') return;
            var type = payload.type;
            if (type === 'chat-config') { window.__chatBridge._config = payload; }
            else if (type === 'chat-push-state') { window.__chatBridge._pushState = payload.status || null; }
            _cached.push(payload);
          });
          window.addEventListener('message', function(e) {
            var data = e.data;
            if (!data || typeof data !== 'object' || !data.type) return;
            if (data.type === 'chat-push-state') { window.__chatBridge._pushState = data.status || null; }
          });
        })();
        """

    static let viewportShim: String = """
        (function () {
            var meta = document.querySelector('meta[name="viewport"]');
            if (meta) {
                meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no");
            } else {
                meta = document.createElement("meta");
                meta.setAttribute("name", "viewport");
                meta.setAttribute("content", "width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no");
                document.head.appendChild(meta);
            }
        })();
        """
}
