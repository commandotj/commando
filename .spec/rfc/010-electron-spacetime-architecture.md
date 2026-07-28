# RFC-2025-010: Electron Spacetime Architecture with Personified Engines

---

作者: Linus Torvalds/albert.li
创建时间: 2025-01-05
修改历史:

- 2025-01-05: 初稿 by Linus Torvalds

---

## 摘要

本 RFC 提出了 Electron 应用的**时空人格化架构**设计理念，将主进程和渲染进程分别视为春秋战国和汉朝，每个引擎都是诸子百家的人物，拥有独特的性格和故事。通过统一的 Store 系统和人格化设计，建立清晰的双世界架构，让开发者能够更好地理解和设计 Electron 应用。

## 背景

### 问题描述

当前 Electron 应用开发中存在以下问题：

1. **架构理解混乱**: 主进程和渲染进程的职责边界不清晰
2. **状态管理复杂**: 两个世界之间的状态同步困难
3. **通信模式不统一**: IPC 通信缺乏统一的设计模式
4. **服务层职责不清**: 服务层在主进程和渲染进程中的定位模糊

### 现状分析

目前项目已建立了基于服务架构的文件服务，但缺乏统一的架构理念：

- ✅ **已有**: CopyService, FileService, DirectoryService
- ✅ **已有**: Redux Store 状态管理
- ✅ **已有**: IPC 通信机制
- ❌ **缺少**: 统一的架构设计理念
- ❌ **缺少**: 清晰的职责边界定义

## 目标

### 主要目标

#### 时空架构目标

- [ ] **时间轴设计**: 主进程作为时间轴，管理服务生命周期和事件流
- [ ] **空间轴设计**: 渲染进程作为空间轴，管理 UI 布局和用户交互
- [ ] **时空隧道**: IPC 通信作为时空隧道，实现两世界同步
- [ ] **时空统一**: 统一的 Store 系统管理两个世界的状态

#### 设计原则

- [ ] **职责分离**: 时间轴处理业务逻辑，空间轴处理用户界面
- [ ] **状态同步**: 通过时空隧道保持两世界状态一致
- [ ] **服务统一**: 服务层作为时空桥梁，协调两世界交互
- [ ] **架构清晰**: 每个组件都有明确的时空定位

## 技术设计

### 1. 时空人格化架构模型

#### 1.1 渲染进程 - 汉朝天下 (刘备为帝)

```typescript
// 刘备 - 汉朝皇帝，统一天下
interface LiuBeiPersona {
    name: "刘备";
    title: "汉朝皇帝";
    philosophy: "仁者无敌，以德服人";
    personality: {
        traits: ["仁爱", "智慧", "领导力", "统一"];
        strengths: ["用户界面", "状态管理", "用户体验"];
        weaknesses: ["依赖主进程", "资源有限"];
    };
    story: "刘备是汉朝的开国皇帝，以仁爱和智慧统一了天下。他相信'仁者无敌'，因此他的渲染进程专注于用户界面和用户体验的统一管理。";
    responsibilities: [
        "用户界面统一管理",
        "状态管理和协调",
        "用户体验优化",
        "与主进程的通信协调",
    ];
    court: {
        // 汉朝朝廷 - 渲染进程的组件体系
        components: "React组件体系";
        state: "Redux状态管理";
        routing: "路由和导航";
        ui: "用户界面设计";
    };
}
```

#### 1.2 主进程 - 春秋战国 (诸子百家)

```typescript
// 主进程 - 春秋战国时代，诸子百家争鸣
interface MainProcessPersona {
    name: "春秋战国";
    title: "诸子百家争鸣";
    philosophy: "百家争鸣，各显神通";
    personality: {
        traits: ["多样性", "竞争", "创新", "实用"];
        strengths: ["系统服务", "文件操作", "性能优化"];
        weaknesses: ["协调复杂", "资源竞争"];
    };
    story: "春秋战国是思想最活跃的时代，诸子百家各显神通。主进程就像这个时代，各种服务引擎各司其职，共同为渲染进程提供强大的后端支持。";
    responsibilities: [
        "系统服务管理",
        "文件操作处理",
        "性能优化",
        "与渲染进程的通信",
    ];
    schools: {
        // 诸子百家 - 主进程的服务引擎
        luban: "鲁班 - 工匠精神，文件引擎";
        kongzi: "孔子 - 儒家思想，时空通道协调者(唯一有Service层)";
        mozi: "墨子 - 兼爱非攻，文件同步引擎";
        zouji: "邹忌 - 谏言纳谏，Diff引擎";
        zuoqiuming: "左丘明 - 春秋史学家，Git版本控制";
        laozi: "老子 - 道家创始人，日志记录引擎";
    };
}
```

