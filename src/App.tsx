
import { useState } from 'react'
import SplitterLayout from 'react-splitter-layout';
import 'react-splitter-layout/lib/index.css';
import React from 'react';
import { Breadcrumb, Layout, Menu, theme } from 'antd';
import 'antd/dist/reset.css';
import './App.scss'

const { Header, Content, Footer } = Layout;

console.log('[App.tsx]', `Hello world from Electron ${process.versions.electron}!`)


const App: React.FC = () => {
  const {
    token: { colorBgContainer },
  } = theme.useToken();
  const [count, setCount] = useState(0)

  return (
    <Layout>
      <Header>
        <Menu
          theme="dark"
          mode="horizontal"
          defaultSelectedKeys={['2']}
          items={new Array(3).fill(null).map((_, index) => ({
            key: String(index + 1),
            label: `nav ${index + 1}`,
          }))}
        />
      </Header>
      <Content>
        <SplitterLayout primaryIndex={0}  percentage>
          <div>Pane 1</div>
          <div>Pane 2</div>
        </SplitterLayout>
      </Content>
    </Layout>
  )
}

export default App;