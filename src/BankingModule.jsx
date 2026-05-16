import React from 'react';
import {
    Card, Table, Button, Modal, Form, Input, InputNumber, Select,
    Typography, Space, Tag, Row, Col, DatePicker, message,
    Statistic, Tabs, Empty, Badge, Alert, Tooltip, theme
} from 'antd';

import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { syncToLocalStorage, getFromLocalStorage, formatCurrency } from './utils/helpers';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { ArrowDownToLine, Ban, BadgeDollarSign, CheckCircle2, Clock3, Landmark } from 'lucide-react';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const { Option } = Select;

const BankingModule = () => {
    const { token } = theme.useToken();
    const { user } = useAuth();
    const { payments } = useGlobalState();

    const isAdmin = ['admin', 'superadmin'].includes((user?.role || '').toLowerCase());

    const [accounts, setAccounts] = React.useState(() => getFromLocalStorage('bankAccounts') || []);
    const [cheques, setCheques] = React.useState(() => getFromLocalStorage('bankCheques') || []);
    const [isAccountModal, setIsAccountModal] = React.useState(false);
    const [isChequeModal, setIsChequeModal] = React.useState(false);
    const [accountForm] = Form.useForm();
    const [chequeForm] = Form.useForm();

    React.useEffect(() => { syncToLocalStorage('bankAccounts', accounts); }, [accounts]);
    React.useEffect(() => { syncToLocalStorage('bankCheques', cheques); }, [cheques]);

    // ─── Add Account ───
    const handleAddAccount = (values) => {
        setAccounts(prev => [...prev, {
            id: `BA-${Date.now()}`,
            bankName: values.bankName,
            accountNo: values.accountNo,
            branch: values.branch || '',
            balance: Number(values.initialBalance) || 0,
            createdAt: dayjs().toISOString()
        }]);
        setIsAccountModal(false);
        accountForm.resetFields();
        message.success(`Bank account "${values.bankName}" added!`);
    };

    // ─── Delete Account (Admin only) ───
    const handleDeleteAccount = (id) => {
        if (!isAdmin) return message.error('Only Admin can delete bank accounts.');
        Modal.confirm({
            title: 'Delete Bank Account?',
            content: 'This action cannot be undone.',
            okText: 'Delete',
            okButtonProps: { danger: true },
            onOk: () => {
                setAccounts(prev => prev.filter(a => a.id !== id));
                message.success('Bank account deleted.');
            }
        });
    };

    // ─── Deposit Cheque ───
    const handleDepositCheque = (values) => {
        setCheques(prev => [{
            id: `CHQ-${Date.now()}`,
            chequeNo: values.chequeNo,
            bankAccountId: values.bankAccountId,
            amount: Number(values.amount),
            payerName: values.payerName || '',
            source: values.source || 'Other',
            depositDate: values.depositDate?.toISOString() || dayjs().toISOString(),
            clearingDate: values.clearingDate?.toISOString() || dayjs().add(3, 'day').toISOString(),
            status: 'Deposited',
            notes: values.notes || ''
        }, ...prev]);
        setIsChequeModal(false);
        chequeForm.resetFields();
        message.success(`Cheque #${values.chequeNo} deposited!`);
    };

    // ─── Clear Cheque ───
    const handleClearCheque = (chequeId) => {
        setCheques(prev => prev.map(c => {
            if (c.id !== chequeId) return c;
            setAccounts(accs => accs.map(a =>
                a.id === c.bankAccountId ? { ...a, balance: (a.balance || 0) + c.amount } : a
            ));
            return { ...c, status: 'Cleared', clearedDate: dayjs().toISOString() };
        }));
        message.success('Cheque cleared! Bank balance updated.');
    };

    // ─── Bounce Cheque ───
    const handleBounceCheque = (chequeId) => {
        setCheques(prev => prev.map(c =>
            c.id === chequeId ? { ...c, status: 'Bounced', bouncedDate: dayjs().toISOString() } : c
        ));
        message.error('Cheque marked as DISHONORED/BOUNCED!');
    };

    // ─── Settlement (Admin only) ───
    const handleSettlement = (chequeId) => {
        if (!isAdmin) return message.error('Only Admin can settle bounced cheques.');
        setCheques(prev => prev.map(c =>
            c.id === chequeId ? { ...c, status: 'Settled', settledDate: dayjs().toISOString() } : c
        ));
        message.success('Bounced cheque marked as Settled.');
    };

    // ─── Stats ───
    const totalBalance = accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const pendingCheques = cheques.filter(c => c.status === 'Deposited');
    const bouncedCheques = cheques.filter(c => c.status === 'Bounced');
    const pendingAmount = pendingCheques.reduce((s, c) => s + c.amount, 0);
    const bouncedAmount = bouncedCheques.reduce((s, c) => s + c.amount, 0);

    // Overdue cheques (past clearing date, still Deposited)
    const overdueCheques = pendingCheques.filter(c =>
        c.clearingDate && dayjs().isAfter(dayjs(c.clearingDate))
    );

    const getStatusTag = (status) => {
        const map = {
            Deposited: { color: 'processing', icon: <Clock3 size={12} /> },
            Cleared:   { color: 'success',    icon: <CheckCircle2 size={12} /> },
            Bounced:   { color: 'error',       icon: <Ban size={12} /> },
            Settled:   { color: 'default',     icon: <BadgeDollarSign size={12} /> },
        };
        const cfg = map[status] || { color: 'default' };
        return <Tag icon={cfg.icon} color={cfg.color} style={{ fontSize: 13, padding: '3px 10px' }}>{status}</Tag>;
    };

    const accountColumns = [
        { title: 'Bank', dataIndex: 'bankName', render: (v) => <Text strong>{v}</Text> },
        { title: 'Account No', dataIndex: 'accountNo' },
        { title: 'Branch', dataIndex: 'branch' },
        { title: 'Balance', dataIndex: 'balance',
            render: (v) => <Text strong style={{ color: v >= 0 ? '#52c41a' : '#ff4d4f', fontSize: 15 }}>৳ {formatCurrency(v)}</Text> },
        { title: 'Action', render: (_, row) => isAdmin ? (
            <Button size="small" danger onClick={() => handleDeleteAccount(row.id)}>Delete</Button>
        ) : null },
    ];

    const chequeColumns = [
        { title: 'Cheque #', dataIndex: 'chequeNo', render: (v) => <Text strong>{v}</Text> },
        { title: 'Payer', dataIndex: 'payerName' },
        { title: 'Source', dataIndex: 'source', render: (v) => <Tag color="blue">{v}</Tag> },
        { title: 'Amount', dataIndex: 'amount', render: (v) => <Text strong style={{ fontSize: 14 }}>৳ {formatCurrency(v)}</Text> },
        { title: 'Deposit', dataIndex: 'depositDate', render: (v) => dayjs(v).format('DD MMM YY') },
        { title: 'Clearing Date', dataIndex: 'clearingDate',
            render: (v, row) => {
                const isOverdue = row.status === 'Deposited' && v && dayjs().isAfter(dayjs(v));
                return <Text type={isOverdue ? 'danger' : undefined} strong={isOverdue}>
                    {v ? dayjs(v).format('DD MMM YY') : '—'} {isOverdue && '⚠️'}
                </Text>;
            }
        },
        { title: 'Status', dataIndex: 'status', render: getStatusTag },
        { title: 'Action', render: (_, row) => (
            <Space>
                {row.status === 'Deposited' && (
                    <>
                        <Button size="small" type="primary" onClick={() => handleClearCheque(row.id)}>✅ Clear</Button>
                        <Button size="small" danger onClick={() => handleBounceCheque(row.id)}>❌ Bounce</Button>
                    </>
                )}
                {row.status === 'Bounced' && isAdmin && (
                    <Button size="small" onClick={() => handleSettlement(row.id)}>🤝 Settle</Button>
                )}
            </Space>
        )}
    ];

    return (
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            <div style={{ marginBottom: 20 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 600 }}>
                    <Space><Landmark size={28} style={{ color: token.colorPrimary }} /> Banking module</Space>
                </Title>
                <Text type="secondary">Bank accounts, cheque deposits, clearing, bounce tracking and settlement.</Text>
            </div>

            {/* BOUNCE ALERT */}
            {bouncedCheques.length > 0 && (
                <Alert
                    type="error"
                    
                    style={{ marginBottom: 16, borderRadius: 12, borderLeft: '5px solid #ff4d4f' }}
                    message={<Text strong style={{ color: '#ff4d4f', fontSize: 15 }}>🚨 {bouncedCheques.length} Cheque(s) DISHONORED!</Text>}
                    description={
                        <Space direction="vertical" size={4}>
                            {bouncedCheques.slice(0, 3).map(c => (
                                <Text key={c.id}>Cheque #{c.chequeNo} — <b>{c.payerName}</b> — ৳ {formatCurrency(c.amount)} — Contact immediately!</Text>
                            ))}
                            {bouncedCheques.length > 3 && <Text type="secondary">...and {bouncedCheques.length - 3} more</Text>}
                        </Space>
                    }
                />
            )}

            {overdueCheques.length > 0 && (
                <Alert
                    type="warning"
                    
                    style={{ marginBottom: 16, borderRadius: 12 }}
                    message={`⏰ ${overdueCheques.length} cheque(s) past expected clearing date!`}
                    description={overdueCheques.slice(0, 3).map(c => `#${c.chequeNo} (${c.payerName})`).join(', ')}
                />
            )}

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                {[
                    { title: 'Total Bank Balance', value: totalBalance, color: token.colorTextBase, prefix: '৳', icon: <Landmark size={18} style={{ color: '#1d4ed8' }} /> },
                    { title: 'Pending Cheques', value: pendingCheques.length, color: '#faad14', icon: <Clock3 size={18} style={{ color: '#faad14' }} /> },
                    { title: 'Pending Amount', value: pendingAmount, color: '#1d4ed8', prefix: '৳', icon: <ArrowDownToLine size={18} style={{ color: '#1d4ed8' }} /> },
                    { title: 'Bounced / Dishonored', value: bouncedAmount, color: '#ff4d4f', prefix: '৳', icon: <Ban size={18} style={{ color: '#ff4d4f' }} /> },
                ].map((s, i) => (
                    <Col xs={12} sm={6} key={i}>
                        <Card className="glass-card" size="small">
                            <Statistic
                                title={<Text type="secondary" style={{ fontSize: 12 }}>{s.title}</Text>}
                                value={s.value} prefix={s.prefix}
                                valueStyle={{ color: s.color, fontSize: 22, fontWeight: 700 }}
                                formatter={s.prefix === '৳' ? (v) => formatCurrency(v) : undefined}
                            />
                        </Card>
                    </Col>
                ))}
            </Row>

            <Tabs defaultActiveKey="cheques" items={[
                {
                    key: 'cheques',
                    label: <Space> Cheque register ({cheques.length})</Space>,
                    children: (
                        <Card className="glass-card" extra={
                            <Button type="primary" onClick={() => setIsChequeModal(true)}>Deposit cheque</Button>
                        }>
                            <Table dataSource={cheques} columns={chequeColumns} rowKey="id"
                                pagination={{ pageSize: 10 }}
                                locale={{ emptyText: <Empty description="No cheques deposited yet." /> }}
                            />
                        </Card>
                    )
                },
                {
                    key: 'accounts',
                    label: <Space><Landmark size={14} /> Bank Accounts ({accounts.length})</Space>,
                    children: (
                        <Card className="glass-card" extra={
                            <Button type="primary" onClick={() => setIsAccountModal(true)}>Add Account</Button>
                        }>
                            <Table dataSource={accounts} columns={accountColumns} rowKey="id" pagination={false}
                                locale={{ emptyText: <Empty description="No bank accounts." /> }}
                            />
                        </Card>
                    )
                },
                {
                    key: 'bounced',
                    label: <Space><Ban size={14} /> Bounced Report ({bouncedCheques.length})</Space>,
                    children: (
                        <Card className="glass-card" title={<Text strong style={{ color: '#ff4d4f' }}>Dishonored Cheque Report</Text>}>
                            {bouncedCheques.length === 0 ? <Empty description="No bounced cheques! 🎉" /> : (
                                <Table
                                    dataSource={bouncedCheques}
                                    rowKey="id"
                                    pagination={false}
                                    columns={[
                                        { title: 'Cheque #', dataIndex: 'chequeNo', render: (v) => <Text strong>{v}</Text> },
                                        { title: 'Payer/Company', dataIndex: 'payerName', render: (v) => <Text strong style={{ color: '#ff4d4f' }}>{v}</Text> },
                                        { title: 'Amount', dataIndex: 'amount', render: (v) => <Text strong>৳ {formatCurrency(v)}</Text> },
                                        { title: 'Source', dataIndex: 'source', render: (v) => <Tag>{v}</Tag> },
                                        { title: 'Bounced Date', dataIndex: 'bouncedDate', render: (v) => v ? dayjs(v).format('DD MMM YYYY') : '—' },
                                        { title: 'Status', dataIndex: 'status', render: getStatusTag },
                                        { title: 'Action', render: (_, row) => row.status === 'Bounced' && isAdmin ? (
                                            <Button size="small" type="primary" onClick={() => handleSettlement(row.id)}>Mark Settled</Button>
                                        ) : row.status === 'Settled' ? <Tag color="green">Resolved</Tag> : null }
                                    ]}
                                />
                            )}
                        </Card>
                    )
                }
            ]} />

            {/* Add Account Modal */}
            <Modal title="Add Bank Account" open={isAccountModal} onCancel={() => setIsAccountModal(false)} onOk={() => accountForm.submit()} okText="Add">
                <Form form={accountForm} layout="vertical" onFinish={handleAddAccount}>
                    <Form.Item name="bankName" label="Bank Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Islami Bank, Dutch Bangla" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="accountNo" label="Account No" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="branch" label="Branch"><Input /></Form.Item></Col>
                    </Row>
                    <Form.Item name="initialBalance" label="Opening Balance"><InputNumber style={{ width: '100%' }} prefix="৳" /></Form.Item>
                </Form>
            </Modal>

            {/* Deposit Cheque Modal */}
            <Modal title="Deposit Cheque" open={isChequeModal} onCancel={() => setIsChequeModal(false)} onOk={() => chequeForm.submit()} okText="Deposit" width={600}>
                <Form form={chequeForm} layout="vertical" onFinish={handleDepositCheque}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="chequeNo" label="Cheque Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}>
                            <Form.Item name="bankAccountId" label="Deposit To" rules={[{ required: true }]}>
                                <Select placeholder="Select bank account">
                                    {accounts.map(a => <Option key={a.id} value={a.id}>{a.bankName} — {a.accountNo}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="amount" label="Amount" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} prefix="৳" min={1} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="payerName" label="Payer / Company"><Input /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={8}><Form.Item name="source" label="Source" initialValue="Rent-A-Car">
                            <Select><Option value="Rent-A-Car">Rent-A-Car</Option><Option value="Service">Service</Option><Option value="Parts Sale">Parts Sale</Option><Option value="Other">Other</Option></Select>
                        </Form.Item></Col>
                        <Col span={8}><Form.Item name="depositDate" label="Deposit Date"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={8}><Form.Item name="clearingDate" label="Expected Clearing"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="notes" label="Notes"><Input.TextArea rows={2} /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default BankingModule;




