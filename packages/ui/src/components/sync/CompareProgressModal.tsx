import React, { useMemo } from "react";
import { Cross1Icon, FileIcon } from "@radix-ui/react-icons";
import { useI18n } from "../../hooks/useI18n";

interface CompareProgressModalProps {
    open: boolean;
    progressFile: string | null;
    progressAction: string | null;
    progressDone: number;
    progressTotal: number;
    onCancel: () => void;
}

const RING_SIZE = 128;
const RING_STROKE = 7;

function basename(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
}

function formatCount(n: number): string {
    return n.toLocaleString();
}

function ProgressRing({
    pct,
    label,
}: {
    pct: number;
    label: string;
}): React.ReactElement {
    const radius = (RING_SIZE - RING_STROKE) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (pct / 100) * circumference;

    return (
        <div
            className="sync-compare-ring"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-label={label}
        >
            <svg
                width={RING_SIZE}
                height={RING_SIZE}
                viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
                aria-hidden
            >
                <circle
                    className="sync-compare-ring__track"
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={RING_STROKE}
                />
                <circle
                    className="sync-compare-ring__fill"
                    cx={RING_SIZE / 2}
                    cy={RING_SIZE / 2}
                    r={radius}
                    fill="none"
                    strokeWidth={RING_STROKE}
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    transform={`rotate(-90 ${RING_SIZE / 2} ${RING_SIZE / 2})`}
                />
            </svg>
            <div className="sync-compare-ring__center">
                <span className="sync-compare-ring__value">{label}</span>
            </div>
        </div>
    );
}

const CompareProgressModal: React.FC<CompareProgressModalProps> = ({
    open,
    progressFile,
    progressAction,
    progressDone,
    progressTotal,
    onCancel,
}) => {
    const { t } = useI18n();

    const indexing = progressAction === "index" || progressTotal <= 0;
    const pct = useMemo(() => {
        if (indexing || progressTotal <= 0) {
            return 0;
        }
        return Math.min(
            100,
            Math.round((progressDone / progressTotal) * 100)
        );
    }, [indexing, progressDone, progressTotal]);

    if (!open) {
        return null;
    }

    const ringLabel = indexing
        ? formatCount(progressDone)
        : `${pct}%`;

    const metricCaption = indexing
        ? t("sync.plan.filesScanned")
        : t("sync.plan.ofItems", {
              done: formatCount(progressDone),
              total: formatCount(progressTotal),
          });

    return (
        <div
            className="sync-overlay sync-overlay--compare"
            role="dialog"
            aria-modal="true"
            aria-labelledby="compare-progress-title"
            aria-busy="true"
        >
            <div
                className="sync-compare-modal"
                onClick={e => e.stopPropagation()}
            >
                <header className="sync-compare-modal__header">
                    <h2
                        id="compare-progress-title"
                        className="sync-compare-modal__title"
                    >
                        {t("sync.plan.comparingTitle")}
                    </h2>
                    <button
                        type="button"
                        className="sync-compare-modal__close"
                        onClick={onCancel}
                        aria-label={t("sync.plan.cancel")}
                    >
                        <Cross1Icon width={16} height={16} />
                    </button>
                </header>

                <ol className="sync-compare-steps" aria-label={t("sync.plan.comparingTitle")}>
                    <li
                        className={`sync-compare-steps__item${indexing ? " sync-compare-steps__item--active" : " sync-compare-steps__item--done"}`}
                    >
                        <span className="sync-compare-steps__dot" aria-hidden />
                        {t("sync.plan.stepIndex")}
                    </li>
                    <li className="sync-compare-steps__line" aria-hidden />
                    <li
                        className={`sync-compare-steps__item${!indexing ? " sync-compare-steps__item--active" : ""}`}
                    >
                        <span className="sync-compare-steps__dot" aria-hidden />
                        {t("sync.plan.stepAnalyze")}
                    </li>
                </ol>

                <div className="sync-compare-modal__body">
                    <ProgressRing
                        pct={indexing ? 0 : pct}
                        label={ringLabel}
                    />
                    <p className="sync-compare-modal__metric" aria-live="polite">
                        {metricCaption}
                    </p>
                </div>

                {progressFile ? (
                    <div className="sync-compare-modal__file-card">
                        <FileIcon
                            className="sync-compare-modal__file-icon"
                            width={16}
                            height={16}
                            aria-hidden
                        />
                        <div className="sync-compare-modal__file-text">
                            <span className="sync-compare-modal__file-name">
                                {basename(progressFile)}
                            </span>
                            <span
                                className="sync-compare-modal__file-path"
                                title={progressFile}
                            >
                                {progressFile}
                            </span>
                        </div>
                    </div>
                ) : null}

                <p className="sync-compare-modal__hint">
                    {t("sync.plan.comparingHint")}
                </p>

                <footer className="sync-compare-modal__footer">
                    <button
                        type="button"
                        className="sync-btn sync-btn--ghost"
                        onClick={onCancel}
                    >
                        {t("sync.plan.cancel")}
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default CompareProgressModal;
