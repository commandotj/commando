/**
 * 服务标识符常量
 * 定义系统中所有服务的唯一标识符
 */

export const ServiceIdentifiers = {
    COPY_SERVICE: "CopyService",
    MOVE_SERVICE: "MoveService",
    DELETE_SERVICE: "DeleteService",
    RENAME_SERVICE: "RenameService",
    FILE_SERVICE: "FileService",
    FILE_WATCHER_SERVICE: "FileWatcherService",
    BATCH_PROCESSOR_SERVICE: "BatchProcessorService",
    DIRECTORY_SERVICE: "DirectoryService",
    DRIVE_SERVICE: "DriveService",
} as const;

export type ServiceIdentifierValue =
    (typeof ServiceIdentifiers)[keyof typeof ServiceIdentifiers];
