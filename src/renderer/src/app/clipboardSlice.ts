import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type ClipboardOperation = "copy" | "cut";

export interface ClipboardState {
    items: string[];
    operation: ClipboardOperation | null;
    sourcePane: 0 | 1 | null;
    timestamp: number;
}

const initialState: ClipboardState = {
    items: [],
    operation: null,
    sourcePane: null,
    timestamp: 0,
};

const clipboardSlice = createSlice({
    name: "clipboard",
    initialState,
    reducers: {
        copyFiles(
            state,
            action: PayloadAction<{ files: string[]; sourcePane: 0 | 1 }>
        ) {
            state.items = action.payload.files;
            state.operation = "copy";
            state.sourcePane = action.payload.sourcePane;
            state.timestamp = Date.now();
        },
        cutFiles(
            state,
            action: PayloadAction<{ files: string[]; sourcePane: 0 | 1 }>
        ) {
            state.items = action.payload.files;
            state.operation = "cut";
            state.sourcePane = action.payload.sourcePane;
            state.timestamp = Date.now();
        },
        clearClipboard(state) {
            state.items = [];
            state.operation = null;
            state.sourcePane = null;
            state.timestamp = 0;
        },
        pasteCompleted(state) {
            // Clear clipboard after successful paste for cut operations
            if (state.operation === "cut") {
                state.items = [];
                state.operation = null;
                state.sourcePane = null;
                state.timestamp = 0;
            }
        },
    },
});

export const { copyFiles, cutFiles, clearClipboard, pasteCompleted } =
    clipboardSlice.actions;

export default clipboardSlice.reducer;
