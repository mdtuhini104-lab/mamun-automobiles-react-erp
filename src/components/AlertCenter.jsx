import React, { useState, useEffect } from 'react';
import { Card, List, Badge, Typography, Space, Button, Tooltip, Skeleton } from 'antd';
import { AlertCircle, RotateCw } from 'lucide-react';
import databaseBridge from '../services/databaseBridge';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { t } from '../utils/translations';

const { Text } = Typography;

const AlertCenter = () => {
    const [lowStockItems, setLowStockItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const { language } = useGlobalState();

    const fetchAlerts = async (isManual = false) => {
        if (isManual) setRefreshing(true);
        else setLoading(true);
        try {
            const data = await databaseBridge.fetchLowStock();
            setLowStockItems(data || []);
        } catch (error) {
            console.error('[AlertCenter] Error fetching low stock:', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        fetchAlerts();
        const interval = setInterval(() => fetchAlerts(false), 30000); // Silent poll
        return () => clearInterval(interval);
    }, []);

    if (!loading && lowStockItems.length === 0) return null;

    return (
        <div className="no-print" style={{ marginBottom: '24px' }}>
            <Card 
                className="glass-card" 
                title={
                    <Space>
                        <AlertCircle size={18} color="#ff4d4f" />
                        <span style={{ color: '#ff4d4f', fontWeight: 800, letterSpacing: '1px' }}>
                            {t('stock_alerts', language).toUpperCase()}
                        </span>
                    </Space>
                }
                extra={
                    <Tooltip title={t('refresh_alerts', language)}>
                        <Button 
                            type="text" 
                            icon={<RotateCw size={16} className={refreshing ? 'animate-spin' : ''} />} 
                            onClick={() => fetchAlerts(true)}
                            style={{ color: 'var(--text-muted)' }}
                        />
                    </Tooltip>
                }
                bodyStyle={{ padding: '12px 24px' }}
            >
                {loading ? (
                    <Skeleton active paragraph={{ rows: 3 }} />
                ) : (
                    <List
                        dataSource={lowStockItems}
                        renderItem={(item) => {
                            const isCritical = (item.quantity || 0) === 0;
                            return (
                                <List.Item 
                                    style={{ 
                                        borderBottom: '1px solid var(--border-default)',
                                        borderLeft: isCritical ? '4px solid #ff4d4f' : '4px solid #faad14',
                                        paddingLeft: '12px',
                                        marginBottom: '8px',
                                        borderRadius: '4px',
                                        background: isCritical ? 'rgba(255, 77, 79, 0.05)' : 'transparent'
                                    }}
                                    className={isCritical ? 'pulse-border' : ''}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <div>
                                            <Text strong className="high-alert" style={{ fontSize: '14px', color: isCritical ? '#ff4d4f' : 'inherit' }}>
                                                {item.partName || item.name || 'Unknown Part'}
                                            </Text>
                                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                                {t('part_no', language)}: {item.partNumber || 'N/A'} | {t('min', language)}: {item.minStockLevel || 5}
                                            </div>
                                        </div>
                                        <Badge 
                                            count={`${item.quantity || 0} ${t('left', language)}`} 
                                            style={{ 
                                                backgroundColor: isCritical ? '#ff4d4f' : '#faad14',
                                                boxShadow: isCritical ? '0 0 10px rgba(255, 77, 79, 0.5)' : 'none',
                                                fontWeight: 800
                                            }} 
                                        />
                                    </div>
                                </List.Item>
                            );
                        }}
                    />
                )}
            </Card>
        </div>
    );
};

export default AlertCenter;
