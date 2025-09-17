import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { getCompanySettings, updateCompanySettings } from '../../api/googleSheetsService';
import Spinner from '../../components/common/Spinner';
import './Settings.css';

const Settings = () => {
    const { profile, logout } = useAuth();
    const { refreshData } = useData();
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'light');
    const [companySettings, setCompanySettings] = useState({
        companyName: '',
        companyAddress: '',
        companyContact: '',
        companyLogoUrl: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        document.body.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

     useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const settings = await getCompanySettings();
                setCompanySettings(settings);
            } catch (err) {
                setError('Failed to load company settings.');
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleThemeToggle = (e) => {
        setTheme(e.target.checked ? 'dark' : 'light');
    };

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setCompanySettings(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveChanges = async () => {
        setLoading(true);
        setError('');
        try {
            await updateCompanySettings(companySettings);
            alert('Settings updated successfully!');
        } catch (err) {
            setError('Failed to save settings. Please try again.');
            alert(`Error: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };
    
    const handleRefreshData = async () => {
        setLoading(true);
        await refreshData();
        setLoading(false);
        alert("All application data has been refreshed.");
    };

    return (
        <>
            {loading && <Spinner />}
            <div className="crud-header">
                <h1>Settings</h1>
                <p>Manage your profile, company, and application settings</p>
            </div>
            {error && <p className="error-message">{error}</p>}
            <div className="settings-container">
                {/* Profile Card */}
                <div className="settings-card profile-card">
                     <h2><i className="fas fa-user-circle"></i> User Profile</h2>
                     {profile?.picture && <img src={profile.picture} alt="User Avatar" className="profile-avatar" />}
                     <h3 className="profile-name">{profile?.name || 'User'}</h3>
                     <p className="profile-email">{profile?.email}</p>
                     <button onClick={logout} className="btn btn-logout"><i className="fas fa-sign-out-alt"></i> Logout</button>
                </div>

                {/* Company Settings Card */}
                <div className="settings-card">
                    <h2><i className="fas fa-building"></i> Company Settings</h2>
                    <div className="form-group">
                        <label htmlFor="companyName">Company Name</label>
                        <input type="text" id="companyName" name="companyName" className="form-control" value={companySettings.companyName} onChange={handleInputChange} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="companyAddress">Company Address</label>
                        <textarea id="companyAddress" name="companyAddress" rows="3" className="form-control" value={companySettings.companyAddress} onChange={handleInputChange}></textarea>
                    </div>
                    <div className="form-group">
                        <label htmlFor="companyContact">Contact Number</label>
                        <input type="text" id="companyContact" name="companyContact" className="form-control" value={companySettings.companyContact} onChange={handleInputChange} />
                    </div>
                     <div className="form-group">
                        <label htmlFor="companyLogoUrl">Logo URL</label>
                        <input type="text" id="companyLogoUrl" name="companyLogoUrl" className="form-control" placeholder="https://example.com/logo.png" value={companySettings.companyLogoUrl} onChange={handleInputChange} />
                    </div>
                    <button onClick={handleSaveChanges} className="btn btn-save"><i className="fas fa-save"></i> Save Changes</button>
                </div>

                {/* Application & Data Settings */}
                <div className="settings-card">
                    <h2><i className="fas fa-cogs"></i> Application Settings</h2>
                     <div className="form-group">
                        <label>Theme</label>
                        <div className="theme-switcher">
                            <span>{theme === 'light' ? 'Light Mode' : 'Dark Mode'}</span>
                            <label className="switch">
                                <input type="checkbox" checked={theme === 'dark'} onChange={handleThemeToggle} />
                                <span className="slider"></span>
                            </label>
                        </div>
                    </div>
                    
                    <h2><i className="fas fa-database"></i> Data Management</h2>
                     <div className="form-group">
                        <label>Refresh Application Data</label>
                        <p style={{fontSize: '0.8rem', color: 'var(--secondary)', marginBottom: '10px'}}>
                            Force a refresh of all data from your Google Sheet. Use this if you've made external changes.
                        </p>
                        <button onClick={handleRefreshData} className="btn btn-refresh"><i className="fas fa-sync-alt"></i> Refresh Data</button>
                    </div>
                </div>

            </div>
        </>
    );
};

export default Settings;