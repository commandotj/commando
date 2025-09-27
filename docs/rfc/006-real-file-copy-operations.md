# RFC-2025-006: Complete File Operations with Total Commander Functionality

---
作者: Claude Code Assistant/albert.li
创建时间: 2025-09-25
修改历史:
  - 2025-09-25: 初稿 by Claude Code Assistant
  - 2025-09-26: 重大更新 - 明确功能范围和UI设计方向
---

## 摘要

本 RFC 提出了一个完整的文件操作系统，**100% 复制 Total Commander 的核心文件操作功能**，包括复制、移动、删除、重命名等所有操作，同时采用**现代化 UI 设计风格**与项目整体设计保持一致。目标是提供专业级的文件管理体验，同时保持现代化的用户界面。

## 背景

### 问题描述

当前 commando-react 项目的文件操作功能存在以下问题：
1. **功能不完整**: 缺少专业文件管理器的核心功能（移动、删除、重命名、创建文件夹等）
2. **进度报告不真实**: 当前的复制进度可能是模拟的，无法反映真实的复制状态
3. **缺少任务队列UI**: 用户无法看到操作任务队列状态，不知道有多少任务在排队
4. **操作体验不专业**: 缺少文件冲突处理、批量操作确认等专业功能
5. **UI 风格不统一**: 现有进度界面与项目整体设计风格存在差异

### 现状分析

目前项目已建立了基于服务架构的文件服务，但功能有限：
- ✅ **已有**: CopyService, FileService, DriveService, DirectoryService
- ❌ **缺少**: 完整的文件操作功能集合
- ❌ **缺少**: 专业级的进度跟踪和任务管理
- ❌ **缺少**: 与项目设计风格一致的操作界面

### 业务驱动

专业文件管理器用户需要：
- **完整的文件操作**: 复制、移动、删除、重命名、创建文件夹
- **真实的进度跟踪**: 字节级精度、实时速度、剩余时间估算
- **专业的操作体验**: 文件冲突处理、批量操作、操作确认
- **现代化的界面**: 与项目整体设计风格保持一致的UI

## 目标

### 主要目标

#### 核心功能目标（100% Total Commander 兼容）
- [ ] **文件复制**: 单文件、多文件、文件夹递归复制
- [ ] **文件移动**: 跨驱动器移动、同驱动器重命名移动
- [ ] **文件删除**: 删除到回收站、永久删除、批量删除
- [ ] **文件重命名**: 单文件重命名、批量重命名模式
- [ ] **文件夹操作**: 创建文件夹、删除空/非空文件夹
- [ ] **冲突处理**: 文件覆盖、跳过、重命名选项
- [ ] **批量操作**: 多选文件的批量处理

#### 技术目标
- [ ] 实现真实的文件操作进度跟踪（字节级精度）
- [ ] 创建现代化的操作进度界面（保持项目设计风格）
- [ ] 提供完整的任务队列管理系统
- [ ] 支持高级任务控制功能（暂停/取消/重试）

#### UI/UX 目标
- [ ] **设计一致性**: 与项目 Radix UI + Tailwind 设计风格完全匹配
- [ ] **响应式设计**: 支持不同窗口大小和分辨率
- [ ] **深色主题**: 完整的深色模式支持
- [ ] **可访问性**: 遵循 WCAG 2.1 标准

### 成功标准
- **功能完整性**: 实现 Total Commander 的所有核心文件操作功能
- **进度精确性**: 进度报告精确度达到字节级别，实时速度计算
- **界面一致性**: UI 设计与项目整体风格 100% 匹配
- **性能标准**: 操作响应时间 < 200ms，大文件操作不阻塞界面
- **稳定性**: 操作成功率 > 99.9%，支持错误恢复和重试

## 提案

### 解决方案概述

基于分析和讨论，我们决定采用 **Total Commander 完整功能集** + **现代化 UI 设计** + **graceful-fs 精确操作引擎**的混合方案。这个方案在专业功能、现代设计和技术实现之间达到最佳平衡。

#### 核心设计原则
1. **功能优先**: 100% 实现 Total Commander 的核心文件操作功能
2. **设计一致**: UI 风格与项目现有 Radix UI + Tailwind 设计完全匹配
3. **现代体验**: 保持现代化的交互体验（圆角、阴影、动画、深色主题）
4. **性能卓越**: 基于成熟技术栈确保操作性能和稳定性

