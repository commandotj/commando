# RFC-2024-004: 日志模块 API 设计

---
作者: albert.li/AI  
创建时间: 2024-06-09  
修改历史:
  - 2024-06-09: 初稿 by AI
  - 2024-06-09: 按 feature name 目录重构 by AI
  - 2024-12-19: 转换为RFC格式 by AI
---

## 摘要

为 commando-react 项目设计统一的日志模块 API，提供跨进程的日志记录能力，支持主进程、渲染进程和 preload 脚本的日志管理。API 设计遵循简洁易用、类型安全、性能优化的原则。

## 背景

### 问题描述
commando-react 作为 Electron 应用，涉及主进程、渲染进程和 preload 脚本三个环境，需要统一的日志管理机制来：
- 记录应用运行状态和错误信息
- 支持多进程日志统一管理
- 提供日志分级和归档功能
- 确保日志传输的安全性

### 现状分析
- 各进程缺乏统一的日志记录方式
- 难以进行问题排查和性能监控
- 缺乏类型安全的日志 API
- 日志管理分散，不利于维护

### 业务驱动
- 提升应用的可维护性和可调试性
- 支持生产环境的日志分析
- 提供统一的错误追踪机制
- 支持性能监控和优化

## 目标

### 主要目标
- [x] 设计统一的日志 API 接口
- [x] 支持跨进程日志传输
- [x] 提供类型安全的日志记录
- [x] 支持日志分级和归档

### 成功标准
- API 接口简洁易用
- 跨进程日志传输稳定可靠
- 类型检查完全通过
- 性能影响最小

## 提案

### 解决方案概述
设计基于 contextBridge 的安全日志 API，支持主进程、渲染进程和 preload 脚本的统一日志记录。

### 技术方案

#### API 设计
```typescript
// logApi（window.logApi）
logApi.log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any): void
  - level: 日志级别
  - message: 日志内容
  - meta: 结构化元数据（可选）

// 渲染进程 logger
logger.info(message: string, meta?: any)
logger.warn(message: string, meta?: any)
logger.error(message: string, meta?: any)
logger.debug(message: string, meta?: any)

// 主进程 logger
logger.info(message: string, meta?: any)
logger.warn(message: string, meta?: any)
logger.error(message: string, meta?: any)
logger.debug(message: string, meta?: any)
```

#### 实现细节

##### 典型用法
```typescript
import logger from './logger';

// 基础日志记录
logger.info('用户登录', { userId: 123 });
logger.error('文件复制失败', { error });

// 带元数据的日志
logger.debug('性能监控', { 
  operation: 'file-copy',
  duration: 1500,
  fileCount: 10
});
```

##### 技术架构
```
渲染进程 → logger → preload → IPC → 主进程 → winston → 文件/控制台
```

## 影响分析

### 对现有系统的影响
- **正面影响**：
  - 统一了日志管理机制
  - 提供了类型安全的日志 API
  - 支持跨进程日志传输
  - 提升了可维护性
- **负面影响**：
  - 增加了系统复杂度
  - 需要额外的 IPC 通信开销

### 兼容性分析
- 完全向后兼容，不影响现有功能
- 提供了渐进式迁移路径

### 性能影响
- IPC 通信开销较小，对性能影响微乎其微
- 日志文件 I/O 操作异步执行，不阻塞主线程
- 内存占用略有增加，但在可接受范围内

## 风险评估

### 技术风险
| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| IPC 通信失败 | 低 | 中 | 实现降级机制，本地缓存日志 |
| 日志文件过大 | 中 | 低 | 实现日志轮转和清理机制 |
| 类型安全问题 | 低 | 中 | 完整的 TypeScript 类型定义 |

### 业务风险
- 日志泄露风险：通过 contextBridge 确保安全性
- 性能影响：异步日志记录，影响最小

## 实施计划

### 阶段划分
1. **设计阶段** (1 天)
   - [x] API 接口设计
   - [x] 类型定义
2. **开发阶段** (2 天)
   - [x] 实现主进程日志模块
   - [x] 实现 IPC 通信机制
   - [x] 实现渲染进程日志封装
3. **测试阶段** (1 天)
   - [x] 单元测试覆盖
   - [x] 集成测试验证
4. **部署阶段** (1 天)
   - [x] 集成到主应用
   - [x] 性能测试验证

## 测试策略

### 测试范围
- API 接口功能测试
- 跨进程通信测试
- 类型安全测试
- 性能测试

### 测试用例
- 各日志级别的记录和输出
- 跨进程日志传输
- 日志文件归档
- 异常情况处理
- 元数据结构化记录

### 验收标准
- 所有日志级别正常工作
- IPC 通信稳定可靠
- 类型检查通过
- 性能指标符合要求

## 后续工作

### 相关 RFC
- RFC-2024-001: commando-react 日志模块设计

### 后续改进
- 支持日志轮转和清理
- 集成远程日志服务
- 支持日志查询和分析
- 添加日志过滤和搜索功能

### 监控指标
- 日志记录成功率
- IPC 通信延迟
- 日志文件大小
- 系统性能影响
- 错误日志数量

## 附录

### 参考资料
- Winston 文档：https://github.com/winstonjs/winston
- Electron contextBridge 文档：https://www.electronjs.org/docs/api/context-bridge
- TypeScript 类型定义最佳实践

### 相关讨论
- 日志级别设计讨论
- 元数据结构化标准
- 性能优化策略

### 变更记录
- 2024-06-09: 初稿设计
- 2024-06-09: 按 feature name 目录重构
- 2024-12-19: 转换为RFC格式

### 注意事项
- meta 建议为结构化对象，便于后续检索和分析
- 日志文件默认 logs/app.log，最大 10MB，最多 5 个归档
- 日志级别随 NODE_ENV 自动切换

---

**状态**: ✅ Completed  
**最后更新**: 2024-12-19  
**下次评审**: 无需
