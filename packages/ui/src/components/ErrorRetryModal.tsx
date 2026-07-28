import React, { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";

interface ErrorRetryModalProps {
    open: boolean;
    error: string;
    fileName: string;
    onRetry: () => void;
    onSkip: () => void;
    onCancel: () => void;
    retryCount: number;
    maxRetries: number;
}

const ErrorRetryModal: React.FC<ErrorRetryModalProps> = ({
    open,
    error,
    fileName,
    onRetry,
    onSkip,
    onCancel,
    retryCount,
    maxRetries,
}) => {
    const [applyToAll, setApplyToAll] = useState(false);

    const canRetry = retryCount < maxRetries;

    return (
        <Dialog.Root open={open} onOpenChange={open => !open && onCancel()}>
            <Dialog.Portal>
                <Dialog.Overlay className="cmd-dialog-overlay" />
                <Dialog.Content className="cmd-dialog-content cmd-dialog-content--sm">
                    <Dialog.Title className="cmd-dialog-title">
                        操作失败
                    </Dialog.Title>

                    <div className="cmd-dialog-section">
                        <div className="cmd-text-sm cmd-text-muted cmd-dialog-section">
                            文件: {fileName}
                        </div>
                        <div className="cmd-text-sm cmd-text-danger cmd-dialog-section">
                            错误: {error}
                        </div>
                        <div className="cmd-text-xs cmd-text-muted">
                            重试次数: {retryCount}/{maxRetries}
                        </div>
                    </div>

                    <div className="cmd-dialog-options">
                        {canRetry && (
                            <div className="cmd-dialog-option">
                                <input
                                    type="radio"
                                    id="retry"
                                    name="action"
                                    className="cmd-radio"
                                    defaultChecked
                                />
                                <label htmlFor="retry" className="cmd-text-sm">
                                    重试操作
                                </label>
                            </div>
                        )}

                        <div className="cmd-dialog-option">
                            <input
                                type="radio"
                                id="skip"
                                name="action"
                                className="cmd-radio"
                            />
                            <label htmlFor="skip" className="cmd-text-sm">
                                跳过此文件
                            </label>
                        </div>

                        <div className="cmd-dialog-option">
                            <input
                                type="radio"
                                id="cancel"
                                name="action"
                                className="cmd-radio"
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
                            将此选择应用到所有错误
                        </label>
                    </div>

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
                            onClick={() => {
                                const action = document.querySelector(
                                    'input[name="action"]:checked'
                                ) as HTMLInputElement;
                                if (action?.id === "retry") {
                                    onRetry();
                                } else if (action?.id === "skip") {
                                    onSkip();
                                } else if (action?.id === "cancel") {
                                    onCancel();
                                }
                            }}
                            className="cmd-btn cmd-btn--primary"
                        >
                            {canRetry ? "重试" : "跳过"}
                        </button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

export default ErrorRetryModal;
