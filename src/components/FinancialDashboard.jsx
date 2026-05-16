import React, { useState, useEffect } from 'react';
import { Card, Typography, Alert, Row, Col, Space, Skeleton, Divider } from 'antd';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { TrendingUp, DollarSign, Wallet } from 'lucide-react';
import databaseBridge from '../services/databaseBridge';
import { formatCurrency } from '../utils/helpers';
import { useTheme } from '../contexts/ThemeContext';
import { useGlobalState } from '../contexts/GlobalStateContext';
import { t } from '../utils/translations';

const { Text } = Typography;

const FinancialDashboardWidget = () => {
    const [trendData, setTrendData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { theme } = useTheme();
    const { language } = useGlobalState();
    const isDark = theme && (theme.includes('dark') || theme.includes('purple'));

    const fetchData = async () => {
        setLoading(true);
        try {
            const data = await databaseBridge.fetchFinancialTrend();
            // Inject profit calculation for chart
            const enriched = (data || []).map(d => ({
                ...d,
                profit: (d.income || 0) - (d.expense || 0)
            }));
            setTrendData(enriched);
        } catch (err) {
            console.error('[FinancialDashboard] Error fetching trends:', err);
            setError('Failed to load financial trend data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const currencyFormatter = (value) => `৳ ${formatCurrency(value)}`;

    const chartColors = {
        income: '#10b981', // green-500
        expense: '#ef4444', // red-500
        profit: '#3b82f6',  // blue-500
        grid: isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
        text: isDark ? '#9CA3AF' : '#4B5563'
    };

    if (error) {
        return (
            <Card className="glass-card no-print">
                <Alert message={error} type="error" showIcon />
            </Card>
        );
    }

    return (
        <div className="no-print" style={{ marginBottom: '24px' }}>
            <Card 
                className="glass-card" 
                title={
                    <Space>
                        <TrendingUp size={18} color="var(--accent)" />
                        <span style={{ color: 'var(--text-main)', fontWeight: 800, letterSpacing: '1px' }}>
                            {t('financial_trends', language).toUpperCase()}
                        </span>
                    </Space>
                }
            >
                {loading ? (
                    <div style={{ height: '350px', padding: '20px' }}>
                        <Skeleton active title={false} paragraph={{ rows: 8 }} />
                    </div>
                ) : (
                    <>
                        <div style={{ height: '350px', width: '100%' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={trendData}
                                    margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartColors.income} stopOpacity={0.4}/>
                                            <stop offset="95%" stopColor={chartColors.income} stopOpacity={0}/>
                                        </linearGradient>
                                        <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor={chartColors.expense} stopOpacity={0.2}/>
                                            <stop offset="95%" stopColor={chartColors.expense} stopOpacity={0}/>
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke={chartColors.grid} vertical={false} />
                                    <XAxis 
                                        dataKey="date" 
                                        tick={{ fill: chartColors.text, fontSize: 10 }} 
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(str) => {
                                            const d = new Date(str);
                                            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                                        }}
                                    />
                                    <YAxis 
                                        tick={{ fill: chartColors.text, fontSize: 10 }} 
                                        axisLine={false}
                                        tickLine={false}
                                        tickFormatter={(val) => `৳${formatCurrency(val)}`}
                                    />
                                    <Tooltip 
                                        formatter={(value, name) => [currencyFormatter(value), name.toUpperCase()]}
                                        labelStyle={{ color: 'var(--text-muted)', marginBottom: '8px', fontWeight: 800 }}
                                        contentStyle={{ 
                                            backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                                            border: '1px solid rgba(255, 255, 255, 0.1)',
                                            borderRadius: '8px',
                                            boxShadow: '0 10px 25px rgba(0,0,0,0.5)'
                                        }}
                                        itemStyle={{ padding: '2px 0' }}
                                    />
                                    <Legend verticalAlign="top" height={36} iconType="circle" />
                                    <Area 
                                        type="monotone" 
                                        dataKey="income" 
                                        stroke={chartColors.income} 
                                        fillOpacity={1} 
                                        fill="url(#colorIncome)" 
                                        strokeWidth={3}
                                        name={t('income', language)}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="expense" 
                                        stroke={chartColors.expense} 
                                        fillOpacity={1} 
                                        fill="url(#colorExpense)" 
                                        strokeWidth={2}
                                        name={t('expense', language)}
                                        strokeDasharray="5 5"
                                    />
                                    <Area 
                                        type="monotone" 
                                        dataKey="profit" 
                                        stroke={chartColors.profit} 
                                        fill="transparent" 
                                        strokeWidth={0}
                                        name={t('daily_profit', language)}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>

                        <Divider style={{ margin: '24px 0', borderColor: 'var(--border-default)' }} />

                        <Row gutter={[20, 20]}>
                           <Col xs={24} sm={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(16, 185, 129, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.1)' }}>
                                    <div style={{ background: chartColors.income, padding: '10px', borderRadius: '50%', display: 'flex' }}>
                                        <DollarSign color="white" size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>{t('monthly_revenue', language).toUpperCase()}</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: chartColors.income }}>
                                            ৳ {formatCurrency(trendData.reduce((acc, curr) => acc + (curr.income || 0), 0))}
                                        </div>
                                    </div>
                                </div>
                           </Col>
                           <Col xs={24} sm={12}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', background: 'rgba(239, 68, 68, 0.05)', padding: '15px', borderRadius: '8px', border: '1px solid rgba(239, 68, 68, 0.1)' }}>
                                    <div style={{ background: chartColors.expense, padding: '10px', borderRadius: '50%', display: 'flex' }}>
                                        <Wallet color="white" size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 800 }}>{t('monthly_expense', language).toUpperCase()}</div>
                                        <div style={{ fontSize: '18px', fontWeight: 900, color: chartColors.expense }}>
                                            ৳ {formatCurrency(trendData.reduce((acc, curr) => acc + (curr.expense || 0), 0))}
                                        </div>
                                    </div>
                                </div>
                           </Col>
                        </Row>
                    </>
                )}
            </Card>
        </div>
    );
};

export default FinancialDashboardWidget;
