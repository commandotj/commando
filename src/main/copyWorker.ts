import { parentPort, workerData } from "worker_threads";
import fs from "fs";
// import path from "path"; // 未使用，移除

// 复制参数类型
interface CopyParams {
    src: string;
    dest: string;
}

// 进度消息类型
interface ProgressMsg {
    type: "progress";
    copied: number;
    total: number;
}

// 完成/错误消息类型
interface DoneMsg {
    type: "done";
}
interface ErrorMsg {
    type: "error";
    error: string;
}

const { src, dest } = workerData as CopyParams;

let readStream: fs.ReadStream | null = null;
let writeStream: fs.WriteStream | null = null;
let canceled = false;

function sendProgress(copied: number, total: number): void {
    parentPort?.postMessage({ type: "progress", copied, total } as ProgressMsg);
}
function sendDone(): void {
    parentPort?.postMessage({ type: "done" } as DoneMsg);
}
function sendError(error: string): void {
    parentPort?.postMessage({ type: "error", error } as ErrorMsg);
}

// 监听主进程取消消息
parentPort?.on("message", (msg) => {
    if (msg && msg.type === "cancel") {
        canceled = true;
        // 关闭流
        try {
            readStream?.destroy();
        } catch {}
        try {
            writeStream?.destroy();
        } catch {}
        // 删除未完成目标文件
        try {
            fs.unlinkSync(dest);
        } catch {}
        sendError("canceled");
        process.exit(0);
    }
});

function copyFileWithProgress(src: string, dest: string): void {
    try {
        const total = fs.statSync(src).size;
        let copied = 0;
        readStream = fs.createReadStream(src);
        writeStream = fs.createWriteStream(dest);

        readStream.on("data", (chunk) => {
            if (canceled) return;
            copied += chunk.length;
            sendProgress(copied, total);
        });
        readStream.on("error", (err: Error) => {
            sendError(err.message);
        });
        writeStream.on("error", (err: Error) => {
            sendError(err.message);
        });
        writeStream.on("close", () => {
            if (!canceled) sendDone();
        });
        readStream.pipe(writeStream);
    } catch (err) {
        if (err instanceof Error) {
            sendError(err.message);
        } else {
            sendError("Unknown error");
        }
    }
}

/**
 * 立即执行主任务：
 * 该 worker 线程为"一次性任务型"，主进程创建 worker 时通过 workerData 传递参数（src, dest）。
 * worker 启动后无需等待主线程消息，直接开始文件复制任务。
 * 任务完成后自动退出，主进程可通过监听 worker 的 'exit'、'message' 事件获取进度与结果。
 * 这是 Node.js worker thread 处理独立任务的标准用法，适合"启动即执行"场景。
 */
copyFileWithProgress(src, dest);
