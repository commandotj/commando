# package.json 结构与脚本分析

## 1. 脚本部分
- `dev`：先执行 `clean`，再 `build:i18n`，并用 `concurrently` 启动 `tsc:preload:watch`、`vite`、`i18n:watch` 三个进程。
- `build`：顺序为 `clean` → `tsc` → `vite build` → `build:i18n` → `electron-builder`。
- `build:i18n`：将 `electron/main/i18n` 目录复制到 `dist-electron/main/`。
- `i18n:watch`：用 `chokidar-cli` 监听 i18n 目录变动，自动同步。
- `clean`：删除 `dist-electron` 目录。

## 2. 依赖与开发依赖
- 前端主流依赖如 React、Redux、@tanstack/react-table、@radix-ui 相关、dnd-kit、i18next、drivelist 等均已配置。
- 开发依赖包括 Vite、TypeScript、Jest、Playwright、Tailwind、Electron 及相关插件、chokidar-cli、concurrently 等。

## 3. Node 版本与 Volta
- `engines` 指定 Node 14.18+ 或 16+。
- `volta` 指定 Node 22.16.0、Yarn 1.22.17（但脚本实际用 npm）。

## 4. 主进程入口
- `main` 字段指向 `./dist-electron/main/index.js`。

## 5. 描述与作者信息
- 项目描述、作者、MIT 协议、私有属性等。

## 6. 无多余字段
- 没有多余的配置或冗余脚本，结构清晰。

---

> 本文档用于团队查阅 package.json 结构与脚本设计，便于后续维护与协作。 