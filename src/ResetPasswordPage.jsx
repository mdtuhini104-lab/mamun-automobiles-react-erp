import React, { useEffect } from 'react';
import { Form, Input, Button, Typography, App, Alert, ConfigProvider, theme as antTheme } from 'antd';
import { Eye, EyeOff, Lock, CheckCircle } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import mamunLogoOfficial from './assets/MamunAutomobielslogo.png';
import lightWorkshopBg from './assets/luxury_workshop_v2.png';

const { Title, Text } = Typography;

const ResetPasswordPage = () => {
    const [loading, setLoading] = React.useState(false);
    const [showPassword, setShowPassword] = React.useState(false);
    const [error, setError] = React.useState(null);
    const [success, setSuccess] = React.useState(false);
    
    const { completePasswordReset } = useAuth();
    const { message: messageApi } = App.useApp();
    const [form] = Form.useForm();

    // Force Body & HTML to Light Theme for Consistent Experience
    useEffect(() => {
        document.documentElement.classList.add('theme-light-minimal');
        document.body.classList.add('light-theme');
    }, []);

    const onFinish = async (values) => {
        setError(null);
        setLoading(true);

        const urlParams = new URLSearchParams(window.location.hash.split('?')[1]);
        const token = urlParams.get('token');

        if (!token) {
            setError('Recovery token is missing. Please use a valid link from your email.');
            setLoading(false);
            return;
        }

        if (values.password !== values.confirmPassword) {
            setError('Passwords do not match.');
            setLoading(false);
            return;
        }

        try {
            const result = await completePasswordReset(token, values.password);
            if (result.success) {
                setSuccess(true);
                messageApi.success('Password updated! Redirecting to dashboard...');
                // The AuthContext automatically updates isAuthenticated, which will trigger App.jsx to show MainLayout
            } else {
                setError(result.message || 'Failed to update password.');
                setLoading(false);
            }
        } catch (err) {
            setError(err.message || 'System error occurred.');
            setLoading(false);
        }
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: antTheme.defaultAlgorithm,
                token: {
                    colorText: '#000000',
                    colorPrimary: '#ff4d4f',
                },
            }}
        >
            <div
                className="modern-login-container"
                style={{
                    backgroundImage: `url(${lightWorkshopBg})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '20px',
                    position: 'relative'
                }}
            >
            <style>
                {`
                    .reset-card-glass {
                        background: rgba(255, 255, 255, 0.98) !important;
                        backdrop-filter: blur(30px) !important;
                        -webkit-backdrop-filter: blur(30px) !important;
                        border: 2px solid #000000 !important;
                        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.3) !important;
                        padding: 60px 45px !important;
                        border-radius: 30px !important;
                        width: 100%;
                        max-width: 450px;
                        text-align: center;
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
                    .signin-btn-red {
                        background: #ff4d4f !important;
                        border: 2px solid #000000 !important;
                        height: 55px !important;
                        border-radius: 12px !important;
                        font-size: 18px !important;
                        font-weight: 800 !important;
                        color: #ffffff !important;
                        margin-top: 10px !important;
                        text-transform: uppercase !important;
                        letter-spacing: 1px !important;
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
                        z-index: 99;
                    }
                `}
            </style>

            <div className="reset-card-glass">
                <div style={{ marginBottom: 40 }}>
                    <img src={mamunLogoOfficial} alt="Logo" style={{ width: '100%', maxWidth: 280, marginBottom: 25 }} />
                    <Title level={2} style={{ margin: 0, fontWeight: 900, color: '#000000', textTransform: 'uppercase' }}>Security Upgrade</Title>
                    <Text style={{ color: '#000000', fontSize: 16, fontWeight: 700, display: 'block' }}>Choose your new secure password</Text>
                </div>

                {error && (
                    <Alert
                        message="Error"
                        description={error}
                        type="error"
                        showIcon
                        style={{ marginBottom: 30, borderRadius: 15, border: '2px solid #ff4d4f' }}
                    />
                )}

                {success && (
                    <Alert
                        message="Success"
                        description="Your security has been updated. Logging you in now..."
                        type="success"
                        showIcon
                        icon={<CheckCircle style={{ color: '#52c41a' }} />}
                        style={{ marginBottom: 30, borderRadius: 15, border: '2px solid #52c41a' }}
                    />
                )}

                {!success && (
                    <Form
                        form={form}
                        name="reset"
                        onFinish={onFinish}
                        layout="vertical"
                        size="large"
                        className="modern-form"
                        requiredMark={false}
                    >
                        <Form.Item
                            label={<Text style={{ color: '#000000', fontWeight: 800 }}>New Password</Text>}
                            name="password"
                            rules={[{ required: true, message: 'Please enter a new password' }, { min: 6, message: 'Minimum 6 characters required' }]}
                        >
                            <div className="password-input-wrapper">
                                <Input 
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="••••••••" 
                                    prefix={<Lock size={18} style={{ marginRight: 10 }} />}
                                />
                                <div className="password-toggle-icon" onClick={() => setShowPassword(!showPassword)}>
                                    {showPassword ? <Eye size={20} /> : <EyeOff size={20} />}
                                </div>
                            </div>
                        </Form.Item>

                        <Form.Item
                            label={<Text style={{ color: '#000000', fontWeight: 800 }}>Confirm Password</Text>}
                            name="confirmPassword"
                            rules={[{ required: true, message: 'Please confirm your new password' }]}
                        >
                            <Input.Password 
                                placeholder="••••••••" 
                                prefix={<Lock size={18} style={{ marginRight: 10 }} />}
                                visibilityToggle={false}
                            />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0 }}>
                            <Button
                                type="primary"
                                htmlType="submit"
                                block
                                className="signin-btn-red"
                                loading={loading}
                            >
                                UPDATE & ENTER DASHBOARD
                            </Button>
                        </Form.Item>
                    </Form>
                )}

                <div style={{ marginTop: 30, fontSize: 13, color: '#333', fontWeight: 600, borderTop: '1px solid #ddd', paddingTop: 20 }}>
                    © 2026 Mamun Automobiles ERP System
                </div>
            </div>
        </div>
        </ConfigProvider>
    );
};

export default ResetPasswordPage;
