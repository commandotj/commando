import React from "react";
import { render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import SyncResultPanel from "../SyncResultPanel";
import syncReducer from "../../../app/syncSlice";
import fileManagerReducer from "../../../app/fileManagerSlice";

jest.mock("../../../hooks/useI18n", () => ({
    useI18n: () => ({
        t: (key: string, vars?: Record<string, unknown>) => {
            if (vars) {
                return `${key}:${JSON.stringify(vars)}`;
            }
            return key;
        },
    }),
}));

describe("SyncResultPanel", () => {
    it("hides compare dump when diff view is open", () => {
        const store = configureStore({
            reducer: { sync: syncReducer, fileManager: fileManagerReducer },
            preloadedState: {
                sync: {
                    strategyId: "update-right",
                    options: { deleteExtraneous: false, dryRun: true, useChecksum: false },
                    report: {
                        strategy: { id: "update-right", direction: "left-to-right", deleteExtraneous: false, label: "", description: "" },
                        leftRoot: "/l",
                        rightRoot: "/r",
                        generatedAt: "",
                        items: [{ relativePath: "a.txt", action: "copy", from: "", to: "", reason: "" }],
                        conflicts: 0,
                        toCopy: 1,
                        toDelete: 0,
                        toSkip: 0,
                        plan: { leftRoot: "/l", rightRoot: "/r", direction: "left-to-right", items: [], conflicts: 0, toCopy: 1, toDelete: 0, toSkip: 0 },
                    },
                    plan: null,
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
                fileManager: {
                    viewMode: "diff",
                    panes: [],
                },
            },
        });

        const { container } = render(
            <Provider store={store}>
                <SyncResultPanel />
            </Provider>
        );
        expect(container).toBeEmptyDOMElement();
    });

    it("shows compact banner on browse after compare", () => {
        const store = configureStore({
            reducer: { sync: syncReducer, fileManager: fileManagerReducer },
            preloadedState: {
                sync: {
                    strategyId: "update-right",
                    options: { deleteExtraneous: false, dryRun: true, useChecksum: false },
                    report: {
                        strategy: { id: "update-right", direction: "left-to-right", deleteExtraneous: false, label: "", description: "" },
                        leftRoot: "/l",
                        rightRoot: "/r",
                        generatedAt: "",
                        items: [],
                        conflicts: 0,
                        toCopy: 5,
                        toDelete: 0,
                        toSkip: 2,
                        plan: { leftRoot: "/l", rightRoot: "/r", direction: "left-to-right", items: [], conflicts: 0, toCopy: 5, toDelete: 0, toSkip: 2 },
                    },
                    plan: null,
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
                fileManager: {
                    viewMode: "browse",
                    panes: [],
                },
            },
        });

        render(
            <Provider store={store}>
                <SyncResultPanel />
            </Provider>
        );
        expect(screen.getByText("sync.plan.viewDiff")).toBeInTheDocument();
        expect(screen.queryByText("a.txt")).not.toBeInTheDocument();
    });
});
