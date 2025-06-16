---
作者: AI (albert.li)
创建时间: 2024-06-09
修改历史:
- 2024-06-09 首次创建，记录 FilePane 多选 key 类型一致性问题及解决方案
---

# FilePane 多选 key 类型一致性问题

## 问题现象
FilePane 组件迁移到 Redux 管理 selectedRowKeys 后，若 dataSource 的 key 字段为 number 类型而 selectedRowKeys 为 string，导致 React diff 机制异常，表现为多选/高亮状态失效。

## 根因分析
@tanstack/react-table 及 antd Table 等受控表格组件，selectedRowKeys 必须与 dataSource key 类型完全一致，否则 React 识别不到选中项。

## 解决方案
强制 dataSource key: String(idx)，确保所有 key 均为 string，与 Redux selectedRowKeys 类型一致。

## 历史记录
2024-06-09 由 AI 发现并修复，已在 FilePane.tsx 关键处添加注释。

## 参考
- 相关代码：src/renderer/src/components/FilePane.tsx
- 归档规范：feature name 目录 + 元信息头部 