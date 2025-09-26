import React, { useState, useRef, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import {
    fetchDirectory,
    setPaneSelectedKeys,
    setActivePane,
} from "../app/fileManagerSlice";
import { ResizableTable } from "./ResizableTable";
import { joinPath, formatSize } from "../common/path";
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
    const pane = useAppSelector((state) => state.fileManager.panes[paneIndex]);
    const contentRef = useRef<HTMLDivElement>(null);
    const [devices, setDevices] = useState<DeviceInfo[]>([]);

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
    }, []);

    useEffect(() => {
        window.fsApi.listDrives().then((data) => {
            // 只保留逻辑磁盘
            const filterLogicalDisks = (devices: DeviceInfo[]): DeviceInfo[] =>
                devices
                    .map((dev) => ({
                        ...dev,
                        mountpoints: dev.mountpoints.filter(
                            (mp) =>
                                (mp.path === "/" ||
                                    mp.path.startsWith("/Volumes/")) &&
                                !/^\/Volumes\/(Preboot|Recovery|VM)$/.test(
                                    mp.path
                                ) &&
                                !mp.path.startsWith("/System/Volumes/")
                        ),
                    }))
                    .filter((dev) => dev.mountpoints.length > 0);
            let logicalDisks = filterLogicalDisks(data);
            // 全局去重挂载点 path
            const seen = new Set<string>();
            logicalDisks = logicalDisks
                .map((dev) => ({
                    ...dev,
                    mountpoints: dev.mountpoints.filter((mp) => {
                        if (seen.has(mp.path)) return false;
                        seen.add(mp.path);
                        return true;
                    }),
                }))
                .filter((dev) => dev.mountpoints.length > 0);
            setDevices(logicalDisks);
        });
    }, []);

    useEffect(() => {
        logger.info("selectedRowKeys changed", {
            paneIndex,
            selectedRowKeys: pane.selectedKeys,
        });
    }, [pane.selectedKeys, paneIndex]);

    const columns: ColumnDef<FileEntry, FileEntry>[] = [
        {
            id: "name",
            header: "Name",
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
                        className="cursor-pointer hover:underline text-blue-700 dark:text-blue-400"
                    >
                        {record.name}
                    </a>
                );
            },
        },
        {
            id: "mtime",
            header: "Date Modified",
            accessorKey: "mtime",
            size: 180,
            cell: ({ row }) => {
                const mtime = row.original.mtime;
                if (!mtime) return "";
                const date = new Date(mtime);
                return date.toLocaleString();
            },
        },
        {
            id: "size",
            header: "Size",
            accessorKey: "size",
            size: 100,
            cell: ({ row }) =>
                row.original.isDirectory ? "" : formatSize(row.original.size),
            meta: { align: "right" },
        },
        {
            id: "isDirectory",
            header: "Type",
            accessorKey: "isDirectory",
            size: 100,
            cell: ({ getValue }) => (getValue() ? "Folder" : "File"),
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

    const handleDelete = (files: string[]) => {
        // TODO: Implement delete functionality
        console.log('Delete files:', files);
    };

    const handleRename = (file: string) => {
        // TODO: Implement rename functionality
        console.log('Rename file:', file);
    };

    const handleNewFolder = () => {
        // TODO: Implement new folder functionality
        console.log('Create new folder in:', pane.currentPath);
    };

    return (
        <div className="flex flex-col h-full">
            {/* DeviceBar 设备栏 */}
            <DeviceBar
                devices={devices}
                currentPath={pane.currentPath}
                onDeviceClick={handleDeviceClick}
            />
            {/* Header/Breadcrumb */}
            <div className="h-8 border-b border-gray-200 dark:border-gray-700 px-4 flex items-center flex-shrink-0">
                <PathBreadcrumb
                    path={pane.currentPath}
                    onClick={handleBreadcrumbClick}
                />
            </div>
            {/* Content/Table */}
            <div
                className="flex-1 min-h-0 overflow-y-auto box-border"
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
                            (entry: FileEntry) => !entry.name.startsWith(".")
                        )
                        .map((entry: FileEntry) => ({
                            ...entry,
                            key: joinPath(pane.currentPath, entry.name),
                        }))}
                    selectedRowKeys={pane.selectedKeys}
                    onRowSelectionChange={(newSelectedRowKeys: React.Key[]) => {
                        dispatch(
                            setPaneSelectedKeys({
                                paneIndex,
                                selectedKeys: newSelectedRowKeys.map(String),
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
            <div className="flex items-center border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-300 px-4 py-0 h-[2rem] leading-none">
                {pane.entries.length} items, 已选中 {pane.selectedKeys.length}{" "}
                项
            </div>
        </div>
    );
};

export default FilePane;
