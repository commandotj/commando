/**
 * 本地化 Hook
 * 提供多语言支持的状态管理
 */

import { useState, useEffect, useCallback } from "react";
import {
  getMessages,
  type Locale,
  type LocaleMessages,
} from "@common/constants/Locales";

interface LocaleState {
  locale: Locale;
  messages: LocaleMessages;
}

const STORAGE_KEY = "commando-locale";

export function useLocale(): {
  locale: Locale;
  messages: LocaleMessages;
  setLocale: (locale: Locale) => void;
  t: (key: keyof LocaleMessages) => string;
} {
  // 从本地存储获取语言设置，默认为中文
  const getStoredLocale = (): Locale => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return (stored as Locale) || "zh-CN";
    } catch {
      return "zh-CN";
    }
  };

  const [localeState, setLocaleState] = useState<LocaleState>(() => {
    const locale = getStoredLocale();
    return {
      locale,
      messages: getMessages(locale),
    };
  });

  // 切换语言
  const setLocale = useCallback((newLocale: Locale) => {
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch (error) {
      console.warn("Failed to save locale to localStorage:", error);
    }

    setLocaleState({
      locale: newLocale,
      messages: getMessages(newLocale),
    });
  }, []);

  // 获取当前语言的消息
  const t = useCallback(
    (key: keyof LocaleMessages): string => {
      return localeState.messages[key] || key;
    },
    [localeState.messages],
  );

  // 监听系统语言变化（可选）
  useEffect(() => {
    const handleLanguageChange = (): void => {
      const systemLocale = navigator.language.startsWith("zh")
        ? "zh-CN"
        : "en-US";
      if (systemLocale !== localeState.locale) {
        // 可以选择是否自动跟随系统语言
        // setLocale(systemLocale);
      }
    };

    window.addEventListener("languagechange", handleLanguageChange);
    return () =>
      window.removeEventListener("languagechange", handleLanguageChange);
  }, [localeState.locale, setLocale]);

  return {
    locale: localeState.locale,
    messages: localeState.messages,
    setLocale,
    t,
  };
}
