import store from "../app/store";
import {
    copyFiles,
    cutFiles,
    clearClipboard,
    pasteCompleted,
    ClipboardState,
} from "../app/clipboardSlice";
import { startOperation, FileOperationType } from "../app/fileOperationsSlice";

export class ClipboardService {
    /**
     * Copy files to clipboard
     */
    copy(files: string[], sourcePane: 0 | 1): void {
        if (files.length === 0) {
            return;
        }

        store.dispatch(copyFiles({ files, sourcePane }));
    }

    /**
     * Cut files to clipboard (mark for moving)
     */
    cut(files: string[], sourcePane: 0 | 1): void {
        if (files.length === 0) {
            return;
        }

        store.dispatch(cutFiles({ files, sourcePane }));
    }

    /**
     * Paste clipboard items to target location
     */
    async paste(targetPath: string, targetPane: 0 | 1): Promise<void> {
        const state = this.getState();

        if (!this.canPaste(targetPath)) {
            throw new Error(
                "Cannot paste: clipboard is empty or target is invalid"
            );
        }

        const operationType: FileOperationType =
            state.operation === "cut" ? "move" : "copy";
        const operationId = `${operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // Start the file operation
        store.dispatch(
            startOperation({
                id: operationId,
                type: operationType,
                source: state.items,
                destination: targetPath,
                sourcePane: state.sourcePane!,
                targetPane: targetPane,
            })
        );

        try {
            // Call the appropriate file operation API
            if (operationType === "copy") {
                await window.fsApi.copyBatch(state.items, targetPath);
            } else {
                // For move operations, we'll need to implement this later
                // For now, throw an error to indicate it's not implemented
                throw new Error(
                    "Move operations not yet implemented in file system API"
                );
            }

            // Mark paste as completed (this will clear clipboard for cut operations)
            store.dispatch(pasteCompleted());
        } catch (error) {
            // Re-throw the error to be handled by the caller with additional context
            throw new Error(
                `Paste operation failed: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    }

    /**
     * Clear the clipboard
     */
    clear(): void {
        store.dispatch(clearClipboard());
    }

    /**
     * Get current clipboard state
     */
    getState(): ClipboardState {
        return store.getState().clipboard;
    }

    /**
     * Check if paste operation is possible
     */
    canPaste(targetPath: string): boolean {
        const state = this.getState();

        // Must have items in clipboard
        if (state.items.length === 0 || !state.operation) {
            return false;
        }

        // Target path must be valid
        if (!targetPath || typeof targetPath !== "string") {
            return false;
        }

        // Cannot paste to the same location for cut operations
        if (state.operation === "cut") {
            // Check if any source file is in the same directory as target
            const targetDir = targetPath;
            const hasConflict = state.items.some(item => {
                const itemDir = item.substring(0, item.lastIndexOf("/")) || "/";
                return itemDir === targetDir;
            });

            if (hasConflict) {
                return false;
            }
        }

        return true;
    }

    /**
     * Check if clipboard has items
     */
    hasItems(): boolean {
        const state = this.getState();
        return state.items.length > 0 && state.operation !== null;
    }

    /**
     * Get clipboard operation type
     */
    getOperationType(): "copy" | "cut" | null {
        return this.getState().operation;
    }

    /**
     * Get clipboard items
     */
    getItems(): string[] {
        return this.getState().items;
    }

    /**
     * Get source pane of clipboard items
     */
    getSourcePane(): 0 | 1 | null {
        return this.getState().sourcePane;
    }

    /**
     * Check if clipboard items are from a specific pane
     */
    isFromPane(paneIndex: 0 | 1): boolean {
        return this.getState().sourcePane === paneIndex;
    }

    /**
     * Get clipboard age in milliseconds
     */
    getAge(): number {
        const state = this.getState();
        if (state.timestamp === 0) {
            return 0;
        }
        return Date.now() - state.timestamp;
    }

    /**
     * Check if clipboard is stale (older than 1 hour)
     */
    isStale(): boolean {
        const maxAge = 60 * 60 * 1000; // 1 hour in milliseconds
        return this.getAge() > maxAge;
    }
}

// Export singleton instance
export const clipboardService = new ClipboardService();