## 完整功能清单

### Total Commander 核心功能

#### 1. 文件复制操作
```typescript
interface CopyOperation {
  type: 'copy';
  sources: string[];           // 支持多文件选择
  destination: string;         // 目标路径
  options: {
    overwriteMode: 'ask' | 'overwrite' | 'skip' | 'rename';
    preserveTimestamps: boolean;
    preserveAttributes: boolean;
    verifyAfterCopy: boolean;
  };
}
```

#### 2. 文件移动操作
```typescript
interface MoveOperation {
  type: 'move';
  sources: string[];
  destination: string;
  options: {
    crossDriveMove: boolean;    // 跨驱动器移动（复制后删除）
    overwriteMode: 'ask' | 'overwrite' | 'skip' | 'rename';
  };
}
```

#### 3. 文件删除操作
```typescript
interface DeleteOperation {
  type: 'delete';
  targets: string[];
  options: {
    permanent: boolean;         // true=永久删除, false=移至回收站
    confirmEach: boolean;       // 逐个确认
    deleteReadOnly: boolean;    // 删除只读文件
  };
}
```

#### 4. 文件重命名操作
```typescript
interface RenameOperation {
  type: 'rename';
  target: string;
  newName: string;
  options: {
    batchMode?: {              // 批量重命名
      pattern: string;         // 重命名模式
      replacement: string;     // 替换文本
      useRegex: boolean;       // 使用正则表达式
    };
  };
}
```

#### 5. 文件夹操作
```typescript
interface FolderOperation {
  type: 'create-folder' | 'delete-folder';
  path: string;
  options: {
    recursive?: boolean;       // 递归删除非空文件夹
    confirmDelete?: boolean;   // 删除前确认
  };
}
```

#### 6. 文件冲突处理
```typescript
interface ConflictResolution {
  action: 'overwrite' | 'skip' | 'rename' | 'compare';
  applyToAll: boolean;         // 应用到所有冲突
  newName?: string;            // 重命名时的新名称
}
```

## 技术方案

### 1. 核心技术选择

#### 文件操作引擎: `graceful-fs` + Node.js Streams

```bash
npm install graceful-fs @types/graceful-fs
```

**专业级选择的技术深度分析**:

##### 1. 企业级稳定性要求
专业文件管理器必须达到以下标准：
- **零文件损坏率**: 确保数据完整性和原子性操作
- **99.99% 操作成功率**: 处理各种边缘情况和系统限制
- **跨平台一致性**: Windows/macOS/Linux 统一体验
- **高并发支持**: 同时处理数千个文件而不崩溃

##### 2. graceful-fs vs 原生 fs 专业对比

| 专业特性 | 原生 fs | graceful-fs | 业务影响 |
|----------|---------|-------------|----------|
| **并发文件操作** | 系统 fd 限制，易 EMFILE | 智能队列管理，无限制 | ❌ 大批量操作失败 vs ✅ 稳定处理 |
| **错误恢复机制** | 手动实现重试 | 自动重试 + 降级 | ❌ 用户体验差 vs ✅ 透明恢复 |
| **跨平台兼容** | 基础 POSIX 支持 | 深度平台优化 | ❌ 平台特定 bug vs ✅ 一致体验 |
| **大文件处理** | 基础流实现 | 优化的缓冲和流控制 | ❌ 内存问题 vs ✅ 稳定性能 |
| **资源管理** | 手动 fd 管理 | 自动池化和清理 | ❌ 内存泄漏风险 vs ✅ 自动管理 |
| **网络驱动器** | 基础支持 | 延迟优化处理 | ❌ 超时失败 vs ✅ 智能适配 |

##### 3. 真实场景下的专业挑战

**场景 1: 大批量文件操作**
```typescript
// 用户复制包含 10,000 个文件的项目文件夹
// 原生 fs 问题：
try {
  await Promise.all(files.map(file => fs.copyFile(file.src, file.dest)));
} catch (error) {
  // Error: EMFILE: too many open files, open '/path/to/file'
  // Error: ENFILE: file table overflow
  // 结果：操作失败，用户数据丢失
}

// graceful-fs 解决方案：
const gracefulFs = require('graceful-fs');
// 自动队列管理，确保操作成功完成
await Promise.all(files.map(file => gracefulFs.copyFile(file.src, file.dest)));
```