### 2. 人物关系与职责分工

#### 2.1 汉朝朝廷 (渲染进程)

```typescript
// 刘邦 - 汉朝皇帝，统一天下
interface LiuBangPersona {
    name: "刘邦";
    title: "汉朝皇帝";
    philosophy: "仁者无敌，以德服人";
    responsibilities: [
        "用户界面统一管理",
        "状态管理和协调",
        "用户体验优化",
        "与主进程的通信协调",
    ];
    court: {
        // 汉朝朝廷 - 渲染进程的组件体系
        components: "React组件体系";
        state: "Redux状态管理";
        routing: "路由和导航";
        ui: "用户界面设计";
    };
}

// 萧何 - 汉朝丞相，Store管理者
interface XiaoHePersona {
    name: "萧何";
    title: "汉朝丞相";
    philosophy: "鞠躬尽瘁，死而后已";
    responsibilities: [
        "Redux Store统一管理",
        "状态数据协调",
        "组件间状态同步",
        "数据流管理",
    ];
    specialties: ["Store管理", "状态管理", "数据流控制"];
    uniqueRole: "唯一负责Store管理的人";
}

// 韩信 - 汉朝将军，Preload管理者
interface HanXinPersona {
    name: "韩信";
    title: "汉朝将军";
    philosophy: "义薄云天，忠肝义胆";
    responsibilities: [
        "Preload脚本管理",
        "IPC消息发送",
        "跨进程通信协调",
        "安全接口管理",
    ];
    specialties: ["Preload管理", "IPC通信", "安全接口"];
    uniqueRole: "唯一负责Preload和IPC发送的人";
}

// 司马迁 - 汉朝史学家，日志记录引擎
interface SimaQianPersona {
    name: "司马迁";
    title: "汉朝史学家";
    philosophy: "秉笔直书，客观记录";
    responsibilities: [
        "系统日志记录",
        "运行状态追踪",
        "错误事件记录",
        "性能监控日志",
    ];
    specialties: ["日志记录", "事件追踪", "状态监控"];
    uniqueRole: "唯一负责系统历史记录的人";
}
```

#### 2.2 春秋战国诸子百家 (主进程)

```typescript
// 鲁班 - 工匠精神，文件引擎
interface LubanPersona {
    name: "鲁班";
    title: "工匠大师";
    philosophy: "精益求精，工匠精神";
    responsibilities: [
        "文件复制操作",
        "文件移动操作",
        "文件删除操作",
        "文件系统操作优化",
    ];
    specialties: ["文件引擎", "文件操作", "文件系统"];
}

// 孔子 - 儒家思想，时空通道协调者
interface KongziPersona {
    name: "孔子";
    title: "儒家圣人";
    philosophy: "仁者爱人，礼制秩序";
    responsibilities: [
        "处理来自汉朝的跨时空请求",
        "IPC时空通道管理",
        "Service层协调管理",
        "跨进程通信协调",
    ];
    specialties: ["时空通道协调", "IPC管理", "Service层管理"];
    uniqueRole: "唯一有Service对应层的协调者";
}

// 墨子 - 兼爱非攻，文件同步引擎
interface MoziPersona {
    name: "墨子";
    title: "兼爱大师";
    philosophy: "兼爱非攻，实用主义";
    responsibilities: [
        "文件同步操作",
        "文件状态同步管理",
        "文件数据一致性保证",
        "跨进程文件同步协调",
    ];
    specialties: ["文件同步引擎", "文件状态管理", "文件数据一致性"];
}

// 邹忌 - 谏言纳谏，Diff引擎
interface ZoujiPersona {
    name: "邹忌";
    title: "谏言大师";
    philosophy: "谏言纳谏，防微杜渐";
    responsibilities: [
        "文件差异比较",
        "变更检测和分析",
        "版本差异追踪",
        "冲突识别和解决",
    ];
    specialties: ["Diff引擎", "变更检测", "冲突分析"];
}

// 左丘明 - 春秋史学家，Git版本控制
interface ZuoqiumingPersona {
    name: "左丘明";
    title: "春秋史学家";
    philosophy: "秉笔直书，记录历史";
    responsibilities: ["Git版本控制", "代码历史记录", "变更追踪", "版本管理"];
    specialties: ["版本控制", "历史记录", "变更追踪"];
}

// 老子 - 道家创始人，日志记录引擎
interface LaoziPersona {
    name: "老子";
    title: "道家创始人";
    philosophy: "道法自然，无为而治";
    responsibilities: [
        "主进程日志记录",
        "系统运行规律追踪",
        "自然状态记录",
        "道法自然监控",
    ];
    specialties: ["日志记录", "自然规律", "道法监控"];
}
```

