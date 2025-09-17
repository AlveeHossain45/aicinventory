import React from 'react';
import { useAuth } from '../../context/AuthContext';
import './LoginPage.css';

const LoginPage = () => {
    const { login } = useAuth();

    return (
        <div className="login-container">
            <div className="login-box">
                <i className="fas fa-warehouse login-icon"></i>
                <h1>AIC Inventory App</h1>
                <p>Please sign in with your Google Account to continue</p>
                <button onClick={() => login()} className="login-button">
                    <i className="fab fa-google"></i>
                    Sign in with Google
                </button>
            </div>
        </div>
    );
};

export default LoginPage;
