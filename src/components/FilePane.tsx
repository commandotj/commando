import React from "react";
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

const FilePane: React.FC<{ paneIndex: 0 | 1 }> = ({ paneIndex }) => {
    const dispatch = useAppDispatch();
    const pane = useAppSelector((state) => state.fileManager.panes[paneIndex]);

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
        <Layout>
            <Breadcrumb style={{ margin: "16px 0" }}>
                {parts.map((part, idx) => (
                    <Breadcrumb.Item key={idx}>
                        <a onClick={() => handleBreadcrumbClick(idx)}>{part}</a>
                    </Breadcrumb.Item>
                ))}
            </Breadcrumb>
            <Layout.Content>
                <Table
                    columns={columns}
                    dataSource={pane.entries.map((entry: any, idx: number) => ({
                        ...entry,
                        key: idx,
                    }))}
                    pagination={false}
                />
            </Layout.Content>
        </Layout>
    );
};

export default FilePane;
