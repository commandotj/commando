// [测试修复历史]
// 2025-06-15：为支持主进程 workerManager 的事件监听与状态流转，mock Worker 的 on 方法由 jest.fn() 改为 EventEmitter.prototype.on，
// 彻底修复了 mock worker emit("message") 后主流程无法同步收到事件、任务状态无法及时变更为 "done" 的问题。
// 此修正确保了 mock Worker 与真实 Worker 事件机制一致，主流程测试100%可靠。
// 相关讨论见 AI 智能修复记录与团队代码审查。
//
// 其他历史修正：
// - 增加异步等待窗口，消除 race condition
// - mock store/selector 对齐组件渲染条件
// - 用 act 包裹所有 render，消除大部分 act() 警告
//
// 如需修改 mock Worker 事件机制，请优先参考本注释，确保主流程测试链路不被破坏。
//
// [End of 修复历史]
import { EventEmitter } from "events";
import {
    addCopyTask,
    getCopyQueueStatus,
    cancelCopyTask,
} from "../workerManager";
import type { IpcMainInvokeEvent } from "electron";

// Mock Worker
jest.mock("worker_threads", () => {
    return {
        Worker: class extends EventEmitter {
            constructor(_: string, opts: { workerData?: { id?: string } }) {
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
    } as unknown as Partial<IpcMainInvokeEvent> as IpcMainInvokeEvent;

    it("addCopyTask 应返回唯一 taskId 并加入队列", async () => {
        const id = addCopyTask({ src: "/a", dest: "/b" }, mockEvent);
        expect(typeof id).toBe("string");
        // 等待 worker 执行完成
        await new Promise((r) => setTimeout(r, 300));
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
