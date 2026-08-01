import { createAsyncThunk, createSlice, PayloadAction } from "@reduxjs/toolkit";
import type {
    CompareReport,
    SyncAction,
    SyncExecuteResult,
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
import { normalizeCompareResult } from "../common/compareReport";
import { normalizeExecuteResult } from "../common/normalizeExecuteResult";
import { effectiveSyncRoot } from "../common/effectiveSyncRoot";
import { areSyncRootsEqual } from "../common/syncRoots";
import { waitForSyncJob } from "../services/syncJobHub";
import {
    fetchDirectory,
    setPaneSyncRoot,
    setViewMode,
} from "./fileManagerSlice";
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
    progressAction: string | null;
    progressDone: number;
    progressTotal: number;
    executeResult: SyncExecuteResult | null;
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
    progressAction: null,
    progressDone: 0,
    progressTotal: 0,
    executeResult: null,
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

function resolveSyncRoots(state: RootState): {
    leftRoot: string;
    rightRoot: string;
} {
    const leftPane = state.fileManager.panes[0];
    const rightPane = state.fileManager.panes[1];
    return {
        leftRoot: effectiveSyncRoot(leftPane.syncRoot, leftPane.currentPath),
        rightRoot: effectiveSyncRoot(rightPane.syncRoot, rightPane.currentPath),
    };
}

export const compareSync = createAsyncThunk(
    "sync/compare",
    async (_, { getState, dispatch, rejectWithValue }) => {
        const state = getState() as RootState;
        const { leftRoot, rightRoot } = resolveSyncRoots(state);
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

        if (!state.fileManager.panes[0].syncRoot) {
            dispatch(setPaneSyncRoot({ paneIndex: 0, syncRoot: leftRoot }));
        }
        if (!state.fileManager.panes[1].syncRoot) {
            dispatch(setPaneSyncRoot({ paneIndex: 1, syncRoot: rightRoot }));
        }

        const { jobId } = await api.compare({
            leftRoot,
            rightRoot,
            strategyId: state.sync.strategyId,
            options: { ...state.sync.options, dryRun: true },
        });
        dispatch(syncSlice.actions.jobStarted(jobId));

        try {
            const raw = await waitForSyncJob<unknown>(jobId, () => {});
            const report = normalizeCompareResult(raw, state.sync.strategyId);
            dispatch(setViewMode("diff"));
            return report;
        } catch (error) {
            return rejectWithValue(
                error instanceof Error ? error.message : String(error)
            );
        }
    }
);

export const runSync = createAsyncThunk(
    "sync/run",
    async (_, { getState, dispatch, rejectWithValue }) => {
        const state = getState() as RootState;
        const plan = state.sync.plan;
        if (!plan) {
            return rejectWithValue("Compare folders before syncing");
        }
        const api = window.syncApi;
        if (!api) return rejectWithValue("Sync API not available");

        const { leftRoot, rightRoot } = resolveSyncRoots(state);

        const { jobId } = await api.execute(plan, {
            ...state.sync.options,
            deleteExtraneous:
                state.sync.options.deleteExtraneous ??
                SYNC_STRATEGY_DELETE_EXTRANEOUS[state.sync.strategyId],
        });
        dispatch(syncSlice.actions.jobStarted(jobId));

        try {
            const result = await waitForSyncJob<SyncExecuteResult>(
                jobId,
                () => {}
            );
            dispatch(setViewMode("browse"));
            if (leftRoot) {
                dispatch(fetchDirectory({ paneIndex: 0, path: leftRoot }));
            }
            if (rightRoot) {
                dispatch(fetchDirectory({ paneIndex: 1, path: rightRoot }));
            }
            return normalizeExecuteResult(result);
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
        jobStarted(state, action: PayloadAction<string>) {
            state.lastJobId = action.payload;
        },
        clearSyncPlan(state) {
            state.report = null;
            state.plan = null;
            state.diffMap = {};
            state.status = "idle";
            state.error = null;
            state.executeResult = null;
            state.lastJobId = null;
            state.progressFile = null;
            state.progressAction = null;
            state.progressDone = 0;
            state.progressTotal = 0;
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
            state.progressAction = action.payload.action;
            state.progressDone = action.payload.done;
            state.progressTotal = action.payload.total;
        },
    },
    extraReducers: builder => {
        builder
            .addCase(compareSync.pending, state => {
                state.status = "comparing";
                state.error = null;
                state.executeResult = null;
                state.planModalOpen = true;
                state.progressFile = null;
                state.progressAction = null;
                state.progressDone = 0;
                state.progressTotal = 0;
            })
            .addCase(compareSync.fulfilled, (state, action) => {
                state.status = "done";
                state.report = action.payload;
                state.plan = action.payload.plan;
                state.diffMap = buildDiffMap(action.payload);
                state.planModalOpen = false;
            })
            .addCase(compareSync.rejected, (state, action) => {
                state.status = "error";
                state.error = String(action.payload ?? action.error.message);
                state.planModalOpen = false;
            })
            .addCase(runSync.pending, state => {
                state.status = "syncing";
                state.error = null;
                state.planModalOpen = false;
                state.progressFile = null;
                state.progressAction = null;
                state.progressDone = 0;
                state.progressTotal = 0;
            })
            .addCase(runSync.fulfilled, (state, action) => {
                state.status = "done";
                state.executeResult = normalizeExecuteResult(action.payload);
                state.report = null;
                state.plan = null;
                state.diffMap = {};
                state.lastJobId = null;
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
    jobStarted,
    clearSyncPlan,
    progressUpdated,
} = syncSlice.actions;

export default syncSlice.reducer;
