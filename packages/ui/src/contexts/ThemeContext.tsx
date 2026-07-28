import { useLayoutEffect, useState, ReactNode } from "react";
import { Theme } from "@radix-ui/themes";
import { THEME_KEY, Appearance } from "../constants/theme";
import { ThemeContext } from "../theme/context";
import { applyThemeToDocument } from "../theme/applyTheme";
import { resolveInitialTheme } from "../theme/resolveInitialTheme";

export function ThemeProvider({
    children,
}: {
    children: ReactNode;
}): JSX.Element {
    const [theme, setTheme] = useState<Appearance>(() => resolveInitialTheme());

    useLayoutEffect(() => {
        applyThemeToDocument(theme);
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <Theme appearance={theme} className="commando-app-root">
                {children}
            </Theme>
        </ThemeContext.Provider>
    );
}
