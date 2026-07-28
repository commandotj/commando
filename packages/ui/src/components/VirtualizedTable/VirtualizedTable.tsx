import React, { useRef, useCallback } from "react";
import {
    flexRender,
    getCoreRowModel,
    useReactTable,
    type ColumnDef,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Table } from "@radix-ui/themes";
import "./virtualized-table.css";

const DEFAULT_ROW_HEIGHT = 32;
const DEFAULT_COLUMN_WIDTH = "25%";

export interface VirtualizedTableProps<T extends object> {
    columns: ColumnDef<T, unknown>[];
    dataSource: T[];
    selectedRowKeys?: React.Key[];
    onRowSelectionChange?: (selected: React.Key[]) => void;
    showSelection?: boolean;
    getRowClassName?: (row: T, rowIndex: number) => string | undefined;
    renderRowContextMenu?: (
        row: T,
        rowIndex: number,
        rowElement: React.ReactNode
    ) => React.ReactNode;
    rowHeight?: number;
}

function getRowKey<T extends object>(row: T, idx: number): React.Key {
    return (row as { key?: React.Key }).key ?? idx;
}

function getColumnWidth<T extends object>(
    column: ColumnDef<T, unknown>
): string {
    const meta = column.meta as { width?: string } | undefined;
    if (meta?.width) {
        return meta.width;
    }
    if (typeof column.size === "number" && column.size > 0) {
        return `${column.size}px`;
    }
    return DEFAULT_COLUMN_WIDTH;
}

function getColumnAlign<T extends object>(
    column: ColumnDef<T, unknown>
): "start" | "center" | "end" | undefined {
    const meta = column.meta as
        { align?: "left" | "center" | "right" } | undefined;
    if (!meta?.align) {
        return undefined;
    }
    if (meta.align === "left") {
        return "start";
    }
    if (meta.align === "right") {
        return "end";
    }
    return "center";
}