**场景 2: 跨平台文件系统差异**
```typescript
// Windows: NTFS 锁定文件、长路径、权限模型
// macOS: HFS+/APFS 元数据、资源分支、大小写敏感
// Linux: ext4/btrfs 权限、软硬链接、特殊文件

// graceful-fs 内置处理这些平台差异
// 原生 fs 需要大量平台特定代码
```

##### 4. 专业架构考量

**技术债务 vs 长期价值**
```typescript
// ❌ 捷径思维（技术债务累积）：
"现有代码用原生 fs，为了代码一致性继续使用"
// 结果：后期维护成本指数增长，用户体验问题频发

// ✅ 专业思维（长期价值导向）：
"选择行业最佳实践，重构现有代码以符合专业标准"
// 结果：长期稳定性、可维护性、用户满意度
```

**迁移策略**
```typescript
// Phase 1: 建立专业基础 (Week 1-2)
// 1. 安装 graceful-fs 并建立新的文件操作标准
// 2. 创建统一的文件操作引擎
// 3. 新功能全部使用 graceful-fs

// Phase 2: 渐进式重构 (Week 3-4)
// 1. 创建 fs 适配器层，支持平滑迁移
// 2. 逐步迁移现有服务（FileService, DirectoryService, etc.）
// 3. 建立完善的错误处理和监控

// Phase 3: 专业化提升 (Week 5-6)
// 1. 全面采用 graceful-fs
// 2. 实现企业级错误恢复机制
// 3. 性能优化和压力测试
```

##### 5. 专业标准实现

```typescript
// 专业级文件操作引擎
class ProfessionalFileEngine {
  private gracefulFs = require('graceful-fs');
  private concurrencyLimit = new PQueue({ concurrency: 10 });
  private checksumValidator = new IntegrityValidator();

  async copyWithIntegrity(src: string, dest: string): Promise<void> {
    return this.concurrencyLimit.add(async () => {
      // 1. 预检查：权限、空间、路径有效性
      await this.preflightCheck(src, dest);

      // 2. 校验和计算（确保数据完整性）
      const srcChecksum = await this.checksumValidator.calculate(src);

      // 3. 原子性操作（先写临时文件，后重命名）
      const tempDest = `${dest}.tmp.${Date.now()}`;
      await this.atomicCopy(src, tempDest);

      // 4. 完整性验证
      const destChecksum = await this.checksumValidator.calculate(tempDest);
      if (srcChecksum !== destChecksum) {
        throw new IntegrityError('File corruption detected');
      }

      // 5. 原子性提交
      await this.gracefulFs.rename(tempDest, dest);

      // 6. 元数据保持（时间戳、权限）
      await this.preserveMetadata(src, dest);
    });
  }
}
```

**专业决策原则**:
- ✅ **用户第一**: 选择能提供最佳用户体验的技术
- ✅ **专业标准**: 对标 Total Commander、Beyond Compare 等行业标杆
- ✅ **长远思维**: 考虑 5 年后的维护成本和技术演进
- ✅ **数据安全**: 银行级数据完整性保证
- ✅ **性能卓越**: 工业级大数据处理能力

#### UI 设计风格: 现代化 Total Commander 功能体验

**设计原则**: Total Commander 功能 + 现代化 UI 设计
- **功能完整性**: 100% 复制 Total Commander 的操作功能和交互逻辑
- **设计现代化**: 使用项目现有的 Radix UI + Tailwind 设计语言
- **体验一致性**: 与项目整体风格保持完全一致

**具体设计要求**:
```typescript
// 设计规范对照
interface ModernTCDesign {
  // ✅ 保留的 TC 功能特性
  functionality: {
    progressTracking: 'byte-level-precision';
    conflictResolution: 'overwrite | skip | rename | compare';
    batchOperations: 'multi-file-support';
    taskControl: 'pause | cancel | background | priority';
    queueManagement: 'multiple-tasks | task-switching';
  };

  // ✅ 现代化的视觉设计
  visualDesign: {
    components: 'Radix UI Dialog | Progress | Button | Checkbox';
    styling: 'Tailwind CSS classes';
    theme: 'light-mode | dark-mode';
    animation: 'Framer Motion transitions';
    layout: 'responsive-grid | flexbox';
    typography: 'project-font-system';
  };

  // ✅ 增强的用户体验
  userExperience: {
    accessibility: 'WCAG 2.1 AA compliant';
    responsive: 'mobile-friendly | tablet-optimized';
    keyboard: 'full-keyboard-navigation';
    screenReader: 'comprehensive-aria-labels';
  };
}
```

