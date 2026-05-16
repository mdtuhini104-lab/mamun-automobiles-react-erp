import React from 'react';
import { Card, Button, Typography, Space, Tag, Modal, Form, Input, InputNumber, Row, Col, Select, message, Empty, Divider } from 'antd';
import { ShoppingCartOutlined, DollarOutlined, CalendarOutlined, CarOutlined } from '@ant-design/icons';
import { useGlobalState } from './contexts/GlobalStateContext';
import dayjs from 'dayjs';
import databaseBridge from './services/databaseBridge';

const { Title, Text } = Typography;
const { Option } = Select;

const CarSellingPage = () => {
    const { carInventory, setCarInventory, carSales, setCarSales, addPayment, logActivity } = useGlobalState();
    const [isSellModalVisible, setIsSellModalVisible] = React.useState(false);
    const [selectedCar, setSelectedCar] = React.useState(null);
    const [paymentType, setPaymentType] = React.useState('Full');
    const [sellForm] = Form.useForm();

    const inStockCars = React.useMemo(() => (carInventory || []).filter(c => c.status === 'In Stock'), [carInventory]);

    const handleSellCar = async (values) => {
        if (!selectedCar) return;

        const saleData = {
            carId: selectedCar._id,
            customerId: values.customerId || 'WALK-IN',
            customerName: values.customerName,
            salePrice: values.salePrice,
            saleDate: dayjs().toISOString(),
            paymentType: values.paymentType,
            emiPlan: values.paymentType === 'EMI' ? {
                totalInstallments: values.totalInstallments,
                amountPerInstallment: (values.salePrice - values.downPayment) / values.totalInstallments,
                downPayment: values.downPayment,
                installmentsPaid: 0,
                nextInstallmentDate: dayjs().add(1, 'month').toISOString()
            } : null,
            status: values.paymentType === 'EMI' ? 'Pending EMI' : 'Completed'
        };

        try {
            const savedSale = await databaseBridge.addCarSale(saleData);
            setCarSales([savedSale, ...(carSales || [])]);
            
            // Update inventory status local state
            setCarInventory(prev => prev.map(c => c._id === selectedCar._id ? { ...c, status: 'Sold' } : c));

            // Record Initial Payment (Income)
            const receivedAmount = values.paymentType === 'EMI' ? values.downPayment : values.salePrice;
            addPayment({
                id: `PAY-CAR-${Date.now()}`,
                date: dayjs().toISOString(),
                amount: receivedAmount,
                customerName: values.customerName,
                method: 'Cash',
                description: `Sale of ${selectedCar.make} ${selectedCar.model} (${values.paymentType})`
            });

            logActivity(`Sold ${selectedCar.make} for ৳${values.salePrice} (${values.paymentType})`);
            message.success('Car Sale recorded successfully!');
            setIsSellModalVisible(false);
            sellForm.resetFields();
        } catch (err) {
            message.error('Failed to record sale: ' + err.message);
        }
    };

    return (
        <div style={{ padding: '0 0px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Showroom & sales</Title>
                <Text type="secondary">Manage car sales, gallery, and installment plans</Text>
            </div>

            <Row gutter={[24, 24]}>
                {inStockCars.length === 0 ? (
                    <Col span={24}><Empty description="No cars in stock. Buy some cars first!" /></Col>
                ) : (
                    inStockCars.map(car => (
                        <Col xs={24} sm={12} md={8} lg={6} key={car._id}>
                            <Card
                                hoverable
                                cover={
                                    <div style={{ height: 180, background: '#f0f2f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <CarOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
                                    </div>
                                }
                                actions={[
                                    <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => {
                                        setSelectedCar(car);
                                        sellForm.setFieldsValue({ salePrice: car.askingPrice });
                                        setIsSellModalVisible(true);
                                    }}>
                                        Sell Car
                                    </Button>
                                ]}
                                className="glass-card shadow-sm"
                            >
                                <Card.Meta
                                    title={`${car.make} ${car.model}`}
                                    description={
                                        <Space direction="vertical" size={2}>
                                            <Tag color="blue">{car.year} Model</Tag>
                                            <Text strong style={{ fontSize: 16 }}>৳{car.askingPrice?.toLocaleString() || 'Ref Price'}</Text>
                                            <Text type="secondary" style={{ fontSize: 12 }}>Investment: ৳{car.totalInvestment.toLocaleString()}</Text>
                                        </Space>
                                    }
                                />
                            </Card>
                        </Col>
                    ))
                )}
            </Row>

            {/* SELL CAR MODAL */}
            <Modal
                title={`Sell Vehicle: ${selectedCar?.make} ${selectedCar?.model}`}
                open={isSellModalVisible}
                onCancel={() => setIsSellModalVisible(false)}
                footer={null}
                width={700}
            >
                <Form 
                    layout="vertical" 
                    form={sellForm} 
                    onFinish={handleSellCar}
                    initialValues={{ paymentType: 'Full' }}
                    onValuesChange={(changed) => {
                        if (changed.paymentType) setPaymentType(changed.paymentType);
                    }}
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}>
                                <Input placeholder="Enter buyer name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="customerId" label="Customer ID (Optional)">
                                <Input placeholder="Link to existing customer" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="salePrice" label="Final Sale Price (৳)" rules={[{ required: true }]}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="paymentType" label="Sale Type" rules={[{ required: true }]}>
                                <Select>
                                    <Option value="Full">Full Payment</Option>
                                    <Option value="EMI">EMI / Installment</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        
                        {paymentType === 'EMI' && (
                            <>
                                <Col span={24}><Divider><CalendarOutlined /> EMI Configuration</Divider></Col>
                                <Col span={12}>
                                    <Form.Item name="downPayment" label="Down Payment (৳)" rules={[{ required: true }]}>
                                        <InputNumber style={{ width: '100%' }} min={0} />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="totalInstallments" label="Total Installments (Months)" rules={[{ required: true }]}>
                                        <InputNumber style={{ width: '100%' }} min={1} />
                                    </Form.Item>
                                </Col>
                                <Col span={24}>
                                    <div style={{ background: '#f5f5f5', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                        <Text type="secondary">Remaining balance will be split equally across installments.</Text>
                                    </div>
                                </Col>
                            </>
                        )}
                    </Row>
                    
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsSellModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" icon={<DollarOutlined />}>Confirm Sale</Button>
                        </Space>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default CarSellingPage;




