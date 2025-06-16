import { randomUUID } from "crypto";
import { IpcMainInvokeEvent, ipcMain } from "electron";
import { addCopyTaskWithProgress } from "./workerManager";

/**
 * 批量复制服务
 * @param srcs 文件/目录路径数组
 * @param dest 目标目录
 * @param event IpcMainInvokeEvent
 * @returns Promise<string> 返回 taskId
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
        throw new Error("Invalid parameters for batchCopy");
    }
    const taskId = randomUUID();
    let current = 0;
    const total = srcs.length;
    let canceled = false;
    // 支持取消
    ipcMain.once(`cancel-copy-batch-${taskId}`, () => {
        canceled = true;
    });
    for (const src of srcs) {
        if (canceled) break;
        try {
            await addCopyTaskWithProgress(
                src,
                dest,
                (msg: ProgressMsg | DoneMsg | ErrorMsg) => {
                    event.sender.send("copy-batch-progress", {
                        taskId,
                        type: "progress",
                        current: current + 1,
                        total,
                        file: src,
                        fileProgress: msg,
                        status: msg.type === "error" ? "error" : "running",
                    });
                }
            );
            current++;
        } catch (err) {
            event.sender.send("copy-batch-progress", {
                taskId,
                type: "progress",
                current: current + 1,
                total,
                file: src,
                fileProgress: {
                    error: err instanceof Error ? err.message : String(err),
                },
                status: "error",
            });
            // 可扩展：遇到错误是否中断/重试/跳过，由前端交互决定
        }
    }
    event.sender.send("copy-batch-progress", {
        taskId,
        type: "done",
        current,
        total,
        status: canceled ? "canceled" : "done",
    });
    return taskId;
}
