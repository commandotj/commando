/**
 * 邹忌引擎 - 专注于比较分析
 *
 * 邹忌思想：
 * - 明察秋毫：精细的差异检测
 * - 直言进谏：如实报告比较结果
 * - 见微知著：从细节看出整体差异
 */

import type { BaseEngine, EngineCapability, EngineTask, EngineResult, EngineStatus, TaskProgress } from "../kongzi/KongziEngineManager"
import type { Logger } from "../shared/loggerTypes"
import logger from "../../../log/logger"
import * as gracefulFs from "graceful-fs"
import path from "path"
import * as crypto from "crypto"

export interface ZoujiEngineDeps {
    logger: Logger
    fs: typeof gracefulFs.promises
}

export interface ComparisonConfig {
    compareContent?: boolean
    compareAttributes?: boolean
    compareChecksums?: boolean
    ignoreWhitespace?: boolean
    caseSensitive?: boolean
    maxFileSize?: number
}

export interface ComparisonResult {
    identical: boolean
    differenceType: DifferenceType
    similarity: number
    differences: FileDifference[]
    recommendations: ComparisonRecommendation[]
    metadata: {
        duration: number
        filesCompared: number
        algorithm: string
    }
}

export enum DifferenceType {
    IDENTICAL = "identical",
    CONTENT_DIFFERENT = "content_different",
    ATTRIBUTES_DIFFERENT = "attributes_different",
    SIZE_DIFFERENT = "size_different",
    MISSING = "missing",
    TYPE_DIFFERENT = "type_different"
}

export interface FileDifference {
    type: DifferenceType
    path: string
    description: string
    severity: "low" | "medium" | "high"
    details?: {
        expected?: unknown
        actual?: unknown
        location?: string
    }
}

export interface ComparisonRecommendation {
    type: "sync" | "merge" | "review" | "skip"
    description: string
    confidence: number
    action?: string
}

/**
 * 邹忌比较引擎
 *
 * 实现理念：
 * - 明察：深入分析差异
 * - 直言：准确报告结果
 * - 见微知著：全面的比较策略
 */
export class ZoujiEngine implements BaseEngine {
    name = "ZoujiEngine"
    version = "1.0.0"

    capabilities: EngineCapability[] = [
        {
            type: "comparison",
            operations: ["compare", "diff", "analyze"],
            constraints: {
                performance: "medium",
                maxFileSize: 100 * 1024 * 1024 // 100MB
            }
        }
    ]

    private readonly deps: ZoujiEngineDeps
    private readonly comparisonCache = new Map<string, ComparisonResult>()
    private running = false
    private activeTasks = 0

    constructor(deps: ZoujiEngineDeps = { logger, fs: gracefulFs.promises }) {
        this.deps = deps
    }

    async initialize(): Promise<void> {
        this.deps.logger.info("邹忌比较引擎初始化完成")
    }

    async cleanup(): Promise<void> {
        this.comparisonCache.clear()
        this.deps.logger.info("邹忌比较引擎清理完成")
    }

    getStatus(): EngineStatus {
        return {
            running: this.running,
            activeTasks: this.activeTasks,
            queueSize: 0,
            errorCount: 0,
            lastActivity: new Date()
        }
    }

    async executeTask(task: EngineTask): Promise<EngineResult> {
        if (task.type !== "compare") {
            return {
                success: false,
                taskId: task.id,
                error: "邹忌引擎只支持比较操作"
            }
        }

        this.activeTasks++
        this.running = true

        try {
            const result = await this.performComparison(
                task.source!,
                task.destination!,
                task.options as ComparisonConfig || {},
                task.progressCallback
            )

            return {
                success: true,
                taskId: task.id,
                data: result,
                metrics: {
                    duration: result.metadata.duration,
                    filesProcessed: result.metadata.filesCompared
                }
            }
        } catch (error) {
            return {
                success: false,
                taskId: task.id,
                error: error instanceof Error ? error.message : String(error)
            }
        } finally {
            this.activeTasks--
            this.running = this.activeTasks > 0
        }
    }

