import React from 'react';
import { Row, Col, Card, Typography, Button, Tag, Space } from 'antd';
import { CheckCircle, Palette, Sparkles, Moon, Sun } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';

const { Title, Text } = Typography;

const ThemePage = () => {
    const { theme: currentTheme, changeTheme } = useTheme();

    const themes = [
        {
            id: 'theme-premium-dark',
            name: 'Royal Blue (Default)',
            description: 'The signature elite experience with deep obsidian and royal blue accents.',
            colors: ['#0B0F19', '#111827', '#3B82F6'],
            icon: <Moon size={20} />,
            isDark: true
        },
        {
            id: 'theme-light-minimal',
            name: 'Light Minimal',
            description: 'A clean, crisp workspace with intelligent blue highlights.',
            colors: ['#F9FAFB', '#FFFFFF', '#2563EB'],
            icon: <Sun size={20} />,
            isDark: false
        },
        {
            id: 'theme-midnight-purple',
            name: 'Midnight Purple',
            description: 'A vibrant, deep-space aesthetic with neon violet energy.',
            colors: ['#0F0E23', '#1A183C', '#A855F7'],
            icon: <Sparkles size={20} />,
            isDark: true
        }
    ];

    return (
        <div className="transition-all duration-300" style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 20px', background: 'var(--bg-primary)', minHeight: '100vh' }}>
            <div style={{ marginBottom: 40 }}>
                <Title level={1} className="text-themeText" style={{ fontWeight: 950, letterSpacing: '2px', textTransform: 'uppercase', marginBottom: 8 }}>
                    Theme Gallery
                </Title>
                <Text className="text-themeSecondary text-lg font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Customize your Mamun Automobiles ERP experience with our curated luxury palettes.
                </Text>
            </div>

            <Row gutter={[24, 24]}>
                {themes.map((t) => {
                    const isActive = currentTheme === t.id;
                    return (
                        <Col xs={24} md={12} lg={8} key={t.id}>
                            <Card 
                                className={`lift-glow ${isActive ? 'active-theme-card' : ''}`}
                                style={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    borderRadius: '12px',
                                    overflow: 'hidden',
                                    border: isActive ? '2px solid var(--brand-secondary)' : '1px solid var(--border-default)',
                                    background: 'var(--bg-card)'
                                }}
                                styles={{ body: { padding: '24px', flex: 1, display: 'flex', flexDirection: 'column' } }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                                    <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '10px', color: 'var(--brand-secondary)' }}>
                                        {t.icon}
                                    </div>
                                    {isActive && (
                                        <Tag color="var(--brand-secondary)" style={{ color: '#000', fontWeight: 900, borderRadius: '4px', border: 'none' }}>
                                            ACTIVE
                                        </Tag>
                                    )}
                                </div>

                                <Title level={4} className="text-themeText font-extrabold mb-3">
                                    {t.name}
                                </Title>
                                
                                <Text className="text-themeSecondary mb-6 block h-12 overflow-hidden" style={{ color: 'var(--text-secondary)' }}>
                                    {t.description}
                                </Text>

                                {/* Color Swatches */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: 30 }}>
                                    {t.colors.map((color, i) => (
                                        <div 
                                            key={i} 
                                            style={{ 
                                                width: '32px', 
                                                height: '32px', 
                                                borderRadius: '50%', 
                                                background: color, 
                                                border: '2px solid rgba(255,255,255,0.1)',
                                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                                            }} 
                                            title={i === 0 ? 'Background' : i === 1 ? 'Card' : 'Accent'}
                                        />
                                    ))}
                                </div>

                                <div style={{ marginTop: 'auto' }}>
                                    <Button 
                                        type={isActive ? 'default' : 'primary'}
                                        block
                                        disabled={isActive}
                                        onClick={() => changeTheme(t.id)}
                                        style={{ 
                                            height: '45px', 
                                            fontWeight: 900, 
                                            background: isActive ? 'transparent' : 'var(--brand-secondary, #3B82F6)',
                                            borderColor: 'var(--brand-secondary, #3B82F6)',
                                            color: isActive ? 'var(--brand-secondary)' : '#FFF',
                                            borderRadius: '8px',
                                            textTransform: 'uppercase',
                                            letterSpacing: '1px'
                                        }}
                                    >
                                        {isActive ? 'Current Theme' : 'Apply Theme'}
                                    </Button>
                                </div>
                            </Card>
                        </Col>
                    );
                })}
            </Row>

            <style>{`
                .active-theme-card {
                    box-shadow: 0 0 30px rgba(59, 130, 246, 0.15) !important;
                }
            `}</style>
        </div>
    );
};

export default ThemePage;
