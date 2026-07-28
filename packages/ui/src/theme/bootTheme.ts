import { applyThemeToDocument } from "./applyTheme";
import { resolveInitialTheme } from "./resolveInitialTheme";

/** Apply theme before React paints (call from main entry + inline index.html script). */
export function bootTheme(): void {
    applyThemeToDocument(resolveInitialTheme());
}
