import {
    compareReportFromPlan,
    normalizeCompareResult,
} from "../compareReport";
import { SYNC_STRATEGY_IDS } from "../../constants/sync";
import type { SyncPlan } from "@commandojs/shared/types/SyncTypes";

const samplePlan: SyncPlan = {
    leftRoot: "/left",
    rightRoot: "/right",
    direction: "left-to-right",
    items: [
        {
            relativePath: "a.txt",
            action: "copy",
            source: "/left/a.txt",
            destination: "/right/a.txt",
            reason: "left-newer",
        },
    ],
    conflicts: 0,
    toCopy: 1,
    toDelete: 0,
    toSkip: 0,
};

describe("compareReportFromPlan", () => {
    it("maps plan items source/destination to from/to", () => {
        const report = compareReportFromPlan(
            samplePlan,
            SYNC_STRATEGY_IDS.UPDATE_RIGHT
        );
        expect(report.plan).toEqual(samplePlan);
        expect(report.items[0]).toEqual({
            relativePath: "a.txt",
            action: "copy",
            from: "/left/a.txt",
            to: "/right/a.txt",
            reason: "left-newer",
        });
        expect(report.strategy.id).toBe(SYNC_STRATEGY_IDS.UPDATE_RIGHT);
    });
});

describe("normalizeCompareResult", () => {
    it("wraps CLI plan payload", () => {
        const report = normalizeCompareResult(
            samplePlan,
            SYNC_STRATEGY_IDS.MIRROR_RIGHT
        );
        expect(report.toCopy).toBe(1);
        expect(report.items[0].from).toBe("/left/a.txt");
    });

    it("keeps empty-folder items from CLI plan", () => {
        // Mirrors real CLI `sync plan --progress` done payload: parent dir
        // exists on both sides (skip), empty folder missing on right (copy).
        const cliPlan = {
            id: "p1",
            leftRoot: "/left",
            rightRoot: "/right",
            direction: "left-to-right",
            items: [
                {
                    relativePath: "parent",
                    action: "skip",
                    source: "",
                    destination: "",
                    reason: "directory already exists on both sides",
                },
                {
                    relativePath: "parent/emptyfolder",
                    action: "copy",
                    source: "/left/parent/emptyfolder",
                    destination: "/right/parent/emptyfolder",
                    reason: "missing on right",
                    isDir: true,
                },
            ],
            conflicts: 0,
            toCopy: 1,
            toDelete: 0,
            toSkip: 1,
        };
        const report = normalizeCompareResult(
            cliPlan,
            SYNC_STRATEGY_IDS.UPDATE_RIGHT
        );
        expect(report.items).toHaveLength(2);
        const emptyFolder = report.items.find(
            i => i.relativePath === "parent/emptyfolder"
        );
        expect(emptyFolder).toBeDefined();
        expect(emptyFolder?.action).toBe("copy");
        expect(emptyFolder?.from).toBe("/left/parent/emptyfolder");
        expect(emptyFolder?.to).toBe("/right/parent/emptyfolder");
    });

    it("passes through full compare report", () => {
        const full = compareReportFromPlan(
            samplePlan,
            SYNC_STRATEGY_IDS.UPDATE_RIGHT
        );
        expect(normalizeCompareResult(full, SYNC_STRATEGY_IDS.UPDATE_RIGHT)).toBe(
            full
        );
    });
});
