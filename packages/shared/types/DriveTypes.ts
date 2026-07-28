/**
 * 磁盘驱动器相关的通用类型定义
 * 供 main、renderer、preload 进程共同使用
 */

export interface DriveInfo {
    device: string;
    description: string;
    size: number;
    mountpoints: { path: string }[];
    isSystem: boolean;
    isRemovable: boolean;
    // 扩展字段
    isReady?: boolean;
    fileSystem?: string;
    label?: string;
    busType?: string;
    // 使用情况
    used?: number;
    available?: number;
    usePercent?: number;
}

export interface DriveListOptions {
    includeRemovable?: boolean;
    includeSystem?: boolean;
    sortBy?: "device" | "size" | "description";
    sortOrder?: "asc" | "desc";
}

export interface DriveDetails extends DriveInfo {
    // 详细信息
    partitions?: Array<{
        device: string;
        mountpoint: string;
        fileSystem: string;
        size: number;
        used?: number;
        available?: number;
    }>;
    health?: {
        temperature?: number;
        powerOnHours?: number;
        status?: "healthy" | "warning" | "critical";
    };
}
