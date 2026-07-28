import { useAppDispatch } from "../app/hooks";
import type { RootState } from "../app/store";
import {
    startOperation,
    addConflicts,
    resolveConflicts,
    retryOperation,
    addFailedFile,
    addSkippedFile,
    ConflictInfo,
    ConflictResolution,
} from "../app/fileOperationsSlice";

export class EnhancedFileOperationService {
    private dispatch: ReturnType<typeof useAppDispatch>;
    private getState: () => RootState;

    constructor(
        dispatch: ReturnType<typeof useAppDispatch>,
        getState: () => RootState
    ) {
        this.dispatch = dispatch;
        this.getState = getState;
    }

    /**
     * 启动增强的文件操作
     */
    async startEnhancedOperation(params: {
        type: "copy" | "move";
        sources: string[];
        destination: string;
        sourcePane?: 0 | 1;
        targetPane?: 0 | 1;
        maxRetries?: number;
    }) {
        const operationId = `${params.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 启动操作
        this.dispatch(
            startOperation({
                id: operationId,
                type: params.type,
                source: params.sources,
                destination: params.destination,
                sourcePane: params.sourcePane,
                targetPane: params.targetPane,
                maxRetries: params.maxRetries || 3,
            })
        );

        // 检测冲突
        const conflicts = await this.detectConflicts(
            params.sources,
            params.destination
        );
        if (conflicts.length > 0) {
            this.dispatch(addConflicts({ id: operationId, conflicts }));
            return { operationId, hasConflicts: true, conflicts };
        }

        // 执行操作
        return this.executeOperation(operationId, params);
    }

    /**
     * 检测文件冲突
     */
    private async detectConflicts(
        sources: string[],
        destination: string
    ): Promise<ConflictInfo[]> {
        const conflicts: ConflictInfo[] = [];

        for (const source of sources) {
            const fileName = source.split("/").pop() || "";
            const targetPath = `${destination}/${fileName}`;

            try {
                // 检查目标文件是否存在 - 使用 listDir 来检查
                const targetDir = destination;
                const targetFileName = source.split("/").pop() || "";
                const targetDirContents = await window.fsApi.listDir(targetDir);
                const targetExists = targetDirContents.some(
                    entry => entry.name === targetFileName
                );

                if (targetExists) {
                    // 获取文件信息进行对比 - 使用 listDir 返回的信息
                    const sourceDir = source.substring(
                        0,
                        source.lastIndexOf("/")
                    );
                    const sourceFileName = source.split("/").pop() || "";
                    const sourceDirContents =
                        await window.fsApi.listDir(sourceDir);
                    const _sourceEntry = sourceDirContents.find(
                        entry => entry.name === sourceFileName
                    );
                    const _targetEntry = targetDirContents.find(
                        entry => entry.name === targetFileName
                    );

                    conflicts.push({
                        source,
                        destination: targetPath,
                        sourceSize: _sourceEntry?.size,
                        destinationSize: _targetEntry?.size,
                        sourceModified: _sourceEntry?.mtime,
                        destinationModified: _targetEntry?.mtime,
                    });
                }
            } catch (error) {
                console.warn("检测冲突时出错:", error);
            }
        }

        return conflicts;
    }

    /**
     * 执行文件操作
     */
    private async executeOperation(
        operationId: string,
        params: {
            type: "copy" | "move";
            sources: string[];
            destination: string;
        }
    ) {
        try {
            if (params.type === "copy") {
                await window.fsApi.copyBatch(
                    params.sources,
                    params.destination
                );
            } else {
                // 移动操作需要先复制再删除
                await window.fsApi.copyBatch(
                    params.sources,
                    params.destination
                );
                // TODO: 实现删除源文件
            }

            return { operationId, success: true };
        } catch (error) {
            const errorMessage =
                error instanceof Error ? error.message : String(error);
            // 处理错误
            const state = this.getState();
            const operation =
                state.fileOperations.activeOperations[operationId];

            if (operation && operation.retryCount < operation.maxRetries) {
                // 可以重试
                this.dispatch(retryOperation({ id: operationId }));
                return { operationId, needsRetry: true, error: errorMessage };
            } else {
                // 重试次数已满，标记为失败
                this.dispatch(
                    addFailedFile({
                        id: operationId,
                        file: params.sources[0], // 简化处理，实际应该记录所有失败的文件
                    })
                );
                return { operationId, success: false, error: errorMessage };
            }
        }
    }

    /**
     * 处理冲突解决
     */
    handleConflictResolution(
        operationId: string,
        resolutions: { [key: string]: ConflictResolution }
    ) {
        this.dispatch(resolveConflicts({ id: operationId, resolutions }));

        // 根据解决方案执行操作
        const state = this.getState();
        const operation = state.fileOperations.activeOperations[operationId];

        if (operation) {
            const resolvedSources: string[] = [];
            const skippedFiles: string[] = [];

            for (const source of operation.source) {
                const resolution = resolutions[source];
                if (!resolution) continue;

                switch (resolution.action) {
                    case "overwrite":
                        resolvedSources.push(source);
                        break;
                    case "rename":
                        if (resolution.newName) {
                            // 重命名源文件路径
                            const newPath = source.replace(
                                /[^/]+$/,
                                resolution.newName
                            );
                            resolvedSources.push(newPath);
                        }
                        break;
                    case "skip":
                        skippedFiles.push(source);
                        break;
                    case "cancel":
                        // 取消操作
                        return { cancelled: true };
                }
            }

            if (skippedFiles.length > 0) {
                this.dispatch(
                    addSkippedFile({ id: operationId, file: skippedFiles[0] })
                );
            }

            // 继续执行操作
            return this.executeOperation(operationId, {
                type: operation.type,
                sources: resolvedSources,
                destination: operation.destination,
            });
        }
    }

    /**
     * 处理重试
     */
    handleRetry(operationId: string) {
        this.dispatch(retryOperation({ id: operationId }));

        const state = this.getState();
        const operation = state.fileOperations.activeOperations[operationId];

        if (operation) {
            return this.executeOperation(operationId, {
                type: operation.type,
                sources: operation.source,
                destination: operation.destination,
            });
        }
    }

    /**
     * 处理跳过文件
     */
    handleSkipFile(operationId: string, fileName: string) {
        this.dispatch(addSkippedFile({ id: operationId, file: fileName }));

        const state = this.getState();
        const operation = state.fileOperations.activeOperations[operationId];

        if (operation) {
            // 从源列表中移除跳过的文件
            const remainingSources = operation.source.filter(
                source => !source.includes(fileName)
            );

            if (remainingSources.length === 0) {
                // 所有文件都被跳过，操作完成
                return { completed: true, allSkipped: true };
            }

            // 继续处理剩余文件
            return this.executeOperation(operationId, {
                type: operation.type,
                sources: remainingSources,
                destination: operation.destination,
            });
        }
    }
}
