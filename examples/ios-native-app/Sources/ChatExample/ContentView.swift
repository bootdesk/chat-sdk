import SwiftUI
import BootdeskChatWidget
import BootdeskChatWidgetSwiftUI
import UserNotifications

struct ContentView: View {
    @State private var showChat = false

    var body: some View {
        ZStack {
            Color(.systemBackground)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                Image(systemName: "ellipsis.bubble.fill")
                    .font(.system(size: 48))
                    .foregroundStyle(.tint)
                Text("Tap the bubble to chat")
                    .font(.headline)
                    .foregroundStyle(.secondary)
            }

            VStack {
                Spacer()
                HStack {
                    Spacer()
                    chatBubbleButton
                }
            }
        }
        .sheet(isPresented: $showChat) {
            chatSheet
        }
    }

    private var chatBubbleButton: some View {
        Button(action: { showChat = true }) {
            Image(systemName: "message.circle.fill")
                .font(.system(size: 60))
                .foregroundStyle(.blue)
                .symbolRenderingMode(.hierarchical)
                .shadow(color: .black.opacity(0.15), radius: 8, x: 0, y: 4)
        }
        .padding(.trailing, 24)
        .padding(.bottom, 48)
    }

    private var chatSheet: some View {
        ChatWidgetViewRepresentable(
            url: chatURL,
            config: BridgeConfig(title: "Support"),
            onClose: { showChat = false },
            onPushSubscribe: {
                UNUserNotificationCenter.current()
                    .requestAuthorization(options: [.alert, .sound, .badge]) { granted, _ in
                        guard granted else { return }
                        DispatchQueue.main.async {
                            UIApplication.shared.registerForRemoteNotifications()
                        }
                    }
            },
            onPushUnsubscribe: {
                UIApplication.shared.unregisterForRemoteNotifications()
            }
        )
        .ignoresSafeArea(.container)
    }

    private var chatURL: URL {
        let args = CommandLine.arguments
        if args.count > 1, let url = URL(string: args[1]) {
            return url
        }
        if let env = ProcessInfo.processInfo.environment["CHAT_URL"],
           let url = URL(string: env) {
            return url
        }
        return URL(string: "https://example.com/chat")!
    }
}
