import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { splitPath } from '../common/path';
import { calculateVisibleBreadcrumbSegments } from '../common/breadcrumb';

export interface PathBreadcrumbProps {
    path: string;
    onClick?: (index: number, part: string) => void;
    className?: string;
    minVisible?: number; // 最少可见层级数，默认2（首末）
}

const ELLIPSIS_WIDTH = 20; // px

const PathBreadcrumb: React.FC<PathBreadcrumbProps> = ({
    path,
    onClick,
    className = '',
    minVisible = 2
}) => {
    const parts = splitPath(path);
    const [menuOpen, setMenuOpen] = useState(false);
    const [visibleIdx, setVisibleIdx] = useState<number[]>(parts.map((_, i) => i));
    const [foldedIdx, setFoldedIdx] = useState<number[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const segmentRefs = useRef<(HTMLAnchorElement | null)[]>([]);
    const menuRef = useRef<HTMLDivElement>(null);
    const fullPath = parts.join('/');

    // 动态测量宽度并计算可见/折叠层级
    useLayoutEffect(() => {
        if (!containerRef.current || parts.length === 0) return;
        // 先渲染所有 segment 获取宽度
        const widths = segmentRefs.current.map((ref) => ref?.offsetWidth || 0);
        const containerWidth = containerRef.current.offsetWidth;
        const { visible, folded } = calculateVisibleBreadcrumbSegments(
            parts,
            widths,
            containerWidth,
            minVisible
        );
        setVisibleIdx(visible);
        setFoldedIdx(folded);
    }, [path, parts.length, minVisible]);

    // 响应窗口/容器 resize
    useEffect(() => {
        if (!containerRef.current) return;
        const handleResize = () => {
            // 触发重新计算
            if (!containerRef.current) return;
            const widths = segmentRefs.current.map((ref) => ref?.offsetWidth || 0);
            const containerWidth = containerRef.current.offsetWidth;
            const { visible, folded } = calculateVisibleBreadcrumbSegments(
                parts,
                widths,
                containerWidth,
                minVisible
            );
            setVisibleIdx(visible);
            setFoldedIdx(folded);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, [parts.length, minVisible, path]);

    // 关闭菜单的点击外部处理
    useEffect(() => {
        if (!menuOpen) return;
        function handleClick(e: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, [menuOpen]);

    // 渲染所有 segment 用于测量（隐藏）
    const renderHiddenSegments = () => (
        <div
            style={{
                position: 'absolute',
                visibility: 'hidden',
                pointerEvents: 'none',
                height: 0,
                overflow: 'hidden'
            }}
        >
            {parts.map((part, idx) => (
                <a
                    key={idx}
                    ref={(el) => (segmentRefs.current[idx] = el)}
                    className="inline-block px-1 text-sm font-normal"
                >
                    {part}
                </a>
            ))}
        </div>
    );

    // 渲染可见 breadcrumb
    const renderBreadcrumb = () => {
        const items: React.ReactNode[] = [];
        let ellipsisInserted = false;
        for (let i = 0; i < parts.length; i++) {
            if (visibleIdx.includes(i)) {
                if (items.length > 0) {
                    items.push(
                        <span key={`sep-${i}`} className="mx-1 text-gray-400 dark:text-gray-600">
                            /
                        </span>
                    );
                }
                items.push(
                    <a
                        key={i}
                        onClick={(e) => {
                            e.preventDefault();
                            onClick?.(i, parts[i]);
                        }}
                        className="hover:underline cursor-pointer text-blue-700 dark:text-blue-400 truncate max-w-[120px]"
                        title={parts[i]}
                    >
                        {parts[i]}
                    </a>
                );
            } else if (!ellipsisInserted && foldedIdx.length > 0) {
                // 插入 ...
                items.push(
                    <span key="ellipsis-sep" className="mx-1 text-gray-400 dark:text-gray-600">
                        /
                    </span>
                );
                items.push(
                    <div key="ellipsis" className="relative inline-block" ref={menuRef}>
                        <button
                            className="px-1 text-gray-400 hover:text-blue-500 focus:outline-none"
                            title={foldedIdx.map((idx) => parts[idx]).join('/')}
                            style={{ width: ELLIPSIS_WIDTH }}
                            onClick={(e) => {
                                e.preventDefault();
                                setMenuOpen((v) => !v);
                            }}
                        >
                            ...
                        </button>
                        {menuOpen && (
                            <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow min-w-[120px] py-1">
                                {foldedIdx.map((idx) => (
                                    <div
                                        key={idx}
                                        className="px-3 py-1 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer truncate"
                                        title={parts[idx]}
                                        onClick={(e) => {
                                            e.preventDefault();
                                            setMenuOpen(false);
                                            onClick?.(idx, parts[idx]);
                                        }}
                                    >
                                        {parts[idx]}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                );
                ellipsisInserted = true;
            }
        }
        return items;
    };

    return (
        <nav
            className={`truncate w-full overflow-hidden whitespace-nowrap flex items-center text-sm text-gray-500 dark:text-gray-300 ${className}`}
            aria-label="Breadcrumb"
            title={fullPath}
            ref={containerRef}
            style={{ position: 'relative' }}
        >
            {/* 隐藏测量用 segments */}
            {renderHiddenSegments()}
            <ol className="flex items-center space-x-1 min-w-0">{renderBreadcrumb()}</ol>
        </nav>
    );
};

export default PathBreadcrumb;
