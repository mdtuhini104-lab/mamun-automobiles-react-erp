import React from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Select, Tag, Space,
    Typography, Row, Col, Statistic, message, Divider, Alert, Badge
} from 'antd';


import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const LoanManagementPage = () => {
    const [loans, setLoans] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isPayModalOpen, setIsPayModalOpen] = React.useState(false);
    const [selectedLoan, setSelectedLoan] = React.useState(null);
    const [addForm] = Form.useForm();
    const [payForm] = Form.useForm();
    const [saving, setSaving] = React.useState(false);

    const loadLoans = React.useCallback(async () => {
        setLoading(true);
        try {
            const list = await databaseBridge.fetchLoans();
            setLoans(list);
        } catch (err) {
            message.error('Failed to load loans.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { loadLoans(); }, [loadLoans]);

    const handleAddLoan = async (values) => {
        setSaving(true);
        try {
            await databaseBridge.addLoan({
                ...values,
                balance: values.principal,
                status: 'Active',
                nextDueDate: values.startDate
            });
            message.success('Loan account created.');
            setIsAddModalOpen(false);
            addForm.resetFields();
            loadLoans();
        } catch (err) {
            message.error('Failed to create loan.');
        } finally {
            setSaving(false);
        }
    };

    const handlePayInstallment = async (values) => {
        if (!selectedLoan) return;
        setSaving(true);
        try {
            await databaseBridge.payLoanInstallment(selectedLoan.id, values);
            message.success('Installment recorded.');
            setIsPayModalOpen(false);
            payForm.resetFields();
            loadLoans();
        } catch (err) {
            message.error('Failed to record payment.');
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        { title: 'Bank / Source', dataIndex: 'bankName', key: 'bank', render: (t) => <Text strong>{t}</Text> },
        {
            title: 'Outstanding',
            dataIndex: 'balance',
            render: b => <Text strong>৳ {b.toLocaleString()}</Text>
        },
        {
            title: 'Next EMI Date',
            dataIndex: 'nextDueDate',
            render: d => {
                const diff = dayjs(d).diff(dayjs(), 'day');
                const isNear = diff <= 5 && diff >= 0;
                return (
                    <Space>
                        
                        <Text type={isNear ? 'danger' : 'secondary'}>{dayjs(d).format('DD MMM, YYYY')}</Text>
                        {isNear && <Badge status="error" text="Near Due" />}
                    </Space>
                );
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: s => <Tag color={s === 'Active' ? 'blue' : 'gray'}>{s}</Tag>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, r) => (
                <Space>
                    <Button type="primary" size="small" onClick={() => { setSelectedLoan(r); setIsPayModalOpen(true); }}>Pay EMI</Button>
                </Space>
            )
        }
    ];

    return (
        <div className="loan-page">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <Title level={2}>Loan Tracking & EMI</Title>
                <Space>
                    <Button onClick={loadLoans}>Refresh</Button>
                    <Button type="primary" onClick={() => setIsAddModalOpen(true)}>New Loan Account</Button>
                </Space>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col span={8}>
                    <Card size="small" className="glass-card navy-shadow">
                        <Statistic title="Total Debt" value={loans.reduce((a, b) => a + (b.balance || 0), 0)} prefix={<HandCoins size={18} />} valueStyle={{ color: '#cf1322' }} />
                    </Card>
                </Col>
                <Col span={8}>
                    <Card size="small" className="glass-card navy-shadow">
                        <Statistic title="Active EMI Plans" value={loans.filter(l => l.status === 'Active').length} />
                    </Card>
                </Col>
            </Row>

            <Card className="glass-card">
                <Table columns={columns} dataSource={loans} rowKey="id" loading={loading} />
            </Card>

            <Modal title="Setup Loan Account" open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)} onOk={() => addForm.submit()} confirmLoading={saving}>
                <Form form={addForm} onFinish={handleAddLoan} layout="vertical">
                    <Form.Item name="bankName" label="Bank Name / Credit Source" rules={[{ required: true }]}>
                        <Input placeholder="e.g. City Bank / IDLC" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="principal" label="Principal Amount" rules={[{ required: true }]}>
                                <Input type="number" prefix="৳" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="emiAmount" label="Monthly EMI" rules={[{ required: true }]}>
                                <Input type="number" prefix="৳" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="startDate" label="Next EMI Due Date" rules={[{ required: true }]}>
                        <Input type="date" />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title={`Pay Installment: ${selectedLoan?.bankName}`} open={isPayModalOpen} onCancel={() => setIsPayModalOpen(false)} onOk={() => payForm.submit()} confirmLoading={saving}>
                <Form form={payForm} onFinish={handlePayInstallment} layout="vertical">
                    <Form.Item name="amount" label="Payment Amount" initialValue={selectedLoan?.emiAmount} rules={[{ required: true }]}>
                        <Input type="number" prefix="৳" />
                    </Form.Item>
                    <Form.Item name="method" label="Payment Method" initialValue="Bank Transfer">
                        <Select>
                            <Option value="Bank Transfer">Bank Transfer</Option>
                            <Option value="Cash-on-Hand">Cash-on-Hand</Option>
                            <Option value="Check">Check</Option>
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default LoanManagementPage;




