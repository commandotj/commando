/**
 * 服务标识符常量
 * 定义系统中所有服务的唯一标识符
 */

export namespace ServiceIdentifiers {
    export const COPY_SERVICE = 'CopyService' as const;
    export const MOVE_SERVICE = 'MoveService' as const;
    export const DELETE_SERVICE = 'DeleteService' as const;
    export const RENAME_SERVICE = 'RenameService' as const;
    export const FILE_SERVICE = 'FileService' as const;
    export const FILE_WATCHER_SERVICE = 'FileWatcherService' as const;
    export const BATCH_PROCESSOR_SERVICE = 'BatchProcessorService' as const;
}

export type ServiceIdentifierValue = typeof ServiceIdentifiers[keyof typeof ServiceIdentifiers];