export function VirtualizedTable<T extends object>({
    columns,
    dataSource,
    selectedRowKeys = [],
    onRowSelectionChange,
    showSelection = true,
    getRowClassName,
    renderRowContextMenu,
    rowHeight = DEFAULT_ROW_HEIGHT,
}: VirtualizedTableProps<T>): JSX.Element {
    const [lastSelected, setLastSelected] = React.useState<number | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const table = useReactTable({
        data: dataSource,
        columns,
        getCoreRowModel: getCoreRowModel(),
    });

    const rows = table.getRowModel().rows;

    const rowVirtualizer = useVirtualizer({
        count: rows.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: () => rowHeight,
        overscan: 12,
    });

    const virtualRows = rowVirtualizer.getVirtualItems();
    const totalSize = rowVirtualizer.getTotalSize();
    const paddingTop = virtualRows.length > 0 ? virtualRows[0]!.start : 0;
    const paddingBottom =
        virtualRows.length > 0
            ? totalSize - virtualRows[virtualRows.length - 1]!.end
            : 0;

    const allSelected =
        dataSource.length > 0 &&
        dataSource.every((row, idx) =>
            selectedRowKeys.includes(getRowKey(row, idx))
        );

    const handleSelectAll = useCallback(
        (checked: boolean): void => {
            if (!onRowSelectionChange) {
                return;
            }
            onRowSelectionChange(
                checked ? dataSource.map((row, idx) => getRowKey(row, idx)) : []
            );
        },
        [dataSource, onRowSelectionChange]
    );

    const handleCheckboxChange = useCallback(
        (
            idx: number,
            e:
                | React.MouseEvent<HTMLInputElement>
                | React.ChangeEvent<HTMLInputElement>
        ): void => {
            if (!onRowSelectionChange) {
                return;
            }

            const nativeEvent =
                (
                    e as
                        | React.MouseEvent<HTMLInputElement>
                        | React.KeyboardEvent<HTMLInputElement>
                ).nativeEvent ||
                (e as React.ChangeEvent<HTMLInputElement>).nativeEvent;

            let newSelected = [...selectedRowKeys];

            if (
                nativeEvent &&
                "shiftKey" in nativeEvent &&
                (nativeEvent as MouseEvent | KeyboardEvent).shiftKey &&
                lastSelected !== null
            ) {
                const [start, end] = [lastSelected, idx].sort((a, b) => a - b);
                const range = Array.from(
                    { length: end - start + 1 },
                    (_, i) => start + i
                );
                const keys = range.map(i => getRowKey(dataSource[i]!, i));
                newSelected = Array.from(new Set([...newSelected, ...keys]));
            } else if (
                nativeEvent &&
                ("ctrlKey" in nativeEvent || "metaKey" in nativeEvent) &&
                ((nativeEvent as MouseEvent | KeyboardEvent).ctrlKey ||
                    (nativeEvent as MouseEvent | KeyboardEvent).metaKey)
            ) {
                const key = getRowKey(dataSource[idx]!, idx);
                newSelected = newSelected.includes(key)
                    ? newSelected.filter(k => k !== key)
                    : [...newSelected, key];
            } else {
                const key = getRowKey(dataSource[idx]!, idx);
                newSelected = newSelected.includes(key) ? [] : [key];
            }

            setLastSelected(idx);
            onRowSelectionChange(newSelected);
        },
        [dataSource, lastSelected, onRowSelectionChange, selectedRowKeys]
    );

    const headerGroup = table.getHeaderGroups()[0];

    return (
        <div className="cmd-virtual-table">
            <div ref={scrollRef} className="cmd-virtual-table__scroll">
                <Table.Root
                    layout="fixed"
                    size="1"
                    variant="surface"
                    className="cmd-virtual-table__table"
                >
                    <Table.Header className="cmd-virtual-table__header">
                        <Table.Row>
                            {showSelection && (
                                <Table.ColumnHeaderCell
                                    width="36px"
                                    className="cmd-virtual-table__select-cell"
                                >
                                    <input
                                        type="checkbox"
                                        checked={allSelected}
                                        onChange={e =>
                                            handleSelectAll(e.target.checked)
                                        }
                                        aria-label="Select all"
                                        className="cmd-checkbox"
                                    />
                                </Table.ColumnHeaderCell>
                            )}
                            {headerGroup?.headers.map(header => (
                                <Table.ColumnHeaderCell
                                    key={header.id}
                                    width={getColumnWidth(
                                        header.column.columnDef
                                    )}
                                    justify={getColumnAlign(
                                        header.column.columnDef
                                    )}
                                >
                                    {header.isPlaceholder
                                        ? null
                                        : flexRender(
                                              header.column.columnDef.header,
                                              header.getContext()
                                          )}
                                </Table.ColumnHeaderCell>
                            ))}
                        </Table.Row>
                    </Table.Header>

                    <Table.Body className="cmd-virtual-table__body">
                        {paddingTop > 0 && (
                            <Table.Row
                                aria-hidden
                                className="cmd-virtual-table__spacer"
                            >
                                <Table.Cell
                                    colSpan={
                                        (headerGroup?.headers.length ?? 0) +
                                        (showSelection ? 1 : 0)
                                    }
                                    style={{ height: paddingTop, padding: 0 }}
                                />
                            </Table.Row>
                        )}

                        {virtualRows.map(virtualRow => {
                            const row = rows[virtualRow.index];
                            if (!row) {
                                return null;
                            }

                            const rowData = dataSource[virtualRow.index]!;
                            const diffClass =
                                getRowClassName?.(rowData, virtualRow.index) ??
                                "";
                            const isSelected = selectedRowKeys.includes(
                                getRowKey(rowData, virtualRow.index)
                            );

                            const rowElement = (
                                <Table.Row
                                    key={row.id}
                                    data-index={virtualRow.index}
                                    className={[
                                        "cmd-virtual-table__row",
                                        diffClass,
                                        isSelected
                                            ? "cmd-virtual-table__row--selected"
                                            : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    style={{ height: rowHeight }}
                                >
                                    {showSelection && (
                                        <Table.Cell className="cmd-virtual-table__select-cell">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={e =>
                                                    handleCheckboxChange(
                                                        virtualRow.index,
                                                        e
                                                    )
                                                }
                                                onClick={e =>
                                                    e.stopPropagation()
                                                }
                                                aria-label="Select row"
                                                className="cmd-checkbox"
                                            />
                                        </Table.Cell>
                                    )}
                                    {row.getVisibleCells().map(cell => (
                                        <Table.Cell
                                            key={cell.id}
                                            justify={getColumnAlign(
                                                cell.column.columnDef
                                            )}
                                            className="cmd-virtual-table__cell"
                                        >
                                            {flexRender(
                                                cell.column.columnDef.cell,
                                                cell.getContext()
                                            )}
                                        </Table.Cell>
                                    ))}
                                </Table.Row>
                            );

                            return (
                                <React.Fragment key={row.id}>
                                    {renderRowContextMenu
                                        ? renderRowContextMenu(
                                              rowData,
                                              virtualRow.index,
                                              rowElement
                                          )
                                        : rowElement}
                                </React.Fragment>
                            );
                        })}

                        {paddingBottom > 0 && (
                            <Table.Row
                                aria-hidden
                                className="cmd-virtual-table__spacer"
                            >
                                <Table.Cell
                                    colSpan={
                                        (headerGroup?.headers.length ?? 0) +
                                        (showSelection ? 1 : 0)
                                    }
                                    style={{
                                        height: paddingBottom,
                                        padding: 0,
                                    }}
                                />
                            </Table.Row>
                        )}
                    </Table.Body>
                </Table.Root>
            </div>
        </div>
    );
}