#### 2.3 时空双世界协作模式

````typescript
// 汉朝与春秋战国的协作关系
interface SpacetimeCollaboration {
  // 汉朝内部协作
  hanDynasty: {
    // 刘邦与萧何的协作
    emperorAndPrimeMinister: {
      liuBang: "刘邦 - 汉朝皇帝，统一管理";
      xiaoHe: "萧何 - 汉朝丞相，Store管理";
      collaboration: "刘邦决策，萧何执行Store操作";
    };

    // 刘邦与韩信的协作
    emperorAndGeneral: {
      liuBang: "刘邦 - 汉朝皇帝，统一管理";
      hanXin: "韩信 - 汉朝将军，Preload管理";
      collaboration: "刘邦决策，韩信执行Preload和IPC发送";
    };

    // 萧何与韩信的协作
    primeMinisterAndGeneral: {
      xiaoHe: "萧何 - 汉朝丞相，Store管理";
      hanXin: "韩信 - 汉朝将军，Preload管理";
      collaboration: "萧何管理状态，韩信发送IPC消息";
    };
  };

  // 汉朝与春秋战国的协作
  crossSpacetime: {
    // 刘邦委托韩信发送IPC，孔子处理跨时空请求
    spacetimeCoordination: {
      request: "刘邦决策，韩信通过IPC时空通道发送跨时空请求";
      delegate: "孔子引擎接收IPC请求并协调其他引擎";
      response: "孔子引擎通过IPC时空通道返回协调结果给韩信";
    };

    // 刘邦委托韩信发送IPC，孔子协调鲁班处理文件操作
    fileOperations: {
      request: "刘邦决策，韩信通过IPC请求文件操作";
      delegate: "孔子引擎接收IPC并委托鲁班文件引擎执行操作";
      response: "孔子引擎通过IPC返回鲁班操作结果给韩信";
    };

    // 刘邦委托韩信发送IPC，孔子协调墨子处理文件同步
    fileSynchronization: {
      request: "刘邦决策，韩信通过IPC请求文件同步";
      delegate: "孔子引擎接收IPC并委托墨子文件同步引擎执行操作";
      response: "孔子引擎通过IPC返回墨子同步结果给韩信";
    };

    // 刘邦委托韩信发送IPC，孔子协调邹忌处理差异比较
    diffAnalysis: {
      request: "刘邦决策，韩信通过IPC请求文件差异比较";
      delegate: "孔子引擎接收IPC并委托邹忌执行Diff分析";
      response: "孔子引擎通过IPC返回邹忌差异报告给韩信";
    };

    // 刘邦委托韩信发送IPC，孔子协调左丘明管理版本
    versionControl: {
      request: "刘邦决策，韩信通过IPC请求版本操作";
      delegate: "孔子引擎接收IPC并委托左丘明执行Git操作";
      response: "孔子引擎通过IPC返回左丘明版本信息给韩信";
    };
  };
}

