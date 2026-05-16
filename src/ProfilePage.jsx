import React from 'react';
import { Card, Typography, Row, Col, Avatar, Button, Divider, Space, Tag } from 'antd';
import { User, Mail, Shield, Phone, MapPin, Calendar, Edit3 } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';

const { Title, Text } = Typography;

const ProfilePage = () => {
    const { user } = useAuth();
    
    return (
        <div style={{ maxWidth: 1000, margin: '0 auto', padding: '40px 20px' }}>
            <div className="glass-card" style={{ padding: '60px 40px', border: '1px solid rgba(59, 130, 246, 0.3)', position: 'relative', overflow: 'hidden' }}>
                {/* Background Accent */}
                <div style={{ position: 'absolute', top: '-100px', right: '-100px', width: '300px', height: '300px', background: 'rgba(59, 130, 246, 0.05)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
                
                <Row gutter={[40, 40]} align="middle">
                    <Col xs={24} md={8} style={{ textAlign: 'center' }}>
                        <div style={{ position: 'relative', display: 'inline-block' }}>
                            <div style={{ width: 180, height: 180, borderRadius: '50%', border: '4px solid #3B82F6', padding: '8px', background: 'rgba(0,0,0,0.3)' }}>
                                <Avatar 
                                    size={156} 
                                    icon={<User size={80} color="#3B82F6" className="branding-visible" />} 
                                    style={{ background: 'transparent' }}
                                />
                            </div>
                            <Button 
                                type="primary" 
                                shape="circle" 
                                icon={<Edit3 size={16} className="branding-visible" />} 
                                style={{ position: 'absolute', bottom: 10, right: 10, background: '#3B82F6', border: 'none', color: '#FFF' }}
                            />
                        </div>
                        <Title level={2} style={{ color: '#FFF', marginTop: 20, fontWeight: 900, textTransform: 'uppercase', letterSpacing: '2px', marginBottom: 5 }}>
                            {user?.username || 'SUPERADMIN'}
                        </Title>
                        <Tag color="#3B82F6" style={{ color: '#FFF', fontWeight: 900, borderRadius: 0, padding: '0 15px', textTransform: 'uppercase' }}>
                            {user?.role || 'SUPER ADMIN'}
                        </Tag>
                    </Col>
                    
                    <Col xs={24} md={16}>
                        <div style={{ background: 'rgba(255,255,255,0.02)', padding: '30px', borderLeft: '3px solid #3B82F6' }}>
                            <Title level={4} style={{ color: '#3B82F6', fontWeight: 900, marginBottom: 25, textTransform: 'uppercase', letterSpacing: '1px' }}>
                                Account Information
                            </Title>
                            
                            <Row gutter={[20, 20]}>
                                <Col span={24}>
                                    <Space size="middle">
                                            <Mail size={18} color="#3B82F6" className="branding-visible" />
                                        <div>
                                            <div style={{ color: '#AAA', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Email Address</div>
                                            <Text style={{ color: '#FFF', fontWeight: 700, fontSize: 16 }}>{user?.email || 'mdtuhini104@gmail.com'}</Text>
                                        </div>
                                    </Space>
                                </Col>
                                
                                <Col xs={24} sm={12}>
                                    <Space size="middle">
                                            <Shield size={18} color="#3B82F6" className="branding-visible" />
                                        <div>
                                            <div style={{ color: '#AAA', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Account Status</div>
                                            <Text style={{ color: '#10b981', fontWeight: 800, fontSize: 16 }}>ACTIVE</Text>
                                        </div>
                                    </Space>
                                </Col>
                                
                                <Col xs={24} sm={12}>
                                    <Space size="middle">
                                            <Calendar size={18} color="#3B82F6" className="branding-visible" />
                                        <div>
                                            <div style={{ color: '#AAA', fontSize: 11, fontWeight: 800, textTransform: 'uppercase' }}>Member Since</div>
                                            <Text style={{ color: '#FFF', fontWeight: 700, fontSize: 16 }}>March 2026</Text>
                                        </div>
                                    </Space>
                                </Col>
                            </Row>
                        </div>
                        
                        <div style={{ marginTop: 30, display: 'flex', gap: 15 }}>
                            <Button className="luxury-btn-blue" style={{ height: 45, padding: '0 30px', background: '#3B82F6', color: '#FFF', border: 'none', fontWeight: 900 }}>
                                VIEW ACTIVITY LOG
                            </Button>
                            <Button style={{ height: 45, background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', fontWeight: 700 }}>
                                PRIVATE KEY ACCESS
                            </Button>
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    );
};

export default ProfilePage;
