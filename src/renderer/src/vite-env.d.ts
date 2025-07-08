/// <reference types="vite/client" />
declare module 'react-splitter-layout';

declare interface MenuApi {
    onMenuAction: (callback: (action: string) => void) => void;
}

declare interface Window {
    menuApi?: MenuApi;
}