**对比分析: 经典 TC vs 现代化设计**

| 设计元素 | 经典 Total Commander | 现代化 Commando 设计 |
|----------|---------------------|---------------------|
| **对话框** | Windows 经典边框 | Radix UI Dialog + 圆角阴影 |
| **进度条** | 系统默认进度条 | Radix Progress + 渐变动画 |
| **按钮** | 经典 Windows 按钮 | Radix Button + Tailwind 样式 |
| **颜色** | 系统默认配色 | 项目主题色 + 深色模式 |
| **字体** | 系统默认字体 | 项目字体系统 |
| **间距** | 紧凑布局 | 现代化间距设计 |
| **图标** | 经典图标 | Radix Icons + 现代图标 |

### 2. 进度跟踪精度

#### 适中精度方案
```typescript
interface CopyProgress {
  // 任务标识
  taskId: string;

  // 路径信息
  sourcePath: string;
  destinationPath: string;
  currentFile: string;

  // 字节级精确进度
  copiedBytes: number;
  totalBytes: number;
  percentage: number;        // 0-100

  // 文件级进度
  completedFiles: number;
  totalFiles: number;

  // 性能指标 (每秒更新)
  speed: number;             // bytes/second
  eta: number;               // seconds remaining

  // 任务状态
  status: 'analyzing' | 'copying' | 'paused' | 'conflict' | 'completed' | 'cancelled' | 'error';

  // 错误信息
  errors: CopyError[];
}
```

#### 更新频率策略
- **小文件 (< 1MB)**: 每 100KB 报告一次进度
- **中等文件 (1-100MB)**: 每 1MB 报告一次进度
- **大文件 (> 100MB)**: 每 10MB 报告一次进度

### 3. UI 设计：现代化 Total Commander 体验

#### 主操作对话框设计（现代化版本）

**设计目标**: 保持 TC 功能完整性 + 现代化视觉体验

