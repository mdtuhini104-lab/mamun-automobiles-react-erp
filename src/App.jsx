// Manual Vercel Production Trigger: 2026-04-16 18:57 (Anti-Gravity Stable)
import React from 'react';
import { ConfigProvider, theme as antTheme, Result, Button, Spin, Skeleton, App as AntdApp } from 'antd';
import MainLayout from './MainLayout.jsx';
import { GlobalStateProvider } from './contexts/GlobalStateContext.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import LoginPage from './LoginPage.jsx';
import ResetPasswordPage from './ResetPasswordPage.jsx';
import CustomerPortalPage from './CustomerPortalPage.jsx';
import { ThemeProvider, useTheme } from './contexts/ThemeContext.jsx';
import UniversalAIGuard from './components/UniversalAIGuard.jsx';
import GlobalVoiceInput from './components/GlobalVoiceInput.jsx';
import { initOnePagePrintAssistant } from './utils/printAssistant';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('App Rendering Crash:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f2f5' }}>
                    <Result
                        status="error"
                        title="Critical System Error"
                        subTitle={
                            <div style={{ color: '#cf1322', maxWidth: 600 }}>
                                <p>The application encountered an unexpected error.</p>
                                <p style={{ fontSize: 12, border: '1px solid #ffa39e', background: '#fff1f0', padding: 8, borderRadius: 4 }}>
                                    {this.state.error?.message || "Unknown rendering error occurred"}
                                </p>
                            </div>
                        }
                        extra={[
                            <Button type="primary" key="console" onClick={() => window.location.reload()}>
                                Reload Page
                            </Button>,
                            <Button key="clear" onClick={() => { localStorage.clear(); sessionStorage.clear(); window.location.reload(); }}>
                                Clear Cache & Restart
                            </Button>,
                        ]}
                    />
                </div>
            );
        }
        return this.props.children;
    }
}

const AppContent = () => {
    const { isAuthenticated, loading } = useAuth();
    const { theme } = useTheme();
    const [hashRoute, setHashRoute] = React.useState(() => window.location.hash || '');
    
    // FORCE light theme for login page to ensure visibility
    const isLoginPage = !isAuthenticated;
    const isDark = (theme.includes('dark') || theme.includes('purple')) && !isLoginPage;

    React.useEffect(() => {
        const handleGlobalError = (event) => {
            console.error('GLOBAL_RUNTIME_ERROR:', event.error || event.message);
        };

        const handleUnhandledRejection = (event) => {
            console.error('UNHANDLED_PROMISE_REJECTION:', event.reason);
        };

        window.addEventListener('error', handleGlobalError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        const handleHashChange = () => setHashRoute(window.location.hash || '');
        window.addEventListener('hashchange', handleHashChange);

        const cleanupPrint = initOnePagePrintAssistant();

        return () => {
            window.removeEventListener('error', handleGlobalError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
            window.removeEventListener('hashchange', handleHashChange);
            if (cleanupPrint) cleanupPrint();
        };
    }, []);

    const algorithm = isDark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm;

    const darkTokens = {
        colorPrimary: '#3b82f6',
        colorBgBase: '#0f172a',
        colorBgContainer: '#1e293b',
        colorBorder: 'rgba(255, 255, 255, 0.08)',
    };

    const lightTokens = {
        colorPrimary: '#1d4ed8',
        colorBgBase: '#ffffff',
        colorBgContainer: '#f8fafc',
        colorBorder: 'rgba(0, 0, 0, 0.08)',
        colorText: '#1e293b',
        colorTextHeading: '#0f172a',
    };

    return (
        <ConfigProvider
            theme={{
                algorithm,
                token: {
                    ...(isDark ? darkTokens : lightTokens),
                    borderRadius: 8,
                    borderRadiusLG: 16,
                    controlHeight: 40,
                },
            }}
        >
            <AntdApp>
                <UniversalAIGuard />
                <GlobalVoiceInput />
                {loading ? (
                    <div style={{ 
                        height: '100vh', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        background: isDark ? '#0f172a' : '#f8fafc',
                        gap: '20px'
                    }}>
                        <Spin size="large" />
                        <div style={{ color: isDark ? '#fff' : '#000', fontWeight: 600, fontSize: 16, letterSpacing: '1px' }}>
                            Authenticating System...
                        </div>
                    </div>
                ) : !isAuthenticated
                    ? (
                        hashRoute.startsWith('#/history') 
                        ? <CustomerPortalPage key="customer-portal-public" mode="public" /> 
                        : hashRoute.startsWith('#/reset-password')
                        ? <ResetPasswordPage key="reset-password-page" />
                        : <LoginPage key="login-page" />
                      )
                    : <MainLayout key="main-layout" />}
            </AntdApp>
        </ConfigProvider>
    );
};

function App() {
    return (
        <ErrorBoundary>
            <ThemeProvider>
                <AuthProvider>
                    <GlobalStateProvider>
                        <AppContent />
                    </GlobalStateProvider>
                </AuthProvider>
            </ThemeProvider>
        </ErrorBoundary>
    );
}

export default App;