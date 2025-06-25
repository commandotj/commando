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
import BatchCopyProgressModal from "./BatchCopyProgressModal";
import { fetchDirectory } from "../app/fileManagerSlice";

// FunctionBar 组件：左侧为常用操作按钮组，右侧为主题切换
const FunctionBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const { activePane, panes } = useAppSelector((state) => state.fileManager);
    const selectedKeys = panes[activePane]?.selectedKeys || [];
    const copyDisabled = !selectedKeys || selectedKeys.length === 0;
    const [modalOpen, setModalOpen] = useState(false);
    const [modalSrcs, setModalSrcs] = useState<string[]>([]);
    const [modalDest, setModalDest] = useState<string>("");

    // 复制到另一侧
    const handleCopyToOtherPane = (): void => {
        if (copyDisabled) return;
        const srcPane = panes[activePane];
        const dstPaneIndex = activePane === 0 ? 1 : 0;
        const dstPane = panes[dstPaneIndex];
        if (!srcPane || !dstPane || !srcPane.selectedKeys.length) {
            return;
        }
        // 直接用 selectedKeys 作为绝对路径数组
        const sources: string[] = srcPane.selectedKeys;
        const targetDir: string = dstPane.currentPath;
        setModalSrcs(sources);
        setModalDest(targetDir);
        setModalOpen(true);
    };

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
            <div className="flex items-center gap-2 px-4 py-1 h-8 border-b border-gray-100 dark:border-gray-800 bg-transparent select-none">
                {/* 左侧功能按钮组 */}
                <div className="flex items-center gap-2 flex-1">
                    {/* 复制到另一侧 */}
                    <IconButton
                        icon={
                            <CopyIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        }
                        label="复制到另一侧"
                        onClick={
                            copyDisabled ? undefined : handleCopyToOtherPane
                        }
                        disabled={copyDisabled}
                    />
                    {/* 新建文件 */}
                    <IconButton
                        icon={
                            <PlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        }
                        label="新建文件"
                        onClick={() => console.log("新建文件点击")}
                    />
                    {/* 新建文件夹（用 FilePlusIcon 替代 FolderPlusIcon） */}
                    <IconButton
                        icon={
                            <FilePlusIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        }
                        label="新建文件夹"
                        onClick={() => console.log("新建文件夹点击")}
                    />
                    {/* 刷新 */}
                    <IconButton
                        icon={
                            <ReloadIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        }
                        label="刷新"
                        onClick={() => console.log("刷新点击")}
                    />
                    {/* 设置 */}
                    <IconButton
                        icon={
                            <GearIcon className="w-5 h-5 text-gray-700 dark:text-gray-200" />
                        }
                        label="设置"
                        onClick={() => console.log("设置点击")}
                    />
                </div>
                {/* 右侧主题切换按钮 */}
                <div className="flex items-center justify-end">
                    <ThemeSwitchButton />
                </div>
            </div>
            <BatchCopyProgressModal
                open={modalOpen}
                srcs={modalSrcs}
                dest={modalDest}
                onClose={handleModalClose}
            />
        </>
    );
};

export default FunctionBar;
