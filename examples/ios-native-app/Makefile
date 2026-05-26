DEVICE ?= platform=iOS Simulator,name=iPhone 17
UDID ?= 0217FC97-824F-4063-B55D-20601952A804
BUNDLE_ID = com.bootdesk.chat.example
BUILD_DIR = .build
APP_BUNDLE = $(BUILD_DIR)/Build/Products/Debug-iphonesimulator/ChatExample.app

.PHONY: build run clean

build:
	xcodebuild build \
		-scheme ChatExample \
		-destination '$(DEVICE)' \
		-derivedDataPath $(BUILD_DIR)
	mkdir -p "$(APP_BUNDLE)"
	cp $(BUILD_DIR)/Build/Products/Debug-iphonesimulator/ChatExample "$(APP_BUNDLE)/"
	cp Resources/Info.plist "$(APP_BUNDLE)/"

run: build
	xcrun simctl install "$(UDID)" "$(APP_BUNDLE)"
ifdef CHAT_URL
	xcrun simctl launch "$(UDID)" $(BUNDLE_ID) "$(CHAT_URL)"
else
	xcrun simctl launch "$(UDID)" $(BUNDLE_ID)
endif

clean:
	rm -rf $(BUILD_DIR) .swiftpm
