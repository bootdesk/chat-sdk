import UIKit
import WebKit

@MainActor
public final class ChatWidgetView: WKWebView {

    public var onMessage: ((String) -> Void)?
    public var onClose: (() -> Void)?
    public var onReady: (() -> Void)?
    public var onPushSubscribe: (() -> Void)?
    public var onPushUnsubscribe: (() -> Void)?

    private let bridgeMessageHandler: WebViewMessageHandler

    public override init(frame: CGRect, configuration: WKWebViewConfiguration) {
        let userContentController = WKUserContentController()

        let bridgeScript = WKUserScript(
            source: Shim.webViewShim,
            injectionTime: .atDocumentStart,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(bridgeScript)

        let viewportScript = WKUserScript(
            source: Shim.viewportShim,
            injectionTime: .atDocumentEnd,
            forMainFrameOnly: true
        )
        userContentController.addUserScript(viewportScript)

        let config = WKWebViewConfiguration()
        config.userContentController = userContentController

        let handler = WebViewMessageHandler { _ in }
        userContentController.add(handler, name: "chatBridge")

        self.bridgeMessageHandler = handler

        super.init(frame: frame, configuration: config)

        #if DEBUG
        if #available(iOS 16.4, *) {
            isInspectable = true
        }
        #endif

        scrollView.minimumZoomScale = 1.0
        scrollView.maximumZoomScale = 1.0
        scrollView.bouncesZoom = false

        handler.onMessage = { [weak self] dict in
            self?.handleBridgeMessage(dict)
        }

        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillShow),
            name: UIResponder.keyboardWillShowNotification,
            object: nil
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(keyboardWillHide),
            name: UIResponder.keyboardWillHideNotification,
            object: nil
        )
    }

    required init?(coder: NSCoder) {
        fatalError("init(coder:) has not been implemented")
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    // MARK: - Public API

    public func load(url: URL, config: BridgeConfig? = nil) {
        pendingConfig = config
        load(URLRequest(url: url))
    }

    public func sendConfig(_ config: BridgeConfig) {
        var dict: [String: Any] = ["type": "chat-config"]
        if let title = config.title { dict["title"] = title }
        if let locale = config.locale { dict["locale"] = locale }
        if let placeholder = config.placeholder { dict["placeholder"] = placeholder }
        if let theme = config.theme {
            var themeDict: [String: Any] = [:]
            if let mode = theme.mode { themeDict["mode"] = mode.rawValue }
            dict["theme"] = themeDict
        }
        evaluateBridgeEvent(dict)
    }

    public func notifyNotificationClicked() {
        evaluateBridgeEvent(["type": "chat-notification-clicked"])
    }

    public func sendPushState(_ status: PushSubscriptionStatus) {
        evaluateBridgeEvent(["type": "chat-push-state", "status": status.rawValue])
    }

    // MARK: - Private

    private var pendingConfig: BridgeConfig?

    private func evaluateBridgeEvent(_ dict: [String: Any]) {
        guard let jsonData = try? JSONSerialization.data(withJSONObject: dict),
            let jsonString = String(data: jsonData, encoding: .utf8)
        else { return }

        let js = "window.dispatchEvent(new CustomEvent('chat-bridge', { detail: \(jsonString) }));"
        evaluateJavaScript(js, completionHandler: nil)
    }

    private func handleBridgeMessage(_ dict: [String: Any]) {
        guard let type = dict["type"] as? String else { return }

        switch type {
        case "chat-ready":
            if let config = pendingConfig {
                sendConfig(config)
                pendingConfig = nil
            }
            onReady?()

        case "chat-message":
            if let text = dict["text"] as? String {
                onMessage?(text)
            }

        case "chat-close":
            onClose?()

        case "chat-push-subscribe":
            onPushSubscribe?()

        case "chat-push-unsubscribe":
            onPushUnsubscribe?()

        default:
            break
        }
    }

    // MARK: - Keyboard Handling

    @objc private func keyboardWillShow(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let keyboardFrame = userInfo[UIResponder.keyboardFrameEndUserInfoKey] as? CGRect,
              let duration = userInfo[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double
        else { return }
        let bottomInset = keyboardFrame.height - safeAreaInsets.bottom
        UIView.animate(withDuration: duration) { [weak self] in
            self?.scrollView.contentInset.bottom = bottomInset
            self?.scrollView.verticalScrollIndicatorInsets.bottom = bottomInset
        }
    }

    @objc private func keyboardWillHide(_ notification: Notification) {
        guard let duration = notification.userInfo?[UIResponder.keyboardAnimationDurationUserInfoKey] as? Double
        else { return }
        UIView.animate(withDuration: duration) { [weak self] in
            self?.scrollView.contentInset.bottom = 0
            self?.scrollView.verticalScrollIndicatorInsets.bottom = 0
        }
    }
}
