import { createContext } from "react";
import { Appearance } from "../constants/theme";

export interface ThemeContextProps {
  theme: Appearance;
  setTheme: (theme: Appearance) => void;
}

export const ThemeContext = createContext<ThemeContextProps>({
  theme: "light",
  setTheme: () => {},
});
