import React from 'react';
import ReactDOM from 'react-dom/client';
// Use HashRouter for GitHub Pages compatibility
import { HashRouter } from 'react-router-dom'; 
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './assets/styles/App.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      {/* The future prop is added here to opt-in to future features and remove warnings */}
      <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </HashRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);