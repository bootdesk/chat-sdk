import Foundation

public enum ThemeMode: String {
    case auto
    case light
    case dark
}

public struct ThemeConfig {
    public var mode: ThemeMode?

    public init(mode: ThemeMode? = nil) {
        self.mode = mode
    }
}

public struct BridgeConfig {
    public var title: String?
    public var locale: String?
    public var placeholder: String?
    public var theme: ThemeConfig?

    public init(
        title: String? = nil,
        locale: String? = nil,
        placeholder: String? = nil,
        theme: ThemeConfig? = nil
    ) {
        self.title = title
        self.locale = locale
        self.placeholder = placeholder
        self.theme = theme
    }
}
