import { Menu, BrowserWindow } from "electron";

// 默认 i18n 资源
const defaultLocale = {
    file: "File",
    newTab: "New Tab",
    open: "Open...",
    save: "Save",
    close: "Close",
    quit: "Quit",
    edit: "Edit",
    undo: "Undo",
    redo: "Redo",
    cut: "Cut",
    copy: "Copy",
    paste: "Paste",
    pasteAndMatchStyle: "Paste and Match Style",
    delete: "Delete",
    selectAll: "Select All",
    speech: "Speech",
    startSpeaking: "Start Speaking",
    stopSpeaking: "Stop Speaking",
    view: "View",
    reload: "Reload",
    toggleFullscreen: "Toggle Full Screen",
    resetZoom: "Reset Zoom",
    zoomIn: "Zoom In",
    zoomOut: "Zoom Out",
};

// 默认配置
const defaultConfig = {
    shortcutNewTab: "CmdOrCtrl+N",
    shortcutOpen: "CmdOrCtrl+O",
    shortcutSave: "CmdOrCtrl+S",
    showNewTab: true,
    showOpen: true,
    showSave: true,
};

// 默认主题
const defaultTheme = {
    // 可扩展 icon/color 等
    iconType: "default",
};

export function getMenuTemplate({
    config = defaultConfig,
    locale = defaultLocale,
    theme = defaultTheme,
} = {}) {
    const platform = (process as any).platform;
    const template = [
        {
            label: locale.file,
            submenu: [
                {
                    label: locale.newTab,
                    accelerator: config.shortcutNewTab,
                    visible: config.showNewTab,
                    click: () => sendMenuAction("new-tab"),
                },
                {
                    label: locale.open,
                    accelerator: config.shortcutOpen,
                    visible: config.showOpen,
                    click: () => sendMenuAction("open"),
                },
                {
                    label: locale.save,
                    accelerator: config.shortcutSave,
                    visible: config.showSave,
                    click: () => sendMenuAction("save"),
                },
                { type: "separator" as const },
                platform === "darwin"
                    ? { label: locale.close, role: "close" as const }
                    : { label: locale.quit, role: "quit" as const },
            ],
        },
        {
            label: locale.edit,
            submenu: [
                { label: locale.undo, role: "undo" as const },
                { label: locale.redo, role: "redo" as const },
                { type: "separator" as const },
                { label: locale.cut, role: "cut" as const },
                { label: locale.copy, role: "copy" as const },
                { label: locale.paste, role: "paste" as const },
                ...(platform === "darwin"
                    ? [
                          {
                              label: locale.pasteAndMatchStyle,
                              role: "pasteAndMatchStyle" as const,
                          },
                          { label: locale.delete, role: "delete" as const },
                          {
                              label: locale.selectAll,
                              role: "selectAll" as const,
                          },
                          { type: "separator" as const },
                          {
                              label: locale.speech,
                              submenu: [
                                  {
                                      label: locale.startSpeaking,
                                      role: "startSpeaking" as const,
                                  },
                                  {
                                      label: locale.stopSpeaking,
                                      role: "stopSpeaking" as const,
                                  },
                              ],
                          },
                      ]
                    : [
                          { label: locale.delete, role: "delete" as const },
                          { type: "separator" as const },
                          {
                              label: locale.selectAll,
                              role: "selectAll" as const,
                          },
                      ]),
            ],
        },
        {
            label: locale.view,
            submenu: [
                {
                    label: locale.reload,
                    accelerator: "CmdOrCtrl+R",
                    click: () => sendMenuAction("reload"),
                },
                {
                    label: locale.toggleFullscreen,
                    accelerator: "F11",
                    click: () => sendMenuAction("toggle-fullscreen"),
                },
                { label: locale.resetZoom, role: "resetZoom" as const },
                { label: locale.zoomIn, role: "zoomIn" as const },
                { label: locale.zoomOut, role: "zoomOut" as const },
            ],
        },
    ];
    // macOS 独有设计说明：
    // 在 macOS 下，Electron 会自动在菜单栏首位插入"App菜单"（如"Electron"或你的应用名），
    // 该菜单包含"关于"、"服务"、"隐藏"、"退出"等系统管理项，且名称不可自定义。
    // 若未在模板首位显式插入 { role: 'appMenu' }，Electron 可能会将第一个自定义菜单（如"文件"）合并进 App 菜单，
    // 导致"文件"菜单项消失。正确做法是在 macOS 下首位插入 { role: 'appMenu' }，
    // 这样"文件"、"编辑"、"视图"等自定义菜单才会独立显示，顺序与原生应用一致。
    return [
        ...(platform === "darwin" ? [{ role: "appMenu" }] : []),
        ...template,
    ];
}

export function sendMenuAction(action: string) {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.webContents.send("menu-action", action);
    }
}
