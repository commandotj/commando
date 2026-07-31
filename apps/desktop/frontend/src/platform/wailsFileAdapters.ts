import type {
    DirectoryEntry,
    ListDirectoryOptions,
    NavigationResult,
} from "@commandojs/shared/types/DirectoryTypes";
import type { DriveInfo } from "@commandojs/shared/types/DriveTypes";
import type { Info } from "../../bindings/github.com/systembug/commando/internal/drive/models.js";
import type {
    Entry,
    ListOptions,
    NavigationResult as WailsNavigationResult,
} from "../../bindings/github.com/systembug/commando/internal/file/models.js";

function toDirectoryEntry(entry: Entry): DirectoryEntry {
    return {
        name: entry.name,
        isDirectory: entry.isDirectory,
        size: entry.size,
        mtime: entry.mtime,
        isHidden: entry.isHidden,
    };
}

function toNavigationResult(result: WailsNavigationResult): NavigationResult {
    return {
        success: result.success,
        path: result.path,
        entries: (result.entries ?? []).map(toDirectoryEntry),
    };
}

function toWailsListOptions(options: ListDirectoryOptions): ListOptions {
    return {
        includeHidden: options.includeHidden ?? false,
        sortBy: options.sortBy ?? "name",
        sortOrder: options.sortOrder ?? "asc",
        includePermissions: options.includePermissions ?? false,
    };
}

type WailsListDir = (
    path: string,
    options: ListOptions
) => Promise<Entry[] | null>;

type WailsNavigate = (
    path: string,
    addToHistory: boolean
) => Promise<WailsNavigationResult>;

type WailsGoToParent = (path: string) => Promise<WailsNavigationResult>;

/** Adapt generated Wails file bindings to the shared window.fsApi contract. */
export function adaptWailsFileService(
    listDir: WailsListDir,
    navigate: WailsNavigate,
    goToParent: WailsGoToParent,
    getHomeDir: () => Promise<string>
) {
    return {
        ListDir: async (
            path: string,
            options: ListDirectoryOptions
        ): Promise<DirectoryEntry[]> => {
            const entries = await listDir(path, toWailsListOptions(options));
            return (entries ?? []).map(toDirectoryEntry);
        },
        Navigate: async (
            path: string,
            addToHistory: boolean
        ): Promise<NavigationResult> =>
            toNavigationResult(await navigate(path, addToHistory)),
        GetHomeDir: getHomeDir,
        GoToParent: async (path: string): Promise<NavigationResult> =>
            toNavigationResult(await goToParent(path)),
    };
}

function toDriveInfo(info: Info): DriveInfo {
    return {
        device: info.device,
        description: info.description,
        size: info.size,
        mountpoints: (info.mountpoints ?? [])
            .filter(
                (
                    mountpoint
                ): mountpoint is Record<string, string | undefined> =>
                    mountpoint != null
            )
            .map(mountpoint => ({ path: mountpoint.path ?? "" }))
            .filter(mountpoint => mountpoint.path !== ""),
        isSystem: info.isSystem,
        isRemovable: info.isRemovable,
        isReady: info.isReady,
        label: info.label,
    };
}

type WailsListDrives = () => Promise<Info[] | null>;
type WailsGetDriveDetails = (device: string) => Promise<Info>;

/** Adapt generated Wails drive bindings to the shared window.fsApi contract. */
export function adaptWailsDriveService(
    listDrives: WailsListDrives,
    getDriveDetails: WailsGetDriveDetails
) {
    return {
        ListDrives: async (): Promise<DriveInfo[]> => {
            const drives = await listDrives();
            return (drives ?? []).map(toDriveInfo);
        },
        GetDriveDetails: async (device: string): Promise<DriveInfo> =>
            toDriveInfo(await getDriveDetails(device)),
    };
}
