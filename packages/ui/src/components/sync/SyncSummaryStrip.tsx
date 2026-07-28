import React from "react";
import { useI18n } from "../../hooks/useI18n";
import type { SyncPlan } from "@commando/shared/types/SyncTypes";

interface SyncSummaryStripProps {
    plan: SyncPlan | null;
    comparing: boolean;
    rootsReady: boolean;
}

const SyncSummaryStrip: React.FC<SyncSummaryStripProps> = ({
    plan,
    comparing,
    rootsReady,
}) => {
    const { t } = useI18n();

    if (comparing) {
        return (
            <div className="sync-summary sync-summary--busy">
                {t("sync.status.comparing")}
            </div>
        );
    }

    if (!rootsReady) {
        return (
            <div className="sync-summary sync-summary--hint">
                {t("sync.onboarding.pickFolders")}
            </div>
        );
    }

    if (!plan) {
        return (
            <div className="sync-summary sync-summary--hint">
                {t("sync.onboarding.clickCompare")}
            </div>
        );
    }

    return (
        <div className="sync-summary sync-summary--results">
            <span className="sync-summary__chip sync-summary__chip--copy">
                {plan.toCopy} {t("sync.stats.copy")}
            </span>
            <span className="sync-summary__chip sync-summary__chip--delete">
                {plan.toDelete} {t("sync.stats.delete")}
            </span>
            {plan.conflicts > 0 && (
                <span className="sync-summary__chip sync-summary__chip--conflict">
                    {plan.conflicts} {t("sync.stats.conflicts")}
                </span>
            )}
            <span className="sync-summary__chip sync-summary__chip--skip">
                {plan.toSkip} {t("sync.stats.skip")}
            </span>
        </div>
    );
};

export default SyncSummaryStrip;
