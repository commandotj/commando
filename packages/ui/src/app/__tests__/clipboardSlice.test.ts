import clipboardReducer, {
    copyFiles,
    cutFiles,
    clearClipboard,
    pasteCompleted,
} from "../clipboardSlice";

describe("clipboardSlice", () => {
    const initialState = {
        items: [],
        operation: null,
        sourcePane: null,
        timestamp: 0,
    };

    it("should return the initial state", () => {
        expect(clipboardReducer(undefined, { type: "unknown" })).toEqual(
            initialState
        );
    });

    it("should handle copyFiles", () => {
        const files = ["/path/to/file1.txt", "/path/to/file2.txt"];
        const sourcePane = 0 as const;
        const action = copyFiles({ files, sourcePane });

        const state = clipboardReducer(initialState, action);

        expect(state.items).toEqual(files);
        expect(state.operation).toBe("copy");
        expect(state.sourcePane).toBe(sourcePane);
        expect(state.timestamp).toBeGreaterThan(0);
    });

    it("should handle cutFiles", () => {
        const files = ["/path/to/file1.txt"];
        const sourcePane = 1 as const;
        const action = cutFiles({ files, sourcePane });

        const state = clipboardReducer(initialState, action);

        expect(state.items).toEqual(files);
        expect(state.operation).toBe("cut");
        expect(state.sourcePane).toBe(sourcePane);
        expect(state.timestamp).toBeGreaterThan(0);
    });

    it("should handle clearClipboard", () => {
        const stateWithData = {
            items: ["/path/to/file.txt"],
            operation: "copy" as const,
            sourcePane: 0 as const,
            timestamp: Date.now(),
        };

        const state = clipboardReducer(stateWithData, clearClipboard());

        expect(state).toEqual(initialState);
    });

    it("should handle pasteCompleted for cut operations", () => {
        const stateWithCutData = {
            items: ["/path/to/file.txt"],
            operation: "cut" as const,
            sourcePane: 0 as const,
            timestamp: Date.now(),
        };

        const state = clipboardReducer(stateWithCutData, pasteCompleted());

        expect(state).toEqual(initialState);
    });

    it("should not clear clipboard on pasteCompleted for copy operations", () => {
        const stateWithCopyData = {
            items: ["/path/to/file.txt"],
            operation: "copy" as const,
            sourcePane: 0 as const,
            timestamp: Date.now(),
        };

        const state = clipboardReducer(stateWithCopyData, pasteCompleted());

        expect(state).toEqual(stateWithCopyData);
    });

    it("should overwrite existing clipboard data when copying new files", () => {
        const initialFiles = ["/path/to/old.txt"];
        const newFiles = ["/path/to/new1.txt", "/path/to/new2.txt"];

        let state = clipboardReducer(
            initialState,
            copyFiles({
                files: initialFiles,
                sourcePane: 0,
            })
        );

        state = clipboardReducer(
            state,
            copyFiles({
                files: newFiles,
                sourcePane: 1,
            })
        );

        expect(state.items).toEqual(newFiles);
        expect(state.sourcePane).toBe(1);
    });
});
