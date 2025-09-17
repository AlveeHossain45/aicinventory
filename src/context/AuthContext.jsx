import React, { createContext, useState, useContext, useEffect } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [token, setToken] = useState(sessionStorage.getItem('google-token'));
    const [profile, setProfile] = useState(null);

    const login = useGoogleLogin({
        onSuccess: (tokenResponse) => {
            sessionStorage.setItem('google-token', tokenResponse.access_token);
            setToken(tokenResponse.access_token);
            fetchProfile(tokenResponse.access_token);
        },
        onError: (error) => console.error('Login Failed:', error),
        scope: 'https://www.googleapis.com/auth/spreadsheets', 
    });

    const logout = () => {
        setToken(null);
        setProfile(null);
        sessionStorage.removeItem('google-token');
    };
    
    const fetchProfile = async (accessToken) => {
        try {
            const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(data);
            }
        } catch (error) {
            console.error("Failed to fetch user profile:", error);
        }
    };
    
    useEffect(() => {
        if(token) {
            fetchProfile(token);
        }
    }, [token]);

    const value = { token, profile, login, logout };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
