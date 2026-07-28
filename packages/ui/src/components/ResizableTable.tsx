import React, { useRef, useEffect } from "react";
import {
    useReactTable,
    getCoreRowModel,
    flexRender,
    ColumnDef,
} from "@tanstack/react-table";
import SimpleBar from "simplebar-react";
import "simplebar/dist/simplebar.min.css";

interface ResizableTableProps<T extends object> {
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
}

function getRowKey<T extends object>(row: T, idx: number): React.Key {
    // 兼容 key 字段不存在的情况
    return (row as unknown as { key?: React.Key }).key ?? idx;
}

export function ResizableTable<T extends object>({
    columns,
    dataSource,
    selectedRowKeys = [],
    onRowSelectionChange,
    showSelection = true,
    getRowClassName,
    renderRowContextMenu,
}: ResizableTableProps<T>): JSX.Element {
    const [lastSelected, setLastSelected] = React.useState<number | null>(null);
    // 选中项 state 由父组件控制
    const handleCheckboxChange = (
        idx: number,
        e:
            | React.MouseEvent<HTMLInputElement>
            | React.ChangeEvent<HTMLInputElement>
    ): void => {
        let newSelected: React.Key[] = [...selectedRowKeys];
        // 兼容 onClick/onChange 事件
        const event =
            (
                e as
                    | React.MouseEvent<HTMLInputElement>
                    | React.KeyboardEvent<HTMLInputElement>
            ).nativeEvent ||
            (e as React.ChangeEvent<HTMLInputElement>).nativeEvent;
        if (
            event &&
            "shiftKey" in event &&
            (event as MouseEvent | KeyboardEvent).shiftKey &&
            lastSelected !== null
        ) {
            // shift 多选：选中区间所有行
            const [start, end] = [lastSelected, idx].sort((a, b) => a - b);
            const range = Array.from(
                { length: end - start + 1 },
                (_, i) => start + i
            );
            const keys = range.map(i => getRowKey(dataSource[i], i));
            newSelected = Array.from(new Set([...newSelected, ...keys]));
        } else if (
            event &&
            ("ctrlKey" in event || "metaKey" in event) &&
            ((event as MouseEvent | KeyboardEvent).ctrlKey ||
                (event as MouseEvent | KeyboardEvent).metaKey)
        ) {
            // ctrl/command 多选：增量选择/取消选择
            const key = getRowKey(dataSource[idx], idx);
            if (newSelected.includes(key)) {
                newSelected = newSelected.filter(k => k !== key);
            } else {
                newSelected.push(key);
            }
        } else {
            // 单选：只选当前行
            const key = getRowKey(dataSource[idx], idx);
            if (newSelected.includes(key)) {
                newSelected = newSelected.filter(k => k !== key);
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
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>): void => {
        if (e.target.checked) {
            onRowSelectionChange?.(
                dataSource.map((row, idx) => getRowKey(row, idx))
            );
        } else {
            onRowSelectionChange?.([]);
        }
    };

    // Removed unused toggleRowSelection function

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

    const headerRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);

    // 滚动同步：body 横向滚动时 header 跟随
    useEffect(() => {
        const body = bodyRef.current;
        const header = headerRef.current;
        if (!body || !header) return;
        const handleScroll = (): void => {
            header.scrollLeft = body.scrollLeft;
        };
        body.addEventListener("scroll", handleScroll);
        return () => {
            body.removeEventListener("scroll", handleScroll);
        };
    }, []);

    return (
        <div className="cmd-table">
            {/* Header 区域，固定高度，不滚动，无滚动条 */}
            <div
                ref={headerRef}
                className="cmd-table__header-wrap"
                style={{
                    ...columnSizeVars,
                    width: "100%",
                    height: 48, // 固定 header 高度
                    minHeight: 48,
                    zIndex: 10,
                    position: "relative",
                    overflow: "hidden", // 禁止 header 区域出现滚动条
                }}
            >
                <div className="thead">
                    <div className="tr">
                        {/* 多选列头 */}
                        {showSelection && (
                            <div
                                className="th cmd-table__th cmd-table__th--select"
                                style={{ width: 36, flex: "0 0 36px" }}
                            >
                                <input
                                    type="checkbox"
                                    checked={allSelected}
                                    onChange={handleSelectAll}
                                    aria-label="Select all"
                                    className="cmd-checkbox"
                                />
                            </div>
                        )}
                        {table.getHeaderGroups()[0].headers.map(header => (
                            <div
                                key={header.id}
                                className="th cmd-table__th"
                                style={{
                                    flex: `0 0 calc(var(--header-${header.id}-size) * 1px)`,
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
                                            "cmd-table__resize-handle" +
                                            (header.column.getIsResizing()
                                                ? " cmd-table__resize-handle--active"
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
            </div>
            {/* Body 区域，集成 simplebar，去除多余边框/圆角类 */}
            <SimpleBar
                scrollableNodeProps={{ ref: bodyRef }}
                className="cmd-table__body"
                style={{ ...columnSizeVars }}
                autoHide={false}
            >
                <div className="tbody">
                    {table.getRowModel().rows.map((row, idx) => {
                        const diffClass =
                            getRowClassName?.(dataSource[idx], idx) ?? "";
                        const isSelected = selectedRowKeys.includes(
                            getRowKey(dataSource[idx], idx)
                        );
                        const rowElement = (
                            <div
                                className={
                                    "tr cmd-table__row" +
                                    (diffClass ? ` ${diffClass}` : "") +
                                    (isSelected
                                        ? " cmd-table__row--selected"
                                        : "")
                                }
                            >
                                {/* 多选列 */}
                                {showSelection && (
                                    <div
                                        className="td cmd-table__td cmd-table__td--select"
                                        style={{ width: 36, flex: "0 0 36px" }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={e =>
                                                handleCheckboxChange(idx, e)
                                            }
                                            onClick={e => e.stopPropagation()}
                                            aria-label="Select row"
                                            className="cmd-checkbox"
                                        />
                                    </div>
                                )}
                                {row.getVisibleCells().map(cell => (
                                    <div
                                        key={cell.id}
                                        className="td cmd-table__td"
                                        style={{
                                            flex: `0 0 calc(var(--col-${cell.column.id}-size) * 1px)`,
                                            minWidth:
                                                cell.column.columnDef.minSize ??
                                                60,
                                            maxWidth:
                                                cell.column.columnDef.maxSize ??
                                                800,
                                        }}
                                    >
                                        {flexRender(
                                            cell.column.columnDef.cell,
                                            cell.getContext()
                                        )}
                                    </div>
                                ))}
                            </div>
                        );

                        // Wrap with context menu if provided
                        return (
                            <React.Fragment key={row.id}>
                                {renderRowContextMenu
                                    ? renderRowContextMenu(
                                          dataSource[idx],
                                          idx,
                                          rowElement
                                      )
                                    : rowElement}
                            </React.Fragment>
                        );
                    })}
                </div>
            </SimpleBar>
        </div>
    );
}
