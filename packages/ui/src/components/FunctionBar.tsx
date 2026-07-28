import React, { useState } from "react";
import { ThemeSwitchButton } from "./ThemeSwitcher";
import {
    CopyIcon,
    PlusIcon,
    FilePlusIcon,
    ReloadIcon,
    GearIcon,
} from "@radix-ui/react-icons";
import IconButton from "./IconButton"; // 独立组件文件
import { useAppSelector, useAppDispatch } from "../app/hooks";
import store from "../app/store";
import BatchCopyProgressModal from "./BatchCopyProgressModal";
import { fetchDirectory } from "../app/fileManagerSlice";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { EnhancedFileOperationService } from "../services/EnhancedFileOperationService";

// FunctionBar 组件：左侧为常用操作按钮组，右侧为主题切换
const FunctionBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { activePane, panes } = useAppSelector(state => state.fileManager);
    const selectedKeys = panes[activePane]?.selectedKeys || [];
    const copyDisabled = !selectedKeys || selectedKeys.length === 0;
    const [modalOpen, setModalOpen] = useState(false);
    const [modalSrcs, setModalSrcs] = useState<string[]>([]);
    const [modalDest, setModalDest] = useState<string>("");
    const [operationType, setOperationType] = useState<"copy" | "move">("copy");

    // 使用服务层处理文件操作
    const enhancedService = new EnhancedFileOperationService(dispatch, () =>
        store.getState()
    );

    // 刷新当前面板
    const handleRefresh = (): void => {
        const currentPane = panes[activePane];
        if (currentPane) {
            dispatch(
                fetchDirectory({
                    paneIndex: activePane,
                    path: currentPane.currentPath,
                })
            );
        }
    };

    // 复制到另一侧
    const handleCopyToOtherPane = async (): Promise<void> => {
        if (copyDisabled) return;
        const srcPane = panes[activePane];
        const dstPaneIndex = activePane === 0 ? 1 : 0;
        const dstPane = panes[dstPaneIndex];
        if (!srcPane || !dstPane || !srcPane.selectedKeys.length) {
            return;
        }
        const sources: string[] = srcPane.selectedKeys;
        const targetDir: string = dstPane.currentPath;
        setModalSrcs(sources);
        setModalDest(targetDir);
        setOperationType("copy");
        setModalOpen(true);

        try {
            // 使用服务层处理复制操作，而不是直接调用 API
            await enhancedService.startEnhancedOperation({
                type: "copy",
                sources,
                destination: targetDir,
                sourcePane: activePane,
                targetPane: dstPaneIndex,
            });
        } catch (error) {
            console.error("Copy failed:", error);
            setModalOpen(false);
            window.alert(
                `复制失败: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    };

    // 移动到另一侧
    const handleMoveToOtherPane = async (): Promise<void> => {
        if (copyDisabled) return;
        const srcPane = panes[activePane];
        const dstPaneIndex = activePane === 0 ? 1 : 0;
        const dstPane = panes[dstPaneIndex];
        if (!srcPane || !dstPane || !srcPane.selectedKeys.length) {
            return;
        }
        const sources: string[] = srcPane.selectedKeys;
        const targetDir: string = dstPane.currentPath;
        setModalSrcs(sources);
        setModalDest(targetDir);
        setOperationType("move");
        setModalOpen(true);

        try {
            // 使用服务层处理移动操作
            await enhancedService.startEnhancedOperation({
                type: "move",
                sources,
                destination: targetDir,
                sourcePane: activePane,
                targetPane: dstPaneIndex,
            });
        } catch (error) {
            console.error("Move failed:", error);
            setModalOpen(false);
            window.alert(
                `移动失败: ${error instanceof Error ? error.message : String(error)}`
            );
        }
    };

    // 键盘快捷键支持
    useKeyboardShortcuts({
        onCopyToOtherPane: handleCopyToOtherPane,
        onMoveToOtherPane: handleMoveToOtherPane,
        onRefresh: handleRefresh,
    });

    // Modal 关闭后刷新目标 pane
    const handleModalClose = (): void => {
        setModalOpen(false);
        // 复制完成后刷新目标 pane
        const dstPaneIndex = activePane === 0 ? 1 : 0;
        const dstPane = panes[dstPaneIndex];
        if (dstPane) {
            dispatch(
                fetchDirectory({
                    paneIndex: dstPaneIndex,
                    path: dstPane.currentPath,
                })
            );
        }
    };

    return (
        <>
            <div className="cmd-function-bar">
                {/* 左侧功能按钮组 */}
                <div className="cmd-function-bar__actions">
                    {/* 复制到另一侧 */}
                    <IconButton
                        icon={
                            <CopyIcon className="cmd-icon cmd-icon--md cmd-icon--muted" />
                        }
                        label="复制到另一侧"
                        onClick={
                            copyDisabled ? undefined : handleCopyToOtherPane
                        }
                        disabled={copyDisabled}
                    />
                    {/* 移动到另一侧 */}
                    <IconButton
                        icon={
                            <CopyIcon className="cmd-icon cmd-icon--md cmd-icon--muted" />
                        }
                        label="移动到另一侧"
                        onClick={
                            copyDisabled ? undefined : handleMoveToOtherPane
                        }
                        disabled={copyDisabled}
                    />
                    {/* 新建文件 */}
                    <IconButton
                        icon={
                            <PlusIcon className="cmd-icon cmd-icon--md cmd-icon--muted" />
                        }
                        label="新建文件"
                        onClick={() => console.log("新建文件点击")}
                    />
                    {/* 新建文件夹（用 FilePlusIcon 替代 FolderPlusIcon） */}
                    <IconButton
                        icon={
                            <FilePlusIcon className="cmd-icon cmd-icon--md cmd-icon--muted" />
                        }
                        label="新建文件夹"
                        onClick={() => console.log("新建文件夹点击")}
                    />
                    {/* 刷新 */}
                    <IconButton
                        icon={
                            <ReloadIcon className="cmd-icon cmd-icon--md cmd-icon--muted" />
                        }
                        label="刷新"
                        onClick={handleRefresh}
                    />
                    {/* 设置 */}
                    <IconButton
                        icon={
                            <GearIcon className="cmd-icon cmd-icon--md cmd-icon--muted" />
                        }
                        label="设置"
                        onClick={() => console.log("设置点击")}
                    />
                </div>
                {/* 右侧主题切换按钮 */}
                <div className="cmd-function-bar__theme">
                    <ThemeSwitchButton />
                </div>
            </div>
            <BatchCopyProgressModal
                open={modalOpen}
                srcs={modalSrcs}
                dest={modalDest}
                operationType={operationType}
                onClose={handleModalClose}
            />
        </>
    );
};

export default FunctionBar;
