import React from 'react';
import { Card, Row, Col, Statistic, Typography, Select, DatePicker, message, Divider, Space, Table, Tag } from 'antd';
import { ArrowUpOutlined, ArrowDownOutlined, RiseOutlined, FallOutlined, ShoppingCartOutlined, TeamOutlined, CalendarOutlined } from '@ant-design/icons';
import databaseBridge from './services/databaseBridge';
import { useTheme } from './contexts/ThemeContext';
import dayjs from 'dayjs';
import { useGlobalState } from './contexts/GlobalStateContext';
import { t } from './utils/translations';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

const FinanceDashboard = () => {
    const { language } = useGlobalState();
    const { theme } = useTheme();
    const isDark = theme.includes('dark') || theme.includes('purple');
    const [loading, setLoading] = React.useState(true);
    const [summary, setSummary] = React.useState(null);
    const [dateRange, setDateRange] = React.useState([dayjs().startOf('month'), dayjs().endOf('month')]);

    const loadSummary = async () => {
        setLoading(true);
        try {
            const params = {
                startDate: dateRange[0].toISOString(),
                endDate: dateRange[1].toISOString()
            };
            const data = await databaseBridge.fetchFinanceSummary(params);
            setSummary(data);
        } catch (err) {
            message.error(t('failed_load_finance', language));
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadSummary();
    }, [dateRange]);

    if (!summary && loading) return <div style={{ padding: 24 }}>{t('loading_summary', language)}</div>;

    const { income, expense, netProfit, grossProfit, counts, balances } = summary || { income: {}, expense: {}, netProfit: 0, grossProfit: 0, counts: {}, balances: { cash: 0, bank: 0 } };

    return (
        <div style={{ padding: '0 0 24px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2} style={{ color: isDark ? '#FFFFFF' : '#000000', fontWeight: 900 }}>📊 {t('financial_overview', language)}</Title>
                <RangePicker
                    value={dateRange}
                    onChange={setDateRange}
                    className="glass-card"
                />
            </div>

            {/* Global Balances Section */}
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24} md={12}>
                    <Card className="glass-card navy-shadow" style={{ borderBottom: '4px solid #3B82F6', background: isDark ? 'rgba(59,130,246,0.05)' : '#eff6ff' }}>
                        <Statistic
                            title={<Text strong style={{ color: isDark ? '#3B82F6' : '#1d4ed8', letterSpacing: '1px' }}>{t('cash_on_hand', language).toUpperCase()}</Text>}
                            value={balances?.cash || 0}
                            precision={2}
                            prefix="৳"
                            valueStyle={{ color: isDark ? '#FFF' : '#000', fontWeight: 900, fontSize: 32 }}
                        />
                    </Card>
                </Col>
                <Col xs={24} md={12}>
                    <Card className="glass-card navy-shadow" style={{ borderBottom: '4px solid #1890ff', background: isDark ? 'rgba(24,144,255,0.05)' : '#e6f7ff' }}>
                        <Statistic
                            title={<Text strong style={{ color: isDark ? '#1890ff' : '#096dd9', letterSpacing: '1px' }}>{t('bank_management', language).toUpperCase()}</Text>}
                            value={balances?.bank || 0}
                            precision={2}
                            prefix="৳"
                            valueStyle={{ color: isDark ? '#FFF' : '#000', fontWeight: 900, fontSize: 32 }}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]}>
                <Col xs={24} md={6}>
                    <Card className="glass-card navy-shadow" style={{ borderLeft: '4px solid #52c41a' }}>
                        <Statistic
                            title={t('income', language)}
                            value={income?.total || 0}
                            precision={2}
                            prefix="৳"
                            valueStyle={{ color: '#52c41a' }}
                        />
                        <div style={{ marginTop: 8, fontSize: 11 }}>
                            <Text type="secondary">{t('income', language)}: ৳{(income?.sales || 0).toLocaleString()}</Text><br />
                            <Text type="secondary">{t('other', language)}: ৳{(income?.other || 0).toLocaleString()}</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card className="glass-card navy-shadow" style={{ borderLeft: '4px solid #ff4d4f' }}>
                        <Statistic
                            title={t('expense', language)}
                            value={expense?.total || 0}
                            precision={2}
                            prefix="৳"
                            valueStyle={{ color: '#ff4d4f' }}
                        />
                        <div style={{ marginTop: 8, fontSize: 11 }}>
                            <Text type="secondary">Pur: ৳{(expense?.purchases || 0).toLocaleString()} | Sal: ৳{(expense?.salaries || 0).toLocaleString()}</Text>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card className="glass-card navy-shadow" style={{ borderLeft: '4px solid #3B82F6' }}>
                        <Statistic
                            title={t('gross_performance', language)}
                            value={grossProfit}
                            precision={2}
                            prefix="৳"
                            valueStyle={{ color: '#3B82F6' }}
                        />
                        <div style={{ marginTop: 8, fontSize: 11 }}>
                            <Tag color="orange" style={{ fontSize: 10 }}>Profit from Parts & Services</Tag>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} md={6}>
                    <Card className="glass-card navy-shadow" style={{ borderLeft: `4px solid ${netProfit >= 0 ? '#1890ff' : '#cf1322'}` }}>
                        <Statistic
                            title={t('net_profit_loss', language)}
                            value={Math.abs(netProfit)}
                            precision={2}
                            prefix={netProfit >= 0 ? '৳' : '- ৳'}
                            valueStyle={{ color: netProfit >= 0 ? '#1890ff' : '#cf1322' }}
                            suffix={netProfit >= 0 ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
                        />
                        <Tag color={netProfit >= 0 ? 'success' : 'error'} style={{ marginTop: 8 }}>
                            {netProfit >= 0 ? t('in_profit', language) : t('in_deficit', language)}
                        </Tag>
                    </Card>
                </Col>
            </Row>

            <Divider orientation="left">Transaction Breakdown</Divider>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <Card title={<span><RiseOutlined /> {t('income', language)}</span>} className="glass-card">
                        <Table
                            size="small"
                            pagination={false}
                            dataSource={[
                                { key: '1', source: 'Cash & Credit Sales', amount: income?.sales || 0, type: 'Direct' },
                                { key: '2', source: 'Manual Cash In / Other', amount: income?.other || 0, type: 'Secondary' },
                            ]}
                            columns={[
                                { title: t('source', language), dataIndex: 'source' },
                                { title: t('type', language), dataIndex: 'type', render: t => <Tag>{t}</Tag> },
                                { title: t('amount', language), dataIndex: 'amount', render: v => <Text strong>৳{v?.toLocaleString()}</Text> }
                            ]}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card title={<span><FallOutlined /> {t('expense', language)}</span>} className="glass-card">
                        <Table
                            size="small"
                            pagination={false}
                            dataSource={[
                                { key: '1', category: 'Inventory Purchases', amount: expense?.purchases || 0 },
                                { key: '2', category: 'Staff Salaries', amount: expense?.salaries || 0 },
                                { key: '3', category: 'Operational Expenses', amount: expense?.operational || 0 },
                            ]}
                            columns={[
                                { title: t('category', language), dataIndex: 'category' },
                                { title: t('amount', language), dataIndex: 'amount', render: v => <Text strong type="danger">৳{v?.toLocaleString()}</Text> }
                            ]}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
                <Col span={24}>
                    <Card className="glass-card">
                        <Row gutter={32}>
                            <Col span={8}>
                                <Statistic title={t('income', language)} value={counts?.bills || 0} prefix={<CalendarOutlined />} />
                            </Col>
                            <Col span={8}>
                                <Statistic title={t('purchase_orders', language)} value={counts?.purchases || 0} prefix={<ShoppingCartOutlined />} />
                            </Col>
                            <Col span={8}>
                                <Statistic title={t('daily_expenses', language)} value={counts?.expenses || 0} prefix={<TeamOutlined />} />
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default FinanceDashboard;




