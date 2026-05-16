import React from 'react';
import {
    Card, Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space,
    Typography, Row, Col, Statistic, message, Divider, Tabs
} from 'antd';


import databaseBridge from './services/databaseBridge';
import { useGlobalState } from './contexts/GlobalStateContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const SuppliersPage = () => {
    const { 
        suppliers, setSuppliers, 
        inventory: inventoryItems, setInventory: setInventoryItems,
        loading: globalLoading 
    } = useGlobalState();
    const [loading, setLoading] = React.useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isStatementModalOpen, setIsStatementModalOpen] = React.useState(false);
    const [isPurchaseModalOpen, setIsPurchaseModalOpen] = React.useState(false);
    const [isReturnModalOpen, setIsReturnModalOpen] = React.useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = React.useState(false);
    const [unpaidBills, setUnpaidBills] = React.useState([]);
    const [selectedBillKeys, setSelectedBillKeys] = React.useState([]);
    const [purchaseItems, setPurchaseItems] = React.useState([]); // [{id, name, quantity, unitCost}]
    const [returnItems, setReturnItems] = React.useState([]);
    const [tempItem, setTempItem] = React.useState({ id: null, quantity: 1, unitCost: 0 });
    const [tempReturnItem, setTempReturnItem] = React.useState({ id: null, quantity: 1, unitCost: 0 });
    const [selectedSup, setSelectedSup] = React.useState(null);
    const [addForm] = Form.useForm();
    const [purchaseForm] = Form.useForm();
    const [returnForm] = Form.useForm();
    const [payForm] = Form.useForm();
    const [saving, setSaving] = React.useState(false);;

    const loadSuppliers = React.useCallback(async () => {
        setLoading(true);
        try {
            const [list, inv] = await Promise.all([
                databaseBridge.fetchSuppliers(),
                databaseBridge.fetchCollection('inventory')
            ]);
            setSuppliers(list);
            setInventoryItems(inv);
        } catch (err) {
            message.error('Failed to load data.');
        } finally {
            setLoading(false);
        }
    }, [setSuppliers, setInventoryItems]);

    React.useEffect(() => { 
        if (suppliers.length === 0) loadSuppliers(); 
    }, [loadSuppliers, suppliers.length]);

    const handleAddSupplier = async (values) => {
        setSaving(true);
        try {
            await databaseBridge.addSupplier(values);
            message.success('Supplier added successfully.');
            setIsAddModalOpen(false);
            addForm.resetFields();
            loadSuppliers();
        } catch (err) {
            message.error('Failed to add supplier.');
        } finally {
            setSaving(false);
        }
    };

    const handleAddTransaction = async (values) => {
        // REMOVED — manual ledger updates are no longer allowed.
        // Supplier balances update automatically via GRN (Credit) and Finance payments (Debit).
    };

    const handleAddPurchase = async () => {
        if (!selectedSup || purchaseItems.length === 0) {
            message.warning('Please add at least one item.');
            return;
        }
        setSaving(true);
        try {
            const paidAmount = Number(purchaseForm.getFieldValue('paidAmount')) || 0;
            const totalAmount = purchaseItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0);
            const payload = {
                supplierId: selectedSup.id,
                items: purchaseItems.map(it => ({
                    inventoryId: it.id,
                    name: it.name,
                    quantity: it.quantity,
                    unitCost: it.unitCost,
                    totalCost: it.quantity * it.unitCost
                })),
                totalAmount,
                paidAmount,
                paymentMethod: purchaseForm.getFieldValue('paymentMethod') || 'Cash',
                notes: purchaseForm.getFieldValue('notes'),
                paymentStatus: paidAmount >= totalAmount ? 'Paid' : paidAmount > 0 ? 'Partial' : 'Due'
            };

            await databaseBridge.addPurchase(payload);
            message.success('Purchase recorded. Inventory, Ledger, and Cash updated.');
            setIsPurchaseModalOpen(false);
            setPurchaseItems([]);
            purchaseForm.resetFields();
            loadSuppliers();
        } catch (err) {
            message.error('Failed to record purchase.');
        } finally {
            setSaving(false);
        }
    };

    const addToPurchaseItems = () => {
        const item = inventoryItems.find(it => it.id === tempItem.id);
        if (!item) return;
        setPurchaseItems([...purchaseItems, { ...tempItem, name: item.name, key: Date.now() }]);
        setTempItem({ id: null, quantity: 1, unitCost: 0 });
    };

    const addToReturnItems = () => {
        const item = inventoryItems.find(it => it.id === tempReturnItem.id);
        if (!item) return;
        setReturnItems([...returnItems, { ...tempReturnItem, name: item.name, key: Date.now() }]);
        setTempReturnItem({ id: null, quantity: 1, unitCost: 0 });
    };

    const handleAddReturn = async () => {
        if (!selectedSup || returnItems.length === 0) {
            message.warning('Please add at least one item to return.');
            return;
        }
        setSaving(true);
        try {
            const payload = {
                items: returnItems.map(item => ({
                    inventoryId: item.id,
                    name: item.name,
                    quantity: Number(item.quantity || 1),
                    unitCost: Number(item.unitCost || 0),
                    totalCost: Number(item.quantity || 1) * Number(item.unitCost || 0)
                })),
                totalAmount: returnItems.reduce((acc, item) => acc + (item.quantity * item.unitCost), 0),
                reference: returnForm.getFieldValue('reference') || 'Supplier Return',
                notes: returnForm.getFieldValue('notes') || ''
            };

            await databaseBridge.addSupplierReturn(selectedSup.id, payload);

            message.success('Return recorded. Inventory and Ledger updated.');
            setIsReturnModalOpen(false);
            setReturnItems([]);
            returnForm.resetFields();
            loadSuppliers();
        } catch (err) {
            message.error('Failed to record return: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const openPaymentModal = async (sup) => {
        setSelectedSup(sup);
        setIsPaymentModalOpen(true);
        setLoading(true);
        try {
            const bills = await databaseBridge.fetchSupplierBills(sup.id);
            setUnpaidBills(bills);
            setSelectedBillKeys([]);
            payForm.resetFields();
        } catch (err) {
            message.error('Failed to load unpaid bills.');
        } finally {
            setLoading(false);
        }
    };

    const handlePaySupplier = async (values) => {
        if (!selectedSup) return;
        setSaving(true);
        try {
            const payload = {
                ...values,
                billIds: selectedBillKeys
            };
            await databaseBridge.paySupplierBills(selectedSup.id, payload);
            message.success('Payment processed successfully. Finance & Inventory synced.');
            setIsPaymentModalOpen(false);
            loadSuppliers();
        } catch (err) {
            message.error('Payment failed: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // Compute running balance statement rows from supplier transactions
    const getStatementRows = (sup) => {
        if (!sup || !sup.transactions) return [];
        const sorted = [...sup.transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
        let runningBalance = 0;
        return sorted.map((tx, idx) => {
            const isDebit = tx.type === 'Purchase';   // We owe more
            const isCredit = tx.type === 'Payment' || tx.type === 'Adjustment';
            if (isDebit) runningBalance += tx.amount || 0;
            if (isCredit) runningBalance -= tx.amount || 0;
            return {
                key: idx,
                date: tx.date,
                reference: tx.reference || '—',
                description: tx.description || tx.type,
                debit: isDebit ? tx.amount : null,
                credit: isCredit ? tx.amount : null,
                balance: runningBalance,
            };
        });
    };

    const columns = [
        { title: 'Name', dataIndex: 'name', key: 'name', render: (t) => <Text strong>{t}</Text> },
        { title: 'Contact', dataIndex: 'contactPerson', key: 'contact' },
        { title: 'Phone', dataIndex: 'phone', key: 'phone' },
        {
            title: 'Outstanding balance',
            dataIndex: 'balance',
            key: 'balance',
            render: b => <Text type={b > 0 ? 'danger' : 'success'} strong>৳ {(b || 0).toLocaleString()}</Text>
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, r) => (
                <Space>
                    <Button
                        className="action-btn-premium statement-btn"
                        onClick={() => { setSelectedSup(r); setIsStatementModalOpen(true); }}
                        style={{
                            borderRadius: '8px',
                            fontWeight: 600,
                            height: '32px'
                        }}
                    >
                        Statement
                    </Button>
                    <Button
                        size="small"
                        onClick={() => { setSelectedSup(r); setIsPurchaseModalOpen(true); }}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0 }}
                    >
                        Purchase
                    </Button>
                    <Button
                        size="small"
                        onClick={() => { setSelectedSup(r); setIsReturnModalOpen(true); }}
                        style={{ background: 'transparent', border: '1px solid #FFF', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                    >
                        Return
                    </Button>
                    <Button
                        size="small"
                        onClick={() => openPaymentModal(r)}
                        style={{ background: '#52c41a', border: 'none', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                    >
                        Pay
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div className="suppliers-page" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 600, letterSpacing: '0.2px' }}>
                    Supplier ledger
                </Title>
                    <Text style={{ color: '#3B82F6', fontWeight: 600, fontSize: 11, letterSpacing: '0.2px' }}>Procurement | Inventory source | Financial settlement</Text>
                </div>
                <Space>
                    <Button 
                        size="large"
                        onClick={loadSuppliers}
                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                    >
                        Refresh
                    </Button>
                    <Button 
                        size="large"
                        onClick={() => setIsAddModalOpen(true)}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0, letterSpacing: '0.2px' }}
                    >
                        Add new supplier
                    </Button>
                </Space>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 30 }}>
                <Col span={8}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <Statistic
                            title={<span style={{ fontWeight: 600 }}>Active Suppliers</span>}
                            value={suppliers.length}
                            valueStyle={{ fontWeight: 600 }}
                        />
                    </div>
                </Col>
                <Col span={8}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <Statistic 
                            title={<span style={{ color: '#C0C0C0', fontWeight: 600, fontSize: 11, letterSpacing: '0.2px' }}>Total outstanding</span>} 
                            value={suppliers.reduce((a, b) => a + (b.balance || 0), 0)} 
                            prefix="৳" 
                            valueStyle={{ color: '#3B82F6', fontWeight: 600 }} 
                        />
                    </div>
                </Col>
            </Row>

            <div className="glass-card" style={{ padding: 0 }}>
                <Table 
                    columns={columns} 
                    dataSource={suppliers} 
                    rowKey="id" 
                    loading={loading} 
                    className="luxury-table"
                />
            </div>

            <Modal title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>Add new supplier</span>} open={isAddModalOpen} onCancel={() => setIsAddModalOpen(false)} footer={null} className="luxury-modal">
                <Form form={addForm} onFinish={handleAddSupplier} layout="vertical">
                    <Form.Item name="name" label="Supplier Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Uttara Motors" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="contactPerson" label="Contact Person">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="Phone" rules={[{ required: true }]}>
                                <Input />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="address" label="Address">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                    <Button 
                        type="primary" 
                        htmlType="submit" 
                        block 
                        size="large"
                        loading={saving}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0, marginTop: 20 }}
                    >
                        Register supplier
                    </Button>
                </Form>
            </Modal>

            {/* Professional Account Statement Modal (Auto Ledger) */}
            <Modal
                title={
                    <div>
                        <div style={{ fontWeight: 600, letterSpacing: '0.2px', fontSize: 15 }}>Account statement</div>
                        <div style={{ color: '#C0C0C0', fontSize: 11, fontWeight: 600, letterSpacing: '0.2px' }}>{selectedSup?.name}</div>
                    </div>
                }
                open={isStatementModalOpen}
                onCancel={() => setIsStatementModalOpen(false)}
                footer={null}
                width={860}
                className="luxury-modal"
            >
                {/* Outstanding Balance Summary */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.04)', padding: '12px 16px', borderRadius: 6, marginBottom: 16 }}>
                    <div>
                        <Text style={{ color: '#C0C0C0', fontSize: 11, fontWeight: 600, letterSpacing: '0.2px' }}>Outstanding balance</Text>
                        <div>
                            <Text style={{ fontSize: 22, fontWeight: 600, color: (selectedSup?.balance || 0) > 0 ? '#FF4D4F' : '#52C41A' }}>
                                ৳ {(selectedSup?.balance || 0).toLocaleString()}
                            </Text>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <Text style={{ color: '#888', fontSize: 11 }}>Auto-updated via GRN & Payments</Text><br />
                        <Text style={{ color: '#3B82F6', fontSize: 10, fontWeight: 700 }}>NO MANUAL ENTRIES ALLOWED</Text>
                    </div>
                </div>

                {/* Transactions Table */}
                <Table
                    size="small"
                    dataSource={getStatementRows(selectedSup)}
                    pagination={{ pageSize: 12, size: 'small' }}
                    className="luxury-table statement-table"
                    rowClassName="statement-row"
                    summary={pageData => {
                        const rows = getStatementRows(selectedSup);
                        const lastRow = rows[rows.length - 1];
                        return (
                            <Table.Summary.Row style={{ background: 'rgba(212,175,55,0.15)' }}>
                                <Table.Summary.Cell index={0} colSpan={3}>
                                    <Text strong style={{ color: '#FAB308', letterSpacing: '0.2px', fontSize: 13 }}>Totals / Closing balance</Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={3}>
                                    <Text strong style={{ color: '#FF9B9B', fontSize: 13 }}>
                                        ৳ {rows.filter(r => r.debit).reduce((s, r) => s + r.debit, 0).toLocaleString()}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={4}>
                                    <Text strong style={{ color: '#10B981', fontSize: 13 }}>
                                        ৳ {rows.filter(r => r.credit).reduce((s, r) => s + r.credit, 0).toLocaleString()}
                                    </Text>
                                </Table.Summary.Cell>
                                <Table.Summary.Cell index={5}>
                                    <Text strong style={{ color: (lastRow?.balance || 0) > 0 ? '#FF4D4F' : '#10B981', fontSize: 16, borderBottom: '2px solid #FAB308' }}>
                                        ৳ {(lastRow?.balance || 0).toLocaleString()}
                                    </Text>
                                </Table.Summary.Cell>
                            </Table.Summary.Row>
                        );
                    }}
                    columns={[
                        {
                            title: 'Date',
                            dataIndex: 'date',
                            width: 130,
                            render: d => <Text style={{ fontSize: 13, fontWeight: 700 }}>{d ? dayjs(d).format('DD MMM YY HH:mm') : '—'}</Text>
                        },
                        {
                            title: 'Reference',
                            dataIndex: 'reference',
                            width: 140,
                            render: r => <Text style={{ fontSize: 13, fontFamily: 'monospace', color: 'var(--brand-secondary)', fontWeight: 600 }}>{r}</Text>
                        },
                        {
                            title: 'Description',
                            dataIndex: 'description',
                            render: d => <Text style={{ fontSize: 13, fontWeight: 600 }}>{d}</Text>
                        },
                        {
                            title: 'Debit (Owe ▲)',
                            dataIndex: 'debit',
                            width: 130,
                            align: 'right',
                            render: v => v != null ? <Text strong style={{ color: '#FF4D4F', fontSize: 13 }}>৳ {v.toLocaleString()}</Text> : '—'
                        },
                        {
                            title: 'Credit (Paid ▼)',
                            dataIndex: 'credit',
                            width: 130,
                            align: 'right',
                            render: v => v != null ? <Text strong style={{ color: '#52C41A', fontSize: 13 }}>৳ {v.toLocaleString()}</Text> : '—'
                        },
                        {
                            title: 'Balance',
                            dataIndex: 'balance',
                            width: 140,
                            align: 'right',
                            render: v => <Text strong style={{ fontSize: 14 }}>৳ {v.toLocaleString()}</Text>
                        },
                    ]}
                />

                {(selectedSup?.transactions?.length === 0 || !selectedSup?.transactions) && (
                    <div style={{ textAlign: 'center', padding: 40, color: '#666' }}>
                        <Text>No transactions recorded yet. Make a purchase or receive a GRN to begin.</Text>
                    </div>
                )}
            </Modal>

            {/* Purchase Entry Modal */}
            <Modal
                title={`Purchase Entry: ${selectedSup?.name}`}
                open={isPurchaseModalOpen}
                onCancel={() => setIsPurchaseModalOpen(false)}
                onOk={handleAddPurchase}
                confirmLoading={saving}
                width={700}
            >
                <div style={{ marginBottom: 16, background: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 8 }}>
                    <Text strong>Add Item to Purchase</Text>
                    <Row gutter={12} align="bottom" style={{ marginTop: 8 }}>
                        <Col span={10}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Item Name</Text>
                            <Select
                                showSearch
                                style={{ width: '100%' }}
                                placeholder="Select Product"
                                value={tempItem.id}
                                onChange={(val) => {
                                    const item = inventoryItems.find(it => it.id === val);
                                    setTempItem({ ...tempItem, id: val, unitCost: item?.purchasePrice || 0 });
                                }}
                                optionFilterProp="children"
                            >
                                {inventoryItems.map(it => <Option key={it.id} value={it.id}>{it.name} (Last: ৳{it.purchasePrice || 0})</Option>)}
                            </Select>
                        </Col>
                        <Col span={4}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Quantity</Text>
                            <InputNumber
                                style={{ width: '100%' }}
                                min={1}
                                value={tempItem.quantity}
                                onChange={(val) => setTempItem({ ...tempItem, quantity: val || 1 })}
                            />
                        </Col>
                        <Col span={6}>
                            <Text type="secondary" style={{ fontSize: 11 }}>Unit Cost (৳)</Text>
                            <InputNumber
                                style={{ width: '100%' }}
                                min={0}
                                prefix="৳"
                                value={tempItem.unitCost}
                                onChange={(val) => setTempItem({ ...tempItem, unitCost: val || 0 })}
                            />
                        </Col>
                        <Col span={4}>
                            <Button type="dashed" block onClick={addToPurchaseItems}>Add</Button>
                        </Col>
                    </Row>
                </div>

                <Table
                    size="small"
                    dataSource={purchaseItems}
                    pagination={false}
                    columns={[
                        { title: 'Item', dataIndex: 'name' },
                        { title: 'Qty', dataIndex: 'quantity' },
                        { title: 'Cost', dataIndex: 'unitCost', render: v => `৳${v}` },
                        { title: 'Total', render: (_, r) => <Text strong>৳{(r.quantity * r.unitCost).toLocaleString()}</Text> },
                        {
                            title: '',
                            render: (_, r) => <Button type="text" danger size="small" onClick={() => setPurchaseItems(purchaseItems.filter(p => p.key !== r.key))}>Remove</Button>
                        }
                    ]}
                />

                <div style={{ textAlign: 'right', marginTop: 16 }}>
                    <Title level={4}>Total Amount: <span style={{ color: '#cf1322' }}>৳{purchaseItems.reduce((acc, it) => acc + (it.quantity * it.unitCost), 0).toLocaleString()}</span></Title>
                </div>

                <Form form={purchaseForm} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="paidAmount" label="Paid Amount (৳)" initialValue={0}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="paymentMethod" label="Payment Method" initialValue="Cash">
                                <Select>
                                    <Option value="Cash">Cash</Option>
                                    <Option value="Bank">Bank Transfer</Option>
                                    <Option value="bKash">bKash / MFS</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="notes" label="Notes / Reference">
                        <Input.TextArea rows={2} placeholder="e.g. Invoice #1234, Delivery via Courier" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Supplier Return Modal */}
            <Modal
                title={`Supplier Return: ${selectedSup?.name}`}
                open={isReturnModalOpen}
                onCancel={() => setIsReturnModalOpen(false)}
                onOk={handleAddReturn}
                confirmLoading={saving}
                width={700}
                okText="Submit Return"
                okButtonProps={{ danger: true }}
            >
                <Tabs
                    defaultActiveKey="1"
                    items={[
                        {
                            key: '1',
                            label: 'New Return',
                            children: (
                                <>
                                    <div style={{ marginBottom: 16, background: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 8 }}>
                                        <Text strong>Add Item to Return</Text>
                                        <Row gutter={12} align="bottom" style={{ marginTop: 8 }}>
                                            <Col span={10}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Item Name</Text>
                                                <Select
                                                    showSearch
                                                    style={{ width: '100%' }}
                                                    placeholder="Select Product"
                                                    value={tempReturnItem.id}
                                                    onChange={(val) => {
                                                        const item = inventoryItems.find(it => it.id === val);
                                                        setTempReturnItem({ ...tempReturnItem, id: val, unitCost: item?.purchasePrice || 0 });
                                                    }}
                                                    optionFilterProp="children"
                                                >
                                                    {inventoryItems.map(it => <Option key={it.id} value={it.id}>{it.name} (Stock: {it.stock}, ৳{it.purchasePrice || 0})</Option>)}
                                                </Select>
                                            </Col>
                                            <Col span={4}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Qty</Text>
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    min={1}
                                                    value={tempReturnItem.quantity}
                                                    onChange={(val) => setTempReturnItem({ ...tempReturnItem, quantity: val || 1 })}
                                                />
                                            </Col>
                                            <Col span={5}>
                                                <Text type="secondary" style={{ fontSize: 11 }}>Unit Price</Text>
                                                <InputNumber
                                                    style={{ width: '100%' }}
                                                    min={0}
                                                    prefix="৳"
                                                    value={tempReturnItem.unitCost}
                                                    onChange={(val) => setTempReturnItem({ ...tempReturnItem, unitCost: val || 0 })}
                                                />
                                            </Col>
                                            <Col span={5}>
                                                <Button type="primary" danger onClick={addToReturnItems} block disabled={!tempReturnItem.id}>Add</Button>
                                            </Col>
                                        </Row>
                                    </div>

                                    <Table
                                        dataSource={returnItems}
                                        pagination={false}
                                        size="small"
                                        style={{ marginBottom: 16 }}
                                        summary={pageData => {
                                            let total = 0;
                                            pageData.forEach(({ unitCost, quantity }) => { total += (unitCost * quantity); });
                                            return (
                                                <Table.Summary.Row>
                                                    <Table.Summary.Cell index={0} colSpan={3}><Text strong>Total Return Value</Text></Table.Summary.Cell>
                                                    <Table.Summary.Cell index={1}><Text strong type="danger">৳ {total.toLocaleString()}</Text></Table.Summary.Cell>
                                                    <Table.Summary.Cell index={2} />
                                                </Table.Summary.Row>
                                            );
                                        }}
                                    >
                                        <Table.Column title="Item" dataIndex="name" key="name" />
                                        <Table.Column title="Qty" dataIndex="quantity" key="quantity" />
                                        <Table.Column title="Unit Rate" dataIndex="unitCost" key="unitCost" render={v => `৳${v}`} />
                                        <Table.Column title="Total" key="total" render={(_, r) => `৳${r.quantity * r.unitCost}`} />
                                        <Table.Column title="" key="action" render={(_, r) => (
                                            <Button type="text" danger size="small" onClick={() => setReturnItems(returnItems.filter(it => it.key !== r.key))}>Remove</Button>
                                        )} />
                                    </Table>

                                    <Form form={returnForm} layout="vertical">
                                        <Row gutter={12}>
                                            <Col span={12}>
                                                <Form.Item name="reference" label="Reference (e.g. Return Slip #)">
                                                    <Input />
                                                </Form.Item>
                                            </Col>
                                        </Row>
                                        <Form.Item name="notes" label="Return Notes">
                                            <Input.TextArea rows={2} />
                                        </Form.Item>
                                    </Form>
                                </>
                            )
                        },
                        {
                            key: '2',
                            label: 'Return History',
                            children: (
                                <Table
                                    size="small"
                                    dataSource={selectedSup?.returns || []}
                                    rowKey="id"
                                    pagination={{ pageSize: 5 }}
                                    expandable={{
                                        expandedRowRender: record => (
                                            <List
                                                size="small"
                                                dataSource={record.items || []}
                                                renderItem={item => (
                                                    <List.Item>
                                                        <Text>{item.name}</Text>
                                                        <Text type="secondary">{item.quantity} x ৳{item.unitCost}</Text>
                                                    </List.Item>
                                                )}
                                            />
                                        )
                                    }}
                                    columns={[
                                        { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YY') },
                                        { title: 'Amount', dataIndex: 'totalAmount', render: a => <Text strong type="danger">৳{a?.toLocaleString()}</Text> },
                                        { title: 'Ref', dataIndex: 'reference' }
                                    ]}
                                />
                            )
                        }
                    ]}
                />
            </Modal>
            {/* Bill-to-Bill Supplier Payment Modal */}
            <Modal
                title={
                    <div>
                        <div style={{ fontWeight: 600, letterSpacing: '0.2px', fontSize: 15 }}>Supplier payment & settlement</div>
                        <div style={{ color: '#3B82F6', fontSize: 11, fontWeight: 600 }}>{selectedSup?.name}</div>
                    </div>
                }
                open={isPaymentModalOpen}
                onCancel={() => setIsPaymentModalOpen(false)}
                footer={null}
                width={860}
                className="luxury-modal"
            >
                <Row gutter={24}>
                    <Col span={10}>
                        <Card title={<Text style={{ fontSize: 13, fontWeight: 600 }}>Payment details</Text>} size="small" style={{ background: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.1)' }}>
                            <Form form={payForm} onFinish={handlePaySupplier} layout="vertical">
                                <Form.Item name="amount" label="Amount to Pay (৳)" rules={[{ required: true }]}>
                                    <InputNumber style={{ width: '100%' }} size="large" prefix="৳" />
                                </Form.Item>
                                <Form.Item name="discount" label="Cash Discount (৳)" initialValue={0}>
                                    <InputNumber style={{ width: '100%' }} size="large" prefix="৳" />
                                </Form.Item>
                                <Form.Item name="paymentMethod" label="Payment Method" initialValue="Cash" rules={[{ required: true }]}>
                                    <Select size="large">
                                        <Option value="Cash">Cash</Option>
                                        <Option value="Bank">Bank Transfer</Option>
                                        <Option value="bKash">bKash / MFS</Option>
                                        <Option value="Cheque">Bank Cheque</Option>
                                    </Select>
                                </Form.Item>
                                <Form.Item name="reference" label="Ref / Transaction ID">
                                    <Input placeholder="e.g. TRN-99212" />
                                </Form.Item>
                                
                                <Divider style={{ margin: '12px 0' }} />
                                
                                <div style={{ marginBottom: 20 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Text type="secondary">Total Selected Bill Value:</Text>
                                        <Text strong>৳ {unpaidBills.filter(b => selectedBillKeys.includes(b._id)).reduce((s, b) => s + (b.totalReceivedValue - b.paidAmount), 0).toLocaleString()}</Text>
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                                        <Text type="secondary">Current Outstanding:</Text>
                                        <Text style={{ color: '#FF4D4F', fontWeight: 700 }}>৳ {(selectedSup?.balance || 0).toLocaleString()}</Text>
                                    </div>
                                </div>

                                <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    block 
                                    size="large" 
                                    loading={saving}
                                    style={{ background: '#52c41a', border: 'none', color: '#FFF', fontWeight: 600, height: 50 }}
                                >
                                    Confirm settlement
                                </Button>
                            </Form>
                        </Card>
                    </Col>

                    <Col span={14}>
                        <div style={{ marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text strong style={{ letterSpacing: '0.5px', fontSize: 12 }}>Select specific bills (FIFO if none)</Text>
                            {selectedBillKeys.length > 0 && <Tag color="blue">{selectedBillKeys.length} Selected</Tag>}
                        </div>
                        <Table
                            size="small"
                            dataSource={unpaidBills}
                            rowKey="_id"
                            pagination={false}
                            scroll={{ y: 350 }}
                            className="luxury-table"
                            rowSelection={{
                                selectedRowKeys: selectedBillKeys,
                                onChange: setSelectedBillKeys
                            }}
                            columns={[
                                { 
                                    title: 'Date', 
                                    dataIndex: 'receivedDate', 
                                    render: d => <span style={{ fontSize: 11 }}>{dayjs(d).format('DD MMM YY')}</span> 
                                },
                                { 
                                    title: 'Bill (GRN)', 
                                    dataIndex: 'grnNumber',
                                    render: t => <Text style={{ color: '#3B82F6', fontSize: 11, fontFamily: 'monospace' }}>{t}</Text>
                                },
                                { 
                                    title: 'Total', 
                                    dataIndex: 'totalReceivedValue', 
                                    align: 'right',
                                    render: v => <span style={{ fontSize: 11 }}>৳{v.toLocaleString()}</span>
                                },
                                { 
                                    title: 'Due', 
                                    render: (_, r) => <Text strong type="danger" style={{ fontSize: 11 }}>৳{(r.totalReceivedValue - r.paidAmount).toLocaleString()}</Text>
                                }
                            ]}
                        />
                    </Col>
                </Row>
            </Modal>
        </div>
    );
};

export default SuppliersPage;