```typescript
// 现代化文件操作对话框组件
const ModernFileOperationDialog: React.FC<FileOperationProps> = ({
  operation, // 'copy' | 'move' | 'delete' | 'rename'
  sources,
  destination,
  onClose,
  onBackground,
  onPause,
  onCancel
}) => {
  return (
    <Dialog.Root open={true} onOpenChange={onClose}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed z-50 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
          bg-white dark:bg-gray-900 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700
          w-full max-w-2xl p-6 focus:outline-none">

          {/* 标题栏 - 现代化设计 */}
          <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
            <FileOperationIcon type={operation} className="w-5 h-5" />
            {getOperationTitle(operation)}
          </Dialog.Title>

          {/* 路径信息 - 现代化布局 */}
          <div className="space-y-3 mb-6">
            <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-400">From:</span>
              <div className="min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border">
                <div className="truncate text-sm font-mono">{formatPath(sources)}</div>
              </div>
            </div>
            {destination && (
              <div className="grid grid-cols-[auto_1fr] gap-3 items-center">
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">To:</span>
                <div className="min-w-0 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-md border">
                  <div className="truncate text-sm font-mono">{destination}</div>
                </div>
              </div>
            )}
          </div>

          {/* 当前文件信息 - 现代化显示 */}
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-sm text-blue-900 dark:text-blue-100">
              Current: <span className="font-medium">{currentFile?.name}</span>
              <span className="text-blue-600 dark:text-blue-400 ml-2">({formatSize(currentFile?.size)})</span>
            </div>
          </div>

          {/* 进度显示 - 现代化进度条 */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
              <span>Overall Progress</span>
              <span className="font-medium">{progress.percentage}%</span>
            </div>
            <Progress.Root
              value={progress.percentage}
              max={100}
              className="relative w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden"
            >
              <Progress.Indicator
                className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress.percentage}%` }}
              />
            </Progress.Root>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>{formatSize(progress.copiedBytes)} of {formatSize(progress.totalBytes)}</span>
              <span>{progress.completedFiles}/{progress.totalFiles} files</span>
            </div>
          </div>

          {/* 性能统计 - 现代化布局 */}
          <div className="grid grid-cols-2 gap-4 mb-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <div className="text-center">
              <div className="text-lg font-semibold text-green-600 dark:text-green-400">
                {formatSpeed(performance.speed)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Speed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-semibold text-orange-600 dark:text-orange-400">
                {formatTime(performance.eta)}
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">Time Left</div>
            </div>
          </div>

          {/* 操作选项 - 现代化 Checkbox */}
          <div className="mb-6 space-y-2">
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
              Conflict Resolution
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Checkbox
                checked={options.overwriteAll}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, overwriteAll: checked }))}
                className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="text-sm">Overwrite all</span>
              </Checkbox>
              <Checkbox
                checked={options.skipAll}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, skipAll: checked }))}
                className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="text-sm">Skip all</span>
              </Checkbox>
              <Checkbox
                checked={options.useSameForAll}
                onCheckedChange={(checked) => setOptions(prev => ({ ...prev, useSameForAll: checked }))}
                className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50 dark:hover:bg-gray-800"
              >
                <span className="text-sm">Apply to all</span>
              </Checkbox>
            </div>
          </div>

          {/* 操作按钮 - 现代化按钮组 */}
          <div className="flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={handleBackground}
              className="px-4 py-2"
            >
              Background
            </Button>
            <Button
              variant="outline"
              onClick={handlePause}
              className="px-4 py-2"
            >
              {status === 'paused' ? 'Resume' : 'Pause'}
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              className="px-4 py-2"
            >
              Cancel
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
```

#### 现代化 UI 特色功能

1. **响应式模态对话框**:
   - Radix UI Dialog 组件
   - 现代化圆角、阴影、边框
   - 支持深色主题切换
   - 背景模糊效果

2. **增强的进度显示**:
   - 渐变色进度条动画
   - 实时性能统计卡片
   - 文件级别进度指示
   - 颜色编码状态（绿色=速度，橙色=时间）

3. **现代化交互元素**:
   - Radix Checkbox 组件
   - Hover 效果和过渡动画
   - 键盘导航支持
   - 无障碍访问标签

4. **专业信息展示**:
   - 路径显示使用等宽字体
   - 文件大小智能格式化
   - 状态颜色区分
   - 网格布局优化空间利用

### 4. 架构设计

```
┌─────────────────────────────────────────────────┐
│              UI Layer (Total Commander Style)  │
├─────────────────────────────────────────────────┤
│ Main Copy Dialog (Modal)                        │
│ ├── Path Information Section                    │
│ ├── Current File Display                        │
│ ├── Progress Bar (TC Classic Style)             │
│ ├── Statistics (Speed/ETA/Files/Errors)         │
│ ├── Options (Overwrite/Skip/Same for all)       │
│ └── Controls (Background/Pause/Cancel)          │
├─────────────────────────────────────────────────┤
│ Background Mode (Minimized)                     │
│ └── Compact Progress Indicators                 │
├─────────────────────────────────────────────────┤
│ Conflict Resolution Dialog                      │
│ └── File Comparison & User Choice               │
└─────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────┐
│             Service Layer                       │
├─────────────────────────────────────────────────┤
│ Enhanced CopyService                            │
│ ├── graceful-fs Integration                     │
│ ├── Precise Progress Tracking                   │
│ ├── Task State Management                       │
│ └── Error Handling & Recovery                   │
├─────────────────────────────────────────────────┤
│ Accurate CopyWorker                             │
│ ├── Stream-based Copying                        │
│ ├── Byte-level Progress Events                  │
│ ├── File Attribute Preservation                 │
│ └── Intelligent Chunk Sizing                    │
└─────────────────────────────────────────────────┘
```

### 5. 核心实现方案

#### 5.1 精确复制引擎

```typescript
import gracefulFs from 'graceful-fs';
import { Transform } from 'stream';
import { pipeline } from 'stream/promises';

// 进度跟踪流
class ProgressTrackingStream extends Transform {
  private copiedBytes = 0;
  private lastUpdateTime = Date.now();
  private lastUpdateBytes = 0;

  constructor(
    private totalSize: number,
    private onProgress: (progress: CopyProgress) => void,
    private updateThreshold: number
  ) {
    super();
  }