#### 2.4 引擎日志记录协作机制
```typescript
// 引擎如何通过孔子协调使用老子日志服务
interface EngineLoggingCollaboration {
  // 墨子想要记录日志的流程
  moziLoggingFlow: {
    step1: "墨子需要记录日志";
    step2: "墨子请求孔子帮助记录日志";
    step3: "孔子接收墨子请求";
    step4: "孔子委托老子执行日志记录";
    step5: "老子执行实际的日志记录";
    step6: "老子向孔子报告记录完成";
    step7: "孔子向墨子确认日志已记录";
  };

  // 其他引擎的日志记录流程
  otherEnginesLogging: {
    pattern: "所有引擎都遵循相同的协作模式";
    coordination: "孔子作为唯一的协调者";
    execution: "老子作为唯一的日志执行者";
    isolation: "引擎不能直接访问老子";
  };

  // 协作原则
  collaborationPrinciples: {
    singleCoordinator: "孔子是唯一的协调者";
    singleLogger: "老子是唯一的日志执行者";
    noDirectAccess: "引擎不能直接访问老子";
    throughKongzi: "所有日志请求必须通过孔子协调";
  };
}

#### 2.5 技术实现方案
```typescript
// 引擎日志记录的技术实现
interface EngineLoggingImplementation {
  // 墨子引擎的日志记录接口
  moziEngineInterface: {
    // 墨子不能直接调用老子，只能通过孔子
    requestLogging: "墨子通过孔子请求日志记录";
    loggingMethod: "mozi.requestLogging(level, message, meta)";
    coordination: "通过孔子引擎管理器协调";
  };

  // 孔子引擎管理器的协调接口
  kongziCoordinationInterface: {
    // 孔子接收引擎的日志请求
    receiveLoggingRequest: "孔子接收引擎的日志记录请求";
    // 孔子委托老子执行日志记录
    delegateToLaozi: "孔子委托老子执行实际的日志记录";
    // 孔子向引擎确认日志已记录
    confirmLogging: "孔子向引擎确认日志已记录";
  };

  // 老子日志服务的执行接口
  laoziLoggingInterface: {
    // 老子执行实际的日志记录
    executeLogging: "老子执行基于pino的日志记录";
    // 老子向孔子报告记录完成
    reportCompletion: "老子向孔子报告日志记录完成";
  };
}
````

#### 2.6 孔子组合器设计

孔子组合器者，时空架构之核心也，负责组装管理诸子百家引擎：

**孔子曰**：有教无类，统一管理诸子百家之组装也。

```typescript
// 孔子组合器 - 时空通道协调者的组装器
interface KongziComposer {
    // 引擎依赖配置
    engineDependencyConfig: {
        name: string;
        dependencies: string[];
        services: {
            logging?: boolean;
            // 可以扩展其他标准服务
        };
    }[];

    // 引擎通信配置
    engineCommunicationConfig: {
        from: string;
        to: string;
        method: "direct" | "through-kongzi";
        messageType: string;
    }[];

    // 组装引擎
    assembleEngines(): Promise<Map<string, BaseEngine>>;

    // 配置引擎通信
    configureEngineCommunication(): void;

    // 获取引擎实例
    getEngine(name: string): BaseEngine | undefined;
}

// 孔子组合器配置示例
const defaultKongziComposerConfig = {
    engines: [
        {
            name: "LaoziEngine",
            dependencies: [],
            services: { logging: false }, // 老子是日志服务提供者
        },
        {
            name: "LubanEngine",
            dependencies: ["LaoziEngine"],
            services: { logging: true }, // 鲁班需要日志服务
        },
        {
            name: "MoziEngine",
            dependencies: ["LaoziEngine"],
            services: { logging: true }, // 墨子需要日志服务
        },
    ],
    communications: [
        {
            from: "LubanEngine",
            to: "LaoziEngine",
            method: "through-kongzi",
            messageType: "logging-request",
        },
        {
            from: "MoziEngine",
            to: "LaoziEngine",
            method: "through-kongzi",
            messageType: "logging-request",
        },
    ],
    standardServices: {
        logging: true, // 启用标准日志服务
    },
};
```

