import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Sidebar.css';

const navItems = [
    { path: '/dashboard', icon: 'fa-tachometer-alt', label: 'Dashboard' },
    { path: '/inventory', icon: 'fa-boxes', label: 'Inventory' },
    { path: '/suppliers', icon: 'fa-truck', label: 'Suppliers' },
    { path: '/customers', icon: 'fa-users', label: 'Customers' },
    { path: '/purchases', icon: 'fa-shopping-cart', label: 'Purchases' },
    { path: '/sales', icon: 'fa-chart-line', label: 'Sales' },
    { path: '/receipts', icon: 'fa-receipt', label: 'Receipts' },
    { path: '/payments', icon: 'fa-credit-card', label: 'Payments' },
    { path: '/reports', icon: 'fa-chart-pie', label: 'Reports' },
    { path: '/users', icon: 'fa-user-circle', label: 'Users' },
    { path: '/settings', icon: 'fa-cog', label: 'Settings' },
];

const Sidebar = ({ isOpen, onLinkClick }) => {
    const { logout } = useAuth();

    const handleLogoutClick = (e) => {
        e.preventDefault();
        logout();
        onLinkClick();
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <h1 className="app-title">
                <i className="fas fa-warehouse"></i> <span>AIC Inventory</span>
            </h1>
            <nav className="nav">
                {navItems.map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                        onClick={onLinkClick}
                    >
                        <i className={`fas ${item.icon}`}></i> <span>{item.label}</span>
                    </NavLink>
                ))}
                 <a href="#" onClick={handleLogoutClick} className="nav-item logout-link">
                    <i className="fas fa-sign-out-alt"></i> <span>Logout</span>
                </a>
            </nav>
        </div>
    );
};

export default Sidebar;