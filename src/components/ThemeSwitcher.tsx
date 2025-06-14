import React, { useEffect, useState } from "react";
import { Theme } from "@radix-ui/themes";

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
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-yellow-300"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 3v1m0 16v1m8.66-13.66l-.71.71M4.05 19.07l-.71.71M21 12h-1M4 12H3m16.66 5.66l-.71-.71M4.05 4.93l-.71-.71M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                        />
                    </svg>
                ) : (
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-5 w-5 text-gray-800"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 12.79A9 9 0 1111.21 3a7 7 0 109.79 9.79z"
                        />
                    </svg>
                )}
            </button>
            {children}
        </Theme>
    );
}
