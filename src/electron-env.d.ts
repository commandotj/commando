export {};

declare global {
    interface Window {
        fsApi: {
            listDir: (path: string) => Promise<any>;
            // Add other methods as needed
        };
    }
}
