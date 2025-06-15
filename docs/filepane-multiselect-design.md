# FilePane 多选交互设计文档

## 1. 设计问题详尽分析

- 如何让 checkbox 的点击行为既支持增量选择/取消，又与 Ctrl/Cmd/Shift 组合键兼容？
- 如何保证 UI 反馈（高亮、勾选）与 selectedRowKeys 状态完全同步？
- 如何避免"单选"误操作，确保用户每次点击都能直观地增减选中项？
- 如何兼容主流文件管理器的多选体验（如 Windows Explorer、macOS Finder）？
- 事件处理与状态流转：事件入口、分流、状态变更、UI反馈
- 边界与异常场景：lastSelected 未定义、重复点击、与拖拽/排序兼容性

---

## 2. 多选交互序列图

**说明：** 展示用户点击 checkbox 后，事件如何在组件间流转，如何根据组合键决定多选逻辑。

```mermaid
sequenceDiagram
    participant User as "用户"
    participant Checkbox as "Checkbox组件"
    participant Table as "ResizableTable父组件"
    participant State as "selectedRowKeys状态"
    User->>Checkbox: 点击checkbox (可带Ctrl/Cmd/Shift)
    Checkbox->>Table: 触发onChange/onClick事件
    Table->>Table: handleCheckboxChange(idx, event)
    alt Shift多选
        Table->>State: 选中区间所有行
    else Ctrl/Cmd多选
        Table->>State: 增量选/取消当前行
    else 普通点击
        Table->>State: 增量选/取消当前行
    end
    State-->>Table: 更新selectedRowKeys
    Table-->>Checkbox: 受控checked属性刷新
    Checkbox-->>User: UI反馈（高亮/勾选）
```

---

## 3. 多选逻辑流程图

**说明：** 展示多选逻辑的分支与状态流转。

```mermaid
flowchart TD
    A[用户点击checkbox] --> B{按键状态}
    B -- Shift --> C[区间多选]
    B -- Ctrl/Cmd --> D[增量选/取消]
    B -- 无修饰键 --> D
    C --> E[合并区间所有行到selectedRowKeys]
    D --> F[切换当前行选中状态]
    E --> G[更新selectedRowKeys]
    F --> G
    G --> H[刷新UI反馈]
```

---

## 4. 状态流转与分支判定图

**说明：** 详细描述事件分支与状态更新的判定过程。

```mermaid
flowchart TD
    S1[初始状态: selectedRowKeys] --> S2[用户点击checkbox]
    S2 --> S3{event.shiftKey?}
    S3 -- 是 --> S4[区间多选: 合并区间所有行]
    S3 -- 否 --> S5{event.ctrlKey/metaKey?}
    S5 -- 是 --> S6[增量选/取消当前行]
    S5 -- 否 --> S6
    S4 --> S7[更新selectedRowKeys]
    S6 --> S7
    S7 --> S8[UI刷新: 高亮/勾选]
```

---

## 5. 逻辑分层图

**说明：** 展示 UI、事件处理、状态管理、UI反馈的分层关系。

```mermaid
flowchart TD
    subgraph 逻辑分层
        A1[UI层: Checkbox] --> B1[事件处理: handleCheckboxChange]
        B1 --> C1[状态管理: selectedRowKeys]
        C1 --> D1[UI反馈: checked/高亮]
    end
```

---

## 6. 兼容性分析图

**说明：** 展示不同操作方式（普通、Ctrl/Cmd、Shift）下的兼容性与状态流转。

```mermaid
flowchart TD
    subgraph 兼容性分析
        A2[普通点击] --> B2[增量选/取消]
        A3[Ctrl/Cmd点击] --> B2
        A4[Shift点击] --> C2[区间多选]
        B2 & C2 --> D2[更新selectedRowKeys]
        D2 --> E2[UI反馈]
    end
``` 