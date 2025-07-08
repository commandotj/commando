import { BrowserWindow } from "electron";
// @ts-ignore
import i18next from "i18next";

// 默认配置
const defaultConfig = {
    shortcutNewTab: "CmdOrCtrl+N",
    shortcutOpen: "CmdOrCtrl+O",
    shortcutSave: "CmdOrCtrl+S",
    showNewTab: true,
    showOpen: true,
    showSave: true,
};

export function getMenuTemplate({ config = defaultConfig } = {}) {
    const platform = (process as any).platform;
    const template = [
        {
            label: i18next.t("menu.file.label"),
            submenu: [
                {
                    label: i18next.t("menu.file.newTab"),
                    accelerator: config.shortcutNewTab,
                    visible: config.showNewTab,
                    click: () => sendMenuAction("new-tab"),
                },
                {
                    label: i18next.t("menu.file.open"),
                    accelerator: config.shortcutOpen,
                    visible: config.showOpen,
                    click: () => sendMenuAction("open"),
                },
                {
                    label: i18next.t("menu.file.save"),
                    accelerator: config.shortcutSave,
                    visible: config.showSave,
                    click: () => sendMenuAction("save"),
                },
                { type: "separator" as const },
                platform === "darwin"
                    ? {
                          label: i18next.t("menu.file.close"),
                          role: "close" as const,
                      }
                    : {
                          label: i18next.t("menu.file.quit"),
                          role: "quit" as const,
                      },
            ],
        },
        {
            label: i18next.t("menu.edit.label"),
            submenu: [
                { label: i18next.t("menu.edit.undo"), role: "undo" as const },
                { label: i18next.t("menu.edit.redo"), role: "redo" as const },
                { type: "separator" as const },
                { label: i18next.t("menu.edit.cut"), role: "cut" as const },
                { label: i18next.t("menu.edit.copy"), role: "copy" as const },
                { label: i18next.t("menu.edit.paste"), role: "paste" as const },
                ...(platform === "darwin"
                    ? [
                          {
                              label: i18next.t("menu.edit.pasteAndMatchStyle"),
                              role: "pasteAndMatchStyle" as const,
                          },
                          {
                              label: i18next.t("menu.edit.delete"),
                              role: "delete" as const,
                          },
                          {
                              label: i18next.t("menu.edit.selectAll"),
                              role: "selectAll" as const,
                          },
                          { type: "separator" as const },
                          {
                              label: i18next.t("menu.edit.speech"),
                              submenu: [
                                  {
                                      label: i18next.t(
                                          "menu.edit.startSpeaking"
                                      ),
                                      role: "startSpeaking" as const,
                                  },
                                  {
                                      label: i18next.t(
                                          "menu.edit.stopSpeaking"
                                      ),
                                      role: "stopSpeaking" as const,
                                  },
                              ],
                          },
                      ]
                    : [
                          {
                              label: i18next.t("menu.edit.delete"),
                              role: "delete" as const,
                          },
                          { type: "separator" as const },
                          {
                              label: i18next.t("menu.edit.selectAll"),
                              role: "selectAll" as const,
                          },
                      ]),
            ],
        },
        {
            label: i18next.t("menu.view.label"),
            submenu: [
                {
                    label: i18next.t("menu.view.reload"),
                    accelerator: "CmdOrCtrl+R",
                    click: () => sendMenuAction("reload"),
                },
                {
                    label: i18next.t("menu.view.toggleFullscreen"),
                    accelerator: "F11",
                    click: () => sendMenuAction("toggle-fullscreen"),
                },
                {
                    label: i18next.t("menu.view.resetZoom"),
                    role: "resetZoom" as const,
                },
                {
                    label: i18next.t("menu.view.zoomIn"),
                    role: "zoomIn" as const,
                },
                {
                    label: i18next.t("menu.view.zoomOut"),
                    role: "zoomOut" as const,
                },
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
        ...(platform === "darwin"
            ? [{ role: "appMenu" } as Electron.MenuItemConstructorOptions]
            : []),
        ...template,
    ];
}

export function sendMenuAction(action: string) {
    const win = BrowserWindow.getFocusedWindow();
    if (win) {
        win.webContents.send("menu-action", action);
    }
}
