import { clipboardService, ClipboardService } from '../clipboardService';
import store from '../../app/store';
import { clearClipboard } from '../../app/clipboardSlice';

// Mock the window.fsApi
const mockFsApi = {
    copyBatch: jest.fn(),
};

// Mock window.fsApi
Object.defineProperty(window, 'fsApi', {
    value: mockFsApi,
    writable: true,
});

describe('ClipboardService', () => {
    beforeEach(() => {
        // Clear clipboard before each test
        store.dispatch(clearClipboard());
        jest.clearAllMocks();
    });

    describe('copy', () => {
        it('should copy files to clipboard', () => {
            const files = ['/path/to/file1.txt', '/path/to/file2.txt'];
            const sourcePane = 0 as const;

            clipboardService.copy(files, sourcePane);

            const state = clipboardService.getState();
            expect(state.items).toEqual(files);
            expect(state.operation).toBe('copy');
            expect(state.sourcePane).toBe(sourcePane);
            expect(state.timestamp).toBeGreaterThan(0);
        });

        it('should not copy empty file list', () => {
            clipboardService.copy([], 0);

            const state = clipboardService.getState();
            expect(state.items).toEqual([]);
            expect(state.operation).toBeNull();
        });

        it('should overwrite existing clipboard content', () => {
            // First copy
            clipboardService.copy(['/old/file.txt'], 0);
            
            // Second copy should overwrite
            const newFiles = ['/new/file1.txt', '/new/file2.txt'];
            clipboardService.copy(newFiles, 1);

            const state = clipboardService.getState();
            expect(state.items).toEqual(newFiles);
            expect(state.sourcePane).toBe(1);
        });
    });

    describe('cut', () => {
        it('should cut files to clipboard', () => {
            const files = ['/path/to/file1.txt'];
            const sourcePane = 1 as const;

            clipboardService.cut(files, sourcePane);

            const state = clipboardService.getState();
            expect(state.items).toEqual(files);
            expect(state.operation).toBe('cut');
            expect(state.sourcePane).toBe(sourcePane);
            expect(state.timestamp).toBeGreaterThan(0);
        });

        it('should not cut empty file list', () => {
            clipboardService.cut([], 1);

            const state = clipboardService.getState();
            expect(state.items).toEqual([]);
            expect(state.operation).toBeNull();
        });
    });

    describe('paste', () => {
        beforeEach(() => {
            mockFsApi.copyBatch.mockResolvedValue('operation-id');
        });

        it('should paste copied files', async () => {
            const files = ['/source/file.txt'];
            clipboardService.copy(files, 0);

            await clipboardService.paste('/target', 1);

            expect(mockFsApi.copyBatch).toHaveBeenCalledWith(files, '/target');

            // Clipboard should still have items after copy paste
            const state = clipboardService.getState();
            expect(state.items).toEqual(files);
            expect(state.operation).toBe('copy');
        });

        it('should throw error for cut operations (not yet implemented)', async () => {
            const files = ['/source/file.txt'];
            clipboardService.cut(files, 0);

            await expect(clipboardService.paste('/target', 1))
                .rejects.toThrow('Move operations not yet implemented in file system API');
        });

        it('should throw error when clipboard is empty', async () => {
            await expect(clipboardService.paste('/target', 1))
                .rejects.toThrow('Cannot paste: clipboard is empty or target is invalid');
        });

        it('should throw error when target path is invalid', async () => {
            clipboardService.copy(['/file.txt'], 0);

            await expect(clipboardService.paste('', 1))
                .rejects.toThrow('Cannot paste: clipboard is empty or target is invalid');
        });

        it('should propagate file operation errors', async () => {
            const error = new Error('File operation failed');
            mockFsApi.copyBatch.mockRejectedValue(error);

            clipboardService.copy(['/file.txt'], 0);

            await expect(clipboardService.paste('/target', 1))
                .rejects.toThrow('File operation failed');
        });
    });

    describe('clear', () => {
        it('should clear clipboard', () => {
            clipboardService.copy(['/file.txt'], 0);
            
            clipboardService.clear();

            const state = clipboardService.getState();
            expect(state.items).toEqual([]);
            expect(state.operation).toBeNull();
            expect(state.sourcePane).toBeNull();
            expect(state.timestamp).toBe(0);
        });
    });

    describe('canPaste', () => {
        it('should return true for valid paste operation', () => {
            clipboardService.copy(['/source/file.txt'], 0);

            expect(clipboardService.canPaste('/target')).toBe(true);
        });

        it('should return false when clipboard is empty', () => {
            expect(clipboardService.canPaste('/target')).toBe(false);
        });

        it('should return false for invalid target path', () => {
            clipboardService.copy(['/file.txt'], 0);

            expect(clipboardService.canPaste('')).toBe(false);
            expect(clipboardService.canPaste(null as any)).toBe(false);
        });

        it('should return false when cutting to same directory', () => {
            clipboardService.cut(['/source/file.txt'], 0);

            expect(clipboardService.canPaste('/source')).toBe(false);
        });

        it('should return true when cutting to different directory', () => {
            clipboardService.cut(['/source/file.txt'], 0);

            expect(clipboardService.canPaste('/target')).toBe(true);
        });
    });

    describe('utility methods', () => {
        it('should check if clipboard has items', () => {
            expect(clipboardService.hasItems()).toBe(false);

            clipboardService.copy(['/file.txt'], 0);
            expect(clipboardService.hasItems()).toBe(true);

            clipboardService.clear();
            expect(clipboardService.hasItems()).toBe(false);
        });

        it('should get operation type', () => {
            expect(clipboardService.getOperationType()).toBeNull();

            clipboardService.copy(['/file.txt'], 0);
            expect(clipboardService.getOperationType()).toBe('copy');

            clipboardService.cut(['/file.txt'], 1);
            expect(clipboardService.getOperationType()).toBe('cut');
        });

        it('should get clipboard items', () => {
            const files = ['/file1.txt', '/file2.txt'];
            clipboardService.copy(files, 0);

            expect(clipboardService.getItems()).toEqual(files);
        });

        it('should get source pane', () => {
            clipboardService.copy(['/file.txt'], 1);

            expect(clipboardService.getSourcePane()).toBe(1);
        });

        it('should check if items are from specific pane', () => {
            clipboardService.copy(['/file.txt'], 0);

            expect(clipboardService.isFromPane(0)).toBe(true);
            expect(clipboardService.isFromPane(1)).toBe(false);
        });

        it('should calculate clipboard age', () => {
            const beforeTime = Date.now();
            clipboardService.copy(['/file.txt'], 0);
            const afterTime = Date.now();

            const age = clipboardService.getAge();
            expect(age).toBeGreaterThanOrEqual(0);
            expect(age).toBeLessThanOrEqual(afterTime - beforeTime);
        });

        it('should detect stale clipboard', () => {
            // Fresh clipboard should not be stale
            clipboardService.copy(['/file.txt'], 0);
            expect(clipboardService.isStale()).toBe(false);

            // Mock old timestamp (2 hours ago)
            const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
            const state = store.getState().clipboard;
            store.dispatch(clearClipboard());
            store.dispatch({
                type: 'clipboard/copyFiles',
                payload: {
                    files: ['/file.txt'],
                    sourcePane: 0
                }
            });
            
            // Manually set old timestamp for testing
            const newState = { ...state, timestamp: twoHoursAgo };
            jest.spyOn(clipboardService, 'getState').mockReturnValue(newState);
            
            expect(clipboardService.isStale()).toBe(true);
        });
    });

    describe('singleton instance', () => {
        it('should export singleton instance', () => {
            expect(clipboardService).toBeInstanceOf(ClipboardService);
        });

        it('should maintain state across multiple calls', () => {
            clipboardService.copy(['/file.txt'], 0);
            
            // Create new instance and verify it accesses same state
            const newService = new ClipboardService();
            expect(newService.getItems()).toEqual(['/file.txt']);
        });
    });
});