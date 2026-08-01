/** Pane folder used for compare/sync when explicit sync root not set. */
export function effectiveSyncRoot(syncRoot: string, currentPath: string): string {
    const root = syncRoot.trim();
    if (root) {
        return root;
    }
    return currentPath.trim();
}
