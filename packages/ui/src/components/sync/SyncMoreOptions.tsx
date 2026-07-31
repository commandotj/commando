import React, { useState } from "react";
import { GearIcon, Cross1Icon } from "@radix-ui/react-icons";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
    setUseChecksum,
    setErrorMode,
    setDeleteMethod,
    setDeleteExtraneous,
    setDryRun,
    setResume,
} from "../../app/syncSlice";
import { saveSettings } from "../../services/settingsService";
import { useI18n } from "../../hooks/useI18n";

const SyncMoreOptions: React.FC = () => {
    const dispatch = useAppDispatch();
    const options = useAppSelector(s => s.sync.options);
    const [open, setOpen] = useState(false);
    const { t } = useI18n();

    const close = () => {
        setOpen(false);
        saveSettings(options);
    };

    return (
        <div className="sync-more-options">
            <button
                type="button"
                className="sync-btn sync-btn--ghost"
                onClick={() => setOpen(true)}
                title={t("sync.settings.title")}
            >
                <GearIcon width={14} height={14} />
            </button>
            {open && (
                <div
                    className="sync-overlay"
                    role="dialog"
                    aria-modal="true"
                    onClick={close}
                >
                    <div
                        className="sync-plan-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sync-plan-modal__header">
                            <h2>{t("sync.settings.title")}</h2>
                            <button
                                className="sync-btn sync-btn--ghost"
                                onClick={close}
                                aria-label="Close"
                            >
                                <Cross1Icon width={16} height={16} />
                            </button>
                        </div>
                        <div className="sync-plan-modal__body">
                            <div className="sync-plan-modal__section">
                                <h3>{t("sync.settings.comparison")}</h3>
                                <label className="sync-toggle">
                                    <input
                                        type="checkbox"
                                        checked={options.useChecksum}
                                        onChange={e =>
                                            dispatch(
                                                setUseChecksum(e.target.checked)
                                            )
                                        }
                                    />
                                    {t("sync.settings.contentCompare")}
                                </label>
                            </div>
                            <div className="sync-plan-modal__section">
                                <h3>{t("sync.settings.syncMode")}</h3>
                                <label className="sync-toggle">
                                    <input
                                        type="checkbox"
                                        checked={options.deleteExtraneous}
                                        onChange={e =>
                                            dispatch(
                                                setDeleteExtraneous(
                                                    e.target.checked
                                                )
                                            )
                                        }
                                    />
                                    {t("sync.settings.deleteExtraneous")}
                                </label>
                                <label className="sync-toggle">
                                    <input
                                        type="checkbox"
                                        checked={options.dryRun}
                                        onChange={e =>
                                            dispatch(
                                                setDryRun(e.target.checked)
                                            )
                                        }
                                    />
                                    {t("sync.settings.dryRun")}
                                </label>
                                <label className="sync-toggle">
                                    <input
                                        type="checkbox"
                                        checked={options.resume ?? false}
                                        onChange={e =>
                                            dispatch(
                                                setResume(e.target.checked)
                                            )
                                        }
                                    />
                                    {t("sync.settings.resume")}
                                </label>
                            </div>
                            <div className="sync-plan-modal__section">
                                <h3>{t("sync.settings.errorHandling")}</h3>
                                <select
                                    value={options.errorMode ?? "ignore"}
                                    className="sync-select"
                                    onChange={e =>
                                        dispatch(
                                            setErrorMode(
                                                e.target.value as
                                                    "stop" | "ignore"
                                            )
                                        )
                                    }
                                >
                                    <option value="ignore">
                                        {t("sync.settings.continueOnError")}
                                    </option>
                                    <option value="stop">
                                        {t("sync.settings.stopOnError")}
                                    </option>
                                </select>
                            </div>
                            <div className="sync-plan-modal__section">
                                <h3>{t("sync.settings.deleteMethod")}</h3>
                                <select
                                    value={options.deleteMethod ?? "permanent"}
                                    className="sync-select"
                                    onChange={e =>
                                        dispatch(
                                            setDeleteMethod(
                                                e.target.value as
                                                    | "permanent"
                                                    | "trash"
                                                    | "versioning"
                                            )
                                        )
                                    }
                                >
                                    <option value="permanent">
                                        {t("sync.settings.permanent")}
                                    </option>
                                    <option value="trash">
                                        {t("sync.settings.trash")}
                                    </option>
                                    <option value="versioning">
                                        {t("sync.settings.versioning")}
                                    </option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default SyncMoreOptions;
