import React from "react";
import { Breadcrumb } from "antd";
import { splitPath } from "../common/path";

export interface PathBreadcrumbProps {
    path: string;
    onClick?: (index: number, part: string) => void;
    className?: string;
}

const PathBreadcrumb: React.FC<PathBreadcrumbProps> = ({
    path,
    onClick,
    className,
}) => {
    const parts = splitPath(path);

    return (
        <Breadcrumb
            className={className}
            items={parts.map((part, idx) => ({
                title: (
                    <a
                        onClick={(e) => {
                            e.preventDefault();
                            onClick?.(idx, part);
                        }}
                        style={{ cursor: "pointer" }}
                    >
                        {part}
                    </a>
                ),
                key: idx,
            }))}
        />
    );
};

export default PathBreadcrumb;
