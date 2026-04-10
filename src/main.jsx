import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import ErrorBoundary from "./ErrorBoundary";
import "./styles.css";

function showBootError(message) {
  const root = document.getElementById("root");
  const fallback = document.getElementById("boot-fallback");

  if (fallback) {
    fallback.innerHTML = `
      <section style="width:min(720px,100%);padding:28px;border-radius:24px;border:1px solid rgba(25,25,25,0.08);background:rgba(255,255,255,0.82);box-shadow:0 24px 80px rgba(28,27,25,0.12);">
        <p style="margin:0 0 12px;letter-spacing:.14em;text-transform:uppercase;color:#6e675f;">Boot error</p>
        <h1 style="margin:0 0 12px;font-size:2rem;line-height:1;">The app failed before render.</h1>
        <p style="margin:0;line-height:1.7;">${message}</p>
      </section>
    `;
  }

  if (root) {
    root.innerHTML = "";
  }
}

window.addEventListener("error", (event) => {
  console.error("Global boot error:", event.error || event.message);
  showBootError((event.error && event.error.message) || event.message || "Unknown startup error");
});

window.addEventListener("unhandledrejection", (event) => {
  const reason =
    event.reason instanceof Error ? event.reason.message : String(event.reason);
  console.error("Unhandled promise rejection:", event.reason);
  showBootError(reason || "Unhandled promise rejection");
});

const fallback = document.getElementById("boot-fallback");
if (fallback) {
  fallback.style.display = "none";
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