    /**
     * 执行比较操作
     */
    private async performComparison(
        file1: string,
        file2: string,
        config: ComparisonConfig,
        progressCallback?: (progress: TaskProgress) => void
    ): Promise<ComparisonResult> {
        const startTime = Date.now()

        // 检查缓存
        const cacheKey = this.generateCacheKey(file1, file2, config)
        const cachedResult = this.comparisonCache.get(cacheKey)
        if (cachedResult) {
            this.deps.logger.debug("使用缓存的比较结果")
            return cachedResult
        }

        // 报告进度：开始比较
        if (progressCallback) {
            progressCallback({
                taskId: "",
                percentage: 0,
                currentFile: path.basename(file1),
                message: "开始比较文件"
            })
        }

        try {
            // 检查文件是否存在
            const [stats1, stats2] = await Promise.all([
                this.getFileStats(file1),
                this.getFileStats(file2)
            ])

            if (!stats1) {
                return this.createMissingFileResult(file1, file2, startTime)
            }

            if (!stats2) {
                return this.createMissingFileResult(file2, file1, startTime)
            }

            // 报告进度：文件属性比较
            if (progressCallback) {
                progressCallback({
                    taskId: "",
                    percentage: 25,
                    message: "比较文件属性"
                })
            }

            // 比较文件属性
            const attributeComparison = this.compareAttributes(stats1, stats2)

            // 报告进度：内容比较
            if (progressCallback) {
                progressCallback({
                    taskId: "",
                    percentage: 50,
                    message: "比较文件内容"
                })
            }

            // 比较文件内容
            let contentComparison: ContentComparison | null = null
            if (config.compareContent !== false && stats1.isFile() && stats2.isFile()) {
                contentComparison = await this.compareContent(file1, file2, config)
            }

            // 报告进度：生成结果
            if (progressCallback) {
                progressCallback({
                    taskId: "",
                    percentage: 75,
                    message: "生成比较结果"
                })
            }

            // 生成最终结果
            const result = this.generateComparisonResult(
                file1,
                file2,
                attributeComparison,
                contentComparison,
                startTime
            )

            // 缓存结果
            this.comparisonCache.set(cacheKey, result)

            // 报告进度：完成
            if (progressCallback) {
                progressCallback({
                    taskId: "",
                    percentage: 100,
                    message: "比较完成"
                })
            }

            return result

        } catch (error) {
            this.deps.logger.warn(`文件比较失败: ${file1} vs ${file2}`, { error })
            throw error
        }
    }

    /**
     * 获取文件统计信息
     */
    private async getFileStats(filePath: string): Promise<gracefulFs.Stats | null> {
        try {
            return await this.deps.fs.stat(filePath)
        } catch {
            return null
        }
    }

    /**
     * 比较文件属性
     */
    private compareAttributes(stats1: gracefulFs.Stats, stats2: gracefulFs.Stats): AttributeComparison {
        const differences: AttributeDifference[] = []

        // 比较文件大小
        if (stats1.size !== stats2.size) {
            differences.push({
                attribute: "size",
                value1: stats1.size,
                value2: stats2.size,
                severity: "high"
            })
        }

        // 比较修改时间
        if (Math.abs(stats1.mtime.getTime() - stats2.mtime.getTime()) > 1000) {
            differences.push({
                attribute: "mtime",
                value1: stats1.mtime,
                value2: stats2.mtime,
                severity: "medium"
            })
        }

        // 比较文件类型
        if (stats1.isFile() !== stats2.isFile() || stats1.isDirectory() !== stats2.isDirectory()) {
            differences.push({
                attribute: "type",
                value1: this.getFileType(stats1),
                value2: this.getFileType(stats2),
                severity: "high"
            })
        }

        return {
            identical: differences.length === 0,
            differences
        }
    }

    /**
     * 比较文件内容
     */
    private async compareContent(file1: string, file2: string, config: ComparisonConfig): Promise<ContentComparison> {
        // 检查文件大小限制
        const stats1 = await this.deps.fs.stat(file1)
        const stats2 = await this.deps.fs.stat(file2)

        if (config.maxFileSize && (stats1.size > config.maxFileSize || stats2.size > config.maxFileSize)) {
            return {
                identical: false,
                method: "size_limit_exceeded",
                similarity: 0,
                message: `文件大小超过限制 ${config.maxFileSize} 字节`
            }
        }

        // 如果启用校验和比较
        if (config.compareChecksums) {
            const [hash1, hash2] = await Promise.all([
                this.calculateFileHash(file1),
                this.calculateFileHash(file2)
            ])

            if (hash1 === hash2) {
                return {
                    identical: true,
                    method: "checksum",
                    similarity: 1.0
                }
            }
        }

        // 文本文件比较
        if (this.isTextFile(file1)) {
            return await this.compareTextContent(file1, file2, config)
        }

        // 二进制文件比较
        return await this.compareBinaryContent(file1, file2)
    }

