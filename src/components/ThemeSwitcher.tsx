import React, { useEffect, useState } from "react";
import { Theme } from "@radix-ui/themes";
import { SunIcon, MoonIcon } from "@radix-ui/react-icons";

const THEME_KEY = "app-theme";

type Appearance = "light" | "dark" | "inherit";

export default function ThemeSwitcher({
    children,
}: {
    children: React.ReactNode;
}) {
    const [theme, setTheme] = useState<Appearance>(() => {
        return (localStorage.getItem(THEME_KEY) as Appearance) || "light";
    });

    useEffect(() => {
        document.documentElement.setAttribute("data-theme", theme);
        if (theme === "dark") {
            document.documentElement.classList.add("dark");
        } else {
            document.documentElement.classList.remove("dark");
        }
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    return (
        <Theme appearance={theme}>
            <button
                className="fixed top-2 right-2 z-50 p-2 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Toggle theme"
            >
                {theme === "dark" ? (
                    <SunIcon className="h-5 w-5 text-yellow-300" />
                ) : (
                    <MoonIcon className="h-5 w-5 text-gray-800" />
                )}
            </button>
            {children}
        </Theme>
    );
}
