import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import type { CopyWorkerMessage } from "@commando/shared/types/CopyTypes";

export type FileOperationType = "copy" | "move";
export type OperationStatus =
    "pending" | "running" | "completed" | "error" | "cancelled";

export interface ConflictResolution {
    action: "overwrite" | "skip" | "rename" | "cancel";
    applyToAll: boolean;
    newName?: string;
}

export interface ConflictInfo {
    source: string;
    destination: string;
    sourceSize?: number;
    destinationSize?: number;
    sourceModified?: number;
    destinationModified?: number;
}

export interface FileOperation {
    id: string;
    type: FileOperationType;
    source: string[];
    destination: string;
    progress: number;
    status: OperationStatus;
    error?: string;
    sourcePane?: 0 | 1;
    targetPane?: 0 | 1;
    currentFile?: string;
    totalFiles: number;
    completedFiles: number;
    startTime: number;
    estimatedTimeRemaining?: number;
    conflicts: ConflictInfo[];
    conflictResolutions: { [key: string]: ConflictResolution };
    retryCount: number;
    maxRetries: number;
    failedFiles: string[];
    skippedFiles: string[];
}

export interface BatchOperation {
    id: string;
    tasks: string[];
    totalFiles: number;
    completedFiles: number;
    overallProgress: number;
    status: OperationStatus;
    startTime: number;
}

export interface FileOperationsState {
    activeOperations: { [taskId: string]: FileOperation };
    batchOperations: { [batchId: string]: BatchOperation };
    operationHistory: FileOperation[];
}

const initialState: FileOperationsState = {
    activeOperations: {},
    batchOperations: {},
    operationHistory: [],
};

const fileOperationsSlice = createSlice({
    name: "fileOperations",
    initialState,
    reducers: {
        startOperation(
            state,
            action: PayloadAction<{
                id: string;
                type: FileOperationType;
                source: string[];
                destination: string;
                sourcePane?: 0 | 1;
                targetPane?: 0 | 1;
                maxRetries?: number;
            }>
        ) {
            const {
                id,
                type,
                source,
                destination,
                sourcePane,
                targetPane,
                maxRetries = 3,
            } = action.payload;
            state.activeOperations[id] = {
                id,
                type,
                source,
                destination,
                progress: 0,
                status: "pending",
                sourcePane,
                targetPane,
                totalFiles: source.length,
                completedFiles: 0,
                startTime: Date.now(),
                conflicts: [],
                conflictResolutions: {},
                retryCount: 0,
                maxRetries,
                failedFiles: [],
                skippedFiles: [],
            };
        },
        updateOperationProgress(
            state,
            action: PayloadAction<{
                id: string;
                progress: number;
                currentFile?: string;
                completedFiles?: number;
                estimatedTimeRemaining?: number;
            }>
        ) {
            const {
                id,
                progress,
                currentFile,
                completedFiles,
                estimatedTimeRemaining,
            } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.progress = progress;
                operation.status = "running";
                if (currentFile !== undefined)
                    operation.currentFile = currentFile;
                if (completedFiles !== undefined)
                    operation.completedFiles = completedFiles;
                if (estimatedTimeRemaining !== undefined)
                    operation.estimatedTimeRemaining = estimatedTimeRemaining;
            }
        },
        completeOperation(state, action: PayloadAction<{ id: string }>) {
            const { id } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.status = "completed";
                operation.progress = 100;
                operation.completedFiles = operation.totalFiles;
                // Move to history
                state.operationHistory.unshift(operation);
                // Keep only last 50 operations in history
                if (state.operationHistory.length > 50) {
                    state.operationHistory = state.operationHistory.slice(
                        0,
                        50
                    );
                }
                // Remove from active operations
                delete state.activeOperations[id];
            }
        },
        failOperation(
            state,
            action: PayloadAction<{ id: string; error: string }>
        ) {
            const { id, error } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.status = "error";
                operation.error = error;
                // Move to history
                state.operationHistory.unshift(operation);
                // Remove from active operations
                delete state.activeOperations[id];
            }
        },
        addConflicts(
            state,
            action: PayloadAction<{ id: string; conflicts: ConflictInfo[] }>
        ) {
            const { id, conflicts } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.conflicts = conflicts;
            }
        },
        resolveConflicts(
            state,
            action: PayloadAction<{
                id: string;
                resolutions: { [key: string]: ConflictResolution };
            }>
        ) {
            const { id, resolutions } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.conflictResolutions = {
                    ...operation.conflictResolutions,
                    ...resolutions,
                };
            }
        },
        retryOperation(state, action: PayloadAction<{ id: string }>) {
            const { id } = action.payload;
            const operation = state.activeOperations[id];
            if (operation && operation.retryCount < operation.maxRetries) {
                operation.retryCount += 1;
                operation.status = "pending";
                operation.error = undefined;
            }
        },
        addFailedFile(
            state,
            action: PayloadAction<{ id: string; file: string }>
        ) {
            const { id, file } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.failedFiles.push(file);
            }
        },
        addSkippedFile(
            state,
            action: PayloadAction<{ id: string; file: string }>
        ) {
            const { id, file } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.skippedFiles.push(file);
            }
        },
        cancelOperation(state, action: PayloadAction<{ id: string }>) {
            const { id } = action.payload;
            const operation = state.activeOperations[id];
            if (operation) {
                operation.status = "cancelled";
                // Move to history
                state.operationHistory.unshift(operation);
                // Remove from active operations
                delete state.activeOperations[id];
            }
        },
        startBatchOperation(
            state,
            action: PayloadAction<{
                id: string;
                tasks: string[];
                totalFiles: number;
            }>
        ) {
            const { id, tasks, totalFiles } = action.payload;
            state.batchOperations[id] = {
                id,
                tasks,
                totalFiles,
                completedFiles: 0,
                overallProgress: 0,
                status: "pending",
                startTime: Date.now(),
            };
        },
        updateBatchProgress(
            state,
            action: PayloadAction<{
                id: string;
                completedFiles: number;
                overallProgress: number;
            }>
        ) {
            const { id, completedFiles, overallProgress } = action.payload;
            const batch = state.batchOperations[id];
            if (batch) {
                batch.completedFiles = completedFiles;
                batch.overallProgress = overallProgress;
                batch.status = "running";
            }
        },
        completeBatchOperation(state, action: PayloadAction<{ id: string }>) {
            const { id } = action.payload;
            const batch = state.batchOperations[id];
            if (batch) {
                batch.status = "completed";
                batch.overallProgress = 100;
                batch.completedFiles = batch.totalFiles;
                // Remove from active batches after a delay (handled by UI)
            }
        },
        removeBatchOperation(state, action: PayloadAction<{ id: string }>) {
            const { id } = action.payload;
            delete state.batchOperations[id];
        },
        clearOperationHistory(state) {
            state.operationHistory = [];
        },
    },
});

