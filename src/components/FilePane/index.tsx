import React, { useState } from "react";
import { Breadcrumb, Layout, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useAppDispatch, useAppSelector } from "../../app/hooks";
import { fetchDirectory } from "../../app/fileManagerSlice";
import { splitPath, joinPath, formatSize } from "./utils";
import { Resizable } from "react-resizable";
import "react-resizable/css/styles.css";
import "./styles.css";

interface ResizableTitleProps {
    onResize: (
        e: React.SyntheticEvent,
        { size }: { size: { width: number } }
    ) => void;
    width?: number;
    [key: string]: any;
}

const ResizableTitle: React.FC<ResizableTitleProps> = (props) => {
    const { onResize, width, ...restProps } = props;

    if (!width) {
        return <th {...restProps} />;
    }

    return (
        <Resizable
            width={width}
            height={0}
            handle={
                <span
                    className="react-resizable-handle"
                    onClick={(e) => e.stopPropagation()}
                />
            }
            onResize={onResize}
            draggableOpts={{ enableUserSelectHack: false }}
        >
            <th {...restProps} />
        </Resizable>
    );
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

    const handleResize =
        (index: number) =>
        (e: React.SyntheticEvent, { size }: { size: { width: number } }) => {
            const newColumns = [...columns];
            newColumns[index] = {
                ...newColumns[index],
                width: size.width,
            };
            setColumns(newColumns);
        };

    const resizableColumns = columns.map((col, index) => ({
        ...col,
        onHeaderCell: (column: any) => ({
            width: column.width,
            onResize: handleResize(index),
        }),
    })) as ColumnsType<FileEntry>;

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
                <Table
                    components={{
                        header: {
                            cell: ResizableTitle,
                        },
                    }}
                    columns={resizableColumns}
                    dataSource={pane.entries.map(
                        (entry: FileEntry, idx: number) => ({
                            ...entry,
                            key: idx,
                        })
                    )}
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
