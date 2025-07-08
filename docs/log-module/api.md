---
作者: albert.li/AI
创建时间: 2024-06-09
修改历史:
  - 2024-06-09: 初稿 by AI
  - 2024-06-09: 按 feature name 目录重构
---

# commando-react 日志模块 API 文档

## logApi（window.logApi）
- log(level: 'info' | 'warn' | 'error' | 'debug', message: string, meta?: any): void
  - level: 日志级别
  - message: 日志内容
  - meta: 结构化元数据（可选）

## 渲染进程 logger
- logger.info(message: string, meta?: any)
- logger.warn(message: string, meta?: any)
- logger.error(message: string, meta?: any)
- logger.debug(message: string, meta?: any)

## 主进程 logger
- logger.info(message: string, meta?: any)
- logger.warn(message: string, meta?: any)
- logger.error(message: string, meta?: any)
- logger.debug(message: string, meta?: any)

## 典型用法
```ts
import logger from './logger';
logger.info('用户登录', { userId: 123 });
logger.error('文件复制失败', { error });
```

## 注意事项
- meta 建议为结构化对象，便于后续检索和分析
- 日志文件默认 logs/app.log，最大 10MB，最多 5 个归档
- 日志级别随 NODE_ENV 自动切换 