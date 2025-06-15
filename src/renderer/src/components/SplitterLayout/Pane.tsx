import React, { ReactNode } from 'react';

export interface PaneProps {
    vertical?: boolean;
    primary?: boolean;
    size?: number;
    percentage?: boolean;
    children?: ReactNode | ReactNode[];
}

const Pane: React.FC<PaneProps> = ({
    vertical = false,
    primary = false,
    size = 0,
    percentage = false,
    children = []
}) => {
    const unit = percentage ? '%' : 'px';
    let classes = 'layout-pane';
    const style: React.CSSProperties = {};
    if (!primary) {
        if (vertical) {
            style.height = `${size}${unit}`;
        } else {
            style.width = `${size}${unit}`;
        }
        classes += ' layout-pane-secondary';
    } else {
        classes += ' layout-pane-primary';
    }
    return (
        <div className={classes} style={style}>
            {children}
        </div>
    );
};

export default Pane;
