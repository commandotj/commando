/**
 * File Worker Implementation (TypeScript)
 * Handles basic file operations in background thread
 * Uses Vite worker syntax with proper module imports
 */

import { parentPort } from "node:worker_threads";
// import { promises as fs } from 'node:fs'; // TODO: implement file operations
import path from "node:path";

interface WorkerMessage {
  id: string;
  type: "request" | "response" | "progress" | "error";
  operation: string;
  payload?: unknown;
  timestamp: number;
}

interface WorkerRequest extends WorkerMessage {
  type: "request";
  payload: unknown;
}

interface DeleteParams {
  paths: string[];
  permanent: boolean;
}

interface RenameParams {
  oldPath: string;
  newPath: string;
}

interface CreateFolderParams {
  path: string;
  recursive: boolean;
}

interface GetInfoParams {
  path: string;
}

// Handle messages from main thread
parentPort?.on("message", async (message: WorkerRequest) => {
  const { id, type, operation, payload } = message;

  if (type !== "request") {
    return;
  }

  try {
    let result: unknown;

    switch (operation) {
      case "delete-files":
        result = await deleteFiles(payload as DeleteParams);
        break;

      case "rename-file":
        result = await renameFile(payload as RenameParams);
        break;

      case "create-folder":
        result = await createFolder(payload as CreateFolderParams);
        break;

      case "get-file-info":
        result = await getFileInfo(payload as GetInfoParams);
        break;

      default:
        throw new Error(`Unknown operation: ${operation}`);
    }

    parentPort?.postMessage({
      id,
      type: "response",
      operation,
      result,
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    parentPort?.postMessage({
      id,
      type: "error",
      operation,
      error: error.message,
      timestamp: Date.now(),
    });
  }
});

async function deleteFiles({
  paths,
  permanent,
}: DeleteParams): Promise<unknown> {
  let deletedFiles = 0;
  const failedFiles: { path: string; error: string }[] = [];

  for (const filePath of paths) {
    try {
      // Mock implementation - in real implementation would use trash or fs.unlink
      if (permanent) {
        // await fs.unlink(filePath); // For files
        // await fs.rmdir(filePath, { recursive: true }); // For directories
      } else {
        // Move to trash using electron's shell.trashItem or platform-specific trash library
      }

      await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay
      deletedFiles++;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      failedFiles.push({
        path: filePath,
        error: error.message,
      });
    }
  }

  return {
    success: failedFiles.length === 0,
    deletedFiles,
    failedFiles,
  };
}

async function renameFile({
  oldPath,
  newPath,
}: RenameParams): Promise<unknown> {
  try {
    // Mock implementation - in real implementation would use fs.rename
    // await fs.rename(oldPath, newPath);

    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay

    // Check if this is a cross-directory move
    const crossDirectory = path.dirname(oldPath) !== path.dirname(newPath);

    return {
      success: true,
      oldPath,
      newPath,
      crossDirectory,
    };
  } catch (error: unknown) {
    throw new Error(`Rename failed: ${error.message}`);
  }
}

async function createFolder({
  path: folderPath,
  recursive,
}: CreateFolderParams): Promise<unknown> {
  try {
    // Mock implementation - in real implementation would use fs.mkdir
    // await fs.mkdir(folderPath, { recursive });

    await new Promise((resolve) => setTimeout(resolve, 50)); // Simulate delay

    const createdParents: string[] = [];
    if (recursive) {
      // Mock parent creation tracking
      const parts = folderPath.split(path.sep).filter(Boolean);
      for (let i = 1; i < parts.length; i++) {
        createdParents.push("/" + parts.slice(0, i).join("/"));
      }
    }

    return {
      success: true,
      path: folderPath,
      created: true,
      createdParents: recursive ? createdParents : undefined,
    };
  } catch (error: unknown) {
    throw new Error(`Create folder failed: ${error.message}`);
  }
}

async function getFileInfo({
  path: filePath,
}: GetInfoParams): Promise<unknown> {
  try {
    // Mock implementation - in real implementation would use fs.stat
    // const stats = await fs.stat(filePath);

    const isDirectory = filePath.endsWith("/") || !path.extname(filePath);

    const mockInfo = {
      path: filePath,
      name: path.basename(filePath),
      size: isDirectory ? undefined : 1024,
      isDirectory,
      isFile: !isDirectory,
      mtime: new Date(),
      ctime: new Date(),
      permissions: {
        readable: true,
        writable: true,
        executable: isDirectory,
      },
    };

    if (isDirectory) {
      // Mock directory-specific info
      return {
        ...mockInfo,
        itemCount: 25,
        totalSize: 1048576,
      };
    }

    return mockInfo;
  } catch (error: unknown) {
    throw new Error(`Get file info failed: ${error.message}`);
  }
}
