/**
 * 本地化支持
 * 支持多语言界面文本管理
 */

export type Locale = "zh-CN" | "en-US";

export interface LocaleMessages {
    // 驱动器相关
    DRIVE_SCANNING: string;
    DRIVE_REFRESHING: string;
    DRIVE_LOADING_FAILED: string;
    DRIVE_NOT_DETECTED: string;
    DRIVE_HOME_DIRECTORY: string;
    DRIVE_SYSTEM_DISK: string;
    DRIVE_REMOVABLE: string;
    DRIVE_AVAILABLE: string;
    DRIVE_USED_PERCENT: string;
    DRIVE_TOTAL: string;

    // 文件管理相关
    FILE_ITEMS_COUNT: string;
    FILE_SELECTED_COUNT: string;
    FILE_TYPE_FOLDER: string;
    FILE_TYPE_FILE: string;

    // 表格列头
    COLUMN_NAME: string;
    COLUMN_DATE_MODIFIED: string;
    COLUMN_SIZE: string;
    COLUMN_TYPE: string;

    // 操作相关
    ACTION_REFRESH: string;
    ACTION_DELETE: string;
    ACTION_RENAME: string;
    ACTION_NEW_FOLDER: string;

    // 状态相关
    STATUS_LOADING: string;
    STATUS_ERROR: string;
    STATUS_SUCCESS: string;
    STATUS_WARNING: string;

    // 通用
    BUTTON_MORE: string;
    TOOLTIP_REFRESH_DRIVES: string;
}

export const messages: Record<Locale, LocaleMessages> = {
    "zh-CN": {
        // 驱动器相关
        DRIVE_SCANNING: "正在扫描驱动器...",
        DRIVE_REFRESHING: "正在刷新磁盘列表...",
        DRIVE_LOADING_FAILED: "加载失败",
        DRIVE_NOT_DETECTED: "未检测到驱动器",
        DRIVE_HOME_DIRECTORY: "主目录",
        DRIVE_SYSTEM_DISK: "系统磁盘",
        DRIVE_REMOVABLE: "可移动",
        DRIVE_AVAILABLE: "可用",
        DRIVE_USED_PERCENT: "已使用",
        DRIVE_TOTAL: "共",

        // 文件管理相关
        FILE_ITEMS_COUNT: "项",
        FILE_SELECTED_COUNT: "已选中",
        FILE_TYPE_FOLDER: "文件夹",
        FILE_TYPE_FILE: "文件",

        // 表格列头
        COLUMN_NAME: "名称",
        COLUMN_DATE_MODIFIED: "修改日期",
        COLUMN_SIZE: "大小",
        COLUMN_TYPE: "类型",

        // 操作相关
        ACTION_REFRESH: "刷新",
        ACTION_DELETE: "删除文件",
        ACTION_RENAME: "重命名文件",
        ACTION_NEW_FOLDER: "新建文件夹",

        // 状态相关
        STATUS_LOADING: "正在加载...",
        STATUS_ERROR: "错误",
        STATUS_SUCCESS: "成功",
        STATUS_WARNING: "警告",

        // 通用
        BUTTON_MORE: "…",
        TOOLTIP_REFRESH_DRIVES: "刷新驱动器列表",
    },
    "en-US": {
        // 驱动器相关
        DRIVE_SCANNING: "Scanning drives...",
        DRIVE_REFRESHING: "Refreshing disk list...",
        DRIVE_LOADING_FAILED: "Loading failed",
        DRIVE_NOT_DETECTED: "No drives detected",
        DRIVE_HOME_DIRECTORY: "Home Directory",
        DRIVE_SYSTEM_DISK: "System Disk",
        DRIVE_REMOVABLE: "Removable",
        DRIVE_AVAILABLE: "Available",
        DRIVE_USED_PERCENT: "Used",
        DRIVE_TOTAL: "Total",

        // 文件管理相关
        FILE_ITEMS_COUNT: "items",
        FILE_SELECTED_COUNT: "selected",
        FILE_TYPE_FOLDER: "Folder",
        FILE_TYPE_FILE: "File",

        // 表格列头
        COLUMN_NAME: "Name",
        COLUMN_DATE_MODIFIED: "Date Modified",
        COLUMN_SIZE: "Size",
        COLUMN_TYPE: "Type",

        // 操作相关
        ACTION_REFRESH: "Refresh",
        ACTION_DELETE: "Delete Files",
        ACTION_RENAME: "Rename File",
        ACTION_NEW_FOLDER: "New Folder",

        // 状态相关
        STATUS_LOADING: "Loading...",
        STATUS_ERROR: "Error",
        STATUS_SUCCESS: "Success",
        STATUS_WARNING: "Warning",

        // 通用
        BUTTON_MORE: "…",
        TOOLTIP_REFRESH_DRIVES: "Refresh drive list",
    },
};

export const DEFAULT_LOCALE: Locale = "zh-CN";

export function getMessages(locale: Locale = DEFAULT_LOCALE): LocaleMessages {
    return messages[locale] || messages[DEFAULT_LOCALE];
}
