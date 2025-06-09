import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";

interface FileEntry {
    name: string;
    isDirectory: boolean;
    size?: number;
}

interface PaneState {
    currentPath: string;
    entries: FileEntry[];
}

interface FileManagerState {
    panes: [PaneState, PaneState];
}

const initialState: FileManagerState = {
    panes: [
        { currentPath: "", entries: [] },
        { currentPath: "", entries: [] },
    ],
};

export const fetchDirectory = createAsyncThunk(
    "fileManager/fetchDirectory",
    async (
        { paneIndex, path }: { paneIndex: 0 | 1; path: string },
        { dispatch }
    ) => {
        // @ts-expect-ignore
        const entries = await window.fsApi.listDir(path);
        dispatch(setPanePath({ paneIndex, path }));
        dispatch(setPaneEntries({ paneIndex, entries }));
        return entries;
    }
);

const fileManagerSlice = createSlice({
    name: "fileManager",
    initialState,
    reducers: {
        setPanePath(
            state,
            action: PayloadAction<{ paneIndex: 0 | 1; path: string }>
        ) {
            if (action.payload.path) {
                state.panes[action.payload.paneIndex].currentPath =
                    action.payload.path;
            }
        },
        setPaneEntries(
            state,
            action: PayloadAction<{ paneIndex: 0 | 1; entries: FileEntry[] }>
        ) {
            state.panes[action.payload.paneIndex].entries =
                action.payload.entries;
        },
    },
});

export const { setPanePath, setPaneEntries } = fileManagerSlice.actions;
export default fileManagerSlice.reducer;
