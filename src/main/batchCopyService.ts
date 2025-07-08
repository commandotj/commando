import { randomUUID } from "crypto";
import { IpcMainInvokeEvent } from "electron";
import { addCopyTask, cancelCopyTask } from "./workerManager";
import logger from "./logger";
import type { CopyWorkerMessage } from "../../typings/copy";

interface BatchTask {
    id: string;
    workerTaskIds: Set<string>;
    isCanceled: boolean;
}

const activeBatchTasks: Map<string, BatchTask> = new Map();

/**
 * 批量复制服务。
 * 为每个源文件创建一个复制任务，并将其添加到 workerManager 队列中。
 * @param srcs 文件/目录路径数组
 * @param dest 目标目录
 * @param event IpcMainInvokeEvent，用于向渲染器进程发送进度更新
 * @returns Promise<string> 返回批量任务的唯一 ID (batchId)
 */
export async function batchCopy({
    srcs,
    dest,
    event,
}: {
    srcs: string[];
    dest: string;
    event: IpcMainInvokeEvent;
}): Promise<string> {
    if (!Array.isArray(srcs) || typeof dest !== "string") {
        logger.error("batchCopy 参数错误", { srcs, dest });
        throw new Error("Invalid parameters for batchCopy");
    }

    const batchId = randomUUID();
    const batchTask: BatchTask = {
        id: batchId,
        workerTaskIds: new Set(),
        isCanceled: false,
    };
    activeBatchTasks.set(batchId, batchTask);

    let completedCount = 0;
    const total = srcs.length;

    logger.info(`批量复制任务开始`, { batchId, total });

    for (const src of srcs) {
        if (batchTask.isCanceled) {
            logger.warn("批量任务已取消，终止添加新文件", { batchId, src });
            break;
        }

        const taskId = addCopyTask({
            params: { src, dest: `${dest}/${src.split("/").pop()}` }, // 假设目标是目录
            onProgress: (msg: CopyWorkerMessage) => {
                // 聚合进度并发送
                event.sender.send("copy-batch-progress", {
                    batchId,
                    type: "progress",
                    file: src,
                    fileProgress: msg,
                    completedCount:
                        msg.type === "done"
                            ? completedCount + 1
                            : completedCount,
                    total,
                });

                if (msg.type === "done") {
                    completedCount++;
                    logger.info(`文件复制完成`, { batchId, src });
                    // 从批处理中移除单个任务ID，因为它已完成
                    batchTask.workerTaskIds.delete(taskId);
                } else if (msg.type === "error") {
                    logger.error(`文件复制出错`, {
                        batchId,
                        src,
                        error: msg.error,
                    });
                }
            },
        });
        batchTask.workerTaskIds.add(taskId);
    }

    // 监控任务完成状态
    const checkCompletion = setInterval(() => {
        if (batchTask.workerTaskIds.size === 0 || batchTask.isCanceled) {
            clearInterval(checkCompletion);
            const status = batchTask.isCanceled ? "canceled" : "done";
            logger.info(`批量复制任务结束`, { batchId, status });
            event.sender.send("copy-batch-progress", {
                batchId,
                type: "done",
                status,
                completedCount,
                total,
            });
            activeBatchTasks.delete(batchId);
        }
    }, 100);

    return batchId;
}

/**
 * 取消一个批量复制任务。
 * @param batchId 要取消的批量任务的 ID
 */
export function cancelBatchCopy(batchId: string): void {
    const batchTask = activeBatchTasks.get(batchId);
    if (batchTask) {
        logger.warn(`正在取消批量复制任务`, { batchId });
        batchTask.isCanceled = true;
        batchTask.workerTaskIds.forEach((taskId) => {
            cancelCopyTask(taskId);
        });
        // 清理将在 checkCompletion 轮询中完成
    }
}
