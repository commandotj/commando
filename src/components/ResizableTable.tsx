// NOTE: For best results, add the following CSS to your global styles (e.g., index.css):
//
// .resizer {
//   position: absolute;
//   right: 0;
//   top: 0;
//   bottom: 0;
//   width: 6px;
//   background: transparent;
//   cursor: col-resize;
//   user-select: none;
//   touch-action: none;
//   transition: background 0.2s;
//   z-index: 10;
// }
// .resizer:hover,
// .resizer.isResizing {
//   background: #60a5fa; /* Tailwind blue-400 */
// }

import React from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table";

interface ResizableTableProps<T extends object> {
    columns: ColumnDef<T, any>[];
    dataSource: T[];
    selectedRowKeys?: React.Key[];
    onRowSelectionChange?: (selected: React.Key[]) => void;
}

function getRowKey<T extends object>(row: T, idx: number): React.Key {
    // 兼容 key 字段不存在的情况
    return (row as any).key ?? idx;
}

export function ResizableTable<T extends object>({
    columns,
    dataSource,
    selectedRowKeys = [],
    onRowSelectionChange,
}: ResizableTableProps<T>) {
    const [lastSelected, setLastSelected] = React.useState<number | null>(null);
    // 选中项 state 由父组件控制
    const handleCheckboxChange = (
        idx: number,
        e:
            | React.MouseEvent<HTMLInputElement>
            | React.ChangeEvent<HTMLInputElement>
    ) => {
        let newSelected: React.Key[] = [...selectedRowKeys];
        // 兼容 onClick/onChange 事件
        const event =
            (e as React.MouseEvent<HTMLInputElement>).nativeEvent ||
            (e as React.ChangeEvent<HTMLInputElement>).nativeEvent;
        if (event && event.shiftKey && lastSelected !== null) {
            // shift 多选：选中区间所有行
            const [start, end] = [lastSelected, idx].sort((a, b) => a - b);
            const range = Array.from(
                { length: end - start + 1 },
                (_, i) => start + i
            );
            const keys = range.map((i) => getRowKey(dataSource[i], i));
            newSelected = Array.from(new Set([...newSelected, ...keys]));
        } else if (event && (event.ctrlKey || event.metaKey)) {
            // ctrl/command 多选：增量选择/取消选择
            const key = getRowKey(dataSource[idx], idx);
            if (newSelected.includes(key)) {
                newSelected = newSelected.filter((k) => k !== key);
            } else {
                newSelected.push(key);
            }
        } else {
            // 单选：只选当前行
            const key = getRowKey(dataSource[idx], idx);
            if (newSelected.includes(key)) {
                newSelected = newSelected.filter((k) => k !== key);
            } else {
                newSelected = [key];
            }
        }
        setLastSelected(idx);
        onRowSelectionChange?.(newSelected);
    };
    // 全选
    const allSelected =
        dataSource.length > 0 &&
        dataSource.every((row, idx) =>
            selectedRowKeys.includes(getRowKey(row, idx))
        );
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            onRowSelectionChange?.(
                dataSource.map((row, idx) => getRowKey(row, idx))
            );
        } else {
            onRowSelectionChange?.([]);
        }
    };

    // 新增：checkbox toggle 逻辑
    const toggleRowSelection = (idx: number) => {
        const key = getRowKey(dataSource[idx], idx);
        let newSelected: React.Key[] = [...selectedRowKeys];
        if (newSelected.includes(key)) {
            newSelected = newSelected.filter((k) => k !== key);
        } else {
            newSelected.push(key);
        }
        onRowSelectionChange?.(newSelected);
    };

    const table = useReactTable({
        data: dataSource,
        columns,
        columnResizeMode: "onChange",
        getCoreRowModel: getCoreRowModel(),
        defaultColumn: {
            minSize: 60,
            maxSize: 800,
        },
    });

    // Compute CSS variables for column sizes
    const columnSizeVars = React.useMemo(() => {
        const headers = table.getFlatHeaders();
        const colSizes: { [key: string]: number } = {};
        for (let i = 0; i < headers.length; i++) {
            const header = headers[i]!;
            colSizes[`--header-${header.id}-size`] = header.getSize();
            colSizes[`--col-${header.column.id}-size`] =
                header.column.getSize();
        }
        return colSizes;
    }, [table.getState().columnSizingInfo, table.getState().columnSizing]);

    return (
        <div className="w-full h-full min-w-0">
            <div
                className="w-full border rounded bg-white dark:bg-gray-900"
                style={{
                    ...columnSizeVars,
                    width: table.getTotalSize(),
                }}
            >
                {/* Table Head */}
                <div className="thead">
                    <div className="tr flex">
                        {/* 多选列头 */}
                        <div
                            className="th flex items-center justify-center border-b border-gray-200 dark:border-gray-700 px-2 py-2 select-none"
                            style={{ width: 36 }}
                        >
                            <input
                                type="checkbox"
                                checked={allSelected}
                                onChange={handleSelectAll}
                                aria-label="Select all"
                                className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-blue-500 dark:checked:border-blue-500 focus:ring-blue-500 focus:ring-2 transition-colors"
                            />
                        </div>
                        {table.getHeaderGroups()[0].headers.map((header) => (
                            <div
                                key={header.id}
                                className="th group flex items-center font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 px-2 py-2 select-none whitespace-nowrap relative"
                                style={{
                                    width: `calc(var(--header-${header.id}-size) * 1px)`,
                                    minWidth:
                                        header.column.columnDef.minSize ?? 60,
                                    maxWidth:
                                        header.column.columnDef.maxSize ?? 800,
                                }}
                            >
                                {header.isPlaceholder
                                    ? null
                                    : flexRender(
                                          header.column.columnDef.header,
                                          header.getContext()
                                      )}
                                {/* Resize handle */}
                                {header.column.getCanResize() && (
                                    <div
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        onDoubleClick={() =>
                                            header.column.resetSize?.()
                                        }
                                        className={
                                            "absolute right-0 top-0 bottom-0 w-2 cursor-col-resize z-10 bg-gray-200/50 dark:bg-gray-700/50 hover:bg-blue-300 dark:hover:bg-blue-800 transition-colors duration-150" +
                                            (header.column.getIsResizing()
                                                ? " bg-blue-400 dark:bg-blue-700"
                                                : "")
                                        }
                                        tabIndex={0}
                                        role="separator"
                                        aria-orientation="vertical"
                                        aria-label="Resize column"
                                        data-resize-handle={true}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
                {/* Table Body */}
                <div className="tbody">
                    {table.getRowModel().rows.map((row, idx) => (
                        <div
                            key={row.id}
                            className={
                                "tr flex hover:bg-gray-50 dark:hover:bg-gray-800" +
                                (selectedRowKeys.includes(
                                    getRowKey(dataSource[idx], idx)
                                )
                                    ? " bg-blue-100 dark:bg-blue-900/40 border-l-4 border-blue-400 dark:border-blue-500"
                                    : "")
                            }
                        >
                            {/* 多选列 */}
                            <div
                                className="td flex items-center justify-center px-2 py-1 border-b border-gray-200 dark:border-gray-700"
                                style={{ width: 36 }}
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedRowKeys.includes(
                                        getRowKey(dataSource[idx], idx)
                                    )}
                                    onChange={(e) =>
                                        handleCheckboxChange(idx, e)
                                    }
                                    onClick={(e) => e.stopPropagation()}
                                    aria-label="Select row"
                                    className="form-checkbox h-4 w-4 text-blue-600 border-gray-300 dark:border-gray-600 dark:bg-gray-800 dark:checked:bg-blue-500 dark:checked:border-blue-500 focus:ring-blue-500 focus:ring-2 transition-colors"
                                />
                            </div>
                            {row.getVisibleCells().map((cell) => (
                                <div
                                    key={cell.id}
                                    className="td truncate px-2 py-1 border-b border-gray-200 dark:border-gray-700"
                                    style={{
                                        width: `calc(var(--col-${cell.column.id}-size) * 1px)`,
                                    }}
                                >
                                    {flexRender(
                                        cell.column.columnDef.cell,
                                        cell.getContext()
                                    )}
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
