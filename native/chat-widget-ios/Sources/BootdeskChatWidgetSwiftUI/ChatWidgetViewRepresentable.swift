import BootdeskChatWidget
import SwiftUI

@available(iOS 15.0, *)
public struct ChatWidgetViewRepresentable: UIViewRepresentable {

    public let url: URL
    public var config: BridgeConfig?
    public var onMessage: ((String) -> Void)?
    public var onClose: (() -> Void)?
    public var onReady: (() -> Void)?
    public var onPushSubscribe: (() -> Void)?
    public var onPushUnsubscribe: (() -> Void)?

    public init(
        url: URL,
        config: BridgeConfig? = nil,
        onMessage: ((String) -> Void)? = nil,
        onClose: (() -> Void)? = nil,
        onReady: (() -> Void)? = nil,
        onPushSubscribe: (() -> Void)? = nil,
        onPushUnsubscribe: (() -> Void)? = nil
    ) {
        self.url = url
        self.config = config
        self.onMessage = onMessage
        self.onClose = onClose
        self.onReady = onReady
        self.onPushSubscribe = onPushSubscribe
        self.onPushUnsubscribe = onPushUnsubscribe
    }

    public func makeUIView(context: Context) -> UIView {
        let container = UIView()
        container.backgroundColor = .systemBackground

        let chatView = ChatWidgetView()
        chatView.translatesAutoresizingMaskIntoConstraints = false
        chatView.onMessage = onMessage
        chatView.onClose = onClose
        chatView.onPushSubscribe = onPushSubscribe
        chatView.onPushUnsubscribe = onPushUnsubscribe
        chatView.onReady = { [weak container] in
            onReady?()
            guard let container else { return }
            container.subviews.compactMap { $0 as? UIActivityIndicatorView }.forEach {
                $0.stopAnimating()
                $0.removeFromSuperview()
            }
        }
        container.addSubview(chatView)

        let spinner = UIActivityIndicatorView(style: .large)
        spinner.translatesAutoresizingMaskIntoConstraints = false
        spinner.startAnimating()
        container.addSubview(spinner)

        NSLayoutConstraint.activate([
            chatView.topAnchor.constraint(equalTo: container.topAnchor),
            chatView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            chatView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            chatView.trailingAnchor.constraint(equalTo: container.trailingAnchor),

            spinner.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            spinner.centerYAnchor.constraint(equalTo: container.centerYAnchor),
        ])

        chatView.load(url: url, config: config)
        return container
    }

    public func updateUIView(_ uiView: UIView, context: Context) {
    }
}
