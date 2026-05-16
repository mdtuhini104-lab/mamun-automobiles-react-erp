import React from 'react';
import { Card, Button, Table, Typography, Space, Tag, Modal, Form, Input, InputNumber, Row, Col, Select, message } from 'antd';

import { useGlobalState } from './contexts/GlobalStateContext';
import dayjs from 'dayjs';
import databaseBridge from './services/databaseBridge';

const { Title, Text } = Typography;
const { Option } = Select;

const CarBuyingPage = () => {
    const { carInventory, setCarInventory, addExpense, logActivity } = useGlobalState();
    const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
    const [isRepairModalVisible, setIsRepairModalVisible] = React.useState(false);
    const [selectedCar, setSelectedCar] = React.useState(null);
    const [addForm] = Form.useForm();
    const [repairForm] = Form.useForm();

    const handleAddCar = async (values) => {
        const newCar = {
            ...values,
            totalRepairCost: 0,
            totalInvestment: values.purchasePrice,
            status: 'In Stock',
            purchaseDate: dayjs().toISOString()
        };

        try {
            const savedCar = await databaseBridge.addCarInventory(newCar);
            setCarInventory([savedCar, ...(carInventory || [])]);
            
            // Record Expense
            addExpense({
                id: `EXP-CAR-${Date.now()}`,
                date: dayjs().toISOString(),
                category: 'Vehicle Purchase',
                title: `Purchased ${values.make} ${values.model}`,
                amount: values.purchasePrice,
                paymentMethod: 'Cash',
                description: `Bought from ${values.source || 'Unknown'}`
            });

            logActivity(`Purchased ${values.make} ${values.model} for ৳${values.purchasePrice}`);
            message.success('Vehicle added to inventory!');
            setIsAddModalVisible(false);
            addForm.resetFields();
        } catch (err) {
            message.error('Failed to add vehicle: ' + err.message);
        }
    };

    const handleAddRepair = async (values) => {
        if (!selectedCar) return;
        try {
            const updatedCar = await databaseBridge.addCarRepair(selectedCar.id, values);
            
            setCarInventory(prev => prev.map(c => c.id === selectedCar.id ? updatedCar : c));
            
            // Record Expense
            addExpense({
                id: `EXP-REP-${Date.now()}`,
                date: dayjs().toISOString(),
                category: 'Vehicle Repair',
                title: `Repair for ${selectedCar.make} ${selectedCar.model}`,
                amount: values.amount,
                paymentMethod: 'Cash',
                description: values.description
            });

            logActivity(`Recorded repair for ${selectedCar.make}: ${values.description} (৳${values.amount})`);
            message.success('Repair cost recorded!');
            setIsRepairModalVisible(false);
            repairForm.resetFields();
        } catch (err) {
            message.error('Failed to record repair: ' + err.message);
        }
    };

    const columns = [
        {
            title: 'Vehicle',
            key: 'vehicle',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{record.make} {record.model}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.year} | {record.plateNo || 'No Plate'}</Text>
                </Space>
            )
        },
        {
            title: 'Purchase Info',
            key: 'purchase',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text>Price: ৳{record.purchasePrice.toLocaleString()}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>Date: {dayjs(record.purchaseDate).format('DD MMM YYYY')}</Text>
                </Space>
            )
        },
        {
            title: 'Repairs',
            key: 'repairs',
            render: (_, record) => (
                <Space direction="vertical" size={0}>
                    <Text danger>৳{record.totalRepairCost.toLocaleString()}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>{record.repairCosts?.length || 0} entries</Text>
                </Space>
            )
        },
        {
            title: 'Total Investment',
            dataIndex: 'totalInvestment',
            key: 'totalInvestment',
            render: (val) => <Text strong>৳{val.toLocaleString()}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => (
                <Tag color={status === 'In Stock' ? 'green' : status === 'Sold' ? 'blue' : 'orange'}>
                    {status}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button 
                        onClick={() => {
                            setSelectedCar(record);
                            setIsRepairModalVisible(true);
                        }}
                        disabled={record.status === 'Sold'}
                    >
                        Add Repair
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '0 0px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Car buying & inventory</Title>
                    <Text type="secondary">Track vehicle purchases and repair investments</Text>
                </div>
                <Button type="primary" onClick={() => setIsAddModalVisible(true)} size="large">
                    Buy New Vehicle
                </Button>
            </div>

            <Card className="glass-card shadow-sm">
                <Table 
                    dataSource={carInventory} 
                    columns={columns} 
                    rowKey="id"
                    pagination={{ pageSize: 8 }}
                />
            </Card>

            {/* ADD VEHICLE MODAL */}
            <Modal
                title="Purchase New Vehicle"
                open={isAddModalVisible}
                onCancel={() => setIsAddModalVisible(false)}
                footer={null}
                width={600}
            >
                <Form layout="vertical" form={addForm} onFinish={handleAddCar}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="make" label="Make (Brand)" rules={[{ required: true }]}>
                                <Input placeholder="e.g. Toyota" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="model" label="Model" rules={[{ required: true }]}>
                                <Input placeholder="e.g. Corolla" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="year" label="Year">
                                <InputNumber style={{ width: '100%' }} placeholder="2018" />
                            </Form.Item>
                        </Col>
                        <Col span={16}>
                            <Form.Item name="plateNo" label="Plate Number">
                                <Input placeholder="e.g. Dhaka Metro-GA-1234" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="purchasePrice" label="Purchase Price (৳)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="askingPrice" label="Target Asking Price (৳)">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="source" label="Seller / Source">
                                <Input placeholder="e.g. Individual / Auction" />
                            </Form.Item>
                        </Col>
                    </Row>
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsAddModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">Record Purchase</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            {/* ADD REPAIR MODAL */}
            <Modal
                title={`Record Repair: ${selectedCar?.make} ${selectedCar?.model}`}
                open={isRepairModalVisible}
                onCancel={() => setIsRepairModalVisible(false)}
                footer={null}
            >
                <Form layout="vertical" form={repairForm} onFinish={handleAddRepair}>
                    <Form.Item name="description" label="Repair Description" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Engine Overhaul, New Tires" />
                    </Form.Item>
                    <Form.Item name="amount" label="Cost (৳)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} min={0} />
                    </Form.Item>
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsRepairModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit">Add to Investment</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default CarBuyingPage;




