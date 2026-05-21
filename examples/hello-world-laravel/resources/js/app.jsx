import React from "react";
import { createRoot } from "react-dom/client";
import { ChatApp } from "./components/ChatApp";
import "../../../../packages/js-web-adapter-react/dist/styles.css";

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ChatApp />
    </React.StrictMode>,
  );
}
