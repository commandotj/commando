import {
    areSyncRootsEqual,
    getSyncRootsState,
    isSyncRootsReady,
    normalizeSyncRootPath,
} from "../syncRoots";

describe("syncRoots", () => {
    it("normalizes trailing slashes", () => {
        expect(normalizeSyncRootPath("/Users/test/")).toBe("/Users/test");
        expect(normalizeSyncRootPath("/")).toBe("/");
    });

    it("detects equal sync roots", () => {
        expect(areSyncRootsEqual("/Users/a", "/Users/a/")).toBe(true);
        expect(areSyncRootsEqual("/Users/a", "/Users/b")).toBe(false);
    });

    it("reports missing roots", () => {
        expect(getSyncRootsState("", "")).toEqual({ kind: "missing-both" });
        expect(getSyncRootsState("/left", "")).toEqual({
            kind: "missing-right",
        });
        expect(getSyncRootsState("", "/right")).toEqual({
            kind: "missing-left",
        });
    });

    it("reports same path and ready states", () => {
        expect(getSyncRootsState("/same", "/same/")).toEqual({
            kind: "same-path",
            path: "/same",
        });
        expect(getSyncRootsState("/left", "/right")).toEqual({ kind: "ready" });
        expect(isSyncRootsReady({ kind: "ready" })).toBe(true);
        expect(isSyncRootsReady({ kind: "same-path", path: "/x" })).toBe(false);
    });
});
