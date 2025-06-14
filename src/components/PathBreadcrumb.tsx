import React from "react";
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
        <nav className={className} aria-label="Breadcrumb">
            <ol className="flex items-center space-x-1 text-sm text-gray-500 dark:text-gray-300">
                {parts.map((part, idx) => (
                    <li key={idx} className="flex items-center">
                        {idx > 0 && (
                            <span className="mx-1 text-gray-400 dark:text-gray-600">
                                /
                            </span>
                        )}
                        <a
                            onClick={(e) => {
                                e.preventDefault();
                                onClick?.(idx, part);
                            }}
                            className="hover:underline cursor-pointer text-blue-700 dark:text-blue-400"
                        >
                            {part}
                        </a>
                    </li>
                ))}
            </ol>
        </nav>
    );
};

export default PathBreadcrumb;
