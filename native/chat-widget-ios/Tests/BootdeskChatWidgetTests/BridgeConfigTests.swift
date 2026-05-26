import XCTest

@testable import BootdeskChatWidget

final class BridgeConfigTests: XCTestCase {

    func testDefaultConfigHasAllNilFields() {
        let config = BridgeConfig()
        XCTAssertNil(config.title)
        XCTAssertNil(config.locale)
        XCTAssertNil(config.placeholder)
        XCTAssertNil(config.theme)
    }

    func testConfigWithTitle() {
        let config = BridgeConfig(title: "Support")
        XCTAssertEqual(config.title, "Support")
    }

    func testConfigWithLocale() {
        let config = BridgeConfig(locale: "pt-BR")
        XCTAssertEqual(config.locale, "pt-BR")
    }

    func testConfigWithPlaceholder() {
        let config = BridgeConfig(placeholder: "Type a message")
        XCTAssertEqual(config.placeholder, "Type a message")
    }

    func testConfigWithTheme() {
        let config = BridgeConfig(theme: ThemeConfig(mode: .dark))
        XCTAssertEqual(config.theme?.mode, .dark)
    }

    func testThemeDefaultsToNil() {
        let theme = ThemeConfig()
        XCTAssertNil(theme.mode)
    }

    func testThemeModeAllCases() {
        XCTAssertEqual(ThemeMode.auto.rawValue, "auto")
        XCTAssertEqual(ThemeMode.light.rawValue, "light")
        XCTAssertEqual(ThemeMode.dark.rawValue, "dark")
    }
}