    /**
     * 比较文本内容
     */
    private async compareTextContent(
        file1: string,
        file2: string,
        config: ComparisonConfig
    ): Promise<ContentComparison> {
        const [text1, text2] = await Promise.all([
            this.deps.fs.readFile(file1, "utf-8"),
            this.deps.fs.readFile(file2, "utf-8")
        ])

        let processedText1 = text1
        let processedText2 = text2

        // 处理空白字符
        if (config.ignoreWhitespace) {
            processedText1 = text1.replace(/\s+/g, " ").trim()
            processedText2 = text2.replace(/\s+/g, " ").trim()
        }

        // 处理大小写
        if (!config.caseSensitive) {
            processedText1 = processedText1.toLowerCase()
            processedText2 = processedText2.toLowerCase()
        }

        const identical = processedText1 === processedText2
        const similarity = this.calculateTextSimilarity(processedText1, processedText2)

        return {
            identical,
            method: "text",
            similarity,
            textDifferences: identical ? [] : await this.generateTextDiff(text1, text2)
        }
    }

    /**
     * 比较二进制内容
     */
    private async compareBinaryContent(file1: string, file2: string): Promise<ContentComparison> {
        const [buffer1, buffer2] = await Promise.all([
            this.deps.fs.readFile(file1),
            this.deps.fs.readFile(file2)
        ])

        const identical = buffer1.equals(buffer2)
        const similarity = identical ? 1.0 : this.calculateBinarySimilarity(buffer1, buffer2)

        return {
            identical,
            method: "binary",
            similarity
        }
    }

    /**
     * 生成文本差异
     */
    private async generateTextDiff(text1: string, text2: string): Promise<TextDifference[]> {
        const lines1 = text1.split('\n')
        const lines2 = text2.split('\n')
        const differences: TextDifference[] = []

        // 简单的行级差异检测
        const maxLines = Math.max(lines1.length, lines2.length)
        for (let i = 0; i < maxLines; i++) {
            const line1 = lines1[i] || ""
            const line2 = lines2[i] || ""

            if (line1 !== line2) {
                differences.push({
                    lineNumber: i + 1,
                    type: !line1 ? "added" : !line2 ? "removed" : "modified",
                    oldContent: line1,
                    newContent: line2
                })
            }
        }

        return differences
    }

    /**
     * 计算文本相似度
     */
    private calculateTextSimilarity(text1: string, text2: string): number {
        if (text1 === text2) return 1.0
        if (!text1 || !text2) return 0.0

        const longer = text1.length > text2.length ? text1 : text2
        const shorter = text1.length > text2.length ? text2 : text1

        if (longer.length === 0) return 1.0

        const editDistance = this.levenshteinDistance(longer, shorter)
        return (longer.length - editDistance) / longer.length
    }

