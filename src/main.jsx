import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./styles.css";
import { reportVisit } from "./utils/ping";

reportVisit(import.meta.env.VITE_APP_VERSION);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
