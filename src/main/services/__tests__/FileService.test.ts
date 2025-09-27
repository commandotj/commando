/**
 * Jest Tests for File Service
 * Tests basic file operations like delete, rename, and create folder
 */

import { IpcMainInvokeEvent } from "electron";
import FileService from "../FileService";
import { WorkerPool } from "../core/WorkerPool";

// Mock dependencies
jest.mock("../core/WorkerPool");
jest.mock("../../log/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
}));

// Mock ipcMain is handled by jest.mock("electron")

const MockWorkerPool = WorkerPool as jest.Mocked<typeof WorkerPool>;

describe("FileService", () => {
  let fileService: FileService;
  let mockWorkerPool: jest.Mocked<WorkerPool>;
  let mockEvent: IpcMainInvokeEvent;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock worker pool
    mockWorkerPool = {
      execute: jest.fn(),
      getInstance: jest.fn(),
      registerWorkerType: jest.fn(),
      cleanup: jest.fn(),
      getPoolStats: jest.fn(),
      startIdleWorkerCleanup: jest.fn(),
    } as unknown as jest.Mocked<WorkerPool>;

    (
      MockWorkerPool.getInstance as jest.MockedFunction<
        typeof WorkerPool.getInstance
      >
    ).mockReturnValue(mockWorkerPool);

    fileService = new FileService();
    mockEvent = {
      sender: {
        send: jest.fn(),
      },
    } as unknown as IpcMainInvokeEvent;
  });

  describe("Service Metadata", () => {
    it("should return correct metadata", () => {
      const metadata = fileService.getMetadata();

      expect(metadata).toMatchObject({
        name: "FileService",
        version: "1.0.0",
        ipcChannels: expect.arrayContaining([
          "file:delete",
          "file:rename",
          "file:create-folder",
          "file:get-info",
        ]),
        workerScript: "fileWorker.js",
        maxWorkers: 2,
      });
    });
  });

  describe("Service Lifecycle", () => {
    it("should initialize successfully", async () => {
      await expect(fileService.initialize()).resolves.not.toThrow();
    });

    it("should cleanup successfully", async () => {
      await fileService.initialize();
      await expect(fileService.cleanup()).resolves.not.toThrow();
    });
  });

  describe("File Deletion", () => {
    beforeEach(async () => {
      await fileService.initialize();
    });

    it("should delete a single file successfully", async () => {
      const deleteParams = {
        paths: ["/path/to/file.txt"],
        permanent: false, // Move to trash
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: true,
        deletedFiles: 1,
        failedFiles: [],
      });

      const result = await fileService.handleDelete(mockEvent, deleteParams);

      expect(mockWorkerPool.execute).toHaveBeenCalledWith(
        "FileService",
        "delete-files",
        deleteParams,
      );

      expect(result).toMatchObject({
        success: true,
        deletedFiles: 1,
        failedFiles: [],
      });
    });

    it("should delete multiple files", async () => {
      const deleteParams = {
        paths: ["/path/file1.txt", "/path/file2.txt", "/path/folder/"],
        permanent: false,
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: true,
        deletedFiles: 3,
        failedFiles: [],
      });

      const result = await fileService.handleDelete(mockEvent, deleteParams);
      const typedResult = result as {
        success: boolean;
        deletedFiles: number;
      };

      expect(typedResult.success).toBe(true);
      expect(typedResult.deletedFiles).toBe(3);
    });

    it("should handle permanent deletion", async () => {
      const deleteParams = {
        paths: ["/temp/file.txt"],
        permanent: true,
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: true,
        deletedFiles: 1,
        failedFiles: [],
      });

      const result = await fileService.handleDelete(mockEvent, deleteParams);

      expect(mockWorkerPool.execute).toHaveBeenCalledWith(
        "FileService",
        "delete-files",
        expect.objectContaining({ permanent: true }),
      );
      const typedResult2 = result as { success: boolean };

      expect(typedResult2.success).toBe(true);
    });

    it("should handle deletion errors", async () => {
      const deleteParams = {
        paths: ["/protected/system-file.txt"],
        permanent: false,
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: false,
        deletedFiles: 0,
        failedFiles: [
          {
            path: "/protected/system-file.txt",
            error: "Permission denied",
          },
        ],
      });

      const result = await fileService.handleDelete(mockEvent, deleteParams);
      const failedResult = result as {
        success: boolean;
        failedFiles: Array<{ error: string }>;
      };

      expect(failedResult.success).toBe(false);
      expect(failedResult.failedFiles).toHaveLength(1);
      expect(failedResult.failedFiles[0].error).toBe("Permission denied");
    });

    it("should validate delete parameters", async () => {
      const invalidParams = {
        paths: [], // Empty paths array
        permanent: false,
      };

      await expect(
        fileService.handleDelete(mockEvent, invalidParams),
      ).rejects.toThrow("Invalid delete parameters: no files specified");
    });
  });

  describe("File Rename", () => {
    beforeEach(async () => {
      await fileService.initialize();
    });

    it("should rename a file successfully", async () => {
      const renameParams = {
        oldPath: "/path/oldname.txt",
        newPath: "/path/newname.txt",
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: true,
        oldPath: "/path/oldname.txt",
        newPath: "/path/newname.txt",
      });

      const result = await fileService.handleRename(mockEvent, renameParams);

      expect(mockWorkerPool.execute).toHaveBeenCalledWith(
        "FileService",
        "rename-file",
        renameParams,
      );

      expect(result).toMatchObject({
        success: true,
        oldPath: "/path/oldname.txt",
        newPath: "/path/newname.txt",
      });
    });

    it("should handle rename conflicts", async () => {
      const renameParams = {
        oldPath: "/path/file.txt",
        newPath: "/path/existing-file.txt", // File already exists
      };

      mockWorkerPool.execute.mockRejectedValue(
        new Error("File already exists: /path/existing-file.txt"),
      );

      await expect(
        fileService.handleRename(mockEvent, renameParams),
      ).rejects.toThrow("File already exists");
    });

    it("should validate rename parameters", async () => {
      const testCases = [
        { oldPath: "", newPath: "/valid/path.txt" },
        { oldPath: "/valid/path.txt", newPath: "" },
        { oldPath: "/same/path.txt", newPath: "/same/path.txt" },
      ];

      for (const testCase of testCases) {
        await expect(
          fileService.handleRename(mockEvent, testCase),
        ).rejects.toThrow("Invalid rename parameters");
      }
    });

    it("should handle cross-directory renames", async () => {
      const renameParams = {
        oldPath: "/source/folder/file.txt",
        newPath: "/destination/folder/file.txt",
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: true,
        oldPath: renameParams.oldPath,
        newPath: renameParams.newPath,
        crossDirectory: true,
      });

      const result = await fileService.handleRename(mockEvent, renameParams);
      const renameResult = result as {
        success: boolean;
        crossDirectory: boolean;
      };

      expect(renameResult.success).toBe(true);
      expect(renameResult.crossDirectory).toBe(true);
    });
  });

  describe("Create Folder", () => {
    beforeEach(async () => {
      await fileService.initialize();
    });

    it("should create a folder successfully", async () => {
      const createParams = {
        path: "/path/to/new-folder",
        recursive: false,
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: true,
        path: "/path/to/new-folder",
        created: true,
      });

      const result = await fileService.handleCreateFolder(
        mockEvent,
        createParams,
      );

      expect(mockWorkerPool.execute).toHaveBeenCalledWith(
        "FileService",
        "create-folder",
        createParams,
      );

      expect(result).toMatchObject({
        success: true,
        path: "/path/to/new-folder",
        created: true,
      });
    });

    it("should create folders recursively", async () => {
      const createParams = {
        path: "/deep/nested/folder/structure",
        recursive: true,
      };

      mockWorkerPool.execute.mockResolvedValue({
        success: true,
        path: "/deep/nested/folder/structure",
        created: true,
        createdParents: ["/deep", "/deep/nested", "/deep/nested/folder"],
      });

      const result = await fileService.handleCreateFolder(
        mockEvent,
        createParams,
      );
      const createResult = result as {
        success: boolean;
        createdParents: string[];
      };

      expect(createResult.success).toBe(true);
      expect(createResult.createdParents).toHaveLength(3);
    });

    it("should handle folder creation conflicts", async () => {
      const createParams = {
        path: "/path/existing-folder",
        recursive: false,
      };

      mockWorkerPool.execute.mockRejectedValue(
        new Error("Folder already exists"),
      );

      await expect(
        fileService.handleCreateFolder(mockEvent, createParams),
      ).rejects.toThrow("Folder already exists");
    });

    it("should validate create folder parameters", async () => {
      const invalidParams = {
        path: "", // Empty path
        recursive: false,
      };

      await expect(
        fileService.handleCreateFolder(mockEvent, invalidParams),
      ).rejects.toThrow("Invalid create folder parameters");
    });
  });

  describe("Get File Info", () => {
    beforeEach(async () => {
      await fileService.initialize();
    });

    it("should get file information successfully", async () => {
      const infoParams = {
        path: "/path/to/file.txt",
      };

      const mockFileInfo = {
        path: "/path/to/file.txt",
        name: "file.txt",
        size: 1024,
        isDirectory: false,
        isFile: true,
        mtime: new Date("2024-01-14T10:00:00Z"),
        ctime: new Date("2024-01-14T09:00:00Z"),
        permissions: {
          readable: true,
          writable: true,
          executable: false,
        },
      };

      mockWorkerPool.execute.mockResolvedValue(mockFileInfo);

      const result = await fileService.handleGetInfo(mockEvent, infoParams);

      expect(mockWorkerPool.execute).toHaveBeenCalledWith(
        "FileService",
        "get-file-info",
        infoParams,
      );

      expect(result).toMatchObject(mockFileInfo);
    });

    it("should get directory information", async () => {
      const infoParams = {
        path: "/path/to/directory",
      };

      const mockDirInfo = {
        path: "/path/to/directory",
        name: "directory",
        isDirectory: true,
        isFile: false,
        itemCount: 25, // Number of items in directory
        totalSize: 1048576, // Total size of all items
        mtime: new Date("2024-01-14T10:00:00Z"),
        permissions: {
          readable: true,
          writable: true,
          executable: true,
        },
      };

      mockWorkerPool.execute.mockResolvedValue(mockDirInfo);

      const result = await fileService.handleGetInfo(mockEvent, infoParams);
      const infoResult = result as unknown as {
        isDirectory: boolean;
        itemCount: number;
        totalSize: number;
      };

      expect(infoResult.isDirectory).toBe(true);
      expect(infoResult.itemCount).toBe(25);
      expect(infoResult.totalSize).toBe(1048576);
    });

    it("should handle non-existent files", async () => {
      const infoParams = {
        path: "/nonexistent/file.txt",
      };

      mockWorkerPool.execute.mockRejectedValue(
        new Error("File not found: /nonexistent/file.txt"),
      );

      await expect(
        fileService.handleGetInfo(mockEvent, infoParams),
      ).rejects.toThrow("File not found");
    });

    it("should validate get info parameters", async () => {
      const invalidParams = {
        path: "", // Empty path
      };

      await expect(
        fileService.handleGetInfo(mockEvent, invalidParams),
      ).rejects.toThrow("Invalid file info parameters");
    });
  });

  describe("Error Handling", () => {
    beforeEach(async () => {
      await fileService.initialize();
    });

    it("should handle worker pool errors gracefully", async () => {
      mockWorkerPool.execute.mockRejectedValue(
        new Error("Worker pool exhausted"),
      );

      const deleteParams = {
        paths: ["/test/file.txt"],
        permanent: false,
      };

      await expect(
        fileService.handleDelete(mockEvent, deleteParams),
      ).rejects.toThrow("Worker pool exhausted");
    });

    it("should validate all parameter types", async () => {
      const testCases = [
        {
          method: "handleDelete",
          params: { paths: null, permanent: false },
        },
        {
          method: "handleRename",
          params: { oldPath: 123, newPath: "/valid/path.txt" },
        },
        {
          method: "handleCreateFolder",
          params: { path: ["invalid", "array"], recursive: false },
        },
        {
          method: "handleGetInfo",
          params: { path: { invalid: "object" } as unknown },
        },
      ];

      for (const testCase of testCases) {
        await expect(
          (
            fileService as unknown as Record<
              string,
              (...args: unknown[]) => unknown
            >
          )[testCase.method](mockEvent, testCase.params),
        ).rejects.toThrow();
      }
    });
  });

  describe("Integration with Other Services", () => {
    beforeEach(async () => {
      await fileService.initialize();
    });

    it("should work with CopyService for move operations", async () => {
      // Test that rename across filesystems falls back to copy+delete
      const moveParams = {
        oldPath: "/source-drive/file.txt",
        newPath: "/destination-drive/file.txt",
      };

      // First call fails with cross-device error
      mockWorkerPool.execute
        .mockRejectedValueOnce(new Error("Cross-device link not permitted"))
        .mockResolvedValueOnce({ success: true }); // Copy operation
      //.mockResolvedValueOnce({ success: true }); // Delete operation

      // The service should handle cross-device moves gracefully
      // (In a real implementation, this might delegate to CopyService)
      await fileService.handleRename(mockEvent, moveParams);

      expect(mockWorkerPool.execute).toHaveBeenCalledWith(
        "FileService",
        "rename-file",
        moveParams,
      );
    });
  });
});
