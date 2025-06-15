import React from "react";
import { ReloadIcon, CopyIcon, PaperPlaneIcon, TrashIcon } from '@radix-ui/react-icons';
import { ThemeSwitchButton } from './ThemeSwitcher';

const FunctionBar: React.FC = () => (
    <div className="flex items-center gap-2 px-4 py-1 h-8 border-b border-gray-100 dark:border-gray-800 bg-transparent select-none">
        <div className="flex items-center gap-2 flex-1">
            <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="刷新">
                <ReloadIcon className="w-5 h-5" />
            </button>
            <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="复制">
                <CopyIcon className="w-5 h-5" />
            </button>
            <button className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700" title="粘贴">
                <PaperPlaneIcon className="w-5 h-5" />
            </button>
            <button className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900" title="删除">
                <TrashIcon className="w-5 h-5 text-red-500" />
            </button>
        </div>
        <div className="flex items-center justify-end">
            <ThemeSwitchButton />
        </div>
    </div>
);

export default FunctionBar;