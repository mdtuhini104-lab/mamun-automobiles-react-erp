import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';
import { Card, Button, Table, Typography, Space, Tag, Modal, Form, Input, InputNumber, Row, Col, Select, Upload, message } from 'antd';
import { PictureOutlined, PrinterOutlined } from '@ant-design/icons';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import { applyAntiGravityFix } from './utils/printAssistant';

import { useGlobalState } from './contexts/GlobalStateContext';
import dayjs from 'dayjs';

import databaseBridge from './services/databaseBridge';

const { Title, Text } = Typography;
const { Option } = Select;

const PrintUsedAgreement = ({ item, type = 'Sale' }) => {
    if (!item) return null;
    return createPortal(
        <div id="used-print-area" className="alive-print-area">
            <BrandedDocumentHeader
                title={type === 'Sale' ? "Used item sale receipt // বিক্রয় রসিদ" : "Used item purchase record // ক্রয় রেকর্ড"}
                subtitle="Mamun Automobiles // Used Hub"
                meta={[
                    { label: 'Date', value: dayjs().format('DD MMM YYYY') },
                    { label: 'Reference', value: item.id || 'REF-NEW' }
                ]}
            />

            <div style={{ marginTop: 30 }}>
                <Title level={4} style={{ borderBottom: '1px solid #333', paddingBottom: 5 }}>Transaction Details</Title>
                <Row gutter={16}>
                    <Col span={12}>
                        <p><strong>Item Name:</strong> {item.name}</p>
                        <p><strong>Condition:</strong> {item.condition}</p>
                        {item.id && <p><strong>Item ID:</strong> {item.id}</p>}
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                        <p><strong>{type === 'Sale' ? 'Buyer' : 'Seller'}:</strong> {type === 'Sale' ? item.buyerName : item.sellerName}</p>
                        <p><strong>Phone:</strong> {type === 'Sale' ? item.buyerPhone : item.sellerPhone}</p>
                        <p><strong>Amount:</strong> <span style={{ fontSize: 18, fontWeight: 600 }}>৳ {Number(type === 'Sale' ? item.salePrice : item.purchasePrice).toLocaleString()}</span></p>
                    </Col>
                </Row>
            </div>

            <div style={{ flexGrow: 1, marginTop: 40 }}>
                <Title level={5}>Terms & Conditions</Title>
                <ul style={{ paddingLeft: 20, fontSize: 12 }}>
                    <li>১. ব্যবহৃত পণ্য বিক্রয় পরবর্তী কোনো ওয়ারেন্টি বা গ্যারান্টি প্রদান করা হয় না (যদি না আলাদাভাবে উল্লেখ থাকে)।</li>
                    <li>২. পণ্য বুঝে নেওয়ার পর কোনো অভিযোগ গ্রহণ করা হবে না।</li>
                    <li>৩. This document serves as a legal proof of transaction between Mamun Automobiles and the client.</li>
                    <li>৪. Non-refundable and non-exchangeable after 24 hours.</li>
                </ul>
            </div>

            <div className="alive-footer-lock" style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', paddingBottom: 20, borderTop: '2px solid #333', paddingTop: 20 }}>
                <div style={{ textAlign: 'center', width: '200px' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: 5, fontWeight: 600 }}>Authorized signature</div>
                </div>
                <div style={{ textAlign: 'center', width: '200px' }}>
                    <div style={{ borderTop: '1px solid #000', paddingTop: 5, fontWeight: 600 }}>Customer signature</div>
                </div>
            </div>

        </div>,
        document.body
    );
};

