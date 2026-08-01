import { useAppSelector } from "../app/hooks";
import {
    getSyncRootsState,
    isSyncRootsReady,
    type SyncRootsState,
} from "../common/syncRoots";
import { effectiveSyncRoot } from "../common/effectiveSyncRoot";

export function useSyncRootsState(): {
    leftRoot: string;
    rightRoot: string;
    state: SyncRootsState;
    rootsReady: boolean;
} {
    const panes = useAppSelector(state => state.fileManager.panes);
    const leftRoot = effectiveSyncRoot(panes[0].syncRoot, panes[0].currentPath);
    const rightRoot = effectiveSyncRoot(
        panes[1].syncRoot,
        panes[1].currentPath
    );
    const syncRootsState = getSyncRootsState(leftRoot, rightRoot);

    return {
        leftRoot,
        rightRoot,
        state: syncRootsState,
        rootsReady: isSyncRootsReady(syncRootsState),
    };
}
