/**
 * 渲染进程 i18n 支持
 * 基于现有的 i18n 文件结构
 */

import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// 导入翻译文件
import zhCN from "./locales/zh-CN.json";
import enUS from "./locales/en-US.json";

const resources = {
  "zh-CN": {
    translation: zhCN,
  },
  "en-US": {
    translation: enUS,
  },
};

// 初始化 i18next
i18next.use(initReactI18next).init({
  resources,
  lng: "zh-CN", // 默认语言
  fallbackLng: "zh-CN",
  interpolation: {
    escapeValue: false, // React 已经处理了 XSS
  },
  react: {
    useSuspense: false, // 避免 Suspense 问题
  },
});

export default i18next;
