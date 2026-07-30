# RFC-2026-035: i18n Expansion — Language Selector & New Locales

---

作者: albert.li/AI
创建时间: 2026-07-30
状态: Draft

---

## 摘要

现有 i18n 支持 zh-CN + en-US。扩展到 ES, FR, DE, JA, KO。添加语言选择器 icon到 toolbar。

## 已存在

- `react-i18next` 已集成
- `useI18n()` hook 提供 `t()`, `changeLanguage()`, `currentLanguage`
- `locales/en-US.json`, `locales/zh-CN.json`

## 新增 Locale

| Code    | Language        |
| ------- | --------------- |
| `en-US` | English (已有)  |
| `zh-CN` | 简体中文 (已有) |
| `es`    | Spanish         |
| `fr`    | French          |
| `de`    | German          |
| `ja`    | Japanese        |
| `ko`    | Korean          |

## 语言选择器

放在 toolbar title 行，theme switch 旁边。

```
Commando Sync ──────────────── 🌐 ▼ 🌙
```

或 gear modal 内加 Language selector。

`useI18n().changeLanguage(code)` 切换。

## 文件

| 文件                              | 变更           |
| --------------------------------- | -------------- |
| `i18n/locales/es.json`            | 新增           |
| `i18n/locales/fr.json`            | 新增           |
| `i18n/locales/de.json`            | 新增           |
| `i18n/locales/ja.json`            | 新增           |
| `i18n/locales/ko.json`            | 新增           |
| `i18n/index.ts`                   | 注册新 locale  |
| `components/sync/SyncToolbar.tsx` | 添加语言选择器 |

## 持久化

locale 存 `localStorage('commando-locale')`，启动时读取。

---

**状态**: Draft
