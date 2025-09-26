/**
 * 目录和文件相关的通用类型定义
 * 供 main、renderer、preload 进程共同使用
 */

export interface DirectoryEntry {
    name: string;
    isDirectory: boolean;
    size: number | undefined;
    mtime: number | undefined;
    isHidden?: boolean;
    permissions?: {
        readable: boolean;
        writable: boolean;
        executable: boolean;
    };
    extension?: string;
}

export interface NavigationResult {
    success: boolean;
    path: string;
    entries: DirectoryEntry[];
}

export interface ListDirectoryOptions {
    includeHidden?: boolean;
    sortBy?: 'name' | 'size' | 'mtime' | 'type';
    sortOrder?: 'asc' | 'desc';
    includePermissions?: boolean;
}