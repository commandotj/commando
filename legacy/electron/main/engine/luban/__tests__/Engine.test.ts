/**
 * @jest-environment node
 */

import type { Stats } from "graceful-fs";
import { EventEmitter } from "events";
import { LubanEngine } from "../Engine";
import type { LubanEngineDeps } from "../Engine";
import { mergeDefaultOptions, mergeBatchOptions } from "../options";
import { createBatches } from "../batchUtils";
import { performFileOperation } from "../fileOperationExecutor";
import { sleep as sleepFn } from "../../shared/sleep";
import { ensureDirectoryExists, validateFilePaths } from "../fsHelpers";
import { streamCopy } from "../streamCopy";
import { calculateFileChecksum } from "../checksum";
import { ENGINE_DEFAULTS } from "../../shared/defaults";
import type { FileOperationOptions } from "../../shared/types";
import { logger } from "../../laozi";
import * as gracefulFs from "graceful-fs";

jest.mock("../../laozi", () => ({
    logger: {
        info: jest.fn(),
        error: jest.fn(),
        warn: jest.fn(),
        debug: jest.fn(),
    },
}));

jest.mock("graceful-fs", () => {
    const mockState = {
        readChunks: [Buffer.from("mock-data")],
        readError: null as Error | string | null,
        unlinkError: null as Error | null,
        statSize: 9,
        isFile: true,
    };

    const createReadStream = jest.fn(() => {
        const stream = new EventEmitter() as EventEmitter & {
            pipe: (destination: EventEmitter) => EventEmitter;
            destroy: jest.Mock;
        };

        let emitted = false;
        let pipeTarget: EventEmitter | null = null;

        const emitData = (): void => {
            if (emitted) return;
            emitted = true;

            if (mockState.readError) {
                stream.emit("error", mockState.readError);
                pipeTarget?.emit("error", mockState.readError);
                return;
            }

            mockState.readChunks.forEach(chunk => stream.emit("data", chunk));
            stream.emit("end");
            pipeTarget?.emit("finish");
        };

        queueMicrotask(emitData);

        stream.destroy = jest.fn();
        stream.pipe = destination => {
            pipeTarget = destination;
            queueMicrotask(emitData);
            return destination;
        };

        return stream;
    });

    const createWriteStream = jest.fn(() => {
        const stream = new EventEmitter() as EventEmitter & {
            destroy: jest.Mock;
        };
        stream.destroy = jest.fn();
        return stream;
    });

    const buildStats = (): Stats => {
        const timestamp = new Date("2025-01-01T00:00:00Z");
        return {
            dev: 0,
            ino: 0,
            mode: 0o644,
            nlink: 1,
            uid: 0,
            gid: 0,
            rdev: 0,
            size: mockState.statSize,
            blksize: 4096,
            blocks: 0,
            atimeMs: timestamp.getTime(),
            mtimeMs: timestamp.getTime(),
            ctimeMs: timestamp.getTime(),
            birthtimeMs: timestamp.getTime(),
            atime: timestamp,
            mtime: timestamp,
            ctime: timestamp,
            birthtime: timestamp,
            isFile: () => mockState.isFile,
            isDirectory: () => !mockState.isFile,
            isBlockDevice: () => false,
            isCharacterDevice: () => false,
            isSymbolicLink: () => false,
            isFIFO: () => false,
            isSocket: () => false,
        };
    };

    const promises = {
        stat: jest.fn(async () => buildStats()),
        access: jest.fn(async () => {
            const err = new Error("ENOENT") as NodeJS.ErrnoException;
            err.code = "ENOENT";
            throw err;
        }),
        mkdir: jest.fn(async () => undefined),
        unlink: jest.fn(async () => undefined),
        utimes: jest.fn(async () => undefined),
    };

    const unlink = jest.fn(
        (_: string, callback?: (error: Error | null) => void) => {
            callback?.(mockState.unlinkError);
        }
    );

    return {
        __esModule: true,
        promises,
        createReadStream,
        createWriteStream,
        unlink,
        __mockState: mockState,
        __createStats: buildStats,
    } as unknown as typeof import("graceful-fs") & {
        __mockState: typeof mockState;
        __createStats: () => Stats;
    };
});

