import { useEffect } from "react";
import { useAppDispatch } from "../app/hooks";
import { setLoading, updateDrives } from "../app/driveSlice";
import type { DriveInfo } from "@commandojs/shared/types/DriveTypes";

/**
 * Hook 用于监听驱动器相关的 IPC 事件并更新 Redux store
 */
export function useDriveEvents(): void {
    const dispatch = useAppDispatch();

    useEffect(() => {
        // 监听加载状态事件
        const handleLoading = (data: {
            loading: boolean;
            message?: string;
            error?: boolean;
            timestamp: number;
        }): void => {
            dispatch(setLoading(data));
        };

        // 监听驱动器列表变化事件
        const handleDriveListChanged = (data: {
            drives: DriveInfo[];
            timestamp: number;
        }): void => {
            dispatch(updateDrives(data.drives));
        };

        // 监听驱动器刷新完成事件
        const handleDriveRefreshed = (data: {
            drives: DriveInfo[];
            timestamp: number;
        }): void => {
            dispatch(updateDrives(data.drives));
        };

        // 监听驱动器变化事件（监控模式）
        const handleDriveChanged = (data: {
            drives: DriveInfo[];
            timestamp: number;
        }): void => {
            dispatch(updateDrives(data.drives));
        };

        // 注册事件监听器
        window.fsApi.onDriveLoading(handleLoading);
        window.fsApi.onDriveListChanged(handleDriveListChanged);
        window.fsApi.onDriveRefreshed(handleDriveRefreshed);
        window.fsApi.onDriveChanged(handleDriveChanged);

        // 清理函数
        return () => {
            // 注意：preload API 不提供 removeListener，事件监听器会在组件卸载时自动清理
        };
    }, [dispatch]);
}
