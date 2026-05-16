import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';

import { Form, Input, InputNumber, Button, Select, Table, Card, Typography, Space, Divider, message, Badge, AutoComplete, Col, Row } from 'antd';
import { ShoppingCartOutlined, PlusOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons';
import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAICorrection } from './hooks/useAICorrection';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import { applyAntiGravityFix } from './utils/printAssistant';

const { Title, Text } = Typography;
const { Option } = Select;

const PrintPurchaseOrder = ({ data, items }) => {
    if (!data || !items) return null;
    
    return createPortal(
        <div className="alive-print-area">
            <BrandedDocumentHeader
                title="PURCHASE ORDER / ক্রয়পত্র"
                subtitle="Mamun Automobiles procurement"
                meta={[
                    { label: 'Date', value: dayjs(data.date).format('DD MMM YYYY') },
                    { label: 'PO ID', value: `PO-${Date.now().toString().slice(-6).toUpperCase()}` }
                ]}
            />

            <div style={{ marginTop: 20, flex: 1 }}>
                <div style={{ marginBottom: 20, padding: 15, background: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <Text type="secondary" style={{ fontSize: 10, textTransform: 'uppercase', fontWeight: 800 }}>Supplier</Text>
                    <div style={{ fontSize: 18, fontWeight: 900 }}>{data.supplierName}</div>
                </div>

                <table className="premium-print-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Item Description</th>
                            <th style={{ textAlign: 'right' }}>Qty</th>
                            <th style={{ textAlign: 'right' }}>Unit Price</th>
                            <th style={{ textAlign: 'right' }}>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const compress = items.length > 5;
                            const cellStyle = { 
                                padding: compress ? '2.5px 8px' : '8px 8px', 
                                fontSize: compress ? '11px' : '12.5px',
                                lineHeight: compress ? '1.1' : '1.4'
                            };
                            return (
                                <tr key={idx}>
                                    <td style={{ ...cellStyle, fontWeight: 700 }}>{item.partName}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>{item.quantity}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>৳ {Number(item.unitPrice).toLocaleString()}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 800 }}>৳ {Number(item.total).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            <div className="alive-footer-lock">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 25 }}>
                    <div style={{ width: 250 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '2.5px solid #000' }}>
                            <span style={{ fontWeight: 900, fontSize: 16 }}>GRAND TOTAL:</span>
                            <span style={{ fontWeight: 900, fontSize: 16 }}>৳ {items.reduce((s, i) => s + (i.total || 0), 0).toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40, marginTop: 20 }}>
                    <div style={{ textAlign: 'center', width: '200px', borderTop: '1.5px solid #000', paddingTop: 8, fontSize: 11, fontWeight: 700 }}>Procurement Dept.</div>
                    <div style={{ textAlign: 'center', width: '200px', borderTop: '1.5px solid #000', paddingTop: 8, fontSize: 11, fontWeight: 700 }}>Authorized Signatory</div>
                </div>
                
                <div style={{ textAlign: 'center', fontSize: 9, color: '#64748b', borderTop: '1px solid #eee', paddingTop: 10 }}>
                    MAMUN AUTOMOBILES // LUXURY PROCUREMENT // ANTI-GRAVITY ACTIVE
                </div>
            </div>
        </div>,
        document.body
    );
};


