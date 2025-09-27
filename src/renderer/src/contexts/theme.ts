import { createContext } from "react";
import { ThemeContextProps } from "../constants/theme";

export const ThemeContext = createContext<ThemeContextProps | undefined>(
  undefined,
);
