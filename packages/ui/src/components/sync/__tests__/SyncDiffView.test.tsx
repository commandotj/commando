import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import SyncDiffView from "../SyncDiffView";
import syncReducer from "../../../app/syncSlice";
import fileManagerReducer from "../../../app/fileManagerSlice";
import type { CompareReport } from "@commandojs/shared/types/SyncTypes";

jest.mock("../../../hooks/useI18n", () => ({
    useI18n: () => ({
        t: (key: string, vars?: Record<string, unknown>) => {
            if (key === "sync.diff.showing" && vars) {
                return `showing ${vars.shown}/${vars.total}`;
            }
            if (key.startsWith("sync.diff.filter.")) {
                return key.split(".").pop();
            }
            if (key.startsWith("sync.diff.action.")) {
                return key.split(".").pop();
            }
            return key;
        },
    }),
}));

const report: CompareReport = {
    strategy: {
        id: "update-right",
        direction: "left-to-right",
        deleteExtraneous: false,
        label: "Update Right",
        description: "",
    },
    leftRoot: "/left",
    rightRoot: "/right",
    generatedAt: "2026-01-01T00:00:00Z",
    conflicts: 1,
    toCopy: 1,
    toDelete: 1,
    toSkip: 1,
    plan: {
        leftRoot: "/left",
        rightRoot: "/right",
        direction: "left-to-right",
        items: [],
        conflicts: 1,
        toCopy: 1,
        toDelete: 1,
        toSkip: 1,
    },
    items: [
        {
            relativePath: "photos/a.jpg",
            action: "copy",
            from: "/left/photos/a.jpg",
            to: "/right/photos/a.jpg",
            reason: "missing on right",
        },
        {
            relativePath: "old.txt",
            action: "delete",
            from: "/right/old.txt",
            to: "",
            reason: "extraneous",
        },
        {
            relativePath: "conflict.bin",
            action: "conflict",
            from: "/left/conflict.bin",
            to: "/right/conflict.bin",
            reason: "same mtime",
        },
    ],
};

function renderWithReport(): ReturnType<typeof render> {
    const store = configureStore({
        reducer: {
            sync: syncReducer,
            fileManager: fileManagerReducer,
        },
        preloadedState: {
            sync: {
                strategyId: "update-right",
                options: {
                    deleteExtraneous: false,
                    dryRun: true,
                    useChecksum: false,
                },
                report,
                plan: report.plan,
                diffMap: {},
                status: "done",
                error: null,
                lastJobId: null,
                planModalOpen: false,
                progressFile: null,
                progressAction: null,
                progressDone: 0,
                progressTotal: 0,
                executeResult: null,
            },
        },
    });

    return render(
        <Provider store={store}>
            <SyncDiffView />
        </Provider>
    );
}

describe("SyncDiffView", () => {
    it("renders stat cards and table rows", () => {
        renderWithReport();
        expect(screen.getByText("sync.plan.diffTitle")).toBeInTheDocument();
        expect(screen.getByText("a.jpg")).toBeInTheDocument();
        expect(screen.getByText("showing 3/3")).toBeInTheDocument();
    });

    it("filters rows by action tab", () => {
        renderWithReport();
        fireEvent.click(screen.getByRole("tab", { name: /delete/i }));
        expect(screen.queryByText("a.jpg")).not.toBeInTheDocument();
        expect(screen.getAllByText("old.txt").length).toBeGreaterThan(0);
    });

    it("renders empty-folder copy rows", () => {
        const reportWithEmptyFolder: CompareReport = {
            ...report,
            toCopy: 1,
            toDelete: 0,
            conflicts: 0,
            toSkip: 1,
            items: [
                {
                    relativePath: "parent",
                    action: "skip",
                    from: "",
                    to: "",
                    reason: "directory already exists on both sides",
                },
                {
                    relativePath: "parent/emptyfolder",
                    action: "copy",
                    from: "/left/parent/emptyfolder",
                    to: "/right/parent/emptyfolder",
                    reason: "missing on right",
                    isDir: true,
                },
            ],
        };
        const store = configureStore({
            reducer: {
                sync: syncReducer,
                fileManager: fileManagerReducer,
            },
            preloadedState: {
                sync: {
                    strategyId: "update-right",
                    options: {
                        deleteExtraneous: false,
                        dryRun: true,
                        useChecksum: false,
                    },
                    report: reportWithEmptyFolder,
                    plan: reportWithEmptyFolder.plan,
                    diffMap: {},
                    status: "done",
                    error: null,
                    lastJobId: null,
                    planModalOpen: false,
                    progressFile: null,
                    progressAction: null,
                    progressDone: 0,
                    progressTotal: 0,
                    executeResult: null,
                },
            },
        });
        render(
            <Provider store={store}>
                <SyncDiffView />
            </Provider>
        );
        expect(screen.getByText("emptyfolder")).toBeInTheDocument();
        expect(
            screen.getByText("parent/emptyfolder")
        ).toBeInTheDocument();
        expect(screen.getByText("showing 2/2")).toBeInTheDocument();
    });
});
