import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/sora/latin-400.css";
import "@fontsource/sora/latin-500.css";
import "@fontsource/sora/latin-600.css";
import "@fontsource/sora/latin-700.css";
import "@fontsource/jetbrains-mono/latin-400.css";
import "@fontsource/jetbrains-mono/latin-500.css";
import "@fontsource/jetbrains-mono/latin-600.css";
import "@fontsource/jetbrains-mono/latin-700.css";
import "./styles.css";

if (!import.meta.env.IS_DESKTOP) {
  import("./utils/ping").then(({ reportVisit }) => {
    reportVisit(import.meta.env.VITE_APP_VERSION);
  });
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
