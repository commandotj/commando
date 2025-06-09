import React, { useState, useRef, useEffect } from "react";
import { Breadcrumb } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchDirectory } from "../../app/fileManagerSlice";
import { splitPath, joinPath, formatSize } from "./utils";
import { ResizableTable } from "../ResizableTable/index";
import "./styles.css";

interface FileEntry {
    name: string;
    isDirectory: boolean;
    size?: number;
}

const FilePane: React.FC<{ paneIndex: 0 | 1 }> = ({ paneIndex }) => {
    const dispatch = useAppDispatch();
    const pane = useAppSelector((state) => {
        return state.fileManager.panes[paneIndex];
    });
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

    // Define columns inline for simplicity
    const columns: ColumnsType<FileEntry> = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            width: 200,
            render: (text: string, record: FileEntry) => (
                <a
                    onClick={() => {
                        if (!pane.currentPath) {
                            return;
                        }
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
            ),
        },
        {
            title: "Type",
            dataIndex: "isDirectory",
            key: "isDirectory",
            width: 100,
            render: (isDirectory: boolean) => (isDirectory ? "Folder" : "File"),
        },
        {
            title: "Size",
            dataIndex: "size",
            key: "size",
            width: 100,
            render: (size: number | undefined, record: FileEntry) =>
                record.isDirectory ? "" : formatSize(size),
            align: "right",
        },
    ];

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    // Breadcrumb navigation
    const handleBreadcrumbClick = (index: number) => {
        const parts = splitPath(pane.currentPath);
        let newPath = "";
        if (parts.length > 0) {
            // For Unix: join with "/" and prepend "/"
            newPath = "/" + parts.slice(0, index + 1).join("/");
            // For Windows: handle drive letter
            if (/^[A-Za-z]:$/.test(parts[0])) {
                newPath = parts.slice(0, index + 1).join("\\");
            }
        } else {
            newPath = "/";
        }
        dispatch(fetchDirectory({ paneIndex, path: newPath }));
    };

    const parts = splitPath(pane.currentPath);

    return (
        <div className="flex flex-col file-pane">
            {/* Header/Breadcrumb */}
            <div className="h-8 border-b border-gray-200 px-4 flex items-center flex-shrink-0">
                <Breadcrumb className="m-0 h-8 leading-8 p-0 whitespace-nowrap overflow-hidden text-ellipsis">
                    {parts.map((part, idx) => (
                        <Breadcrumb.Item key={idx}>
                            <a onClick={() => handleBreadcrumbClick(idx)}>
                                {part}
                            </a>
                        </Breadcrumb.Item>
                    ))}
                </Breadcrumb>
            </div>
            {/* Content/Table */}
            <div className="flex-1 min-h-0" ref={contentRef}>
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
                    onColumnsChange={() => {}}
                    pagination={false}
                    rowSelection={rowSelection}
                    size="small"
                    scroll={{ y: tableHeight }}
                />
            </div>
            {/* Footer/Status Bar */}
            <div className="h-8 border-t border-gray-200 flex items-center px-4 text-sm text-gray-500 flex-shrink-0">
                {pane.entries.length} items, {selectedRowKeys.length} selected
            </div>
        </div>
    );
};

export default FilePane;
