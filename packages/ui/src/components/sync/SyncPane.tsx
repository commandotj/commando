import React, { useEffect, useMemo, useRef } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ArchiveIcon, FileIcon } from "@radix-ui/react-icons";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import {
    fetchDirectory,
    setActivePane,
    setPaneSyncRoot,
} from "../../app/fileManagerSlice";
import { fetchDrives } from "../../app/driveSlice";
import { useI18n } from "../../hooks/useI18n";
import { VirtualizedTable } from "../VirtualizedTable";
import { joinPath, formatSize } from "../../common/path";
import { formatFileTime } from "../../common/time";
import PathBreadcrumb from "../PathBreadcrumb";
import { DeviceInfo } from "../DeviceBar";
import { SYNC_ACTION_COLORS } from "../../constants/sync";
import type { SyncAction } from "@commando/shared/types/SyncTypes";
import SyncRootBar from "./SyncRootBar";

interface FileEntry {
    name: string;
    isDirectory: boolean;
    size?: number;
    mtime?: number;
}

function relativeFromRoot(
    syncRoot: string,
    currentPath: string,
    name: string
): string {
    const full = joinPath(currentPath, name);
    if (!syncRoot) {
        return "";
    }
    const normRoot = syncRoot.replace(/\/$/, "");
    const normFull = full.replace(/\/$/, "");
    if (!normFull.startsWith(normRoot)) {
        return "";
    }
    return normFull.slice(normRoot.length).replace(/^\//, "") || name;
}

function filterVolumes(drives: DeviceInfo[]): DeviceInfo[] {
    const seen = new Set<string>();
    return drives
        .map(dev => ({
            ...dev,
            mountpoints: dev.mountpoints.filter(mp => {
                if (seen.has(mp.path)) return false;
                seen.add(mp.path);
                return mp.path === "/" || mp.path.startsWith("/Volumes/");
            }),
        }))
        .filter(dev => dev.mountpoints.length > 0);
}

const SyncPane: React.FC<{ paneIndex: 0 | 1 }> = ({ paneIndex }) => {
    const dispatch = useAppDispatch();
    const pane = useAppSelector(state => state.fileManager.panes[paneIndex]);
    const otherSyncRoot = useAppSelector(
        state => state.fileManager.panes[paneIndex === 0 ? 1 : 0].syncRoot
    );
    const activePane = useAppSelector(state => state.fileManager.activePane);
    const diffMap = useAppSelector(state => state.sync.diffMap);
    const { drives } = useAppSelector(state => state.drive);
    const contentRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();
    const isActive = activePane === paneIndex;
    const hasDiff = Object.keys(diffMap).length > 0;
    const browseRoot = pane.syncRoot || pane.currentPath;

    useEffect(() => {
        dispatch(fetchDrives());
    }, [dispatch]);

    const volumes = useMemo(() => filterVolumes(drives), [drives]);

    const getRowClass = (name: string): string | undefined => {
        const rel = relativeFromRoot(pane.syncRoot, pane.currentPath, name);
        const action = diffMap[rel] as SyncAction | undefined;
        return action ? SYNC_ACTION_COLORS[action] : undefined;
    };

    const columns: ColumnDef<FileEntry, unknown>[] = [
        {
            id: "name",
            header: t("ui.table.name") as string,
            accessorKey: "name",
            meta: { width: "42%" },
            cell: ({ row }) => {
                const record = row.original;
                const Icon = record.isDirectory ? ArchiveIcon : FileIcon;
                return (
                    <button
                        type="button"
                        className="sync-file-name"
                        disabled={!record.isDirectory}
                        onClick={() => {
                            if (!pane.currentPath || !record.isDirectory)
                                return;
                            dispatch(
                                fetchDirectory({
                                    paneIndex,
                                    path: joinPath(
                                        pane.currentPath,
                                        record.name
                                    ),
                                })
                            );
                        }}
                    >
                        <Icon width={14} height={14} aria-hidden />
                        <span>{record.name}</span>
                    </button>
                );
            },
        },
        {
            id: "mtime",
            header: t("ui.table.dateModified") as string,
            accessorKey: "mtime",
            meta: { width: "28%" },
            cell: ({ row }) => formatFileTime(row.original.mtime),
        },
        {
            id: "size",
            header: t("ui.table.size") as string,
            accessorKey: "size",
            meta: { width: "15%", align: "right" as const },
            cell: ({ row }) =>
                row.original.isDirectory
                    ? "—"
                    : formatSize(row.original.size) || "—",
        },
        {
            id: "status",
            header: t("sync.table.status") as string,
            accessorKey: "name",
            meta: { width: "15%", align: "center" as const },
            cell: ({ row }) => {
                const rel = relativeFromRoot(
                    pane.syncRoot,
                    pane.currentPath,
                    row.original.name
                );
                const action = diffMap[rel];
                if (!action || action === "skip") {
                    return (
                        <span className="sync-status-pill sync-status-pill--ok">
                            —
                        </span>
                    );
                }
                return (
                    <span
                        className={`sync-status-pill sync-status-pill--${action}`}
                    >
                        {action}
                    </span>
                );
            },
        },
    ];

    const handleFocus = (): void => {
        dispatch(setActivePane(paneIndex));
    };

    const handleBreadcrumbClick = (index: number): void => {
        const parts = pane.currentPath.split(/[\\/]/).filter(Boolean);
        let newPath =
            parts.length > 0 ? `/${parts.slice(0, index + 1).join("/")}` : "/";
        if (parts.length > 0 && /^[A-Za-z]:$/.test(parts[0])) {
            newPath = parts.slice(0, index + 1).join("\\");
        }
        dispatch(fetchDirectory({ paneIndex, path: newPath }));
    };

    const handleNavigate = (path: string): void => {
        dispatch(fetchDirectory({ paneIndex, path }));
    };

    const handleSetSyncRoot = (path: string): void => {
        dispatch(setPaneSyncRoot({ paneIndex, syncRoot: path }));
        dispatch(fetchDirectory({ paneIndex, path }));
    };

    return (
        <div
            className={`sync-pane sync-pane--${paneIndex} wails-no-drag ${isActive ? "sync-pane--active" : ""}`}
        >
            <SyncRootBar
                paneIndex={paneIndex}
                syncRoot={pane.syncRoot}
                currentPath={pane.currentPath}
                otherSyncRoot={otherSyncRoot}
                volumes={volumes}
                onNavigate={handleNavigate}
                onSetSyncRoot={handleSetSyncRoot}
            />

            {browseRoot && (
                <div className="sync-pane__breadcrumb">
                    <PathBreadcrumb
                        path={pane.currentPath}
                        onClick={handleBreadcrumbClick}
                    />
                </div>
            )}

            <div
                className="sync-pane__body"
                ref={contentRef}
                tabIndex={0}
                onFocus={handleFocus}
            >
                {(pane.syncRoot || pane.currentPath) && (
                    <VirtualizedTable
                        key={pane.currentPath}
                        columns={columns}
                        showSelection={false}
                        dataSource={pane.entries
                            .filter(
                                (entry: FileEntry) =>
                                    !entry.name.startsWith(".")
                            )
                            .map((entry: FileEntry) => ({
                                ...entry,
                                key: joinPath(pane.currentPath, entry.name),
                            }))}
                        getRowClassName={row => getRowClass(row.name)}
                    />
                )}
            </div>

            <footer className="sync-pane__footer">
                <span>
                    {pane.entries.length} {t("ui.file.itemsCount")}
                </span>
                {hasDiff && (
                    <span>
                        {Object.keys(diffMap).length} {t("sync.stats.changed")}
                    </span>
                )}
            </footer>
        </div>
    );
};

export default SyncPane;
