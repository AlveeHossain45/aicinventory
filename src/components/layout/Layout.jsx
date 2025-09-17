import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import './Layout.css';

const Layout = ({ children }) => {
    const [isSidebarOpen, setSidebarOpen] = useState(false);

    const toggleSidebar = () => {
        setSidebarOpen(!isSidebarOpen);
    };

    const closeSidebar = () => {
        if (isSidebarOpen) {
            setSidebarOpen(false);
        }
    };
    
    return (
        <div className="app-layout">
            <div 
                className={`sidebar-overlay ${isSidebarOpen ? 'show' : ''}`} 
                onClick={closeSidebar}
            ></div>

            <Sidebar isOpen={isSidebarOpen} onLinkClick={closeSidebar} />
            <div className="main-content">
                <Topbar onMenuClick={toggleSidebar} />
                <main className="content-area">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;