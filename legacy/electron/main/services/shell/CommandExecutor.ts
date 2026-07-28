/**
 * 命令执行器
 * 提供安全的shell命令执行功能
 */

import { spawn, exec, ChildProcess } from "child_process";
import { promisify } from "util";
import { CommandExecutionOptions, CommandExecutionResult } from "./types";
import { SecurityValidator } from "./SecurityValidator";
import { logger } from "../../engine/laozi";

const execAsync = promisify(exec);

export class CommandExecutor {
    /** 活跃进程映射 */
    private activeProcesses = new Map<number, ChildProcess>();

    /**
     * 执行shell命令（同步）
     */
    async executeCommand(
        command: string,
        options: CommandExecutionOptions = {}
    ): Promise<CommandExecutionResult> {
        const startTime = Date.now();

        // 安全验证
        const securityResult = SecurityValidator.validateCommand(command);
        SecurityValidator.logSecurityEvent("command", command, securityResult);

        if (!securityResult.safe) {
            return {
                success: false,
                exitCode: -1,
                stdout: "",
                stderr: securityResult.riskDescription,
                duration: Date.now() - startTime,
                error: securityResult.recommendation,
            };
        }

        try {
            logger.info(`执行命令: ${command}`, {
                cwd: options.cwd,
                timeout: options.timeout,
            });

            const execOptions = {
                cwd: options.cwd || process.cwd(),
                env: { ...process.env, ...options.env },
                timeout: options.timeout || 30000, // 默认30秒超时
                maxBuffer: options.maxOutputLength || 1024 * 1024, // 默认1MB
            };

            const { stdout, stderr } = await execAsync(command, execOptions);
            const duration = Date.now() - startTime;

            logger.info(`命令执行完成`, {
                command,
                duration,
                stdoutLength: stdout.length,
                stderrLength: stderr.length,
            });

            return {
                success: true,
                exitCode: 0,
                stdout: options.silent ? "" : stdout,
                stderr: options.silent ? "" : stderr,
                duration,
            };
        } catch (error: any) {
            const duration = Date.now() - startTime;
            const errorMessage = error.message || String(error);

            logger.error(`命令执行失败: ${command}`, {
                error: errorMessage,
                duration,
                exitCode: error.code,
            });

            return {
                success: false,
                exitCode: error.code || -1,
                stdout: error.stdout || "",
                stderr: error.stderr || errorMessage,
                duration,
                error: errorMessage,
            };
        }
    }

    /**
     * 执行shell命令（异步）
     */
    async executeCommandAsync(
        command: string,
        options: CommandExecutionOptions = {},
        onOutput?: (data: string) => void,
        onError?: (data: string) => void
    ): Promise<{
        process: ChildProcess;
        promise: Promise<CommandExecutionResult>;
    }> {
        const startTime = Date.now();

        // 安全验证
        const securityResult = SecurityValidator.validateCommand(command);
        SecurityValidator.logSecurityEvent("command", command, securityResult);

        if (!securityResult.safe) {
            const errorResult: CommandExecutionResult = {
                success: false,
                exitCode: -1,
                stdout: "",
                stderr: securityResult.riskDescription,
                duration: 0,
                error: securityResult.recommendation,
            };

            return {
                process: null as any,
                promise: Promise.resolve(errorResult),
            };
        }

        return new Promise(resolve => {
            const childProcess = spawn(command, {
                shell: true,
                cwd: options.cwd || process.cwd(),
                env: { ...process.env, ...options.env },
            });

            let stdout = "";
            let stderr = "";

            // 存储进程引用
            this.activeProcesses.set(childProcess.pid!, childProcess);

            // 处理输出
            childProcess.stdout?.on("data", data => {
                const output = data.toString();
                stdout += output;
                if (!options.silent && onOutput) {
                    onOutput(output);
                }
            });

            childProcess.stderr?.on("data", data => {
                const output = data.toString();
                stderr += output;
                if (!options.silent && onError) {
                    onError(output);
                }
            });

            // 处理进程结束
            const promise = new Promise<CommandExecutionResult>(
                resolvePromise => {
                    childProcess.on("close", code => {
                        const duration = Date.now() - startTime;
                        this.activeProcesses.delete(childProcess.pid!);

                        logger.info(`异步命令执行完成`, {
                            command,
                            exitCode: code,
                            duration,
                            stdoutLength: stdout.length,
                            stderrLength: stderr.length,
                        });

                        resolvePromise({
                            success: code === 0,
                            exitCode: code || 0,
                            stdout: options.silent ? "" : stdout,
                            stderr: options.silent ? "" : stderr,
                            duration,
                            pid: childProcess.pid,
                        });
                    });

                    childProcess.on("error", error => {
                        const duration = Date.now() - startTime;
                        this.activeProcesses.delete(childProcess.pid!);

                        logger.error(`异步命令执行错误: ${command}`, {
                            error: error.message,
                            duration,
                        });

                        resolvePromise({
                            success: false,
                            exitCode: -1,
                            stdout: options.silent ? "" : stdout,
                            stderr: options.silent ? "" : stderr,
                            duration,
                            error: error.message,
                            pid: childProcess.pid,
                        });
                    });

                    // 设置超时
                    if (options.timeout) {
                        setTimeout(() => {
                            if (
                                childProcess.pid &&
                                this.activeProcesses.has(childProcess.pid)
                            ) {
                                logger.warn(
                                    `命令执行超时，强制终止: ${command}`
                                );
                                this.killProcess(childProcess.pid);
                            }
                        }, options.timeout);
                    }
                }
            );

            resolve({ process: childProcess, promise });
        });
    }

    /**
     * 终止进程
     */
    killProcess(pid: number): boolean {
        const process = this.activeProcesses.get(pid);
        if (process) {
            try {
                process.kill("SIGTERM");
                this.activeProcesses.delete(pid);
                logger.info(`进程已终止: PID ${pid}`);
                return true;
            } catch (error) {
                logger.error(`终止进程失败: PID ${pid}`, { error });
                return false;
            }
        }
        return false;
    }

    /**
     * 获取活跃进程列表
     */
    getActiveProcesses(): number[] {
        return Array.from(this.activeProcesses.keys());
    }

    /**
     * 清理所有活跃进程
     */
    cleanup(): void {
        logger.info(`清理活跃进程: ${this.activeProcesses.size} 个`);
        for (const [pid, process] of this.activeProcesses) {
            try {
                process.kill("SIGTERM");
            } catch (error) {
                logger.warn(`清理进程失败: PID ${pid}`, { error });
            }
        }
        this.activeProcesses.clear();
    }
}
