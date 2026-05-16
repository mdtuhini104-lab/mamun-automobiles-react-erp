import React from 'react';
import { Row, Col, Typography, Input, Button, Avatar, Select, Space, Card, Divider, message, Badge } from 'antd';
import { Camera, Mail, Phone, Briefcase, User, FileText, MapPin, Calendar, Save, ShieldCheck, Edit3, X, AtSign } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { getUploadUrl, getApiBaseUrl } from './utils/appConfig';
import SignatureField from './components/SignatureField';

const { Title, Text } = Typography;
const { TextArea } = Input;

const PremiumProfilePage = () => {
    const { user, updateUserData } = useAuth();
    const fileInputRef = React.useRef(null);
    
    // State for editable fields and upload
    const [profileData, setProfileData] = React.useState({
        fullName: '',
        phone: '',
        altEmail: '',
        department: '',
        bio: '',
        jobTitle: '',
        countryCode: '+880',
        savedSignature: ''
    });
    
    const [previewUrl, setPreviewUrl] = React.useState(null);
    const [selectedFile, setSelectedFile] = React.useState(null);
    const [isSaving, setIsSaving] = React.useState(false);
    const [cloudStatus, setCloudStatus] = React.useState('checking'); // checking, active, offline

    React.useEffect(() => {
        if (user) {
            setProfileData({
                fullName: user.name || '',
                phone: user.phone || '',
                altEmail: user.altEmail || '',
                department: user.department || '',
                bio: user.bio || '',
                jobTitle: user.jobTitle || '',
                countryCode: user.countryCode || '+880',
                savedSignature: user.savedSignature || ''
            });
        }

        // Check Cloudinary status
        const checkCloud = async () => {
            try {
                const res = await fetch(`${getApiBaseUrl()}/backups/status`, {
                    headers: {
                        'x-user-id': user?.id,
                        'x-user-role': user?.role
                    }
                });
                const data = await res.json();
                if (data.success && data.status === 'PROTOCOL_READY') {
                    setCloudStatus('active');
                } else {
                    setCloudStatus('offline');
                }
            } catch (err) {
                setCloudStatus('offline');
            }
        };
        checkCloud();
    }, [user]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setSelectedFile(file);
            const preview = URL.createObjectURL(file);
            setPreviewUrl(preview);
        }
    };

    const triggerUpload = () => {
        fileInputRef.current?.click();
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const formData = new FormData();
            formData.append('name', profileData.fullName);
            Object.keys(profileData).forEach(key => {
                if (key !== 'fullName') {
                    formData.append(key, profileData[key]);
                }
            });
            
            if (selectedFile) {
                formData.append('photo', selectedFile);
            }

            const res = await updateUserData(formData);
            if (res.success) {
                message.success('Premium profile updated successfully.');
                setPreviewUrl(null);
                setSelectedFile(null);
            } else {
                // Check if it's a Cloudinary error (15-digit numeric key error is common)
                const isCloudinaryError = res.message?.includes('api_key') || 
                                        res.message?.includes('Cloudinary') || 
                                        /api_key\s+\d{10,18}/.test(res.message);

                if (isCloudinaryError) {
                    message.error({
                        content: 'Cloud Storage Error: Your API key (51111...) is unauthorized or invalid. Please update the Cloudinary configuration in your server environment.',
                        duration: 6
                    });
                } else {
                    message.error(res.message || 'Failed to update profile.');
                }
            }
        } catch (error) {
            console.error('Profile update crash:', error);
            message.error('A critical error occurred while saving profile data.');
        } finally {
            setIsSaving(false);
        }
    };

    const inputStyle = {
        background: '#1E293B',
        border: '1px solid rgba(255,255,255,0.05)',
        color: '#fff',
        borderRadius: '10px',
        height: '50px',
        fontSize: '14px'
    };

    const labelStyle = {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        color: '#94A3B8',
        fontWeight: 600,
        fontSize: '11px',
        letterSpacing: '0.5px',
        marginBottom: '8px'
    };

    return (
        <div className="premium-profile-container" style={{ background: '#0F172A', minHeight: '100vh', padding: '40px 20px 120px' }}>
            <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                
                <Title level={2} className="font-montserrat" style={{ color: '#fff', fontWeight: 600, marginBottom: 40, letterSpacing: '-0.5px' }}>
                    My premium profile
                </Title>

                {/* Hero Profile Card */}
                <Card 
                    className="glass-panel" 
                    style={{ 
                        borderRadius: '32px', 
                        border: '1px solid rgba(59, 130, 246, 0.2)', 
                        background: 'rgba(30, 41, 59, 0.7)',
                        marginBottom: '40px',
                        overflow: 'hidden'
                    }}
                    styles={{ body: { padding: '40px' } }}
                >
                    <Row gutter={[40, 40]} align="middle">
                        <Col xs={24} md={6} style={{ textAlign: 'center' }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileChange} accept="image/*" />
                                <div style={{ 
                                    padding: '6px', 
                                    borderRadius: '50%', 
                                    background: 'linear-gradient(135deg, #00D2FF 0%, #3B82F6 100%)',
                                    boxShadow: '0 0 30px rgba(59, 130, 246, 0.4)'
                                }}>
                                    <Avatar 
                                        size={160} 
                                        src={previewUrl || getUploadUrl(user?.photo)}
                                        icon={!previewUrl && !user?.photo && <User size={80} color="#fff" />}
                                        style={{ border: '4px solid #1E293B', background: '#1E293B' }}
                                    />
                                </div>
                                
                                {/* Cloud Sync Status Badge */}
                                <div style={{ 
                                    position: 'absolute', 
                                    top: 10, 
                                    left: 10, 
                                    zIndex: 5,
                                    padding: '4px 10px',
                                    background: 'rgba(15, 23, 42, 0.9)',
                                    border: `1px solid ${cloudStatus === 'active' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                                    borderRadius: '12px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <div style={{ 
                                        width: 6, 
                                        height: 6, 
                                        borderRadius: '50%', 
                                        background: cloudStatus === 'active' ? '#10B981' : (cloudStatus === 'checking' ? '#F59E0B' : '#EF4444'), 
                                        boxShadow: `0 0 10px ${cloudStatus === 'active' ? '#10B981' : (cloudStatus === 'checking' ? '#F59E0B' : '#EF4444')}` 
                                    }}></div>
                                    <span style={{ color: '#fff', fontSize: '9px', fontWeight: 800, letterSpacing: '0.5px' }}>
                                        {cloudStatus === 'active' ? 'CLOUD ACTIVE' : (cloudStatus === 'checking' ? 'SYNCING...' : 'CLOUD OFFLINE')}
                                    </span>
                                </div>

                                <Button 
                                    shape="circle"
                                    icon={<Camera size={16} />}
                                    onClick={triggerUpload}
                                    style={{ 
                                        position: 'absolute', 
                                        bottom: 10, 
                                        right: 10, 
                                        background: '#3B82F6', 
                                        border: '4px solid #1E293B',
                                        color: '#fff',
                                        width: '44px',
                                        height: '44px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
                                    }}
                                />
                            </div>
                        </Col>
                        
                        <Col xs={24} md={18}>
                            <Space direction="vertical" size={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
                                    <Title level={1} style={{ color: '#fff', margin: 0, fontWeight: 600, fontSize: '36px' }}>
                                        {user?.name || 'Md Tuhin (Updated)'}
                                    </Title>
                                    <div style={{ 
                                        padding: '4px 12px', 
                                        background: 'rgba(59, 130, 246, 0.1)', 
                                        border: '1px solid rgba(59, 130, 246, 0.3)', 
                                        borderRadius: '20px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <ShieldCheck size={14} color="#3B82F6" />
                                        <span style={{ color: '#3B82F6', fontWeight: 600, fontSize: '10px', letterSpacing: '0.5px' }}>Verified Elite</span>
                                    </div>
                                </div>
                                
                                <Text style={{ color: '#3B82F6', fontWeight: 600, fontSize: '16px', letterSpacing: '1px' }}>
                                    {user?.role || 'Admin'}
                                </Text>
                                
                                <Space size={24} style={{ marginTop: 12 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)' }}>
                                        <MapPin size={16} />
                                        <Text style={{ color: 'inherit', fontWeight: 600, fontSize: '12px' }}>Dhaka, Bangladesh</Text>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)' }}>
                                        <Calendar size={16} />
                                        <Text style={{ color: 'inherit', fontWeight: 600, fontSize: '12px' }}>Member since 2024</Text>
                                    </div>
                                </Space>
                                
                                <div style={{ marginTop: 12 }}>
                                    <Button 
                                        onClick={triggerUpload}
                                        style={{ 
                                            background: '#3B82F6', 
                                            border: 'none', 
                                            color: '#fff', 
                                            fontWeight: 600, 
                                            borderRadius: '8px',
                                            padding: '0 24px',
                                            height: '40px'
                                        }}
                                    >
                                        Edit photo
                                    </Button>
                                </div>
                            </Space>
                        </Col>
                    </Row>
                </Card>

                {/* Form Sections */}
                <Row gutter={[32, 32]}>
                    <Col xs={24} lg={16}>
                        <div className="glass-panel" style={{ borderRadius: '24px', padding: '32px', marginBottom: '32px' }}>
                            <Title level={4} style={{ color: '#fff', fontWeight: 600, marginBottom: 32, letterSpacing: '0.5px' }}>Account details</Title>
                            
                            <Row gutter={[24, 24]}>
                                <Col xs={24} md={12}>
                                    <div style={labelStyle}><User size={14} /> Full Name</div>
                                    <Input 
                                        value={profileData.fullName} 
                                        onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                                        style={inputStyle}
                                        placeholder="Enter your name"
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={labelStyle}><Mail size={14} /> Primary Email (Official)</div>
                                    <Input 
                                        value={user?.email || 'mdtuhini104@gmail.com'} 
                                        disabled
                                        style={{ ...inputStyle, opacity: 0.5 }}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={labelStyle}><Phone size={14} /> Phone Number</div>
                                    <Input 
                                        value={profileData.phone}
                                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                                        style={inputStyle}
                                        prefix={<span style={{ color: '#3B82F6', fontWeight: 600, marginRight: 8 }}>BD +880</span>}
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={labelStyle}><AtSign size={14} /> Alternative Email</div>
                                    <Input 
                                        value={profileData.altEmail}
                                        onChange={(e) => setProfileData({...profileData, altEmail: e.target.value})}
                                        style={inputStyle}
                                        placeholder="backup@email.com"
                                    />
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={labelStyle}><Briefcase size={14} /> Department</div>
                                    <Select 
                                        value={profileData.department}
                                        onChange={(val) => setProfileData({...profileData, department: val})}
                                        className="w-full luxury-select-v3"
                                        bordered={false}
                                        style={inputStyle}
                                    >
                                        <Select.Option value="Operations & IT">Operations & IT</Select.Option>
                                        <Select.Option value="Executive Management">Executive Management</Select.Option>
                                        <Select.Option value="Finance & Accounts">Finance & Accounts</Select.Option>
                                    </Select>
                                </Col>
                                <Col xs={24} md={12}>
                                    <div style={labelStyle}><Edit3 size={14} /> Professional Job Title</div>
                                    <Input 
                                        value={profileData.jobTitle}
                                        disabled
                                        style={{ ...inputStyle, opacity: 0.5 }}
                                    />
                                </Col>
                            </Row>

                            <Divider style={{ borderColor: 'rgba(255,255,255,0.05)', margin: '32px 0' }} />

                            <div style={labelStyle}><FileText size={14} /> Bio / Professional Summary</div>
                            <TextArea 
                                rows={4} 
                                value={profileData.bio}
                                onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                                style={{ ...inputStyle, height: 'auto', padding: '16px' }}
                                placeholder="Tell us about yourself..."
                            />
                        </div>
                    </Col>

                    <Col xs={24} lg={8}>
                        <div className="glass-panel" style={{ borderRadius: '24px', padding: '32px', height: '100%' }}>
                            <Title level={4} style={{ color: '#fff', fontWeight: 600, marginBottom: 12, letterSpacing: '0.5px' }}>Permanent signature</Title>
                            <Text style={{ display: 'block', color: 'rgba(255,255,255,0.4)', fontSize: 12, marginBottom: 32 }}>
                                This signature will be automatically applied to your quotations and invoices.
                            </Text>

                            <SignatureField 
                                value={profileData.savedSignature} 
                                onChange={(val) => setProfileData({...profileData, savedSignature: val})} 
                                height={180}
                            />
                        </div>
                    </Col>
                </Row>
            </div>

            {/* Action Bar */}
            <div style={{ 
                position: 'fixed', 
                bottom: 0, 
                left: 0, 
                right: 0, 
                background: 'rgba(15, 23, 42, 0.9)', 
                backdropFilter: 'blur(20px)',
                padding: '24px 40px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                zIndex: 1000,
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '20px'
            }}>
                <div style={{ width: '1200px', margin: '0 auto', display: 'flex', justifyContent: 'flex-end', gap: '16px' }}>
                    <Button 
                        type="text" 
                        style={{ color: '#EF4444', fontWeight: 600, height: '56px', padding: '0 32px' }}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                        Discard changes
                    </Button>
                    <Button 
                        type="primary"
                        onClick={handleSave}
                        loading={isSaving}
                        style={{ 
                            height: '56px', 
                            padding: '0 48px', 
                            background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
                            border: 'none',
                            borderRadius: '14px',
                            fontWeight: 600,
                            fontSize: '16px',
                            letterSpacing: '0.5px',
                            boxShadow: '0 10px 25px rgba(59, 130, 246, 0.4)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
                        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                        Save changes
                    </Button>
                </div>
            </div>

            <style>{`
                .luxury-select-v3 .ant-select-selector {
                    height: 50px !important;
                    background: transparent !important;
                    display: flex !important;
                    align-items: center !important;
                    color: #fff !important;
                }
                .luxury-select-v3 .ant-select-selection-item {
                    font-weight: 600 !important;
                }
            `}</style>
        </div>
    );
};

export default PremiumProfilePage;





