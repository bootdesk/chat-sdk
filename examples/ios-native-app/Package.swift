// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ChatExample",
    platforms: [
        .iOS(.v17),
    ],
    dependencies: [
        .package(path: "../../native/chat-widget-ios"),
    ],
    targets: [
        .executableTarget(
            name: "ChatExample",
            dependencies: [
                .product(name: "BootdeskChatWidget", package: "chat-widget-ios"),
                .product(name: "BootdeskChatWidgetSwiftUI", package: "chat-widget-ios"),
            ],
            path: "Sources",
            exclude: ["Resources"]
        ),
    ]
)
