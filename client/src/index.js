import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { LangProvider } from "./i18n";
import { registerServiceWorker } from "./pwa";

const container = document.getElementById("root");
const root = createRoot(container);

root.render(
  <React.StrictMode>
    <LangProvider>
      <App />
    </LangProvider>
  </React.StrictMode>
);

registerServiceWorker();
