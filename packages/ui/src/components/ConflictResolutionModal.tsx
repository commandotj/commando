import React, { useState, useEffect } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ConflictInfo, ConflictResolution } from "../app/fileOperationsSlice";

interface ConflictResolutionModalProps {
    open: boolean;
    conflicts: ConflictInfo[];
    onResolve: (resolutions: { [key: string]: ConflictResolution }) => void;
    onCancel: () => void;
}

const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
    open,
    conflicts,
    onResolve,
    onCancel,
}) => {
    const [resolutions, setResolutions] = useState<{
        [key: string]: ConflictResolution;
    }>({});
    const [applyToAll, setApplyToAll] = useState(false);
    const [currentConflictIndex, setCurrentConflictIndex] = useState(0);

    const currentConflict = conflicts[currentConflictIndex];

    useEffect(() => {
        if (open) {
            setResolutions({});
            setApplyToAll(false);
            setCurrentConflictIndex(0);
        }
    }, [open, conflicts]);

    const handleResolution = (
        action: ConflictResolution["action"],
        newName?: string
    ) => {
        const resolution: ConflictResolution = {
            action,
            applyToAll,
            newName,
        };

        if (applyToAll) {
            // 应用到所有冲突
            const newResolutions: { [key: string]: ConflictResolution } = {};
            conflicts.forEach(conflict => {
                newResolutions[conflict.source] = {
                    ...resolution,
                    applyToAll: false,
                };
            });
            setResolutions(newResolutions);
        } else {
            // 只应用到当前冲突
            setResolutions(prev => ({
                ...prev,
                [currentConflict.source]: resolution,
            }));
        }
    };

    const handleNext = () => {
        if (currentConflictIndex < conflicts.length - 1) {
            setCurrentConflictIndex(prev => prev + 1);
        } else {
            // 所有冲突已处理
            onResolve(resolutions);
        }
    };

    const handleSkip = () => {
        if (currentConflictIndex < conflicts.length - 1) {
            setCurrentConflictIndex(prev => prev + 1);
        } else {
            onResolve(resolutions);
        }
    };

    const formatFileSize = (bytes?: number) => {
        if (!bytes) return "未知大小";
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
        return `${Math.round(bytes / 1024 / 1024)} MB`;
    };

    const formatDate = (timestamp?: number) => {
        if (!timestamp) return "未知时间";
        return new Date(timestamp).toLocaleString();
    };

    if (!currentConflict) {
        return null;
    }

    return (
        <Dialog.Root open={open} onOpenChange={open => !open && onCancel()}>
            <Dialog.Portal>
                <Dialog.Overlay className="cmd-dialog-overlay" />
                <Dialog.Content className="cmd-dialog-content cmd-dialog-content--lg">
                    <div className="cmd-dialog-section--lg">
                        <Dialog.Title className="cmd-dialog-title">
                            文件冲突处理 ({currentConflictIndex + 1}/
                            {conflicts.length})
                        </Dialog.Title>

                        <div className="cmd-dialog-section--lg">
                            <div className="cmd-text-sm cmd-text-muted cmd-dialog-section">
                                源文件: {currentConflict.source}
                            </div>
                            <div className="cmd-text-sm cmd-text-muted cmd-dialog-section--lg">
                                目标文件: {currentConflict.destination}
                            </div>

                            <div className="cmd-dialog-grid">
                                <div className="cmd-dialog-card">
                                    <div className="cmd-text-sm cmd-font-medium cmd-dialog-section">
                                        源文件
                                    </div>
                                    <div className="cmd-text-xs cmd-text-muted">
                                        <div>
                                            大小:{" "}
                                            {formatFileSize(
                                                currentConflict.sourceSize
                                            )}
                                        </div>
                                        <div>
                                            修改时间:{" "}
                                            {formatDate(
                                                currentConflict.sourceModified
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="cmd-dialog-card">
                                    <div className="cmd-text-sm cmd-font-medium cmd-dialog-section">
                                        目标文件
                                    </div>
                                    <div className="cmd-text-xs cmd-text-muted">
                                        <div>
                                            大小:{" "}
                                            {formatFileSize(
                                                currentConflict.destinationSize
                                            )}
                                        </div>
                                        <div>
                                            修改时间:{" "}
                                            {formatDate(
                                                currentConflict.destinationModified
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="cmd-dialog-options">
                            <div className="cmd-dialog-option">
                                <input
                                    type="radio"
                                    id="overwrite"
                                    name="resolution"
                                    className="cmd-radio"
                                    onChange={() =>
                                        handleResolution("overwrite")
                                    }
                                />
                                <label
                                    htmlFor="overwrite"
                                    className="cmd-text-sm"
                                >
                                    覆盖目标文件
                                </label>
                            </div>

                            <div className="cmd-dialog-option">
                                <input
                                    type="radio"
                                    id="skip"
                                    name="resolution"
                                    className="cmd-radio"
                                    onChange={() => handleResolution("skip")}
                                />
                                <label htmlFor="skip" className="cmd-text-sm">
                                    跳过此文件
                                </label>
                            </div>

                            <div className="cmd-dialog-option">
                                <input
                                    type="radio"
                                    id="rename"
                                    name="resolution"
                                    className="cmd-radio"
                                    onChange={() => handleResolution("rename")}
                                />
                                <label htmlFor="rename" className="cmd-text-sm">
                                    重命名源文件
                                </label>
                            </div>

                            <div className="cmd-dialog-option">
                                <input
                                    type="radio"
                                    id="cancel"
                                    name="resolution"
                                    className="cmd-radio"
                                    onChange={() => handleResolution("cancel")}
                                />
                                <label htmlFor="cancel" className="cmd-text-sm">
                                    取消操作
                                </label>
                            </div>
                        </div>

                        <div className="cmd-dialog-checkbox-row">
                            <input
                                type="checkbox"
                                id="applyToAll"
                                className="cmd-check"
                                checked={applyToAll}
                                onChange={e => setApplyToAll(e.target.checked)}
                            />
                            <label htmlFor="applyToAll" className="cmd-text-sm">
                                将此选择应用到所有冲突
                            </label>
                        </div>

                        {resolutions[currentConflict.source]?.action ===
                            "rename" && (
                            <div className="cmd-dialog-section">
                                <label
                                    htmlFor="newFileName"
                                    className="cmd-dialog-input-label"
                                >
                                    新文件名:
                                </label>
                                <input
                                    id="newFileName"
                                    type="text"
                                    className="cmd-dialog-input"
                                    defaultValue={currentConflict.source
                                        .split("/")
                                        .pop()}
                                    onChange={e => {
                                        const newResolution = {
                                            ...resolutions[
                                                currentConflict.source
                                            ],
                                        };
                                        newResolution.newName = e.target.value;
                                        setResolutions(prev => ({
                                            ...prev,
                                            [currentConflict.source]:
                                                newResolution,
                                        }));
                                    }}
                                />
                            </div>
                        )}

                        <div className="cmd-dialog-footer">
                            <button
                                type="button"
                                onClick={onCancel}
                                className="cmd-btn cmd-btn--secondary"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={handleSkip}
                                className="cmd-btn cmd-btn--secondary"
                            >
                                跳过
                            </button>
                            <button
                                type="button"
                                onClick={handleNext}
                                className="cmd-btn cmd-btn--primary"
                            >
                                {currentConflictIndex < conflicts.length - 1
                                    ? "下一个"
                                    : "完成"}
                            </button>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ConflictResolutionModal;
