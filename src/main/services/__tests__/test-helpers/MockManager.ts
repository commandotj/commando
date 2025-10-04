/**
 * Mock Manager for Test Environment
 * 测试环境Mock管理器
 *
 * 统一管理所有测试中的Mock对象，使用正确的ES6导入和TypeScript类型
 */

import type { Stats } from "fs"
import * as gracefulFs from "graceful-fs"
import * as crypto from "crypto"
import logger from "../../../log/logger"

// 创建正确的Mock类型
jest.mock("graceful-fs")
jest.mock("crypto")
jest.mock("../../../log/logger")

/**
 * Mock graceful-fs interfaces
 */
export interface MockGracefulFs {
    promises: {
        stat: jest.MockedFunction<typeof gracefulFs.promises.stat>
        readdir: jest.MockedFunction<typeof gracefulFs.promises.readdir>
        mkdir: jest.MockedFunction<typeof gracefulFs.promises.mkdir>
        unlink: jest.MockedFunction<typeof gracefulFs.promises.unlink>
        access: jest.MockedFunction<typeof gracefulFs.promises.access>
        utimes: jest.MockedFunction<typeof gracefulFs.promises.utimes>
    }
    createReadStream: jest.MockedFunction<typeof gracefulFs.createReadStream>
    createWriteStream: jest.MockedFunction<typeof gracefulFs.createWriteStream>
    constants: typeof gracefulFs.constants
}

/**
 * Mock ReadStream interface
 */
export interface MockReadStream {
    pipe: jest.MockedFunction<(destination: MockWriteStream) => MockWriteStream>
    on: jest.MockedFunction<(event: string, callback: (data: string | Buffer) => void) => MockReadStream>
    destroy: jest.MockedFunction<() => void>
}

/**
 * Mock WriteStream interface
 */
export interface MockWriteStream {
    on: jest.MockedFunction<(event: string, callback: () => void) => MockWriteStream>
    destroy: jest.MockedFunction<() => void>
}

/**
 * Mock crypto interfaces
 */
export interface MockCrypto {
    createHash: jest.MockedFunction<typeof crypto.createHash>
}

/**
 * Mock Hash interface - 扩展为完整的 crypto.Hash 接口
 */
export interface MockHash {
    update: jest.MockedFunction<(data: string | Buffer) => MockHash>
    digest: jest.MockedFunction<{ (): Buffer; (encoding: crypto.BinaryToTextEncoding): string }>
    copy: jest.MockedFunction<(options?: crypto.HashOptions) => MockHash>
}

/**
 * Mock logger interfaces
 */
export interface MockLogger {
    info: jest.MockedFunction<(message: string, meta?: Record<string, unknown>) => void>
    error: jest.MockedFunction<(message: string, meta?: Record<string, unknown>) => void>
    warn: jest.MockedFunction<(message: string, meta?: Record<string, unknown>) => void>
    debug: jest.MockedFunction<(message: string, meta?: Record<string, unknown>) => void>
}

/**
 * Mock管理器类
 * 提供类型安全的Mock对象访问
 */
export class MockManager {
    private static instance: MockManager
    private gracefulFsMock: MockGracefulFs | null = null
    private cryptoMock: MockCrypto | null = null
    private loggerMock: MockLogger | null = null

    private constructor() {
        // Private constructor for singleton
    }

    /**
     * 获取单例实例
     */
    static getInstance(): MockManager {
        if (!MockManager.instance) {
            MockManager.instance = new MockManager()
        }
        return MockManager.instance
    }

    /**
     * 获取graceful-fs Mock
     */
    getGracefulFsMock(): MockGracefulFs {
        if (!this.gracefulFsMock) {
            // 使用正确的ES6模块导入Mock
            const mockedGracefulFs = jest.mocked(gracefulFs)
            this.gracefulFsMock = mockedGracefulFs as MockGracefulFs
        }
        return this.gracefulFsMock
    }

    /**
     * 获取crypto Mock
     */
    getCryptoMock(): MockCrypto {
        if (!this.cryptoMock) {
            const mockedCrypto = jest.mocked(crypto)
            this.cryptoMock = mockedCrypto as MockCrypto
        }
        return this.cryptoMock
    }

    /**
     * 获取logger Mock
     */
    getLoggerMock(): MockLogger {
        if (!this.loggerMock) {
            const mockedLogger = jest.mocked(logger)
            this.loggerMock = mockedLogger as MockLogger
        }
        return this.loggerMock
    }

    /**
     * 重置所有Mock
     */
    resetAllMocks(): void {
        jest.clearAllMocks()
        this.gracefulFsMock = null
        this.cryptoMock = null
        this.loggerMock = null
    }

    /**
     * 创建Mock文件统计对象
     */
    createMockStats(options: {
        isFile?: boolean
        isDirectory?: boolean
        size?: number
        mtime?: Date
        atime?: Date
        ctime?: Date
        mode?: number
    }): Stats {
        return {
            isFile: jest.fn(() => options.isFile ?? true),
            isDirectory: jest.fn(() => options.isDirectory ?? false),
            size: options.size ?? 100,
            mtime: options.mtime ?? new Date(),
            atime: options.atime ?? new Date(),
            ctime: options.ctime ?? new Date(),
            mode: options.mode ?? 0o644,
        } as unknown as Stats
    }

    /**
     * 创建Mock读取流
     */
    createMockReadStream(data: string): MockReadStream {
        const mockStream: MockReadStream = {
            pipe: jest.fn().mockReturnValue({} as MockWriteStream),
            on: jest.fn().mockImplementation((event: string, callback: (data: string | Buffer) => void) => {
                if (event === "data") {
                    setTimeout(() => callback(Buffer.from(data)), 10)
                } else if (event === "end") {
                    setTimeout(() => callback(Buffer.from("")), 20)
                }
                return mockStream
            }),
            destroy: jest.fn(),
        }
        return mockStream
    }

    /**
     * 创建Mock写入流
     */
    createMockWriteStream(): MockWriteStream {
        const mockStream: MockWriteStream = {
            on: jest.fn().mockImplementation((event: string, callback: () => void) => {
                if (event === "finish") {
                    setTimeout(callback, 20)
                }
                return mockStream
            }),
            destroy: jest.fn(),
        }
        return mockStream
    }

    /**
     * 创建Mock哈希对象
     */
    createMockHash(resultHash: string = "mocked-hash-123456"): MockHash {
        const mockHash: MockHash = {
            update: jest.fn().mockImplementation(function (this: MockHash) {
                return this
            }),
            digest: jest.fn().mockReturnValue(resultHash),
            copy: jest.fn().mockImplementation(function (this: MockHash) {
                return this
            }),
        }
        return mockHash
    }
}
