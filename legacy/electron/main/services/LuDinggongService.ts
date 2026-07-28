/**
 * 鲁定公服务 - IPC桥梁服务
 *
 * 历史背景：
 * 鲁定公（姬宋，前509-前495在位）是鲁国第25代国君，春秋时期鲁国君主。
 * 孔子在鲁定公时期担任大司寇（相当于司法部长），这是孔子政治生涯的巅峰。
 * 鲁定公重用孔子，委托孔子治理国家，体现了君臣之间的信任与协作。
 *
 * 架构理念：
 * - 鲁定公 = Service层，IPC桥梁，负责连接Electron IPC到Engine层
 * - 孔子 = Engine层，引擎协调者，负责管理春秋战国诸子百家
 * - Service层不包含业务逻辑，纯粹的通信层
 * - Engine层不依赖Electron IPC，可独立测试
 *
 * 定公曰：
 * - 君臣之道，在于信任与委托
 * - 寡人信任孔子，委托孔子协调春秋战国诸子百家
 * - 寡人只负责接收IPC请求，传达给孔子，不过问具体如何执行
 */

import { IpcMainInvokeEvent, IpcMainEvent } from "electron";
import { BaseService, ServiceMetadata, Service } from "./core/ServiceDecorator";
import type { Logger } from "@common/types/LoggerTypes";
import { EngineManager } from "@engine/kongzi";
import { logger } from "../engine/laozi";

/**
 * 鲁定公服务 - IPC桥梁，委托孔子引擎协调
 *
 * 定公曰：君臣之道，在于信任与委托
 */
@Service({
    name: "LuDinggongService",
    version: "1.0.0",
    ipcChannels: [
        // 文件操作IPC通道 - 鲁定公作为IPC桥梁
        { channel: "copy:file", type: "handle" },
        { channel: "copy:batch", type: "handle" },
        { channel: "copy:cancel", type: "handle" },
        { channel: "copy:status", type: "on" },
    ],
    description: "鲁定公服务 - IPC桥梁，委托孔子引擎协调春秋战国诸子百家",
})
export default class LuDinggongService implements BaseService {
    private readonly baseLogger: Logger;
    private readonly kongziEngineManager: EngineManager;

    private isInitialized = false;

    constructor() {
        this.baseLogger = logger;
        this.kongziEngineManager = new EngineManager({
            logger: this.baseLogger,
        });
    }

    async initialize(): Promise<void> {
        if (this.isInitialized) {
            return;
        }

        this.baseLogger.info("鲁定公服务初始化开始");

        // 鲁定公委托孔子初始化引擎管理器
        await this.kongziEngineManager.initialize();

        this.isInitialized = true;
        this.baseLogger.info("鲁定公服务初始化完成，孔子已就位");
    }

    async cleanup(): Promise<void> {
        this.baseLogger.info("鲁定公服务清理开始");

        // 鲁定公委托孔子清理所有诸子百家
        await this.kongziEngineManager.cleanup();

        this.isInitialized = false;
        this.baseLogger.info("鲁定公服务清理完成");
    }

    getMetadata(): ServiceMetadata {
        return {
            name: "LuDinggongService",
            version: "1.0.0",
            ipcChannels: [
                { channel: "copy:file", type: "handle" },
                { channel: "copy:batch", type: "handle" },
                { channel: "copy:cancel", type: "handle" },
                { channel: "copy:status", type: "on" },
            ],
            description:
                "鲁定公服务 - IPC桥梁，委托孔子引擎协调春秋战国诸子百家",
        };
    }

    /**
     * 发送加载状态通知
     */
    sendLoadingState(
        _loading: boolean,
        _message?: string,
        _error?: boolean
    ): void {
        // 鲁定公不发送UI通知，专注于IPC桥梁职责
    }

    /**
     * 处理文件复制请求 - 鲁定公接收IPC，委托孔子协调鲁班执行
     *
     * 定公曰：寡人接收请求，委托孔子处理
     */
    async handleFile(event: IpcMainInvokeEvent, params: any): Promise<unknown> {
        this.baseLogger.info("鲁定公接收单文件复制IPC请求，委托孔子协调", {
            params,
        });

        // 鲁定公委托孔子引擎协调执行
        // 孔子会选择合适的引擎（鲁班）执行文件复制
        const task = {
            id: `copy-file-${Date.now()}`,
            type: "copy" as const,
            priority: 1,
            source: params.source || params.src,
            destination: params.destination || params.dest,
            options: params.options,
            progressCallback: (progress: any) => {
                // 孔子通过鲁定公报告进度给汉朝
                event.sender.send("copy:progress", progress);
            },
        };

        return await this.kongziEngineManager.executeTask(task);
    }

    /**
     * 处理批量复制请求 - 鲁定公接收IPC，委托孔子协调鲁班执行
     *
     * 定公曰：寡人接收请求，委托孔子处理
     */
    async handleBatch(
        event: IpcMainInvokeEvent,
        params: any
    ): Promise<unknown> {
        this.baseLogger.info("鲁定公接收批量复制IPC请求，委托孔子协调", {
            params,
        });

        // 鲁定公委托孔子引擎协调执行
        const task = {
            id: `copy-batch-${Date.now()}`,
            type: "copy" as const,
            priority: 1,
            source: params.sources,
            destination: params.destination,
            options: params.options,
            progressCallback: (progress: any) => {
                // 孔子通过鲁定公报告进度给汉朝
                event.sender.send("copy-batch-progress", {
                    taskId: task.id,
                    type: "progress",
                    current: progress.processedFiles || 0,
                    total: progress.totalFiles || 0,
                    file: progress.currentFile,
                    status: "running",
                });
            },
        };

        const result = await this.kongziEngineManager.executeTask(task);

        // 报告最终结果
        event.sender.send("copy-batch-progress", {
            taskId: task.id,
            type: "done",
            current: result.metrics?.filesProcessed || 0,
            total: result.metrics?.filesProcessed || 0,
            status: result.success ? "done" : "error",
            results: result.data,
        });

        return result;
    }

    /**
     * 处理取消请求 - 鲁定公接收IPC，委托孔子协调
     *
     * 定公曰：寡人接收取消令，委托孔子执行
     */
    async handleCancel(
        event: IpcMainInvokeEvent,
        params: any
    ): Promise<unknown> {
        this.baseLogger.info("鲁定公接收取消请求，委托孔子处理", { params });

        // TODO: 鲁定公委托孔子取消任务
        // 目前孔子引擎管理器没有暴露取消接口，需要增强
        const taskId = params.taskId;
        this.baseLogger.warn("取消功能待实现", { taskId });

        return { success: true, taskId, message: "取消功能待实现" };
    }

    /**
     * 处理状态查询 - 鲁定公接收IPC，委托孔子查询
     *
     * 定公曰：寡人接收查询，委托孔子报告
     */
    async handleStatus(event: IpcMainEvent, params: any): Promise<void> {
        this.baseLogger.info("鲁定公接收状态查询，委托孔子报告", { params });

        // TODO: 鲁定公委托孔子查询任务状态
        // 目前孔子引擎管理器没有暴露查询接口，需要增强
        const taskId = params.taskId;
        this.baseLogger.warn("状态查询功能待实现", { taskId });

        event.sender.send("copy:status:response", {
            taskId,
            status: "unknown",
            message: "状态查询功能待实现",
        });
    }
}
