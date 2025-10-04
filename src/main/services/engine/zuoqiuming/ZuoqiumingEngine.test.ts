/**
 * 左丘明引擎测试
 */

import { ZuoqiumingEngine, type ZuoqiumingEngineDeps } from "./ZuoqiumingEngine"
import type { Logger } from "../shared/loggerTypes"
import { exec } from "child_process"

// Mock dependencies
jest.mock("child_process", () => ({
    exec: jest.fn()
}))
const mockExec = exec as jest.MockedFunction<typeof exec>

const mockLogger: Logger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn()
}

const mockFs = {
    mkdir: jest.fn(),
    readdir: jest.fn(),
    stat: jest.fn()
} as any

const mockDeps: ZuoqiumingEngineDeps = {
    logger: mockLogger,
    fs: mockFs
}

describe("ZuoqiumingEngine", () => {
    let engine: ZuoqiumingEngine

    beforeEach(() => {
        engine = new ZuoqiumingEngine(mockDeps)
        jest.clearAllMocks()
    })

    describe("initialization", () => {
        it("should initialize successfully", async () => {
            await engine.initialize()
            expect(mockLogger.info).toHaveBeenCalledWith("左丘明版本控制引擎初始化完成")
        })

        it("should cleanup successfully", async () => {
            await engine.cleanup()
            expect(mockLogger.info).toHaveBeenCalledWith("左丘明版本控制引擎清理完成")
        })
    })

    describe("engine properties", () => {
        it("should have correct engine info", () => {
            expect(engine.name).toBe("ZuoqiumingEngine")
            expect(engine.version).toBe("1.0.0")
            expect(engine.capabilities).toHaveLength(1)
            expect(engine.capabilities[0].type).toBe("version_control")
        })
    })

    describe("status reporting", () => {
        it("should return correct initial status", () => {
            const status = engine.getStatus()
            expect(status.running).toBe(false)
            expect(status.activeTasks).toBe(0)
            expect(status.queueSize).toBe(0)
            expect(status.errorCount).toBe(0)
            expect(status.lastActivity).toBeInstanceOf(Date)
        })
    })

    describe("task execution", () => {
        it("should reject non-commit tasks", async () => {
            const task = {
                id: "test-task",
                type: "copy" as const,
                priority: 1,
                source: "/source",
                destination: "/dest"
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(false)
            expect(result.error).toBe("左丘明引擎主要支持版本控制操作")
        })

        it("should handle non-git repository", async () => {
            // Mock git check to return false
            mockExec.mockImplementation((_command, options, callback) => {
                if (typeof options === "function") {
                    callback = options
                }
                if (callback) {
                    callback(new Error("Not a git repository"), "", "")
                }
                return {} as any
            })

            const task = {
                id: "commit-task",
                type: "commit" as const,
                priority: 1,
                options: {
                    repositoryPath: "/not-git-repo"
                } as Record<string, unknown>
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(false)
            expect(result.data).toBeDefined()
            const data = result.data as any
            expect(data.error).toBe("指定路径不是Git仓库")
        })
    })

    describe("git repository checks", () => {
        it("should detect valid git repository", async () => {
            // Mock successful git check
            mockExec.mockImplementation((command, options, callback) => {
                if (typeof options === "function") {
                    callback = options
                }
                if (callback && command.includes("rev-parse")) {
                    callback(null, "true\n", "")
                }
                return {} as any
            })

            const isGit = await (engine as any).isGitRepository("/valid-repo")
            expect(isGit).toBe(true)
        })

        it("should detect invalid git repository", async () => {
            // Mock failed git check
            mockExec.mockImplementation((command, options, callback) => {
                if (typeof options === "function") {
                    callback = options
                }
                if (callback && command.includes("rev-parse")) {
                    callback(new Error("Not a git repository"), "", "")
                }
                return {} as any
            })

            const isGit = await (engine as any).isGitRepository("/invalid-repo")
            expect(isGit).toBe(false)
        })
    })

    describe("commit operations", () => {
        beforeEach(() => {
            // Mock git operations
            mockExec.mockImplementation((_command, options, callback) => {
                if (typeof options === "function") {
                    callback = options
                }
                if (callback) {
                    if (_command.includes("rev-parse")) {
                        callback(null, "true\n", "")
                    } else if (_command.includes("status --porcelain")) {
                        callback(null, "M  file1.txt\n?? file2.txt\n", "")
                    } else if (_command.includes("add")) {
                        callback(null, "", "")
                    } else if (_command.includes("commit")) {
                        callback(null, "", "")
                    } else if (_command.includes("rev-parse HEAD")) {
                        callback(null, "abcd1234\n", "")
                    } else if (_command.includes("git show")) {
                        callback(null, "author|date|message\n\nfile1.txt\nfile2.txt", "")
                    }
                }
                return {} as any
            })
        })

        it("should execute commit successfully", async () => {
            const task = {
                id: "commit-task",
                type: "commit" as const,
                priority: 1,
                options: {
                    repositoryPath: "/git-repo",
                    commitMessage: "Test commit"
                } as Record<string, unknown>
            }

            const result = await engine.executeTask(task)
            expect(result.success).toBe(true)
            expect(result.data).toBeDefined()
        })
    })

    describe("progress reporting", () => {
        it("should call progress callback during commit", async () => {
            const progressCallback = jest.fn()

            // Mock git operations
            mockExec.mockImplementation((_command, options, callback) => {
                if (typeof options === "function") {
                    callback = options
                }
                if (callback) {
                    if (_command.includes("rev-parse")) {
                        callback(null, "true\n", "")
                    } else if (_command.includes("status")) {
                        callback(null, "", "")
                    } else {
                        callback(null, "", "")
                    }
                }
                return {} as any
            })

            const task = {
                id: "progress-commit",
                type: "commit" as const,
                priority: 1,
                options: {
                    repositoryPath: "/git-repo"
                } as Record<string, unknown>,
                progressCallback
            }

            await engine.executeTask(task)
            expect(progressCallback).toHaveBeenCalled()
        })
    })

    describe("utility methods", () => {
        it("should get commit history", async () => {
            mockExec.mockImplementation((command, options, callback) => {
                if (typeof options === "function") {
                    callback = options
                }
                if (callback && command.includes("git log")) {
                    callback(null, "hash1|author1|date1|message1\nhash2|author2|date2|message2\n", "")
                }
                return {} as any
            })

            const history = await engine.getCommitHistory("/repo", 5)
            expect(history).toHaveLength(2)
            expect(history[0].hash).toBe("hash1")
            expect(history[0].author).toBe("author1")
        })

        it("should get file diff", async () => {
            mockExec.mockImplementation((command, options, callback) => {
                if (typeof options === "function") {
                    callback = options
                }
                if (callback && command.includes("git diff")) {
                    callback(null, "--- a/file.txt\n+++ b/file.txt\n@@ -1,3 +1,3 @@\n-old line\n+new line\n", "")
                }
                return {} as any
            })

            const diff = await engine.getFileDiff("/repo", "file.txt")
            expect(diff).toContain("--- a/file.txt")
            expect(diff).toContain("+++ b/file.txt")
        })
    })
})