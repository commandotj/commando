/**
 * 渲染进程 i18n 支持
 * 基于现有的 i18n 文件结构
 */

import i18next from "i18next";
import { initReactI18next } from "react-i18next";

// 导入翻译文件
import zhCN from "./locales/zh-CN.json";
import enUS from "./locales/en-US.json";
import es from "./locales/es.json";
import fr from "./locales/fr.json";
import de from "./locales/de.json";
import ja from "./locales/ja.json";
import ko from "./locales/ko.json";

const resources = {
    "zh-CN": { translation: zhCN },
    "en-US": { translation: enUS },
    "es": { translation: es },
    "fr": { translation: fr },
    "de": { translation: de },
    "ja": { translation: ja },
    "ko": { translation: ko },
};

const saved =
    typeof localStorage !== "undefined"
        ? localStorage.getItem("commando-locale")
        : null;

i18next.use(initReactI18next).init({
    resources,
    lng: saved || "en-US",
    fallbackLng: "en-US",
    interpolation: {
        escapeValue: false, // React 已经处理了 XSS
    },
    react: {
        useSuspense: false, // 避免 Suspense 问题
    },
});

export default i18next;
