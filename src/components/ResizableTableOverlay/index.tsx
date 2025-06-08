import React from "react";

interface ResizableTableOverlayProps {
    active: boolean;
}

export const ResizableTableOverlay: React.FC<ResizableTableOverlayProps> = ({
    active,
}) => {
    if (!active) return null;

    return (
        <div
            style={{
                position: "absolute",
                top: 0,
                bottom: 0,
                width: "2px",
                backgroundColor: "#1890ff",
                pointerEvents: "none",
                zIndex: 1000,
            }}
        />
    );
};
