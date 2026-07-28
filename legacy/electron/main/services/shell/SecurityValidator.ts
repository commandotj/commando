/**
 * Shell 安全验证器
 * 提供命令和路径的安全验证功能
 */

import path from "path";
import { SecurityValidationResult } from "./types";
import { logger } from "../../engine/laozi";

export class SecurityValidator {
    /** 危险命令黑名单 */
    private static readonly DANGEROUS_COMMANDS = [
        "rm -rf /",
        "rm -rf /*",
        "format",
        "fdisk",
        "mkfs",
        "dd if=/dev/zero",
        "shutdown",
        "reboot",
        "halt",
        "poweroff",
        "init 0",
        "init 6",
        "sudo rm",
        "chmod 777",
        "chown -R",
        "> /dev/sda",
        "dd if=",
        "mkfs.ext",
        "fdisk /dev/",
    ];

    /** 危险路径模式 */
    private static readonly DANGEROUS_PATHS = [
        "/dev/",
        "/proc/",
        "/sys/",
        "/boot/",
        "/etc/passwd",
        "/etc/shadow",
        "/etc/sudoers",
        "/root/",
        "/var/log/",
    ];

    /** 允许的文件操作路径前缀 */
    private static readonly ALLOWED_PATH_PREFIXES = [
        process.cwd(),
        path.join(process.cwd(), ".."),
        "/tmp",
        "/var/tmp",
        process.env.HOME || "",
    ];

    /**
     * 验证命令安全性
     */
    static validateCommand(command: string): SecurityValidationResult {
        const normalizedCommand = command.trim().toLowerCase();

        // 检查危险命令
        for (const dangerousCmd of this.DANGEROUS_COMMANDS) {
            if (normalizedCommand.includes(dangerousCmd.toLowerCase())) {
                return {
                    safe: false,
                    riskLevel: "critical",
                    riskDescription: `检测到危险命令: ${dangerousCmd}`,
                    recommendation:
                        "此命令可能对系统造成不可逆的损害，请避免执行",
                };
            }
        }

        // 检查命令注入
        if (this.containsCommandInjection(command)) {
            return {
                safe: false,
                riskLevel: "high",
                riskDescription: "检测到可能的命令注入攻击",
                recommendation: "请避免使用特殊字符和管道操作符",
            };
        }

        // 检查路径遍历
        if (this.containsPathTraversal(command)) {
            return {
                safe: false,
                riskLevel: "high",
                riskDescription: "检测到路径遍历攻击",
                recommendation: "请使用相对路径或验证过的绝对路径",
            };
        }

        return {
            safe: true,
            riskLevel: "low",
            riskDescription: "命令安全性检查通过",
        };
    }

    /**
     * 验证路径安全性
     */
    static validatePath(filePath: string): SecurityValidationResult {
        const normalizedPath = path.resolve(filePath);

        // 检查危险路径
        for (const dangerousPath of this.DANGEROUS_PATHS) {
            if (normalizedPath.startsWith(dangerousPath)) {
                return {
                    safe: false,
                    riskLevel: "critical",
                    riskDescription: `访问危险路径: ${dangerousPath}`,
                    recommendation: "此路径包含系统关键文件，禁止访问",
                };
            }
        }

        // 检查是否在允许的路径范围内
        const isAllowed = this.ALLOWED_PATH_PREFIXES.some(prefix => {
            if (!prefix) return false;
            return normalizedPath.startsWith(path.resolve(prefix));
        });

        if (!isAllowed) {
            return {
                safe: false,
                riskLevel: "medium",
                riskDescription: "路径超出允许范围",
                recommendation: "请确保操作路径在项目目录或临时目录内",
            };
        }

        return {
            safe: true,
            riskLevel: "low",
            riskDescription: "路径安全性检查通过",
        };
    }

    /**
     * 验证文件操作安全性
     */
    static validateFileOperation(
        operation: string,
        sourcePath: string,
        destPath?: string
    ): SecurityValidationResult {
        // 验证源路径
        const sourceValidation = this.validatePath(sourcePath);
        if (!sourceValidation.safe) {
            return sourceValidation;
        }

        // 验证目标路径（如果存在）
        if (destPath) {
            const destValidation = this.validatePath(destPath);
            if (!destValidation.safe) {
                return destValidation;
            }
        }

        // 检查操作类型
        const dangerousOperations = ["delete", "move", "rename"];
        if (dangerousOperations.includes(operation.toLowerCase())) {
            return {
                safe: true,
                riskLevel: "medium",
                riskDescription: `执行${operation}操作，请确认操作正确性`,
                recommendation: "请仔细检查源路径和目标路径，避免误删重要文件",
            };
        }

        return {
            safe: true,
            riskLevel: "low",
            riskDescription: "文件操作安全性检查通过",
        };
    }

    /**
     * 检查命令注入
     */
    private static containsCommandInjection(command: string): boolean {
        const injectionPatterns = [
            /[;&|`$]/,
            /\$\(/,
            /\$\{/,
            /<\(/,
            />\(/,
            /&&/,
            /\|\|/,
            />>/,
            /<<</,
        ];

        return injectionPatterns.some(pattern => pattern.test(command));
    }

    /**
     * 检查路径遍历
     */
    private static containsPathTraversal(command: string): boolean {
        const traversalPatterns = [
            /\.\.\//,
            /\.\.\\/,
            /\.\./,
            /\/\.\./,
            /\\\.\./,
        ];

        return traversalPatterns.some(pattern => pattern.test(command));
    }

    /**
     * 记录安全验证日志
     */
    static logSecurityEvent(
        type: "command" | "path" | "file-operation",
        input: string,
        result: SecurityValidationResult
    ): void {
        if (!result.safe) {
            logger.warn(`安全验证失败 [${type}]`, {
                input,
                riskLevel: result.riskLevel,
                description: result.riskDescription,
                recommendation: result.recommendation,
            });
        } else {
            logger.debug(`安全验证通过 [${type}]`, {
                input,
                riskLevel: result.riskLevel,
            });
        }
    }
}
