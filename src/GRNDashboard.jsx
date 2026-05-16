import React from 'react';
import { 
    Card, Table, Button, Tag, Space, Typography, Row, Col, 
    Modal, Form, Input, InputNumber, Select, message, Divider, Descriptions 
} from 'antd';
import SmartVoiceInput from './components/SmartVoiceInput';
import { useGlobalState } from './contexts/GlobalStateContext';
import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const GRNDashboard = () => {
    const { purchases, setPurchases, inventory, setInventory, suppliers, setSuppliers, navigateTo, setInventorySearchTerm } = useGlobalState();
    const [grns, setGrns] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [isReceiveModalOpen, setIsReceiveModalOpen] = React.useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
    const [selectedGRN, setSelectedGRN] = React.useState(null);
    const [selectedPO, setSelectedPO] = React.useState(null);
    const [receiveForm] = Form.useForm();
    const [searchText, setSearchText] = React.useState('');

    const fetchGRNs = async () => {
        setLoading(true);
        try {
            const data = await databaseBridge.fetchGRNs();
            setGrns(data || []);
        } catch (error) {
            message.error('Failed to load GRN history.');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchGRNs();
    }, []);

    const pendingPOs = React.useMemo(() => {
        return (purchases || []).filter(p => {
            const s = (p.status || '').toLowerCase();
            return s === 'pending' || s === 'partially received';
        });
    }, [purchases]);

    const handleOpenReceiveModal = async () => {
        setSelectedPO(null);
        receiveForm.resetFields();
        setIsReceiveModalOpen(true);
        // Ensure we have the latest POs from the server
        try {
            const latest = await databaseBridge.fetchPurchases();
            if (latest) setPurchases(latest);
        } catch (err) {
            console.warn('Failed to refresh POs for GRN selection:', err);
        }
    };

    const handlePOSelection = (poId) => {
        const po = pendingPOs.find(p => p.id === poId);
        setSelectedPO(po);
        if (po) {
            receiveForm.setFieldsValue({
                items: (po.items || []).map(it => {
                    const totalQty = Number(it.quantity) || 0;
                    const receivedQty = Number(it.receivedQuantity) || 0;
                    const remaining = Math.max(0, totalQty - receivedQty);
                    
                    return {
                        inventoryId: it.inventoryId,
                        name: it.name,
                        expectedQuantity: remaining,
                        receivedQuantity: remaining,
                        unitCost: Number(it.unitCost) || 0,
                        compatibleVehicles: (it.compatibleVehicles || []).map(v => `${v.make || ''} ${v.model || ''} ${v.yearRange || ''}`.trim()),
                        batchNumber: '',
                        expiryDate: null
                    };
                })
            });
        }
    };

    const submitGRN = async (values) => {
        setLoading(true);
        try {
            const payloadItems = (values.items || []).map((it, idx) => {
                const originalItem = selectedPO.items[idx];
                let cvList = originalItem.compatibleVehicles || [];
                
                if (it.compatibleVehicles && Array.isArray(it.compatibleVehicles)) {
                    // Convert tags back to the canonical object format
                    cvList = it.compatibleVehicles.map(tag => {
                        // Check if it's an existing vehicle string in inventory first
                        const invItem = inventory.find(x => x.id === originalItem.inventoryId);
                        const match = invItem?.compatibleVehicles?.find(v => 
                            `${v.make || ''} ${v.model || ''} ${v.yearRange || ''}`.trim() === tag
                        );
                        return match || { make: tag, model: '', yearRange: '' };
                    });
                }

                return {
                    inventoryId: originalItem.inventoryId,
                    receivedQuantity: it.receivedQuantity || 0,
                    unitCost: typeof it.unitCost === 'number' ? it.unitCost : originalItem.unitCost,
                    batchNumber: it.batchNumber,
                    expiryDate: it.expiryDate ? dayjs(it.expiryDate).toISOString() : null,
                    compatibleVehicles: cvList
                };
            }).filter(it => it.receivedQuantity > 0);

            if (payloadItems.length === 0) {
                setLoading(false);
                return message.warning('You must receive a quantity > 0 for at least one item.');
            }

            const payload = {
                purchaseOrderId: selectedPO.id,
                receivedItems: payloadItems.map(it => {
                    const original = selectedPO.items.find(x => x.inventoryId === it.inventoryId);
                    return {
                        ...it,
                        expectedQuantity: original ? (original.quantity - (original.receivedQuantity || 0)) : 0
                    };
                }),
                notes: values.notes,
                paidAmount: values.paidAmount || 0,
                paymentMethod: values.paymentMethod || 'Cash'
            };

            await databaseBridge.createGRN(payload);
            
            // Refresh Global State and Local GRNs
            const [latestInv, latestSuppliers, latestPurchases] = await Promise.all([
                databaseBridge.fetchCollection('inventory'),
                databaseBridge.fetchCollection('suppliers'),
                databaseBridge.fetchCollection('purchases')
            ]);
            
            if (latestInv) setInventory(latestInv);
            if (latestSuppliers) setSuppliers(latestSuppliers);
            if (latestPurchases) setPurchases(latestPurchases);
            
            fetchGRNs();
            message.success(`Goods Received successfully.`);
            setIsReceiveModalOpen(false);
            setSelectedPO(null);
            receiveForm.resetFields();
        } catch (err) {
            message.error('Failed to process GRN: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const columns = [
        { title: 'GRN Number', dataIndex: 'grnNumber', key: 'grnNumber', render: id => <Text code>{id}</Text> },
        { title: 'Purchase Order', dataIndex: 'purchaseOrderId', key: 'purchaseOrderId', render: id => <Text strong>{id}</Text> },
        { title: 'Supplier', dataIndex: 'supplierName', key: 'supplierName' },
        { title: 'Total Items', key: 'items', render: (_, r) => r.receivedItems?.length || 0 },
        { title: 'Value Received', dataIndex: 'totalReceivedValue', key: 'totalReceivedValue', render: val => `৳${val?.toLocaleString() || 0}` },
        { title: 'Received Date', dataIndex: 'receivedDate', key: 'receivedDate', render: d => dayjs(d).format('DD MMM YYYY, hh:mm A') },
        {
            title: 'Status', dataIndex: 'status', key: 'status', render: status => (
                <Tag color={status === 'Stored' ? 'green' : 'blue'}>{status.toUpperCase()}</Tag>
            )
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button 
                    size="small" 
                    type="default" 
                    onClick={() => {
                        setSelectedGRN(record);
                        setIsDetailsModalOpen(true);
                    }}
                >
                    View
                </Button>
            )
        }
    ];

    const filteredGRNs = grns.filter(g => 
        (g.grnNumber || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (g.supplierName || '').toLowerCase().includes(searchText.toLowerCase()) ||
        (g.purchaseOrderId || '').toLowerCase().includes(searchText.toLowerCase())
    );

    return (
        <div className="page-transition-enter" style={{ padding: '0 0px' }}>
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '12px' }}>
                <Row gutter={16} align="middle">
                    <Col span={10}>
                        <Title level={3} style={{ margin: 0, color: 'var(--text-main)' }}>Goods Receiving (GRN)</Title>
                        <Text style={{ color: 'var(--text-muted)' }}>Manage and track all incoming shipments and partial deliveries.</Text>
                    </Col>
                    <Col span={8}>
                        <Input 
                            placeholder="Search by GRN, PO, or Supplier..." 
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                            style={{ borderRadius: '8px' }}
                        />
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                        <Button 
                            type="primary" 
                            onClick={handleOpenReceiveModal}
                            size="large"

                            className="premium-blue-btn"
                            style={{ width: '100%', maxWidth: '200px' }}
                        >
                            Receive Shipment
                        </Button>
                    </Col>
                </Row>
            </div>

            <Card className="glass-card shadow-sm" styles={{ body: { padding: 0 } }}>
                <Table 
                    columns={columns} 
                    dataSource={filteredGRNs} 
                    rowKey="id" 
                    pagination={{ pageSize: 12 }}
                    loading={loading}
                    style={{ background: 'transparent' }}
                />
            </Card>

            <Modal
                title={`Generate Goods Receipt Note (GRN)`}
                open={isReceiveModalOpen}
                onCancel={() => { setIsReceiveModalOpen(false); setSelectedPO(null); receiveForm.resetFields(); }}
                footer={null}
                width={1000}
                destroyOnClose
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary">Select a Pending Purchase Order to begin receiving goods into inventory.</Text>
                </div>

                <Select 
                    showSearch
                    placeholder="Search and Select a Pending Purchase Order"
                    style={{ width: '100%', marginBottom: 24 }}
                    onChange={handlePOSelection}
                    value={selectedPO?.id}
                >
                    {pendingPOs.map(po => (
                        <Option key={po.id} value={po.id}>
                            {po.id} - {po.supplierName} (Total: ৳{po.totalAmount}) - {po.status}
                        </Option>
                    ))}
                </Select>

                {selectedPO && (
                    <Form layout="vertical" form={receiveForm} onFinish={submitGRN}>
                        <Form.List name="items">
                            {(fields) => (
                                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
                                    <thead>
                                        <tr style={{ borderBottom: '1px solid var(--border-color, #f0f0f0)', textAlign: 'left' }}>
                                            <th style={{ padding: '8px' }}>Product</th>
                                            <th style={{ padding: '8px', width: '100px' }}>Pending</th>
                                            <th style={{ padding: '8px', width: '120px' }}>Receiving Qty</th>
                                            <th style={{ padding: '8px', width: '120px' }}>Unit Cost</th>
                                            <th style={{ padding: '8px', width: '180px' }}>Target Car</th>
                                            <th style={{ padding: '8px', width: '140px' }}>Batch #</th>
                                            <th style={{ padding: '8px', width: '140px' }}>Expiry</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {fields.map(({ key, name, ...restField }) => {
                                            const original = selectedPO?.items[name];
                                            const invItem = inventory.find(x => x.id === original?.inventoryId);
                                            const carOptions = invItem?.compatibleVehicles || [];

                                            return (
                                                <tr key={key} style={{ borderBottom: '1px solid var(--border-color, #f9f9f9)' }}>
                                                    <td style={{ padding: '8px' }}>
                                                        <Text strong>{original?.name}</Text>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <Form.Item name={[name, 'expectedQuantity']} style={{ margin: 0 }}>
                                                            <InputNumber disabled bordered={false} style={{ color: 'var(--text-main, #000)' }} />
                                                        </Form.Item>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <Form.Item name={[name, 'receivedQuantity']} style={{ margin: 0 }}>
                                                            <InputNumber min={0} max={original?.quantity - (original?.receivedQuantity || 0)} style={{ width: '100%' }} />
                                                        </Form.Item>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <Form.Item name={[name, 'unitCost']} style={{ margin: 0 }}>
                                                            <InputNumber min={0} style={{ width: '100%' }} />
                                                        </Form.Item>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <Form.Item name={[name, 'compatibleVehicles']} style={{ margin: 0 }}>
                                                            <Select 
                                                                mode="tags" 
                                                                style={{ width: '100%' }} 
                                                                placeholder="Add Tags" 
                                                                allowClear
                                                            >
                                                                {carOptions.map((v, i) => (
                                                                    <Option key={i} value={`${v.make || ''} ${v.model || ''} ${v.yearRange || ''}`.trim()}>
                                                                        {v.make} {v.model} ({v.yearRange})
                                                                    </Option>
                                                                ))}
                                                            </Select>
                                                        </Form.Item>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <Form.Item name={[name, 'batchNumber']} style={{ margin: 0 }}>
                                                            <SmartVoiceInput placeholder="Batch ID" />
                                                        </Form.Item>
                                                    </td>
                                                    <td style={{ padding: '8px' }}>
                                                        <Form.Item name={[name, 'expiryDate']} style={{ margin: 0 }}>
                                                            <Input type="date" />
                                                        </Form.Item>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </Form.List>

                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="paidAmount" label="Paid Amount (৳)" initialValue={0}>
                                    <InputNumber min={0} style={{ width: '100%' }} placeholder="Enter amount paid to supplier" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="paymentMethod" label="Payment Method" initialValue="Cash">
                                    <Select style={{ width: '100%' }}>
                                        <Option value="Cash">Cash</Option>
                                        <Option value="Bank">Bank</Option>
                                        <Option value="Bkash">Bkash</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Form.Item name="notes" label="Receiving Notes">
                            <SmartVoiceInput textarea placeholder="Any exceptions, damages, or notes for this delivery..." />
                        </Form.Item>

                        <div style={{ textAlign: 'right' }}>
                            <Space>
                                <Button onClick={() => { setIsReceiveModalOpen(false); setSelectedPO(null); receiveForm.resetFields(); }}>Cancel</Button>
                                <Button type="primary" htmlType="submit" loading={loading} className="premium-blue-btn">Acknowledge GRN & Sync Inventory</Button>
                            </Space>
                        </div>
                    </Form>
                )}
            </Modal>

            <Modal
                title={`GRN Details: ${selectedGRN?.grnNumber}`}
                open={isDetailsModalOpen}
                onCancel={() => { setIsDetailsModalOpen(false); setSelectedGRN(null); }}
                footer={[<Button key="close" onClick={() => setIsDetailsModalOpen(false)}>Close</Button>]}
                width={1000}
                destroyOnClose
            >
                {selectedGRN && (
                    <>
                        <Descriptions bordered column={2} size="small" style={{ marginBottom: 24 }}>
                            <Descriptions.Item label="Supplier">{selectedGRN.supplierName}</Descriptions.Item>
                            <Descriptions.Item label="PO Number">{selectedGRN.purchaseOrderId}</Descriptions.Item>
                            <Descriptions.Item label="Date">{dayjs(selectedGRN.receivedDate).format('DD MMM YYYY, hh:mm A')}</Descriptions.Item>
                            <Descriptions.Item label="Total Value">৳{selectedGRN.totalReceivedValue?.toLocaleString()}</Descriptions.Item>
                            <Descriptions.Item label="Notes" span={2}>{selectedGRN.notes || 'No notes'}</Descriptions.Item>
                        </Descriptions>

                        <Divider orientation="left">Received Items</Divider>

                        <Table 
                            size="small"
                            dataSource={selectedGRN.receivedItems || []}
                            rowKey={(r, i) => r.inventoryId + i}
                            pagination={false}
                            columns={[
                                { title: 'Product', dataIndex: 'name', render: (val, rec) => val || rec.partName || 'Unknown Product' },
                                { title: 'Received Qty', dataIndex: 'receivedQuantity', width: 120 },
                                { title: 'Unit Cost', dataIndex: 'unitCost', render: v => `৳${v?.toLocaleString() || 0}` },
                                { title: 'Subtotal', key: 'total', render: (_, r) => `৳${((r.receivedQuantity || 0) * (r.unitCost || 0)).toLocaleString()}` },
                                {
                                    title: 'Audit',
                                    key: 'audit',
                                    width: 150,
                                    render: (_, record) => (
                                        <Button 
                                            size="small" 
                                            type="link" 
                                            onClick={() => {
                                                setInventorySearchTerm(record.name);
                                                navigateTo('inventory-product');
                                            }}
                                        >
                                            View in Inventory
                                        </Button>
                                    )
                                }
                            ]}
                        />
                    </>
                )}
            </Modal>
        </div>
    );
};

export default GRNDashboard;




