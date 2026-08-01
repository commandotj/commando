import React, { useState } from "react";
import {
    CheckCircledIcon,
    Cross1Icon,
    ExclamationTriangleIcon,
} from "@radix-ui/react-icons";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { clearSyncPlan } from "../../app/syncSlice";
import { setViewMode } from "../../app/fileManagerSlice";
import { SYNC_STRATEGY_OPTIONS } from "../../constants/sync";
import { useI18n } from "../../hooks/useI18n";
import { normalizeExecuteResult } from "../../common/normalizeExecuteResult";

const MAX_VISIBLE_ERRORS = 5;

const SyncResultPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useI18n();
    const { report, executeResult, status, strategyId } = useAppSelector(
        s => s.sync
    );
    const viewMode = useAppSelector(s => s.fileManager.viewMode);
    const [errorsOpen, setErrorsOpen] = useState(false);

    if (status !== "done") {
        return null;
    }

    // Compare results live in SyncDiffView — don't dump thousands of rows here.
    if (viewMode === "diff" && report && !executeResult) {
        return null;
    }

    if (executeResult) {
        const result = normalizeExecuteResult(executeResult);
        const hasErrors = result.errors.length > 0;
        const visibleErrors = errorsOpen
            ? result.errors
            : result.errors.slice(0, MAX_VISIBLE_ERRORS);

        return (
            <div
                className={`sync-result-banner${hasErrors ? " sync-result-banner--warn" : " sync-result-banner--ok"}`}
                role="status"
            >
                <div className="sync-result-banner__main">
                    {hasErrors ? (
                        <ExclamationTriangleIcon
                            width={16}
                            height={16}
                            aria-hidden
                        />
                    ) : (
                        <CheckCircledIcon width={16} height={16} aria-hidden />
                    )}
                    <p className="sync-result-banner__text">
                        {t("sync.result.executeSummary", {
                            copied: result.copied,
                            skipped: result.skipped,
                            deleted: result.deleted,
                        })}
                        {hasErrors
                            ? ` · ${t("sync.result.errorCount", {
                                  count: result.errors.length,
                              })}`
                            : ""}
                    </p>
                    <div className="sync-result-banner__chips">
                        <span className="sync-result-banner__chip sync-result-banner__chip--copy">
                            {result.copied}
                        </span>
                        <span className="sync-result-banner__chip sync-result-banner__chip--skip">
                            {result.skipped}
                        </span>
                        {result.deleted > 0 && (
                            <span className="sync-result-banner__chip sync-result-banner__chip--delete">
                                {result.deleted}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        className="sync-result-banner__close"
                        onClick={() => dispatch(clearSyncPlan())}
                        aria-label={t("sync.result.dismiss")}
                    >
                        <Cross1Icon width={14} height={14} />
                    </button>
                </div>
                {hasErrors && (
                    <div className="sync-result-banner__errors">
                        <ul className="sync-result-banner__error-list">
                            {visibleErrors.map((err, i) => (
                                <li key={`${i}-${err.slice(0, 24)}`}>{err}</li>
                            ))}
                        </ul>
                        {result.errors.length > MAX_VISIBLE_ERRORS && (
                            <button
                                type="button"
                                className="sync-btn sync-btn--ghost sync-result-banner__more"
                                onClick={() => setErrorsOpen(v => !v)}
                            >
                                {errorsOpen
                                    ? t("sync.result.showLess")
                                    : t("sync.result.showMore", {
                                          count:
                                              result.errors.length -
                                              MAX_VISIBLE_ERRORS,
                                      })}
                            </button>
                        )}
                    </div>
                )}
            </div>
        );
    }

    if (!report) {
        return null;
    }

    const strategy = SYNC_STRATEGY_OPTIONS.find(
        s => s.id === (report.strategy?.id ?? strategyId)
    );
    const strategyName = strategy
        ? t(strategy.labelKey)
        : (report.strategy?.id ?? strategyId);

    return (
        <div
            className="sync-result-banner sync-result-banner--compare"
            role="status"
        >
            <div className="sync-result-banner__main">
                <CheckCircledIcon width={16} height={16} aria-hidden />
                <p className="sync-result-banner__text">
                    <strong>{strategyName}</strong>
                    {" · "}
                    {t("sync.result.compareSummary", {
                        copy: report.toCopy,
                        skip: report.toSkip,
                        delete: report.toDelete,
                        conflicts: report.conflicts,
                    })}
                </p>
                <div className="sync-result-banner__chips">
                    {report.toCopy > 0 && (
                        <span className="sync-result-banner__chip sync-result-banner__chip--copy">
                            {report.toCopy} {t("sync.stats.copy")}
                        </span>
                    )}
                    {report.toDelete > 0 && (
                        <span className="sync-result-banner__chip sync-result-banner__chip--delete">
                            {report.toDelete} {t("sync.stats.delete")}
                        </span>
                    )}
                    {report.conflicts > 0 && (
                        <span className="sync-result-banner__chip sync-result-banner__chip--conflict">
                            {report.conflicts} {t("sync.stats.conflicts")}
                        </span>
                    )}
                    {report.toSkip > 0 && (
                        <span className="sync-result-banner__chip sync-result-banner__chip--skip">
                            {report.toSkip} {t("sync.stats.skip")}
                        </span>
                    )}
                </div>
                <button
                    type="button"
                    className="sync-btn sync-btn--ghost sync-result-banner__view"
                    onClick={() => dispatch(setViewMode("diff"))}
                >
                    {t("sync.plan.viewDiff")}
                </button>
                <button
                    type="button"
                    className="sync-result-banner__close"
                    onClick={() => dispatch(clearSyncPlan())}
                    aria-label={t("sync.result.dismiss")}
                >
                    <Cross1Icon width={14} height={14} />
                </button>
            </div>
        </div>
    );
};

export default SyncResultPanel;
