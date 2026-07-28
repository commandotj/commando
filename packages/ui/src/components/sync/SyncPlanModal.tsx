import React from "react";
import type { SyncPlan } from "@commando/shared/types/SyncTypes";
import { useI18n } from "../../hooks/useI18n";

interface SyncPlanModalProps {
    open: boolean;
    plan: SyncPlan | null;
    loading?: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const actionClass = (action: string): string => {
    switch (action) {
        case "copy":
            return "sync-plan-action sync-plan-action--copy";
        case "delete":
            return "sync-plan-action sync-plan-action--delete";
        case "conflict":
            return "sync-plan-action sync-plan-action--conflict";
        default:
            return "sync-plan-action";
    }
};

const SyncPlanModal: React.FC<SyncPlanModalProps> = ({
    open,
    plan,
    loading = false,
    onClose,
    onConfirm,
}) => {
    const { t } = useI18n();
    if (!open || !plan) {
        return null;
    }

    const actionable = (plan.items ?? []).filter(
        item => item.action !== "skip"
    );

    return (
        <div
            className="sync-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="sync-plan-title"
            onClick={onClose}
        >
            <div className="sync-plan-modal" onClick={e => e.stopPropagation()}>
                <div className="sync-plan-modal__header">
                    <h2 id="sync-plan-title" className="sync-plan-modal__title">
                        {t("sync.plan.title")}
                    </h2>
                    <p className="sync-plan-modal__subtitle">
                        {t("sync.plan.summary", {
                            copy: plan.toCopy,
                            delete: plan.toDelete,
                            conflicts: plan.conflicts,
                        })}
                    </p>
                </div>
                <div className="sync-plan-modal__body">
                    {actionable.length === 0 ? (
                        <p className="sync-plan-modal__empty">
                            {t("sync.plan.inSync")}
                        </p>
                    ) : (
                        actionable.map(item => (
                            <div
                                key={`${item.relativePath}-${item.action}`}
                                className="sync-plan-row"
                            >
                                <span className={actionClass(item.action)}>
                                    {item.action}
                                </span>
                                <div>
                                    <div className="sync-plan-row__path">
                                        {item.relativePath}
                                    </div>
                                    <div className="sync-plan-row__reason">
                                        {item.reason}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="sync-plan-modal__footer">
                    <button
                        type="button"
                        className="sync-btn sync-btn--ghost"
                        onClick={onClose}
                    >
                        {t("sync.plan.cancel")}
                    </button>
                    <button
                        type="button"
                        className="sync-btn sync-btn--primary"
                        disabled={loading || actionable.length === 0}
                        onClick={onConfirm}
                    >
                        {loading
                            ? t("sync.plan.syncing")
                            : t("sync.plan.confirm")}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SyncPlanModal;
