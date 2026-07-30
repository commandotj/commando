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

const SyncMoreOptions: React.FC = () => {
    const dispatch = useAppDispatch();
    const options = useAppSelector(s => s.sync.options);
    const [open, setOpen] = useState(false);

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
                title="Settings"
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
                        className="sync-settings-modal"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="sync-settings-modal__header">
                            <h3>Sync Settings</h3>
                            <button
                                className="sync-btn sync-btn--ghost"
                                onClick={close}
                                aria-label="Close"
                            >
                                <Cross1Icon width={16} height={16} />
                            </button>
                        </div>

                        <div className="sync-settings-modal__body">
                            <div className="sync-settings-modal__section">
                                <h4 className="sync-settings-modal__section-title">
                                    Comparison
                                </h4>
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
                                    Content compare (checksum)
                                </label>
                            </div>

                            <div className="sync-settings-modal__section">
                                <h4 className="sync-settings-modal__section-title">
                                    Sync Mode
                                </h4>
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
                                    Delete extraneous files
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
                                    Dry run (no writes)
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
                                    Resume previous sync
                                </label>
                            </div>

                            <div className="sync-settings-modal__section">
                                <h4 className="sync-settings-modal__section-title">
                                    Error Handling
                                </h4>
                                <label className="sync-settings-modal__field">
                                    On error
                                    <select
                                        value={options.errorMode ?? "ignore"}
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
                                            Continue on error
                                        </option>
                                        <option value="stop">
                                            Stop on first error
                                        </option>
                                    </select>
                                </label>
                            </div>

                            <div className="sync-settings-modal__section">
                                <h4 className="sync-settings-modal__section-title">
                                    Delete Method
                                </h4>
                                <label className="sync-settings-modal__field">
                                    <select
                                        value={
                                            options.deleteMethod ?? "permanent"
                                        }
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
                                            Permanent delete
                                        </option>
                                        <option value="trash">
                                            Move to trash
                                        </option>
                                        <option value="versioning">
                                            Keep versioned copy
                                        </option>
                                    </select>
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default SyncMoreOptions;