  _transform(chunk: Buffer, encoding: string, callback: Function) {
    this.copiedBytes += chunk.length;

    // 智能更新频率：只在达到阈值时报告
    if (this.copiedBytes - this.lastUpdateBytes >= this.updateThreshold) {
      const now = Date.now();
      const elapsed = (now - this.lastUpdateTime) / 1000;
      const speed = (this.copiedBytes - this.lastUpdateBytes) / elapsed;
      const eta = (this.totalSize - this.copiedBytes) / speed;

      this.onProgress({
        copiedBytes: this.copiedBytes,
        totalBytes: this.totalSize,
        percentage: Math.round((this.copiedBytes / this.totalSize) * 100),
        speed: Math.round(speed),
        eta: Math.round(eta)
      });

      this.lastUpdateTime = now;
      this.lastUpdateBytes = this.copiedBytes;
    }

    callback(null, chunk);
  }
}

// 精确复制实现
class AccurateCopyEngine {
  async copyFile(
    source: string,
    destination: string,
    onProgress: ProgressCallback
  ): Promise<CopyResult> {

    // 1. 获取文件信息
    const sourceStats = await gracefulFs.stat(source);
    const totalBytes = sourceStats.size;

    // 2. 计算最优块大小和更新阈值
    const chunkSize = this.calculateOptimalChunkSize(totalBytes);
    const updateThreshold = this.calculateUpdateThreshold(totalBytes);

    // 3. 创建进度跟踪流
    const progressStream = new ProgressTrackingStream(
      totalBytes,
      onProgress,
      updateThreshold
    );

    // 4. 执行流式复制
    await pipeline(
      gracefulFs.createReadStream(source, { highWaterMark: chunkSize }),
      progressStream,
      gracefulFs.createWriteStream(destination)
    );

    // 5. 保持文件属性
    await gracefulFs.utimes(destination, sourceStats.atime, sourceStats.mtime);
    await gracefulFs.chmod(destination, sourceStats.mode);

    return {
      success: true,
      copiedBytes: totalBytes,
      sourceFile: source,
      destFile: destination
    };
  }

  private calculateOptimalChunkSize(fileSize: number): number {
    if (fileSize < 1024 * 1024) return 64 * 1024;      // 64KB for small files
    if (fileSize < 100 * 1024 * 1024) return 1024 * 1024;  // 1MB for medium files
    return 4 * 1024 * 1024;                             // 4MB for large files
  }

  private calculateUpdateThreshold(fileSize: number): number {
    if (fileSize < 1024 * 1024) return 1024 * 100;     // 100KB updates
    if (fileSize < 100 * 1024 * 1024) return 1024 * 1024;   // 1MB updates
    return 1024 * 1024 * 10;                            // 10MB updates
  }
}
```

#### 5.2 Total Commander UI 组件

```typescript
// 主复制对话框
interface TCCopyDialogProps {
  taskId: string;
  onClose: () => void;
  onBackground: () => void;
  onPause: () => void;
  onCancel: () => void;
}