const loggerMock = logger as jest.Mocked<typeof logger>;

type GracefulFsJestMock = {
    promises: {
        stat: jest.Mock<Promise<Stats>, []>;
        access: jest.Mock<Promise<void>, []>;
        mkdir: jest.Mock<Promise<void>, [string, unknown?]>;
        unlink: jest.Mock<Promise<void>, [string]>;
        utimes: jest.Mock<Promise<void>, [string, Date, Date]>;
    };
    createReadStream: jest.Mock<unknown, unknown[]>;
    createWriteStream: jest.Mock<unknown, unknown[]>;
    unlink: jest.Mock<void, [string, ((error: Error | null) => void)?]>;
    __mockState: {
        readChunks: Buffer[];
        readError: Error | string | null;
        unlinkError: Error | null;
        statSize: number;
        isFile: boolean;
    };
    __createStats: () => Stats;
};

const fsMock = gracefulFs as unknown as GracefulFsJestMock;

const accessAsEnoent = async (): Promise<void> => {
    const err = new Error("ENOENT") as NodeJS.ErrnoException;
    err.code = "ENOENT";
    throw err;
};

const asyncFlush = async (): Promise<void> => {
    await Promise.resolve();
    await Promise.resolve();
};

const createEngine = (overrides: Partial<LubanEngineDeps> = {}): LubanEngine =>
    new LubanEngine({
        logger: loggerMock,
        ensureDirectoryExists,
        validateFilePaths,
        streamCopy,
        calculateChecksum: (filePath, options) =>
            calculateFileChecksum(filePath, options),
        sleep: sleepFn,
        fs: fsMock.promises as unknown as typeof gracefulFs.promises,
        ...overrides,
    });

