CHAT_URL ?= https://ab77-148-71-197-239.ngrok-free.app/chat-iframe

.PHONY: install ios android clean

install:
	npm install

ios: install
	npx expo run:ios

android: install
	npx expo run:android

start: install
	EXPO_PUBLIC_CHAT_URL="$(CHAT_URL)" npx expo start

clean:
	rm -rf node_modules ios android

reset: clean
	npm install
	npx expo prebuild
