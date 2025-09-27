import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import type { DriveInfo } from "@common/types/DriveTypes";

interface DriveState {
  drives: DriveInfo[];
  loading: boolean;
  error: string | null;
  loadingMessage: string;
  lastUpdateTime: number | null;
}

const initialState: DriveState = {
  drives: [],
  loading: false,
  error: null,
  loadingMessage: "",
  lastUpdateTime: null,
};

// 异步 thunk 用于获取驱动器列表
export const fetchDrives = createAsyncThunk("drive/fetchDrives", async () => {
  const drives = await window.fsApi.listDrives();
  return drives;
});

// 异步 thunk 用于刷新驱动器列表
export const refreshDrives = createAsyncThunk(
  "drive/refreshDrives",
  async () => {
    const drives = await window.fsApi.listDrives();
    return drives;
  },
);

// 异步 thunk 用于获取驱动器详情
export const fetchDriveDetails = createAsyncThunk(
  "drive/fetchDriveDetails",
  async (device: string) => {
    const details = await window.fsApi.getDriveDetails(device);
    return details;
  },
);

const driveSlice = createSlice({
  name: "drive",
  initialState,
  reducers: {
    // 手动设置加载状态（用于 IPC 事件）
    setLoading: (
      state,
      action: PayloadAction<{
        loading: boolean;
        message?: string;
        error?: boolean;
      }>,
    ) => {
      state.loading = action.payload.loading;
      if (action.payload.message) {
        state.loadingMessage = action.payload.message;
      }
      if (action.payload.error) {
        state.error = action.payload.message || "未知错误";
      } else if (!action.payload.loading) {
        state.error = null;
        state.loadingMessage = "";
      }
    },
    // 更新驱动器列表（用于 IPC 事件）
    updateDrives: (state, action: PayloadAction<DriveInfo[]>) => {
      state.drives = action.payload;
      state.lastUpdateTime = Date.now();
      state.error = null;
    },
    // 清除错误
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // 处理 fetchDrives
    builder
      .addCase(fetchDrives.pending, (state) => {
        state.loading = true;
        state.loadingMessage = "正在扫描磁盘驱动器...";
        state.error = null;
      })
      .addCase(fetchDrives.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMessage = "";
        state.drives = action.payload;
        state.lastUpdateTime = Date.now();
        state.error = null;
      })
      .addCase(fetchDrives.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = "";
        state.error = action.error.message || "获取驱动器列表失败";
      });

    // 处理 refreshDrives
    builder
      .addCase(refreshDrives.pending, (state) => {
        state.loading = true;
        state.loadingMessage = "正在刷新驱动器列表...";
        state.error = null;
      })
      .addCase(refreshDrives.fulfilled, (state, action) => {
        state.loading = false;
        state.loadingMessage = "";
        state.drives = action.payload;
        state.lastUpdateTime = Date.now();
        state.error = null;
      })
      .addCase(refreshDrives.rejected, (state, action) => {
        state.loading = false;
        state.loadingMessage = "";
        state.error = action.error.message || "刷新驱动器列表失败";
      });
  },
});

export const { setLoading, updateDrives, clearError } = driveSlice.actions;
export default driveSlice.reducer;