// 异步 thunk 用于执行复制操作
export const executeCopyOperation = createAsyncThunk(
    "fileOperations/executeCopy",
    async (
        params: {
            sources: string[];
            destination: string;
            operationType: FileOperationType;
            sourcePane?: 0 | 1;
            targetPane?: 0 | 1;
        },
        { dispatch, getState: _getState }
    ) => {
        const operationId = `${params.operationType}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

        // 启动操作
        dispatch(
            startOperation({
                id: operationId,
                type: params.operationType,
                source: params.sources,
                destination: params.destination,
                sourcePane: params.sourcePane,
                targetPane: params.targetPane,
            })
        );

        try {
            // 调用复制 API
            const taskId = await window.fsApi.copyBatch(
                params.sources,
                params.destination
            );

            // 监听进度事件
            window.fsApi.onCopyBatchProgress((msg: CopyWorkerMessage) => {
                if (msg.type !== "progress" || msg.taskId !== taskId) {
                    return;
                }
                dispatch(
                    updateOperationProgress({
                        id: operationId,
                        progress:
                            msg.total > 0
                                ? Math.round((msg.copied / msg.total) * 100)
                                : 0,
                        currentFile: msg.file,
                        completedFiles: msg.copied,
                    })
                );
            });

            return { operationId, taskId };
        } catch (error) {
            dispatch(
                failOperation({
                    id: operationId,
                    error:
                        error instanceof Error ? error.message : String(error),
                })
            );
            throw error;
        }
    }
);

export const {
    startOperation,
    updateOperationProgress,
    completeOperation,
    failOperation,
    cancelOperation,
    startBatchOperation,
    updateBatchProgress,
    completeBatchOperation,
    removeBatchOperation,
    clearOperationHistory,
    addConflicts,
    resolveConflicts,
    retryOperation,
    addFailedFile,
    addSkippedFile,
} = fileOperationsSlice.actions;

export default fileOperationsSlice.reducer;
