import React from "react";
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
import { useAppSelector } from "../app/hooks";

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
  const clipboard = useClipboard();
  const hasSelection = selectedFiles.length > 0;
  const singleSelection = selectedFiles.length === 1;

  // Get the other pane's current path from Redux
  const otherPaneIndex = currentPane === 0 ? 1 : 0;
  const otherPanePath = useAppSelector(
    (state) => state.fileManager.panes[otherPaneIndex].currentPath,
  );

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
    if (hasSelection && otherPanePath) {
      try {
        await window.fsApi.copyBatch(selectedFiles, otherPanePath);
        // TODO: Refresh the other pane's file list
        console.log(`Copied ${selectedFiles.length} files to ${otherPanePath}`);
      } catch (error) {
        console.error("Copy to other pane failed:", error);
        // TODO: Show error notification
      }
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

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>{children}</ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className="min-w-[220px] bg-white dark:bg-gray-800 rounded-md p-1 shadow-lg border border-gray-200 dark:border-gray-700 z-50">
          {hasSelection && (
            <>
              <ContextMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleCopy}
              >
                <CopyIcon className="w-4 h-4" />
                Copy ({selectedFiles.length} item
                {selectedFiles.length > 1 ? "s" : ""})
              </ContextMenu.Item>

              <ContextMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handleCut}
              >
                <ScissorsIcon className="w-4 h-4" />
                Cut ({selectedFiles.length} item
                {selectedFiles.length > 1 ? "s" : ""})
              </ContextMenu.Item>

              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

              <ContextMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleCopyToOtherPane}
                disabled={!otherPanePath}
              >
                <CopyIcon className="w-4 h-4" />
                <ArrowRightIcon className="w-3 h-3" />
                Copy to Other Pane
              </ContextMenu.Item>

              <ContextMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                onClick={handleMoveToOtherPane}
                disabled={!otherPanePath}
              >
                <ScissorsIcon className="w-4 h-4" />
                <ArrowRightIcon className="w-3 h-3" />
                Move to Other Pane (Not Implemented)
              </ContextMenu.Item>

              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-600 my-1" />
            </>
          )}

          {clipboard.hasItems() && (
            <>
              <ContextMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={handlePaste}
                disabled={!clipboard.canPaste(currentPath)}
              >
                <ClipboardIcon className="w-4 h-4" />
                Paste ({clipboard.operation === "copy" ? "Copy" : "Move"})
              </ContextMenu.Item>

              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-600 my-1" />
            </>
          )}

          <ContextMenu.Item
            className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
            onClick={() => onNewFolder?.()}
          >
            <PlusIcon className="w-4 h-4" />
            New Folder
          </ContextMenu.Item>

          {singleSelection && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

              <ContextMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => onRename?.(selectedFiles[0])}
              >
                <FileIcon className="w-4 h-4" />
                Rename
              </ContextMenu.Item>
            </>
          )}

          {hasSelection && (
            <>
              <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

              <ContextMenu.Item
                className="flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-red-100 dark:hover:bg-red-900/20 cursor-pointer text-red-600 dark:text-red-400"
                onClick={() => onDelete?.(selectedFiles)}
              >
                <TrashIcon className="w-4 h-4" />
                Delete ({selectedFiles.length} item
                {selectedFiles.length > 1 ? "s" : ""})
              </ContextMenu.Item>
            </>
          )}

          <ContextMenu.Separator className="h-px bg-gray-200 dark:bg-gray-600 my-1" />

          <ContextMenu.Item
            className="px-2 py-1.5 text-xs text-gray-500 dark:text-gray-400"
            disabled
          >
            {currentPath}
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
};

export default FileContextMenu;
