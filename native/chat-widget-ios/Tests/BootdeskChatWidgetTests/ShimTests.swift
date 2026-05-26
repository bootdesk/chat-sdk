import XCTest

@testable import BootdeskChatWidget

final class ShimTests: XCTestCase {

    func testShimIsIIFE() {
        let shim = Shim.webViewShim.trimmingCharacters(in: .whitespacesAndNewlines)
        XCTAssertTrue(shim.hasPrefix("(function () {"))
        XCTAssertTrue(shim.hasSuffix("})();"))
    }

    func testShimContainsChatBridge() {
        XCTAssertTrue(Shim.webViewShim.contains("__chatBridge"))
        XCTAssertTrue(Shim.webViewShim.contains("chat-bridge"))
    }

    func testShimContainsAndroidBridge() {
        XCTAssertTrue(Shim.webViewShim.contains("AndroidBridge"))
    }

    func testShimContainsWebKitHandler() {
        XCTAssertTrue(Shim.webViewShim.contains("webkit.messageHandlers.chatBridge"))
    }

    func testShimContainsReactNative() {
        XCTAssertTrue(Shim.webViewShim.contains("ReactNativeWebView"))
    }

    func testShimSize() {
        XCTAssertGreaterThan(Shim.webViewShim.count, 500)
        XCTAssertLessThan(Shim.webViewShim.count, 5000)
    }
}
