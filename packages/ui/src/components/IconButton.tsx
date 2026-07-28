import React from "react";

/**
 * 通用图标按钮组件，支持 aria-label、tooltip、onClick、disabled。
 * 用于功能栏、工具栏等场景。
 * 注意：传入的 icon 组件需支持 className 和 currentColor，
 * 以便适配 light/dark 主题色。IconButton 不覆盖 icon 的 className 和 color。
 */
const IconButton: React.FC<{
    icon: React.ReactNode;
    label: string;
    onClick?: () => void;
    disabled?: boolean;
}> = ({ icon, label, onClick, disabled }) => (
    <button
        className="cmd-icon-btn"
        aria-label={label}
        title={label}
        aria-disabled={disabled}
        onClick={disabled ? undefined : onClick}
        type="button"
        tabIndex={disabled ? -1 : 0}
        disabled={disabled}
    >
        {icon}
    </button>
);

export default IconButton;
