import { useEffect } from "react";
import { useAppDispatch } from "../app/hooks";
import { progressUpdated } from "../app/syncSlice";
import { createProgressThrottler } from "../common/throttleProgress";
import { normalizeSyncProgressPayload } from "../services/syncJobHub";
import type { SyncProgressPayload } from "@commandojs/shared/types/SyncTypes";

/** Wire Wails sync-progress events into Redux (RFC-034). */
export function useSyncProgressRelay(): void {
    const dispatch = useAppDispatch();

    useEffect(() => {
        const api = window.syncApi;
        if (!api?.onProgress) {
            return;
        }

        const throttler = createProgressThrottler(tick => {
            dispatch(progressUpdated(tick));
        });

        return api.onProgress((raw: SyncProgressPayload) => {
            const payload = normalizeSyncProgressPayload(
                raw as SyncProgressPayload & Record<string, unknown>
            );
            if (payload.type === "done") {
                throttler.flush();
                return;
            }
            if (payload.type !== "progress") {
                return;
            }
            throttler.push({
                file: payload.file ?? "",
                action: payload.action ?? "",
                done: payload.done ?? 0,
                total: payload.total ?? 0,
            });
        });
    }, [dispatch]);
}
