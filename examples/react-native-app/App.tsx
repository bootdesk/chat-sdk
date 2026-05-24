import { useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  ChatWidget,
  useBridgePushNotifications,
} from "@bootdesk/chat-widget-react-native";

const CHAT_URL = process.env.EXPO_PUBLIC_CHAT_URL ?? "https://example.com/chat";

export default function App() {
  const [showChat, setShowChat] = useState(false);

  return (
    <SafeAreaProvider>
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.heading}>Chat Widget Example</Text>
          <Text style={styles.subtitle}>Tap the bubble to start chatting</Text>
        </View>

        <View style={styles.bubbleContainer}>
          <TouchableOpacity
            style={styles.bubble}
            onPress={() => setShowChat(true)}
            activeOpacity={0.8}
          >
            <Text style={styles.bubbleIcon}>💬</Text>
          </TouchableOpacity>
        </View>

        <Modal
          visible={showChat}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setShowChat(false)}
        >
          <SafeAreaView style={styles.chat}>
            <ChatWidget
              url={CHAT_URL}
              config={{ title: "Support" }}
              onClose={() => setShowChat(false)}
              style={styles.chat}
            />
          </SafeAreaView>
        </Modal>
      </View>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F2F2F7",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  heading: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1C1C1E",
  },
  subtitle: {
    fontSize: 16,
    color: "#8E8E93",
  },
  bubbleContainer: {
    position: "absolute",
    bottom: 48,
    right: 24,
  },
  bubble: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  bubbleIcon: {
    fontSize: 28,
  },
  chat: {
    flex: 1,
    marginTop: 0,
  },
});
