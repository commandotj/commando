import { useContext } from "react";
import { ThemeContext } from "../contexts/ThemeContext";
import { ThemeContextProps } from "../constants/theme";

export function useTheme(): ThemeContextProps {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
    return ctx;
}
