/**
 * i18n Hook
 * 提供类型安全的翻译功能
 */

import { useTranslation } from "react-i18next";

export function useI18n(): {
  t: (key: string, options?: Record<string, unknown>) => string;
  changeLanguage: (lng: string) => void;
  currentLanguage: string;
  isReady: boolean;
} {
  const { t, i18n } = useTranslation();

  // 切换语言
  const changeLanguage = (lng: string): void => {
    i18n.changeLanguage(lng);
  };

  // 获取当前语言
  const currentLanguage = i18n.language;

  // 类型安全的翻译函数
  const translate = (
    key: string,
    options?: Record<string, unknown>,
  ): string => {
    return t(key, options as Record<string, unknown>) as string;
  };

  return {
    t: translate,
    changeLanguage,
    currentLanguage,
    isReady: i18n.isInitialized,
  };
}
