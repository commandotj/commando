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
            // Add other methods as needed
        };
    }
}
