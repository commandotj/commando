import React, { useState, useRef } from "react";
import { Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    DragMoveEvent,
} from "@dnd-kit/core";
import { ResizableTableHeader } from "../ResizableTableHeader";
import { ResizableTableOverlay } from "../ResizableTableOverlay";

interface ResizableTableProps<T> {
    columns: ColumnsType<T>;
    dataSource: T[];
    onColumnsChange: (columns: ColumnsType<T>) => void;
    pagination?: false | { pageSize: number };
    rowSelection?: {
        selectedRowKeys: React.Key[];
        onChange: (selectedRowKeys: React.Key[]) => void;
    };
    size?: "small" | "middle" | "large";
    scroll?: { y?: number | string };
}

export const ResizableTable = <T extends object>({
    columns,
    dataSource,
    onColumnsChange,
    pagination,
    rowSelection,
    size,
    scroll,
}: ResizableTableProps<T>) => {
    const [activeResize, setActiveResize] = useState<string | null>(null);
    const [currentWidth, setCurrentWidth] = useState<number>(0);
    const initialWidthRef = useRef<number>(0);
    const activeColumnRef = useRef<string | null>(null);
    const [localColumns, setLocalColumns] = useState<ColumnsType<T>>(columns);
    const [isDragging, setIsDragging] = useState(false);

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 0,
            },
        })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const columnKey = (active.id as string).replace("resize-", "");
        const columnIndex = columns.findIndex((col) => col.key === columnKey);

        if (columnIndex !== -1) {
            activeColumnRef.current = columnKey;
            const initialWidth = columns[columnIndex].width as number;
            initialWidthRef.current = initialWidth;
            setCurrentWidth(initialWidth);
            setActiveResize(columnKey);
            setIsDragging(true);
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active } = event;
        const columnKey = (active.id as string).replace("resize-", "");
        const columnIndex = columns.findIndex((col) => col.key === columnKey);

        if (columnIndex !== -1) {
            const newColumns = [...columns];
            newColumns[columnIndex] = {
                ...newColumns[columnIndex],
                width: currentWidth,
            };
            onColumnsChange(newColumns);
            setLocalColumns(newColumns);
        }

        setActiveResize(null);
        activeColumnRef.current = null;
        setIsDragging(false);
    };

    const handleDragMove = (event: DragMoveEvent) => {
        if (activeResize && activeColumnRef.current) {
            const { delta } = event;
            const minWidth = 50;
            const newWidth = Math.max(
                minWidth,
                initialWidthRef.current + delta.x
            );
            setCurrentWidth(newWidth);

            // Update local columns immediately
            const columnIndex = localColumns.findIndex(
                (col) => col.key === activeColumnRef.current
            );
            if (columnIndex !== -1) {
                const newLocalColumns = [...localColumns];
                newLocalColumns[columnIndex] = {
                    ...newLocalColumns[columnIndex],
                    width: newWidth,
                };
                setLocalColumns(newLocalColumns);
            }
        }
    };

    const resizableColumns = localColumns.map((col) => ({
        ...col,
        onHeaderCell: (column: any) => ({
            width: activeResize === column.key ? currentWidth : column.width,
            columnKey: column.key,
            isDragging: isDragging && activeResize === column.key,
        }),
    }));

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
        >
            <div
                style={{
                    position: "relative",
                    cursor: isDragging ? "col-resize" : "default",
                }}
            >
                <Table
                    columns={resizableColumns}
                    dataSource={dataSource}
                    pagination={pagination}
                    rowSelection={rowSelection}
                    size={size}
                    scroll={scroll}
                    components={{
                        header: {
                            cell: ResizableTableHeader,
                        },
                    }}
                />
                {activeResize && <ResizableTableOverlay active={true} />}
            </div>
        </DndContext>
    );
};
