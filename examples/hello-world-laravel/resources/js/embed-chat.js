import "@bootdesk/chat-widget-bridge/embed-chat";

ChatSDK.initialize();

window.demo = {
    openChat: () => ChatSDK.open(),
    closeChat: () => ChatSDK.close(),
    showBanner: () =>
        ChatSDK.showBanner({
            text: "Need a hand?",
            action: { label: "Chat now", open: true },
        }),
    showBannerNoAction: () =>
        ChatSDK.showBanner({
            text: "We're here to help!",
        }),
    dismissBanner: () => ChatSDK.dismissBanner(),
};
