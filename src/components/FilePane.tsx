import React, { useState } from "react";
import { Breadcrumb, Layout, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchDirectory } from "../app/fileManagerSlice";

// Helper to split path for breadcrumb
const splitPath = (path: string) => path.split(/[\\/]/).filter(Boolean);

// Helper to join paths (cross-platform)
function joinPath(currentPath: string, name: string) {
    if (currentPath.endsWith("/")) return currentPath + name;
    if (currentPath.match(/^([A-Za-z]:)?\\/)) return currentPath + "\\" + name; // Windows
    return currentPath + "/" + name; // Unix
}

// Helper to format file size
const formatSize = (size?: number) => {
    if (size === undefined || size === null) return "";
    if (size === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, i)).toFixed(2) + " " + units[i];
};

const FilePane: React.FC<{ paneIndex: 0 | 1 }> = ({ paneIndex }) => {
    const dispatch = useAppDispatch();
    const pane = useAppSelector((state) => state.fileManager.panes[paneIndex]);

    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

    const columns: ColumnsType<any> = [
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            render: (text: string, record: any) => (
                <a
                    onClick={() => {
                        if (record.isDirectory) {
                            dispatch(
                                fetchDirectory({
                                    paneIndex,
                                    path: joinPath(
                                        pane.currentPath,
                                        record.name
                                    ),
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
            render: (isDirectory: boolean) => (isDirectory ? "Folder" : "File"),
        },
        {
            title: "Size",
            dataIndex: "size",
            key: "size",
            render: (size: number, record: any) =>
                record.isDirectory ? "" : formatSize(size),
            align: "right",
        },
    ];

    // Breadcrumb navigation
    const handleBreadcrumbClick = (index: number) => {
        const parts = splitPath(pane.currentPath);
        const isWindows = /^[A-Za-z]:/.test(pane.currentPath);
        const newPath = isWindows
            ? parts.slice(0, index + 1).join("\\")
            : "/" + parts.slice(0, index + 1).join("/");
        dispatch(fetchDirectory({ paneIndex, path: newPath }));
    };

    const parts = splitPath(pane.currentPath);

    return (
        <Layout
            style={{ height: "100%", display: "flex", flexDirection: "column" }}
        >
            <Layout.Header
                style={{
                    padding: "0 16px",
                    background: "#fff",
                    borderBottom: "1px solid #f0f0f0",
                    position: "sticky",
                    top: 0,
                    zIndex: 1,
                }}
            >
                <Breadcrumb style={{ margin: "16px 0" }}>
                    {parts.map((part, idx) => (
                        <Breadcrumb.Item key={idx}>
                            <a onClick={() => handleBreadcrumbClick(idx)}>
                                {part}
                            </a>
                        </Breadcrumb.Item>
                    ))}
                </Breadcrumb>
            </Layout.Header>
            <Layout.Content
                style={{
                    flex: 1,
                    overflow: "auto",
                    position: "relative",
                }}
            >
                <Table
                    columns={columns}
                    dataSource={pane.entries.map((entry: any, idx: number) => ({
                        ...entry,
                        key: idx,
                    }))}
                    pagination={false}
                    rowSelection={rowSelection}
                    size="small"
                    scroll={{ y: "calc(100vh - 120px)" }}
                />
            </Layout.Content>
        </Layout>
    );
};

export default FilePane;
