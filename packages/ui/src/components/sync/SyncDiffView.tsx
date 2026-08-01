import React, { useMemo, useState } from "react";
import {
    ArrowLeftIcon,
    ArrowRightIcon,
    ChevronDownIcon,
    ChevronRightIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    MinusIcon,
    PlayIcon,
    TrashIcon,
} from "@radix-ui/react-icons";
import type {
    CompareReportItem,
    SyncAction,
} from "@commandojs/shared/types/SyncTypes";
import { useAppSelector, useAppDispatch } from "../../app/hooks";
import { runSync } from "../../app/syncSlice";
import { setViewMode } from "../../app/fileManagerSlice";
import { useI18n } from "../../hooks/useI18n";

type DiffFilter = "all" | SyncAction;

const FILTER_ORDER: DiffFilter[] = [
    "all",
    "conflict",
    "copy",
    "delete",
    "skip",
];

const ACTION_LABEL_KEYS = {
    copy: "sync.diff.action.copy",
    delete: "sync.diff.action.delete",
    conflict: "sync.diff.action.conflict",
    skip: "sync.diff.action.skip",
    index: "sync.diff.action.index",
} as const satisfies Record<SyncAction, string>;

const ACTION_META: Record<
    SyncAction,
    { icon: React.ReactNode; className: string }
> = {
    copy: {
        icon: <ArrowRightIcon width={14} height={14} aria-hidden />,
        className: "sync-diff-badge sync-diff-badge--copy",
    },
    delete: {
        icon: <TrashIcon width={14} height={14} aria-hidden />,
        className: "sync-diff-badge sync-diff-badge--delete",
    },
    conflict: {
        icon: <ExclamationTriangleIcon width={14} height={14} aria-hidden />,
        className: "sync-diff-badge sync-diff-badge--conflict",
    },
    skip: {
        icon: <MinusIcon width={14} height={14} aria-hidden />,
        className: "sync-diff-badge sync-diff-badge--skip",
    },
    index: {
        icon: <MinusIcon width={14} height={14} aria-hidden />,
        className: "sync-diff-badge sync-diff-badge--skip",
    },
};

function basename(path: string): string {
    const parts = path.split(/[/\\]/);
    return parts[parts.length - 1] || path;
}

function matchesQuery(item: CompareReportItem, query: string): boolean {
    const q = query.trim().toLowerCase();
    if (!q) {
        return true;
    }
    return (
        item.relativePath.toLowerCase().includes(q) ||
        item.from.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q) ||
        item.reason.toLowerCase().includes(q)
    );
}

