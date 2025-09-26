import { useCallback } from 'react';
import { useAppSelector } from '../app/hooks';
import { clipboardService } from '../services/clipboardService';

/**
 * Hook for clipboard operations
 */
export const useClipboard = () => {
    // Get clipboard state from Redux
    const clipboardState = useAppSelector((state) => state.clipboard);

    // Copy files to clipboard
    const copy = useCallback((files: string[], sourcePane: 0 | 1) => {
        clipboardService.copy(files, sourcePane);
    }, []);

    // Cut files to clipboard
    const cut = useCallback((files: string[], sourcePane: 0 | 1) => {
        clipboardService.cut(files, sourcePane);
    }, []);

    // Paste clipboard items
    const paste = useCallback(async (targetPath: string, targetPane: 0 | 1) => {
        return clipboardService.paste(targetPath, targetPane);
    }, []);

    // Clear clipboard
    const clear = useCallback(() => {
        clipboardService.clear();
    }, []);

    // Check if paste is possible
    const canPaste = useCallback((targetPath: string) => {
        return clipboardService.canPaste(targetPath);
    }, []);

    // Get clipboard items
    const getItems = useCallback(() => {
        return clipboardService.getItems();
    }, []);

    // Check if clipboard has items
    const hasItems = useCallback(() => {
        return clipboardService.hasItems();
    }, []);

    // Get operation type
    const getOperationType = useCallback(() => {
        return clipboardService.getOperationType();
    }, []);

    // Check if items are from specific pane
    const isFromPane = useCallback((paneIndex: 0 | 1) => {
        return clipboardService.isFromPane(paneIndex);
    }, []);

    // Check if clipboard is stale
    const isStale = useCallback(() => {
        return clipboardService.isStale();
    }, []);

    return {
        // State
        state: clipboardState,
        
        // Actions
        copy,
        cut,
        paste,
        clear,
        
        // Queries
        canPaste,
        getItems,
        hasItems,
        getOperationType,
        isFromPane,
        isStale,
        
        // Computed properties for convenience
        items: clipboardState.items,
        operation: clipboardState.operation,
        sourcePane: clipboardState.sourcePane,
        isEmpty: clipboardState.items.length === 0,
        isCopy: clipboardState.operation === 'copy',
        isCut: clipboardState.operation === 'cut',
    };
};

export type UseClipboardReturn = ReturnType<typeof useClipboard>;