import { useEffect } from "react";
import { useAppSelector } from "../app/hooks";

interface KeyboardShortcutsProps {
    onCopyToOtherPane: () => void;
    onMoveToOtherPane: () => void;
    onRefresh: () => void;
}

export const useKeyboardShortcuts = ({
    onCopyToOtherPane,
    onMoveToOtherPane,
    onRefresh,
}: KeyboardShortcutsProps) => {
    const { activePane, panes } = useAppSelector(state => state.fileManager);
    const selectedKeys = panes[activePane]?.selectedKeys || [];
    const hasSelection = selectedKeys.length > 0;

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // 防止在输入框中触发快捷键
            if (
                event.target instanceof HTMLInputElement ||
                event.target instanceof HTMLTextAreaElement ||
                event.target instanceof HTMLSelectElement
            ) {
                return;
            }

            // F5 - 复制到另一侧
            if (event.key === "F5" && hasSelection) {
                event.preventDefault();
                onCopyToOtherPane();
            }

            // F6 - 移动到另一侧
            if (event.key === "F6" && hasSelection) {
                event.preventDefault();
                onMoveToOtherPane();
            }

            // F5 - 刷新当前面板
            if (event.key === "F5" && !hasSelection) {
                event.preventDefault();
                onRefresh();
            }

            // Ctrl+C - 复制（如果选中文件）
            if (event.ctrlKey && event.key === "c" && hasSelection) {
                event.preventDefault();
                onCopyToOtherPane();
            }

            // Ctrl+X - 剪切/移动（如果选中文件）
            if (event.ctrlKey && event.key === "x" && hasSelection) {
                event.preventDefault();
                onMoveToOtherPane();
            }

            // Ctrl+V - 粘贴（在目标面板中）
            if (event.ctrlKey && event.key === "v") {
                event.preventDefault();
                // TODO: 实现粘贴功能
                console.log("粘贴功能待实现");
            }

            // Delete - 删除选中文件
            if (event.key === "Delete" && hasSelection) {
                event.preventDefault();
                // TODO: 实现删除功能
                console.log("删除功能待实现");
            }

            // Ctrl+A - 全选
            if (event.ctrlKey && event.key === "a") {
                event.preventDefault();
                // TODO: 实现全选功能
                console.log("全选功能待实现");
            }

            // Escape - 取消选择
            if (event.key === "Escape") {
                event.preventDefault();
                // TODO: 实现取消选择功能
                console.log("取消选择功能待实现");
            }
        };

        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [hasSelection, onCopyToOtherPane, onMoveToOtherPane, onRefresh]);
};
