import React, { useRef, useLayoutEffect, useState, useEffect } from "react";
import { DesktopIcon, DiscIcon } from "@radix-ui/react-icons";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useI18n } from "../hooks/useI18n";

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
    loading?: boolean;
    loadingMessage?: string;
    error?: string;
}

// 设备栏按钮宽度（含间距）估算
const BUTTON_WIDTH = 120;
const MORE_BUTTON_WIDTH = 40;

export const DeviceBar: React.FC<DeviceBarProps> = ({
    devices,
    currentPath,
    onDeviceClick,
    loading = false,
    loadingMessage,
    error,
}) => {
    const { t } = useI18n();
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
        function handleResize(): void {
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

    // 创建初始设备（主目录）作为默认设备
    const initialDevice: DeviceInfo & { mountPath: string } = {
        device: "initial",
        description: t("ui.drives.homeDirectory") as string,
        size: 0,
        mountpoints: [{ path: "/" }],
        isSystem: true,
        isRemovable: false,
        mountPath: "/",
    };

    // 展平所有挂载点，如果设备列表为空且不在加载中，则使用初始设备
    let allMounts: (DeviceInfo & { mountPath: string })[];

    if (devices.length === 0 && !loading) {
        allMounts = [initialDevice];
    } else {
        allMounts = devices.flatMap(dev =>
            dev.mountpoints.map(mp => ({
                ...dev,
                mountPath: mp.path,
            }))
        );
    }

    // 当前路径高亮
    const isActive = (path: string): boolean => currentPath.startsWith(path);
    // 主行可见设备，溢出部分进 menu
    const visible = allMounts.slice(0, maxVisible);
    const overflow = allMounts.slice(maxVisible);

    const renderBtn = (
        dev: DeviceInfo & { mountPath: string }
    ): React.JSX.Element => {
        const Icon = dev.mountPath === "/" ? DesktopIcon : DiscIcon;
        const isActiveBtn = isActive(dev.mountPath);
        return (
            <button
                key={dev.mountPath}
                type="button"
                className={
                    "cmd-device-btn" +
                    (isActiveBtn ? " cmd-device-btn--active" : "")
                }
                title={dev.description || dev.device}
                onClick={() => onDeviceClick(dev.mountPath)}
            >
                <Icon className="cmd-icon" />
                <span className="cmd-device-btn__label">{dev.mountPath}</span>
            </button>
        );
    };

    return (
        <div
            ref={containerRef}
            className="cmd-device-bar"
            data-testid="device-bar"
        >
            {/* 加载状态显示 */}
            {loading && (
                <div className="cmd-device-bar__status">
                    <div className="cmd-device-bar__spinner" />
                    <span>
                        {loadingMessage || (t("ui.drives.scanning") as string)}
                    </span>
                </div>
            )}

            {/* 错误状态显示 */}
            {error && !loading && (
                <div className="cmd-device-bar__status cmd-device-bar__status--error">
                    <span>
                        ⚠️ {t("ui.drives.loadingFailed") as string}: {error}
                    </span>
                </div>
            )}

            {/* 正常设备按钮显示 */}
            {!loading && !error && (
                <>
                    {visible.map(renderBtn)}
                    {overflow.length > 0 && (
                        <DropdownMenu.Root>
                            <DropdownMenu.Trigger asChild>
                                <button
                                    type="button"
                                    className="cmd-device-more-btn"
                                >
                                    {t("ui.buttons.more") as string}
                                </button>
                            </DropdownMenu.Trigger>
                            <DropdownMenu.Portal>
                                <DropdownMenu.Content
                                    side="bottom"
                                    align="start"
                                    sideOffset={4}
                                    className="cmd-dropdown-content"
                                    style={{
                                        maxHeight: 240,
                                        overflowY: "auto",
                                        maxWidth: 320,
                                        zIndex: 9999,
                                    }}
                                >
                                    {overflow.map(dev => (
                                        <DropdownMenu.Item
                                            key={dev.mountPath}
                                            className={
                                                "cmd-dropdown-item" +
                                                (isActive(dev.mountPath)
                                                    ? " cmd-dropdown-item--active"
                                                    : "")
                                            }
                                            onSelect={() =>
                                                onDeviceClick(dev.mountPath)
                                            }
                                            title={
                                                dev.description || dev.device
                                            }
                                        >
                                            {dev.mountPath === "/" ? (
                                                <DesktopIcon className="cmd-icon" />
                                            ) : (
                                                <DiscIcon className="cmd-icon" />
                                            )}
                                            <span className="cmd-device-btn__label">
                                                {dev.mountPath}
                                            </span>
                                        </DropdownMenu.Item>
                                    ))}
                                </DropdownMenu.Content>
                            </DropdownMenu.Portal>
                        </DropdownMenu.Root>
                    )}
                </>
            )}
        </div>
    );
};

export default DeviceBar;
