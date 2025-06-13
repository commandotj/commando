import React, { useState, useRef } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
    ColumnResizeMode,
    HeaderGroup,
    Header,
    Row,
    Cell,
    Table,
} from "@tanstack/react-table";
import {
    DndContext,
    useSensor,
    useSensors,
    PointerSensor,
    DragStartEvent,
    DragEndEvent,
    DragMoveEvent,
} from "@dnd-kit/core";
import { ResizableTableOverlay } from "./ResizableTableOverlay";

interface ResizableTableProps<T extends object> {
    columns: ColumnDef<T, any>[];
    dataSource: T[];
    onColumnsChange?: (columns: ColumnDef<T, any>[]) => void;
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
    const [columnDefs, setColumnDefs] = useState<ColumnDef<T, any>[]>(columns);
    const [activeResize, setActiveResize] = useState<string | null>(null);
    const [currentWidth, setCurrentWidth] = useState<number>(0);
    const initialWidthRef = useRef<number>(0);
    const activeColumnRef = useRef<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const tableWrapperRef = useRef<HTMLDivElement>(null);
    const [overlayX, setOverlayX] = useState<number | null>(null);
    const initialOverlayXRef = useRef<number>(0);

    // DnD-kit sensors
    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 0,
            },
        })
    );

    // react-table instance
    const table = useReactTable({
        data: dataSource,
        columns: columnDefs,
        getCoreRowModel: getCoreRowModel(),
        columnResizeMode: "onChange" as ColumnResizeMode,
        onColumnSizingChange: (_updater: unknown) => {
            setColumnDefs((old) => {
                if (onColumnsChange) onColumnsChange(old);
                return old;
            });
        },
        state: {},
    });

    // DnD handlers for resizing
    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;
        const columnKey = (active.id as string).replace("resize-", "");
        const col = table
            .getAllLeafColumns()
            .find(
                (c: ReturnType<typeof table.getAllLeafColumns>[number]) =>
                    c.id === columnKey
            );
        if (col && tableWrapperRef.current) {
            activeColumnRef.current = columnKey;
            const initialWidth = col.getSize();
            initialWidthRef.current = initialWidth;
            setCurrentWidth(initialWidth);
            setActiveResize(columnKey);
            setIsDragging(true);
            // Overlay positioning
            const ths = tableWrapperRef.current.querySelectorAll(
                "th[data-column-key]"
            );
            const th = Array.from(ths).find(
                (th) => th.getAttribute("data-column-key") === columnKey
            );
            const wrapperRect = tableWrapperRef.current.getBoundingClientRect();
            const scrollLeft = tableWrapperRef.current.scrollLeft || 0;
            if (th) {
                const rect = (th as HTMLElement).getBoundingClientRect();
                const initialOverlayX =
                    rect.right - wrapperRect.left + scrollLeft;
                setOverlayX(initialOverlayX);
                initialOverlayXRef.current = initialOverlayX;
            }
        }
    };

    const handleDragEnd = (_event: DragEndEvent) => {
        setActiveResize(null);
        activeColumnRef.current = null;
        setIsDragging(false);
        setOverlayX(null);
    };

    const handleDragMove = (event: DragMoveEvent) => {
        if (activeResize && activeColumnRef.current) {
            const { delta } = event;
            const newOverlayX = initialOverlayXRef.current + delta.x;
            setOverlayX(newOverlayX);
            // Column resizing logic
            const minWidth = 50;
            const col = table
                .getAllLeafColumns()
                .find(
                    (c: ReturnType<typeof table.getAllLeafColumns>[number]) =>
                        c.id === activeColumnRef.current
                );
            if (col) {
                const newWidth = Math.max(
                    minWidth,
                    initialWidthRef.current + delta.x
                );
                col.setSize?.(newWidth);
                setCurrentWidth(newWidth);
            }
        }
    };

    // Row selection logic
    const handleRowSelect = (rowId: React.Key) => {
        if (!rowSelection) return;
        const selected = rowSelection.selectedRowKeys.includes(rowId)
            ? rowSelection.selectedRowKeys.filter((k) => k !== rowId)
            : [...rowSelection.selectedRowKeys, rowId];
        rowSelection.onChange(selected);
    };

    return (
        <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragMove={handleDragMove}
        >
            <div
                className="flex flex-col h-full"
                ref={tableWrapperRef}
                style={{
                    position: "relative",
                    cursor: isDragging ? "col-resize" : "default",
                }}
            >
                <table className="min-w-full border-collapse table-fixed">
                    <thead>
                        {table
                            .getHeaderGroups()
                            .map((headerGroup: HeaderGroup<T>) => (
                                <tr key={headerGroup.id}>
                                    {headerGroup.headers.map(
                                        (
                                            header: Header<T, unknown>,
                                            colIndex: number
                                        ) => {
                                            const isLastColumn =
                                                colIndex ===
                                                headerGroup.headers.length - 1;
                                            const width = header.getSize();
                                            return (
                                                <th
                                                    key={header.id}
                                                    data-column-key={header.id}
                                                    style={{
                                                        position: "relative",
                                                        width,
                                                        transition: isDragging
                                                            ? "none"
                                                            : "width 0.2s ease",
                                                        userSelect: isDragging
                                                            ? "none"
                                                            : undefined,
                                                    }}
                                                >
                                                    {flexRender(
                                                        header.column.columnDef
                                                            .header,
                                                        header.getContext()
                                                    )}
                                                    {/* Resize handle */}
                                                    {!isLastColumn && (
                                                        <div
                                                            id={`resize-${header.id}`}
                                                            style={{
                                                                position:
                                                                    "absolute",
                                                                right: 0,
                                                                top: 0,
                                                                bottom: 0,
                                                                width: "8px",
                                                                cursor: "col-resize",
                                                                backgroundColor:
                                                                    isDragging &&
                                                                    activeResize ===
                                                                        header.id
                                                                        ? "#1890ff33"
                                                                        : "transparent",
                                                                transition:
                                                                    "background-color 0.2s ease",
                                                                zIndex: 2,
                                                            }}
                                                            tabIndex={0}
                                                            role="separator"
                                                            aria-orientation="vertical"
                                                            aria-label="Resize column"
                                                            // dnd-kit drag handle
                                                            {...{
                                                                "data-dnd-kit":
                                                                    true,
                                                                "data-resize-handle":
                                                                    true,
                                                            }}
                                                        />
                                                    )}
                                                </th>
                                            );
                                        }
                                    )}
                                </tr>
                            ))}
                    </thead>
                    <tbody>
                        {table.getRowModel().rows.map((row: Row<T>) => (
                            <tr key={row.id} className="hover:bg-gray-50">
                                {row
                                    .getVisibleCells()
                                    .map((cell: Cell<T, unknown>) => (
                                        <td
                                            key={cell.id}
                                            className="truncate px-2 py-1 border-b border-gray-200"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </td>
                                    ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
                {/* Overlay for resizing */}
                {activeResize && (
                    <ResizableTableOverlay active={true} overlayX={overlayX} />
                )}
            </div>
        </DndContext>
    );
};