const UsedBuySell = () => {
    const [usedItems, setUsedItems] = React.useState([]);
    const { expenses, payments, setPayments, logActivity, addExpense, addPayment } = useGlobalState();

    const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
    const [isSellModalVisible, setIsSellModalVisible] = React.useState(false);
    const [selectedItem, setSelectedItem] = React.useState(null);
    const [previewImage, setPreviewImage] = React.useState(null);

    const [addForm] = Form.useForm();
    const [sellForm] = Form.useForm();

    const [isPrinting, setIsPrinting] = React.useState(false);
    const [printingItem, setPrintingItem] = React.useState(null);

    React.useEffect(() => {
        if (isPrinting && printingItem) {
            bufferedPrint(() => {
                setIsPrinting(false);
                setPrintingItem(null);
            });
        }
    }, [isPrinting, printingItem]);

    React.useEffect(() => {
        databaseBridge.fetchUsedItems().then(items => {
            if (items && Array.isArray(items)) {
                setUsedItems(items.filter(Boolean));
            }
        }).catch(err => console.error(err));
    }, []);

    const handleAddItem = async (values) => {
        const newItem = {
            ...values,
            id: 'REF-' + Math.random().toString(36).substr(2, 9),
            status: 'Available',
            dateBought: dayjs().toISOString()
        };

        try {
            await databaseBridge.addUsedItem(newItem);
            setUsedItems([newItem, ...usedItems]);

            // Add as expense
            addExpense({
                category: 'Used Car Purchase',
                amount: values.purchasePrice,
                description: `Bought ${values.name} (${newItem.id})`,
                date: dayjs().toISOString()
            });

            setIsAddModalVisible(false);
            addForm.resetFields();
            message.success('Item added to hub!');
        } catch (err) {
            console.error(err);
            message.error('Database connection failed.');
        }
    };

    const handleSellItem = async (values) => {
        if (!selectedItem) return;

        const updated = {
            ...selectedItem,
            buyerName: values.buyerName,
            buyerPhone: values.buyerPhone,
            salePrice: values.salePrice,
            status: 'Sold',
            dateSold: dayjs().toISOString()
        };

        try {
            await databaseBridge.updateUsedItem(updated);
            setUsedItems(usedItems.map(it => it.id === selectedItem.id ? updated : it));

            // Add as payment/revenue
            addPayment({
                invoiceId: updated.id,
                amount: values.salePrice,
                customerName: values.buyerName,
                date: dayjs().toISOString(),
                method: 'Cash'
            });

            setIsSellModalVisible(false);
            sellForm.resetFields();
            message.success('Item marked as sold');
        } catch (err) {
            console.error(err);
        }
    };

    const columns = [
        { title: 'Item Name', dataIndex: 'name', key: 'name' },
        { title: 'Condition', dataIndex: 'condition', key: 'condition' },
        { title: 'Status', dataIndex: 'status', key: 'status', render: (st) => <Tag color={st === 'Available' ? 'green' : 'red'}>{st}</Tag> },
        { title: 'Buy Price', dataIndex: 'purchasePrice', key: 'purchasePrice', render: (v) => `৳${Number(v || 0).toLocaleString()}` },
        { title: 'Actions', key: 'actions', render: (_, record) => (
            <Space>
                {record.status === 'Available' ? (
                    <Button type="primary" size="small" onClick={() => { setSelectedItem(record); setIsSellModalVisible(true); }}>Mark sold</Button>
                ) : (
                    <Button 
                        icon={<PrinterOutlined />} 
                        size="small"
                        style={{ background: '#000', color: '#fff' }}
                        onClick={() => { setPrintingItem(record); setIsPrinting(true); }}
                    >
                        Receipt
                    </Button>
                )}
            </Space>
        )}
    ];

    return (
        <div style={{ padding: '24px' }}>
            {isPrinting && printingItem && <PrintUsedAgreement item={printingItem} type="Sale" />}
            
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <Title level={2}>Used car & parts hub</Title>
                <Button type="primary" onClick={() => setIsAddModalVisible(true)}>+ Buy new item</Button>
            </div>

            <Row gutter={[16, 16]}>
                <Col span={24}>
                    <Card className="glass-card">
                        <Table dataSource={usedItems} columns={columns} rowKey="id" />
                    </Card>
                </Col>
            </Row>

            <Modal title="Buy New Item" open={isAddModalVisible} onCancel={() => setIsAddModalVisible(false)} onOk={() => addForm.submit()}>
                <Form form={addForm} onFinish={handleAddItem} layout="vertical">
                    <Form.Item name="name" label="Item Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="purchasePrice" label="Cost Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="condition" label="Condition" initialValue="Used">
                        <Select>
                            <Option value="New">New</Option>
                            <Option value="Like New">Like New</Option>
                            <Option value="Used">Used</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="sellerName" label="Source/Seller Name"><Input /></Form.Item>
                    <Form.Item name="sellerPhone" label="Source Phone"><Input /></Form.Item>
                </Form>
            </Modal>

            <Modal title="Mark as Sold" open={isSellModalVisible} onCancel={() => setIsSellModalVisible(false)} onOk={() => sellForm.submit()}>
                <Form form={sellForm} onFinish={handleSellItem} layout="vertical">
                    <Form.Item name="buyerName" label="Buyer Name" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="buyerPhone" label="Buyer Phone" rules={[{ required: true }]}><Input /></Form.Item>
                    <Form.Item name="salePrice" label="Sale Price" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default UsedBuySell;
