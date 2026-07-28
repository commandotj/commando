# RFC-2024-003: FilePane 多选 key 类型一致性问题

---

作者: AI (albert.li)  
创建时间: 2024-06-09  
修改历史:

- 2024-06-09: 首次创建，记录 FilePane 多选 key 类型一致性问题及解决方案 by AI
- 2024-12-19: 转换为RFC格式 by AI

---

## 摘要

FilePane 组件迁移到 Redux 管理 selectedRowKeys 后，若 dataSource 的 key 字段为 number 类型而 selectedRowKeys 为 string，导致 React diff 机制异常，表现为多选/高亮状态失效。本RFC记录了问题根因和解决方案。

## 背景

### 问题描述

FilePane 组件迁移到 Redux 管理 selectedRowKeys 后，出现多选/高亮状态失效的问题。具体表现为：

- 用户选择文件后，UI 上无法正确显示选中状态
- 多选操作无法正常工作
- 高亮显示异常

### 现状分析

- 原有实现中 dataSource 的 key 字段为 number 类型
- Redux 中的 selectedRowKeys 为 string 类型
- @tanstack/react-table 及 antd Table 等受控表格组件对类型一致性要求严格

### 业务驱动

- 确保文件选择功能的正常工作
- 提升用户体验
- 保证组件状态管理的一致性

## 目标

### 主要目标

- [x] 解决 FilePane 多选状态失效问题
- [x] 确保 key 类型一致性
- [x] 保证 React diff 机制正常工作

### 成功标准

- 多选功能正常工作
- 高亮状态正确显示
- 类型检查通过
- 用户体验良好

## 提案

### 解决方案概述

强制 dataSource key 为 String 类型，确保与 Redux selectedRowKeys 类型完全一致。

### 技术方案

**核心解决方案**：强制 dataSource key: String(idx)，确保所有 key 均为 string，与 Redux selectedRowKeys 类型一致。

### 实现细节

#### 问题根因

@tanstack/react-table 及 antd Table 等受控表格组件，selectedRowKeys 必须与 dataSource key 类型完全一致，否则 React 识别不到选中项。

#### 解决方案

```typescript
// 修改前
dataSource: [
    { key: 0, name: "file1.txt" },
    { key: 1, name: "file2.txt" },
];

// 修改后
dataSource: [
    { key: "0", name: "file1.txt" },
    { key: "1", name: "file2.txt" },
];
```

#### 技术架构

```
FilePane 组件 → dataSource (string key) → Redux (string selectedRowKeys) → React Table
```

## 影响分析

### 对现有系统的影响

- **正面影响**：
    - 解决了多选状态失效问题
    - 提升了用户体验
    - 保证了类型一致性
- **负面影响**：
    - 需要修改 dataSource 的 key 生成逻辑
    - 轻微的字符串转换开销

### 兼容性分析

- 完全向后兼容，不影响现有功能
- 提供了类型安全的解决方案

### 性能影响

- 字符串转换开销很小，性能影响微乎其微
- 提升了组件的稳定性和可靠性

## 风险评估

### 技术风险

| 风险         | 概率 | 影响 | 缓解措施                 |
| ------------ | ---- | ---- | ------------------------ |
| 类型转换错误 | 低   | 低   | 使用标准库函数，充分测试 |
| 性能影响     | 低   | 低   | 字符串转换开销很小       |

### 业务风险

- 用户体验显著改善
- 功能稳定性提升

## 实施计划

### 阶段划分

1. **问题发现阶段** (0.5 天)
    - [x] 识别问题现象
    - [x] 分析根因
2. **解决方案阶段** (0.5 天)
    - [x] 设计解决方案
    - [x] 实现修复
3. **测试阶段** (0.5 天)
    - [x] 功能测试
    - [x] 类型检查
4. **部署阶段** (0.5 天)
    - [x] 集成到主应用
    - [x] 用户验收

## 测试策略

### 测试范围

- 多选功能测试
- 高亮状态测试
- 类型一致性测试
- 用户体验测试

### 测试用例

- 单选文件操作
- 多选文件操作
- 全选/取消全选
- 跨页选择
- 排序后选择

### 验收标准

- 多选功能正常工作
- 高亮状态正确显示
- 类型检查通过
- 无控制台错误

## 后续工作

### 相关 RFC

- RFC-2024-002: 批量复制唯一性与路径准确性设计

### 后续改进

- 优化选择性能
- 支持更复杂的选择场景
- 改进用户体验

### 监控指标

- 多选操作成功率
- 用户操作响应时间
- 类型检查通过率
- 错误日志数量

## 附录

### 参考资料

- 相关代码：src/renderer/src/components/FilePane.tsx
- React Table 文档：https://react-table.tanstack.com/
- Antd Table 文档：https://ant.design/components/table

### 相关讨论

- 2024-06-09 由 AI 发现并修复，已在 FilePane.tsx 关键处添加注释

### 变更记录

- 2024-06-09: 首次创建问题记录
- 2024-06-09: 实现解决方案
- 2024-12-19: 转换为RFC格式

---

**状态**: ✅ Completed  
**最后更新**: 2024-12-19  
**下次评审**: 无需
