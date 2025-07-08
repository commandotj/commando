import PQueue from "p-queue";
/**
 * 解决 p-queue 类型错误
 * PQueue 是默认导出的，所以需要使用 default 属性, 但是 typescript 会报错，所以需要使用 any 类型
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const QueueCtor = (PQueue as any).default || PQueue;

import { Worker } from "worker_threads";
import { IpcMainInvokeEvent } from "electron";
import { randomUUID } from "crypto";
import workerPath from "./copyWorker?modulePath";
import type { CopyParams, CopyWorkerMessage } from "../../typings/copy";

// 复制任务类型
export type CopyTaskStatus = "pending" | "running" | "done" | "error";

interface TaskMeta {
    id: string;
    params: CopyParams;
    status: CopyTaskStatus;
    error?: string;
    onProgress?: (msg: CopyWorkerMessage) => void;
}

// 全局队列和任务状态表
const queue = new QueueCtor({ concurrency: 1 }); // 串行队列
const tasks: Map<string, TaskMeta> = new Map();
const activeWorkers: Map<string, Worker> = new Map(); // 活跃 worker

type AddTaskOptions =
    | {
          params: CopyParams;
          event: IpcMainInvokeEvent;
          onProgress?: never; // onProgress 和 event 互斥
      }
    | {
          params: CopyParams;
          event?: never;
          onProgress: (msg: CopyWorkerMessage) => void;
      };

/**
 * 添加复制任务到队列，返回唯一 taskId
 * @param options 包含复制参数、onProgress 回调或 IPC 事件对象
 */
export function addCopyTask(options: AddTaskOptions): string {
    const id = randomUUID();
    const meta: TaskMeta = {
        id,
        params: options.params,
        status: "pending",
        onProgress: options.onProgress,
    };
    tasks.set(id, meta);
    queue.add(() => runCopyWorker(id, options.params, options.event));
    return id;
}

/**
 * 运行单个复制任务，调度 worker 并推送进度
 */
async function runCopyWorker(
    id: string,
    params: CopyParams,
    event?: IpcMainInvokeEvent
): Promise<void> {
    const meta = tasks.get(id);
    if (!meta) return;

    meta.status = "running";

    const cleanup = (): void => {
        tasks.delete(id);
        activeWorkers.delete(id);
    };

    return new Promise((resolve) => {
        const worker = new Worker(workerPath, { workerData: params });
        activeWorkers.set(id, worker);

        const handleMessage = (msg: CopyWorkerMessage): void => {
            // 优先使用 onProgress 回调
            if (meta.onProgress) {
                meta.onProgress(msg);
            } else if (event) {
                // 其次使用 IPC event 推送
                event.sender.send("copy-progress", { taskId: id, ...msg });
            }

            if (msg.type === "done") {
                meta.status = "done";
                resolve();
                worker.terminate();
                cleanup();
            } else if (msg.type === "error") {
                meta.status = "error";
                meta.error = msg.error;
                resolve();
                worker.terminate();
                cleanup();
            }
        };

        worker.on("message", handleMessage);

        worker.on("error", (err) => {
            meta.status = "error";
            meta.error = err.message;
            const errorMsg: CopyWorkerMessage = {
                type: "error",
                error: err.message,
            };

            // 统一处理错误消息
            handleMessage(errorMsg);

            resolve();
            worker.terminate();
            cleanup();
        });

        worker.on("exit", (code) => {
            if (
                code !== 0 &&
                meta.status !== "done" &&
                meta.status !== "error"
            ) {
                meta.status = "error";
                meta.error = `Worker exited with code ${code}`;
                const errorMsg: CopyWorkerMessage = {
                    type: "error",
                    error: meta.error,
                };
                // 统一处理退出消息
                handleMessage(errorMsg);
            }
            resolve();
            cleanup();
        });
    });
}

/**
 * 查询所有任务状态
 */
export function getCopyQueueStatus(): Omit<TaskMeta, "onProgress">[] {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return Array.from(tasks.values()).map(({ onProgress, ...rest }) => rest);
}

/**
 * 取消任务（预留，需 worker 支持中断）
 */
export function cancelCopyTask(taskId: string): void {
    const worker = activeWorkers.get(taskId);
    if (worker) {
        worker.postMessage({ type: "cancel" });
        // worker 退出后会自动清理 activeWorkers 和 tasks 引用
    }
}
