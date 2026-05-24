import WebKit

public class WebViewMessageHandler: NSObject, WKScriptMessageHandler {

    public var onMessage: (([String: Any]) -> Void)?

    public init(onMessage: @escaping ([String: Any]) -> Void) {
        self.onMessage = onMessage
    }

    public func userContentController(
        _ userContentController: WKUserContentController,
        didReceive message: WKScriptMessage
    ) {
        guard let dict = message.body as? [String: Any] else { return }
        onMessage?(dict)
    }
}
