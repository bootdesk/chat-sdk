import XCTest

@testable import BootdeskChatWidget

final class PushSubscriptionStatusTests: XCTestCase {

    func testAllEnumRawValues() {
        XCTAssertEqual(PushSubscriptionStatus.unsupported.rawValue, "unsupported")
        XCTAssertEqual(PushSubscriptionStatus.default.rawValue, "default")
        XCTAssertEqual(PushSubscriptionStatus.subscribed.rawValue, "subscribed")
        XCTAssertEqual(PushSubscriptionStatus.denied.rawValue, "denied")
        XCTAssertEqual(PushSubscriptionStatus.subscribing.rawValue, "subscribing")
        XCTAssertEqual(PushSubscriptionStatus.error.rawValue, "error")
    }

    func testAllCasesCount() {
        XCTAssertEqual(PushSubscriptionStatus.allCases.count, 6)
    }

    func testAllCasesAreCovered() {
        let all = PushSubscriptionStatus.allCases.map { $0.rawValue }
        XCTAssertTrue(all.contains("unsupported"))
        XCTAssertTrue(all.contains("default"))
        XCTAssertTrue(all.contains("subscribed"))
        XCTAssertTrue(all.contains("denied"))
        XCTAssertTrue(all.contains("subscribing"))
        XCTAssertTrue(all.contains("error"))
    }
}
