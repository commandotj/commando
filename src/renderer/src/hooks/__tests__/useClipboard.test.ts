import { renderHook, act } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import React from 'react';
import { useClipboard } from '../useClipboard';
import clipboardReducer from '../../app/clipboardSlice';
import fileManagerReducer from '../../app/fileManagerSlice';
import fileOperationsReducer from '../../app/fileOperationsSlice';

// Mock the clipboard service
jest.mock('../../services/clipboardService', () => ({
    clipboardService: {
        copy: jest.fn(),
        cut: jest.fn(),
        paste: jest.fn(),
        clear: jest.fn(),
        canPaste: jest.fn(),
        getItems: jest.fn(),
        hasItems: jest.fn(),
        getOperationType: jest.fn(),
        isFromPane: jest.fn(),
        isStale: jest.fn(),
    },
}));

// Mock window.fsApi
const mockFsApi = {
    copyBatch: jest.fn(),
};

Object.defineProperty(window, 'fsApi', {
    value: mockFsApi,
    writable: true,
});

const createTestStore = (initialState = {}) => {
    return configureStore({
        reducer: {
            fileManager: fileManagerReducer,
            clipboard: clipboardReducer,
            fileOperations: fileOperationsReducer,
        },
        preloadedState: {
            clipboard: {
                items: [],
                operation: null,
                sourcePane: null,
                timestamp: 0,
            },
            fileManager: {
                panes: [
                    { currentPath: '', entries: [], selectedKeys: [] },
                    { currentPath: '', entries: [], selectedKeys: [] },
                ],
                activePane: 0,
            },
            fileOperations: {
                activeOperations: {},
                batchOperations: {},
                operationHistory: [],
            },
            ...initialState,
        },
    });
};

const renderUseClipboard = (initialState = {}) => {
    const store = createTestStore(initialState);
    const wrapper = ({ children }: { children: React.ReactNode }) => 
        React.createElement(Provider, { store, children });
    
    return renderHook(() => useClipboard(), { wrapper });
};

describe('useClipboard', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should return initial empty state', () => {
        const { result } = renderUseClipboard();

        expect(result.current.state).toEqual({
            items: [],
            operation: null,
            sourcePane: null,
            timestamp: 0,
        });
        expect(result.current.isEmpty).toBe(true);
        expect(result.current.isCopy).toBe(false);
        expect(result.current.isCut).toBe(false);
    });

    it('should return clipboard state with items', () => {
        const clipboardState = {
            items: ['/file1.txt', '/file2.txt'],
            operation: 'copy' as const,
            sourcePane: 0 as const,
            timestamp: Date.now(),
        };

        const { result } = renderUseClipboard({
            clipboard: clipboardState,
        });

        expect(result.current.state).toEqual(clipboardState);
        expect(result.current.items).toEqual(['/file1.txt', '/file2.txt']);
        expect(result.current.operation).toBe('copy');
        expect(result.current.sourcePane).toBe(0);
        expect(result.current.isEmpty).toBe(false);
        expect(result.current.isCopy).toBe(true);
        expect(result.current.isCut).toBe(false);
    });

    it('should return cut operation state', () => {
        const clipboardState = {
            items: ['/file.txt'],
            operation: 'cut' as const,
            sourcePane: 1 as const,
            timestamp: Date.now(),
        };

        const { result } = renderUseClipboard({
            clipboard: clipboardState,
        });

        expect(result.current.isCopy).toBe(false);
        expect(result.current.isCut).toBe(true);
    });

    it('should call clipboard service methods', () => {
        const { clipboardService } = require('../../services/clipboardService');
        const { result } = renderUseClipboard();

        // Test copy
        act(() => {
            result.current.copy(['/file.txt'], 0);
        });
        expect(clipboardService.copy).toHaveBeenCalledWith(['/file.txt'], 0);

        // Test cut
        act(() => {
            result.current.cut(['/file.txt'], 1);
        });
        expect(clipboardService.cut).toHaveBeenCalledWith(['/file.txt'], 1);

        // Test clear
        act(() => {
            result.current.clear();
        });
        expect(clipboardService.clear).toHaveBeenCalled();

        // Test canPaste
        result.current.canPaste('/target');
        expect(clipboardService.canPaste).toHaveBeenCalledWith('/target');

        // Test getItems
        result.current.getItems();
        expect(clipboardService.getItems).toHaveBeenCalled();

        // Test hasItems
        result.current.hasItems();
        expect(clipboardService.hasItems).toHaveBeenCalled();

        // Test getOperationType
        result.current.getOperationType();
        expect(clipboardService.getOperationType).toHaveBeenCalled();

        // Test isFromPane
        result.current.isFromPane(0);
        expect(clipboardService.isFromPane).toHaveBeenCalledWith(0);

        // Test isStale
        result.current.isStale();
        expect(clipboardService.isStale).toHaveBeenCalled();
    });

    it('should handle async paste operation', async () => {
        const { clipboardService } = require('../../services/clipboardService');
        clipboardService.paste.mockResolvedValue(undefined);

        const { result } = renderUseClipboard();

        await act(async () => {
            await result.current.paste('/target', 1);
        });

        expect(clipboardService.paste).toHaveBeenCalledWith('/target', 1);
    });

    it('should handle paste errors', async () => {
        const { clipboardService } = require('../../services/clipboardService');
        const error = new Error('Paste failed');
        clipboardService.paste.mockRejectedValue(error);

        const { result } = renderUseClipboard();

        await expect(
            act(async () => {
                await result.current.paste('/target', 1);
            })
        ).rejects.toThrow('Paste failed');
    });

    it('should memoize callback functions', () => {
        const { result, rerender } = renderUseClipboard();

        const firstRenderCallbacks = {
            copy: result.current.copy,
            cut: result.current.cut,
            paste: result.current.paste,
            clear: result.current.clear,
            canPaste: result.current.canPaste,
        };

        rerender();

        expect(result.current.copy).toBe(firstRenderCallbacks.copy);
        expect(result.current.cut).toBe(firstRenderCallbacks.cut);
        expect(result.current.paste).toBe(firstRenderCallbacks.paste);
        expect(result.current.clear).toBe(firstRenderCallbacks.clear);
        expect(result.current.canPaste).toBe(firstRenderCallbacks.canPaste);
    });
});