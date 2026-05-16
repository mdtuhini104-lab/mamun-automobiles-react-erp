import React from 'react';
import { Card, Typography, Button, Upload, message, Modal, Input, Space, Form, Select, Table, Divider, Row, Col, Tag, Switch, Spin, Result } from 'antd';
import { useAuth } from './contexts/AuthContext';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useTheme } from './contexts/ThemeContext';
import axios from 'axios';
import { Key, AlertTriangle, UploadCloud, Shield, Settings, Database, Bell, Globe, HardDrive, Lock, ShieldAlert } from 'lucide-react';
import moment from 'moment';
import { getApiBaseUrl } from './utils/appConfig';
import { t } from './utils/translations';
import BackupModule from './components/BackupModule';

const { Title, Text } = Typography;
const { Option } = Select;

const apiBaseUrl = getApiBaseUrl();
const api = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
});

const SettingsPage = () => {
    const { changePassword, user: currentUser } = useAuth();
    const { featureToggles, toggleFeature, language, setLanguage } = useGlobalState();
    const { theme } = useTheme();
    const isDark = theme.includes('dark') || theme.includes('purple');
    const [newPassword, setNewPassword] = React.useState('');
    
    const roleLower = currentUser?.role?.toLowerCase() || '';
    const isAdmin = roleLower === 'admin' || roleLower === 'superadmin' || roleLower === 'super admin';

    const cardStyle = {
        background: 'rgba(30, 41, 59, 0.7)',
        backdropFilter: 'blur(20px)',
        borderRadius: '24px',
        border: '1px solid rgba(59, 130, 246, 0.2)',
        boxShadow: 'inset 0 2px 10px rgba(0,0,0,0.2), 0 15px 35px rgba(0,0,0,0.3)',
        height: '100%',
        padding: '32px',
        transition: 'all 0.3s ease'
    };

    const inputStyle = {
        background: 'rgba(15, 23, 42, 0.5)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        borderRadius: '12px',
        height: '50px'
    };

    return (
        <div style={{ padding: '40px', background: '#0F172A', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1400px', margin: '0 auto' }}>
                
                <div style={{ marginBottom: 48 }}>
                    <Title level={1} className="font-montserrat" style={{ margin: 0, color: '#FFFFFF', fontWeight: 600, letterSpacing: '-0.5px', fontSize: '36px' }}>
                        System settings
                    </Title>
                    <Text style={{ color: '#3B82F6', fontWeight: 600, fontSize: '11px', letterSpacing: '1px' }}>
                        Core engine | Preferences | Security protocols
                    </Text>
                </div>

                <Row gutter={[24, 24]} style={{ marginBottom: 48 }}>
                    {/* Security Section */}
                    <Col xs={24} md={8}>
                        <div style={cardStyle} className="settings-card-glow">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 24 }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <Key size={20} color="#3B82F6" />
                                </div>
                                <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '16px' }}>Security access</Title>
                            </div>
                            
                            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0 0 24px 0' }} />
                            
                            <div style={{ marginBottom: 24 }}>
                                <Text style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '8px', letterSpacing: '1px' }}>Admin password</Text>
                                <Space direction="vertical" style={{ width: '100%' }} size={16}>
                                    <Input.Password 
                                        placeholder="Enter Secure Password" 
                                        prefix={<Lock size={16} color="rgba(255,255,255,0.3)" style={{ marginRight: 8 }} />}
                                        style={inputStyle}
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="luxury-password-input"
                                    />
                                    <Button 
                                        block
                                        style={{ 
                                            height: '50px', 
                                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)', 
                                            border: 'none', 
                                            color: '#fff', 
                                            fontWeight: 600, 
                                            borderRadius: '12px',
                                            boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)'
                                        }}
                                        onClick={() => {
                                            if (newPassword.length < 6) return message.error("Security breach: Password too short.");
                                            changePassword(newPassword);
                                            message.success("Encryption updated.");
                                            setNewPassword('');
                                        }}
                                    >
                                        Update protocol
                                    </Button>
                                </Space>
                            </div>
                        </div>
                    </Col>

                    {/* Preferences Section */}
                    <Col xs={24} md={8}>
                        <div style={cardStyle} className="settings-card-glow">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 24 }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <Shield size={20} color="#3B82F6" />
                                </div>
                                <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '16px' }}>UI preferences</Title>
                            </div>
                            
                            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0 0 24px 0' }} />
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <div>
                                    <Text style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Two-Factor Auth</Text>
                                    <Text style={{ color: '#3B82F6', fontSize: '10px', fontWeight: 600, display: 'block' }}>Enforced by policy</Text>
                                </div>
                                <Switch checked disabled className="luxury-switch-blue" />
                            </div>
                            
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                                <div>
                                    <Text style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>Real-time Notifications</Text>
                                    <Text style={{ color: '#94A3B8', fontSize: '10px', display: 'block' }}>Instant audit trail alerts</Text>
                                </div>
                                <Switch defaultChecked className="luxury-switch-blue" />
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div>
                                    <Text style={{ color: '#fff', fontWeight: 700, fontSize: '14px' }}>AI Field Suggestion</Text>
                                    <Text style={{ color: '#94A3B8', fontSize: '10px', display: 'block' }}>Intelligent data auto-fill</Text>
                                </div>
                                <Switch defaultChecked className="luxury-switch-blue" />
                            </div>
                        </div>
                    </Col>

                    {/* Language Section */}
                    <Col xs={24} md={8}>
                        <div style={cardStyle} className="settings-card-glow">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: 24 }}>
                                <div style={{ background: 'rgba(59, 130, 246, 0.1)', padding: '10px', borderRadius: '12px' }}>
                                    <Globe size={20} color="#3B82F6" />
                                </div>
                                <Title level={4} style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '16px' }}>Localization</Title>
                            </div>
                            
                            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '0 0 24px 0' }} />
                            
                            <Text style={{ color: '#94A3B8', fontSize: '11px', fontWeight: 600, display: 'block', marginBottom: '12px', letterSpacing: '1px' }}>Interface language</Text>
                            <Select 
                                value={language} 
                                onChange={(val) => setLanguage(val)} 
                                style={{ width: '100%', height: '50px' }}
                                className="luxury-select-v4"
                                bordered={false}
                            >
                                <Select.Option value="en">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                                        <Globe size={16} /> English (US)
                                    </div>
                                </Select.Option>
                                <Select.Option value="bn">
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: '#fff' }}>
                                        <Globe size={16} /> Bengali (BD)
                                    </div>
                                </Select.Option>
                            </Select>

                            <div style={{ marginTop: 32, padding: '16px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '16px', border: '1px solid rgba(59, 130, 246, 0.1)' }}>
                                <Text style={{ color: '#3B82F6', fontSize: '11px', fontWeight: 700, display: 'block', textAlign: 'center' }}>
                                    Current Region: Bangladesh (UTC+6)
                                </Text>
                            </div>
                        </div>
                    </Col>
                </Row>

                {isAdmin && (
                    <div style={{ marginTop: 60 }}>
                        <BackupModule isDark={true} />
                    </div>
                )}
            </div>

            <style>{`
                .settings-card-glow:hover {
                    border-color: rgba(59, 130, 246, 0.5) !important;
                    box-shadow: inset 0 2px 10px rgba(0,0,0,0.2), 0 0 30px rgba(59, 130, 246, 0.15) !important;
                    transform: translateY(-5px);
                }
                .luxury-password-input input {
                    color: #fff !important;
                }
                .luxury-switch-blue.ant-switch-checked {
                    background-color: #3B82F6 !important;
                }
                .luxury-select-v4 .ant-select-selector {
                    background: rgba(15, 23, 42, 0.5) !important;
                    border: 1px solid rgba(255,255,255,0.1) !important;
                    border-radius: 12px !important;
                    height: 50px !important;
                    display: flex !important;
                    align-items: center !important;
                }
            `}</style>
        </div>
    );
};

export default SettingsPage;
