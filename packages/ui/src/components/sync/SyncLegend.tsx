import React from "react";
import { useI18n } from "../../hooks/useI18n";

const SyncLegend: React.FC = () => {
    const { t } = useI18n();
    const items = [
        { key: "copy", label: t("sync.legend.copy") },
        { key: "delete", label: t("sync.legend.delete") },
        { key: "conflict", label: t("sync.legend.conflict") },
    ] as const;

    return (
        <div className="sync-legend" aria-label={t("sync.legend.title")}>
            <span className="sync-legend__title">{t("sync.legend.title")}</span>
            {items.map(item => (
                <span
                    key={item.key}
                    className={`sync-legend__item sync-legend__item--${item.key}`}
                >
                    <span className="sync-legend__swatch" />
                    {item.label}
                </span>
            ))}
        </div>
    );
};

export default SyncLegend;
