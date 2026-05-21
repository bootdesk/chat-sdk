(function () {
  "use strict";

  var config = typeof window !== "undefined" && window.__CHAT_EMBED_CONFIG;
  var CHAT_IFRAME_SRC = (config && config.iframeSrc) || "/chat-iframe";

  var button, iframe, overlay, isOpen = false;

  function createButton() {
    button = document.createElement("button");
    button.setAttribute("data-embed-chat-btn", "");
    button.setAttribute("aria-label", "Open chat");
    button.setAttribute("aria-expanded", "false");
    button.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
    Object.assign(button.style, {
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
    });
    button.addEventListener("mouseenter", function () {
      button.style.transform = "scale(1.05)";
    });
    button.addEventListener("mouseleave", function () {
      button.style.transform = "";
    });
    button.addEventListener("click", toggle);
    button.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        toggle();
      }
    });
    document.body.appendChild(button);
  }

  function createOverlay() {
    overlay = document.createElement("div");
    overlay.setAttribute("data-embed-chat-overlay", "");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(0,0,0,0.3)",
      zIndex: "2147483646",
      opacity: "0",
      transition: "opacity 0.2s",
      pointerEvents: "none",
    });
    overlay.addEventListener("click", toggle);
    document.body.appendChild(overlay);
  }

  function createIframe() {
    iframe = document.createElement("iframe");
    iframe.setAttribute("data-embed-chat-iframe", "");
    iframe.setAttribute("title", "Chat Widget");
    iframe.setAttribute("role", "dialog");
    iframe.setAttribute("aria-modal", "true");
    iframe.setAttribute("allow", "clipboard-write; microphone");
    iframe.src = CHAT_IFRAME_SRC;
    Object.assign(iframe.style, {
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
    document.body.appendChild(iframe);

    iframe.addEventListener("load", function () {
      var savedTheme = "auto";
      try {
        var stored = localStorage.getItem("chat-theme");
        if (stored === "light" || stored === "dark" || stored === "auto") savedTheme = stored;
      } catch { /* localStorage unavailable */ }
      var payload = {
        type: "chat-config",
        title: "Chat",
        placeholder: "Type a message...",
        theme: { mode: savedTheme },
      };
      iframe.contentWindow.postMessage(payload, "*");
    });
  }

  function close() {
    if (!isOpen) return;
    toggle();
  }

  function toggle() {
    isOpen = !isOpen;
    var open = isOpen;

    button.setAttribute("aria-expanded", String(open));
    iframe.style.opacity = open ? "1" : "0";
    iframe.style.transform = open
      ? "translateY(0) scale(1)"
      : "translateY(16px) scale(0.96)";
    iframe.style.pointerEvents = open ? "auto" : "none";

    overlay.style.opacity = open ? "1" : "0";
    overlay.style.pointerEvents = open ? "auto" : "none";

    button.style.transform = open ? "scale(0)" : "";
    button.style.opacity = open ? "0" : "1";
    button.style.pointerEvents = open ? "none" : "auto";

    document.body.style.overflow = open ? "hidden" : "";

    if (open) {
      iframe.focus();
    }
  }

  function handleMessage(event) {
    if (!iframe || event.source !== iframe.contentWindow) return;
    var data = event.data || {};
    if (data.type === "chat-message") {
      console.log("[Embed Chat] Message:", data.text);
    }
    if (data.type === "chat-close") {
      close();
    }
  }

  function init() {
    var existing = document.querySelector("[data-embed-chat-btn]");
    if (existing) return;

    var style = document.createElement("style");
    style.textContent =
      '@media (max-width: 799px) { [data-embed-chat-iframe] { width: 100dvw !important; height: 100dvh !important; bottom: 0 !important; right: 0 !important; max-width: none !important; max-height: none !important; border-radius: 0 !important; } [data-embed-chat-overlay] { display: none !important; } }';
    document.head.appendChild(style);

    createOverlay();
    createIframe();
    createButton();
    window.addEventListener("message", handleMessage);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
