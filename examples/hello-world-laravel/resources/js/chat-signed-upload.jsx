import React from "react";
import { createRoot } from "react-dom/client";
import { ChatAppSignedUpload } from "./components/ChatAppSignedUpload";
import "../../../../packages/js-web-adapter-react/dist/styles.css";

const root = document.getElementById("app");
if (root) {
  createRoot(root).render(
    <React.StrictMode>
      <ChatAppSignedUpload />
    </React.StrictMode>,
  );
}
