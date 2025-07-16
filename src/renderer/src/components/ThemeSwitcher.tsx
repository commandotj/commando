import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Theme } from '@radix-ui/themes';
import { SunIcon, MoonIcon } from '@radix-ui/react-icons';

const THEME_KEY = 'app-theme';

type Appearance = 'light' | 'dark' | 'inherit';

interface ThemeContextProps {
    theme: Appearance;
    setTheme: (t: Appearance) => void;
}

const ThemeContext = createContext<ThemeContextProps | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<Appearance>(() => {
        return (localStorage.getItem(THEME_KEY) as Appearance) || 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
        localStorage.setItem(THEME_KEY, theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, setTheme }}>
            <Theme appearance={theme}>{children}</Theme>
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}

export function ThemeSwitchButton() {
    const { theme, setTheme } = useTheme();
    return (
        <button
            className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            aria-label="Toggle theme"
        >
            {theme === 'dark' ? (
                <SunIcon className="h-5 w-5 text-yellow-300" />
            ) : (
                <MoonIcon className="h-5 w-5 text-gray-800" />
            )}
        </button>
    );
}
