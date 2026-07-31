import React, { useState } from "react";
import {
    ArrowRightIcon,
    TrashIcon,
    ExclamationTriangleIcon,
    MinusIcon,
} from "@radix-ui/react-icons";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { runSync } from "../../app/syncSlice";
import { setViewMode } from "../../app/fileManagerSlice";
import SyncSummaryStrip from "./SyncSummaryStrip";

const ACTION_ICONS: Record<string, React.ReactNode> = {
    copy: <ArrowRightIcon width={14} height={14} />,
    delete: <TrashIcon width={14} height={14} />,
    conflict: <ExclamationTriangleIcon width={14} height={14} />,
    skip: <MinusIcon width={14} height={14} />,
};

const ACTION_CLASS: Record<string, string> = {
    copy: "sync-diff-action sync-diff-action--copy",
    delete: "sync-diff-action sync-diff-action--delete",
    conflict: "sync-diff-action sync-diff-action--conflict",
    skip: "sync-diff-action sync-diff-action--skip",
};

const GROUP_ORDER = ["conflict", "copy", "delete", "skip"];

const SyncDiffView: React.FC = () => {
    const dispatch = useAppDispatch();
    const report = useAppSelector(s => s.sync.report);
    const status = useAppSelector(s => s.sync.status);
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [collapsed, setCollapsed] = useState<Set<string>>(new Set(["skip"]));

    if (!report) return null;

    const grouped = GROUP_ORDER.map(action => ({
        action,
        items: (report.items || []).filter(i => i.action === action),
    })).filter(g => g.items.length > 0);

    const toggle = (path: string) => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(path)) next.delete(path);
            else next.add(path);
            return next;
        });
    };

    const toggleGroup = (group: string) => {
        setCollapsed(prev => {
            const next = new Set(prev);
            if (next.has(group)) next.delete(group);
            else next.add(group);
            return next;
        });
    };

    return (
        <div className="sync-diff-view">
            <SyncSummaryStrip
                plan={report.plan}
                comparing={false}
                rootsState={{ kind: "ready" }}
            />
            <div className="sync-diff-view__toolbar">
                <button
                    className="sync-btn sync-btn--ghost"
                    onClick={() => dispatch(setViewMode("browse"))}
                >
                    ← Back to browse
                </button>
                <button
                    className="sync-btn sync-btn--primary"
                    disabled={status === "syncing"}
                    onClick={() => dispatch(runSync())}
                >
                    Execute sync
                </button>
            </div>
            <div className="sync-diff-view__list">
                {grouped.map(g => (
                    <div key={g.action} className="sync-diff-group">
                        <div
                            className="sync-diff-group__header"
                            onClick={() => toggleGroup(g.action)}
                        >
                            <span className={ACTION_CLASS[g.action]}>
                                {ACTION_ICONS[g.action]} {g.action}
                            </span>
                            <span className="sync-diff-group__count">
                                {g.items.length}
                            </span>
                            <span className="sync-diff-group__toggle">
                                {collapsed.has(g.action) ? "▸" : "▾"}
                            </span>
                        </div>
                        {!collapsed.has(g.action) &&
                            g.items.map(item => (
                                <div
                                    key={item.relativePath}
                                    className="sync-diff-row"
                                    onClick={() => toggle(item.relativePath)}
                                >
                                    <span className="sync-diff-row__path">
                                        {item.relativePath}
                                    </span>
                                    <span className={ACTION_CLASS[item.action]}>
                                        {item.action}
                                    </span>
                                    {expanded.has(item.relativePath) && (
                                        <div className="sync-diff-row__detail">
                                            <span>from: {item.from}</span>
                                            <span>to: {item.to}</span>
                                            <span>reason: {item.reason}</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SyncDiffView;
