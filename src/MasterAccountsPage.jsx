import React from 'react';
import { Card, Row, Col, Typography, Table, DatePicker, Button, Space, Tag, Tabs, Modal, Form, Input, InputNumber, message, Select } from 'antd';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowUpRight, ArrowDownRight, Activity, Calendar, FilterX } from 'lucide-react';
import { useGlobalState } from './contexts/GlobalStateContext';
import { askGemini } from './gemini';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;
const { Option } = Select;

const MasterAccountsPage = () => {
    const { payments, expenses, salaries, savedBills, rentACars, cashInEntries, addCashInEntry } = useGlobalState();

    // Default to 'Current Day'
    const [dateRange, setDateRange] = React.useState([dayjs().startOf('day'), dayjs().endOf('day')]);
    const [aiSummary, setAiSummary] = React.useState('');
    const [isCashInModalVisible, setIsCashInModalVisible] = React.useState(false);
    const [cashInForm] = Form.useForm();

    const isWithinRange = (dateStr) => {
        if (!dateRange || !dateRange[0] || !dateRange[1]) return true;
        const d = dayjs(dateStr);
        return (d.isSame(dateRange[0], 'day') || d.isAfter(dateRange[0], 'day')) &&
            (d.isSame(dateRange[1], 'day') || d.isBefore(dateRange[1], 'day'));
    };

    const rentACarDrivers = React.useMemo(() => new Set((rentACars || []).map(car => car.driverName).filter(Boolean)), [rentACars]);

    const getLedgerName = (tx, type) => {
        if (tx?.ledger) return tx.ledger;
        if (type === 'salary' && rentACarDrivers.has(tx?.staffName)) return 'Rent-A-Car';
        return 'Mamun Automobiles';
    };

    const processedPayments = React.useMemo(() => (payments || []).filter(p => isWithinRange(p.date)).map(p => ({ ...p, computedLedger: getLedgerName(p, 'payment') })), [payments, dateRange, rentACarDrivers]);
    const processedExpenses = React.useMemo(() => (expenses || []).filter(e => isWithinRange(e.date)).map(e => ({ ...e, computedLedger: getLedgerName(e, 'expense') })), [expenses, dateRange, rentACarDrivers]);
    const processedSalaries = React.useMemo(() => (salaries || []).filter(s => isWithinRange(s.paymentDate || s.date)).map(s => ({ ...s, computedLedger: getLedgerName(s, 'salary') })), [salaries, dateRange, rentACarDrivers]);
    const processedSavedBills = React.useMemo(() => (savedBills || []).filter(b => isWithinRange(b.date)).map(b => ({ ...b, computedLedger: getLedgerName(b, 'bill') })), [savedBills, dateRange, rentACarDrivers]);
    const processedCashInEntries = React.useMemo(
        () => (cashInEntries || []).filter(c => isWithinRange(c.date)).map(c => ({ ...c, computedLedger: getLedgerName(c, 'cashIn') })),
        [cashInEntries, dateRange, rentACarDrivers]
    );

    const COLORS = ['#10b981', '#f43f5e', '#0ea5e9', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b'];

    const handleAddCashIn = async (values) => {
        const amount = Number(values.amount) || 0;
        if (amount <= 0) {
            message.error('Amount must be greater than zero.');
            return;
        }

        try {
            await addCashInEntry({
                id: `CASHIN-${Date.now()}`,
                date: values.date ? values.date.toISOString() : dayjs().toISOString(),
                amount,
                sourceType: values.sourceType,
                ledger: values.ledger || 'Mamun Automobiles',
                bankName: values.sourceType === 'Bank Withdrawal' ? (values.bankName || '') : '',
                note: values.note || ''
            });

            message.success('Cash in entry saved.');
            setIsCashInModalVisible(false);
            cashInForm.resetFields();
        } catch (error) {
            console.error('Cash in save failed:', error);
            message.error('Cash in entry could not be saved.');
        }
    };

    const renderLedgerDashboard = (ledgerFilter) => {
        const lp = ledgerFilter === 'All' ? processedPayments : processedPayments.filter(p => p.computedLedger === ledgerFilter);
        const le = ledgerFilter === 'All' ? processedExpenses : processedExpenses.filter(e => e.computedLedger === ledgerFilter);
        const ls = ledgerFilter === 'All' ? processedSalaries : processedSalaries.filter(s => s.computedLedger === ledgerFilter);
        const lb = ledgerFilter === 'All' ? processedSavedBills : processedSavedBills.filter(b => b.computedLedger === ledgerFilter);

        const cashInflow = lp.reduce((sum, p) => sum + (Number(p?.amount) || 0), 0);
        // Cash Outflow should include general expenses AND PAID salaries. 
        // Note: New SalaryPage logic creates an 'expense' of category 'Staff Salary', 
        // so we must avoid double counting if using both arrays.
        // We will sum all expenses, and then only add salaries that don't have a linked expense.
        // Since we are standardizing on category 'Staff Salary' in Expenses, let's use that.

        const generalExpenses = le.reduce((sum, e) => sum + (Number(e?.amount) || 0), 0);
        // Only include salaries from 'ls' if they aren't already represented in 'le' (to support legacy records)
        const legacySalariesTotal = ls
            .filter(s => s.status === 'PAID') // Only PAID salaries count
            .filter(s => !le.some(e => e.isStaffPayment && e.staffName === s.staffName && dayjs(e.date).isSame(dayjs(s.paymentDate || s.date), 'day')))
            .reduce((sum, s) => sum + (Number(s?.netPayable) || 0), 0);

        const cashOutflow = generalExpenses + legacySalariesTotal;
        const totalSales = lb.reduce((sum, b) => sum + (Number(b?.netPayable || b?.amount) || 0), 0);
        const netProfit = totalSales - cashOutflow;

        const mix = [];
        lp.forEach(p => mix.push({ ...p, txType: 'INCOME', txTitle: p.description || `Payment from ${p.customerName || p.companyName || 'Unknown'}`, txAmount: p.amount, txDate: p.date }));
        le.forEach(e => mix.push({ ...e, txType: 'EXPENSE', txTitle: e.title || `Expense: ${e.category}`, txAmount: e.amount, txDate: e.date }));
        // Add legacy salaries that aren't in expenses
        ls.filter(s => s.status === 'PAID')
            .filter(s => !le.some(e => e.isStaffPayment && e.staffName === s.staffName && dayjs(e.date).isSame(dayjs(s.paymentDate || s.date), 'day')))
            .forEach(s => mix.push({ ...s, txType: 'EXPENSE', txTitle: `Salary: ${s.staffName}`, txAmount: s.netPayable, txDate: s.paymentDate || s.date }));

        const advancedTransactions = mix.sort((a, b) => new Date(b.txDate || 0) - new Date(a.txDate || 0));

        const catMap = {};
        le.forEach(e => {
            const cat = e.category || 'Other';
            if (!catMap[cat]) catMap[cat] = 0;
            catMap[cat] += (Number(e.amount) || 0);
        });
        if (legacySalariesTotal > 0) {
            catMap['Staff Salary'] = (catMap['Staff Salary'] || 0) + legacySalariesTotal;
        }
        const expenseBreakdown = Object.keys(catMap).map(key => ({ name: key, value: catMap[key] })).filter(d => d.value > 0).sort((a, b) => b.value - a.value);

        return (
            <div style={{ marginTop: 16 }}>
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#064e3b', border: '1px solid #10b981', boxShadow: '0 0 12px rgba(16, 185, 129, 0.35)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, color: '#10b981' }}>
                                <ArrowUpRight size={18} style={{ marginRight: 8 }} />
                                <Text strong style={{ color: '#10b981', fontSize: 13, letterSpacing: 0.3 }}>Cash Inflow</Text>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981', margin: '4px 0 4px' }}>৳ {cashInflow.toLocaleString()}</div>
                            <Text style={{ fontSize: 12, color: '#6ee7b7' }}>Collected Payments</Text>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#450a0a', border: '1px solid #f43f5e', boxShadow: '0 0 12px rgba(244, 63, 94, 0.35)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, color: '#f43f5e' }}>
                                <ArrowDownRight size={18} style={{ marginRight: 8 }} />
                                <Text strong style={{ color: '#f43f5e', fontSize: 13, letterSpacing: 0.3 }}>Cash Outflow</Text>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#f43f5e', margin: '4px 0 4px' }}>৳ {cashOutflow.toLocaleString()}</div>
                            <Text style={{ fontSize: 12, color: '#fca5a5' }}>Expenses + Salaries</Text>
                        </Card>
                    </Col>
                    <Col xs={24} sm={8}>
                        <Card size="small" style={{ background: '#1e3a8a', border: '1px solid #0ea5e9', boxShadow: '0 0 12px rgba(14, 165, 233, 0.35)', borderRadius: 10 }}>
                            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8, color: '#0ea5e9' }}>
                                <Activity size={18} style={{ marginRight: 8 }} />
                                <Text strong style={{ color: '#0ea5e9', fontSize: 13, letterSpacing: 0.3 }}>Net Profit Balance</Text>
                            </div>
                            <div style={{ fontSize: 24, fontWeight: 700, color: '#0ea5e9', margin: '4px 0 4px' }}>৳ {netProfit.toLocaleString()}</div>
                            <Text style={{ fontSize: 12, color: '#7dd3fc' }}>Total Sales − Outflow</Text>
                        </Card>
                    </Col>
                </Row>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} md={16}>
                        <Card title={`${ledgerFilter === 'All' ? 'Combined' : ledgerFilter} Transactions`} style={{ height: '100%' }}>
                            <Table
                                size="small"
                                dataSource={advancedTransactions.slice(0, 100)} // Show up to 100 recent
                                rowKey="id"
                                pagination={{ pageSize: 15 }}
                                className="dark-header-table"
                                columns={[
                                    { title: 'Date', dataIndex: 'txDate', render: d => dayjs(d).format('DD MMM YYYY, hh:mm A') },
                                    { title: 'Ledger', dataIndex: 'computedLedger', render: l => <Tag>{l}</Tag> },
                                    { title: 'Type', dataIndex: 'txType', render: t => <Tag color={t === 'INCOME' ? 'success' : 'error'}>{t}</Tag> },
                                    { title: 'Description', dataIndex: 'txTitle', render: t => <Text>{t}</Text> },
                                    { title: 'Amount', dataIndex: 'txAmount', render: (v, r) => <Text type={r.txType === 'INCOME' ? 'success' : 'danger'} strong>{r.txType === 'INCOME' ? '+' : '-'} ৳ {(v || 0).toLocaleString()}</Text> }
                                ]}
                            />
                        </Card>
                    </Col>
                    <Col xs={24} md={8}>
                        <Card title="Expense Breakdown" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                            {expenseBreakdown.length > 0 ? (
                                <div style={{ height: 350 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={expenseBreakdown}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={60}
                                                outerRadius={100}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {expenseBreakdown.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                formatter={(value) => `৳ ${value.toLocaleString()}`}
                                                contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                            <Legend wrapperStyle={{ fontSize: 13 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                                    <Text type="secondary">No expense data for this period.</Text>
                                </div>
                            )}
                        </Card>
                    </Col>
                </Row>
            </div>
        );
    };

    // Generate an AI summary for the selected period & ledger when data changes
    React.useEffect(() => {
        let mounted = true;
        const buildSummary = async () => {
            try {
                const prompt = `Provide a concise financial summary (2 sentences) for the period where cashInflow is ${processedPayments.reduce((s,p)=>s+(Number(p.amount)||0),0)} and cashOutflow is ${processedExpenses.reduce((s,e)=>s+(Number(e.amount)||0),0)}. Mention top expense categories.`;
                const out = await askGemini(prompt);
                if (mounted) setAiSummary(out || '');
            } catch (e) {
                console.warn('Gemini summary failed', e);
            }
        };
        buildSummary();
        return () => { mounted = false; };
    }, [processedPayments.length, processedExpenses.length, processedSalaries.length, processedSavedBills.length]);

    return (
        <div>
            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Master accounts</Title>
                    <Text type="secondary">Admin-only financial overview, cash flow, and net profit tracking across all ledgers</Text>
                </div>
                {aiSummary && (
                    <div style={{ maxWidth: 520, textAlign: 'right' }}>
                        <Text type="secondary">AI Summary:</Text>
                        <div style={{ color: '#cbd5e1', fontSize: 13 }}>{aiSummary}</div>
                    </div>
                )}
                <Space style={{ background: '#1e293b', padding: '8px 12px', borderRadius: 8, border: '1px solid #334155' }}>
                    <Calendar size={18} color="#94a3b8" />
                    <RangePicker
                        value={dateRange}
                        onChange={setDateRange}
                        format="DD MMM YYYY"
                        style={{ background: '#0f172a', borderColor: '#334155', color: '#fff' }}
                    />
                    <Button
                        type="primary"
                        danger
                        icon={<FilterX size={16} />}
                        onClick={() => setDateRange(null)}
                        title="Clear Filter (Show All Time)"
                    >
                        Clear Filter
                    </Button>
                </Space>
            </div>

            <Tabs
                defaultActiveKey="Mamun Automobiles"
                type="card"
                items={[
                    { key: 'Mamun Automobiles', label: '🛠️ Mamun Automobiles (Workshop)', children: renderLedgerDashboard('Mamun Automobiles') },
                    { key: 'Muntha Motors', label: '🚗 Muntha Motors (Buy/Sell)', children: renderLedgerDashboard('Muntha Motors') },
                    { key: 'Rent-A-Car', label: '🔑 Rent-A-Car (Rentals)', children: renderLedgerDashboard('Rent-A-Car') },
                    { key: 'All', label: '🌐 Combined Overview', children: renderLedgerDashboard('All') }
                ]}
            />
        </div>
    );
};

export default MasterAccountsPage;




