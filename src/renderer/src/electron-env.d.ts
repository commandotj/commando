export {};

declare global {
    interface Window {
        fsApi: {
            listDir: (path: string) => Promise<any>;
            listDrives: () => Promise<
                Array<{
                    device: string;
                    description: string;
                    size: number;
                    mountpoints: Array<{ path: string }>;
                    isSystem: boolean;
                    isRemovable: boolean;
                }>
            >;
            /**
             * 复制文件或目录，支持单个或批量
             * @param src 源文件/目录路径或路径数组
             * @param dest 目标目录路径
             */
            copyFile: (src: string | string[], dest: string) => Promise<any>;
            // Add other methods as needed
        };
    }
}
