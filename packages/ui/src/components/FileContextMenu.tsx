import React, { useState } from "react";
import * as ContextMenu from "@radix-ui/react-context-menu";
import {
    CopyIcon,
    ScissorsIcon,
    ClipboardIcon,
    TrashIcon,
    FileIcon,
    PlusIcon,
    ArrowRightIcon,
} from "@radix-ui/react-icons";
import { useClipboard } from "../hooks/useClipboard";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchDirectory } from "../app/fileManagerSlice";
import BatchCopyProgressModal from "./BatchCopyProgressModal";

interface FileContextMenuProps {
    children: React.ReactNode;
    selectedFiles: string[];
    currentPath: string;
    currentPane: 0 | 1;
    onDelete?: (files: string[]) => void;
    onRename?: (file: string) => void;
    onNewFolder?: () => void;
}

const FileContextMenu: React.FC<FileContextMenuProps> = ({
    children,
    selectedFiles,
    currentPath,
    currentPane,
    onDelete,
    onRename,
    onNewFolder,
}) => {
    const dispatch = useAppDispatch();
    const clipboard = useClipboard();
    const hasSelection = selectedFiles.length > 0;
    const singleSelection = selectedFiles.length === 1;

    // Get the other pane's current path from Redux
    const otherPaneIndex = currentPane === 0 ? 1 : 0;
    const otherPanePath = useAppSelector(
        state => state.fileManager.panes[otherPaneIndex].currentPath
    );
    const [batchModal, setBatchModal] = useState<{
        srcs: string[];
        dest: string;
        taskId: string | null;
    } | null>(null);

    const handleCopy = (): void => {
        if (hasSelection) {
            clipboard.copy(selectedFiles, currentPane);
        }
    };

    const handleCut = (): void => {
        if (hasSelection) {
            clipboard.cut(selectedFiles, currentPane);
        }
    };

    const handlePaste = async (): Promise<void> => {
        if (clipboard.canPaste(currentPath)) {
            try {
                await clipboard.paste(currentPath, currentPane);
                // TODO: Refresh the file list after paste
            } catch (error) {
                console.error("Paste failed:", error);
                // TODO: Show error notification
            }
        }
    };

    const handleCopyToOtherPane = async (): Promise<void> => {
        if (!hasSelection || !otherPanePath) {
            return;
        }

        const sources = [...selectedFiles];
        setBatchModal({
            srcs: sources,
            dest: otherPanePath,
            taskId: null,
        });

        try {
            const taskId = await window.fsApi.copyBatch(sources, otherPanePath);
            setBatchModal(prev => (prev ? { ...prev, taskId } : prev));
        } catch (error) {
            console.error("Copy to other pane failed:", error);
            setBatchModal(null);
            window.alert(
                `Copy failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    };

    const handleMoveToOtherPane = async (): Promise<void> => {
        if (hasSelection) {
            try {
                // TODO: Implement move operation when available in API
                console.log("Move to other pane not yet implemented");
                // TODO: Show not implemented notification
            } catch (error) {
                console.error("Move to other pane failed:", error);
                // TODO: Show error notification
            }
        }
    };

    const handleBatchModalClose = (): void => {
        setBatchModal(null);
        if (otherPanePath) {
            dispatch(
                fetchDirectory({
                    paneIndex: otherPaneIndex,
                    path: otherPanePath,
                })
            );
        }
    };

    return (
        <>
            {batchModal && (
                <BatchCopyProgressModal
                    open={Boolean(batchModal)}
                    srcs={batchModal.srcs}
                    dest={batchModal.dest}
                    taskId={batchModal.taskId ?? undefined}
                    onClose={handleBatchModalClose}
                />
            )}

            <ContextMenu.Root>
                <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

                <ContextMenu.Portal>
                    <ContextMenu.Content className="cmd-context-menu">
                        {hasSelection && (
                            <>
                                <ContextMenu.Item
                                    className="cmd-context-menu__item"
                                    onClick={handleCopy}
                                >
                                    <CopyIcon className="cmd-icon" />
                                    Copy ({selectedFiles.length} item
                                    {selectedFiles.length > 1 ? "s" : ""})
                                </ContextMenu.Item>

                                <ContextMenu.Item
                                    className="cmd-context-menu__item"
                                    onClick={handleCut}
                                >
                                    <ScissorsIcon className="cmd-icon" />
                                    Cut ({selectedFiles.length} item
                                    {selectedFiles.length > 1 ? "s" : ""})
                                </ContextMenu.Item>

                                <ContextMenu.Separator className="cmd-context-menu__separator" />

                                <ContextMenu.Item
                                    className="cmd-context-menu__item"
                                    onClick={handleCopyToOtherPane}
                                    disabled={!otherPanePath}
                                >
                                    <CopyIcon className="cmd-icon" />
                                    <ArrowRightIcon className="cmd-icon cmd-icon--sm" />
                                    Copy to Other Pane
                                </ContextMenu.Item>

                                <ContextMenu.Item
                                    className="cmd-context-menu__item"
                                    onClick={handleMoveToOtherPane}
                                    disabled={!otherPanePath}
                                >
                                    <ScissorsIcon className="cmd-icon" />
                                    <ArrowRightIcon className="cmd-icon cmd-icon--sm" />
                                    Move to Other Pane (Not Implemented)
                                </ContextMenu.Item>

                                <ContextMenu.Separator className="cmd-context-menu__separator" />
                            </>
                        )}

                        {clipboard.hasItems() && (
                            <>
                                <ContextMenu.Item
                                    className="cmd-context-menu__item"
                                    onClick={handlePaste}
                                    disabled={!clipboard.canPaste(currentPath)}
                                >
                                    <ClipboardIcon className="cmd-icon" />
                                    Paste (
                                    {clipboard.operation === "copy"
                                        ? "Copy"
                                        : "Move"}
                                    )
                                </ContextMenu.Item>

                                <ContextMenu.Separator className="cmd-context-menu__separator" />
                            </>
                        )}

                        <ContextMenu.Item
                            className="cmd-context-menu__item"
                            onClick={() => onNewFolder?.()}
                        >
                            <PlusIcon className="cmd-icon" />
                            New Folder
                        </ContextMenu.Item>

                        {singleSelection && (
                            <>
                                <ContextMenu.Separator className="cmd-context-menu__separator" />

                                <ContextMenu.Item
                                    className="cmd-context-menu__item"
                                    onClick={() => onRename?.(selectedFiles[0])}
                                >
                                    <FileIcon className="cmd-icon" />
                                    Rename
                                </ContextMenu.Item>
                            </>
                        )}

                        {hasSelection && (
                            <>
                                <ContextMenu.Separator className="cmd-context-menu__separator" />

                                <ContextMenu.Item
                                    className="cmd-context-menu__item cmd-context-menu__item--danger"
                                    onClick={() => onDelete?.(selectedFiles)}
                                >
                                    <TrashIcon className="cmd-icon" />
                                    Delete ({selectedFiles.length} item
                                    {selectedFiles.length > 1 ? "s" : ""})
                                </ContextMenu.Item>
                            </>
                        )}

                        <ContextMenu.Separator className="cmd-context-menu__separator" />

                        <ContextMenu.Item
                            className="cmd-context-menu__path"
                            disabled
                        >
                            {currentPath}
                        </ContextMenu.Item>
                    </ContextMenu.Content>
                </ContextMenu.Portal>
            </ContextMenu.Root>
        </>
    );
};

export default FileContextMenu;
