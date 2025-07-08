import React from 'react';
import { useDraggable } from '@dnd-kit/core';

interface ResizableTableHeaderProps {
    width: number;
    columnKey: string;
    children: React.ReactNode;
    isDragging?: boolean;
    isLastColumn?: boolean;
}

export const ResizableTableHeader: React.FC<ResizableTableHeaderProps> = ({
    width,
    columnKey,
    children,
    isDragging = false,
    isLastColumn = false
}) => {
    const { attributes, listeners, setNodeRef } = useDraggable({
        id: `resize-${columnKey}`,
        data: { width }
    });

    // The handle is always at the right edge of the column
    const handleStyle = {
        position: 'absolute' as const,
        right: 0,
        top: 0,
        bottom: 0,
        width: '8px',
        cursor: 'col-resize',
        backgroundColor: isDragging ? '#1890ff33' : 'transparent',
        transition: 'background-color 0.2s ease',
        zIndex: 2
    };

    return (
        <th
            style={{
                position: 'relative',
                width,
                transition: isDragging ? 'none' : 'width 0.2s ease',
                userSelect: isDragging ? 'none' : undefined
            }}
            data-column-key={columnKey}
        >
            {children}
            {!isLastColumn && columnKey && (
                <div ref={setNodeRef} style={handleStyle} {...listeners} {...attributes} />
            )}
        </th>
    );
};
