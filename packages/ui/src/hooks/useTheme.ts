import { useContext } from "react";
import { ThemeContext } from "../theme/context";
import { ThemeContextProps } from "../theme/context";

export function useTheme(): ThemeContextProps {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