#### 2.7 引擎组装流程

孔子组合器按以下流程组装诸子百家：

**孔子曰**：循序渐进，按依赖关系排序诸子百家也。

1. **依赖关系排序**：按依赖关系对诸子百家进行拓扑排序
2. **顺序初始化**：按排序后之顺序初始化诸子百家
3. **服务配置**：为每个诸子百家配置标准服务（如日志）
4. **通信设置**：配置诸子百家间之通信方式
5. **协调管理**：孔子作为唯一协调者管理所有诸子百家

```typescript
// 引擎组装流程
class KongziComposer {
    async assembleEngines(): Promise<Map<string, BaseEngine>> {
        // 1. 按依赖关系排序引擎
        const sortedEngines = this.sortEnginesByDependencies();

        // 2. 按顺序初始化引擎
        for (const engineConfig of sortedEngines) {
            await this.assembleEngine(engineConfig);
        }

        return this.engines;
    }

    private async assembleEngine(
        config: EngineDependencyConfig
    ): Promise<void> {
        // 获取引擎实例
        const engine = await this.createEngine(config);

        // 配置标准服务依赖
        if (config.services.logging) {
            await this.configureLoggingService(engine, config.name);
        }

        // 注册引擎
        this.engines.set(config.name, engine);

        // 通过老子记录引擎组装
        const laoziLogger = this.laoziLoggingService.getLaoziLoggerForEngine(
            config.name
        );
        laoziLogger.info(`孔子组装引擎: ${config.name}`);
    }
}
```

#### 2.8 孔子服务设计

孔子服务是时空架构的核心服务，负责托管孔子引擎管理器：

```typescript
// 孔子服务 - 时空通道协调者服务
@Service({
    name: "KongziService",
    version: "1.0.0",
    ipcChannels: ["kongzi:execute-task", "kongzi:get-status"],
    description: "孔子服务 - 时空通道协调者，负责管理诸子百家引擎",
})
class KongziService implements BaseService {
    // 孔子引擎管理器
    private readonly kongziEngineManager: KongziEngineManager;

    // 初始化孔子服务
    async initialize(): Promise<void> {
        // 孔子初始化引擎管理器
        await this.kongziEngineManager.initialize();
    }

    // 获取孔子引擎管理器
    getKongziEngineManager(): KongziEngineManager {
        return this.kongziEngineManager;
    }
}
```

#### 2.9 服务注册表集成

孔子服务通过主服务注册表进行管理：

```typescript
// 主服务注册表集成
export async function initializeServices(
    mainWindow: BrowserWindow
): Promise<void> {
    // 注册老子日志服务
    serviceRegistry.register(LaoziLoggingService);

    // 注册孔子服务
    serviceRegistry.register(KongziService);

    // 初始化所有服务
    await serviceRegistry.initializeAll();
}

// 获取孔子服务
const kongziService = serviceRegistry.getService(
    "KongziService"
) as KongziService;
const kongziEngineManager = kongziService.getKongziEngineManager();

// 孔子作为唯一协调者，通过引擎管理器管理所有诸子百家
// 其他服务不能直接访问诸子百家，必须通过孔子协调
```

#### 2.10 时空架构服务层

完整的时空架构服务层设计：

```typescript
// 时空架构服务层
interface SpacetimeServiceLayer {
    // 春秋战国服务（主进程）
    springAutumnServices: {
        laozi: "老子日志服务";
        kongzi: "孔子引擎管理服务";
        luban: "鲁班文件操作服务";
        mozi: "墨子文件同步服务";
        zouji: "邹忌Diff服务";
        zuoqiuming: "左丘明Git服务";
    };

    // 汉朝服务（渲染进程）
    hanDynastyServices: {
        liubang: "刘邦UI管理服务";
        xiaohe: "萧何Store管理服务";
        hanxin: "韩信IPC通信服务";
        simaqian: "司马迁日志服务";
    };

    // 服务协调机制
    serviceCoordination: {
        coordinator: "孔子作为唯一协调者";
        communication: "通过ServiceRegistry管理";
        lifecycle: "统一初始化和清理";
    };
}
```

