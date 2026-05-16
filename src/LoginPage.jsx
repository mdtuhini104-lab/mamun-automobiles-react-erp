import React, { useEffect } from 'react';
import { Form, Input, Button, Typography, Modal, App, Alert, ConfigProvider, theme as antTheme } from 'antd';
import { Eye, EyeOff } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import mamunLogoOfficial from './assets/MamunAutomobielslogo.png';
import bgDesktop from './assets/workshop_16_9_hd_1778854798213.png';
import bgMobile from './assets/workshop_9_16_hd_1778854830213.png';
import bgTablet from './assets/workshop_1_1_hd_1778854858067.png';

const { Title, Text } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = React.useState(false);
    const [isResetModalVisible, setIsResetModalVisible] = React.useState(false);
    const [resetLoading, setResetLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [showModalPassword, setShowModalPassword] = React.useState(false);
    const [loginError, setLoginError] = React.useState(null);
    console.log("LoginPage Rendered - Build Version: 1.1.0");
    const [resetStep, setResetStep] = React.useState('email'); // 'email', 'otp', or 'password'
    const [recoveryEmail, setRecoveryEmail] = React.useState('');
    const [resetToken, setResetToken] = React.useState('');
    const { login, resetPassword, verifyOTP, completePasswordReset } = useAuth();
    const { message: messageApi } = App.useApp();
    const [resetForm] = Form.useForm();

    // Force Body & HTML to Light Theme for Login Page
    useEffect(() => {
        const root = document.documentElement;
        const body = document.body;
        
        // Save current classes to restore if necessary, though App.jsx usually handles this
        const originalHtmlClasses = root.className;
        const originalBodyClasses = body.className;

        // Apply light classes
        root.classList.add('theme-light-minimal');
        body.classList.add('light-theme');

        console.log("Login Page: Forced Light Theme on HTML/Body");

        return () => {
            // Restore theme on unmount
            root.classList.remove('theme-light-minimal');
            body.classList.remove('light-theme');
            
            // Explicitly re-apply the stored theme so MainLayout renders correctly
            const savedTheme = localStorage.getItem('app-theme-v3') || 'theme-premium-dark';
            root.classList.add(savedTheme);
            
            console.log("Login Page: Restored global theme on unmount:", savedTheme);
        };
    }, []);

    const onFinish = async (values) => {
        setLoginError(null);
        setLoading(true);
        try {
            const success = await login(values.identifier, values.password);
            if (success) {
                // Force hash clear to trigger dashboard routing
                window.location.hash = '';
                // Brief delay to allow context sync
                setTimeout(() => {
                    messageApi.success('Welcome back to Mamun Automobiles!');
                }, 500);
            } else {
                setLoginError('Invalid credentials. Please check your password.');
                setLoading(false);
            }
        } catch (error) {
            const backendData = error?.response?.data;
            const errorMsg = backendData?.message || error.message;
            setLoginError(errorMsg);
            setLoading(false);
        }
    };

    const handleResetPassword = async (values) => {
        setResetLoading(true);
        try {
            if (resetStep === 'email') {
                const result = await resetPassword(values.email);
                if (result.success) {
                    setRecoveryEmail(values.email);
                    setResetStep('otp');
                    messageApi.success('Success! A 6-digit security code has been sent to your admin email.');
                } else {
                    messageApi.error(result.message);
                }
            } else if (resetStep === 'otp') {
                const result = await verifyOTP(recoveryEmail, values.otp);
                if (result.success) {
                    setResetToken(result.token);
                    setResetStep('password');
                    messageApi.success('Code verified! Please set your new password.');
                } else {
                    messageApi.error(result.message);
                }
            } else if (resetStep === 'password') {
                if (values.new_password !== values.confirm_password) {
                    messageApi.error('Passwords do not match!');
                    setResetLoading(false);
                    return;
                }
                const result = await completePasswordReset(resetToken, values.new_password);
                if (result.success) {
                    messageApi.success('Password changed successfully! You can now login with your new password.');
                    setIsResetModalVisible(false);
                } else {
                    messageApi.error(result.message);
                }
            }
        } catch (err) {
            console.error("Reset Error:", err);
            const errMsg = err.response?.data?.message || 'System error occurred.';
            messageApi.error(errMsg);
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: antTheme.defaultAlgorithm,
                token: {
                    colorText: '#000000',
                    colorTextHeading: '#000000',
                    colorPrimary: '#ff4d4f',
                },
            }}
        >
            <div className="modern-login-container login-brand-float">
            <style>
                {`
                    .modern-login-container {
                        background-image: url(${bgDesktop});
                        background-size: cover;
                        background-position: center;
                        background-repeat: no-repeat;
                        background-attachment: fixed;
                        min-height: 100vh;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        padding: 20px;
                        position: relative;
                        overflow: hidden;
                        image-rendering: -webkit-optimize-contrast;
                        transition: background-image 0.5s ease-in-out;
                    }

                    /* Tablet/Square Screen Optimization (1:1) */
                    @media screen and (max-aspect-ratio: 13/10) and (min-aspect-ratio: 8/10) {
                        .modern-login-container {
                            background-image: url(${bgTablet});
                        }
                    }

                    /* Mobile/Portrait Screen Optimization (9:16) */
                    @media screen and (max-aspect-ratio: 8/10) {
                        .modern-login-container {
                            background-image: url(${bgMobile});
                        }
                    }

                    .modern-login-container::before {
                        content: "";
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.55);
                        z-index: 1;
                    }
                    .login-card-glass {
                        background: rgba(255, 255, 255, 0.98) !important;
                        backdrop-filter: blur(30px) !important;
                        -webkit-backdrop-filter: blur(30px) !important;
                        border: 2px solid #000000 !important;
                        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5) !important;
                        padding: 60px 45px !important;
                        border-radius: 30px !important;
                        width: 100%;
                        max-width: 450px;
                        text-align: center;
                        position: relative;
                        z-index: 2;
                    }
                    .modern-form .ant-input-affix-wrapper, .modern-form .ant-input {
                        background: #ffffff !important;
                        border: 2px solid #000000 !important;
                        border-radius: 12px !important;
                        height: 55px !important;
                        color: #000000 !important;
                        font-weight: 700 !important;
                        padding-left: 15px !important;
                    }
                    .modern-form .ant-input-affix-wrapper .ant-input {
                        border: none !important;
                        height: 100% !important;
                        padding: 0 !important;
                    }
                    .signin-btn-red {
                        background: #ff4d4f !important;
                        border: 2px solid #000000 !important;
                        height: 55px !important;
                        border-radius: 12px !important;
                        font-size: 18px !important;
                        font-weight: 600 !important;
                        color: #ffffff !important;
                        margin-top: 10px !important;
                        box-shadow: none !important;
                        transition: all 0.3s ease !important;
                        letter-spacing: 0.5px !important;
                    }
                    .signin-btn-red:hover {
                        background: #d9363e !important;
                        transform: translateY(-2px);
                    }
                    .password-input-wrapper {
                        position: relative;
                        width: 100%;
                    }
                    .password-toggle-icon {
                        position: absolute;
                        right: 15px;
                        top: 50%;
                        transform: translateY(-50%);
                        cursor: pointer;
                        color: #ff4d4f !important;
                        transition: all 0.2s ease;
                        display: flex;
                        align-items: center;
                        z-index: 99;
                        padding: 5px;
                        background: transparent;
                    }
                    .password-toggle-icon:hover {
                        color: #d9363e !important;
                        transform: translateY(-50%) scale(1.2);
                    }
                `}
            </style>

            <div className="login-card-glass">
                <div style={{ marginBottom: 40 }}>
                    <img src={mamunLogoOfficial} alt="Logo" style={{ width: '100%', maxWidth: 300, marginBottom: 25 }} />
                    <Title level={1} style={{ margin: 0, fontSize: 42, fontWeight: 600, color: '#000000', letterSpacing: '0.5px' }}>Login</Title>
                    <Text style={{ color: '#000000', fontSize: 16, fontWeight: 500, display: 'block', marginTop: 5 }}>Enter your credentials to continue</Text>
                </div>

                {loginError && (
                    <Alert
                        message={<span style={{ fontWeight: 600, color: '#ff4d4f' }}>Access Denied</span>}
                        description={<span style={{ fontWeight: 500, color: '#000000' }}>{loginError}</span>}
                        type="error"
                        showIcon
                        style={{ marginBottom: 30, borderRadius: 15, border: '2px solid #ff4d4f', background: '#fff1f0' }}
                    />
                )}

                <Form
                    name="login"
                    onFinish={onFinish}
                    layout="vertical"
                    size="large"
                    className="modern-form"
                    requiredMark={false}
                >
                    <Form.Item
                        label={<Text style={{ color: '#000000', fontWeight: 500, fontSize: 16 }}>Email / Login ID</Text>}
                        name="identifier"
                        rules={[{ required: true, message: 'ID is required' }]}
                    >
                        <Input placeholder="admin@example.com" style={{ border: '2px solid #000000' }} />
                    </Form.Item>

                    <Form.Item
                        name="password"
                        rules={[{ required: true, message: 'Password is required' }]}
                    >
                        <div className="password-input-wrapper">
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center', marginBottom: 8 }}>
                                <Text style={{ color: '#000000', fontWeight: 500, fontSize: 16 }}>Password</Text>
                                <Button 
                                    type="link" 
                                    onClick={() => { setIsResetModalVisible(true); setResetStep('email'); }}
                                    style={{ padding: 0, height: 'auto', fontSize: 14, color: '#ff4d4f', fontWeight: 600, textDecoration: 'underline' }}
                                >
                                    Forgot Password?
                                </Button>
                            </div>
                            <Input 
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••" 
                                style={{ paddingRight: '45px' }}
                            />
                            <div className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                                {showPassword ? <Eye size={20} stroke="#ff4d4f" /> : <EyeOff size={20} stroke="#ff4d4f" />}
                            </div>
                        </div>
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0 }}>
                        <Button
                            type="primary"
                            htmlType="submit"
                            block
                            className="signin-btn-red modern-login-btn"
                            loading={loading}
                            style={{ 
                                background: '#ff4d4f !important', 
                                backgroundColor: '#ff4d4f !important',
                                borderColor: '#000000',
                                height: '55px',
                                borderRadius: '12px',
                                fontSize: '18px',
                                fontWeight: '600',
                                color: '#ffffff',
                                boxShadow: 'none'
                            }}
                        >
                            Authorize & Login
                        </Button>
                    </Form.Item>
                </Form>

                <div style={{ marginTop: 40 }}>
                    <Text style={{ color: '#000000', fontWeight: 700, fontSize: 15 }}>
                        Locked out? <Button type="link" style={{ padding: 0, color: '#ff4d4f', fontWeight: 600, fontSize: 15, textDecoration: 'underline' }}>Contact Support</Button>
                    </Text>
                    <div style={{ marginTop: 30, fontSize: 13, color: '#333', fontWeight: 600, borderTop: '1px solid #ddd', paddingTop: 20 }}>
                        © 2026 Mamun Automobiles ERP System
                    </div>
                </div>
            </div>

            <Modal
                title={
                    <div style={{ textAlign: 'center', width: '100%', padding: '10px 0' }}>
                        <Text style={{ fontSize: 20, fontWeight: 600, letterSpacing: 1, color: '#000' }}>
                            {resetStep === 'email' ? "Account Recovery" : resetStep === 'otp' ? "Verification" : "New Password"}
                        </Text>
                    </div>
                }
                open={isResetModalVisible}
                onCancel={() => setIsResetModalVisible(false)}
                footer={null}
                centered
                styles={{
                    mask: { backdropFilter: 'blur(10px)', background: 'rgba(0,0,0,0.8)' },
                    content: { borderRadius: 20, border: '4px solid #000', padding: 30 }
                }}
            >
                <div style={{ textAlign: 'center', marginBottom: 25 }}>
                    <Text style={{ fontWeight: 700, color: '#555', fontSize: 14 }}>
                        {resetStep === 'email' 
                           ? "Enter your admin email. We will send a 6-digit verification code to secure your access."
                           : resetStep === 'otp'
                           ? `Authorized: A security code was sent to ${recoveryEmail}.`
                           : "Security layer verified. Please provide a strong new password for your ERP account."
                        }
                    </Text>
                </div>
                <Form onFinish={handleResetPassword} layout="vertical" className="modern-form" requiredMark={false}>
                    {resetStep === 'email' && (
                        <Form.Item
                            label={<Text style={{ fontWeight: 500, fontSize: 13, color: '#000' }}>Admin identifier (Email)</Text>}
                            name="email"
                            rules={[{ required: true, type: 'email', message: 'Enter a valid admin email' }]}
                        >
                            <Input placeholder="admin@mamun.com" />
                        </Form.Item>
                    )}
                    
                    {resetStep === 'otp' && (
                        <Form.Item
                            label={<Text style={{ fontWeight: 500, fontSize: 13, color: '#000', display: 'block', textAlign: 'center' }}>6-Digit security code</Text>}
                            name="otp"
                            rules={[{ required: true, message: 'Enter the 6-digit code' }]}
                        >
                            <Input 
                                placeholder="000000" 
                                maxLength={6} 
                                style={{ textAlign: 'center', fontSize: 32, letterSpacing: 12, height: 80, border: '3px solid #000' }} 
                                autoFocus 
                            />
                        </Form.Item>
                    )}

                    {resetStep === 'password' && (
                        <>
                            <Form.Item
                                label={<Text style={{ fontWeight: 500, fontSize: 13, color: '#000' }}>New password</Text>}
                                name="new_password"
                                rules={[{ required: true, min: 6, message: 'Password must be at least 6 characters' }]}
                            >
                                <div className="password-input-wrapper">
                                    <Input 
                                        type={showModalPassword ? 'text' : 'password'}
                                        placeholder="••••••••" 
                                        style={{ paddingRight: '45px' }}
                                    />
                                    <div className="password-toggle-icon" onClick={() => setShowModalPassword(!showModalPassword)}>
                                        {showModalPassword ? <Eye size={20} stroke="#3B82F6" /> : <EyeOff size={20} stroke="#3B82F6" />}
                                    </div>
                                </div>
                            </Form.Item>
                            <Form.Item
                                label={<Text style={{ fontWeight: 500, fontSize: 13, color: '#000' }}>Confirm new password</Text>}
                                name="confirm_password"
                                dependencies={['new_password']}
                                rules={[
                                    { required: true, message: 'Please confirm your password' },
                                    ({ getFieldValue }) => ({
                                        validator(_, value) {
                                            if (!value || getFieldValue('new_password') === value) {
                                                return Promise.resolve();
                                            }
                                            return Promise.reject(new Error('Passwords do not match!'));
                                        },
                                    }),
                                ]}
                            >
                                <div className="password-input-wrapper">
                                    <Input 
                                        type={showModalPassword ? 'text' : 'password'}
                                        placeholder="••••••••" 
                                        style={{ paddingRight: '45px' }}
                                    />
                                    <div className="password-toggle-icon" onClick={() => setShowModalPassword(!showModalPassword)}>
                                        {showModalPassword ? <Eye size={20} stroke="#3B82F6" /> : <EyeOff size={20} stroke="#3B82F6" />}
                                    </div>
                                </div>
                            </Form.Item>
                        </>
                    )}

                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        block 
                        loading={resetLoading}
                        className="signin-btn-blue"
                        style={{ background: '#000', color: '#fff', border: 'none', height: 50, fontWeight: 600, borderRadius: 10 }}
                    >
                        {resetStep === 'email' ? "Generate Security Code" : resetStep === 'otp' ? "Verify Access" : "Authorize New Password"}
                    </Button>

                    {resetStep === 'otp' && (
                        <div style={{ marginTop: 20, textAlign: 'center' }}>
                            <Button type="link" onClick={() => setResetStep('email')} style={{ color: '#000', fontWeight: 600, textDecoration: 'underline' }}>
                                Didn't receive code? Try again
                            </Button>
                        </div>
                    )}
                </Form>
            </Modal>
        </div>
        </ConfigProvider>
    );
};

export default LoginPage;




