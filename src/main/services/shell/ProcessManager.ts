/**
 * 进程管理器
 * 提供系统进程监控和管理功能
 */

import * as os from "os";
import { ProcessInfo } from "./types";
import logger from "../../log/logger";

export class ProcessManager {
    /**
     * 获取系统进程列表
     */
    async getProcessList(): Promise<ProcessInfo[]> {
        try {
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            // 使用ps命令获取进程信息
            const command =
                process.platform === "win32"
                    ? "wmic process get ProcessId,Name,CommandLine,WorkingSetSize,CreationDate /format:csv"
                    : "ps -eo pid,comm,pcpu,pmem,etime,cmd --no-headers";

            const { stdout } = await execAsync(command);
            return await this.parseProcessList(
                stdout,
                process.platform === "win32"
            );
        } catch (error) {
            logger.error("获取进程列表失败", { error });
            return [];
        }
    }

    /**
     * 根据PID获取进程信息
     */
    async getProcessInfo(pid: number): Promise<ProcessInfo | null> {
        try {
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            const command =
                process.platform === "win32"
                    ? `wmic process where ProcessId=${pid} get ProcessId,Name,CommandLine,WorkingSetSize,CreationDate /format:csv`
                    : `ps -p ${pid} -o pid,comm,pcpu,pmem,etime,cmd --no-headers`;

            const { stdout } = await execAsync(command);
            const processes = await this.parseProcessList(
                stdout,
                process.platform === "win32"
            );
            return processes.length > 0 ? processes[0] : null;
        } catch (error) {
            logger.error(`获取进程信息失败: PID ${pid}`, { error });
            return null;
        }
    }

    /**
     * 终止进程
     */
    async killProcess(
        pid: number,
        signal: string = "SIGTERM"
    ): Promise<boolean> {
        try {
            const { exec } = await import("child_process");
            const { promisify } = await import("util");
            const execAsync = promisify(exec);

            const command =
                process.platform === "win32"
                    ? `taskkill /PID ${pid} /F`
                    : `kill -${signal} ${pid}`;

            await execAsync(command);
            logger.info(`进程已终止: PID ${pid}, 信号: ${signal}`);
            return true;
        } catch (error) {
            logger.error(`终止进程失败: PID ${pid}`, { error });
            return false;
        }
    }

    /**
     * 检查进程是否存在
     */
    async isProcessRunning(pid: number): Promise<boolean> {
        try {
            const processInfo = await this.getProcessInfo(pid);
            return processInfo !== null;
        } catch (error) {
            logger.error(`检查进程状态失败: PID ${pid}`, { error });
            return false;
        }
    }

    /**
     * 获取系统资源使用情况
     */
    async getSystemResources(): Promise<{
        cpuUsage: number;
        memoryUsage: number;
        totalMemory: number;
        freeMemory: number;
    }> {
        try {
            const cpus = os.cpus();
            const totalMemory = os.totalmem();
            const freeMemory = os.freemem();
            const usedMemory = totalMemory - freeMemory;

            // 计算CPU使用率（简化版本）
            let cpuUsage = 0;
            if (cpus.length > 0) {
                const cpu = cpus[0];
                const total =
                    cpu.times.user +
                    cpu.times.nice +
                    cpu.times.sys +
                    cpu.times.idle +
                    cpu.times.irq;
                cpuUsage = ((total - cpu.times.idle) / total) * 100;
            }

            return {
                cpuUsage: Math.round(cpuUsage * 100) / 100,
                memoryUsage:
                    Math.round((usedMemory / totalMemory) * 100 * 100) / 100,
                totalMemory,
                freeMemory,
            };
        } catch (error) {
            logger.error("获取系统资源信息失败", { error });
            return {
                cpuUsage: 0,
                memoryUsage: 0,
                totalMemory: 0,
                freeMemory: 0,
            };
        }
    }

    /**
     * 解析进程列表输出
     */
    private async parseProcessList(
        output: string,
        isWindows: boolean
    ): Promise<ProcessInfo[]> {
        const processes: ProcessInfo[] = [];
        const lines = output
            .trim()
            .split("\n")
            .filter(line => line.trim());

        for (const line of lines) {
            try {
                const processInfo = isWindows
                    ? this.parseWindowsProcessLine(line)
                    : await this.parseUnixProcessLine(line);

                if (processInfo) {
                    processes.push(processInfo);
                }
            } catch (error) {
                logger.warn?.("解析进程信息失败", {
                    line,
                    error:
                        error instanceof Error ? error.message : String(error),
                });
            }
        }

        return processes;
    }

    /**
     * 解析Windows进程行
     */
    private parseWindowsProcessLine(line: string): ProcessInfo | null {
        // Windows CSV格式: Node,ProcessId,Name,CommandLine,WorkingSetSize,CreationDate
        const parts = line.split(",");
        if (parts.length < 6) return null;

        const pid = parseInt(parts[1]);
        const name = parts[2];
        const command = parts[3] || "";
        const memory = parseInt(parts[4]) || 0;
        const creationDate = parts[5];

        if (isNaN(pid) || !name) return null;

        return {
            pid,
            name,
            cpu: 0, // Windows需要额外计算
            memory,
            startTime: new Date(creationDate),
            command,
            cwd: "", // Windows需要额外获取
        };
    }

    /**
     * 解析Unix进程行
     */
    private async parseUnixProcessLine(
        line: string
    ): Promise<ProcessInfo | null> {
        // Unix格式: PID COMM %CPU %MEM ELAPSED CMD
        const parts = line.trim().split(/\s+/);
        if (parts.length < 6) return null;

        const pid = parseInt(parts[0]);
        const name = parts[1];
        const cpu = parseFloat(parts[2]) || 0;
        const memory = parseFloat(parts[3]) || 0;
        const elapsed = parts[4];
        const command = parts.slice(5).join(" ");

        if (isNaN(pid) || !name) return null;

        // 解析运行时间
        const startTime = this.parseElapsedTime(elapsed);

        return {
            pid,
            name,
            cpu,
            memory: Math.round((memory / 100) * os.totalmem()),
            startTime,
            command,
            cwd: "", // Unix需要额外获取
        };
    }

    /**
     * 解析运行时间
     */
    private parseElapsedTime(elapsed: string): Date {
        const now = new Date();

        // 格式: HH:MM:SS 或 DD-HH:MM:SS
        if (elapsed.includes("-")) {
            // 包含天数
            const [days, time] = elapsed.split("-");
            const [hours, minutes, seconds] = time.split(":").map(Number);
            const totalMs =
                (parseInt(days) * 24 * 60 * 60 +
                    hours * 60 * 60 +
                    minutes * 60 +
                    seconds) *
                1000;
            return new Date(now.getTime() - totalMs);
        } else {
            // 只有时间
            const [hours, minutes, seconds] = elapsed.split(":").map(Number);
            const totalMs = (hours * 60 * 60 + minutes * 60 + seconds) * 1000;
            return new Date(now.getTime() - totalMs);
        }
    }
}
