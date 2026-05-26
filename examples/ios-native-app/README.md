# iOS Native App Example

A SwiftUI demo app that embeds the BootDesk chat widget via a floating chat bubble.

## Quick start

```bash
# Open in Xcode (recommended)
xed .

# Press ⌘R to run on the iOS Simulator
```

## CLI build & run

```bash
# One command
make run

# Or step by step
make build
make run

# Custom device
make run DEVICE="platform=iOS Simulator,name=iPhone 17 Pro"
```

## Usage

Tap the blue chat bubble in the bottom-right corner to open the chat sheet.

Configure your chat server URL via environment variable:

```bash
CHAT_URL="https://yourapp.com/chat" make run
```

## Project structure

```
ios-native-app/
├── Package.swift                # SPM package definition
├── Makefile                     # Build & run shortcuts
├── Sources/ChatExample/
│   ├── App.swift                # @main SwiftUI entry point
│   └── ContentView.swift        # Chat bubble + sheet presentation
├── Resources/
│   └── Info.plist               # App bundle metadata
└── README.md
```

## How it works

The Makefile wraps `xcodebuild` then manually assembles the `.app` bundle
(SPM executable targets produce a raw binary, not a bundle).

Open with `xed .` for full Xcode integration (auto-resolves SPM deps).
