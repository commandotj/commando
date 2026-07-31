import de from "../locales/de.json";
import enUS from "../locales/en-US.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import ja from "../locales/ja.json";
import ko from "../locales/ko.json";
import zhCN from "../locales/zh-CN.json";

type JsonValue = string | { [key: string]: JsonValue };

const locales: Record<string, JsonValue> = {
    de,
    "en-US": enUS,
    es,
    fr,
    ja,
    ko,
    "zh-CN": zhCN,
};

function keysOf(value: JsonValue, prefix = ""): string[] {
    if (typeof value === "string") {
        return [prefix];
    }

    return Object.entries(value).flatMap(([key, child]) =>
        keysOf(child, prefix ? `${prefix}.${key}` : key)
    );
}

describe("i18n locale catalog", () => {
    it("keeps every locale key aligned with en-US", () => {
        const expected = keysOf(enUS).sort();

        for (const messages of Object.values(locales)) {
            expect(keysOf(messages).sort()).toEqual(expected);
        }
    });

    it("contains non-empty text for every translated key", () => {
        for (const messages of Object.values(locales)) {
            for (const key of keysOf(messages)) {
                const value = key
                    .split(".")
                    .reduce<JsonValue | undefined>(
                        (current, segment) =>
                            current && typeof current !== "string"
                                ? current[segment]
                                : undefined,
                        messages
                    );
                expect(value).toEqual(expect.any(String));
                expect(String(value).trim()).not.toBe("");
            }
        }
    });
});
