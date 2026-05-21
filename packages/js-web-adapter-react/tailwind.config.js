/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        chat: {
          primary: "var(--chat-primary)",
          "primary-hover": "var(--chat-primary-hover)",
          secondary: "var(--chat-secondary)",
          background: "var(--chat-background)",
          surface: "var(--chat-surface)",
          text: "var(--chat-text)",
          "text-secondary": "var(--chat-text-secondary)",
          border: "var(--chat-border)",
          "own-message": "var(--chat-own-message)",
          "own-message-text": "var(--chat-own-message-text)",
          "other-message": "var(--chat-other-message)",
          "other-message-text": "var(--chat-other-message-text)",
          error: "var(--chat-error)",
          success: "var(--chat-success)",
        },
      },
      fontFamily: {
        chat: ["var(--chat-font-family)"],
      },
    },
  },
  plugins: [],
};
