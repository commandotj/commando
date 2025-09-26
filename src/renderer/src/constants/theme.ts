export const THEME_KEY = "app-theme";

export type Appearance = "light" | "dark" | "inherit";

export interface ThemeContextProps {
    theme: Appearance;
    setTheme: (t: Appearance) => void;
}
