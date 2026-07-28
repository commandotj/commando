import { useAppSelector } from "../app/hooks";
import {
    getSyncRootsState,
    isSyncRootsReady,
    type SyncRootsState,
} from "../common/syncRoots";

export function useSyncRootsState(): {
    leftRoot: string;
    rightRoot: string;
    state: SyncRootsState;
    rootsReady: boolean;
} {
    const panes = useAppSelector(state => state.fileManager.panes);
    const leftRoot = panes[0].syncRoot;
    const rightRoot = panes[1].syncRoot;
    const syncRootsState = getSyncRootsState(leftRoot, rightRoot);

    return {
        leftRoot,
        rightRoot,
        state: syncRootsState,
        rootsReady: isSyncRootsReady(syncRootsState),
    };
}
