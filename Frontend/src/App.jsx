import React from 'react';
import { Layout, Menu } from 'antd';
import { HomeOutlined, HistoryOutlined } from '@ant-design/icons';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import Home from './pages/Home';
import Jobs from './pages/Jobs';

const { Header, Content, Footer } = Layout;

export default function App() {
    return (
        <BrowserRouter>
            <Layout style={{ minHeight: '100vh' }}>
                <Header>
                    <Menu theme="dark" mode="horizontal" selectable={false}>
                        <Menu.Item key="home" icon={<HomeOutlined />}><Link to="/">Home</Link></Menu.Item>
                        <Menu.Item key="jobs" icon={<HistoryOutlined />}><Link to="/jobs">Jobs</Link></Menu.Item>
                    </Menu>
                </Header>
                <Content style={{ padding: '24px' }}>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/jobs" element={<Jobs />} />
                    </Routes>
                </Content>
                <Footer style={{ textAlign: 'center' }}>
                    WhatsApp Bulk Sender ©2025 | Powered by Node.js + React + Ant Design
                </Footer>
            </Layout>
        </BrowserRouter>
    );
}
