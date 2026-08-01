import type { SyncProgressPayload } from "@commandojs/shared/types/SyncTypes";
import {
    dispatchSyncProgress,
    normalizeSyncProgressPayload,
    waitForSyncJob,
} from "../syncJobHub";

describe("syncJobHub", () => {
    it("normalizes PascalCase Wails payloads", () => {
        const normalized = normalizeSyncProgressPayload({
            JobID: "job-pascal",
            Type: "progress",
            File: "a.txt",
            Done: 3,
            Total: 10,
            Action: "index",
        } as SyncProgressPayload & Record<string, unknown>);
        expect(normalized.jobId).toBe("job-pascal");
        expect(normalized.type).toBe("progress");
        expect(normalized.done).toBe(3);
        expect(normalized.action).toBe("index");
    });

    it("replays buffered events when waiter attaches after dispatch", async () => {
        const jobId = "job-1";
        const done: SyncProgressPayload = {
            jobId,
            type: "done",
            status: "done",
            result: { copied: 1 },
        };
        dispatchSyncProgress(done);

        const result = await waitForSyncJob<{ copied: number }>(jobId, () => {});
        expect(result.copied).toBe(1);
    });

    it("streams progress before done", async () => {
        const jobId = "job-2";
        const progress: SyncProgressPayload[] = [];

        const promise = waitForSyncJob<{ ok: boolean }>(jobId, p => {
            if (p.type === "progress") {
                progress.push(p);
            }
        });

        dispatchSyncProgress({
            jobId,
            type: "progress",
            file: "a.txt",
            done: 1,
            total: 2,
        });
        dispatchSyncProgress({
            jobId,
            type: "done",
            status: "done",
            result: { ok: true },
        });

        await expect(promise).resolves.toEqual({ ok: true });
        expect(progress).toHaveLength(1);
    });
});