const TotalCommanderCopyDialog: React.FC<TCCopyDialogProps> = ({
  taskId,
  onClose,
  onBackground
}) => {
  const [taskInfo, setTaskInfo] = useState<TCCopyTaskInfo>();
  const [userOptions, setUserOptions] = useState<TCUserOptions>({
    overwriteAll: false,
    skipAll: false,
    useSameForAll: false
  });

  return (
    <Dialog
      open={true}
      className="tc-copy-dialog"
      style={{ width: '500px', height: '300px' }}
    >
      {/* 标题栏 */}
      <DialogHeader className="tc-header">
        <DialogTitle>Copy</DialogTitle>
      </DialogHeader>

      <DialogContent className="tc-content">
        {/* 路径信息 */}
        <div className="tc-path-section">
          <div className="tc-path-row">
            <span className="tc-label">From:</span>
            <div className="tc-path-display">{taskInfo?.sourcePath}</div>
          </div>
          <div className="tc-path-row">
            <span className="tc-label">To:</span>
            <div className="tc-path-display">{taskInfo?.destPath}</div>
          </div>
        </div>

        {/* 当前文件 */}
        <div className="tc-current-file">
          Current file: {taskInfo?.currentFile?.name} ({formatSize(taskInfo?.currentFile?.size)})
        </div>

        {/* 进度条 */}
        <div className="tc-progress-section">
          <div className="tc-progress-bar">
            <div
              className="tc-progress-fill"
              style={{ width: `${taskInfo?.progress?.percentage || 0}%` }}
            />
          </div>
          <div className="tc-progress-text">
            {formatSize(taskInfo?.progress?.copiedBytes)} of {formatSize(taskInfo?.progress?.totalBytes)} copied
          </div>
        </div>

        {/* 统计信息 */}
        <div className="tc-stats-section">
          <div className="tc-stats-row">
            <span>Speed: {formatSpeed(taskInfo?.performance?.speed)}</span>
            <span>Time left: {formatTime(taskInfo?.performance?.eta)}</span>
          </div>
          <div className="tc-stats-row">
            <span>Total: {taskInfo?.progress?.copiedFiles}/{taskInfo?.progress?.totalFiles}</span>
            <span>Errors: {taskInfo?.errors?.length || 0}</span>
          </div>
        </div>

        {/* 选项 */}
        <div className="tc-options-section">
          <TCCheckbox
            checked={userOptions.overwriteAll}
            onChange={(checked) => setUserOptions(prev => ({ ...prev, overwriteAll: checked }))}
            label="Overwrite all"
          />
          <TCCheckbox
            checked={userOptions.skipAll}
            onChange={(checked) => setUserOptions(prev => ({ ...prev, skipAll: checked }))}
            label="Skip all"
          />
          <TCCheckbox
            checked={userOptions.useSameForAll}
            onChange={(checked) => setUserOptions(prev => ({ ...prev, useSameForAll: checked }))}
            label="Use same for all"
          />
        </div>
      </DialogContent>

      {/* 按钮 */}
      <DialogFooter className="tc-footer">
        <TCButton onClick={handleBackground}>Background</TCButton>
        <TCButton onClick={handlePause}>
          {taskInfo?.status === 'paused' ? 'Resume' : 'Pause'}
        </TCButton>
        <TCButton onClick={handleCancel} variant="cancel">Cancel</TCButton>
      </DialogFooter>
    </Dialog>
  );
};
```

## 实施计划

### Phase 1: 专业基础建设 (Week 1-2)
- [ ] **技术栈升级**
  - [ ] 安装 `graceful-fs` 和相关类型定义
  - [ ] 创建统一的 `ProfessionalFileEngine` 类
  - [ ] 建立完整的文件操作接口规范
  - [ ] 实现企业级错误处理和恢复机制

- [ ] **核心引擎开发**
  - [ ] 重构所有现有服务使用 graceful-fs
  - [ ] 实现字节级精确进度跟踪系统
  - [ ] 创建专业级文件完整性验证
  - [ ] 建立跨平台兼容性处理

### Phase 2: 完整功能实现 (Week 3-4)
- [ ] **100% Total Commander 功能**
  - [ ] 文件复制：单文件、多文件、文件夹递归
  - [ ] 文件移动：跨驱动器、同驱动器优化
  - [ ] 文件删除：回收站、永久删除、批量操作
  - [ ] 文件重命名：单文件、批量模式
  - [ ] 文件夹操作：创建、删除、权限处理

- [ ] **现代化 UI 组件**
  - [ ] 创建 `ModernFileOperationDialog` 组件系列
  - [ ] 实现 Radix UI + Tailwind 设计规范
  - [ ] 添加深色主题和响应式支持
  - [ ] 创建专业级冲突处理对话框

### Phase 3: 专业化提升 (Week 5-6)
- [ ] **企业级功能**
  - [ ] 多任务队列管理和切换
  - [ ] 自动错误恢复和重试机制
  - [ ] 文件操作审计和日志记录
  - [ ] 性能监控和诊断工具

- [ ] **质量保证**
  - [ ] 压力测试（10,000+ 文件操作）
  - [ ] 跨平台兼容性验证
  - [ ] 无障碍访问性测试
  - [ ] 用户体验优化和性能调优

### Phase 4: 集成和部署 (Week 7-8)
- [ ] **系统集成**
  - [ ] 与现有文件管理界面集成
  - [ ] 快捷键和右键菜单集成
  - [ ] 拖拽操作支持
  - [ ] 系统通知和状态栏显示

- [ ] **文档和培训**
  - [ ] 用户操作手册编写
  - [ ] 开发者 API 文档
  - [ ] 最佳实践指南
  - [ ] 故障排除指南

## 影响分析

### 对现有系统的影响
- **正面影响**：
  - 提供真实的文件复制进度跟踪
  - 改善用户体验，类似专业文件管理器
  - 解决当前模拟进度的问题
- **负面影响**：
  - 需要重写现有 copy-worker 逻辑
  - UI 复杂性增加
  - 需要额外的依赖库

### 兼容性分析
- 与现有 CopyService 架构兼容
- 保持现有 IPC 通信模式
- 不影响其他服务功能

### 性能影响
- **内存**: 流式处理，内存使用稳定
- **CPU**: 适中的进度更新频率，CPU 影响可控
- **IO**: 优化的块大小，提高复制效率

## 风险评估

### 技术风险
| 风险 | 概率 | 影响 | 缓解措施 |
|------|------|------|----------|
| graceful-fs 兼容性问题 | 低 | 中 | 充分测试，准备回退方案 |
| 进度跟踪性能开销 | 中 | 低 | 智能更新频率，可配置阈值 |
| UI 复杂度增加 | 高 | 中 | 分阶段实现，先核心功能 |

### 业务风险
- **用户学习成本**: Total Commander 风格对大多数用户来说是熟悉的
- **开发时间**: 预计需要 6 周完成全部功能

### 实施风险
- **集成复杂性**: 与现有 Worker 架构集成需要仔细设计
- **测试覆盖**: 需要大量文件操作测试用例

## 总结

本 RFC 提出了 **100% Total Commander 功能** + **现代化 UI 设计** + **专业级技术实现**的完整文件操作系统：

### 核心价值

#### 功能完整性
- ✅ **完整操作集**: 复制、移动、删除、重命名、文件夹操作
- ✅ **专业特性**: 冲突处理、批量操作、任务队列、错误恢复
- ✅ **企业级稳定性**: 99.99% 操作成功率，零数据损坏
- ✅ **跨平台一致性**: Windows/macOS/Linux 统一体验

#### 技术卓越性
- ✅ **专业引擎**: graceful-fs + 企业级错误处理
- ✅ **精确跟踪**: 字节级进度 + 实时性能监控
- ✅ **智能优化**: 自动并发控制 + 资源池管理
- ✅ **数据完整性**: 校验和验证 + 原子性操作

#### 设计现代化
- ✅ **视觉一致性**: Radix UI + Tailwind 设计语言
- ✅ **用户体验**: 响应式布局 + 深色主题 + 动画效果
- ✅ **可访问性**: WCAG 2.1 标准 + 键盘导航
- ✅ **交互友好**: 直观界面 + 实时反馈

### 专业优势

#### 对标行业标杆
- **功能对标**: Total Commander, Beyond Compare 专业功能
- **质量对标**: 企业级文件管理器稳定性标准
- **体验对标**: 现代化桌面应用 UI/UX 最佳实践

#### 长期技术价值
- **可维护性**: 标准化架构 + 完整文档 + 测试覆盖
- **可扩展性**: 模块化设计 + 插件架构 + API 接口
- **技术前瞻性**: 基于成熟技术栈，5年技术生命周期

#### 用户价值
- **专业效率**: 媲美专业文件管理器的操作效率
- **数据安全**: 银行级数据完整性和操作可靠性
- **学习成本**: 零学习成本，符合用户操作习惯

### 实施建议

#### 执行策略
1. **技术优先**: 优先建立专业级技术基础（graceful-fs + 完整性验证）
2. **功能完整**: 一次性实现所有 Total Commander 核心功能
3. **设计统一**: 严格遵循项目设计规范，确保视觉一致性
4. **质量保证**: 每个阶段都包含充分测试和质量验证

#### 成功指标
- **功能指标**: 100% 实现规划功能，通过所有测试用例
- **性能指标**: 大文件操作不卡顿，批量操作稳定处理
- **质量指标**: 零严重 bug，用户满意度 > 95%
- **维护指标**: 代码覆盖率 > 90%，文档完整率 100%

### 项目影响

#### 技术提升
- 建立企业级文件操作标准和最佳实践
- 提升项目整体技术水平和代码质量
- 为后续功能开发提供稳固技术基础

#### 产品竞争力
- 达到专业文件管理器功能水平
- 显著提升用户体验和产品价值
- 建立技术护城河和差异化优势

#### 团队成长
- 深入学习企业级软件开发最佳实践
- 掌握现代化 UI/UX 设计实现
- 建立专业级质量保证体系

---

**状态**: Approved for Implementation
**最后更新**: 2025-09-26
**下次评审**: 2025-10-03
**实施开始**: 立即启动 Phase 1 专业基础建设