import { useEffect, useState, ReactNode } from "react";
import { Theme } from "@radix-ui/themes";
import { THEME_KEY, Appearance } from "../constants/theme";
import { ThemeContext } from "../theme/context";

export function ThemeProvider({
  children,
}: {
  children: ReactNode;
}): JSX.Element {
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
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Theme appearance={theme}>{children}</Theme>
    </ThemeContext.Provider>
  );
}
