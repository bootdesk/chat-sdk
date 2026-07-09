(function () {
  "use strict";

  var DEFAULTS = {
    iframeSrc: "/chat-iframe",
    title: "Chat",
    placeholder: "Type a message...",
    buttonInnerHtml:
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    buttonStyle: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      width: "56px",
      height: "56px",
      borderRadius: "50%",
      border: "none",
      background: "var(--chat-primary, #6366f1)",
      color: "#fff",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
      zIndex: "2147483646",
      transition: "transform 0.2s, opacity 0.2s",
    },
    overlayStyle: {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.3)",
      zIndex: "2147483646",
      opacity: "0",
      transition: "opacity 0.2s",
      pointerEvents: "none",
    },
  };

  var state = {
    opts: null,
    button: null,
    iframe: null,
    overlay: null,
    bannerEl: null,
    styleEl: null,
    isOpen: false,
    iframeMounted: false,
    pendingBanner: null,
    originalViewport: undefined,
    initialized: false,
  };

  function mergeStyles(base, overrides) {
    var result = {};
    for (var key in base) result[key] = base[key];
    if (overrides) {
      for (var k in overrides) result[k] = overrides[k];
    }
    return result;
  }

  function createButton() {
    var opts = state.opts;
    state.button = document.createElement("button");
    state.button.setAttribute("data-embed-chat-btn", "");
    state.button.setAttribute("aria-label", "Open chat");
    state.button.setAttribute("aria-expanded", "false");
    state.button.innerHTML = opts.buttonInnerHtml;
    Object.assign(state.button.style, mergeStyles(DEFAULTS.buttonStyle, opts.buttonStyle));
    state.button.addEventListener("mouseenter", function () {
      state.button.style.transform = "scale(1.05)";
    });
    state.button.addEventListener("mouseleave", function () {
      state.button.style.transform = "";
    });
    state.button.addEventListener("click", toggle);
    state.button.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    document.body.appendChild(state.button);
  }

  function createOverlay() {
    var opts = state.opts;
    state.overlay = document.createElement("div");
    state.overlay.setAttribute("data-embed-chat-overlay", "");
    Object.assign(state.overlay.style, mergeStyles(DEFAULTS.overlayStyle, opts.overlayStyle));
    state.overlay.addEventListener("click", toggle);
    document.body.appendChild(state.overlay);
  }

  function createIframe() {
    state.iframe = document.createElement("iframe");
    state.iframe.setAttribute("data-embed-chat-iframe", "");
    state.iframe.setAttribute("title", "Chat Widget");
    state.iframe.setAttribute("role", "dialog");
    state.iframe.setAttribute("aria-modal", "true");
    state.iframe.setAttribute("allow", "clipboard-write; microphone");
    Object.assign(state.iframe.style, {
      position: "fixed",
      bottom: "96px",
      right: "24px",
      width: "420px",
      height: "600px",
      maxWidth: "calc(100dvw - 48px)",
      maxHeight: "calc(100dvh - 120px)",
      border: "none",
      borderRadius: "16px",
      boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
      zIndex: "2147483647",
      opacity: "0",
      transform: "translateY(16px) scale(0.96)",
      transition: "opacity 0.2s, transform 0.25s",
      pointerEvents: "none",
      background: "#fff",
    });
  }

  function mountIframe(src) {
    var opts = state.opts;
    state.iframe.addEventListener("load", function () {
      var savedTheme = "auto";
      try {
        var stored = localStorage.getItem("chat-theme");
        if (stored === "light" || stored === "dark" || stored === "auto") savedTheme = stored;
      } catch {
        /* unavailable */
      }
      state.iframe.contentWindow.postMessage(
        {
          type: "chat-config",
          title: opts.title,
          placeholder: opts.placeholder,
          theme: { mode: savedTheme },
        },
        "*",
      );

      function sendPendingBanner() {
        if (state.pendingBanner) {
          state.iframe.contentWindow.postMessage(
            {
              type: "chat-banner",
              text: state.pendingBanner.text,
              action: state.pendingBanner.action,
            },
            "*",
          );
        } else if (state.pendingBanner === false) {
          state.iframe.contentWindow.postMessage({ type: "chat-banner-dismiss" }, "*");
        }
      }
      sendPendingBanner();
      setTimeout(sendPendingBanner, 300);
    });
    state.iframe.src = src;
    document.body.appendChild(state.iframe);
  }

  function toggle() {
    state.isOpen = !state.isOpen;
    var open = state.isOpen;

    if (open && !state.iframeMounted) {
      state.iframeMounted = true;
      mountIframe(state.opts.iframeSrc);
    }

    state.button.setAttribute("aria-expanded", String(open));
    state.iframe.style.opacity = open ? "1" : "0";
    state.iframe.style.transform = open ? "translateY(0) scale(1)" : "translateY(16px) scale(0.96)";
    state.iframe.style.pointerEvents = open ? "auto" : "none";

    state.overlay.style.opacity = open ? "1" : "0";
    state.overlay.style.pointerEvents = open ? "auto" : "none";

    state.button.style.transform = open ? "scale(0)" : "";
    state.button.style.opacity = open ? "0" : "1";
    state.button.style.pointerEvents = open ? "none" : "auto";

    document.body.style.overflow = open ? "hidden" : "";

    if (open) state.iframe.focus();
  }

  function handleMessage(event) {
    if (!state.iframeMounted || !state.iframe || event.source !== state.iframe.contentWindow)
      return;
    var data = event.data || {};
    if (data.type === "chat-message") {
      console.log("[Embed Chat] Message:", data.text);
    }
    if (data.type === "chat-close") {
      toggle();
    }
    if (data.type === "chat-viewport-config") {
      var meta = document.querySelector('meta[name="viewport"]');
      if (!meta) return;
      var current = meta.getAttribute("content") || "";
      if (data.content) {
        if (state.originalViewport === undefined) state.originalViewport = current;
        if (!current.includes(data.content)) {
          meta.setAttribute("content", current + (current ? ", " : "") + data.content);
        }
      } else {
        meta.setAttribute("content", state.originalViewport ?? current);
        state.originalViewport = undefined;
      }
    }
  }

  function destroy() {
    if (!state.initialized) return;
    if (state.button && state.button.parentNode) state.button.parentNode.removeChild(state.button);
    if (state.iframe && state.iframe.parentNode) state.iframe.parentNode.removeChild(state.iframe);
    if (state.overlay && state.overlay.parentNode)
      state.overlay.parentNode.removeChild(state.overlay);
    if (state.styleEl && state.styleEl.parentNode)
      state.styleEl.parentNode.removeChild(state.styleEl);
    window.removeEventListener("message", handleMessage);
    state.initialized = false;
  }

  function _initialize(opts) {
    if (document.querySelector("[data-embed-chat-btn]")) return;

    state.opts = {};
    for (var key in DEFAULTS) {
      state.opts[key] = DEFAULTS[key];
    }
    if (opts) {
      for (var k in opts) {
        if (k === "buttonStyle" || k === "overlayStyle") {
          state.opts[k] = mergeStyles(state.opts[k] || {}, opts[k]);
        } else if (opts[k] !== undefined) {
          state.opts[k] = opts[k];
        }
      }
    }

    var style = document.createElement("style");
    style.textContent =
      "@media (max-width: 799px), (max-height: 599px), (pointer: coarse) and (max-width: 1366px) { [data-embed-chat-iframe] { width: 100dvw !important; height: 100dvh !important; bottom: 0 !important; right: 0 !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; } [data-embed-chat-overlay] { display: none !important; } }";

    document.head.appendChild(style);
    state.styleEl = style;

    createOverlay();
    createIframe();
    createButton();
    window.addEventListener("message", handleMessage);
    state.initialized = true;
  }

  function initialize(opts) {
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", function () {
        _initialize(opts);
      });
    } else {
      _initialize(opts);
    }
  }

  function showBanner(bannerData) {
    state.pendingBanner = bannerData;
    if (state.iframe && state.iframeMounted) {
      state.iframe.contentWindow.postMessage(
        { type: "chat-banner", text: bannerData.text, action: bannerData.action },
        "*",
      );
    }
    if (!state.bannerEl) {
      state.bannerEl = document.createElement("div");
      state.bannerEl.setAttribute("data-embed-chat-banner", "");
      Object.assign(state.bannerEl.style, {
        position: "fixed",
        bottom: "90px",
        right: "24px",
        background: "var(--chat-primary, #6366f1)",
        color: "#fff",
        padding: "12px 20px",
        borderRadius: "12px",
        boxShadow: "0 4px 16px rgba(0,0,0,0.15)",
        zIndex: "2147483646",
        display: "flex",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        fontSize: "14px",
        transition: "opacity 0.2s, transform 0.2s",
        maxWidth: "280px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      });
      state.bannerEl.addEventListener("click", function () {
        dismissBanner();
        if (bannerData.action && bannerData.action.open) toggle();
        else if (!bannerData.action) toggle();
        if (!state.isOpen) toggle();
      });
      document.body.appendChild(state.bannerEl);
    }
    state.bannerEl.textContent = "";
    state.bannerEl.style.opacity = "1";
    state.bannerEl.style.transform = "translateY(0)";

    var textSpan = document.createElement("span");
    textSpan.textContent = bannerData.text || "";
    state.bannerEl.appendChild(textSpan);

    if (bannerData.action && bannerData.action.label) {
      var actionBtn = document.createElement("span");
      actionBtn.textContent = bannerData.action.label;
      Object.assign(actionBtn.style, {
        fontWeight: "600",
        whiteSpace: "nowrap",
      });
      state.bannerEl.appendChild(actionBtn);
    }

    var dismiss = document.createElement("button");
    dismiss.innerHTML =
      '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>';
    Object.assign(dismiss.style, {
      background: "none",
      border: "none",
      color: "inherit",
      cursor: "pointer",
      padding: "0",
      opacity: "0.7",
      flexShrink: "0",
    });
    dismiss.setAttribute("aria-label", "Dismiss");
    dismiss.addEventListener("click", function (e) {
      e.stopPropagation();
      dismissBanner();
    });
    state.bannerEl.appendChild(dismiss);
  }

  function dismissBanner() {
    state.pendingBanner = false;
    if (state.iframe && state.iframeMounted) {
      state.iframe.contentWindow.postMessage({ type: "chat-banner-dismiss" }, "*");
    }
    if (state.bannerEl) {
      state.bannerEl.style.opacity = "0";
      state.bannerEl.style.transform = "translateY(8px)";
      setTimeout(function () {
        if (state.bannerEl && state.bannerEl.parentNode)
          state.bannerEl.parentNode.removeChild(state.bannerEl);
        state.bannerEl = null;
      }, 200);
    }
  }

  window.ChatSDK = {
    initialize: initialize,
    destroy: destroy,
    open: function () {
      if (state.isOpen) return;
      toggle();
    },
    close: function () {
      if (!state.isOpen) return;
      toggle();
    },
    showBanner: showBanner,
    dismissBanner: dismissBanner,
  };
})();
