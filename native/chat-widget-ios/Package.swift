// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "BootdeskChatWidget",
    platforms: [
        .iOS(.v15),
    ],
    products: [
        .library(
            name: "BootdeskChatWidget",
            targets: ["BootdeskChatWidget"]
        ),
        .library(
            name: "BootdeskChatWidgetSwiftUI",
            targets: ["BootdeskChatWidgetSwiftUI"]
        ),
    ],
    targets: [
        .target(
            name: "BootdeskChatWidget",
            path: "Sources/BootdeskChatWidget"
        ),
        .target(
            name: "BootdeskChatWidgetSwiftUI",
            dependencies: ["BootdeskChatWidget"],
            path: "Sources/BootdeskChatWidgetSwiftUI"
        ),
        .testTarget(
            name: "BootdeskChatWidgetTests",
            dependencies: ["BootdeskChatWidget"],
            path: "Tests/BootdeskChatWidgetTests"
        ),
    ]
)
