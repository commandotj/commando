import { useCallback } from "react";
import { useAppSelector, useAppDispatch } from "../app/hooks";
import { fetchDirectory } from "../app/fileManagerSlice";

/**
 * useCopyToOtherPane
 * 用于"复制到另一侧"功能，自动读取当前激活 pane 的选中项和路径，
 * 组装参数并调用 window.fsApi.copyBatch，复制完成后刷新目标 pane。
 * 支持批量复制和异常提示。
 */
export function useCopyToOtherPane(): () => Promise<void> {
    const dispatch = useAppDispatch();
    const { activePane, panes } = useAppSelector(state => state.fileManager);
    const srcPane = panes[activePane];
    const dstPaneIndex = activePane === 0 ? 1 : 0;
    const dstPane = panes[dstPaneIndex];

    const copy = useCallback(async (): Promise<void> => {
        if (!srcPane || !dstPane || !srcPane.selectedKeys.length) return;
        try {
            // 组装源文件绝对路径数组
            const sources: string[] = srcPane.selectedKeys.map(name =>
                srcPane.currentPath.endsWith("/")
                    ? srcPane.currentPath + name
                    : srcPane.currentPath + "/" + name
            );
            const targetDir: string = dstPane.currentPath;
            // 调用 preload 层 API，支持批量
            await window.fsApi.copyBatch(sources, targetDir);
            // 刷新目标 pane
            dispatch(
                fetchDirectory({ paneIndex: dstPaneIndex, path: targetDir })
            );
            // 可扩展：弹窗/日志/进度 modal
            window.alert("复制完成");
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            window.alert("复制失败: " + msg);
        }
    }, [srcPane, dstPane, dispatch, dstPaneIndex]);

    return copy;
}
