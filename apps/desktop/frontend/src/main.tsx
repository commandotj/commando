import React from "react";
import ReactDOM from "react-dom/client";
import { Provider } from "react-redux";
import App from "@commandojs/ui/App";
import store from "@commandojs/ui/app/store";
import { bootTheme } from "@commandojs/ui/theme";
import "./desktop.css";
import { bootstrapDesktop } from "./platform/bootstrap";

bootTheme();

if (/Mac|iPhone|iPad|iPod/.test(navigator.userAgent)) {
    document.documentElement.classList.add("platform-macos");
}

function showBootstrapError(error: unknown): void {
    const root = document.getElementById("root");
    if (!root) {
        return;
    }
    const message = error instanceof Error ? error.message : String(error);
    root.innerHTML = `<div style="padding:2rem;font-family:system-ui;color:#fecaca;background:#450a0a;height:100%">
    <h1 style="margin:0 0 1rem">Commando failed to start</h1>
    <pre style="white-space:pre-wrap">${message}</pre>
  </div>`;
}

async function main(): Promise<void> {
    try {
        await bootstrapDesktop();
    } catch (error) {
        console.error(error);
        showBootstrapError(error);
        return;
    }

    const root = document.getElementById("root");
    if (!root) {
        throw new Error("missing #root");
    }

    ReactDOM.createRoot(root).render(
        <React.StrictMode>
            <Provider store={store}>
                <App />
            </Provider>
        </React.StrictMode>
    );
}

void main();
