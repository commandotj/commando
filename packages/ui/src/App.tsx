import React, { useEffect } from "react";
import { useAppDispatch } from "./app/hooks";
import SplitterLayout from "./components/SplitterLayout/SplitterLayout";
import "./components/SplitterLayout/index.css";
import "./components/sync/sync.css";
import "./assets/commando.css";
import "./App.css";
import { fetchDirectory } from "./app/fileManagerSlice";
import { ThemeProvider } from "./theme";
import SyncToolbar from "./components/sync/SyncToolbar";
import SyncPane from "./components/sync/SyncPane";
import SyncStatusBar from "./components/sync/SyncStatusBar";
import SyncDiffView from "./components/sync/SyncDiffView";
import { useAppSelector } from "./app/hooks";
import "./i18n";

const App: React.FC = () => {
    const dispatch = useAppDispatch();
    const viewMode = useAppSelector(s => s.fileManager.viewMode);

    useEffect(() => {
        const homeDir = window.fsApi.getHomeDir();
        const saved0 = localStorage.getItem("commando-pane-0-path") || homeDir;
        const saved1 = localStorage.getItem("commando-pane-1-path") || homeDir;
        dispatch(fetchDirectory({ paneIndex: 0, path: saved0 }));
        dispatch(fetchDirectory({ paneIndex: 1, path: saved1 }));
    }, [dispatch]);

    return (
        <ThemeProvider>
            <div className="sync-app">
                <SyncToolbar />
                {viewMode === "diff" ? (
                    <SyncDiffView />
                ) : (
                    <div className="sync-workspace wails-no-drag">
                        <SplitterLayout primaryIndex={0} percentage>
                            <SyncPane paneIndex={0} />
                            <SyncPane paneIndex={1} />
                        </SplitterLayout>
                    </div>
                )}
                <SyncStatusBar />
            </div>
        </ThemeProvider>
    );
};

export default App;
