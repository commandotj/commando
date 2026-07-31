import React from "react";
import { GlobeIcon } from "@radix-ui/react-icons";
import { DropdownMenu, Theme } from "@radix-ui/themes";
import { useI18n } from "../../hooks/useI18n";
import { useTheme } from "../../hooks/useTheme";

const LANGS = [
    { code: "en-US", label: "English" },
    { code: "zh-CN", label: "简体中文" },
    { code: "es", label: "Español" },
    { code: "fr", label: "Français" },
    { code: "de", label: "Deutsch" },
    { code: "ja", label: "日本語" },
    { code: "ko", label: "한국어" },
];

const SyncLocaleSelector: React.FC = () => {
    const { currentLanguage, changeLanguage } = useI18n();
    const { theme } = useTheme();

    return (
        <DropdownMenu.Root>
            <DropdownMenu.Trigger>
                <button type="button" className="sync-btn sync-btn--ghost">
                    <GlobeIcon width={16} height={16} />
                </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
                <Theme appearance={theme}>
                    {LANGS.map(l => (
                        <DropdownMenu.Item
                            key={l.code}
                            onClick={() => {
                                changeLanguage(l.code);
                                localStorage.setItem("commando-locale", l.code);
                            }}
                        >
                            {currentLanguage === l.code ? "✓ " : ""}
                            {l.label}
                        </DropdownMenu.Item>
                    ))}
                </Theme>
            </DropdownMenu.Content>
        </DropdownMenu.Root>
    );
};
export default SyncLocaleSelector;
