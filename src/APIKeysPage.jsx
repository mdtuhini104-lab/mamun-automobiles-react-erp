import React from 'react';
import { Card, Typography, Table, Tag, Button, Space, Alert } from 'antd';
import { Key, ShieldCheck, Lock, RefreshCcw } from 'lucide-react';
import { SettingOutlined } from '@ant-design/icons';
import { useTheme } from './contexts/ThemeContext';

const { Title, Text } = Typography;

const APIKeysPage = () => {
    const { theme } = useTheme();
    const isDark = theme.includes('dark') || theme.includes('purple');

    const apiKeys = [
        { key: '1', service: 'Google Gemini AI', apiKey: '••••••••••••••••3a2f', status: 'Active', lastUsed: '2 mins ago' },
        { key: '2', service: 'Cloudinary Assets', apiKey: '••••••••••••••••77x1', status: 'Active', lastUsed: '1 hour ago' },
        { key: '3', service: 'MongoDB Atlas', apiKey: '••••••••••••••••99q0', status: 'Active', lastUsed: 'Just now' },
        { key: '4', service: 'Twilio SMS Gateway', apiKey: '••••••••••••••••55b2', status: 'Inactive', lastUsed: 'N/A' },
    ];

    const columns = [
        { title: 'SERVICE ENTITY', dataIndex: 'service', key: 'service', render: (t) => <Text strong style={{ color: isDark ? '#FFF' : '#000' }}>{t.toUpperCase()}</Text> },
        { title: 'ACCESS KEY', dataIndex: 'apiKey', key: 'apiKey', render: (k) => <Text code style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)' }}>{k}</Text> },
        { title: 'STATUS', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'Active' ? 'success' : 'error'} style={{ borderRadius: 0, fontWeight: 900 }}>{s.toUpperCase()}</Tag> },
        { title: 'LAST ACTIVITY', dataIndex: 'lastUsed', key: 'lastUsed' },
        {
            title: 'PROTOCOL',
            key: 'action',
            render: () => (
                <Space>
                    <Button size="small" icon={<RefreshCcw size={12} />} style={{ background: '#3B82F6', border: 'none', color: '#FFF', fontWeight: 800, fontSize: 10 }}>ROTATE KEY</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0, color: isDark ? '#FFFFFF' : '#000000', fontWeight: 900, letterSpacing: '1px' }}>SYSTEM API ACCESS</Title>
                <Text style={{ color: isDark ? '#3B82F6' : '#1d4ed8', fontWeight: 800, fontSize: 11, letterSpacing: '1px' }}>GATEWAY MANAGEMENT | CLOUD SECURITY | THIRD-PARTY INTEGRATIONS</Text>
            </div>

            <Alert
                message="Security Protocol"
                description="API keys provide full access to external services. Do not share these credentials. Key rotation is recommended every 90 days."
                type="warning"
                showIcon
                icon={<ShieldCheck size={20} />}
                style={{ marginBottom: 24, borderRadius: 8 }}
            />

            <div className="glass-card" style={{ padding: '30px', border: isDark ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid #e5e7eb', marginBottom: 24 }}>
                <Space style={{ marginBottom: 20 }}>
                    <div style={{ width: 40, height: 40, background: 'rgba(59, 130, 246, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Lock size={20} color="#3B82F6" />
                    </div>
                    <Title level={4} style={{ color: isDark ? '#FFF' : '#000', margin: 0, fontWeight: 900, textTransform: 'uppercase' }}>Production API Credentials</Title>
                </Space>

                <Table 
                    dataSource={apiKeys} 
                    columns={columns} 
                    pagination={false} 
                    className="luxury-table"
                />
            </div>

            {/* Troubleshooting Section */}
            <Card 
                title={<Space><SettingOutlined /> <span style={{ fontWeight: 800 }}>CONFIGURATION TROUBLESHOOTING</span></Space>}
                style={{ 
                    background: isDark ? 'rgba(30, 41, 59, 0.5)' : '#fff', 
                    border: isDark ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid #fee2e2',
                    borderRadius: '16px'
                }}
            >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ padding: '12px', background: isDark ? 'rgba(239, 68, 68, 0.05)' : '#fff7ed', borderRadius: '8px', borderLeft: '4px solid #ef4444' }}>
                        <Text strong style={{ color: '#ef4444', display: 'block', marginBottom: 4 }}>RESOLVING "INVALID API_KEY 51111..." ERROR:</Text>
                        <ul style={{ margin: 0, paddingLeft: 20, color: isDark ? '#94A3B8' : '#475569', fontSize: '13px' }}>
                            <li>The numeric key <b>511116631481156</b> is currently failing authorization from Cloudinary.</li>
                            <li>Check your <b>server/.env</b> file for the <code>CLOUDINARY_API_KEY</code> variable.</li>
                            <li>If running on Vercel, ensure the Environment Variables in the dashboard are updated with valid credentials.</li>
                            <li>Generate new keys at <a href="https://cloudinary.com/console" target="_blank" rel="noreferrer">Cloudinary Console</a> if needed.</li>
                        </ul>
                    </div>
                    
                    <div style={{ padding: '12px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '8px', borderLeft: '4px solid #3B82F6' }}>
                        <Text strong style={{ color: '#3B82F6', display: 'block', marginBottom: 4 }}>REQUIRED ENVIRONMENT VARIABLES:</Text>
                        <Text code style={{ fontSize: '12px' }}>CLOUDINARY_CLOUD_NAME</Text><br/>
                        <Text code style={{ fontSize: '12px' }}>CLOUDINARY_API_KEY</Text><br/>
                        <Text code style={{ fontSize: '12px' }}>CLOUDINARY_API_SECRET</Text>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default APIKeysPage;
