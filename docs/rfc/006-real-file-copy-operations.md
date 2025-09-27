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

#### 复制引擎: `graceful-fs` + Node.js Streams
```bash
npm install graceful-fs
```

**选择理由**:
- ✅ 字节级精确进度跟踪
- ✅ 解决 Node.js EMFILE 错误问题
- ✅ 完全控制复制过程
- ✅ 与现有 Worker 架构完美兼容
- ✅ 支持大文件优化

#### UI 风格: Total Commander 经典复制对话框
- 模态对话框设计
- 背景模式支持
- 文件冲突处理
- 详细进度信息显示

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

### 3. UI 设计：Total Commander 风格

#### 主复制对话框布局
```
┌─ Copy ──────────────────────────────────────────────────┐
│ From: C:\Users\Documents\Projects\MyProject\src\       │
│ To:   D:\Backup\Projects\MyProject\src\                │
│                                                         │
│ Current file: database.sql (2.5 MB)                    │
│                                                         │
│ [████████████████████████░░░░░░░] 78%                  │
│ 1.95 GB of 2.50 GB copied                              │
│                                                         │
│ Speed: 45.2 MB/s        Time left: 00:00:12            │
│ Total: 1,247/1,598      Errors: 0                      │
│                                                         │
│ □ Overwrite all  □ Skip all  □ Use same for all        │
│                                                         │
│      [Background]    [Pause]    [Cancel]               │
└─────────────────────────────────────────────────────────┘
```

#### UI 特色功能
1. **模态对话框**: 主要复制界面，用户可专注于复制过程
2. **背景模式**: 最小化到状态栏，显示紧凑进度
3. **文件冲突处理**: 标准的"替换文件"对话框
4. **全局选项**: Overwrite all, Skip all, Use same for all

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

### Phase 1: 核心复制引擎 (Week 1-2)
- [ ] 安装 `graceful-fs` 依赖
- [ ] 创建 `AccurateCopyEngine` 类
- [ ] 实现 `ProgressTrackingStream`
- [ ] 重写 copy-worker 使用新的复制引擎
- [ ] 集成到现有 CopyService

### Phase 2: Total Commander UI (Week 3-4)
- [ ] 创建 `TotalCommanderCopyDialog` 组件
- [ ] 实现 TC 风格的样式和布局
- [ ] 添加背景模式功能
- [ ] 创建文件冲突处理对话框
- [ ] 集成到主界面

### Phase 3: 高级功能 (Week 5-6)
- [ ] 多任务管理和切换
- [ ] 错误处理和重试机制
- [ ] 复制验证功能
- [ ] 性能优化和测试

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

本 RFC 提出了基于 **graceful-fs + Total Commander UI** 的文件复制系统设计方案：

### 核心价值
- ✅ **真实进度跟踪**: 字节级精确进度，告别模拟进度
- ✅ **经典用户体验**: Total Commander 风格，用户熟悉易用
- ✅ **高性能复制**: 流式处理 + 智能块大小优化
- ✅ **完整功能**: 文件冲突处理 + 背景模式 + 任务管理

### 技术优势
- 基于成熟的 graceful-fs 库，解决文件句柄问题
- 适中精度的进度跟踪，平衡性能与体验
- 与现有服务架构兼容，渐进式改进

### 实施建议
建议优先实现 Phase 1 核心复制引擎，验证技术方案可行性后再进行 UI 开发。

---

**状态**: Proposed
**最后更新**: 2025-09-25
**下次评审**: 2025-10-02