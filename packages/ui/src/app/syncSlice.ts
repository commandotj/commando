import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    CompareReport,
    SyncAction,
    SyncJobStatus,
    SyncOptions,
    SyncPlan,
} from "@commandojs/shared/types/SyncTypes";
import {
    DEFAULT_SYNC_OPTIONS,
    DEFAULT_SYNC_STRATEGY_ID,
    SYNC_STRATEGY_DELETE_EXTRANEOUS,
    type SyncStrategyId,
} from "../constants/sync";
import { executePlan } from "../services/syncApiService";
import { areSyncRootsEqual } from "../common/syncRoots";
import { setViewMode } from "./fileManagerSlice";
import type { SyncProgressPayload } from "@commandojs/shared/types/SyncTypes";
import type { RootState } from "./store";

export type DiffMap = Record<string, SyncAction>;

interface SyncState {
    strategyId: SyncStrategyId;
    options: SyncOptions;
    report: CompareReport | null;
    plan: SyncPlan | null;
    diffMap: DiffMap;
    status: SyncJobStatus;
    error: string | null;
    lastJobId: string | null;
    planModalOpen: boolean;
    progressFile: string | null;
    progressDone: number;
    progressTotal: number;
}

const initialState: SyncState = {
    strategyId: DEFAULT_SYNC_STRATEGY_ID,
    options: DEFAULT_SYNC_OPTIONS,
    report: null,
    plan: null,
    diffMap: {},
    status: "idle",
    error: null,
    lastJobId: null,
    planModalOpen: false,
    progressFile: null,
    progressDone: 0,
    progressTotal: 0,
};

function buildDiffMap(report: CompareReport): DiffMap {
    const map: DiffMap = {};
    for (const item of report.items ?? []) {
        if (item.action !== "skip") {
            map[item.relativePath] = item.action;
        }
    }
    return map;
}

export const compareSync = createAsyncThunk(
    "sync/compare",
    async (_, { getState, dispatch, rejectWithValue }) => {
        const state = getState() as RootState;
        const leftRoot = state.fileManager.panes[0].syncRoot;
        const rightRoot = state.fileManager.panes[1].syncRoot;
        if (!leftRoot || !rightRoot) {
            return rejectWithValue("Set sync folders on both panes first");
        }
        if (areSyncRootsEqual(leftRoot, rightRoot)) {
            return rejectWithValue(
                "Left and right sync roots must be different folders"
            );
        }
        const api = window.syncApi;
        if (!api) return rejectWithValue("Sync API not available");

        const { jobId } = await api.compare({
            leftRoot,
            rightRoot,
            strategyId: state.sync.strategyId,
            options: { ...state.sync.options, dryRun: true },
        });

        return new Promise<CompareReport>((resolve, reject) => {
            api.onProgress((p: SyncProgressPayload) => {
                if (p.jobId !== jobId) return;
                if (p.type === "progress") {
                    dispatch(
                        syncSlice.actions.progressUpdated({
                            file: p.file ?? "",
                            action: p.action ?? "",
                            done: p.done ?? 0,
                            total: p.total ?? 0,
                        })
                    );
                    return;
                }
                if (p.type === "done") {
                    if (p.status === "error" || p.error) {
                        reject(new Error(p.error ?? "Compare failed"));
                        return;
                    }
                    if (p.status === "canceled") {
                        reject(new Error("Compare canceled"));
                        return;
                    }
                    dispatch(setViewMode("diff"));
                    resolve(p.result as CompareReport);
                }
            });
        });
    }
);

export const runSync = createAsyncThunk(
    "sync/run",
    async (_, { getState, rejectWithValue }) => {
        const state = getState() as RootState;
        const plan = state.sync.plan;
        if (!plan) {
            return rejectWithValue("Compare folders before syncing");
        }
        try {
            const result = await executePlan(plan, state.sync.options);
            return result;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error ? error.message : String(error)
            );
        }
    }
);

const syncSlice = createSlice({
    name: "sync",
    initialState,
    reducers: {
        setStrategyId(state, action: PayloadAction<SyncStrategyId>) {
            state.strategyId = action.payload;
            state.options.deleteExtraneous =
                SYNC_STRATEGY_DELETE_EXTRANEOUS[action.payload];
            state.report = null;
            state.plan = null;
            state.diffMap = {};
        },
        setDeleteExtraneous(state, action: PayloadAction<boolean>) {
            state.options.deleteExtraneous = action.payload;
        },
        setDryRun(state, action: PayloadAction<boolean>) {
            state.options.dryRun = action.payload;
        },
        setUseChecksum(state, action: PayloadAction<boolean>) {
            state.options.useChecksum = action.payload;
        },
        setErrorMode(state, action: PayloadAction<"stop" | "ignore">) {
            state.options.errorMode = action.payload;
        },
        setDeleteMethod(
            state,
            action: PayloadAction<"permanent" | "trash" | "versioning">
        ) {
            state.options.deleteMethod = action.payload;
        },
        setResume(state, action: PayloadAction<boolean>) {
            state.options.resume = action.payload;
        },
        setPlanModalOpen(state, action: PayloadAction<boolean>) {
            state.planModalOpen = action.payload;
        },
        clearSyncPlan(state) {
            state.report = null;
            state.plan = null;
            state.diffMap = {};
            state.status = "idle";
            state.error = null;
        },
        progressUpdated(
            state,
            action: PayloadAction<{
                file: string;
                action: string;
                done: number;
                total: number;
            }>
        ) {
            state.progressFile = action.payload.file;
            state.progressDone = action.payload.done;
            state.progressTotal = action.payload.total;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(compareSync.pending, state => {
                state.status = "comparing";
                state.error = null;
            })
            .addCase(compareSync.fulfilled, (state, action) => {
                state.status = "done";
                state.report = action.payload;
                state.plan = action.payload.plan;
                state.diffMap = buildDiffMap(action.payload);
                state.planModalOpen = true;
            })
            .addCase(compareSync.rejected, (state, action) => {
                state.status = "error";
                state.error = String(action.payload ?? action.error.message);
            })
            .addCase(runSync.pending, state => {
                state.status = "syncing";
                state.error = null;
                state.planModalOpen = false;
            })
            .addCase(runSync.fulfilled, state => {
                state.status = "done";
                state.report = null;
                state.plan = null;
                state.diffMap = {};
            })
            .addCase(runSync.rejected, (state, action) => {
                state.status = "error";
                state.error = String(action.payload ?? action.error.message);
            });
    },
});

export const {
    setStrategyId,
    setDeleteExtraneous,
    setDryRun,
    setUseChecksum,
    setErrorMode,
    setDeleteMethod,
    setResume,
    setPlanModalOpen,
    clearSyncPlan,
    progressUpdated,
} = syncSlice.actions;

export default syncSlice.reducer;
