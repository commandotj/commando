# FilePane Component: Stale Redux State Issue and Solution

## Problem
When clicking a folder in the file manager, the `pane.currentPath` value in the click handler was unexpectedly empty, even though Redux DevTools showed the state was correct and updated.

## Root Cause
- The table component (`ResizableTable`/Ant Design Table) memoizes cell renderers.
- This caused the event handler in the column definition to "close over" a stale version of `pane.currentPath` from a previous render.
- Even with columns defined inline, the table's internal memoization meant the handler did not always see the latest Redux state.

## Symptoms
- On initial render, `pane.currentPath` was correct.
- In the click handler, `pane.currentPath` was empty or outdated.
- Redux DevTools confirmed the state was correct, but the UI did not reflect it in the event handler.

## Solution
- Add a `key={pane.currentPath}` prop to the `ResizableTable` component.
- This forces React to remount the table and all its children whenever the path changes, ensuring all closures (including event handlers) use the latest state.

## Result
- The click handler now always sees the correct, up-to-date `pane.currentPath`.
- Navigation and event handling work as expected.

## Key Takeaway
When using table/grid components that memoize cell renderers, always use a unique `key` prop (based on relevant state) to force remounts and avoid stale closures in event handlers. 