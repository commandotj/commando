import type { Appearance } from "../constants/theme";

/** Sync `html` class, data attribute, and native control color scheme. */
export function applyThemeToDocument(theme: Appearance): void {
    if (typeof document === "undefined") {
        return;
    }
    const root = document.documentElement;
    root.setAttribute("data-theme", theme);
    root.classList.toggle("dark", theme === "dark");
    root.style.colorScheme = theme;
}
