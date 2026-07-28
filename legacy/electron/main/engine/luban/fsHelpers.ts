import * as gracefulFs from "graceful-fs";

export async function ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
        await gracefulFs.promises.mkdir(dirPath, { recursive: true });
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") {
            throw error;
        }
    }
}

export function validateFilePaths(source: string, destination?: string): void {
    if (!source || typeof source !== "string") {
        throw new Error("源文件路径无效");
    }

    if (
        destination !== undefined &&
        (!destination || typeof destination !== "string")
    ) {
        throw new Error("目标文件路径无效");
    }

    if (destination && source === destination) {
        throw new Error("源文件路径和目标文件路径不能相同");
    }
}