describe("LubanEngine", () => {
    let engine: LubanEngine;

    beforeEach(() => {
        jest.clearAllMocks();
        engine = createEngine();

        fsMock.__mockState.readChunks = [Buffer.from("mock-data")];
        fsMock.__mockState.readError = null;
        fsMock.__mockState.unlinkError = null;
        fsMock.__mockState.statSize = 9;
        fsMock.__mockState.isFile = true;

        fsMock.promises.stat.mockImplementation(async () =>
            fsMock.__createStats()
        );
        fsMock.promises.access.mockImplementation(accessAsEnoent);
        fsMock.promises.mkdir.mockImplementation(async () => undefined);
        fsMock.promises.unlink.mockImplementation(async () => undefined);
        fsMock.promises.utimes.mockImplementation(async () => undefined);
        fsMock.unlink.mockImplementation(
            (_: string, callback?: (error: Error | null) => void) => {
                callback?.(fsMock.__mockState.unlinkError);
            }
        );

        loggerMock.info.mockClear();
        loggerMock.error.mockClear();
        loggerMock.warn.mockClear();
        loggerMock.debug.mockClear();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it("复制文件应成功并触发进度与校验流程", async () => {
        const progress: number[] = [];
        const streamCopyMock = jest.fn(
            async ({ options }: { options: FileOperationOptions }) => {
                options.progressCallback?.({
                    currentFile: "/tmp/source.txt",
                    bytesProcessed: 2,
                    totalBytes: 5,
                    percentage: 40,
                    speed: 100,
                    estimatedTimeRemaining: 10,
                    operation: "copy",
                    startTime: Date.now(),
                });
                options.progressCallback?.({
                    currentFile: "/tmp/source.txt",
                    bytesProcessed: 5,
                    totalBytes: 5,
                    percentage: 100,
                    speed: 200,
                    estimatedTimeRemaining: 0,
                    operation: "copy",
                    startTime: Date.now(),
                });
                return { bytesProcessed: 5 };
            }
        );
        const checksumMock = jest.fn().mockResolvedValue("checksum-value");

        engine = createEngine({
            streamCopy: streamCopyMock as unknown as typeof streamCopy,
            calculateChecksum: checksumMock,
        });

        const result = await engine.copyFile(
            "/tmp/source.txt",
            "/tmp/dest.txt",
            {
                progressCallback: info => progress.push(info.percentage),
                verifyIntegrity: true,
                preserveTimestamps: true,
                verbose: true,
            }
        );

        expect(result.success).toBe(true);
        expect(result.bytesProcessed).toBe(5);
        expect(progress.some(value => value > 0 && value <= 100)).toBe(true);
        expect(fsMock.promises.utimes).toHaveBeenCalledWith(
            "/tmp/dest.txt",
            expect.any(Date),
            expect.any(Date)
        );
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining("文件复制完成")
        );
        expect(streamCopyMock).toHaveBeenCalled();
        expect(checksumMock).toHaveBeenCalledTimes(2);
    });

    it("临时失败应按重试策略恢复并成功", async () => {
        const streamCopyMock = jest.fn<
            Promise<{ bytesProcessed: number }>,
            [unknown]
        >();
        streamCopyMock.mockImplementationOnce(async () => {
            throw new Error("transient");
        });
        streamCopyMock.mockImplementationOnce(async () => ({
            bytesProcessed: 9,
        }));

        engine = createEngine({
            streamCopy: streamCopyMock as unknown as typeof streamCopy,
            sleep: jest.fn(async () => undefined),
            calculateChecksum: jest.fn().mockResolvedValue("hash"),
        });

        const result = await engine.copyFile(
            "/tmp/source.txt",
            "/tmp/retry.txt",
            {
                overwrite: true,
                retryDelay: 0,
                maxRetries: 2,
                verbose: true,
            }
        );

        expect(result.success).toBe(true);
        expect(streamCopyMock).toHaveBeenCalledTimes(2);
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining("文件操作重试")
        );
    });

    it("超过最大重试次数应返回失败结果", async () => {
        const streamCopyMock = jest.fn<
            Promise<{ bytesProcessed: number }>,
            [unknown]
        >();
        streamCopyMock.mockImplementation(async () => {
            throw new Error("硬件错误");
        });

        engine = createEngine({
            streamCopy: streamCopyMock as unknown as typeof streamCopy,
            sleep: jest.fn(async () => undefined),
        });

        const result = await engine.copyFile(
            "/tmp/source.txt",
            "/tmp/fail.txt",
            {
                overwrite: true,
                retryDelay: 0,
                maxRetries: 1,
            }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("硬件错误");
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining("文件复制失败")
        );
    });

    it("源路径非法时应立即失败", async () => {
        await expect(
            engine.copyFile("/tmp/same.txt", "/tmp/same.txt")
        ).rejects.toThrow("源文件路径和目标文件路径不能相同");
    });

    it("文件完整性校验失败会抛出错误", async () => {
        const streamCopyMock = jest
            .fn<Promise<{ bytesProcessed: number }>, [unknown]>()
            .mockResolvedValue({ bytesProcessed: 1 });
        const checksumMock = jest
            .fn()
            .mockResolvedValueOnce("AAA")
            .mockResolvedValueOnce("BBB");

        engine = createEngine({
            streamCopy: streamCopyMock as unknown as typeof streamCopy,
            calculateChecksum: checksumMock,
        });

        const result = await engine.copyFile(
            "/tmp/source.txt",
            "/tmp/mismatch.txt",
            {
                verifyIntegrity: true,
                preserveTimestamps: false,
                maxRetries: Number.EPSILON,
            }
        );

        expect(result.success).toBe(false);
        expect(result.error).toContain("文件完整性验证失败");
        expect(checksumMock).toHaveBeenCalledTimes(2);
    });

    it("copyBatch 应执行全部任务并产生日志", async () => {
        const copySpy = jest
            .spyOn(engine, "copyFile")
            .mockImplementation(async source => ({
                success: true,
                source,
                destination: `${source}.bak`,
                bytesProcessed: 1,
                duration: 1,
            }));

        const result = await engine.copyBatch(["/a", "/b", "/c"], "/dest", {
            concurrency: 2,
            verbose: true,
        });

        expect(result.success).toBe(true);
        expect(result.successCount).toBe(3);
        expect(copySpy).toHaveBeenCalledTimes(3);
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining("开始批量文件复制")
        );
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining("批量文件复制完成")
        );
    });

    it("copyBatch 遇到错误并 stopOnError 应提前终止", async () => {
        const copySpy = jest
            .spyOn(engine, "copyFile")
            .mockImplementation(async source => {
                if (source === "/b") {
                    return {
                        success: false,
                        source,
                        destination: `${source}.bak`,
                        bytesProcessed: 0,
                        duration: 0,
                        error: "失败",
                    };
                }
                return {
                    success: true,
                    source,
                    bytesProcessed: 1,
                    duration: 1,
                };
            });

        const result = await engine.copyBatch(["/a", "/b", "/c"], "/dest", {
            concurrency: 1,
            stopOnError: true,
            errorMode: "collect",
        });

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain("失败");
        expect(copySpy).toHaveBeenCalled();
    });

    it("copyBatch 捕获异常时应转换为失败结果", async () => {
        const copySpy = jest
            .spyOn(engine, "copyFile")
            .mockImplementation(async source => {
                if (source === "/b") {
                    throw new Error("IO fail");
                }
                return {
                    success: true,
                    source,
                    bytesProcessed: 1,
                    duration: 1,
                };
            });

        const result = await engine.copyBatch(["/a", "/b"], "/dest", {
            concurrency: 2,
            stopOnError: false,
            errorMode: "collect",
        });

        expect(result.success).toBe(false);
        expect(result.errors[0]).toContain("IO fail");
        const failedEntry = result.results.find(entry => !entry.success);
        expect(failedEntry?.error).toContain("IO fail");
        expect(copySpy).toHaveBeenCalled();
    });

    it("copyBatch 空列表应直接抛出", async () => {
        await expect(engine.copyBatch([], "/dest")).rejects.toThrow(
            "源文件列表不能为空"
        );
    });

    it("moveFile 删除源文件失败时返回部分失败", async () => {
        const copySpy = jest.spyOn(engine, "copyFile").mockResolvedValue({
            success: true,
            source: "/a",
            destination: "/b",
            bytesProcessed: 1,
            duration: 1,
        });

        fsMock.promises.unlink.mockRejectedValueOnce("权限不足");

        const result = await engine.moveFile("/a", "/b");

        expect(result.success).toBe(false);
        expect(result.error).toContain("删除源文件失败");
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining("文件移动部分失败")
        );
        expect(copySpy).toHaveBeenCalled();
    });

    it("moveFile 成功时应删除源文件", async () => {
        const copySpy = jest.spyOn(engine, "copyFile").mockResolvedValue({
            success: true,
            source: "/a",
            destination: "/b",
            bytesProcessed: 1,
            duration: 1,
        });

        const result = await engine.moveFile("/a", "/b", { verbose: true });

        expect(result.success).toBe(true);
        expect(fsMock.promises.unlink).toHaveBeenCalledWith("/a");
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining("文件移动完成")
        );
        expect(copySpy).toHaveBeenCalled();
    });

    it("moveFile 在复制失败时应直接返回结果", async () => {
        const failure = {
            success: false,
            source: "/a",
            destination: "/b",
            bytesProcessed: 0,
            duration: 0,
            error: "copy failed",
        };
        const copySpy = jest
            .spyOn(engine, "copyFile")
            .mockResolvedValue(failure);

        const result = await engine.moveFile("/a", "/b");

        expect(result).toBe(failure);
        expect(copySpy).toHaveBeenCalled();
    });

    it("deleteFile 成功应两次触发进度", async () => {
        fsMock.__mockState.statSize = 8;
        const progress: number[] = [];

        const result = await engine.deleteFile("/tmp/delete.txt", {
            progressCallback: info => progress.push(info.percentage),
            verbose: true,
        });

        expect(result.success).toBe(true);
        expect(progress).toEqual([0, 100]);
        expect(loggerMock.info).toHaveBeenCalledWith(
            expect.stringContaining("文件删除完成")
        );
    });

    it("deleteFile 删除失败应返回错误", async () => {
        fsMock.promises.unlink.mockRejectedValueOnce("忙碌");

        const result = await engine.deleteFile("/tmp/delete.txt");

        expect(result.success).toBe(false);
        expect(result.error).toContain("忙碌");
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining("文件删除失败")
        );
    });

    it("verifyFile 校验成功与失败场景", async () => {
        fsMock.__mockState.readChunks = [Buffer.from("checksum")];
        fsMock.__mockState.statSize = 8;

        const success = await engine.verifyFile("/tmp/file.txt", undefined, {
            verbose: true,
        });
        expect(success.success).toBe(true);
        expect(success.checksum).toHaveLength(64);

        const failure = await engine.verifyFile("/tmp/file.txt", "wrong");
        expect(failure.success).toBe(false);
        expect(failure.error).toContain("校验和不匹配");
    });

    it("verifyFile 遇到异常应记录错误", async () => {
        fsMock.promises.stat.mockRejectedValueOnce("权限");

        const result = await engine.verifyFile("/tmp/file.txt");

        expect(result.success).toBe(false);
        expect(loggerMock.error).toHaveBeenCalledWith(
            expect.stringContaining("文件验证失败")
        );
    });

    it("getFileInfo 应返回基础元数据", async () => {
        const info = await engine.getFileInfo("/tmp/info.txt");

        expect(info.isFile).toBe(true);
        expect(info.size).toBe(9);
        expect(info.path).toBe("/tmp/info.txt");
    });
});

