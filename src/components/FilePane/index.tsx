import React, { useState } from "react";
import { Breadcrumb, Layout } from "antd";
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
    const pane = useAppSelector((state) => state.fileManager.panes[paneIndex]);
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    const [columns, setColumns] = useState<ColumnsType<FileEntry>>([
        {
            title: "Name",
            dataIndex: "name",
            key: "name",
            width: 200,
            render: (text: string, record: FileEntry) => (
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
    ]);

    const rowSelection = {
        selectedRowKeys,
        onChange: (newSelectedRowKeys: React.Key[]) => {
            setSelectedRowKeys(newSelectedRowKeys);
        },
    };

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
            style={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
            }}
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
                <ResizableTable
                    columns={columns}
                    dataSource={pane.entries.map(
                        (entry: FileEntry, idx: number) => ({
                            ...entry,
                            key: idx,
                        })
                    )}
                    onColumnsChange={setColumns}
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
