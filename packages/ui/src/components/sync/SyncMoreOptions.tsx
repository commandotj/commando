import React, { useState } from "react";
import { GearIcon } from "@radix-ui/react-icons";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
    setUseChecksum,
    setErrorMode,
    setDeleteMethod,
    setDeleteExtraneous,
    setDryRun,
    setResume,
} from "../../app/syncSlice";

const SyncMoreOptions: React.FC = () => {
    const dispatch = useAppDispatch();
    const options = useAppSelector(s => s.sync.options);
    const [open, setOpen] = useState(false);

    return (
        <div className="sync-more-options">
            <button
                type="button"
                className="sync-btn sync-btn--ghost"
                onClick={() => setOpen(!open)}
                title="More options"
            >
                <GearIcon width={14} height={14} />
            </button>
            {open && (
                <div className="sync-more-options__panel">
                    <label className="sync-toggle">
                        <input
                            type="checkbox"
                            checked={options.useChecksum}
                            onChange={e =>
                                dispatch(setUseChecksum(e.target.checked))
                            }
                        />
                        Content compare
                    </label>
                    <label className="sync-toggle">
                        <input
                            type="checkbox"
                            checked={options.deleteExtraneous}
                            onChange={e =>
                                dispatch(setDeleteExtraneous(e.target.checked))
                            }
                        />
                        Delete extraneous
                    </label>
                    <label className="sync-toggle">
                        <input
                            type="checkbox"
                            checked={options.dryRun}
                            onChange={e =>
                                dispatch(setDryRun(e.target.checked))
                            }
                        />
                        Dry run
                    </label>
                    <label className="sync-toggle">
                        <input
                            type="checkbox"
                            checked={options.resume ?? false}
                            onChange={e =>
                                dispatch(setResume(e.target.checked))
                            }
                        />
                        Resume previous sync
                    </label>
                    <label className="sync-more-options__field">
                        On error
                        <select
                            value={options.errorMode ?? "ignore"}
                            onChange={e =>
                                dispatch(
                                    setErrorMode(
                                        e.target.value as "stop" | "ignore"
                                    )
                                )
                            }
                        >
                            <option value="ignore">Continue</option>
                            <option value="stop">Stop</option>
                        </select>
                    </label>
                    <label className="sync-more-options__field">
                        Delete
                        <select
                            value={options.deleteMethod ?? "permanent"}
                            onChange={e =>
                                dispatch(
                                    setDeleteMethod(
                                        e.target.value as
                                            "permanent" | "trash" | "versioning"
                                    )
                                )
                            }
                        >
                            <option value="permanent">Permanent</option>
                            <option value="trash">Trash</option>
                            <option value="versioning">Versioning</option>
                        </select>
                    </label>
                </div>
            )}
        </div>
    );
};

export default SyncMoreOptions;
