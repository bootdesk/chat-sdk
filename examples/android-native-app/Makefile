CHAT_URL ?= https://ab77-148-71-197-239.ngrok-free.app/chat-iframe
APK = app/build/outputs/apk/debug/app-debug.apk

.PHONY: build install run clean

build:
	./gradlew :app:assembleDebug

install: build
	adb uninstall com.bootdesk.chatexample 2>/dev/null || true
	adb install -r $(APK)

run: install
	adb shell am start -n com.bootdesk.chatexample/.MainActivity -e CHAT_URL "$(CHAT_URL)"

clean:
	./gradlew clean
	rm -rf app/build
