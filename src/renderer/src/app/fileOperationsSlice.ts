import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type FileOperationType = "copy" | "move";
export type OperationStatus =
    | "pending"
    | "running"
    | "completed"
    | "error"
    | "cancelled";

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
            }>
        ) {
            const { id, type, source, destination, sourcePane, targetPane } =
                action.payload;
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
} = fileOperationsSlice.actions;

export default fileOperationsSlice.reducer;
