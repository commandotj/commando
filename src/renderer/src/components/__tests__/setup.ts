// Global test setup for FilePane tests
// Mock window.fsApi globally to avoid repetition

// Mock window.fsApi
;(global as unknown as { window: unknown }).window = {
    ...global.window,
    fsApi: {
        listDir: jest.fn().mockResolvedValue([]),
        listDrives: jest.fn().mockResolvedValue([
            {
                device: "/dev/disk1",
                description: "Mock Disk",
                size: 1000000000,
                mountpoints: [{ path: "/" }],
                isSystem: true,
                isRemovable: false,
            },
        ]),
        refreshDrives: jest.fn().mockResolvedValue(undefined),
        getDriveDetails: jest.fn().mockResolvedValue({}),
        onDriveLoading: jest.fn(),
        onDriveListChanged: jest.fn(),
        onDriveRefreshed: jest.fn(),
        onDriveChanged: jest.fn(),
        onServiceLoading: jest.fn(),
        copyBatch: jest.fn().mockResolvedValue("mock-batch-id"),
        copyEntries: jest.fn().mockResolvedValue([]),
        onCopyBatchProgress: jest.fn(),
        onCopyBatchComplete: jest.fn(),
        onCopyBatchError: jest.fn(),
    },
    logApi: {
        log: jest.fn(),
    },
}
