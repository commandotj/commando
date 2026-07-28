import { Events } from "@wailsio/runtime";
import {
  CancelSync,
  Compare,
  Execute,
  Plan,
} from "../../bindings/github.com/systembug/commando/apps/desktop/services/syncservice.js";
import type * as SyncModels from "../../bindings/github.com/systembug/commando/internal/sync/models.js";
import type * as ServiceModels from "../../bindings/github.com/systembug/commando/apps/desktop/services/models.js";
import { WAILS_EVENTS } from "./constants";

function payloadFromEvent<T>(event: unknown): T {
  if (event && typeof event === "object" && "data" in event) {
    return (event as { data: T }).data;
  }
  return event as T;
}

/** Bridge generated sync bindings to window.syncApi. */
export function installSyncApi(): void {
  window.syncApi = {
    plan: (req) => Plan(req as ServiceModels.SyncRequest),
    compare: (req) => Compare(req as ServiceModels.SyncRequest),
    execute: (plan, opts) =>
      Execute(plan as SyncModels.Plan, opts as SyncModels.Options),
    cancel: (jobId) => CancelSync(jobId),
    onProgress: (cb) => {
      Events.On(WAILS_EVENTS.SYNC_PROGRESS, (event) => {
        cb(payloadFromEvent<Parameters<typeof cb>[0]>(event));
      });
    },
  };
}
