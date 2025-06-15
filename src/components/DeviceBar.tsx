import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { DesktopIcon, DiscIcon } from "@radix-ui/react-icons";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";

export interface DeviceInfo {
    device: string;
    description: string;
    size: number;
    mountpoints: Array<{ path: string }>;
    isSystem: boolean;
    isRemovable: boolean;
}

interface DeviceBarProps {
    devices: DeviceInfo[];
    currentPath: string;
    onDeviceClick: (mountPath: string) => void;
}

// 设备栏按钮宽度（含间距）估算
const BUTTON_WIDTH = 120;
const MORE_BUTTON_WIDTH = 40;

export const DeviceBar: React.FC<DeviceBarProps> = ({
    devices,
    currentPath,
    onDeviceClick,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [maxVisible, setMaxVisible] = useState<number>(devices.length);

    // 计算可见设备数
    useLayoutEffect(() => {
        if (containerRef.current) {
            const width = containerRef.current.offsetWidth;
            const max = Math.max(
                1,
                Math.floor((width - MORE_BUTTON_WIDTH) / BUTTON_WIDTH)
            );
            setMaxVisible(max);
        }
    }, [devices.length]);

    // 新增：监听 window resize，动态更新 maxVisible
    useEffect(() => {
        function handleResize() {
            if (containerRef.current) {
                const width = containerRef.current.offsetWidth;
                const max = Math.max(
                    1,
                    Math.floor((width - MORE_BUTTON_WIDTH) / BUTTON_WIDTH)
                );
                setMaxVisible(max);
            }
        }
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, [devices.length]);

    // 展平所有挂载点
    const allMounts = devices.flatMap((dev) =>
        dev.mountpoints.map((mp) => ({
            ...dev,
            mountPath: mp.path,
        }))
    );
    // 当前路径高亮
    const isActive = (path: string) => currentPath.startsWith(path);
    // 主行可见设备，溢出部分进 menu
    const visible = allMounts.slice(0, maxVisible);
    const overflow = allMounts.slice(maxVisible);

    const renderBtn = (dev: DeviceInfo & { mountPath: string }) => {
        const Icon = dev.mountPath === "/" ? DesktopIcon : DiscIcon;
        return (
            <button
                key={dev.mountPath}
                className={
                    "flex items-center gap-1 px-2 h-8 rounded text-xs font-medium transition-colors max-w-[110px] truncate justify-center items-center " +
                    (isActive(dev.mountPath)
                        ? "bg-blue-600 text-white shadow"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-blue-100 dark:hover:bg-blue-900")
                }
                title={dev.description || dev.device}
                onClick={() => onDeviceClick(dev.mountPath)}
            >
                <Icon className="w-4 h-4 mr-1 shrink-0" />
                <span className="truncate">{dev.mountPath}</span>
            </button>
        );
    };

    return (
        <div
            ref={containerRef}
            className="flex flex-row gap-2 px-4 py-1 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 items-center overflow-x-hidden"
            data-testid="device-bar"
        >
            {visible.map(renderBtn)}
            {overflow.length > 0 && (
                <DropdownMenu.Root>
                    <DropdownMenu.Trigger asChild>
                        <button className="flex items-center justify-center w-8 h-8 rounded bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-lg font-bold">
                            …
                        </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Portal>
                        <DropdownMenu.Content
                            side="bottom"
                            align="start"
                            sideOffset={4}
                            className="z-50 min-w-[160px] max-w-xs max-h-60 overflow-y-auto bg-white dark:bg-gray-800 rounded shadow-lg p-1 border border-gray-200 dark:border-gray-700"
                            style={{
                                maxHeight: 240,
                                overflowY: "auto",
                                maxWidth: 320,
                                zIndex: 9999,
                            }}
                        >
                            {overflow.map((dev) => (
                                <DropdownMenu.Item
                                    key={dev.mountPath}
                                    className={
                                        "flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors max-w-[140px] truncate cursor-pointer select-none " +
                                        (isActive(dev.mountPath)
                                            ? "bg-blue-600 text-white shadow"
                                            : "hover:bg-blue-100 dark:hover:bg-blue-900 text-gray-700 dark:text-gray-200")
                                    }
                                    onSelect={() =>
                                        onDeviceClick(dev.mountPath)
                                    }
                                    title={dev.description || dev.device}
                                >
                                    {dev.mountPath === "/" ? (
                                        <DesktopIcon className="w-4 h-4 mr-1 shrink-0" />
                                    ) : (
                                        <DiscIcon className="w-4 h-4 mr-1 shrink-0" />
                                    )}
                                    <span className="truncate">
                                        {dev.mountPath}
                                    </span>
                                </DropdownMenu.Item>
                            ))}
                        </DropdownMenu.Content>
                    </DropdownMenu.Portal>
                </DropdownMenu.Root>
            )}
        </div>
    );
};

export default DeviceBar;
