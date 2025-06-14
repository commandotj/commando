import React, { useState, useRef, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchDirectory } from "../app/fileManagerSlice";
import { ResizableTable } from "./ResizableTable";
import { joinPath, formatSize } from "../common/path";
import PathBreadcrumb from "./PathBreadcrumb";

interface FileEntry {
    name: string;
    isDirectory: boolean;
    size?: number;
}

const FilePane: React.FC<{ paneIndex: 0 | 1 }> = ({ paneIndex }) => {
    const dispatch = useAppDispatch();
    const pane = useAppSelector((state) => state.fileManager.panes[paneIndex]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const contentRef = useRef<HTMLDivElement>(null);
    const [tableHeight, setTableHeight] = useState<number>(400);

    useEffect(() => {
        function updateHeight() {
            if (contentRef.current) {
                setTableHeight(contentRef.current.clientHeight);
            }
        }
        updateHeight();
        window.addEventListener("resize", updateHeight);
        return () => window.removeEventListener("resize", updateHeight);
    }, []);

    const columns: ColumnDef<FileEntry, any>[] = [
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
                    >
                        {record.name}
                    </a>
                );
            },
        },
        {
            id: "isDirectory",
            header: "Type",
            accessorKey: "isDirectory",
            size: 100,
            cell: ({ getValue }) => (getValue() ? "Folder" : "File"),
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
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) =>
            setSelectedRowKeys(newSelectedRowKeys),
    };

    const handleBreadcrumbClick = (index: number) => {
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

    return (
        <div className="flex flex-col h-full">
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
            >
                <ResizableTable
                    key={pane.currentPath}
                    columns={columns}
                    dataSource={pane.entries
                        .filter(
                            (entry: FileEntry) => !entry.name.startsWith(".")
                        )
                        .map((entry: FileEntry, idx: number) => ({
                            ...entry,
                            key: idx,
                        }))}
                />
            </div>
            {/* Footer/Status Bar */}
            <div className="flex items-center border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-300 px-4 py-0 h-auto leading-none">
                {pane.entries.length} items, {selectedRowKeys.length} selected
            </div>
        </div>
    );
};

export default FilePane;
