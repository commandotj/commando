import React, { useState, useRef, useEffect } from "react";
import { splitPath } from "../common/path";

export interface PathBreadcrumbProps {
    path: string;
    onClick?: (index: number, part: string) => void;
    className?: string;
    maxVisibleItems?: number; // 可配置最大可见层级数，默认5
}

const PathBreadcrumb: React.FC<PathBreadcrumbProps> = ({
    path,
    onClick,
    className = "",
    maxVisibleItems = 5,
}) => {
    const parts = splitPath(path);
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const fullPath = parts.join("/");

    // 折叠逻辑：只显示首、末、当前前后各一层，其余折叠
    let displayParts: (string | { ellipsis: true; hidden: string[] })[] = [];
    if (parts.length <= maxVisibleItems) {
        displayParts = parts;
    } else {
        const first = parts[0];
        const last = parts[parts.length - 1];
        const beforeLast = parts[parts.length - 2];
        // 展示首层、...、倒数第二、末层
        displayParts = [
            first,
            { ellipsis: true, hidden: parts.slice(1, parts.length - 2) },
            beforeLast,
            last,
        ];
    }

    // 关闭菜单的点击外部处理
    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e: MouseEvent) {
            if (
                menuRef.current &&
                !menuRef.current.contains(e.target as Node)
            ) {
                setMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [menuOpen]);

    return (
        <nav
            className={`truncate w-full overflow-hidden whitespace-nowrap flex items-center text-sm text-gray-500 dark:text-gray-300 ${className}`}
            aria-label="Breadcrumb"
            title={fullPath}
        >
            <ol className="flex items-center space-x-1 min-w-0">
                {displayParts.map((part, idx) => {
                    if (typeof part === "string") {
                        // 计算原始索引
                        const origIdx =
                            parts.length <= maxVisibleItems
                                ? idx
                                : idx === 0
                                ? 0
                                : idx === displayParts.length - 2
                                ? parts.length - 2
                                : parts.length - 1;
                        return (
                            <li
                                key={origIdx}
                                className="flex items-center min-w-0"
                            >
                                {idx > 0 && (
                                    <span className="mx-1 text-gray-400 dark:text-gray-600">
                                        /
                                    </span>
                                )}
                                <a
                                    onClick={(e) => {
                                        e.preventDefault();
                                        onClick?.(origIdx, parts[origIdx]);
                                    }}
                                    className="hover:underline cursor-pointer text-blue-700 dark:text-blue-400 truncate max-w-[120px]"
                                    title={parts[origIdx]}
                                >
                                    {parts[origIdx]}
                                </a>
                            </li>
                        );
                    } else {
                        // 折叠部分
                        return (
                            <li
                                key="ellipsis"
                                className="flex items-center min-w-0 relative"
                            >
                                <span className="mx-1 text-gray-400 dark:text-gray-600">
                                    /
                                </span>
                                <div className="relative" ref={menuRef}>
                                    <button
                                        className="px-1 text-gray-400 hover:text-blue-500 focus:outline-none"
                                        title={part.hidden.join("/")}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setMenuOpen((v) => !v);
                                        }}
                                    >
                                        ...
                                    </button>
                                    {menuOpen && (
                                        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow min-w-[120px] py-1">
                                            {part.hidden.map((seg, i) => {
                                                const origIdx = i + 1;
                                                return (
                                                    <div
                                                        key={seg}
                                                        className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer truncate"
                                                        title={seg}
                                                        onClick={(e) => {
                                                            e.preventDefault();
                                                            setMenuOpen(false);
                                                            onClick?.(
                                                                origIdx,
                                                                seg
                                                            );
                                                        }}
                                                    >
                                                        {seg}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </li>
                        );
                    }
                })}
            </ol>
        </nav>
    );
};

export default PathBreadcrumb;
