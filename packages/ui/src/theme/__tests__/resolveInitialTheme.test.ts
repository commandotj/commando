import { resolveInitialTheme } from "../resolveInitialTheme";

describe("resolveInitialTheme", () => {
    it("returns stored dark preference", () => {
        expect(
            resolveInitialTheme({
                getStoredTheme: () => "dark",
                prefersDark: () => false,
                prefersLight: () => true,
            })
        ).toBe("dark");
    });

    it("returns stored light preference", () => {
        expect(
            resolveInitialTheme({
                getStoredTheme: () => "light",
                prefersDark: () => true,
                prefersLight: () => false,
            })
        ).toBe("light");
    });

    it("falls back to OS dark when nothing stored", () => {
        expect(
            resolveInitialTheme({
                getStoredTheme: () => null,
                prefersDark: () => true,
                prefersLight: () => false,
            })
        ).toBe("dark");
    });

    it("falls back to OS light when nothing stored", () => {
        expect(
            resolveInitialTheme({
                getStoredTheme: () => null,
                prefersDark: () => false,
                prefersLight: () => true,
            })
        ).toBe("light");
    });

    it("defaults to dark when no stored value and no OS hint", () => {
        expect(
            resolveInitialTheme({
                getStoredTheme: () => null,
                prefersDark: () => false,
                prefersLight: () => false,
            })
        ).toBe("dark");
    });

    it("ignores invalid stored values", () => {
        expect(
            resolveInitialTheme({
                getStoredTheme: () => "inherit",
                prefersDark: () => false,
                prefersLight: () => false,
            })
        ).toBe("dark");
    });
});
