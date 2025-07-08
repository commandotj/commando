# 批量复制唯一性与路径准确性设计文档

- 作者：AI+albert.li
- 创建时间：2024-06-15
- 历次修改：2024-06-15 首次归档

## 背景

在文件管理器的批量复制功能中，原有实现采用 index 作为 key 和选中项标识，导致唯一性和路径准确性不足，存在如下问题：
- index 不是全局唯一，排序/过滤/多窗口等场景下可能重复或失效。
- 复制操作链路中，index 传递导致路径拼接错误，可能出现无效路径。
- 进度跟踪、UI 展示等依赖 index，易引发状态错乱。

## 问题描述

- 选中项 selectedKeys、表格 key 字段、Modal 进度等均用 index，唯一性和准确性无法保证。
- 复制时拼接路径出错，导致实际操作文件不符预期。

## 设计方案

### 方案一（已采纳）：全链路用绝对路径
- FilePane 组件 dataSource 的 key 字段和 selectedKeys 全部用 joinPath(currentPath, entry.name) 生成的绝对路径。
- 复制操作、进度跟踪、Modal 展示等全链路都用绝对路径，彻底消除 index 依赖。
- Redux 状态、UI 展示、进度消息等全部以路径为唯一主线。

### 方案二（未采纳）：用文件名
- 仅适用于无重名、单目录场景，无法满足复杂需求。

## 实现要点

- FilePane: dataSource key/selectedKeys = joinPath(currentPath, entry.name)
- FunctionBar: 复制操作直接用 selectedKeys 作为源路径数组
- BatchCopyProgressModal: srcs、fileProgressList、key、进度消息 file 字段全部为绝对路径
- Redux 状态、UI、进度跟踪全链路唯一

## 变更影响

- 彻底消除 index 依赖，保证唯一性和健壮性
- 复制、进度、UI 展示等所有环节准确无误
- 便于后续扩展多批次、任务历史、并发等高级功能

## 测试建议

- 多选、全选、跨目录、排序、刷新等场景下，复制与进度跟踪均应准确无误
- 断点续传、错误弹窗、取消操作等边界场景需全覆盖
- 重点关注 Redux 状态、UI 展示、进度消息与实际文件操作的一致性

---

> 本文档归档于 docs/file-copy/batch-copy-unique-key-design.md，后续如有架构演进请在此基础上补充修订。 