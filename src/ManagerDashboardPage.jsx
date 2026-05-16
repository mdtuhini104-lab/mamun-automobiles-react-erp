import React from 'react';
import {
    Typography, Row, Col, Card, Statistic, List, Tag, Alert,
    Space, Progress, Empty, Badge, Table, theme, Grid
} from 'antd';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { formatCurrency, getFromLocalStorage } from './utils/helpers';
import databaseBridge from './services/databaseBridge';
import { Users, Clock, Car, AlertTriangle } from 'lucide-react';
import { enhanceAutomotiveText, generateBusinessTip, generateFinancialInsights } from './services/aiServiceV2';

dayjs.extend(isBetween);
dayjs.extend(relativeTime);

const { Title, Text } = Typography;
const toNumber = (v) => Number(v) || 0;

const ManagerDashboardPage = () => {
    const { token } = theme.useToken();
    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;
    const { theme: appTheme } = useTheme();
    const isDark = appTheme !== 'theme-light-minimal';
    const { user: currentUser } = useAuth();
    const {
        payments, expenses, jobCards, customers,
        savedBills, inventory, salaries, navigateTo,
        jobIntakes: intakes, featureToggles: toggles, language
    } = useGlobalState();
    const aiEnabled = (toggles || {})?.ai_service?.enabled ?? true;

    const [financeTip, setFinanceTip] = React.useState(null);
    const [loadingTip, setLoadingTip] = React.useState(false);
    const [mechanics, setMechanics] = React.useState([]);

    // ─── Load Staff ───
    const loadData = React.useCallback(async () => {
        try {
            const allUsers = await databaseBridge.fetchUsers(currentUser);
            setMechanics((allUsers || []).filter(u => {
                const role = (u.role || '').toLowerCase();
                return role === 'staff';
            }));
        } catch (e) { console.error(e); }
    }, [currentUser]);

    React.useEffect(() => { loadData(); }, [loadData]);

    const bouncedCheques = React.useMemo(() => {
        const cheques = getFromLocalStorage('bankCheques') || [];
        return cheques.filter(c => c.status === 'Bounced');
    }, []);

    // ─── Computed Stats ───
    const todayRange = React.useMemo(() => ({
        start: dayjs().startOf('day'),
        end: dayjs().endOf('day')
    }), []);

    const revenueToday = React.useMemo(() =>
        (payments || [])
            .filter(p => dayjs(p.date).isBetween(todayRange.start, todayRange.end, 'day', '[]'))
            .reduce((s, p) => s + toNumber(p.amount), 0),
        [payments, todayRange]);

    const expenseToday = React.useMemo(() =>
        (expenses || [])
            .filter(e => dayjs(e.date).isBetween(todayRange.start, todayRange.end, 'day', '[]'))
            .reduce((s, e) => s + toNumber(e.amount), 0),
        [expenses, todayRange]);

    React.useEffect(() => {
        const fetchTip = async () => {
            if (!aiEnabled) {
                setFinanceTip('AI financial insights are disabled by the Owner.');
                setLoadingTip(false);
                return;
            }
            setLoadingTip(true);
            const tip = await generateFinancialInsights(revenueToday, expenseToday, language);
            setFinanceTip(tip);
            setLoadingTip(false);
        };
        // Fetch AI tip only when dashboard successfully calculates today's totals
        fetchTip();
    }, [revenueToday, expenseToday, aiEnabled, language]);

    const activeJobCount = React.useMemo(() =>
        (jobCards || []).filter(j => (j.status || 'active') === 'active').length,
        [jobCards]);

    const pendingIntakes = intakes.filter(i => ['Pending', 'Inspecting'].includes(i.status));
    const activeIntakes = intakes.filter(i => !['Finished'].includes(i.status));

    const totalOutstandingDue = React.useMemo(() =>
        (savedBills || []).reduce((s, b) => s + Math.max(0, toNumber(b.due)), 0),
        [savedBills]);

    const lowStockCount = React.useMemo(() =>
        (inventory || []).filter(i => toNumber(i.stock) <= toNumber(i.lowStockThreshold)).length,
        [inventory]);

    // ─── Smart Notifications (Business Brain) ───
    const upcomingServices = React.useMemo(() => {
        const today = dayjs();
        const next7Days = dayjs().add(7, 'day');
        return (customers || []).filter(c => {
            if (!c.nextServiceDate) return false;
            const sDate = dayjs(c.nextServiceDate);
            return sDate.isBetween(today, next7Days, 'day', '[]');
        });
    }, [customers]);

    // ─── Mechanic Efficiency Stats ───
    const mechanicStats = React.useMemo(() => {
        return mechanics.map(m => {
            const myIntakes = intakes.filter(i => i.mechanicId === m.id);
            const active = myIntakes.filter(i => i.status !== 'Finished');
            const finished = myIntakes.filter(i => i.status === 'Finished');
            const myJobs = (jobCards || []).filter(j =>
                j.assigned_staff_name === m.name || j.assignedMechanic === m.id
            );
            return {
                id: m.id,
                name: m.name,
                department: m.department || 'General',
                activeVehicles: active.length,
                finishedToday: finished.length,
                totalJobCards: myJobs.length,
                currentStatus: active.length > 0
                    ? `Working on ${active[0].vehicleNo}`
                    : 'Available'
            };
        });
    }, [mechanics, intakes, jobCards]);

    const statCards = [
        { title: 'Revenue Today', value: revenueToday, color: '#1d4ed8', prefix: '৳', icon: <Car size={18} /> },
        { title: 'Expense Today', value: expenseToday, color: '#ef4444', prefix: '৳', icon: <AlertTriangle size={18} /> },
        { title: 'Active Jobs', value: activeJobCount, color: '#f59e0b', icon: <Clock size={18} /> },
        { title: 'Outstanding Due', value: totalOutstandingDue, color: '#10b981', prefix: '৳', icon: <Users size={18} /> },
    ];

    const staffColumns = [
        {
            title: 'Mechanic',
            dataIndex: 'name',
            render: (name, row) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{row.department}</Text>
                </Space>
            )
        },
        {
            title: 'Status',
            dataIndex: 'currentStatus',
            render: (status) => (
                <Tag color={status === 'Available' ? 'success' : 'processing'} style={{ fontSize: 12 }}>
                    {status}
                </Tag>
            )
        },
        { title: 'Active Vehicles', dataIndex: 'activeVehicles', align: 'center',
            render: (v) => <Badge count={v} showZero style={{ backgroundColor: v > 0 ? '#1d4ed8' : '#d9d9d9' }} />
        },
        { title: 'Finished Today', dataIndex: 'finishedToday', align: 'center',
            render: (v) => <Text strong style={{ color: '#52c41a' }}>{v}</Text>
        },
        { title: 'Total Job Cards', dataIndex: 'totalJobCards', align: 'center' },
    ];

    return (
        <div style={{ maxWidth: 1300, margin: '0 auto', padding: isMobile ? '6px 2px' : '10px 0' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
                <Title level={3} style={{ margin: 0 }}>Manager Dashboard</Title>
                <Tag color="blue" style={{ marginLeft: 8 }}>
                    {currentUser?.name || 'Manager'}
                </Tag>
            </div>

            {/* Bounced Cheque Alert */}
            {bouncedCheques.length > 0 && (
                <Alert
                    type="error"
                    style={{ marginBottom: 24, borderRadius: 12, borderLeft: '5px solid #ff4d4f' }}
                    message={<Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>🚨 ACTION REQUIRED: {bouncedCheques.length} Cheque(s) DISHONORED/BOUNCED!</Text>}
                    description={
                        <div>
                            <Text>The system has detected {bouncedCheques.length} cheque(s) marked as <b>Bounced</b> in the banking module. Please contact the customers immediately.</Text>
                            <div style={{ marginTop: 10 }}>
                                <Button size="small" type="primary" danger onClick={() => navigateTo('banking')}>Go to Banking</Button>
                            </div>
                        </div>
                    }
                />
            )}

            {/* Quick Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {statCards.map((s, idx) => (
                    <Col xs={12} sm={6} key={idx}>
                        <Card className="glass-card" size="small">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <div style={{ padding: 8, borderRadius: 10, background: `${s.color}18` }}>
                                    {React.cloneElement(s.icon, { style: { color: s.color } })}
                                </div>
                                <Text type="secondary" style={{ fontSize: 12 }}>{s.title}</Text>
                            </div>
                            <Statistic
                                value={s.value}
                                prefix={s.prefix}
                                valueStyle={{ color: token.colorTextBase, fontSize: 24, fontWeight: 700 }}
                                formatter={s.prefix === '৳' ? (v) => formatCurrency(v) : undefined}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {/* Staff Efficiency Table */}
                <Col xs={24} lg={16}>
                    <Card
                        className="glass-card"
                        title={<Space><Users size={16} /> Staff Efficiency Monitor</Space>}
                        extra={<Tag color="blue">{mechanics.length} mechanics</Tag>}
                    >
                        {mechanics.length === 0 ? (
                            <Empty description="No staff data available yet." />
                        ) : (
                            <Table
                                dataSource={mechanicStats}
                                columns={staffColumns}
                                rowKey="id"
                                pagination={false}
                                size="small"
                            />
                        )}
                    </Card>
                </Col>

                {/* Pending Tasks */}
                <Col xs={24} lg={8}>
                    <Card
                        className="glass-card"
                        title={<Space><Clock size={16} /> Pending Tasks</Space>}
                        extra={<Badge count={pendingIntakes.length} style={{ backgroundColor: '#faad14' }} />}
                        style={{ marginBottom: 16 }}
                    >
                        {pendingIntakes.length === 0 ? (
                            <Empty description="All tasks are being handled." />
                        ) : (
                            <List
                                size="small"
                                dataSource={pendingIntakes.slice(0, 6)}
                                renderItem={item => {
                                    const mech = mechanics.find(m => m.id === item.mechanicId);
                                    return (
                                        <List.Item style={{ padding: '8px 0' }}>
                                            <div style={{ width: '100%' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <Text strong><Car size={12} /> {item.vehicleNo}</Text>
                                                    <Tag color={item.status === 'Inspecting' ? 'processing' : 'default'} style={{ fontSize: 11 }}>
                                                        {item.status}
                                                    </Tag>
                                                </div>
                                                <Text type="secondary" style={{ fontSize: 11 }}>
                                                    {mech ? `Assigned: ${mech.name}` : 'Unassigned'} • {dayjs(item.createdAt).fromNow()}
                                                </Text>
                                            </div>
                                        </List.Item>
                                    );
                                }}
                            />
                        )}
                    </Card>

                    {/* Alerts Card */}
                    <Card className="glass-card" title={<Space><AlertTriangle size={16} /> Alerts</Space>}>
                        <Space direction="vertical" size={8} style={{ width: '100%' }}>
                            {lowStockCount > 0 && (
                                <Alert type="error"  message={`${lowStockCount} low-stock items need attention`} style={{ borderRadius: 8 }} />
                            )}
                            {upcomingServices.length > 0 && (
                                <Alert 
                                    type="info" 
                                     
                                    message={
                                        <Space direction="vertical" size={2}>
                                            <Text strong>🧠 Smart Notification: Upcoming Services</Text>
                                            <Text style={{ fontSize: 13 }}>{upcomingServices.length} customers have services due in the next 7 days.</Text>
                                        </Space>
                                    } 
                                    style={{ borderRadius: 8, background: '#e6f4ff', borderColor: '#91caff' }} 
                                />
                            )}
                            {totalOutstandingDue > 50000 && (
                                <Alert type="warning"  message={`Outstanding due: ৳${formatCurrency(totalOutstandingDue)}`} style={{ borderRadius: 8 }} />
                            )}
                            {activeIntakes.length > 5 && (
                                <Alert type="info"  message={`${activeIntakes.length} vehicles in workshop`} style={{ borderRadius: 8 }} />
                            )}
                            {lowStockCount === 0 && totalOutstandingDue <= 50000 && activeIntakes.length <= 5 && (
                                <Alert type="success"  message="All systems running smoothly!" style={{ borderRadius: 8 }} />
                            )}
                        </Space>
                    </Card>

                    {/* AI Financial Insights Card */}
                    <Card
                        className="glass-card"
                        style={{ marginTop: 16, borderLeft: '4px solid #722ed1' }}
                    >
                        <Space align="start" size={12}>
                            <div style={{ fontSize: 24 }}>🧠</div>
                            <div style={{ flex: 1 }}>
                                <Text strong style={{ color: '#722ed1', display: 'block', marginBottom: 4 }}>Financial Insights</Text>
                                {loadingTip ? (
                                    <Text type="secondary" italic>Analyzing today's financials...</Text>
                                ) : (
                                    <Text style={{ fontSize: 13, lineHeight: 1.5 }}>{financeTip}</Text>
                                )}
                            </div>
                        </Space>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ManagerDashboardPage;




