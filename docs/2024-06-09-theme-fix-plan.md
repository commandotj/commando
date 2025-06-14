# 2024-06-09 主题一致性修复实施计划

- 文件名：2024-06-09-theme-fix-plan.md
- 创建者：AI
- 关联协议：RIPER-5 + 多维 + 代理协议 + AI开发规范

---

## 背景
本项目为基于 React、Vite、Electron、Radix UI、Tailwind CSS、Redux、Playwright 的现代文件管理器。现决定全面移除 Ant Design，采用 Radix UI 组件库，保留 Tailwind CSS 作为全局布局与细节样式工具，实现高一致性、高灵活性的主题与 UI 体系。

## 目标
- 主题切换后，所有 UI 组件（Radix、Tailwind、表格、菜单等）同步响应主题变化，无局部样式残留或错乱。
- 主题切换逻辑清晰、易于维护和扩展。
- 便于后续支持更多主题（如高对比度、色弱模式等）。
- 完全移除 Antd 依赖，所有交互与视觉均用 Radix + Tailwind 实现。

## 推荐方案
**方案一：Radix UI + Tailwind CSS（推荐组合）**
- UI 组件全部用 Radix（如 Menubar、Dialog、Popover、Table、Form 等）。
- Tailwind 负责全局布局、间距、颜色、响应式、动画、细粒度样式等。
- 主题切换由 Radix ThemeProvider 驱动，Tailwind 通过 dark: 前缀响应（或用 Radix 变量自定义 Tailwind 配置）。

### 优劣分析
**优点：**
- 灵活性极高，Tailwind 提供原子级样式控制，Radix 负责无障碍和交互逻辑。
- 设计一致性强，Radix ThemeProvider 可统一主题，Tailwind 可自定义细节。
- 渐进式开发，可逐步用 Radix 替换 Antd，Tailwind 样式体系无需大幅重构。
- 生态丰富，Tailwind 社区庞大，配合 Radix 可快速实现复杂 UI。
- 性能优秀，Tailwind 生成的 CSS 体积小，Radix 组件按需加载。

**缺点：**
- 需理解 Radix 组件 API 和 Tailwind 原子类。
- 需注意 Tailwind 与 Radix 默认样式的优先级，部分场景需手动覆盖。
- 部分高级组件需自定义（如复杂表格、数据可视化等，Radix 需自行组合实现）。

---

## 实施检查清单
1. 全面移除 Antd 及相关依赖、样式、ConfigProvider 等。
2. 全局引入并配置 Radix ThemeProvider，ThemeSwitcher 统一驱动 Radix 主题。
3. 所有 UI 组件用 Radix 替换（如菜单、弹窗、表单、表格等），并用 Tailwind 优化布局与细节。
4. Tailwind 继续通过 dark: 前缀适配自定义部分，Radix 组件由 ThemeProvider 控制。
5. 如需自定义 Radix 主题变量，可通过 ThemeProvider props 传递。
6. 检查并移除所有 Antd 相关样式、token、算法切换等遗留逻辑。
7. 全局样式文件、index.html 清理无用主题相关代码。
8. 检查所有自定义组件，确保 Tailwind `dark:` 覆盖所有 UI。
9. 移除所有硬编码颜色，统一用 Tailwind 变量或 Radix tokens。
10. 实现主题切换持久化（localStorage）。
11. 全局手动/自动测试主题切换，确保所有区域同步。
12. 记录和修复发现的任何主题同步问题。

---

如需补充特殊需求或有疑问，请随时指出。