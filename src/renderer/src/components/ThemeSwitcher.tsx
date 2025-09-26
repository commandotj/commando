import { SunIcon, MoonIcon } from "@radix-ui/react-icons";
import { useTheme } from "../hooks/useTheme";

export function ThemeSwitchButton(): JSX.Element {
    const { theme, setTheme } = useTheme();
    return (
        <button
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={(): void => setTheme(theme === "dark" ? "light" : "dark")}
            aria-label="Toggle theme"
        >
            {theme === "dark" ? (
                <SunIcon className="h-5 w-5 text-yellow-300" />
            ) : (
                <MoonIcon className="h-5 w-5 text-gray-800" />
            )}
        </button>
    );
}

// Note: ThemeProvider and useTheme are available from their respective modules