const PurchaseOrderForm = () => {
    const [form] = Form.useForm();
    const { inventory, suppliers, vehicleModels, setVehicleModels } = useGlobalState();
    const [items, setItems] = React.useState([]);
    const [loading, setLoading] = React.useState(false);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const { handleBlurCorrection: correctSupplier } = useAICorrection(form);

    // Data loaded via GlobalState

    const addItem = () => {
        setItems([...items, { key: Date.now(), partId: '', partName: '', quantity: 1, unitPrice: 0, total: 0, compatibleVehicles: [] }]);
    };

    const removeItem = (key) => {
        setItems(items.filter(item => item.key !== key));
    };

    const updateItem = (key, field, value) => {
        setItems(items.map(item => {
            if (item.key === key) {
                const updated = { ...item, [field]: value };
                if (field === 'partId') {
                    const part = (inventory || []).find(p => p.id === value);
                    if (part) {
                        updated.partName = part.partName || part.name;
                        updated.unitPrice = part.unitPrice || 0;
                        updated.compatibleVehicles = part.compatibleVehicles || [];
                    } else {
                        // Manual entry (value is the name typed via Search)
                        updated.partId = '';
                        updated.partName = value;
                    }
                }
                updated.total = (Number(updated.quantity) || 0) * (Number(updated.unitPrice) || 0);
                return updated;
            }
            return item;
        }));
    };

    const totalAmount = items.reduce((sum, item) => sum + (Number(item.total) || 0), 0);

    const onFinish = async (values) => {
        if (items.length === 0) {
            return message.warning('Please add at least one item.');
        }

        setLoading(true);
        try {
            const purchaseData = {
                supplierName: values.supplierName,
                date: values.date || new Date(),
                items: items.map(it => ({
                    inventoryId: it.partId,
                    name: it.partName,
                    quantity: it.quantity,
                    unitCost: it.unitPrice,
                    totalCost: it.total,
                    compatibleVehicles: it.compatibleVehicles || []
                })),
                totalAmount,
                paymentStatus: values.paymentStatus,
                status: 'Received' // Mark as received to update stock immediately locally
            };

            await databaseBridge.addPurchase(purchaseData);

            // Sync new vehicles to master library
            for (const it of items) {
                for (const v of (it.compatibleVehicles || [])) {
                    if (v.brand && v.model) {
                        const exists = vehicleModels.find(m => 
                            (m.brand || '').toLowerCase() === v.brand.toLowerCase() && 
                            (m.model || '').toLowerCase() === v.model.toLowerCase()
                        );
                        if (!exists) {
                            const newModel = await databaseBridge.addVehicleModel(v.brand, v.model);
                            setVehicleModels(prev => [...prev, newModel]);
                        }
                    }
                }
            }

            message.success('Purchase recorded and inventory updated!');
            setItems([]);
            form.resetFields();
        } catch (error) {
            console.error(error);
            message.error('Failed to record purchase');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        setIsPrinting(true);
        bufferedPrint(() => setIsPrinting(false));
    };

    const columns = [
        {
            title: 'Part Name',
            dataIndex: 'partId',
            key: 'partId',
            render: (text, record) => (
                <Select
                    showSearch
                    style={{ width: '100%' }}
                    placeholder="Search or Type Part Name"
                    value={record.partId || record.partName}
                    onChange={(val) => updateItem(record.key, 'partId', val)}
                    onSearch={(val) => updateItem(record.key, 'partName', val)}
                    optionFilterProp="children"
                >
                    {(inventory || []).map(p => (
                        <Option key={p.id} value={p.id}>
                            {p.partName || p.name} {p.partNumber ? `(${p.partNumber})` : ''} — ৳{p.unitPrice}
                        </Option>
                    ))}
                </Select>
            )
        },
        {
            title: 'Qty',
            dataIndex: 'quantity',
            key: 'quantity',
            width: 120,
            render: (val, record) => (
                <InputNumber min={1} value={val} onChange={(v) => updateItem(record.key, 'quantity', v)} style={{ width: '100%' }} />
            )
        },
        {
            title: 'Unit Price',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            width: 150,
            render: (val, record) => (
                <InputNumber min={0} value={val} onChange={(v) => updateItem(record.key, 'unitPrice', v)} prefix="৳" style={{ width: '100%' }} />
            )
        },
        {
            title: 'Total',
            dataIndex: 'total',
            key: 'total',
            width: 120,
            render: (val) => <Text strong>৳ {Number(val || 0).toLocaleString()}</Text>
        },
        {
            title: 'Target Car(s)',
            dataIndex: 'compatibleVehicles',
            key: 'compatibleVehicles',
            width: 250,
            render: (val, record) => (
                <Select
                    mode="tags"
                    placeholder="e.g. Toyota Corolla"
                    value={(val || []).map(v => `${v.brand || v.make || ''} ${v.model || ''}`.trim()).filter(Boolean)}
                    onChange={(tags) => {
                        const vehicles = tags.map(t => {
                            const p = t.trim().split(' ');
                            return { make: p[0], brand: p[0], model: p.slice(1).join(' ') };
                        });
                        updateItem(record.key, 'compatibleVehicles', vehicles);
                    }}
                    style={{ width: '100%' }}
                >
                    {vehicleModels.map(m => (
                        <Option key={m._id || m.id} value={`${m.brand} ${m.model}`}>{m.brand} {m.model}</Option>
                    ))}
                </Select>
            )
        },
        {
            title: '',
            key: 'action',
            width: 50,
            render: (_, record) => (
                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeItem(record.key)} />
            )
        }
    ];

    return (
        <div style={{ padding: '24px', background: 'transparent', minHeight: '100vh' }}>
            <div style={{ marginBottom: '24px' }}>
                <Title level={2} style={{ margin: 0 }}>Record New Purchase</Title>
                <Text type="secondary">Record stock intake from suppliers. This will automatically update your inventory levels.</Text>
            </div>

            <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ paymentStatus: 'Paid', date: dayjs().format('YYYY-MM-DD') }}>
                <Row gutter={24}>
                    <Col xs={24} lg={16}>
                        <Card bordered={false} title="Purchase Items" extra={<Button icon={<PlusOutlined />} onClick={addItem}>Add Item</Button>} style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <Table
                                columns={columns}
                                dataSource={items}
                                pagination={false}
                                rowKey="key"
                                locale={{ emptyText: 'No items added. Click "Add Item" to start.' }}
                            />
                            {items.length > 0 && (
                                <div style={{ marginTop: '24px', textAlign: 'right' }}>
                                    <Text size="large">Grand Total: </Text>
                                    <Title level={3} style={{ margin: 0, display: 'inline' }}>৳ {totalAmount.toLocaleString()}</Title>
                                </div>
                            )}
                        </Card>
                    </Col>
                    <Col xs={24} lg={8}>
                        <Card bordered={false} title="Order Details" style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                            <Form.Item name="supplierName" label="Supplier Name" rules={[{ required: true }]}>
                                <AutoComplete
                                    options={suppliers.map(s => ({ value: s.name }))}
                                    placeholder="Enter or select supplier"
                                    onBlur={(e) => correctSupplier('supplierName', e.target.value)}
                                    filterOption={(inputValue, option) =>
                                        option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                    }
                                />
                            </Form.Item>
                            <Form.Item name="date" label="Purchase Date">
                                <Input type="date" />
                            </Form.Item>
                            <Form.Item name="paymentStatus" label="Payment Status">
                                <Select>
                                    <Option value="Paid">Paid</Option>
                                    <Option value="Pending">Pending</Option>
                                </Select>
                            </Form.Item>
                            <Divider />
                            <Button type="primary" htmlType="submit" size="large" block icon={<SaveOutlined />} loading={loading} disabled={items.length === 0}>
                                Record Purchase
                            </Button>
                        </Card>
                    </Col>
                </Row>
            </Form>

            <div className="no-print" style={{ marginTop: '24px', textAlign: 'center' }}>
                <Button size="large" onClick={handlePrint} disabled={items.length === 0}>
                    Preview & Print PO
                </Button>
            </div>

            {isPrinting && <PrintPurchaseOrder data={form.getFieldsValue()} items={items} />}
        </div>
    );
};



export default PurchaseOrderForm;





