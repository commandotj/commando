import { SunIcon, MoonIcon } from "@radix-ui/react-icons";
import { useTheme } from "../hooks/useTheme";

export function ThemeSwitchButton(): JSX.Element {
    const { theme, setTheme } = useTheme();
    return (
        <button
            type="button"
            className="cmd-theme-btn"
            onClick={(): void => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <SunIcon className="cmd-icon cmd-icon--lg cmd-icon--sun" />
            ) : (
                <MoonIcon className="cmd-icon cmd-icon--lg cmd-icon--moon" />
            )}
        </button>
    );
}

// Note: ThemeProvider and useTheme are available from their respective modules
