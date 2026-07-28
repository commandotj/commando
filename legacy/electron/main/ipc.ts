/**
 * IPC处理器注册 - 已迁移到孔子引擎管理器
 *
 * 根据RFC-2025-010时空人格化架构：
 * - 孔子（EngineManager）作为时空通道协调者，负责所有IPC通信
 * - 此文件保留用于向后兼容，但实际处理已转移到孔子引擎
 *
 * 时空架构说明：
 * - 刘邦（渲染进程）通过韩信（Preload）发送IPC请求
 * - 孔子（EngineManager）接收并协调处理
 * - 孔子委托鲁班（Engine）等引擎执行具体任务
 */

export function registerIpcHandlers(): void {
    // 注意：所有IPC处理已迁移到孔子引擎管理器（EngineManager）
    // 孔子作为时空通道协调者，统一管理所有跨时空通信

    console.log("IPC处理器注册已迁移到孔子引擎管理器");
    console.log("孔子引擎将作为时空通道协调者处理所有IPC通信");
}