### 3. 时空通道与Service层架构

#### 3.1 IPC时空通道

```typescript
// IPC作为时空通道，连接汉朝(渲染进程)和春秋战国(主进程)
interface SpacetimeTunnel {
    // 时空通道特性
    channel: {
        name: "IPC时空通道";
        purpose: "连接汉朝与春秋战国";
        protocol: "Electron IPC";
        direction: "双向通信";
    };

    // 孔子作为时空通道的唯一协调者
    coordinator: {
        name: "孔子";
        role: "时空通道协调者";
        service: "唯一有Service对应层";
        responsibilities: [
            "处理来自汉朝的跨时空请求",
            "协调春秋战国各引擎",
            "管理IPC时空通道",
            "Service层统一管理",
        ];
    };
}
```

#### 3.2 Service层架构

```typescript
// 孔子Service层 - 唯一的Service对应层
interface KongziServiceLayer {
    name: "孔子Service层";
    purpose: "处理跨时空请求";
    architecture: {
        // 接收来自汉朝的请求
        requestHandler: "处理汉朝的跨时空请求";

        // 协调春秋战国各引擎
        engineCoordinator: {
            luban: "委托鲁班处理文件操作";
            mozi: "委托墨子处理文件同步";
            zouji: "委托邹忌处理差异比较";
            zuoqiuming: "委托左丘明处理版本控制";
        };

        // 返回结果给汉朝
        responseHandler: "通过IPC时空通道返回结果";
    };
}
```

#### 3.3 孔子引擎IPC管理架构

```typescript
// 孔子引擎负责所有IPC通道管理
interface KongziIPCManager {
  name: "孔子IPC管理器";
  purpose: "统一管理时空通道";
  responsibilities: [
    "设置所有IPC通道",
    "处理跨时空请求路由",
    "协调各引擎响应",
    "管理时空隧道通信"
  ];

  ipcChannels: {
    // 时空请求通道
    spacetimeRequest: "spacetime-request";
    // 文件操作通道
    fileOperation: "file-operation";
    // 文件同步通道
    fileSync: "file-sync";
    // 差异分析通道
    diffAnalysis: "diff-analysis";
    // 版本控制通道
    versionControl: "version-control";
  };

  // 孔子引擎自动设置IPC
  setupIPC: () => {
    ipcMain.handle('spacetime-request', handleSpacetimeRequest);
    ipcMain.handle('file-operation', handleFileOperation);
    ipcMain.handle('file-sync', handleFileSync);
    ipcMain.handle('diff-analysis', handleDiffAnalysis);
    ipcMain.handle('version-control', handleVersionControl);
  };
}
```

### 4. 时空架构模型

```typescript
// 时空架构接口定义
interface SpacetimeArchitecture {
    // 时间轴 - 主进程
    timeline: {
        services: ServiceRegistry;
        lifecycle: ServiceLifecycle;
        events: EventStream;
        state: TimelineStore;
    };

    // 空间轴 - 渲染进程
    space: {
        components: ComponentTree;
        layout: UILayout;
        interactions: UserInteractions;
        state: SpaceStore;
    };

    // 时空隧道 - IPC 通信
    spacetimeTunnel: {
        channels: IPCChannels;
        synchronization: StateSync;
        messaging: MessagePassing;
    };
}
```

### 2. 时间轴设计（主进程）

#### 2.1 服务生命周期管理

```typescript
// 时间轴服务管理
class TimelineServiceManager {
    private services: Map<string, Service> = new Map();
    private lifecycle: ServiceLifecycle;

    // 服务注册 - 时间轴上的服务点
    registerService(service: Service): void {
        this.services.set(service.name, service);
        this.lifecycle.initialize(service);
    }

    // 服务协调 - 时间轴上的服务协调
    coordinateServices(): void {
        // 协调各个服务之间的交互
    }
}
```

#### 2.2 事件流管理

```typescript
// 时间轴事件流
interface TimelineEventStream {
    // 服务事件
    serviceEvents: ServiceEvent[];
    // 系统事件
    systemEvents: SystemEvent[];
    // 用户事件
    userEvents: UserEvent[];
    // 时间同步
    timeSync: TimeSynchronization;
}
```

