import {
    CancelCopyBatch,
    CopyBatch,
    GetCopyQueueStatus,
} from "../../bindings/github.com/systembugtj/commando/apps/desktop/services/copyservice.js";
import {
    GetDriveDetails,
    ListDrives,
} from "../../bindings/github.com/systembugtj/commando/apps/desktop/services/driveservice.js";
import {
    GetHomeDir,
    GoToParent,
    ListDir,
    Navigate,
} from "../../bindings/github.com/systembugtj/commando/apps/desktop/services/fileservice.js";
import { installFsApi } from "./fsApi";
import { installLogApi } from "./logApi";
import { installSyncApi } from "./syncApi";
import {
    adaptWailsDriveService,
    adaptWailsFileService,
} from "./wailsFileAdapters";

/**
 * Wails v3 bootstrap: wire generated bindings before mounting React.
 * @commando/ui stays platform-agnostic via window.fsApi / window.syncApi.
 */
export async function bootstrapDesktop(): Promise<void> {
    installLogApi();

    const homeDir = await GetHomeDir();

    installFsApi(
        adaptWailsFileService(ListDir, Navigate, GoToParent, GetHomeDir),
        { CopyBatch, CancelCopyBatch, GetCopyQueueStatus },
        adaptWailsDriveService(ListDrives, GetDriveDetails),
        homeDir
    );

    installSyncApi();
}
