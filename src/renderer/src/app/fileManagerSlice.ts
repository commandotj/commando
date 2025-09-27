import { createSlice, PayloadAction, createAsyncThunk } from "@reduxjs/toolkit";
import type { DirectoryEntry } from "@common/types/DirectoryTypes";

// 使用与DirectoryService一致的接口
interface FileEntry extends DirectoryEntry {
  // 保持向后兼容
}

interface PaneState {
  currentPath: string;
  entries: FileEntry[];
  selectedKeys: string[];
}

interface FileManagerState {
  panes: [PaneState, PaneState];
  activePane: 0 | 1;
}

const initialState: FileManagerState = {
  panes: [
    { currentPath: "", entries: [], selectedKeys: [] },
    { currentPath: "", entries: [], selectedKeys: [] },
  ],
  activePane: 0,
};

export const fetchDirectory = createAsyncThunk(
  "fileManager/fetchDirectory",
  async (
    {
      paneIndex,
      path,
      options,
    }: {
      paneIndex: 0 | 1;
      path: string;
      options?: {
        includeHidden?: boolean;
        sortBy?: "name" | "size" | "mtime" | "type";
        sortOrder?: "asc" | "desc";
        includePermissions?: boolean;
      };
    },
    { dispatch },
  ) => {
    // 使用新的DirectoryService API
    const entries: FileEntry[] = await window.fsApi.listDir(path, options);
    dispatch(setPanePath({ paneIndex, path }));
    dispatch(setPaneEntries({ paneIndex, entries }));
    return entries;
  },
);

// 新增：目录导航操作
export const navigateToDirectory = createAsyncThunk(
  "fileManager/navigateToDirectory",
  async (
    {
      paneIndex,
      path,
      addToHistory = true,
    }: {
      paneIndex: 0 | 1;
      path: string;
      addToHistory?: boolean;
    },
    { dispatch },
  ) => {
    const result = await window.fsApi.navigate(path, addToHistory);
    if (result.success) {
      dispatch(setPanePath({ paneIndex, path: result.path }));
      dispatch(setPaneEntries({ paneIndex, entries: result.entries }));
    }
    return result;
  },
);

// 新增：刷新当前目录
export const refreshDirectory = createAsyncThunk(
  "fileManager/refreshDirectory",
  async ({ paneIndex }: { paneIndex: 0 | 1 }, { dispatch }) => {
    const entries = await window.fsApi.refresh();
    dispatch(setPaneEntries({ paneIndex, entries }));
    return entries;
  },
);

// 新增：导航到父目录
export const goToParentDirectory = createAsyncThunk(
  "fileManager/goToParentDirectory",
  async ({ paneIndex }: { paneIndex: 0 | 1 }, { dispatch }) => {
    const result = await window.fsApi.goToParent();
    if (result.success) {
      dispatch(setPanePath({ paneIndex, path: result.path }));
      dispatch(setPaneEntries({ paneIndex, entries: result.entries }));
    }
    return result;
  },
);

const fileManagerSlice = createSlice({
  name: "fileManager",
  initialState,
  reducers: {
    setPanePath(
      state,
      action: PayloadAction<{ paneIndex: 0 | 1; path: string }>,
    ) {
      if (action.payload.path) {
        state.panes[action.payload.paneIndex].currentPath = action.payload.path;
      }
    },
    setPaneEntries(
      state,
      action: PayloadAction<{ paneIndex: 0 | 1; entries: FileEntry[] }>,
    ) {
      state.panes[action.payload.paneIndex].entries = action.payload.entries;
    },
    setPaneSelectedKeys(
      state,
      action: PayloadAction<{ paneIndex: 0 | 1; selectedKeys: string[] }>,
    ) {
      state.panes[action.payload.paneIndex].selectedKeys =
        action.payload.selectedKeys;
    },
    setActivePane(state, action: PayloadAction<0 | 1>) {
      state.activePane = action.payload;
    },
  },
});

export const {
  setPanePath,
  setPaneEntries,
  setPaneSelectedKeys,
  setActivePane,
} = fileManagerSlice.actions;

export default fileManagerSlice.reducer;
