import React from 'react';
import { Table, Button, Modal, Form, Select, InputNumber, Input, Typography, Row, Col, Space, Card, Tag, message, Divider, Spin } from 'antd';
import { PlusOutlined, HistoryOutlined, CarOutlined, InboxOutlined, RollbackOutlined, ReloadOutlined } from '@ant-design/icons';
import databaseBridge from './services/databaseBridge';
import { useGlobalState } from './contexts/GlobalStateContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const RTVDashboard = () => {
    // Defensive state access
    const globalState = useGlobalState() || {};
    const { inventory = [], suppliers = [], setInventory = () => {}, setSuppliers = () => {} } = globalState;
    
    const [rtvs, setRtvs] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [form] = Form.useForm();
    const [selectedItems, setSelectedItems] = React.useState([]);

    const fetchData = async () => {
        setLoading(true);
        try {
            console.log('[RTVDashboard] Fetching RTV data...');
            const data = await databaseBridge.fetchRTVs();
            console.log('[RTVDashboard] Fetched RTVs:', data);
            setRtvs(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('[RTVDashboard] Load error:', err);
            message.error('Failed to load RTV history');
            setRtvs([]);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
    }, []);

    const handleCreateRTV = async (values) => {
        if (!selectedItems || selectedItems.length === 0) {
            return message.warning('Please add at least one item to return.');
        }

        setLoading(true);
        try {
            const supplier = (suppliers || []).find(s => s.id === values.supplierId);
            const payload = {
                supplierId: values.supplierId,
                supplierName: supplier?.name || 'Unknown Supplier',
                notes: values.notes,
                items: selectedItems.map(it => ({
                    inventoryId: it.inventoryId,
                    name: it.name,
                    quantity: it.quantity,
                    unitCost: it.unitCost,
                    totalCost: Number(it.quantity || 0) * Number(it.unitCost || 0),
                    reason: it.reason
                }))
            };

            await databaseBridge.createRTV(payload);
            message.success('Return to Vendor (RTV) processed successfully!');
            
            // Refresh Global State
            try {
                const [newInv, newSuppliers] = await Promise.all([
                    databaseBridge.fetchCollection('inventory'),
                    databaseBridge.fetchCollection('suppliers')
                ]);
                if (setInventory) setInventory(newInv);
                if (setSuppliers) setSuppliers(newSuppliers);
            } catch (stateErr) {
                console.error('[RTVDashboard] State update error:', stateErr);
            }

            setIsModalOpen(false);
            form.resetFields();
            setSelectedItems([]);
            fetchData();
        } catch (err) {
            console.error('[RTVDashboard] Create error:', err);
            message.error('Failed to process RTV: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const addItem = () => {
        setSelectedItems([...selectedItems, { key: Date.now(), inventoryId: '', name: '', quantity: 1, unitCost: 0, reason: '' }]);
    };

    const removeItem = (key) => {
        setSelectedItems(selectedItems.filter(i => i.key !== key));
    };

    const updateItem = (key, field, value) => {
        setSelectedItems(selectedItems.map(it => {
            if (it.key === key) {
                const updated = { ...it, [field]: value };
                if (field === 'inventoryId') {
                    const inv = (inventory || []).find(i => i.id === value);
                    updated.name = inv?.partName || inv?.name || 'Unnamed Part';
                    updated.unitCost = inv?.unitPrice || inv?.purchasePrice || 0;
                }
                return updated;
            }
            return it;
        }));
    };

    const columns = [
        { title: 'RTV #', dataIndex: 'rtvNumber', key: 'rtvNumber', render: n => <Text strong>{n || 'N/A'}</Text> },
        { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName' },
        { title: 'Refund Value', dataIndex: 'totalRefundValue', key: 'totalRefundValue', render: v => `৳${(v || 0).toLocaleString()}` },
        { title: 'Status', dataIndex: 'status', key: 'status', render: s => <Tag color="blue">{s || 'Sent'}</Tag> },
        { title: 'Date', dataIndex: 'returnedDate', key: 'returnedDate', render: d => d ? dayjs(d).format('DD MMM YYYY') : 'N/A' }
    ];

    return (
        <div style={{ padding: '24px', background: 'var(--bg-main)', minHeight: '100vh' }}>
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '12px', background: 'var(--card-bg)' }}>
                <Row gutter={16} align="middle">
                    <Col span={12}>
                        <Title level={3} style={{ margin: 0, color: 'var(--text-main)' }}>Return to Vendor (RTV)</Title>
                        <Text style={{ color: 'var(--text-muted)' }}>Manage product returns and supplier credit notes.</Text>
                    </Col>
                    <Col span={12} style={{ textAlign: 'right' }}>
                        <Space>
                            <Button icon={<ReloadOutlined />} onClick={fetchData} loading={loading}>Refresh</Button>
                            <Button 
                                type="primary" 
                                icon={<RollbackOutlined />} 
                                onClick={() => setIsModalOpen(true)}
                                size="large"
                                className="premium-blue-btn"
                            >
                                Return Items
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </div>

            <Card className="glass-card shadow-sm" style={{ background: 'var(--card-bg)' }}>
                <Table 
                    columns={columns} 
                    dataSource={rtvs || []} 
                    rowKey={r => r.id || r.rtvNumber || Math.random()} 
                    loading={loading}
                    pagination={{ pageSize: 12 }}
                />
            </Card>

            <Modal
                title="Process Product Return (RTV)"
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={() => form.submit()}
                width={900}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleCreateRTV}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="supplierId" label="Select Supplier" rules={[{ required: true }]}>
                                <Select showSearch placeholder="Search Supplier">
                                    {(suppliers || []).map(s => <Option key={s.id || s._id} value={s.id || s._id}>{s.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">Return Items</Divider>
                    
                    {(selectedItems || []).map((it, idx) => (
                        <Row key={it.key} gutter={12} style={{ marginBottom: 8, background: 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '8px' }}>
                            <Col span={8}>
                                <Text style={{ fontSize: 10, display: 'block', marginBottom: 4, color: '#aaa' }}>PRODUCT</Text>
                                <Select 
                                    showSearch 
                                    style={{ width: '100%' }} 
                                    onChange={v => updateItem(it.key, 'inventoryId', v)}
                                    value={it.inventoryId}
                                >
                                    {(inventory || []).map(i => (
                                        <Option key={i.id || i._id} value={i.id || i._id}>
                                            {i.partName || i.name} ({i.quantity || 0} available)
                                        </Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col span={4}>
                                <Text style={{ fontSize: 10, display: 'block', marginBottom: 4, color: '#aaa' }}>QTY</Text>
                                <InputNumber min={1} value={it.quantity} onChange={v => updateItem(it.key, 'quantity', v)} style={{ width: '100%' }} />
                            </Col>
                            <Col span={4}>
                                <Text style={{ fontSize: 10, display: 'block', marginBottom: 4, color: '#aaa' }}>UNIT COST</Text>
                                <InputNumber disabled value={it.unitCost} style={{ width: '100%' }} />
                            </Col>
                            <Col span={6}>
                                <Text style={{ fontSize: 10, display: 'block', marginBottom: 4, color: '#aaa' }}>REASON</Text>
                                <Select placeholder="Reason" onChange={v => updateItem(it.key, 'reason', v)} style={{ width: '100%' }}>
                                    <Option value="Damaged">Damaged</Option>
                                    <Option value="Wrong Item">Wrong Item</Option>
                                    <Option value="Expired">Expired</Option>
                                    <Option value="Defective">Defective</Option>
                                </Select>
                            </Col>
                            <Col span={2} style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
                                <Button type="text" danger onClick={() => removeItem(it.key)} icon={<PlusOutlined style={{ transform: 'rotate(45deg)' }} />} />
                            </Col>
                        </Row>
                    ))}

                    <Button type="dashed" block icon={<PlusOutlined />} onClick={addItem} style={{ marginTop: 8 }}>
                        Add Item to Return
                    </Button>

                    <Form.Item name="notes" label="Notes" style={{ marginTop: 24 }}>
                        <Input.TextArea placeholder="Internal notes about this return..." />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default RTVDashboard;




