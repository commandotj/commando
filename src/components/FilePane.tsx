import React, { useState, useRef, useEffect } from "react";
import { ColumnDef } from "@tanstack/react-table";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchDirectory } from "../app/fileManagerSlice";
import { ResizableTable } from "./ResizableTable";
import { joinPath, formatSize } from "../common/path";
import PathBreadcrumb from "./PathBreadcrumb";

// --- CSS-in-JS styles ---
const filePaneStyle: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 64px)",
};
const headerStyle: React.CSSProperties = {
    height: 32,
    borderBottom: "1px solid #e5e7eb",
    paddingLeft: 16,
    paddingRight: 16,
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
};
const contentStyle: React.CSSProperties = {
    flex: 1,
    minHeight: 0,
};
const footerStyle: React.CSSProperties = {
    height: 32,
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    alignItems: "center",
    paddingLeft: 16,
    paddingRight: 16,
    fontSize: 14,
    color: "#6b7280",
    flexShrink: 0,
};

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
        <div style={filePaneStyle} className="bg-test">
            {/* Header/Breadcrumb */}
            <div style={headerStyle}>
                <PathBreadcrumb
                    path={pane.currentPath}
                    onClick={handleBreadcrumbClick}
                />
            </div>
            {/* Content/Table */}
            <div style={contentStyle} ref={contentRef}>
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
            <div style={footerStyle}>
                {pane.entries.length} items, {selectedRowKeys.length} selected
            </div>
        </div>
    );
};

export default FilePane;