### 3. 空间轴设计（渲染进程）

#### 3.1 组件树管理

```typescript
// 空间轴组件管理
class SpaceComponentManager {
    private componentTree: ComponentTree;
    private layout: UILayout;

    // 组件渲染 - 空间轴上的组件渲染
    renderComponents(): void {
        this.componentTree.render();
    }

    // 布局管理 - 空间轴上的布局管理
    manageLayout(): void {
        this.layout.arrange();
    }
}
```

#### 3.2 用户交互管理

```typescript
// 空间轴用户交互
interface SpaceUserInteractions {
    // 用户输入
    userInput: UserInput;
    // 交互响应
    interactionResponse: InteractionResponse;
    // 状态更新
    stateUpdate: StateUpdate;
}
```

### 4. 时空隧道设计（IPC 通信）

#### 4.1 通信协议

```typescript
// 时空隧道通信协议
interface SpacetimeTunnelProtocol {
    // 时间同步
    timeSync: {
        syncState: (state: State) => Promise<void>;
        syncEvents: (events: Event[]) => Promise<void>;
    };

    // 空间映射
    spaceMapping: {
        mapComponent: (component: Component) => Promise<void>;
        mapLayout: (layout: Layout) => Promise<void>;
    };

    // 状态传递
    stateTransfer: {
        transferState: (state: State) => Promise<void>;
        transferEvents: (events: Event[]) => Promise<void>;
    };
}
```

#### 4.2 状态同步机制

```typescript
// 时空状态同步
class SpacetimeStateSync {
    // 时间轴状态同步到空间轴
    syncTimelineToSpace(timelineState: TimelineState): Promise<void> {
        // 通过时空隧道同步状态
    }

    // 空间轴状态同步到时间轴
    syncSpaceToTimeline(spaceState: SpaceState): Promise<void> {
        // 通过时空隧道同步状态
    }
}
```

### 5. 统一 Store 设计

#### 5.1 时空统一 Store

```typescript
// 时空统一 Store
interface SpacetimeStore {
    // 时间轴 Store
    timelineStore: {
        services: ServiceState;
        lifecycle: LifecycleState;
        events: EventState;
    };

    // 空间轴 Store
    spaceStore: {
        components: ComponentState;
        layout: LayoutState;
        interactions: InteractionState;
    };

    // 时空同步 Store
    syncStore: {
        synchronization: SyncState;
        conflicts: ConflictState;
        resolution: ResolutionState;
    };
}
```

#### 5.2 Store 协调机制

```typescript
// Store 协调器
class SpacetimeStoreCoordinator {
    private timelineStore: TimelineStore;
    private spaceStore: SpaceStore;
    private syncStore: SyncStore;

    // 协调时间轴和空间轴状态
    coordinateStores(): void {
        // 协调两个 Store 的状态
    }

    // 处理状态冲突
    resolveConflicts(): void {
        // 处理时空状态冲突
    }
}
```

## 实施计划

### Phase 1: 时空架构基础 (Week 1-2)

- [ ] **时间轴设计**
    - [ ] 服务生命周期管理
    - [ ] 事件流管理
    - [ ] 时间轴 Store 设计

- [ ] **空间轴设计**
    - [ ] 组件树管理
    - [ ] 布局管理
    - [ ] 空间轴 Store 设计

### Phase 2: 时空隧道实现 (Week 3-4)

- [ ] **IPC 通信协议**
    - [ ] 时空隧道协议设计
    - [ ] 状态同步机制
    - [ ] 消息传递机制

- [ ] **状态同步**
    - [ ] 时间轴到空间轴同步
    - [ ] 空间轴到时间轴同步
    - [ ] 冲突解决机制

### Phase 3: 统一 Store 系统 (Week 5-6)

- [ ] **Store 设计**
    - [ ] 时空统一 Store 设计
    - [ ] Store 协调机制
    - [ ] 状态管理优化

- [ ] **集成测试**
    - [ ] 时空架构集成测试
    - [ ] 状态同步测试
    - [ ] 性能测试

