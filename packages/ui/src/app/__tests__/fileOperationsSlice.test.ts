import fileOperationsReducer, {
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
} from "../fileOperationsSlice";

// Import the state type from the slice
type FileOperationsState = ReturnType<typeof fileOperationsReducer>;

describe("fileOperationsSlice", () => {
    const initialState = {
        activeOperations: {},
        batchOperations: {},
        operationHistory: [],
    };

    it("should return the initial state", () => {
        expect(fileOperationsReducer(undefined, { type: "unknown" })).toEqual(
            initialState
        );
    });

    describe("single operations", () => {
        it("should handle startOperation", () => {
            const operationData = {
                id: "op-1",
                type: "copy" as const,
                source: ["/path/to/file.txt"],
                destination: "/path/to/dest",
                sourcePane: 0 as const,
                targetPane: 1 as const,
            };

            const state = fileOperationsReducer(
                initialState,
                startOperation(operationData)
            );

            expect(state.activeOperations["op-1"]).toMatchObject({
                id: "op-1",
                type: "copy",
                source: ["/path/to/file.txt"],
                destination: "/path/to/dest",
                sourcePane: 0,
                targetPane: 1,
                progress: 0,
                status: "pending",
                totalFiles: 1,
                completedFiles: 0,
            });
            expect(state.activeOperations["op-1"].startTime).toBeGreaterThan(0);
        });

        it("should handle updateOperationProgress", () => {
            let state = fileOperationsReducer(
                initialState,
                startOperation({
                    id: "op-1",
                    type: "copy",
                    source: ["/path/to/file.txt"],
                    destination: "/path/to/dest",
                })
            );

            state = fileOperationsReducer(
                state,
                updateOperationProgress({
                    id: "op-1",
                    progress: 50,
                    currentFile: "/path/to/file.txt",
                    completedFiles: 0,
                    estimatedTimeRemaining: 30000,
                })
            );

            expect(state.activeOperations["op-1"]).toMatchObject({
                progress: 50,
                status: "running",
                currentFile: "/path/to/file.txt",
                completedFiles: 0,
                estimatedTimeRemaining: 30000,
            });
        });

        it("should handle completeOperation", () => {
            let state = fileOperationsReducer(
                initialState,
                startOperation({
                    id: "op-1",
                    type: "copy",
                    source: ["/path/to/file.txt"],
                    destination: "/path/to/dest",
                })
            );

            state = fileOperationsReducer(
                state,
                completeOperation({ id: "op-1" })
            );

            expect(state.activeOperations["op-1"]).toBeUndefined();
            expect(state.operationHistory).toHaveLength(1);
            expect(state.operationHistory[0]).toMatchObject({
                id: "op-1",
                status: "completed",
                progress: 100,
                completedFiles: 1,
            });
        });

        it("should handle failOperation", () => {
            let state = fileOperationsReducer(
                initialState,
                startOperation({
                    id: "op-1",
                    type: "copy",
                    source: ["/path/to/file.txt"],
                    destination: "/path/to/dest",
                })
            );

            state = fileOperationsReducer(
                state,
                failOperation({
                    id: "op-1",
                    error: "Permission denied",
                })
            );

            expect(state.activeOperations["op-1"]).toBeUndefined();
            expect(state.operationHistory).toHaveLength(1);
            expect(state.operationHistory[0]).toMatchObject({
                id: "op-1",
                status: "error",
                error: "Permission denied",
            });
        });

        it("should handle cancelOperation", () => {
            let state = fileOperationsReducer(
                initialState,
                startOperation({
                    id: "op-1",
                    type: "copy",
                    source: ["/path/to/file.txt"],
                    destination: "/path/to/dest",
                })
            );

            state = fileOperationsReducer(
                state,
                cancelOperation({ id: "op-1" })
            );

            expect(state.activeOperations["op-1"]).toBeUndefined();
            expect(state.operationHistory).toHaveLength(1);
            expect(state.operationHistory[0]).toMatchObject({
                id: "op-1",
                status: "cancelled",
            });
        });
    });

    describe("batch operations", () => {
        it("should handle startBatchOperation", () => {
            const batchData = {
                id: "batch-1",
                tasks: ["task-1", "task-2"],
                totalFiles: 10,
            };

            const state = fileOperationsReducer(
                initialState,
                startBatchOperation(batchData)
            );

            expect(state.batchOperations["batch-1"]).toMatchObject({
                id: "batch-1",
                tasks: ["task-1", "task-2"],
                totalFiles: 10,
                completedFiles: 0,
                overallProgress: 0,
                status: "pending",
            });
            expect(state.batchOperations["batch-1"].startTime).toBeGreaterThan(
                0
            );
        });

        it("should handle updateBatchProgress", () => {
            let state = fileOperationsReducer(
                initialState,
                startBatchOperation({
                    id: "batch-1",
                    tasks: ["task-1"],
                    totalFiles: 10,
                })
            );

            state = fileOperationsReducer(
                state,
                updateBatchProgress({
                    id: "batch-1",
                    completedFiles: 5,
                    overallProgress: 50,
                })
            );

            expect(state.batchOperations["batch-1"]).toMatchObject({
                completedFiles: 5,
                overallProgress: 50,
                status: "running",
            });
        });

        it("should handle completeBatchOperation", () => {
            let state = fileOperationsReducer(
                initialState,
                startBatchOperation({
                    id: "batch-1",
                    tasks: ["task-1"],
                    totalFiles: 10,
                })
            );

            state = fileOperationsReducer(
                state,
                completeBatchOperation({ id: "batch-1" })
            );

            expect(state.batchOperations["batch-1"]).toMatchObject({
                status: "completed",
                overallProgress: 100,
                completedFiles: 10,
            });
        });

        it("should handle removeBatchOperation", () => {
            let state = fileOperationsReducer(
                initialState,
                startBatchOperation({
                    id: "batch-1",
                    tasks: ["task-1"],
                    totalFiles: 10,
                })
            );

            state = fileOperationsReducer(
                state,
                removeBatchOperation({ id: "batch-1" })
            );

            expect(state.batchOperations["batch-1"]).toBeUndefined();
        });
    });

    describe("operation history", () => {
        it("should limit operation history to 50 items", () => {
            let state: FileOperationsState = { ...initialState };

            // Add 52 operations to history
            for (let i = 0; i < 52; i++) {
                state = fileOperationsReducer(
                    state,
                    startOperation({
                        id: `op-${i}`,
                        type: "copy",
                        source: [`/file-${i}.txt`],
                        destination: "/dest",
                    })
                );

                state = fileOperationsReducer(
                    state,
                    completeOperation({ id: `op-${i}` })
                );
            }

            expect(state.operationHistory).toHaveLength(50);
            expect(state.operationHistory[0].id).toBe("op-51"); // Most recent first
            expect(state.operationHistory[49].id).toBe("op-2"); // Oldest kept
        });

        it("should handle clearOperationHistory", () => {
            let state = fileOperationsReducer(
                initialState,
                startOperation({
                    id: "op-1",
                    type: "copy",
                    source: ["/file.txt"],
                    destination: "/dest",
                })
            );

            state = fileOperationsReducer(
                state,
                completeOperation({ id: "op-1" })
            );
            expect(state.operationHistory).toHaveLength(1);

            state = fileOperationsReducer(state, clearOperationHistory());
            expect(state.operationHistory).toHaveLength(0);
        });
    });
});
