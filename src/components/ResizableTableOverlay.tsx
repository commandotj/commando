import React from "react";

interface ResizableTableOverlayProps {
    active: boolean;
    overlayX: number | null;
}

export const ResizableTableOverlay: React.FC<ResizableTableOverlayProps> = ({
    active,
    overlayX,
}) => {
    if (!active || overlayX == null) return null;

    return (
        <div
            className="resize-overlay"
            style={{
                position: "absolute",
                top: 0,
                left: overlayX,
                bottom: 0,
                width: "2px",
                backgroundColor: "#1890ff",
                pointerEvents: "none",
                zIndex: 1000,
                transition: "none",
            }}
        />
    );
};