### Phase 4: 文档和培训 (Week 7-8)

- [ ] **文档编写**
    - [ ] 架构设计文档
    - [ ] 开发指南
    - [ ] 最佳实践

- [ ] **团队培训**
    - [ ] 架构理念培训
    - [ ] 开发实践培训
    - [ ] 代码审查培训

## 影响分析

### 对现有系统的影响

- **正面影响**：
    - 提供清晰的架构理念
    - 改善开发体验和代码质量
    - 统一状态管理模式
- **负面影响**：
    - 需要重构现有代码
    - 学习成本增加
    - 初期开发效率可能下降

### 兼容性分析

- 与现有服务架构兼容
- 保持现有 IPC 通信模式
- 不影响现有功能

### 性能影响

- **内存**: 统一 Store 可能增加内存使用
- **CPU**: 状态同步可能增加 CPU 开销
- **IO**: IPC 通信优化，减少 IO 开销

## 风险评估

### 技术风险

| 风险           | 概率 | 影响 | 缓解措施         |
| -------------- | ---- | ---- | ---------------- |
| 架构复杂度增加 | 中   | 中   | 充分文档和培训   |
| 性能影响       | 低   | 中   | 性能测试和优化   |
| 学习成本       | 高   | 低   | 渐进式迁移和培训 |

### 业务风险

| 风险         | 概率 | 影响 | 缓解措施           |
| ------------ | ---- | ---- | ------------------ |
| 开发效率下降 | 中   | 中   | 充分培训和工具支持 |
| 代码质量下降 | 低   | 高   | 代码审查和最佳实践 |

## 成功指标

### 技术指标

- **架构清晰度**: 开发团队对架构理解度 > 90%
- **代码质量**: 代码覆盖率 > 90%，bug 率 < 5%
- **性能指标**: 状态同步延迟 < 100ms，内存使用增长 < 20%

### 业务指标

- **开发效率**: 新功能开发时间减少 20%
- **维护成本**: 代码维护成本减少 30%
- **团队满意度**: 开发团队满意度 > 85%

## 结论

时空架构设计为 Electron 应用提供了清晰的架构理念，通过时间轴、空间轴和时空隧道的设计，实现了主进程和渲染进程的有机统一。统一的 Store 系统进一步简化了状态管理，提高了开发效率和代码质量。

这个设计不仅解决了当前的技术问题，更为未来的扩展和维护奠定了坚实的基础。

---

#### 2.11 复制状态报告机制

**子曰：有教无类，统一管理复制状态也**

孔子作为时空通道协调者，负责主动报告复制状态，UI被动接收状态更新。

**状态报告流程**：

1. 孔子开始任务 → 主动报告 "pending" 状态
2. 鲁班执行复制 → 孔子主动报告 "running" 状态和进度
3. 复制完成/失败 → 孔子主动报告 "completed"/"failed" 状态
4. UI接收状态 → 更新界面显示

**IPC通道**：

- `copy-status-update` - 孔子主动报告状态
- `copy:batch` - 发起批量复制
- `copy:cancel` - 取消复制任务
- `copy:confirm` - 用户确认处理

**状态数据结构**：

```typescript
interface CopyStatus {
    taskId: string;
    status: "pending" | "running" | "completed" | "failed" | "cancelled";
    progress: number;
    currentFile?: string;
    completedFiles: number;
    totalFiles: number;
    estimatedTimeRemaining?: number;
    error?: string;
    errorType?:
        "permission" | "disk_space" | "file_locked" | "network" | "unknown";
    retryable: boolean;
    timestamp: number;
}
```

**错误处理机制**：

- 自动分析错误类型（权限、磁盘空间、文件锁定、网络等）
- 提供处理建议
- 支持用户确认（重试、跳过、取消、覆盖、重命名）

**状态**: In Progress (Phase 4 - 复制状态报告机制完成)
**最后更新**: 2025-01-05
**下次评审**: 2025-01-12
**实施阶段**: Phase 4 完成，准备测试
**注意**: 此RFC为架构设计文档，具体功能实现请参考RFC-2025-006
