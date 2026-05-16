import React from 'react';
import { Card, Button, Table, Modal, Form, Input, InputNumber, Select, Typography, Space, message, Tag, Row, Col, DatePicker } from 'antd';

import dayjs from 'dayjs';
import { useGlobalState } from './contexts/GlobalStateContext';
import { t } from './utils/translations';

const { Title, Text } = Typography;
const { Option } = Select;

const DailyExpenseSubModule = () => {
    const { expenses, addExpense, language } = useGlobalState();
    const [isModalVisible, setIsModalVisible] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const [form] = Form.useForm();

    // Filter for today's expenses by default, or search text
    const today = dayjs().startOf('day');
    
    const filteredExpenses = (expenses || []).filter(exp => {
        const expDate = dayjs(exp.date);
        const isToday = expDate.isSame(today, 'day');
        const matchesSearch = exp.title?.toLowerCase().includes(searchText.toLowerCase()) || 
                             exp.category?.toLowerCase().includes(searchText.toLowerCase());
        
        // Show today's expenses by default, or all if searching
        if (searchText) return matchesSearch;
        return isToday;
    });

    const columns = [
        {
            title: t('time', language),
            dataIndex: 'date',
            key: 'time',
            render: (date) => dayjs(date).format('hh:mm A'),
            width: 100,
        },
        {
            title: t('expense_detail', language),
            dataIndex: 'title',
            key: 'title',
            render: (text) => <Text strong>{text}</Text>,
        },
        {
            title: t('category', language),
            dataIndex: 'category',
            key: 'category',
            render: (cat) => <Tag color="blue">{cat}</Tag>,
            width: 120,
        },
        {
            title: t('method', language),
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (method) => <Tag color="cyan">{method}</Tag>,
            width: 100,
        },
        {
            title: t('amount', language),
            dataIndex: 'amount',
            key: 'amount',
            align: 'right',
            render: (amt) => <Text type="danger" strong>৳ {Number(amt).toLocaleString()}</Text>,
            width: 120,
        },
    ];

    const handleSubmit = (values) => {
        const newExpense = {
            id: Date.now().toString(),
            date: dayjs().toISOString(),
            title: values.title,
            category: values.category,
            amount: values.amount,
            paymentMethod: values.paymentMethod || 'Cash',
            isStaffPayment: false
        };
        addExpense(newExpense);
        message.success(t('expense_recorded_success', language));
        setIsModalVisible(false);
        form.resetFields();
    };

    const totalToday = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

    return (
        <div style={{ padding: '0 0 24px 0' }}>
            <Row gutter={[16, 16]} align="middle" style={{ marginBottom: 20 }}>
                <Col xs={24} md={12}>
                    <Title level={4} style={{ margin: 0, fontWeight: 600 }}>
                        <Space>
                            
                            {t('daily_expenses', language)} - {dayjs().format('DD MMM YYYY')}
                        </Space>
                    </Title>
                </Col>
                <Col xs={24} md={12} style={{ textAlign: 'right' }}>
                    <Space>
                        <Input 
                            placeholder={t('search_expenses', language)} 
                            onChange={e => setSearchText(e.target.value)}
                            style={{ width: 200 }}
                        />
                        <Button 
                            type="primary" 
                            onClick={() => setIsModalVisible(true)}
                            style={{ background: '#10b981', borderColor: '#10b981' }}
                        >
                            {t('add_expense', language)}
                        </Button>
                    </Space>
                </Col>
            </Row>

            <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" className="glass-card" style={{ borderLeft: '4px solid #ef4444' }}>
                        <Text type="secondary" size="small">{t('total_today', language)}</Text>
                        <Title level={3} style={{ margin: 0, color: '#ef4444', fontWeight: 600 }}>৳ {totalToday.toLocaleString()}</Title>
                    </Card>
                </Col>
                <Col xs={24} sm={12} md={6}>
                    <Card size="small" className="glass-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <Text type="secondary" size="small">{t('entries', language)}</Text>
                        <Title level={3} style={{ margin: 0, fontWeight: 600 }}>{filteredExpenses.length}</Title>
                    </Card>
                </Col>
            </Row>

            <Table 
                dataSource={filteredExpenses} 
                columns={columns} 
                rowKey="id"
                pagination={{ pageSize: 10 }}
                className="custom-table"
                summary={() => (
                    <Table.Summary fixed>
                        <Table.Summary.Row>
                            <Table.Summary.Cell index={0} colSpan={4} align="right">
                                <Text strong>{t('total', language)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                                <Text strong type="danger">৳ {totalToday.toLocaleString()}</Text>
                            </Table.Summary.Cell>
                        </Table.Summary.Row>
                    </Table.Summary>
                )}
            />

            <Modal
                title={t('record_daily_expense', language)}
                open={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                footer={null}
                className="glass-modal"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmit}>
                    <Form.Item name="title" label={t('expense_title', language)} rules={[{ required: true }]}>
                        <Input placeholder={language === 'bn' ? 'উদাহরণ: চা এবং নাস্তা, অফিস সরঞ্জাম' : 'e.g. Tea & Snacks, Office Stationery'} />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="amount" label="Amount (৳)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="0.00" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="category" label={t('category', language)} rules={[{ required: true }]}>
                                <Select placeholder={t('select_category', language)}>
                                    <Option value="Office Supply">Office Supply</Option>
                                    <Option value="Food & Snacks">Food & Snacks</Option>
                                    <Option value="Maintenance">Maintenance</Option>
                                    <Option value="Utility">Utility</Option>
                                    <Option value="Other">Other</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="paymentMethod" label={t('settlement_method', language)} initialValue="Cash">
                        <Select>
                            <Option value="Cash">Cash</Option>
                            <Option value="Bank">Bank</Option>
                            <Option value="Bkash">Bkash</Option>
                            <Option value="Nagad">Nagad</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsModalVisible(false)}>{t('cancel', language)}</Button>
                            <Button type="primary" htmlType="submit">{t('record_purchase', language)}</Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default DailyExpenseSubModule;




