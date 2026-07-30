import React, { useState } from "react";
import {
    ArchiveIcon,
    ChevronDownIcon,
    DesktopIcon,
} from "@radix-ui/react-icons";
import { useI18n } from "../../hooks/useI18n";
import { areSyncRootsEqual } from "../../common/syncRoots";
import type { DeviceInfo } from "../DeviceBar";

interface SyncRootBarProps {
    paneIndex: 0 | 1;
    syncRoot: string;
    currentPath: string;
    otherSyncRoot: string;
    volumes: DeviceInfo[];
    onNavigate: (path: string) => void;
    onSetSyncRoot: (path: string) => void;
}

function paneHintKey(
    paneIndex: 0 | 1,
    syncRoot: string,
    otherSyncRoot: string
): string | null {
    if (
        syncRoot &&
        otherSyncRoot &&
        areSyncRootsEqual(syncRoot, otherSyncRoot)
    ) {
        return "sync.onboarding.sameRoots";
    }
    if (!syncRoot && otherSyncRoot) {
        return paneIndex === 0
            ? "sync.onboarding.rightRootSet"
            : "sync.onboarding.leftRootSet";
    }
    if (!syncRoot) {
        return paneIndex === 0
            ? "sync.onboarding.setLeftRoot"
            : "sync.onboarding.setRightRoot";
    }
    return null;
}

const SyncRootBar: React.FC<SyncRootBarProps> = ({
    paneIndex,
    syncRoot,
    currentPath,
    otherSyncRoot,
    volumes,
    onNavigate,
    onSetSyncRoot,
}) => {
    const { t } = useI18n();
    const [open, setOpen] = useState(false);
    const label = paneIndex === 0 ? t("sync.pane.left") : t("sync.pane.right");
    const displayPath = currentPath || t("sync.pane.noRoot");
    const hintKey = paneHintKey(paneIndex, syncRoot, otherSyncRoot);
    const volumePaths = volumes.flatMap(d => d.mountpoints.map(mp => mp.path));

    return (
        <div className={`sync-root-bar sync-root-bar--pane-${paneIndex}`}>
            <div className="sync-root-bar__label">
                <ArchiveIcon width={14} height={14} aria-hidden />
                {label}
            </div>

            <div className="sync-root-bar__path" title={displayPath}>
                {displayPath}
            </div>

            <div className="sync-root-bar__actions">
                <div className="sync-root-bar__dropdown">
                    <button
                        type="button"
                        className="sync-btn sync-btn--ghost sync-root-bar__btn"
                        onClick={() => setOpen(v => !v)}
                        aria-expanded={open}
                    >
                        <DesktopIcon width={14} height={14} aria-hidden />
                        {t("sync.pane.browse")}
                        <ChevronDownIcon width={12} height={12} aria-hidden />
                    </button>
                    {open && (
                        <div className="sync-root-bar__menu" role="menu">
                            {volumePaths.map(path => (
                                <button
                                    key={path}
                                    type="button"
                                    role="menuitem"
                                    className="sync-root-bar__menu-item"
                                    onClick={() => {
                                        onNavigate(path);
                                        onSetSyncRoot(path);
                                        setOpen(false);
                                    }}
                                >
                                    {path}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {hintKey && (
                <p className="sync-root-bar__hint" role="status">
                    {t(hintKey)}
                </p>
            )}
        </div>
    );
};

export default SyncRootBar;
