import type { SyncStrategyId } from "@commando/shared/types/SyncTypes";

/** Strategy ids — must match backend internal/sync.StrategyID */
export const SYNC_STRATEGY_IDS = {
    MIRROR_RIGHT: "mirror-right",
    UPDATE_RIGHT: "update-right",
    MIRROR_LEFT: "mirror-left",
    UPDATE_LEFT: "update-left",
    TWO_WAY: "two-way",
} as const satisfies Record<string, SyncStrategyId>;

export type { SyncStrategyId };

export interface SyncStrategyOption {
    id: SyncStrategyId;
    labelKey: string;
    descriptionKey: string;
}

/** UI i18n keys for strategies defined in the Go sync module. */
export const SYNC_STRATEGY_OPTIONS: SyncStrategyOption[] = [
    {
        id: SYNC_STRATEGY_IDS.MIRROR_RIGHT,
        labelKey: "sync.strategy.mirrorRight",
        descriptionKey: "sync.strategy.mirrorRightDesc",
    },
    {
        id: SYNC_STRATEGY_IDS.UPDATE_RIGHT,
        labelKey: "sync.strategy.updateRight",
        descriptionKey: "sync.strategy.updateRightDesc",
    },
    {
        id: SYNC_STRATEGY_IDS.MIRROR_LEFT,
        labelKey: "sync.strategy.mirrorLeft",
        descriptionKey: "sync.strategy.mirrorLeftDesc",
    },
    {
        id: SYNC_STRATEGY_IDS.UPDATE_LEFT,
        labelKey: "sync.strategy.updateLeft",
        descriptionKey: "sync.strategy.updateLeftDesc",
    },
    {
        id: SYNC_STRATEGY_IDS.TWO_WAY,
        labelKey: "sync.strategy.twoWay",
        descriptionKey: "sync.strategy.twoWayDesc",
    },
];

export const SYNC_STRATEGY_DELETE_EXTRANEOUS: Record<SyncStrategyId, boolean> =
    {
        [SYNC_STRATEGY_IDS.MIRROR_RIGHT]: true,
        [SYNC_STRATEGY_IDS.UPDATE_RIGHT]: false,
        [SYNC_STRATEGY_IDS.MIRROR_LEFT]: true,
        [SYNC_STRATEGY_IDS.UPDATE_LEFT]: false,
        [SYNC_STRATEGY_IDS.TWO_WAY]: false,
    };

export const DEFAULT_SYNC_STRATEGY_ID = SYNC_STRATEGY_IDS.UPDATE_RIGHT;

export const DEFAULT_SYNC_OPTIONS = {
    deleteExtraneous: false,
    dryRun: false,
    useChecksum: false,
} as const;

export const SYNC_ACTION_COLORS: Record<string, string> = {
    copy: "sync-row-copy",
    delete: "sync-row-delete",
    conflict: "sync-row-conflict",
    skip: "sync-row-skip",
};
