import React, { useEffect } from "react";
import { useAppDispatch } from "./app/hooks";
import SplitterLayout from "./components/SplitterLayout/SplitterLayout";
import "./components/SplitterLayout/index.css";
import "./App.scss";
import FilePane from "./components/FilePane";
import { fetchDirectory } from "./app/fileManagerSlice";
import { ThemeProvider } from "./components/ThemeSwitcher";
import FunctionBar  from './components/FunctionBar';

const App: React.FC = () => {
    const dispatch = useAppDispatch();
    useEffect(() => {
        // @ts-ignore
        const homeDir = window.fsApi.getHomeDir();
        dispatch(fetchDirectory({ paneIndex: 0, path: homeDir }));
        dispatch(fetchDirectory({ paneIndex: 1, path: homeDir }));

        // Listen for menu actions from Electron's native menu
        if (window.menuApi?.onMenuAction) {
            window.menuApi.onMenuAction((action: string) => {
                switch (action) {
                    case "new-tab":
                        alert("New Tab (from native menu)");
                        break;
                    case "open":
                        alert("Open... (from native menu)");
                        break;
                    case "save":
                        alert("Save (from native menu)");
                        break;
                    case "reload":
                        window.location.reload();
                        break;
                    case "toggle-fullscreen":
                        alert("Toggle Full Screen (from native menu)");
                        break;
                    default:
                        break;
                }
            });
        }
    }, [dispatch]);

    return (
        <ThemeProvider>
            <div className="flex flex-col h-full w-full bg-white dark:bg-gray-900">
                {/* Main Content */}
                <div className="flex-1 flex h-full w-full overflow-hidden">
                    <div className="h-full w-full overflow-hidden">
                        {/* FunctionBar 工具栏放在 SplitterLayout 内部顶部 */}
                        <FunctionBar />
                        <SplitterLayout primaryIndex={0} percentage>
                            <FilePane paneIndex={0} />
                            <FilePane paneIndex={1} />
                        </SplitterLayout>
                    </div>
                </div>
            </div>
        </ThemeProvider>
    );
};

export default App;
