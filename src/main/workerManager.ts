// @ts-ignore
const PQueue = require("p-queue");
const QueueCtor = PQueue.default || PQueue;
import { Worker } from "worker_threads";
import { IpcMainInvokeEvent } from "electron";
import { randomUUID } from "crypto";
import workerPath from "./copyWorker?modulePath";

// 复制任务类型
type CopyTaskParams = { src: string; dest: string };
export type CopyTaskStatus = "pending" | "running" | "done" | "error";

interface TaskMeta {
    id: string;
    params: CopyTaskParams;
    status: CopyTaskStatus;
    error?: string;
}

// 全局队列和任务状态表
const queue = new QueueCtor({ concurrency: 1 }); // 串行队列
const tasks: Map<string, TaskMeta> = new Map();
const activeWorkers: Map<string, Worker> = new Map(); // 活跃 worker

/**
 * 添加复制任务到队列，返回唯一 taskId
 * @param params 复制参数
 * @param event IPC 事件对象（用于推送进度）
 */
export function addCopyTask(
    params: CopyTaskParams,
    event: IpcMainInvokeEvent
): string {
    const id = randomUUID();
    const meta: TaskMeta = { id, params, status: "pending" };
    tasks.set(id, meta);
    queue.add(() => runCopyWorker(id, params, event));
    return id;
}

/**
 * 运行单个复制任务，调度 worker 并推送进度
 */
async function runCopyWorker(
    id: string,
    params: CopyTaskParams,
    event: IpcMainInvokeEvent
): Promise<void> {
    const meta = tasks.get(id);
    if (!meta) return;
    meta.status = "running";
    return new Promise((resolve) => {
        const worker = new Worker(workerPath, { workerData: params });
        activeWorkers.set(id, worker);
        worker.on("message", (msg) => {
            // 进度/完成/异常均带上 taskId
            event.sender.send("copy-progress", { taskId: id, ...msg });
            if (msg.type === "done") {
                meta.status = "done";
                resolve();
                worker.terminate();
                activeWorkers.delete(id);
            } else if (msg.type === "error") {
                meta.status = "error";
                meta.error = msg.error;
                resolve();
                worker.terminate();
                activeWorkers.delete(id);
            }
        });
        worker.on("error", (err) => {
            meta.status = "error";
            meta.error = err.message;
            event.sender.send("copy-progress", {
                taskId: id,
                type: "error",
                error: err.message,
            });
            resolve();
            worker.terminate();
            activeWorkers.delete(id);
        });
        worker.on("exit", (code) => {
            if (code !== 0 && meta.status !== "error") {
                meta.status = "error";
                meta.error = `Worker exited with code ${code}`;
                event.sender.send("copy-progress", {
                    taskId: id,
                    type: "error",
                    error: meta.error,
                });
            }
            resolve();
            activeWorkers.delete(id);
        });
    });
}

/**
 * 查询所有任务状态
 */
export function getCopyQueueStatus(): TaskMeta[] {
    return Array.from(tasks.values());
}

/**
 * 取消任务（预留，需 worker 支持中断）
 */
export function cancelCopyTask(taskId: string): void {
    const worker = activeWorkers.get(taskId);
    if (worker) {
        worker.postMessage({ type: "cancel" });
        // worker 退出后会自动清理 activeWorkers 引用
    }
}

/**
 * 单文件复制任务，支持进度回调（用于批量复制）
 */
export function addCopyTaskWithProgress(
    src: string,
    dest: string,
    onProgress: (msg: ProgressMsg | DoneMsg | ErrorMsg) => void
): Promise<void> {
    return new Promise((resolve, reject) => {
        const worker = new Worker(workerPath, { workerData: { src, dest } });
        worker.on("message", (msg) => {
            onProgress(msg);
            if (msg.type === "done") {
                resolve();
                worker.terminate();
            } else if (msg.type === "error") {
                reject(new Error(msg.error));
                worker.terminate();
            }
        });
        worker.on("error", (err) => {
            onProgress({ type: "error", error: err.message });
            reject(err);
            worker.terminate();
        });
        worker.on("exit", (code) => {
            if (code !== 0) {
                onProgress({
                    type: "error",
                    error: `Worker exited with code ${code}`,
                });
                reject(new Error(`Worker exited with code ${code}`));
            }
        });
    });
}

// 详细注释：
// 1. 所有复制请求通过 addCopyTask 加入队列，自动排队串行执行。
// 2. 每个任务分配唯一 taskId，进度/完成/异常均带 taskId 推送到前端。
// 3. cancelCopyTask 可精确中断指定任务，worker 端会清理流和未完成文件。
// 4. 支持后续扩展多 worker 并发、优先级、任务取消等。
