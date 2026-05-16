import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import {
    Form, Input, InputNumber, Button, message, Select, Table, Spin,
    Card, Tag, Typography, Row, Col, Statistic, Space, Divider, Modal, Descriptions, DatePicker
} from 'antd';
import { ShoppingCartOutlined, PrinterOutlined } from '@ant-design/icons';
import { createPortal } from 'react-dom';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import { applyAntiGravityFix } from './utils/printAssistant';


import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import toWords from './utils/numberToWords';
import SignatureField from './components/SignatureField';
import { useAuth } from './contexts/AuthContext';
import { buildShareableDocumentLink, createPurchaseWhatsAppMessage, openWhatsAppShare } from './utils/whatsAppShare';

import { useGlobalState } from './contexts/GlobalStateContext';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;
const { RangePicker } = DatePicker;

dayjs.extend(isBetween);

const PrintPurchaseReceipt = ({ purchase, suppliers }) => {
    if (!purchase) return null;
    const supplier = suppliers.find(s => s.id === purchase.supplierId);
    
    return createPortal(
        <div className="alive-print-area">
            <BrandedDocumentHeader
                title="PURCHASE RECEIPT / ক্রয় রশিদ"
                subtitle="Mamun Automobiles Procurement"
                meta={[
                    { label: 'Receipt ID', value: purchase.id },
                    { label: 'Date', value: dayjs(purchase.date).format('DD MMM YYYY') },
                    { label: 'Supplier', value: supplier?.name || purchase.supplierId },
                    { label: 'Status', value: purchase.paymentStatus?.toUpperCase() }
                ]}
            />

            <div style={{ flexGrow: 1, minHeight: 0, marginTop: 25 }}>
                <div style={{ marginBottom: 20, padding: 20, background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px' }}>
                    <div style={{ fontSize: 11, textTransform: 'uppercase', fontWeight: 800, color: '#64748b', marginBottom: 6 }}>Vendor / Supplier</div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#0f172a' }}>{supplier?.name || purchase.supplierId}</div>
                    {supplier?.phone && <div style={{ fontSize: 13, color: '#475569', fontWeight: 600, marginTop: 4 }}>Contact: {supplier.phone}</div>}
                </div>

                <table className="premium-print-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Item / Part Name</th>
                            <th style={{ textAlign: 'right', width: '80px' }}>Qty</th>
                            <th style={{ textAlign: 'right', width: '120px' }}>Unit Cost</th>
                            <th style={{ textAlign: 'right', width: '120px' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(purchase.items || []).map((item, idx) => {
                            const compress = (purchase.items || []).length > 5;
                            const cellStyle = { 
                                padding: compress ? '3px 8px' : '8px 8px', 
                                fontSize: compress ? '11.5px' : '13px',
                                lineHeight: compress ? '1.1' : '1.4'
                            };
                            return (
                                <tr key={idx}>
                                    <td style={cellStyle}>{item.name}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>{item.quantity}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>৳ {Number(item.unitCost).toLocaleString()}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 800 }}>৳ {Number(item.totalCost).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="alive-footer-lock">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 25 }}>
                    <div style={{ width: 250 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                            <span style={{ fontWeight: 600 }}>Subtotal:</span>
                            <span>৳ {purchase.totalAmount?.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0' }}>
                            <span style={{ fontWeight: 600 }}>Paid Amount:</span>
                            <span style={{ color: '#059669', fontWeight: 700 }}>৳ {purchase.paidAmount?.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderTop: '2px solid #000' }}>
                            <span style={{ fontWeight: 900, fontSize: 16 }}>DUE:</span>
                            <span style={{ fontWeight: 900, fontSize: 16, color: (purchase.totalAmount - purchase.paidAmount) > 0 ? '#dc2626' : '#000' }}>
                                ৳ {(purchase.totalAmount - purchase.paidAmount).toLocaleString()}
                            </span>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'left', marginTop: 10, fontSize: 13, fontStyle: 'italic', fontWeight: 800, color: '#1e293b', textTransform: 'capitalize', borderLeft: '4px solid #1f3b5b', paddingLeft: 12, background: '#f8fafc', padding: '8px 12px' }}>
                    In Words: {toWords(purchase.totalAmount || 0)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, marginTop: 40 }}>
                    <div style={{ textAlign: 'center', width: '220px', borderTop: '1.5px solid #000', paddingTop: 8 }}>
                        {purchase.preparedBySig && (
                            <img src={purchase.preparedBySig} style={{ height: 60, display: 'block', margin: '0 auto -8px auto' }} alt="Prepared Sign" />
                        )}
                        <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>Prepared By</span>
                    </div>
                    <div style={{ textAlign: 'center', width: '220px', borderTop: '1.5px solid #000', paddingTop: 8 }}>
                        {purchase.authorizedBySig && (
                            <img src={purchase.authorizedBySig} style={{ height: 60, display: 'block', margin: '0 auto -8px auto' }} alt="Authorized Sign" />
                        )}
                        <span style={{ fontSize: 11, fontWeight: 900, textTransform: 'uppercase' }}>Authorized Authority</span>
                    </div>
                </div>
                
                <div style={{ textAlign: 'center', fontSize: 9, color: '#64748b', borderTop: '1px solid #eee', paddingTop: 10 }}>
                    MAMUN AUTOMOBILES // LUXURY STOCK MANAGEMENT // ANTI-GRAVITY ENGINE ACTIVE
                </div>
            </div>
        </div>,
        document.body
    );
};

const PurchasePage = () => {
    const { inventory, setInventory, setSuppliers: setGlobalSuppliers, setPurchases: setGlobalPurchases } = useGlobalState();
    const { user: currentUser } = useAuth();
    
    const [suppliers, setSuppliers] = React.useState([]);
    const [purchases, setPurchases] = React.useState([]);
    const [loadingSuppliers, setLoadingSuppliers] = React.useState(true);
    const [loadingPurchases, setLoadingPurchases] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [items, setItems] = React.useState([]);
    const [preparedBySig, setPreparedBySig] = React.useState('');
    const [authorizedBySig, setAuthorizedBySig] = React.useState('');
    const [successModal, setSuccessModal] = React.useState(null);
    const [printingPurchase, setPrintingPurchase] = React.useState(null);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [purchaseDateRange, setPurchaseDateRange] = React.useState([dayjs().subtract(30, 'day'), dayjs()]);

    const [purchaseForm] = Form.useForm();
    const [itemForm] = Form.useForm();

    // Auto-fill authorized signature if permanent set or from user profile
    React.useEffect(() => {
        if (!authorizedBySig) {
            const permanent = localStorage.getItem('permanent_seller_signature');
            if (permanent) setAuthorizedBySig(permanent);
            else if (currentUser?.savedSignature) setAuthorizedBySig(currentUser.savedSignature);
        }
    }, [currentUser]);

    // Load suppliers and existing purchases
    const loadData = React.useCallback(async () => {
        setLoadingSuppliers(true);
        setLoadingPurchases(true);
        try {
            const [supplierList, purchaseList, latestInv] = await Promise.all([
                databaseBridge.fetchSuppliers(),
                databaseBridge.fetchPurchases(),
                databaseBridge.fetchCollection('inventory')
            ]);
            setSuppliers(supplierList || []);
            setPurchases(purchaseList || []);
            if (latestInv) setInventory(latestInv);
        } catch (err) {
            console.error(err);
            message.error('Failed to load data');
        } finally {
            setLoadingSuppliers(false);
            setLoadingPurchases(false);
        }
    }, []);

    React.useEffect(() => {
        if (isPrinting && printingPurchase) {
            bufferedPrint(() => {
                setIsPrinting(false);
                setPrintingPurchase(null);
            });
        }
    }, [isPrinting, printingPurchase]);

    React.useEffect(() => {
        loadData();
    }, [loadData]);

    const addItem = (values) => {
        const totalCost = (values.quantity || 1) * (values.unitCost || 0);
        const newItem = { ...values, totalCost, key: Date.now() };
        setItems(prev => [...prev, newItem]);
        itemForm.resetFields();
        message.success(`"${values.name}" added to purchase list`);
    };

    const removeItem = (key) => setItems(prev => prev.filter(i => i.key !== key));

    const totalAmount = items.reduce((s, i) => s + i.totalCost, 0);

    const filteredPurchases = React.useMemo(() => {
        if (!purchaseDateRange?.[0] || !purchaseDateRange?.[1]) return purchases;
        return (purchases || []).filter((purchase) => {
            if (!purchase?.date) return false;
            return dayjs(purchase.date).isBetween(purchaseDateRange[0].startOf('day'), purchaseDateRange[1].endOf('day'), null, '[]');
        });
    }, [purchases, purchaseDateRange]);

    const submitPurchase = async (values) => {
        if (items.length === 0) {
            message.error('Please add at least one item before submitting.');
            return;
        }
        setSubmitting(true);
        try {
            const paidAmount = values.paidAmount || 0;
            const purchaseData = {
                supplierId: values.supplierId,
                items,
                totalAmount,
                paymentStatus: values.paymentStatus || (paidAmount === 0 ? 'Due' : paidAmount >= totalAmount ? 'Paid' : 'Partial'),
                notes: values.notes,
                paidAmount,
                paymentMethod: values.paymentMethod || 'Cash',
                preparedBySig,
                authorizedBySig
            };

            const result = await databaseBridge.addPurchase(purchaseData);
            const supplier = suppliers.find(s => s.id === values.supplierId);

            setSuccessModal({
                purchaseId: result?.id || `PUR-${Date.now()}`,
                supplierName: supplier?.name || values.supplierId,
                totalAmount,
                paidAmount,
                due: totalAmount - paidAmount,
                itemCount: items.length,
            });

            // Reset form
            purchaseForm.resetFields();
            setItems([]);
            loadData(); // Reload to show new purchase
        } catch (err) {
            console.error(err);
            message.error('Failed to record purchase: ' + (err.message || 'Unknown error'));
        } finally {
            setSubmitting(false);
        }
    };

    const handleShareToWhatsApp = (purchase) => {
        if (!purchase) return;
        const s = suppliers.find(x => x.id === purchase.supplierId);
        const shareLink = buildShareableDocumentLink('purchase', purchase.id);
        const message = createPurchaseWhatsAppMessage({
            supplierName: s?.name || purchase.supplierId,
            id: purchase.id,
            amount: purchase.totalAmount,
            link: shareLink,
            itemsCount: (purchase.items || []).length
        });
        openWhatsAppShare({ phone: s?.phone || '', message });
    };

    // Item table columns
    const itemColumns = [
        { title: 'Product / Item', dataIndex: 'name', key: 'name', render: v => <Text strong>{v}</Text> },
        { title: 'Qty', dataIndex: 'quantity', key: 'quantity' },
        { title: 'Unit Cost', dataIndex: 'unitCost', key: 'unitCost', render: v => `৳ ${Number(v).toLocaleString()}` },
        { title: 'Total', dataIndex: 'totalCost', key: 'totalCost', render: v => <Text strong>৳ {Number(v).toLocaleString()}</Text> },
        {
            title: '', key: 'remove',
            render: (_, r) => (
                <Button danger size="small" onClick={() => removeItem(r.key)} />
            )
        },
    ];

    // Past purchases table columns
    const pastColumns = [
        { title: 'Purchase ID', dataIndex: 'id', key: 'id', render: v => <Text strong>{v}</Text> },
        {
            title: 'Supplier', dataIndex: 'supplierId', key: 'supplierId',
            render: sid => {
                const s = suppliers.find(x => x.id === sid);
                return s ? <Tag color="blue">{s.name}</Tag> : <Text type="secondary">{sid}</Text>;
            }
        },
        { title: 'Items', key: 'items', render: (_, r) => <>{(r.items || []).length} items</> },
        { title: 'Total', dataIndex: 'totalAmount', key: 'totalAmount', render: v => `৳ ${Number(v || 0).toLocaleString()}` },
        {
            title: 'Status', dataIndex: 'paymentStatus', key: 'paymentStatus',
            render: s => <Tag color={s === 'Paid' ? 'success' : s === 'Partial' ? 'warning' : 'error'}>{s || 'Due'}</Tag>
        },
        {
            title: 'Date', dataIndex: 'date', key: 'date',
            render: v => v ? dayjs(v).format('DD MMM YY') : '—'
        },
        {
            title: 'Action', key: 'action',
            render: (_, r) => (
                <Space>
                    <Button 
                        size="small" 
                        icon={<PrinterOutlined />} 
                        onClick={() => {
                            setPrintingPurchase(r);
                            setIsPrinting(true);
                        }}
                    >
                        Print
                    </Button>
                    <Button
                        size="small"
                        icon={<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style={{ width: 14 }} />}
                        onClick={() => handleShareToWhatsApp(r)}
                    >
                        Share
                    </Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: '0 8px' }}>
            {/* Portal Render for v3.3 Isolation */}
            {isPrinting && <PrintPurchaseReceipt purchase={printingPurchase} suppliers={suppliers} />}
            <div className="no-print">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Purchase Management</Title>
                    <Text type="secondary">Record purchases — updates Supplier Ledger & Company Cash automatically</Text>
                </div>
                <Space wrap>
                    <RangePicker
                        value={purchaseDateRange}
                        onChange={(value) => setPurchaseDateRange(value || [null, null])}
                        presets={[
                            { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
                            { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                            { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] }
                        ]}
                    />
                    <Button onClick={loadData}>Refresh</Button>
                </Space>
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} md={8}>
                    <Card size="small" className="glass-card">
                        <Statistic title="Filtered Purchases" value={filteredPurchases.length} prefix={<ShoppingCartOutlined size={16} />} />
                    </Card>
                </Col>
                <Col xs={12} md={8}>
                    <Card size="small" className="glass-card">
                        <Statistic
                            title="Total Paid"
                            value={filteredPurchases.filter(p => p.paymentStatus === 'Paid').length}
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col xs={12} md={8}>
                    <Card size="small" className="glass-card">
                        <Statistic
                            title="Filtered Spend"
                            value={filteredPurchases.reduce((sum, purchase) => sum + Number(purchase.totalAmount || 0), 0)}
                            prefix={<ShoppingCartOutlined style={{ fontSize: 16 }} />}
                            formatter={(value) => `৳ ${Number(value).toLocaleString()}`}
                        />
                    </Card>
                </Col>
            </Row>

            <Row gutter={[24, 24]}>
                {/* New Purchase Form */}
                <Col xs={24} lg={14}>
                    <Card
                        className="glass-card"
                        title={<span><ShoppingCartOutlined /> Record New Purchase</span>}
                        style={{ marginBottom: 24 }}
                    >
                        <Form form={purchaseForm} layout="vertical" onFinish={submitPurchase}>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item
                                        name="supplierId"
                                        label="Supplier"
                                        rules={[{ required: true, message: 'Please select a supplier' }]}
                                    >
                                        <Select
                                            loading={loadingSuppliers}
                                            showSearch
                                            placeholder="Select or search supplier..."
                                            optionFilterProp="children"
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                        >
                                            {suppliers.map(s => (
                                                <Option key={s.id} value={s.id} label={s.name}>
                                                    <div>
                                                        <Text strong>{s.name}</Text>
                                                        {s.phone && <Text type="secondary" style={{ marginLeft: 8, fontSize: 11 }}>{s.phone}</Text>}
                                                        {(s.balance || 0) > 0 && (
                                                            <Tag color="red" style={{ marginLeft: 8, fontSize: 10 }}>Due: ৳{Number(s.balance).toLocaleString()}</Tag>
                                                        )}
                                                    </div>
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="paymentStatus" label="Payment Status" initialValue="Due">
                                        <Select>
                                            <Option value="Paid">Paid (Full)</Option>
                                            <Option value="Partial">Partial</Option>
                                            <Option value="Due">Due (Credit)</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="paymentMethod" label="Payment Method" initialValue="Cash">
                                        <Select>
                                            <Option value="Cash">Cash</Option>
                                            <Option value="Bank">Bank Transfer</Option>
                                            <Option value="Cheque">Cheque</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="paidAmount"
                                label={<span>Cash Paid Now <Text type="secondary">(৳ — leave 0 if full credit)</Text></span>}
                            >
                                <InputNumber
                                    style={{ width: '100%' }}
                                    min={0}
                                    formatter={v => `৳ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={v => v.replace(/[৳,\s]/g, '')}
                                    placeholder="0"
                                />
                            </Form.Item>

                            <Form.Item name="notes" label="Notes / Reference">
                                <TextArea rows={2} placeholder="Invoice number, delivery note, etc." />
                            </Form.Item>

                            {/* Signatures */}
                            <Divider orientation="left">Signatures & Verification</Divider>
                            <Row gutter={16} style={{ marginBottom: 24 }}>
                                <Col span={12}>
                                    <SignatureField 
                                        label="PREPARED BY SIGNATURE" 
                                        value={preparedBySig} 
                                        onChange={setPreparedBySig} 
                                    />
                                </Col>
                                <Col span={12}>
                                    <SignatureField 
                                        label="AUTHORIZED AUTHORITY" 
                                        value={authorizedBySig} 
                                        onChange={setAuthorizedBySig}
                                        isPermanent={true}
                                        storageKey="permanent_seller_signature"
                                    />
                                </Col>
                            </Row>

                            {/* Add Items Sub-form */}
                            <Divider orientation="left">Add Items to This Purchase</Divider>
                            <div style={{ background: 'rgba(0,0,0,0.02)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                <Text strong>Fast Add from Inventory</Text>
                                <Select
                                    showSearch
                                    style={{ width: '100%', marginTop: 8, marginBottom: 12 }}
                                    placeholder="Select a product to auto-fill details..."
                                    optionFilterProp="children"
                                    onChange={(val) => {
                                        const item = (inventory || []).find(it => it.id === val);
                                        if (item) {
                                            itemForm.setFieldsValue({
                                                name: item.name,
                                                unitCost: item.purchasePrice || 0
                                            });
                                        }
                                    }}
                                >
                                    {(inventory || []).filter(Boolean).map(item => (
                                        <Select.Option key={item.id} value={item.id}>
                                            {item.name} (৳{item.purchasePrice || 0})
                                        </Select.Option>
                                    ))}
                                </Select>

                                <Form form={itemForm} layout="inline" onFinish={addItem} style={{ flexWrap: 'wrap', gap: 8 }}>
                                    <Form.Item name="name" rules={[{ required: true, message: 'Required' }]} style={{ flex: 2, minWidth: 150 }}>
                                        <Input placeholder="Product / Part Name" />
                                    </Form.Item>
                                    <Form.Item name="quantity" rules={[{ required: true, type: 'number', min: 1 }]} style={{ flex: 1, minWidth: 80 }}>
                                        <InputNumber min={1} placeholder="Qty" style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item name="unitCost" rules={[{ required: true, type: 'number', min: 0 }]} style={{ flex: 1, minWidth: 100 }}>
                                        <InputNumber min={0} step={1} placeholder="Unit Cost ৳" style={{ width: '100%' }} />
                                    </Form.Item>
                                    <Form.Item>
                                        <Button type="primary" htmlType="submit" id="purchase-add-to-list-btn">Add to List</Button>
                                    </Form.Item>
                                </Form>
                            </div>

                            {/* Items Preview */}
                            {items.length > 0 && (
                                <>
                                    <Table
                                        size="small"
                                        dataSource={items}
                                        columns={itemColumns}
                                        pagination={false}
                                        rowKey="key"
                                        style={{ marginBottom: 12 }}
                                        summary={() => (
                                            <Table.Summary>
                                                <Table.Summary.Row>
                                                    <Table.Summary.Cell index={0} colSpan={3}>
                                                        <Text strong>Grand Total</Text>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell index={1}>
                                                        <Text strong style={{ color: '#1890ff', fontSize: 16 }}>৳ {totalAmount.toLocaleString()}</Text>
                                                    </Table.Summary.Cell>
                                                    <Table.Summary.Cell index={2} />
                                                </Table.Summary.Row>
                                            </Table.Summary>
                                        )}
                                    />
                                    <Button
                                        type="primary"
                                        htmlType="submit"
                                        loading={submitting}
                                        size="large"
                                        block
                                        style={{ marginTop: 8 }}
                                    >
                                        Save Purchase (৳ {totalAmount.toLocaleString()}) — Update Ledger & Cash
                                    </Button>
                                </>
                            )}

                            {items.length === 0 && (
                                <Text type="secondary" style={{ display: 'block', textAlign: 'center', padding: 16 }}>
                                    Add at least one item above to submit the purchase
                                </Text>
                            )}
                        </Form>
                    </Card>
                </Col>

                {/* Recent Purchases List */}
                <Col xs={24} lg={10}>
                    <Card
                        className="glass-card"
                        title={<span> Recent Purchases</span>}
                    >
                        {loadingPurchases
                            ? <Spin />
                            : <Table
                                size="small"
                                dataSource={[...filteredPurchases].slice(0, 20)}
                                columns={pastColumns}
                                rowKey="id"
                                pagination={{ pageSize: 8, showSizeChanger: false }}
                                locale={{ emptyText: 'No purchases recorded yet.' }}
                                scroll={{ x: true }}
                            />
                        }
                    </Card>
                </Col>
            </Row>

            {/* Success Modal */}
            <Modal
                title={<span style={{ color: '#52c41a' }}>✅ Purchase Recorded Successfully!</span>}
                open={!!successModal}
                onOk={() => setSuccessModal(null)}
                onCancel={() => setSuccessModal(null)}
                okText="Done"
                cancelButtonProps={{ style: { display: 'none' } }}
                width={500}
            >
                {successModal && (
                    <Descriptions bordered size="small" column={1}>
                        <Descriptions.Item label="Purchase ID">
                            <Text strong>{successModal.purchaseId}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Supplier">
                            <Tag color="blue">{successModal.supplierName}</Tag>
                        </Descriptions.Item>
                        <Descriptions.Item label="Items">{successModal.itemCount} items</Descriptions.Item>
                        <Descriptions.Item label="Total Amount">
                            <Text strong style={{ color: '#1890ff' }}>৳ {Number(successModal.totalAmount).toLocaleString()}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Cash Paid">
                            <Text strong style={{ color: '#52c41a' }}>৳ {Number(successModal.paidAmount).toLocaleString()}</Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Due Balance">
                            <Text strong style={{ color: successModal.due > 0 ? '#ff4d4f' : '#52c41a' }}>
                                ৳ {Number(successModal.due).toLocaleString()}
                            </Text>
                        </Descriptions.Item>
                        <Descriptions.Item label="Auto-Updated">
                            <Space wrap>
                                <Tag color="green">✓ Supplier Ledger</Tag>
                                <Tag color="blue">✓ Inventory Stock</Tag>
                                {successModal.paidAmount > 0 && <Tag color="orange">✓ Company Cash</Tag>}
                            </Space>
                        </Descriptions.Item>
                    </Descriptions>
                )}
                <div style={{ textAlign: 'center', marginTop: 24 }}>
                    <Button 
                        type="primary" 
                        size="large"
                        icon={<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style={{ width: 20, marginRight: 8 }} />}
                        onClick={() => {
                            const p = purchases.find(x => x.id === successModal.purchaseId);
                            handleShareToWhatsApp(p || { ...successModal, id: successModal.purchaseId });
                        }}
                        style={{ background: '#25D366', border: 'none', fontWeight: 900, borderRadius: 8, padding: '0 30px' }}
                    >
                        SHARE TO WHATSAPP
                    </Button>
                </div>
            </Modal>
            </div>
        </div>
    );
};


export default PurchasePage;





