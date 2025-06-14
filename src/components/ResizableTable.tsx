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
}

export function ResizableTable<T extends object>({
    columns,
    dataSource,
}: ResizableTableProps<T>) {
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
        <div className="overflow-x-auto w-full">
            <div
                className="min-w-full border rounded bg-white dark:bg-gray-900"
                style={{
                    ...columnSizeVars,
                    width: table.getTotalSize(),
                }}
            >
                {/* Table Head */}
                <div className="thead">
                    {table.getHeaderGroups().map((headerGroup) => (
                        <div key={headerGroup.id} className="tr flex">
                            {headerGroup.headers.map((header) => (
                                <div
                                    key={header.id}
                                    className="th group flex items-center font-semibold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 px-2 py-2 select-none whitespace-nowrap relative"
                                    style={{
                                        width: `calc(var(--header-${header.id}-size) * 1px)`,
                                        minWidth:
                                            header.column.columnDef.minSize ??
                                            60,
                                        maxWidth:
                                            header.column.columnDef.maxSize ??
                                            800,
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
                    ))}
                </div>
                {/* Table Body */}
                <div className="tbody">
                    {table.getRowModel().rows.map((row) => (
                        <div
                            key={row.id}
                            className="tr flex hover:bg-gray-50 dark:hover:bg-gray-800"
                        >
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
