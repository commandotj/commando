import React, { useRef, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
    fetchDirectory,
    setPaneSelectedKeys,
    setActivePane,
} from "../app/fileManagerSlice";
import { fetchDrives } from "../app/driveSlice";
import { useDriveEvents } from "../hooks/useDriveEvents";
import { useI18n } from "../hooks/useI18n";
import { ResizableTable } from "./ResizableTable";
import { joinPath, formatSize } from "../common/path";
import { formatFileTime } from "../common/time";
import PathBreadcrumb from "./PathBreadcrumb";
import DeviceBar, { DeviceInfo } from "./DeviceBar";
import FileContextMenu from "./FileContextMenu";
import logger from "../logger";

interface FileEntry {
    name: string;
    isDirectory: boolean;
    size?: number;
    mtime?: number;
}

const FilePane: React.FC<{ paneIndex: 0 | 1 }> = ({ paneIndex }) => {
    const dispatch = useAppDispatch();
    const pane = useAppSelector(state => state.fileManager.panes[paneIndex]);
    const { drives, loading, error } = useAppSelector(state => state.drive);
    const contentRef = useRef<HTMLDivElement>(null);
    const { t } = useI18n();

    // 监听驱动器事件
    useDriveEvents();

    useEffect(() => {
        logger.info("FilePane mounted", { paneIndex });
        function updateHeight(): void {
            if (contentRef.current) {
                // setTableHeight(contentRef.current.clientHeight);
            }
        }
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, [paneIndex]);

    // 组件挂载时获取驱动器列表
    useEffect(() => {
        dispatch(fetchDrives());
    }, [dispatch]);

    // 过滤和处理驱动器数据
    const filteredDevices = React.useMemo(() => {
        const filterLogicalDisks = (devices: DeviceInfo[]): DeviceInfo[] =>
            devices
                .map(dev => ({
                    ...dev,
                    mountpoints: dev.mountpoints.filter(
                        mp =>
                            (mp.path === "/" ||
                                mp.path.startsWith("/Volumes/")) &&
                            !/^\/Volumes\/(Preboot|Recovery|VM)$/.test(
                                mp.path
                            ) &&
                            !mp.path.startsWith("/System/Volumes/")
                    ),
                }))
                .filter(dev => dev.mountpoints.length > 0);

        let logicalDisks = filterLogicalDisks(drives);

        // 全局去重挂载点 path
        const seen = new Set<string>();
        logicalDisks = logicalDisks
            .map(dev => ({
                ...dev,
                mountpoints: dev.mountpoints.filter(mp => {
                    if (seen.has(mp.path)) return false;
                    seen.add(mp.path);
                    return true;
                }),
            }))
            .filter(dev => dev.mountpoints.length > 0);

        return logicalDisks;
    }, [drives]);

    useEffect(() => {
        logger.info("selectedRowKeys changed", {
            paneIndex,
            selectedRowKeys: pane.selectedKeys,
        });
    }, [pane.selectedKeys, paneIndex]);

    const columns: ColumnDef<FileEntry, unknown>[] = [
        {
            id: "name",
            header: t("ui.table.name") as string,
            accessorKey: "name",
            size: 200,
            cell: ({ row }) => {
                const record = row.original;
                return (
                    <a
                        onClick={() => {
                            if (!pane.currentPath) return;
                            if (record.isDirectory) {
                                const nextPath = joinPath(
                                    pane.currentPath,
                                    record.name
                                );
                                dispatch(
                                    fetchDirectory({
                                        paneIndex,
                                        path: nextPath,
                                    })
                                );
                            }
                        }}
                        className="cmd-file-link"
                    >
                        {record.name}
                    </a>
                );
            },
        },
        {
            id: "mtime",
            header: t("ui.table.dateModified") as string,
            accessorKey: "mtime",
            size: 180,
            cell: ({ row }) => {
                const mtime = row.original.mtime;
                if (!mtime) return "";
                return formatFileTime(mtime);
            },
        },
        {
            id: "size",
            header: t("ui.table.size") as string,
            accessorKey: "size",
            size: 100,
            cell: ({ row }) =>
                row.original.isDirectory ? "" : formatSize(row.original.size),
            meta: { align: "right" },
        },
        {
            id: "isDirectory",
            header: t("ui.table.type") as string,
            accessorKey: "isDirectory",
            size: 100,
            cell: ({ getValue }) =>
                getValue() ? t("ui.file.typeFolder") : t("ui.file.typeFile"),
        },
    ];

    const handleFocus = (): void => {
        dispatch(setActivePane(paneIndex));
    };

    const handleBreadcrumbClick = (index: number): void => {
        logger.info("Breadcrumb click", {
            paneIndex,
            index,
            currentPath: pane.currentPath,
        });
        const parts = pane.currentPath.split(/[\\/]/).filter(Boolean);
        let newPath = "";
        if (parts.length > 0) {
            newPath = "/" + parts.slice(0, index + 1).join("/");
            if (/^[A-Za-z]:$/.test(parts[0])) {
                newPath = parts.slice(0, index + 1).join("\\");
            }
        } else {
            newPath = "/";
        }
        dispatch(fetchDirectory({ paneIndex, path: newPath }));
    };

    const handleDeviceClick = (mountPath: string): void => {
        logger.info("Device click", { paneIndex, mountPath });
        dispatch(fetchDirectory({ paneIndex, path: mountPath }));
    };

    const handleDelete = (files: string[]): void => {
        // TODO: Implement delete functionality
        console.log("Delete files:", files);
    };

    const handleRename = (file: string): void => {
        // TODO: Implement rename functionality
        console.log("Rename file:", file);
    };

    const handleNewFolder = (): void => {
        // TODO: Implement new folder functionality
        console.log("Create new folder in:", pane.currentPath);
    };

    return (
        <div className="cmd-file-pane">
            {/* DeviceBar 设备栏 */}
            <DeviceBar
                devices={filteredDevices}
                currentPath={pane.currentPath}
                onDeviceClick={handleDeviceClick}
                loading={loading}
                error={error || undefined}
            />
            {/* Header/Breadcrumb */}
            <div className="cmd-file-pane__breadcrumb-bar">
                <PathBreadcrumb
                    path={pane.currentPath}
                    onClick={handleBreadcrumbClick}
                />
            </div>
            {/* Content/Table */}
            <div
                className="cmd-file-pane__content"
                ref={contentRef}
                tabIndex={0}
                onFocus={handleFocus}
            >
                <FileContextMenu
                    selectedFiles={[]}
                    currentPath={pane.currentPath}
                    currentPane={paneIndex}
                    onDelete={handleDelete}
                    onRename={handleRename}
                    onNewFolder={handleNewFolder}
                >
                    <ResizableTable
                        key={pane.currentPath}
                        columns={columns}
                        dataSource={pane.entries
                            .filter(
                                (entry: FileEntry) =>
                                    !entry.name.startsWith(".")
                            )
                            .map((entry: FileEntry) => ({
                                ...entry,
                                key: joinPath(pane.currentPath, entry.name),
                            }))}
                        selectedRowKeys={pane.selectedKeys}
                        onRowSelectionChange={(
                            newSelectedRowKeys: React.Key[]
                        ) => {
                            dispatch(
                                setPaneSelectedKeys({
                                    paneIndex,
                                    selectedKeys:
                                        newSelectedRowKeys.map(String),
                                })
                            );
                        }}
                        renderRowContextMenu={(_row, _rowIndex, rowElement) => (
                            <FileContextMenu
                                selectedFiles={pane.selectedKeys}
                                currentPath={pane.currentPath}
                                currentPane={paneIndex}
                                onDelete={handleDelete}
                                onRename={handleRename}
                                onNewFolder={handleNewFolder}
                            >
                                {rowElement}
                            </FileContextMenu>
                        )}
                    />
                </FileContextMenu>
            </div>
            {/* Footer/Status Bar */}
            <div className="cmd-file-pane__footer">
                {pane.entries.length} {t("ui.file.itemsCount") as string},{" "}
                {t("ui.file.selectedCount") as string}{" "}
                {pane.selectedKeys.length}
            </div>
        </div>
    );
};

export default FilePane;