describe("引擎纯函数模块", () => {
    afterEach(() => {
        jest.clearAllMocks();
    });

    it("streamCopy 应计算进度", async () => {
        fsMock.__mockState.readChunks = [
            Buffer.from("abc"),
            Buffer.from("def"),
        ];
        fsMock.__mockState.statSize = 6;
        const progress: number[] = [];

        const result = await streamCopy({
            source: "/tmp/a",
            destination: "/tmp/b",
            stats: fsMock.__createStats(),
            options: {
                progressCallback: info => progress.push(info.percentage),
                bufferSize: 2,
            },
        });

        await asyncFlush();

        expect(result.bytesProcessed).toBe(6);
        expect(progress).toContain(50);
        expect(progress.at(-1)).toBe(100);
    });

    it("streamCopy 读取错误时应清理目标", async () => {
        fsMock.__mockState.readError = new Error("读取失败");

        await expect(
            streamCopy({
                source: "/tmp/a",
                destination: "/tmp/b",
                stats: fsMock.__createStats(),
                options: {},
            })
        ).rejects.toThrow("读取失败");
        expect(fsMock.unlink).toHaveBeenCalledWith(
            "/tmp/b",
            expect.any(Function)
        );

        fsMock.__mockState.readError = null;
    });

    it("calculateFileChecksum 应返回 SHA-256", async () => {
        fsMock.__mockState.readChunks = [Buffer.from("hash-test")];
        const progress: number[] = [];

        const checksum = await calculateFileChecksum("/tmp/file.txt", {
            progressCallback: info => progress.push(info.percentage),
        });

        await asyncFlush();

        expect(checksum).toHaveLength(64);
        expect(progress.every(value => value === 50)).toBe(true);
    });

    it("ensureDirectoryExists 遇到非 EEXIST 错误时抛出", async () => {
        const err = new Error("写保护") as NodeJS.ErrnoException;
        err.code = "EACCES";
        fsMock.promises.mkdir.mockRejectedValueOnce(err);

        await expect(ensureDirectoryExists("/tmp/protected")).rejects.toThrow(
            "写保护"
        );
    });

    it("ensureDirectoryExists 遇到 EEXIST 不应抛出", async () => {
        const err = new Error("已存在") as NodeJS.ErrnoException;
        err.code = "EEXIST";
        fsMock.promises.mkdir.mockRejectedValueOnce(err);

        await expect(
            ensureDirectoryExists("/tmp/exist")
        ).resolves.toBeUndefined();
    });

    it("validateFilePaths 应覆盖所有校验分支", () => {
        expect(() => validateFilePaths("/a", "/b")).not.toThrow();
        expect(() => validateFilePaths("", "/b")).toThrow("源文件路径无效");
        expect(() => validateFilePaths("/a", "")).toThrow("目标文件路径无效");
        expect(() => validateFilePaths("/a", "/a")).toThrow(
            "源文件路径和目标文件路径不能相同"
        );
    });

    it("mergeDefaultOptions 与 mergeBatchOptions 应正确合并", () => {
        const merged = mergeDefaultOptions({ overwrite: true, verbose: true });
        expect(merged.overwrite).toBe(true);
        expect(merged.verbose).toBe(true);
        expect(merged.maxRetries).toBe(ENGINE_DEFAULTS.MAX_RETRIES);

        const batchMerged = mergeBatchOptions({
            concurrency: 5,
            stopOnError: true,
        });
        expect(batchMerged.concurrency).toBe(5);
        expect(batchMerged.stopOnError).toBe(true);
        expect(batchMerged.errorMode).toBe("collect");
    });

    it("createBatches 应按批次拆分数组", () => {
        const batches = createBatches([1, 2, 3, 4], 3);
        expect(batches).toEqual([[1, 2, 3], [4]]);
    });

    it("sleep 应响应 Fake Timer", async () => {
        jest.useFakeTimers();
        const promise = sleepFn(500);
        await jest.advanceTimersByTimeAsync(500);
        await expect(promise).resolves.toBeUndefined();
        jest.useRealTimers();
    });

    it("performFileOperation maxRetries < 0 应返回未知错误", async () => {
        await expect(
            performFileOperation({
                source: "/a",
                destination: "/b",
                options: { maxRetries: -1 },
                deps: {
                    logger: loggerMock,
                    ensureDirectoryExists,
                    streamCopy: jest.fn(),
                    calculateChecksum: jest.fn(),
                    sleep: sleepFn,
                    defaults: {
                        maxRetries: ENGINE_DEFAULTS.MAX_RETRIES,
                        retryDelay: ENGINE_DEFAULTS.RETRY_DELAY,
                    },
                },
            })
        ).rejects.toThrow("未知错误");
    });

    it("performFileOperation 目标已存在时抛出异常", async () => {
        fsMock.promises.access.mockResolvedValueOnce(undefined);

        await expect(
            performFileOperation({
                source: "/tmp/source.txt",
                destination: "/tmp/exist.txt",
                options: { overwrite: false, maxRetries: Number.EPSILON },
                deps: {
                    logger: loggerMock,
                    ensureDirectoryExists,
                    streamCopy,
                    calculateChecksum: calculateFileChecksum,
                    sleep: sleepFn,
                    defaults: {
                        maxRetries: ENGINE_DEFAULTS.MAX_RETRIES,
                        retryDelay: ENGINE_DEFAULTS.RETRY_DELAY,
                    },
                },
            })
        ).rejects.toThrow("目标文件已存在");
    });

    it("performFileOperation 校验失败时抛出异常", async () => {
        const streamCopyMock = jest
            .fn()
            .mockResolvedValue({ bytesProcessed: 1 });
        const checksumMock = jest
            .fn()
            .mockResolvedValueOnce("AAA")
            .mockResolvedValueOnce("BBB");

        await expect(
            performFileOperation({
                source: "/tmp/source.txt",
                destination: "/tmp/dest.txt",
                options: {
                    overwrite: true,
                    verifyIntegrity: true,
                    preserveTimestamps: false,
                    maxRetries: Number.EPSILON,
                },
                deps: {
                    logger: loggerMock,
                    ensureDirectoryExists,
                    streamCopy: streamCopyMock,
                    calculateChecksum: checksumMock,
                    sleep: sleepFn,
                    defaults: {
                        maxRetries: ENGINE_DEFAULTS.MAX_RETRIES,
                        retryDelay: ENGINE_DEFAULTS.RETRY_DELAY,
                    },
                },
            })
        ).rejects.toThrow("文件完整性验证失败");

        expect(streamCopyMock).toHaveBeenCalled();
        expect(checksumMock).toHaveBeenCalledTimes(2);
    });

    it("performFileOperation 应检测源文件类型", async () => {
        fsMock.__mockState.isFile = false;

        await expect(
            performFileOperation({
                source: "/a",
                destination: "/b",
                options: { maxRetries: 0 },
                deps: {
                    logger: loggerMock,
                    ensureDirectoryExists,
                    streamCopy,
                    calculateChecksum: calculateFileChecksum,
                    sleep: sleepFn,
                    defaults: {
                        maxRetries: ENGINE_DEFAULTS.MAX_RETRIES,
                        retryDelay: ENGINE_DEFAULTS.RETRY_DELAY,
                    },
                },
            })
        ).rejects.toThrow("源路径不是文件");

        fsMock.__mockState.isFile = true;
    });
});
