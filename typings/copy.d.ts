// typings/copy.d.ts
// 复制相关全局类型声明
// 创建者：AI
// 创建时间：2025-06-15
// 用于主进程、worker、渲染端类型安全共享

declare global {
    interface CopyParams {
        src: string;
        dest: string;
    }

    interface ProgressMsg {
        type: "progress";
        copied: number;
        total: number;
    }

    interface DoneMsg {
        type: "done";
    }

    interface ErrorMsg {
        type: "error";
        error: string;
    }
}
export {};
