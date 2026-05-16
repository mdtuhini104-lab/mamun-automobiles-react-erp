import React from 'react';
import { Card, Button, Table, Modal, Form, Input, InputNumber, Select, Typography, Space, message, Tag, Row, Col, DatePicker, Checkbox, AutoComplete } from 'antd';

import { getFromLocalStorage, syncToLocalStorage } from './utils/helpers';
import dayjs from 'dayjs';
import { useGlobalState } from './contexts/GlobalStateContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const defaultExpenses = [];

const ExpensesPage = () => {
    // State for Expenses (initialized from Global State)
    const { expenses, salaries, addExpense } = useGlobalState();

    const [searchText, setSearchText] = React.useState('');
    const [dateRange, setDateRange] = React.useState(null);
    const [isExpenseModalVisible, setIsExpenseModalVisible] = React.useState(false);
    const [isStaffPayment, setIsStaffPayment] = React.useState(false);

    const [expenseForm] = Form.useForm();

    const staffOptions = React.useMemo(() => {
        const names = new Set((salaries || []).map(s => s.staffName).filter(Boolean));
        return Array.from(names).map(n => ({ value: n }));
    }, [salaries]);

    // Filtering Expenses based on search and date range
    const filteredExpenses = expenses.filter(e => {
        const matchesSearch = e.title.toLowerCase().includes(searchText.toLowerCase()) ||
            e.category.toLowerCase().includes(searchText.toLowerCase());

        let matchesDate = true;
        if (dateRange && dateRange[0] && dateRange[1]) {
            const expDate = dayjs(e.date).startOf('day');
            matchesDate = (expDate.isAfter(dateRange[0].startOf('day')) || expDate.isSame(dateRange[0].startOf('day'))) &&
                (expDate.isBefore(dateRange[1].endOf('day')) || expDate.isSame(dateRange[1].endOf('day')));
        }

        return matchesSearch && matchesDate;
    });

    // Columns for Expense Table
    const columns = [
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            render: (date) => dayjs(date).format('DD MMM, YYYY'),
            sorter: (a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf(),
            defaultSortOrder: 'descend',
        },
        {
            title: 'Expense Title',
            dataIndex: 'title',
            key: 'title',
            render: (text) => <Text style={{ color: '#FFF', fontWeight: 700 }}>{text}</Text>,
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (text) => <Tag color="orange">{text}</Tag>,
        },
        {
            title: 'Payment Method',
            dataIndex: 'paymentMethod',
            key: 'paymentMethod',
            render: (text) => <Tag color="blue">{text}</Tag>,
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => (
                <Text type="danger" strong>
                    ৳ {(Number(amount) || 0).toLocaleString()}
                </Text>
            ),
            sorter: (a, b) => a.amount - b.amount
        }
    ];

    // Handlers
    const handleAddExpense = (values) => {
        const newExpense = {
            id: Date.now().toString(),
            date: values.date ? values.date.toISOString() : dayjs().toISOString(),
            title: values.title,
            category: isStaffPayment ? values.staffPaymentType : values.category,
            amount: values.amount,
            paymentMethod: values.paymentMethod,
            isStaffPayment: isStaffPayment,
            staffName: isStaffPayment ? values.staffName : null
        };
        addExpense(newExpense);
        setIsExpenseModalVisible(false);
        expenseForm.resetFields();
        setIsStaffPayment(false);
        message.success("Expense recorded successfully!");
    };

    return (
        <div className="expenses-container" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.2px' }}>Expenses tracking</Title>
                    <Text style={{ color: '#3B82F6', fontWeight: 600, fontSize: 11, letterSpacing: '0.2px' }}>Daily vouchers | Operational costs | Staff payments</Text>
                </div>
                <Button
                    size="large"
                    onClick={() => setIsExpenseModalVisible(true)}
                    style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0, letterSpacing: '0.2px' }}
                >
                    Add new expense
                </Button>
            </div>

            <div className="glass-card" style={{ padding: '24px' }}>
                <Row gutter={16} style={{ marginBottom: 24 }}>
                    <Col span={8}>
                        <Input
                            placeholder="Search by title or category..."
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF' }}
                        />
                    </Col>
                    <Col span={8}>
                        <RangePicker
                            style={{ width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}
                            onChange={(dates) => setDateRange(dates)}
                            allowClear
                        />
                    </Col>
                </Row>
                <Table
                    columns={columns}
                    dataSource={filteredExpenses}
                    rowKey="id"
                    pagination={{ pageSize: 15 }}
                    className="luxury-table"
                />
            </div>

            {/* Add Expense Modal */}
            <Modal
                title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>Record new expense</span>}
                open={isExpenseModalVisible}
                onCancel={() => {
                    setIsExpenseModalVisible(false);
                    expenseForm.resetFields();
                    setIsStaffPayment(false);
                }}
                footer={null}
                className="luxury-modal"
                destroyOnClose
            >
                <Form
                    form={expenseForm}
                    layout="vertical"
                    onFinish={handleAddExpense}
                    initialValues={{ date: dayjs(), paymentMethod: 'Cash' }}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="date"
                        label="Date"
                        rules={[{ required: true, message: 'Please select a date' }]}
                    >
                        <DatePicker style={{ width: '100%' }} size="large" format="DD MMM, YYYY" />
                    </Form.Item>

                    <Form.Item
                        name="title"
                        label="Expense Title / Description"
                        rules={[{ required: true, message: 'Please enter expense description' }]}
                    >
                        <Input placeholder="e.g., Bought engine oil, Paid electricity bill" size="large" />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 8 }}>
                        <Checkbox checked={isStaffPayment} onChange={e => setIsStaffPayment(e.target.checked)}>
                            Is Staff Payment?
                        </Checkbox>
                    </Form.Item>

                    {isStaffPayment && (
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="staffName" label="Staff Name" rules={[{ required: true, message: 'Please select or enter staff name' }]}>
                                    <AutoComplete options={staffOptions} placeholder="Select or type staff name" size="large" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="staffPaymentType" label="Payment Category" rules={[{ required: true, message: 'Please select category' }]}>
                                    <Select placeholder="Select category" size="large">
                                        <Option value="Salary Advance">Salary Advance</Option>
                                        <Option value="Partial Salary">Partial Salary</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Row gutter={16}>
                        {!isStaffPayment && (
                            <Col span={12}>
                                <Form.Item
                                    name="category"
                                    label="Category"
                                    rules={[{ required: true, message: 'Please select a category' }]}
                                >
                                    <Select placeholder="Select category" size="large">
                                        <Option value="Parts Purchases">Parts Purchases</Option>
                                        <Option value="Utility Bills">Utility Bills</Option>
                                        <Option value="Staff Salary">Staff Salary</Option>
                                        <Option value="Rent">Rent</Option>
                                        <Option value="Food/Entertainment">Food/Entertainment</Option>
                                        <Option value="Maintenance">Maintenance</Option>
                                        <Option value="Other">Other</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        )}
                        <Col span={isStaffPayment ? 24 : 12}>
                            <Form.Item
                                name="paymentMethod"
                                label="Payment Method"
                                rules={[{ required: true, message: 'Please select payment method' }]}
                            >
                                <Select placeholder="Select method" size="large">
                                    <Option value="Cash">Cash</Option>
                                    <Option value="Bank Transfer">Bank Transfer</Option>
                                    <Option value="bKash/Nagad">bKash/Nagad</Option>
                                    <Option value="Credit Card">Credit Card</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item
                        name="amount"
                        label="Expense Amount"
                        rules={[{ required: true, message: 'Please enter the amount' }]}
                    >
                        <InputNumber
                            min={1}
                            placeholder="0"
                            size="large"
                            style={{ width: '100%' }}
                            formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\৳\s?|(,*)/g, '')}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { setIsExpenseModalVisible(false); expenseForm.resetFields(); setIsStaffPayment(false); }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Save Expense
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ExpensesPage;




