import { THEME_KEY, type Appearance } from "../constants/theme";

const STORED_THEMES = new Set<Appearance>(["light", "dark"]);

export interface ThemeResolutionDeps {
    getStoredTheme: () => string | null;
    prefersDark: () => boolean;
    prefersLight: () => boolean;
}

const defaultDeps = (): ThemeResolutionDeps => ({
    getStoredTheme: () =>
        typeof localStorage !== "undefined"
            ? localStorage.getItem(THEME_KEY)
            : null,
    prefersDark: () =>
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches,
    prefersLight: () =>
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: light)").matches,
});

/** Resolve theme: saved preference → OS preference → dark (desktop default). */
export function resolveInitialTheme(
    deps: ThemeResolutionDeps = defaultDeps()
): Appearance {
    const stored = deps.getStoredTheme();
    if (stored && STORED_THEMES.has(stored as Appearance)) {
        return stored as Appearance;
    }
    if (deps.prefersDark()) {
        return "dark";
    }
    if (deps.prefersLight()) {
        return "light";
    }
    return "dark";
}
