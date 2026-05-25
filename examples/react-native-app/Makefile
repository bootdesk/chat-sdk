CHAT_URL ?= https://example.com/chat-iframe

.PHONY: install prebuild android ios start clean

install:
	npm install

prebuild: install
	npx expo prebuild

android: prebuild
	EXPO_PUBLIC_CHAT_URL="$(CHAT_URL)" npx expo run:android

ios: prebuild
	EXPO_PUBLIC_CHAT_URL="$(CHAT_URL)" npx expo run:ios

start:
	EXPO_PUBLIC_CHAT_URL="$(CHAT_URL)" npx expo start

clean:
	rm -rf node_modules ios android .expo