    /**
     * 计算编辑距离
     */
    private levenshteinDistance(str1: string, str2: string): number {
        const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null))

        for (let i = 0; i <= str1.length; i++) matrix[0][i] = i
        for (let j = 0; j <= str2.length; j++) matrix[j][0] = j

        for (let j = 1; j <= str2.length; j++) {
            for (let i = 1; i <= str1.length; i++) {
                const substitutionCost = str1[i - 1] === str2[j - 1] ? 0 : 1
                matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1, // deletion
                    matrix[j - 1][i] + 1, // insertion
                    matrix[j - 1][i - 1] + substitutionCost // substitution
                )
            }
        }

        return matrix[str2.length][str1.length]
    }

    /**
     * 计算二进制相似度
     */
    private calculateBinarySimilarity(buffer1: Buffer, buffer2: Buffer): number {
        const maxLength = Math.max(buffer1.length, buffer2.length)
        if (maxLength === 0) return 1.0

        let sameBytes = 0
        for (let i = 0; i < maxLength; i++) {
            if (buffer1[i] === buffer2[i]) {
                sameBytes++
            }
        }

        return sameBytes / maxLength
    }

    /**
     * 生成比较结果
     */
    private generateComparisonResult(
        file1: string,
        _file2: string,
        attributeComparison: AttributeComparison,
        contentComparison: ContentComparison | null,
        startTime: number
    ): ComparisonResult {
        const differences: FileDifference[] = []

        // 添加属性差异
        attributeComparison.differences.forEach(diff => {
            differences.push({
                type: DifferenceType.ATTRIBUTES_DIFFERENT,
                path: file1,
                description: `${diff.attribute} 不同: ${diff.value1} vs ${diff.value2}`,
                severity: diff.severity,
                details: {
                    expected: diff.value1,
                    actual: diff.value2
                }
            })
        })

        // 添加内容差异
        if (contentComparison && !contentComparison.identical) {
            differences.push({
                type: DifferenceType.CONTENT_DIFFERENT,
                path: file1,
                description: `内容不同 (相似度: ${Math.round(contentComparison.similarity * 100)}%)`,
                severity: contentComparison.similarity > 0.8 ? "low" : contentComparison.similarity > 0.5 ? "medium" : "high"
            })
        }

        const identical = differences.length === 0
        const similarity = contentComparison?.similarity || (identical ? 1.0 : 0.0)
        const differenceType = this.determineDifferenceType(differences)

        return {
            identical,
            differenceType,
            similarity,
            differences,
            recommendations: this.generateRecommendations(differenceType, similarity, attributeComparison, contentComparison),
            metadata: {
                duration: Date.now() - startTime,
                filesCompared: 2,
                algorithm: "zouji_comparison_v1"
            }
        }
    }

    /**
     * 生成建议
     */
    private generateRecommendations(
        differenceType: DifferenceType,
        similarity: number,
        _attributeComparison: AttributeComparison,
        _contentComparison: ContentComparison | null
    ): ComparisonRecommendation[] {
        const recommendations: ComparisonRecommendation[] = []

        if (differenceType === DifferenceType.IDENTICAL) {
            recommendations.push({
                type: "skip",
                description: "文件完全相同，无需操作",
                confidence: 1.0
            })
        } else if (similarity > 0.9) {
            recommendations.push({
                type: "review",
                description: "文件高度相似，建议人工确认差异",
                confidence: 0.8,
                action: "手动检查微小差异"
            })
        } else if (similarity > 0.5) {
            recommendations.push({
                type: "merge",
                description: "文件部分相似，可能需要合并",
                confidence: 0.6,
                action: "使用合并工具处理差异"
            })
        } else {
            recommendations.push({
                type: "sync",
                description: "文件差异较大，建议同步",
                confidence: 0.7,
                action: "选择新版本覆盖"
            })
        }

        return recommendations
    }

    // 辅助方法
    private generateCacheKey(file1: string, file2: string, config: ComparisonConfig): string {
        return crypto.createHash("md5")
            .update(`${file1}:${file2}:${JSON.stringify(config)}`)
            .digest("hex")
    }

    private createMissingFileResult(missingFile: string, existingFile: string, startTime: number): ComparisonResult {
        return {
            identical: false,
            differenceType: DifferenceType.MISSING,
            similarity: 0,
            differences: [{
                type: DifferenceType.MISSING,
                path: missingFile,
                description: `文件不存在: ${missingFile}`,
                severity: "high"
            }],
            recommendations: [{
                type: "sync",
                description: "复制缺失的文件",
                confidence: 0.9,
                action: `从 ${existingFile} 复制`
            }],
            metadata: {
                duration: Date.now() - startTime,
                filesCompared: 1,
                algorithm: "zouji_comparison_v1"
            }
        }
    }

    private getFileType(stats: gracefulFs.Stats): string {
        if (stats.isFile()) return "file"
        if (stats.isDirectory()) return "directory"
        if (stats.isSymbolicLink()) return "symlink"
        return "unknown"
    }

    private isTextFile(filePath: string): boolean {
        const textExtensions = [".txt", ".md", ".js", ".ts", ".html", ".css", ".json", ".xml", ".yml", ".yaml"]
        const ext = path.extname(filePath).toLowerCase()
        return textExtensions.includes(ext)
    }

    private async calculateFileHash(filePath: string): Promise<string> {
        const buffer = await this.deps.fs.readFile(filePath)
        return crypto.createHash("md5").update(buffer).digest("hex")
    }

    private determineDifferenceType(differences: FileDifference[]): DifferenceType {
        if (differences.length === 0) return DifferenceType.IDENTICAL

        if (differences.some(d => d.type === DifferenceType.MISSING)) {
            return DifferenceType.MISSING
        }

        if (differences.some(d => d.type === DifferenceType.CONTENT_DIFFERENT)) {
            return DifferenceType.CONTENT_DIFFERENT
        }

        return DifferenceType.ATTRIBUTES_DIFFERENT
    }
}

// 辅助类型定义
interface AttributeComparison {
    identical: boolean
    differences: AttributeDifference[]
}

interface AttributeDifference {
    attribute: string
    value1: unknown
    value2: unknown
    severity: "low" | "medium" | "high"
}

interface ContentComparison {
    identical: boolean
    method: "checksum" | "text" | "binary" | "size_limit_exceeded"
    similarity: number
    message?: string
    textDifferences?: TextDifference[]
}

interface TextDifference {
    lineNumber: number
    type: "added" | "removed" | "modified"
    oldContent?: string
    newContent?: string
}