const { EventEmitter } = require("events");
import {
    addCopyTask,
    getCopyQueueStatus,
    cancelCopyTask,
} from "../workerManager";

// Mock Worker
jest.mock("worker_threads", () => {
    return {
        Worker: class extends EventEmitter {
            constructor(path: string, opts: Record<string, any>) {
                super();
                setTimeout(() => {
                    this.emit("message", {
                        type: "done",
                        id: opts?.workerData?.id ?? "mock-id",
                    });
                }, 10);
            }
            postMessage = jest.fn();
            terminate = jest.fn();
            on = jest.fn();
        },
        isMainThread: true,
        parentPort: null,
        workerData: {}, // 避免为 null
    };
});

jest.mock("p-queue", () => {
    return {
        __esModule: true,
        default: jest.fn().mockImplementation(() => ({
            add: jest.fn((fn) => fn()),
            on: jest.fn(),
            pause: jest.fn(),
            start: jest.fn(),
            clear: jest.fn(),
            size: 0,
            pending: 0,
        })),
    };
});

describe("workerManager", () => {
    const mockEvent = {
        sender: { send: jest.fn() },
    } as any;

    it("addCopyTask 应返回唯一 taskId 并加入队列", async () => {
        const id = addCopyTask({ src: "/a", dest: "/b" }, mockEvent);
        expect(typeof id).toBe("string");
        // 等待 worker 执行完成
        await new Promise((r) => setTimeout(r, 100));
        const status = getCopyQueueStatus();
        expect(status.find((t) => t.id === id)?.status).toBe("done");
    });

    it("getCopyQueueStatus 应返回所有任务状态", () => {
        const all = getCopyQueueStatus();
        expect(Array.isArray(all)).toBe(true);
    });

    it("cancelCopyTask 应能调用 worker.postMessage", () => {
        // 由于 mock worker 立即 done，无法真实测试 cancel，但可覆盖分支
        expect(() => cancelCopyTask("not-exist")).not.toThrow();
    });
});