const SyncDiffView: React.FC = () => {
    const dispatch = useAppDispatch();
    const { t } = useI18n();
    const report = useAppSelector(s => s.sync.report);
    const status = useAppSelector(s => s.sync.status);
    const [filter, setFilter] = useState<DiffFilter>("all");
    const [query, setQuery] = useState("");
    const [expanded, setExpanded] = useState<Set<string>>(new Set());

    const counts: Record<DiffFilter, number> = useMemo(() => {
        const items = report?.items ?? [];
        return {
            all: items.length,
            conflict: items.filter(i => i.action === "conflict").length,
            copy: items.filter(i => i.action === "copy").length,
            delete: items.filter(i => i.action === "delete").length,
            skip: items.filter(i => i.action === "skip").length,
            index: items.filter(i => i.action === "index").length,
        };
    }, [report?.items]);

    const visibleItems = useMemo(() => {
        const items = report?.items ?? [];
        return items.filter(item => {
            if (filter !== "all" && item.action !== filter) {
                return false;
            }
            return matchesQuery(item, query);
        });
    }, [report?.items, filter, query]);

    if (!report) {
        return null;
    }

    const toggleRow = (path: string): void => {
        setExpanded(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const actionLabel = (action: SyncAction): string =>
        t(ACTION_LABEL_KEYS[action]);

    return (
        <div className="sync-diff-view wails-no-drag">
            <header className="sync-diff-header">
                <div className="sync-diff-header__top">
                    <h1 className="sync-diff-header__title">
                        {t("sync.plan.diffTitle")}
                    </h1>
                    <p
                        className="sync-diff-header__roots"
                        title={report.leftRoot}
                    >
                        <span className="sync-diff-header__root sync-diff-header__root--left">
                            {basename(report.leftRoot)}
                        </span>
                        <ArrowRightIcon width={14} height={14} aria-hidden />
                        <span
                            className="sync-diff-header__root sync-diff-header__root--right"
                            title={report.rightRoot}
                        >
                            {basename(report.rightRoot)}
                        </span>
                    </p>
                </div>
                <div className="sync-diff-stats" role="list">
                    <div
                        className="sync-diff-stat sync-diff-stat--copy"
                        role="listitem"
                    >
                        <span className="sync-diff-stat__value">
                            {counts.copy}
                        </span>
                        <span className="sync-diff-stat__label">
                            {t("sync.stats.copy")}
                        </span>
                    </div>
                    <div
                        className="sync-diff-stat sync-diff-stat--delete"
                        role="listitem"
                    >
                        <span className="sync-diff-stat__value">
                            {counts.delete}
                        </span>
                        <span className="sync-diff-stat__label">
                            {t("sync.stats.delete")}
                        </span>
                    </div>
                    <div
                        className="sync-diff-stat sync-diff-stat--conflict"
                        role="listitem"
                    >
                        <span className="sync-diff-stat__value">
                            {counts.conflict}
                        </span>
                        <span className="sync-diff-stat__label">
                            {t("sync.stats.conflicts")}
                        </span>
                    </div>
                    <div
                        className="sync-diff-stat sync-diff-stat--skip"
                        role="listitem"
                    >
                        <span className="sync-diff-stat__value">
                            {counts.skip}
                        </span>
                        <span className="sync-diff-stat__label">
                            {t("sync.stats.skip")}
                        </span>
                    </div>
                </div>
            </header>

            <div className="sync-diff-toolbar">
                <button
                    type="button"
                    className="sync-btn sync-btn--ghost sync-diff-toolbar__back"
                    onClick={() => dispatch(setViewMode("browse"))}
                >
                    <ArrowLeftIcon width={14} height={14} />
                    {t("sync.diff.backToBrowse")}
                </button>

                <div
                    className="sync-diff-filters"
                    role="tablist"
                    aria-label={t("sync.diff.filterLabel")}
                >
                    {FILTER_ORDER.map(key => (
                        <button
                            key={key}
                            type="button"
                            role="tab"
                            aria-selected={filter === key}
                            className={`sync-diff-filter${filter === key ? " sync-diff-filter--active" : ""}${key !== "all" ? ` sync-diff-filter--${key}` : ""}`}
                            onClick={() => setFilter(key)}
                        >
                            {t(`sync.diff.filter.${key}`)}
                            <span className="sync-diff-filter__count">
                                {counts[key]}
                            </span>
                        </button>
                    ))}
                </div>

                <label className="sync-diff-search">
                    <MagnifyingGlassIcon
                        className="sync-diff-search__icon"
                        width={14}
                        height={14}
                        aria-hidden
                    />
                    <input
                        type="search"
                        className="sync-diff-search__input"
                        placeholder={t("sync.diff.searchPlaceholder")}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        aria-label={t("sync.diff.searchPlaceholder")}
                    />
                </label>

                <button
                    type="button"
                    className="sync-btn sync-btn--primary sync-diff-toolbar__run"
                    disabled={
                        status === "syncing" ||
                        counts.copy + counts.delete === 0
                    }
                    onClick={() => dispatch(runSync())}
                >
                    <PlayIcon width={14} height={14} />
                    {status === "syncing"
                        ? t("sync.plan.syncing")
                        : t("sync.diff.execute")}
                </button>
            </div>

            <div className="sync-diff-table-wrap">
                {visibleItems.length === 0 ? (
                    <div className="sync-diff-empty">
                        {t("sync.diff.emptyFilter")}
                    </div>
                ) : (
                    <table className="sync-diff-table">
                        <thead>
                            <tr>
                                <th
                                    scope="col"
                                    className="sync-diff-table__col-path"
                                >
                                    {t("sync.diff.colPath")}
                                </th>
                                <th
                                    scope="col"
                                    className="sync-diff-table__col-action"
                                >
                                    {t("sync.table.status")}
                                </th>
                                <th
                                    scope="col"
                                    className="sync-diff-table__col-reason"
                                >
                                    {t("sync.diff.colReason")}
                                </th>
                                <th
                                    scope="col"
                                    className="sync-diff-table__col-expand"
                                    aria-label={t("sync.diff.colDetails")}
                                />
                            </tr>
                        </thead>
                        <tbody>
                            {visibleItems.map(item => {
                                const isOpen = expanded.has(item.relativePath);
                                const meta = ACTION_META[item.action];
                                return (
                                    <React.Fragment key={item.relativePath}>
                                        <tr
                                            className={`sync-diff-table__row sync-diff-table__row--${item.action}`}
                                        >
                                            <td className="sync-diff-table__path">
                                                <span
                                                    className="sync-diff-table__name"
                                                    title={item.relativePath}
                                                >
                                                    {basename(
                                                        item.relativePath
                                                    )}
                                                </span>
                                                <span
                                                    className="sync-diff-table__rel"
                                                    title={item.relativePath}
                                                >
                                                    {item.relativePath}
                                                </span>
                                            </td>
                                            <td>
                                                <span
                                                    className={meta.className}
                                                >
                                                    {meta.icon}
                                                    {actionLabel(item.action)}
                                                </span>
                                            </td>
                                            <td className="sync-diff-table__reason">
                                                {item.reason}
                                            </td>
                                            <td className="sync-diff-table__expand">
                                                <button
                                                    type="button"
                                                    className="sync-diff-expand-btn"
                                                    aria-expanded={isOpen}
                                                    aria-label={t(
                                                        "sync.diff.toggleDetails"
                                                    )}
                                                    onClick={() =>
                                                        toggleRow(
                                                            item.relativePath
                                                        )
                                                    }
                                                >
                                                    {isOpen ? (
                                                        <ChevronDownIcon
                                                            width={16}
                                                            height={16}
                                                        />
                                                    ) : (
                                                        <ChevronRightIcon
                                                            width={16}
                                                            height={16}
                                                        />
                                                    )}
                                                </button>
                                            </td>
                                        </tr>
                                        {isOpen && (
                                            <tr className="sync-diff-table__detail-row">
                                                <td colSpan={4}>
                                                    <dl className="sync-diff-detail">
                                                        <div className="sync-diff-detail__item">
                                                            <dt>
                                                                {t(
                                                                    "sync.diff.from"
                                                                )}
                                                            </dt>
                                                            <dd
                                                                title={
                                                                    item.from
                                                                }
                                                            >
                                                                {item.from ||
                                                                    "—"}
                                                            </dd>
                                                        </div>
                                                        <div className="sync-diff-detail__item">
                                                            <dt>
                                                                {t(
                                                                    "sync.diff.to"
                                                                )}
                                                            </dt>
                                                            <dd title={item.to}>
                                                                {item.to || "—"}
                                                            </dd>
                                                        </div>
                                                    </dl>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                )}
            </div>

            <footer className="sync-diff-footer">
                <span className="sync-diff-footer__count">
                    {t("sync.diff.showing", {
                        shown: visibleItems.length,
                        total: counts.all,
                    })}
                </span>
            </footer>
        </div>
    );
};

export default SyncDiffView;
