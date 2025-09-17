// src/components/layout/Topbar.jsx

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './Topbar.css';

const Topbar = ({ onMenuClick }) => {
    const { profile } = useAuth();

    return (
        <div className="top-bar">
            <button className="menu-toggle" onClick={onMenuClick}>
                <i className="fas fa-bars"></i>
            </button>
            
            <div className="top-bar-links">
                <a href="#"><i className="fas fa-bell"></i></a>
                <a href="#"><i className="fas fa-cog"></i></a>
                <div className="user-profile">
                    {profile?.picture ? (
                        <img src={profile.picture} alt="User" className="user-avatar" />
                    ) : (
                        <i className="fas fa-user"></i>
                    )}
                    <span className="user-name">{profile?.name || 'User'}</span>
                </div>
            </div>
        </div>
    );
};

export default Topbar;