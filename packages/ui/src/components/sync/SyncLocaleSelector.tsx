import React from "react";
import { GlobeIcon } from "@radix-ui/react-icons";
import { useI18n } from "../../hooks/useI18n";

const LANGUAGES = [
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

    return (
        <div className="sync-locale-selector">
            <GlobeIcon width={14} height={14} />
            <select
                value={currentLanguage}
                onChange={e => {
                    changeLanguage(e.target.value);
                    localStorage.setItem("commando-locale", e.target.value);
                }}
            >
                {LANGUAGES.map(l => (
                    <option key={l.code} value={l.code}>
                        {l.label}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default SyncLocaleSelector;
