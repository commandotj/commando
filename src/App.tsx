import { useEffect } from "react";
import { useAppDispatch } from "./app/hooks";
import SplitterLayout from "react-splitter-layout";
import "react-splitter-layout/lib/index.css";
import React from "react";
import { ConfigProvider, Layout, Menu, theme } from "antd";
import "antd/dist/reset.css";
import "./App.scss";
import FilePane from "./components/FilePane";
import { fetchDirectory } from "./app/fileManagerSlice";
const { Header, Content } = Layout;

const App: React.FC = () => {
    const dispatch = useAppDispatch();
    const themeToken = theme.useToken();

    useEffect(() => {
        // @ts-ignore
        const homeDir = window.fsApi.getHomeDir();
        dispatch(fetchDirectory({ paneIndex: 0, path: homeDir }));
        dispatch(fetchDirectory({ paneIndex: 1, path: homeDir }));
    }, [dispatch]);

    return (
        <ConfigProvider
            theme={{
                components: {
                    Layout: {
                        headerBg: "#00b96b",
                    },
                },
            }}
        >
            <Layout>
                <Header>
                    <Menu
                        mode="horizontal"
                        defaultSelectedKeys={["2"]}
                        items={new Array(3).fill(null).map((_, index) => ({
                            key: String(index + 1),
                            label: `nav ${index + 1}`,
                        }))}
                    />
                </Header>
                <Content>
                    <SplitterLayout primaryIndex={0} percentage>
                        <FilePane paneIndex={0} />
                        <FilePane paneIndex={1} />
                    </SplitterLayout>
                </Content>
            </Layout>
        </ConfigProvider>
    );
};

export default App;
