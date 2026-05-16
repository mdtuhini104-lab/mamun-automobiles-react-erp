import React from 'react';
import { 
    Card, Table, Button, Tag, Space, Typography, Row, Col, 
    Statistic, Modal, Form, Input, InputNumber, Select, message,
    Divider, Tooltip, Badge, DatePicker, Empty, Descriptions, AutoComplete
} from 'antd';
import SmartVoiceInput from './components/SmartVoiceInput';
import { useGlobalState } from './contexts/GlobalStateContext';
import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';
import { useAICorrection } from './hooks/useAICorrection';

const { Title, Text } = Typography;
const { Option } = Select;

const PurchaseOrderPage = () => {
    const { purchases, setPurchases, suppliers, setSuppliers, inventory, setInventory, smartAlerts, vehicleModels, setVehicleModels, navigateTo, setInventorySearchTerm } = useGlobalState();
    const [categorySearch, setCategorySearch] = React.useState('');
    const [carSearch, setCarSearch] = React.useState('');


    const handleCarTagCorrection = async (tags) => {
        if (!tags || tags.length === 0) return;
        const lastTag = tags[tags.length - 1];
        if (lastTag.length < 3) return;
        
        try {
            const corrected = await databaseBridge.correctTerm(lastTag, 'vehicle_model');
            if (corrected && corrected.toLowerCase() !== lastTag.toLowerCase()) {
                const newTags = [...tags.slice(0, -1), corrected];
                quickProductForm.setFieldsValue({ compatibleVehicles: newTags });
                setCarSearch(''); // Clear search if it was partial
                message.info(`AI corrected model: "${lastTag}" → "${corrected}"`);
            }
        } catch (err) {
            console.error('Car tag correction failed:', err);
        }
    };

    const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = React.useState(false);
    const [selectedPOForView, setSelectedPOForView] = React.useState(null);
    const [isEditMode, setIsEditMode] = React.useState(false);
    const [isQuickSupplierModalOpen, setIsQuickSupplierModalOpen] = React.useState(false);
    const [isQuickProductModalOpen, setIsQuickProductModalOpen] = React.useState(false);
    const [loading, setLoading] = React.useState(false);
    const [quickSupplierLoading, setQuickSupplierLoading] = React.useState(false);
    const [quickProductLoading, setQuickProductLoading] = React.useState(false);
    const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = React.useState(false);
    const [dbCategories, setDbCategories] = React.useState([]);
    const [newCategoryName, setNewCategoryName] = React.useState('');
    const [form] = Form.useForm();
    const [quickSupplierForm] = Form.useForm();
    const [quickProductForm] = Form.useForm();
    const { handleBlurCorrection: correctSupplier } = useAICorrection(quickSupplierForm);
    const { handleBlurCorrection: correctProduct } = useAICorrection(quickProductForm);
    const [searchText, setSearchText] = React.useState('');
    const [selectedSupplier, setSelectedSupplier] = React.useState(null);
    const [items, setItems] = React.useState([]);
    const [tempItem, setTempItem] = React.useState({ id: null, quantity: 1, unitCost: 0, compatibleVehicles: [] });

    const purchaseOrders = React.useMemo(() => purchases || [], [purchases]);
    const overduePOs = React.useMemo(() => smartAlerts?.overduePOs || [], [smartAlerts]);

    const stats = React.useMemo(() => {
        const total = purchaseOrders.length;
        const pending = purchaseOrders.filter(p => p.status === 'Pending').length;
        const received = purchaseOrders.filter(p => p.status === 'Received').length;
        const overdue = overduePOs.length;
        return { total, pending, received, overdue };
    }, [purchaseOrders, overduePOs]);

    const availableCategories = React.useMemo(() => {
        const base = ['Engine', 'Suspension', 'Braking', 'Transmission', 'Electrical', 'Fluids & Lubricants', 'Accessories', 'General'];
        const fromInv = inventory.map(i => i.category).filter(Boolean);
        const fromDb = dbCategories.map(c => c.name).filter(Boolean);
        return [...new Set([...base, ...fromInv, ...fromDb])];
    }, [inventory, dbCategories]);

    React.useEffect(() => {
        const loadCategories = async () => {
            try {
                const cats = await databaseBridge.fetchCategories();
                setDbCategories(cats);
            } catch (err) {
                console.error('Failed to load categories:', err);
            }
        };
        loadCategories();
    }, []);

    const handleUpdatePO = async (values) => {
        if (!selectedPOForView) return;
        setLoading(true);
        try {
            const updatedItems = items.map(it => ({
                inventoryId: it.id || it.inventoryId,
                name: it.name,
                category: it.category,
                quantity: it.quantity,
                unitCost: it.unitCost,
                totalCost: it.quantity * it.unitCost,
                compatibleVehicles: it.compatibleVehicles || [],
                receivedQuantity: it.receivedQuantity || 0
            }));

            const totalAmount = updatedItems.reduce((sum, it) => sum + it.totalCost, 0);
            
            const payload = {
                items: updatedItems,
                totalAmount,
                notes: values.notes,
                expectedDate: values.expectedDate ? dayjs(values.expectedDate).toISOString() : null,
                supplierId: values.supplierId,
                supplierName: suppliers.find(s => s.id === values.supplierId)?.name || selectedPOForView.supplierName
            };

            const updatedPO = await databaseBridge.updatePurchase(selectedPOForView.id, payload);
            setPurchases(purchases.map(p => p.id === updatedPO.id ? updatedPO : p));
            
            message.success('Purchase Order updated successfully.');
            setIsDetailsModalOpen(false);
            setIsEditMode(false);
            setSelectedPOForView(null);
            setItems([]);
        } catch (err) {
            message.error('Failed to update Purchase Order: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePO = async (values) => {
        if (items.length === 0) {
            message.warning('Please add at least one item to the order.');
            return;
        }
        setLoading(true);
        try {
            const totalAmount = items.reduce((sum, it) => sum + (it.quantity * it.unitCost), 0);
            const payload = {
                supplierId: values.supplierId,
                supplierName: suppliers.find(s => s.id === values.supplierId)?.name || '',
                items: items.map(it => ({
                    inventoryId: it.id,
                    name: it.name,
                    category: it.category,
                    quantity: it.quantity,
                    unitCost: it.unitCost,
                    totalCost: it.quantity * it.unitCost,
                    compatibleVehicles: it.compatibleVehicles || []
                })),
                totalAmount,
                status: 'Pending',
                orderDate: dayjs().toISOString(),
                expectedDate: values.expectedDate ? dayjs(values.expectedDate).toISOString() : null,
                notes: values.notes,
                paidAmount: values.paidAmount || 0,
                paymentMethod: values.paymentMethod || 'Cash'
            };

            const newPO = await databaseBridge.addPurchase(payload);
            setPurchases([newPO, ...purchases]);
            message.success('Purchase Order created successfully.');
            setIsCreateModalOpen(false);
            form.resetFields();
            setItems([]);
        } catch (err) {
            message.error('Failed to create Purchase Order: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleQuickAddSupplier = async (values) => {
        setQuickSupplierLoading(true);
        try {
            const payload = {
                name: values.name,
                contactPerson: values.contactPerson || '',
                phone: values.phone || '',
                address: values.address || '',
                status: 'Active',
                balance: 0
            };
            const newSupplier = await databaseBridge.addSupplier(payload);
            const updatedSuppliers = await databaseBridge.fetchCollection('suppliers');
            if (updatedSuppliers) setSuppliers(updatedSuppliers);
            
            form.setFieldsValue({ supplierId: newSupplier.id || newSupplier._id });
            message.success('Supplier added and selected successfully.');
            setIsQuickSupplierModalOpen(false);
            quickSupplierForm.resetFields();
        } catch (err) {
            message.error('Failed to quick-add supplier: ' + err.message);
        } finally {
            setQuickSupplierLoading(false);
        }
    };
    const handleQuickAddProduct = async (values) => {
        setQuickProductLoading(true);
        try {
            const vehicles = (values.compatibleVehicles || []).map(tag => {
                const parts = tag.trim().split(' ');
                const brand = parts[0] || '';
                const model = parts.slice(1).join(' ') || '';
                return { make: brand, brand, model, yearRange: '' };
            });

            const payload = {
                name: values.name,
                partName: values.name,
                category: values.category || 'General',
                unitPrice: values.unitCost || 0,
                sellingPrice: values.unitCost || 0,
                stock: 0,
                lowStockThreshold: 5,
                compatibleVehicles: vehicles
            };
            const newItem = await databaseBridge.addInventoryItem(payload);
            const updatedInventory = await databaseBridge.fetchCollection('inventory');
            if (updatedInventory) setInventory(updatedInventory);
            
            // Sync new vehicles to master library
            for (const v of vehicles) {
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

            setTempItem({ 
                ...tempItem, 
                id: newItem.id || newItem._id, 
                unitCost: newItem.unitPrice || 0, 
                compatibleVehicles: vehicles 
            });
            message.success('Product added and selected successfully.');
            setIsQuickProductModalOpen(false);
            quickProductForm.resetFields();
        } catch (err) {
            message.error('Failed to add product: ' + err.message);
        } finally {
            setQuickProductLoading(false);
        }
    };

    const handleQuickAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        setQuickProductLoading(true);
        try {
            const saved = await databaseBridge.addCategory({ name: newCategoryName.trim() });
            setDbCategories(prev => [...prev, saved]);
            quickProductForm.setFieldsValue({ category: saved.name });
            setIsQuickCategoryModalOpen(false);
            setNewCategoryName('');
            message.success('Category added to database successfully.');
        } catch (err) {
            message.error('Failed to save category: ' + err.message);
        } finally {
            setQuickProductLoading(false);
        }
    };

    const addItem = () => {
        if (!tempItem.id) return;
        const invItem = inventory.find(it => it.id === tempItem.id);
        const newItem = {
            ...tempItem,
            name: invItem.partName || invItem.name,
            category: invItem.category || 'General',
            key: tempItem.id + Date.now()
        };
        setItems([...items, newItem]);
        setTempItem({ id: null, quantity: 1, unitCost: 0, compatibleVehicles: [] });
    };

    const removeItem = (key) => {
        setItems(items.filter(it => it.key !== key));
    };

    const columns = [
        {
            title: 'Order ID',
            dataIndex: 'id',
            key: 'id',
            render: (id) => <Text code>{id}</Text>
        },
        {
            title: 'Supplier',
            dataIndex: 'supplierName',
            key: 'supplierName',
            render: (name, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <Text type="secondary" style={{ fontSize: 11 }}>{record.supplierId}</Text>
                </Space>
            )
        },
        {
            title: 'Total Items',
            key: 'items',
            render: (_, record) => record.items?.length || 0
        },
        {
            title: 'Total Cost',
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: (val) => <Text strong>৳{val.toLocaleString()}</Text>
        },
        {
            title: 'Expected Delivery',
            dataIndex: 'expectedDate',
            key: 'expectedDate',
            render: (date, record) => {
                if (!date) return <Text type="secondary">N/A</Text>;
                const isOverdue = record.status === 'Pending' && dayjs().isAfter(dayjs(date));
                return <Text color={isOverdue ? 'red' : 'inherit'}>{dayjs(date).format('DD MMM YYYY')}</Text>
            }
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                const isOverdue = status === 'Pending' && dayjs().diff(dayjs(record.orderDate), 'day') >= 7;
                return (
                    <Space>
                        <Tag color={status === 'Received' ? 'green' : status === 'Partially Received' ? 'blue' : 'orange'}>
                            {status === 'Received' ? 'Received' : status === 'Partially Received' ? 'Partial' : 'Pending'}
                        </Tag>
                        {isOverdue && <Badge count="OVERDUE" style={{ backgroundColor: '#f5222d' }} />}
                    </Space>
                );
            }
        },
        {
            title: 'Action',
            render: (_, record) => (
                <Space>
                    <Button 
                        type="default" 
                        size="small" 
                        onClick={() => {
                            setSelectedPOForView(record);
                            setItems(record.items.map(it => ({
                                ...it,
                                id: it.inventoryId, // map inventoryId back to id for temp state consistency
                                key: it.inventoryId + Date.now() + Math.random()
                            })));
                            setIsDetailsModalOpen(true);
                            setIsEditMode(false);
                        }}
                    >
                        View
                    </Button>
                </Space>
            )
        }
    ];

    const filteredPurchases = purchaseOrders.filter(p => {
        const matchesSupplier = (p.supplierName || '').toLowerCase().includes(searchText.toLowerCase());
        const matchesVehicle = !searchText || (p.items || []).some(it => 
            (it.compatibleVehicles || []).some(v => 
                `${v.make || ''} ${v.model || ''} ${v.yearRange || ''}`.toLowerCase().includes(searchText.toLowerCase())
            )
        );
        return matchesSupplier || matchesVehicle;
    });

    return (
        <div className="page-transition-enter" style={{ padding: '0 0px' }}>
            <div className="glass-card" style={{ padding: '24px', marginBottom: '24px', borderRadius: '12px' }}>
                <Row gutter={16} align="middle">
                    <Col span={10}>
                        <Title level={3} style={{ margin: 0, color: 'var(--text-main)' }}>Purchase Orders</Title>
                        <Text style={{ color: 'var(--text-muted)' }}>Manage procurement workflow: Order → Receive → Inventory Update</Text>
                    </Col>
                    <Col span={8}>
                        <Input 
                            placeholder="Search by supplier or vehicle compatibility..." 
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            allowClear
                            style={{ borderRadius: '8px' }}
                        />
                    </Col>
                    <Col span={6} style={{ textAlign: 'right' }}>
                        <Button 
                            type="primary" 
                            onClick={() => setIsCreateModalOpen(true)}
                            size="large"
                            className="premium-blue-btn"
                            style={{ width: '100%', maxWidth: '200px', background: '#3B82F6', borderColor: '#3B82F6', color: '#FFF' }}
                        >
                            Create Purchase Order
                        </Button>
                    </Col>
                </Row>
            </div>

            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                    <Card size="small" className="glass-card shadow-sm">
                        <Statistic 
                            title="Total Orders" 
                            value={stats.total} 
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" className="glass-card shadow-sm">
                        <Statistic 
                            title="Pending" 
                            value={stats.pending} 
                            valueStyle={{ color: '#fa8c16' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" className="glass-card shadow-sm">
                        <Statistic 
                            title="Received" 
                            value={stats.received} 
                            valueStyle={{ color: '#52c41a' }}
                        />
                    </Card>
                </Col>
                <Col span={6}>
                    <Card size="small" className="glass-card shadow-sm">
                        <Statistic 
                            title="Overdue (7d+)" 
                            value={stats.overdue} 
                            valueStyle={{ color: '#f5222d' }}
                        />
                    </Card>
                </Col>
            </Row>

            {overduePOs.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                    <Badge.Ribbon text="Critical" color="red">
                        <Card size="small" style={{ border: '1px solid #ffa39e', background: '#fff1f0' }}>
                            <Space>
                                <Text strong style={{ color: '#cf1322' }}>
                                    You have {overduePOs.length} Purchase Orders pending for over 1 week. Please follow up with suppliers.
                                </Text>
                            </Space>
                        </Card>
                    </Badge.Ribbon>
                </div>
            )}

            <Card className="glass-card shadow-sm">
                <Table 
                    columns={columns} 
                    dataSource={filteredPurchases} 
                    rowKey="id" 
                    pagination={{ pageSize: 10 }}
                    rowClassName={(record) => record.status === 'Pending' && dayjs().diff(dayjs(record.orderDate), 'day') >= 7 ? 'overdue-row' : ''}
                />
            </Card>

            <Modal
                title="Create New Purchase Order"
                open={isCreateModalOpen}
                onCancel={() => setIsCreateModalOpen(false)}
                footer={null}
                width={800}
                style={{ top: 20 }}
            >
                <Form layout="vertical" form={form} onFinish={handleCreatePO}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item 
                                name="supplierId" 
                                rules={[{ required: true }]}
                                label={
                                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                        <span>Select Supplier</span>
                                        <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setIsQuickSupplierModalOpen(true)}>
                                            + New Supplier
                                        </Button>
                                    </div>
                                }
                            >
                                <Select placeholder="Select a supplier" showSearch optionFilterProp="children">
                                    {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="expectedDate" label="Expected Delivery Date">
                                <Input type="date" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider orientation="left">Order Items</Divider>
                    
                    <div style={{ background: 'var(--bg-card, rgba(255, 255, 255, 0.05))', border: '1px solid var(--border-color, #444)', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                        <Row gutter={8} align="bottom">
                            <Col span={7}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Product</Text>
                                <Select 
                                    showSearch 
                                    style={{ width: '100%' }}
                                    value={tempItem.id}
                                    onChange={(val) => {
                                        const it = inventory.find(x => x.id === val);
                                        setTempItem({ 
                                            ...tempItem, 
                                            id: val, 
                                            unitCost: it?.unitPrice || 0,
                                            compatibleVehicles: it?.compatibleVehicles || []
                                        });
                                    }}
                                    placeholder="Search products"
                                    optionFilterProp="label"
                                    options={inventory.map(it => ({
                                        value: it.id,
                                        label: `${it.partName || it.name} - ${it.category || 'General'} (Stock: ${it.quantity || it.stock})`
                                    }))}
                                    dropdownRender={(menu) => (
                                        <>
                                            {menu}
                                            <Divider style={{ margin: '8px 0' }} />
                                            <Button type="text" block onClick={() => setIsQuickProductModalOpen(true)} style={{ color: 'var(--primary-color, #3B82F6)' }}>
                                                + Add New Product
                                            </Button>
                                        </>
                                    )}
                                />
                            </Col>
                            <Col span={3}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Qty</Text>
                                <InputNumber 
                                    style={{ width: '100%' }} 
                                    min={1} 
                                    value={tempItem.quantity}
                                    onChange={(v) => setTempItem({ ...tempItem, quantity: v || 1 })}
                                />
                            </Col>
                            <Col span={4}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Unit Cost (৳)</Text>
                                <InputNumber 
                                    style={{ width: '100%' }} 
                                    min={0} 
                                    value={tempItem.unitCost}
                                    onChange={(v) => setTempItem({ ...tempItem, unitCost: v || 0 })}
                                />
                            </Col>
                            <Col span={6}>
                                <Text type="secondary" style={{ fontSize: 11 }}>Target Car(s)</Text>
                                <Select 
                                    mode="tags"
                                    style={{ width: '100%' }}
                                    placeholder="e.g. Toyota Corolla"
                                    value={tempItem.compatibleVehicles.map(v => 
                                        `${v.brand || v.make || ''} ${v.model || ''}`.trim()
                                    ).filter(Boolean)}
                                    onChange={(tags) => {
                                        setTempItem({ 
                                            ...tempItem, 
                                            compatibleVehicles: tags.map(t => {
                                                const p = t.trim().split(' ');
                                                return { make: p[0], brand: p[0], model: p.slice(1).join(' ') };
                                            })
                                        });
                                    }}
                                >
                                    {vehicleModels.map(m => (
                                        <Option key={m._id || m.id} value={`${m.brand} ${m.model}`}>{m.brand} {m.model}</Option>
                                    ))}
                                </Select>
                            </Col>
                            <Col span={4}>
                                <Button type="dashed" block onClick={addItem} disabled={!tempItem.id} style={{ height: 32 }}>Add</Button>
                            </Col>
                        </Row>
                    </div>

                    <Table 
                        size="small"
                        dataSource={items}
                        rowKey="key"
                        pagination={false}
                        columns={[
                            { title: 'Item & Model', dataIndex: 'name' },
                            { title: 'Category', dataIndex: 'category', render: v => v || '-' },
                            { 
                                title: 'Target Car(s)', 
                                dataIndex: 'compatibleVehicles', 
                                render: (vehicles) => {
                                    if (!vehicles || vehicles.length === 0) return '-';
                                    return (
                                        <Space size={[0, 4]} wrap>
                                            {vehicles.map((v, i) => (
                                                <Tag key={i} color="blue" style={{ fontSize: 10 }}>{v.make}</Tag>
                                            ))}
                                        </Space>
                                    );
                                }
                            },
                            { title: 'Qty', dataIndex: 'quantity' },
                            { title: 'Cost', dataIndex: 'unitCost', render: v => `৳${v}` },
                            { title: 'Total', key: 'total', render: (_, r) => `৳${r.quantity * r.unitCost}` },
                            { title: '', key: 'action', render: (_, r) => <Button danger size="small" type="link" onClick={() => removeItem(r.key)}>Remove</Button> }
                        ]}
                        footer={() => (
                            <div style={{ textAlign: 'right' }}>
                                <Text strong>Total Amount: ৳{items.reduce((s, it) => s + (it.quantity * it.unitCost), 0).toLocaleString()}</Text>
                            </div>
                        )}
                        style={{ marginBottom: 16 }}
                    />

                    <Divider orientation="left">Payment Info (Advanced)</Divider>
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="paidAmount" label="Pre-payment Amount (৳)">
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="paymentMethod" label="Method">
                                <Select defaultValue="Cash">
                                    <Option value="Cash">Cash</Option>
                                    <Option value="Bank">Bank Transfer</Option>
                                    <Option value="Bkash">Bkash / Nagad</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item name="notes" label="Order Notes">
                                <Input.TextArea placeholder="Any special instructions for the supplier..." />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space>
                            <Button onClick={() => setIsCreateModalOpen(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={loading}>
                                Confirm Purchase Order
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Quick Add Supplier"
                open={isQuickSupplierModalOpen}
                onCancel={() => { setIsQuickSupplierModalOpen(false); quickSupplierForm.resetFields(); }}
                footer={null}
                width={500}
                style={{ top: 20 }}
                destroyOnClose
            >
                <Form layout="vertical" form={quickSupplierForm} onFinish={handleQuickAddSupplier}>
                    <Form.Item name="name" label="Supplier / Company Name" rules={[{ required: true, message: 'Supplier name is required' }]}>
                        <SmartVoiceInput 
                            placeholder="Enter supplier name" 
                            onBlur={(e) => correctSupplier('name', e.target.value, 'supplier')}
                        />
                    </Form.Item>
                    <Form.Item name="contactPerson" label="Contact Person">
                        <Input placeholder="Enter contact person name" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Phone number is required' }]}>
                        <Input placeholder="Enter primary contact number" />
                    </Form.Item>
                    <Form.Item name="address" label="Address">
                        <SmartVoiceInput 
                            textarea
                            placeholder="Enter supplier address" 
                            onBlur={(e) => correctSupplier('address', e.target.value, 'address')}
                        />
                    </Form.Item>
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space>
                            <Button onClick={() => { setIsQuickSupplierModalOpen(false); quickSupplierForm.resetFields(); }}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={quickSupplierLoading} className="premium-blue-btn" style={{ background: '#3B82F6', border: 'none' }}>
                                Save Supplier
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Quick Add Product"
                open={isQuickProductModalOpen}
                onCancel={() => { setIsQuickProductModalOpen(false); quickProductForm.resetFields(); }}
                footer={null}
                width={500}
                style={{ top: 20 }}
                destroyOnClose
            >
                <Form layout="vertical" form={quickProductForm} onFinish={handleQuickAddProduct}>
                    <Form.Item name="name" label="Product Name & Model" rules={[{ required: true, message: 'Product name is required' }]}>
                        <SmartVoiceInput 
                            placeholder="e.g. Brake Pad - Premium Series" 
                            onBlur={(e) => correctProduct('name', e.target.value, 'product_name')}
                        />
                    </Form.Item>
                    <Form.Item 
                        label={
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span>Category</span>
                                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setIsQuickCategoryModalOpen(true)}>
                                    + New Category
                                </Button>
                            </div>
                        }
                        name="category" 
                        rules={[{ required: true, message: 'Category is required' }]}
                    >
                        <Select 
                            placeholder="Select a category" 
                            showSearch
                            onSearch={(val) => setCategorySearch(val)}
                            onBlur={async () => {
                                if (categorySearch && categorySearch.length >= 3) {
                                    const corrected = await databaseBridge.correctTerm(categorySearch, 'category');
                                    if (corrected && corrected !== categorySearch) {
                                        quickProductForm.setFieldsValue({ category: corrected });
                                        message.info(`AI corrected category: "${categorySearch}" → "${corrected}"`);
                                    }
                                }
                            }}
                        >

                            {availableCategories.map(cat => (
                                <Option key={cat} value={cat}>{cat}</Option>
                            ))}
                        </Select>

                    </Form.Item>
                    <Form.Item name="unitCost" label="Est. Unit Cost (৳)">
                        <InputNumber min={0} style={{ width: '100%' }} placeholder="Enter expected purchase cost" />
                    </Form.Item>
                    <Form.Item name="compatibleVehicles" label="Target Car(s)">
                        <Select 
                            mode="tags" 
                            placeholder="e.g. Toyota Corolla" 
                            style={{ width: '100%' }} 
                            showSearch
                            onSearch={(val) => setCarSearch(val)}
                            onBlur={async () => {
                                if (carSearch && carSearch.length >= 3) {
                                    const currentTags = quickProductForm.getFieldValue('compatibleVehicles') || [];
                                    const corrected = await databaseBridge.correctTerm(carSearch, 'vehicle_model');
                                    if (corrected && corrected !== carSearch) {
                                        const newTags = [...currentTags, corrected];
                                        quickProductForm.setFieldsValue({ compatibleVehicles: [...new Set(newTags)] });
                                        message.info(`AI corrected model: "${carSearch}" → "${corrected}"`);
                                        setCarSearch('');
                                    }
                                }
                            }}
                            onChange={(tags) => handleCarTagCorrection(tags)}

                            filterOption={(input, option) => {
                                const val = String(option?.value || '').toLowerCase();
                                const search = input.toLowerCase();
                                return val.includes(search);
                            }}
                        >
                            {vehicleModels.map(m => (
                                <Option key={m._id || m.id} value={`${m.brand} ${m.model}`}>{m.brand} {m.model}</Option>
                            ))}
                        </Select>

                    </Form.Item>
                    <div style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space>
                            <Button onClick={() => { setIsQuickProductModalOpen(false); quickProductForm.resetFields(); }}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={quickProductLoading} className="premium-blue-btn" style={{ background: '#3B82F6', border: 'none' }}>
                                Save Product
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            <Modal
                title={`Purchase Order Details: ${selectedPOForView?.id}`}
                open={isDetailsModalOpen}
                onCancel={() => { setIsDetailsModalOpen(false); setIsEditMode(false); setSelectedPOForView(null); setItems([]); }}
                footer={null}
                width={1000}
                style={{ top: 20 }}
                destroyOnClose
            >
                {selectedPOForView && (
                    <Form 
                        layout="vertical" 
                        form={form} 
                        onFinish={isEditMode ? handleUpdatePO : () => {}}
                        initialValues={{
                            supplierId: selectedPOForView.supplierId,
                            expectedDate: selectedPOForView.expectedDate ? dayjs(selectedPOForView.expectedDate).format('YYYY-MM-DD') : null,
                            notes: selectedPOForView.notes,
                            paidAmount: selectedPOForView.paidAmount,
                            paymentMethod: selectedPOForView.paymentMethod
                        }}
                    >
                        <Row gutter={16} align="middle">
                            <Col span={12}>
                                {isEditMode ? (
                                    <Form.Item name="supplierId" label="Supplier" rules={[{ required: true }]}>
                                        <Select placeholder="Select a supplier" showSearch optionFilterProp="children">
                                            {suppliers.map(s => <Option key={s.id} value={s.id}>{s.name}</Option>)}
                                        </Select>
                                    </Form.Item>
                                ) : (
                                    <Descriptions size="small" column={1}>
                                        <Descriptions.Item label="Supplier">{selectedPOForView.supplierName}</Descriptions.Item>
                                        <Descriptions.Item label="Status">
                                            <Tag color={selectedPOForView.status === 'Received' ? 'green' : 'orange'}>
                                                {selectedPOForView.status === 'Received' ? 'Received' : selectedPOForView.status === 'Partially Received' ? 'Partial' : 'Pending'}
                                            </Tag>
                                        </Descriptions.Item>
                                    </Descriptions>
                                )}
                            </Col>
                            <Col span={12}>
                                {isEditMode ? (
                                    <Form.Item name="expectedDate" label="Expected Delivery Date">
                                        <Input type="date" />
                                    </Form.Item>
                                ) : (
                                    <Descriptions size="small" column={1}>
                                        <Descriptions.Item label="Order Date">{dayjs(selectedPOForView.orderDate).format('DD MMM YYYY')}</Descriptions.Item>
                                        <Descriptions.Item label="Expected">{selectedPOForView.expectedDate ? dayjs(selectedPOForView.expectedDate).format('DD MMM YYYY') : 'N/A'}</Descriptions.Item>
                                    </Descriptions>
                                )}
                            </Col>
                        </Row>

                        <Divider orientation="left">Order Items</Divider>

                        {isEditMode && (
                            <div style={{ background: 'var(--bg-card, rgba(0, 0, 0, 0.05))', padding: 12, borderRadius: 8, marginBottom: 16 }}>
                                <Row gutter={8} align="bottom">
                                    <Col span={8}>
                                        <Select 
                                            showSearch 
                                            style={{ width: '100%' }}
                                            value={tempItem.id}
                                            onChange={(val) => {
                                                const it = inventory.find(x => x.id === val);
                                                setTempItem({ 
                                                    ...tempItem, 
                                                    id: val, 
                                                    unitCost: it?.unitPrice || 0,
                                                    compatibleVehicles: it?.compatibleVehicles || []
                                                });
                                            }}
                                            placeholder="Add product"
                                            options={inventory.map(it => ({
                                                value: it.id,
                                                label: `${it.partName || it.name} (Stock: ${it.quantity})`
                                            }))}
                                        />
                                    </Col>
                                    <Col span={4}>
                                        <InputNumber 
                                            style={{ width: '100%' }} 
                                            min={1} 
                                            placeholder="Qty"
                                            value={tempItem.quantity}
                                            onChange={(v) => setTempItem({ ...tempItem, quantity: v || 1 })}
                                        />
                                    </Col>
                                    <Col span={4}>
                                        <InputNumber 
                                            style={{ width: '100%' }} 
                                            min={0} 
                                            placeholder="Cost"
                                            value={tempItem.unitCost}
                                            onChange={(v) => setTempItem({ ...tempItem, unitCost: v || 0 })}
                                        />
                                    </Col>
                                    <Col span={4}>
                                        <Button type="dashed" block onClick={addItem} disabled={!tempItem.id}>Add</Button>
                                    </Col>
                                </Row>
                            </div>
                        )}

                        <Table 
                            size="small"
                            dataSource={items}
                            rowKey="key"
                            pagination={false}
                            columns={[
                                { title: 'Product', dataIndex: 'name' },
                                { 
                                    title: 'Ordered', 
                                    dataIndex: 'quantity', 
                                    width: 100,
                                    render: (val, record) => isEditMode ? (
                                        <InputNumber 
                                            min={record.receivedQuantity || 0} 
                                            value={val} 
                                            onChange={(v) => {
                                                const newItems = items.map(it => it.key === record.key ? { ...it, quantity: v || 0 } : it);
                                                setItems(newItems);
                                            }}
                                            style={{ width: '100%' }}
                                        />
                                    ) : val
                                },
                                { 
                                    title: 'Received', 
                                    dataIndex: 'receivedQuantity', 
                                    width: 100,
                                    render: (val, record) => (
                                        <Text type={val >= record.quantity ? 'success' : 'warning'}>
                                            {val || 0} / {record.quantity}
                                        </Text>
                                    )
                                },
                                { 
                                    title: 'Unit Cost', 
                                    dataIndex: 'unitCost', 
                                    width: 120,
                                    render: (val, record) => isEditMode ? (
                                        <InputNumber 
                                            min={0} 
                                            value={val} 
                                            onChange={(v) => {
                                                const newItems = items.map(it => it.key === record.key ? { ...it, unitCost: v || 0 } : it);
                                                setItems(newItems);
                                            }}
                                            prefix="৳"
                                            style={{ width: '100%' }}
                                        />
                                    ) : `৳${val?.toLocaleString()}`
                                },
                                { title: 'Subtotal', key: 'total', render: (_, r) => `৳${((r.quantity || 0) * (r.unitCost || 0)).toLocaleString()}` },
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
                                },
                                isEditMode ? { 
                                    title: '', 
                                    key: 'action', 
                                    render: (_, r) => (r.receivedQuantity || 0) === 0 ? <Button danger size="small" type="link" onClick={() => removeItem(r.key)}>Remove</Button> : <Tooltip title="Already received qty"><Text type="secondary" style={{ fontSize: 10 }}>Locked</Text></Tooltip>
                                } : {}
                            ]}
                            footer={() => (
                                <div style={{ textAlign: 'right' }}>
                                    <Text strong style={{ fontSize: 16 }}>
                                        Total Amount: ৳{items.reduce((s, it) => s + (it.quantity * it.unitCost), 0).toLocaleString()}
                                    </Text>
                                </div>
                            )}
                        />

                        {isEditMode && (
                            <Form.Item name="notes" label="Order Notes" style={{ marginTop: 16 }}>
                                <Input.TextArea placeholder="Special instructions..." />
                            </Form.Item>
                        )}

                        {!isEditMode && selectedPOForView.notes && (
                            <div style={{ marginTop: 16 }}>
                                <Text strong>Notes: </Text>
                                <Text>{selectedPOForView.notes}</Text>
                            </div>
                        )}

                        <div style={{ textAlign: 'right', marginTop: 24 }}>
                            <Space>
                                {selectedPOForView.status !== 'Received' && (
                                    <Button 
                                        type={isEditMode ? 'default' : 'primary'} 
                                        onClick={() => {
                                            if (isEditMode) {
                                                setIsEditMode(false);
                                                // Revert items to original
                                                setItems(selectedPOForView.items.map(it => ({
                                                    ...it,
                                                    id: it.inventoryId,
                                                    key: it.inventoryId + Date.now()
                                                })));
                                            } else {
                                                setIsEditMode(true);
                                            }
                                        }}
                                    >
                                        {isEditMode ? 'Cancel Edit' : 'Edit Order'}
                                    </Button>
                                )}
                                {isEditMode ? (
                                    <Button type="primary" onClick={() => form.submit()} loading={loading} className="premium-blue-btn">
                                        Save Changes
                                    </Button>
                                ) : (
                                    <Button onClick={() => setIsDetailsModalOpen(false)}>Close</Button>
                                )}
                            </Space>
                        </div>
                    </Form>
                )}
            </Modal>

            <Modal
                title="Add New Category"
                open={isQuickCategoryModalOpen}
                onCancel={() => setIsQuickCategoryModalOpen(false)}
                onOk={handleQuickAddCategory}
                confirmLoading={quickProductLoading}
                okText="Save Category"
                cancelText="Discard"
                width={400}
                className="luxury-modal"
                destroyOnClose
            >
                <div style={{ padding: '10px 0' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8, color: 'var(--text-muted)' }}>Enter the name of the new product category:</Text>
                    <Input 
                        placeholder="e.g. Turbochargers, Gaskets" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onPressEnter={handleQuickAddCategory}
                        autoFocus
                        style={{ borderRadius: '8px' }}
                    />
                </div>
            </Modal>

            <style>{`
                .overdue-row {
                    background-color: #fff1f0;
                }
                .overdue-row:hover > td {
                    background-color: #ffccc7 !important;
                }
            `}</style>
        </div>
    );
};

export default PurchaseOrderPage;




