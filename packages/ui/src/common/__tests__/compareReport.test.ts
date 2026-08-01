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
