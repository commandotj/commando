/**
 * 孔子组合器配置 - 定义引擎组装和通信规则
 *
 * 孔子思想体现在配置中：
 * - 有教无类：统一配置所有引擎
 * - 因材施教：根据引擎特点配置合适的依赖
 * - 循序渐进：按依赖关系配置引擎顺序
 * - 学而时习：持续优化配置
 */

import type { ComposerConfig } from "./Composer";

/**
 * 默认的孔子组合器配置
 *
 * 定义春秋战国诸子百家的组装和通信规则：
 * - 鲁班：工匠精神，文件引擎
 * - 墨子：兼爱非攻，文件同步引擎
 * - 邹忌：谏言纳谏，Diff引擎
 * - 左丘明：春秋史学家，Git版本控制
 * - 老子：道家创始人，日志记录引擎
 */
export const defaultKongziComposerConfig: ComposerConfig = {
    engines: [
        {
            name: "LaoziEngine",
            dependencies: [],
            services: {
                logging: false, // 老子是日志服务提供者，不需要日志服务
            },
        },
        {
            name: "LubanEngine",
            dependencies: ["LaoziEngine"],
            services: {
                logging: true, // 鲁班需要日志服务
            },
        },
        {
            name: "MoziEngine",
            dependencies: ["LaoziEngine"],
            services: {
                logging: true, // 墨子需要日志服务
            },
        },
        {
            name: "ZoujiEngine",
            dependencies: ["LaoziEngine"],
            services: {
                logging: true, // 邹忌需要日志服务
            },
        },
        {
            name: "ZuoqiumingEngine",
            dependencies: ["LaoziEngine"],
            services: {
                logging: true, // 左丘明需要日志服务
            },
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
        {
            from: "ZoujiEngine",
            to: "LaoziEngine",
            method: "through-kongzi",
            messageType: "logging-request",
        },
        {
            from: "ZuoqiumingEngine",
            to: "LaoziEngine",
            method: "through-kongzi",
            messageType: "logging-request",
        },
    ],
    standardServices: {
        logging: true, // 启用标准日志服务
    },
};

/**
 * 创建自定义的孔子组合器配置
 */
export function createKongziComposerConfig(
    customEngines?: Partial<ComposerConfig["engines"]>,
    customCommunications?: Partial<ComposerConfig["communications"]>
): ComposerConfig {
    return {
        engines: customEngines || defaultKongziComposerConfig.engines,
        communications:
            customCommunications || defaultKongziComposerConfig.communications,
        standardServices: defaultKongziComposerConfig.standardServices,
    };
}
