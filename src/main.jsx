// frontend-build-lockdown-v2: 2026-04-16
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

try {
    ReactDOM.createRoot(document.getElementById('root')).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} catch (error) {
    console.error('CRITICAL: App Initialization Failed:', error);
    document.getElementById('root').innerHTML = `
        <div style="padding: 20px; text-align: center; font-family: sans-serif;">
            <h1 style="color: #ef4444;">System Error</h1>
            <p>The application failed to start correctly.</p>
            <button onclick="window.location.reload()" style="padding: 10px 20px; cursor: pointer;">Reload Application</button>
            <pre style="text-align: left; background: #f8fafc; padding: 10px; margin-top: 20px; font-size: 12px; overflow: auto; border: 1px solid #e2e8f0;">${error.stack}</pre>
        </div>
    `;
}

