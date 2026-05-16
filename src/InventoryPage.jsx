import React from 'react';
import { Card, Button, Table, Modal, Form, Input, InputNumber, Select, Typography, Space, message, Tag, Row, Col, Alert, Upload, Avatar } from 'antd';
import databaseBridge from './services/databaseBridge';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { t } from './utils/translations';
import dayjs from 'dayjs';
import { useAICorrection } from './hooks/useAICorrection';

import { optimizeCloudinaryUrl } from './utils/cloudinaryUtils';

const { Title, Text } = Typography;
const { Option } = Select;

const InventoryPage = () => {
    // State for Inventory Data (initialized from Global State)
    const { inventory, setInventory, expenses, logActivity, addExpense, smartAlerts, vehicleModels, setVehicleModels, language } = useGlobalState();
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme.includes('dark') || theme.includes('purple');
    const isStaff = user?.role === 'Staff';

    const [searchText, setSearchText] = React.useState('');
    const [isAddModalVisible, setIsAddModalVisible] = React.useState(false);
    const [isRestockModalVisible, setIsRestockModalVisible] = React.useState(false);
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isAdjustModalVisible, setIsAdjustModalVisible] = React.useState(false);
    const [isAdjustingStock, setIsAdjustingStock] = React.useState(false);
    const [selectedPart, setSelectedPart] = React.useState(null);
    const [uploadingImage, setUploadingImage] = React.useState(false);
    const [dbCategories, setDbCategories] = React.useState([]);
    const [isQuickCategoryModalOpen, setIsQuickCategoryModalOpen] = React.useState(false);
    const [newCategoryName, setNewCategoryName] = React.useState('');

    const [addForm] = Form.useForm();
    const [restockForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [adjustmentForm] = Form.useForm();
    const { handleBlurCorrection: correctAdd } = useAICorrection(addForm);
    const { handleBlurCorrection: correctEdit } = useAICorrection(editForm);

    const loadCategories = async () => {
        try {
            const cats = await databaseBridge.fetchCategories();
            setDbCategories(cats);
        } catch (err) {
            console.error('Failed to load categories:', err);
        }
    };

    React.useEffect(() => {
        loadCategories();
    }, []);

    const handleQuickAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        try {
            const saved = await databaseBridge.addCategory({ name: newCategoryName.trim() });
            setDbCategories(prev => [...prev, saved]);
            if (isAddModalVisible) addForm.setFieldsValue({ category: saved.name });
            if (isEditModalVisible) editForm.setFieldsValue({ category: saved.name });
            setIsQuickCategoryModalOpen(false);
            setNewCategoryName('');
            message.success('Category added successfully.');
        } catch (err) {
            message.error('Failed to save category: ' + err.message);
        }
    };

    const availableCategories = React.useMemo(() => {
        const base = ['Lubricants', 'Parts', 'Filters', 'Engine', 'Suspension', 'Braking', 'Electrical'];
        const fromInv = (inventory || []).map(i => i.category).filter(Boolean);
        const fromDb = dbCategories.map(c => c.name).filter(Boolean);
        return [...new Set([...base, ...fromInv, ...fromDb])];
    }, [inventory, dbCategories]);

    const refreshInventoryFromServer = async () => {
        try {
            const latest = await databaseBridge.fetchCollection('inventory');
            if (Array.isArray(latest) && latest.length > 0) {
                setInventory(latest);
            }
        } catch (error) {
            console.error('Failed to refresh inventory after adjustment:', error);
        }
    };

    // Filtering logic
    const filteredInventory = (inventory || []).filter(item => {
        const matchesName = (item?.name || '').toLowerCase().includes(searchText.toLowerCase());
        const matchesCategory = (item?.category || '').toLowerCase().includes(searchText.toLowerCase());
        const matchesVehicle = (item?.compatibleVehicles || []).some(v => 
            `${v.make || ''} ${v.model || ''} ${v.yearRange || ''}`.toLowerCase().includes(searchText.toLowerCase())
        );
        return matchesName || matchesCategory || matchesVehicle;
    });
    const lowStockItems = smartAlerts?.lowStockItems || [];
    const demandPredictions = smartAlerts?.predictedDemand || [];

    // Columns
    const columns = [
        {
            title: t('preview', language),
            key: 'preview',
            width: 80,
            render: (_, record) => (
                <Avatar
                    shape="square"
                    size="large"
                    src={optimizeCloudinaryUrl(record.imageUrl)}
                    style={{ backgroundColor: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 0 }}
                />
            )
        },
        {
            title: t('item_name_label', language),
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Space>
                    <Text style={{ color: isDark ? '#FFF' : '#000', fontWeight: 600 }}>{text}</Text>
                    {record.stock <= record.lowStockThreshold && (
                        <Tag color="error" style={{ borderRadius: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.2px' }}>{t('low_stock_tag', language)}</Tag>
                    )}
                </Space>
            ),
            sorter: (a, b) => a.name.localeCompare(b.name)
        },
        {
            title: t('category', language),
            dataIndex: 'category',
            key: 'category',
            render: (text) => <Tag color="geekblue">{text}</Tag>,
        },
        {
            title: t('target_cars', language),
            key: 'targetCar',
            render: (_, record) => {
                if (!record.compatibleVehicles || record.compatibleVehicles.length === 0) return <Text type="secondary">-</Text>;
                return (
                    <Space size={[0, 4]} wrap style={{ maxWidth: 200 }}>
                        {record.compatibleVehicles.map((v, i) => {
                            const label = `${v.brand || v.make || ''} ${v.model || ''}`.trim();
                            return label ? <Tag key={i} color="blue" style={{ marginBottom: 4 }}>{label}</Tag> : null;
                        })}
                    </Space>
                );
            }
        },
        ...(isStaff ? [] : [{
            title: t('cost_price', language),
            dataIndex: 'purchasePrice',
            key: 'purchasePrice',
            render: (price) => `৳ ${(price || 0).toLocaleString()}`,
        }]),
        {
            title: t('selling_price_label', language),
            key: 'sellingPrice',
            render: (_, record) => (
                <div style={{ lineHeight: 1.7 }}>
                    <div><Tag color="green" style={{ margin: 0, fontSize: 10 }}>Standard</Tag> <Text style={{ color: '#52c41a', fontWeight: 600 }}>৳ {(record.sellingPrice || 0).toLocaleString()}</Text></div>
                    <div><Tag color="purple" style={{ margin: 0, fontSize: 10 }}>Company</Tag> <Text style={{ color: '#722ed1', fontWeight: 600 }}>৳ {(record.companyRate || 0).toLocaleString()}</Text></div>
                </div>
            )
        },
        {
            title: t('initial_stock', language),
            dataIndex: 'stock',
            key: 'stock',
            render: (stock) => <Text strong>{stock}</Text>,
            sorter: (a, b) => a.stock - b.stock
        },
        {
            title: t('status', language),
            key: 'status',
            render: (_, record) => {
                const smartAlertItem = lowStockItems.find((item) => item.id === record.id);
                if (record.stock === 0) return <Tag color="red">{t('out_of_stock', language)}</Tag>;
                if (record.stock <= record.lowStockThreshold) {
                    return (
                        <Space direction="vertical" size={4}>
                            <Tag color="warning">{t('low_stock_level', language)}</Tag>
                            {(smartAlertItem?.purchaseHistory || []).length > 0 && (
                                <Text type="secondary" style={{ fontSize: 11 }}>
                                    Last 3 buy prices: {(smartAlertItem.purchaseHistory || []).map((entry) => `Tk ${Number(entry.unitCost || 0).toLocaleString()}`).join(', ')}
                                </Text>
                            )}
                        </Space>
                    );
                }
                return <Tag color="success">{t('in_stock', language)}</Tag>;
            }
        },
        ...(!isStaff ? [{
            title: t('actions', language),
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button
                        size="small"
                        onClick={() => {
                            setSelectedPart(record);
                            const fileList = record.imageUrl ? [{
                                uid: '-1',
                                name: 'product-image.png',
                                status: 'done',
                                url: record.imageUrl,
                            }] : [];

                            editForm.setFieldsValue({
                                purchasePrice: record.purchasePrice,
                                sellingPrice: record.sellingPrice,
                                companyRate: record.companyRate || 0,
                                image: fileList,
                                compatibleVehicles: (record.compatibleVehicles || []).map(v => 
                                    `${v.brand || v.make || ''} ${v.model || ''}`.trim()
                                ).filter(Boolean)
                            });
                            setIsEditModalVisible(true);
                        }}
                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'transparent', border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #000', color: isDark ? '#FFF' : '#000', fontWeight: 600, borderRadius: 0 }}
                    >
                        Edit
                    </Button>
                    <Button
                        size="small"
                        onClick={() => {
                            setSelectedPart(record);
                            adjustmentForm.setFieldsValue({
                                adjustmentType: 'return',
                                direction: 'IN',
                                quantity: 1,
                                note: '',
                                reference: ''
                            });
                            setIsAdjustModalVisible(true);
                        }}
                        style={{ background: 'transparent', border: isDark ? '1px solid #FFF' : '1px solid #000', color: isDark ? '#FFF' : '#000', fontWeight: 600, borderRadius: 0 }}
                    >
                        Adjust
                    </Button>
                    <Button
                        size="small"
                        onClick={() => {
                            setSelectedPart(record);
                            setIsRestockModalVisible(true);
                        }}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0 }}
                    >
                        Restock
                    </Button>
                </Space>
            )
        }] : [])
    ];

    const handleCustomUpload = async ({ file, onSuccess, onError }) => {
        message.warning("Image upload is currently unavailable (Firebase removed).");
        onError(new Error("Storage unavailable"));
    };

    const handleAddItem = async (values) => {
        try {
            const vehicles = (values.compatibleVehicles || []).map(tag => {
                const parts = tag.trim().split(' ');
                const brand = parts[0] || '';
                const model = parts.slice(1).join(' ') || '';
                return { make: brand, brand, model, yearRange: '' };
            });

            const newItem = {
                name: values.name,
                category: values.category,
                purchasePrice: values.purchasePrice || 0,
                sellingPrice: values.sellingPrice || 0,
                companyRate: values.companyRate || 0,
                stock: values.initialStock || 0,
                lowStockThreshold: values.lowStockThreshold || 5,
                compatibleVehicles: vehicles
            };

            const saved = await databaseBridge.addInventoryItem(newItem);
            setInventory([...inventory, saved]);
            
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

            logActivity(`${values.initialStock || 0} units of new part '${values.name}' added to inventory.`);
            setIsAddModalVisible(false);
            addForm.resetFields();
            message.success("New part added successfully!");
        } catch (error) {
            console.error(error);
            message.error("Failed to add new part");
        }
    };

    const handleRestock = (values) => {
        if (!selectedPart) return;
        const quantityAdded = values.quantity;
        const totalCost = selectedPart.purchasePrice * quantityAdded;
        const updatedInventory = inventory.map(item =>
            item.id === selectedPart.id ? { ...item, stock: item.stock + quantityAdded } : item
        );
        setInventory(updatedInventory);
        addExpense({
            id: Date.now().toString(),
            date: dayjs().toISOString(),
            title: `Restocked ${quantityAdded}x ${selectedPart.name}`,
            category: 'Parts Purchases',
            amount: totalCost,
            paymentMethod: values.paymentMethod || 'Cash'
        });
        logActivity(`${quantityAdded} units of '${selectedPart.name}' added to stock.`);
        setIsRestockModalVisible(false);
        restockForm.resetFields();
        setSelectedPart(null);
        message.success(`Restocked ${quantityAdded} items.`);
    };

    const handleInventoryAdjustment = async (values) => {
        if (!selectedPart) return;
        const qty = Number(values.quantity || 0);
        if (qty <= 0) return message.error('Enter a valid quantity');

        setIsAdjustingStock(true);
        try {
            const direction = (values.direction || (values.adjustmentType === 'return' ? 'IN' : 'OUT'));
            const payload = {
                adjustments: [
                    {
                        inventoryId: selectedPart.id,
                        quantity: qty,
                        type: values.adjustmentType === 'return' ? 'RETURN' : values.adjustmentType === 'damage' ? 'DAMAGE' : 'CORRECTION',
                        direction,
                        note: values.note || '',
                        reference: values.reference || ''
                    }
                ]
            };

            await databaseBridge.adjustInventoryStock(payload);
            await refreshInventoryFromServer();
            logActivity(`Inventory adjustment: ${qty} x ${selectedPart.name} (${values.adjustmentType} / ${direction})`);
            message.success('Inventory updated successfully.');
            setIsAdjustModalVisible(false);
            adjustmentForm.resetFields();
            setSelectedPart(null);
        } catch (error) {
            console.error('Inventory adjustment failed:', error);
            message.error('Failed to record the inventory adjustment. Please try again.');
        } finally {
            setIsAdjustingStock(false);
        }
    };

    const handleEditPart = async (values) => {
        if (!selectedPart) return;
        try {
            const vehicles = (values.compatibleVehicles || []).map(tag => {
                const parts = tag.trim().split(' ');
                const brand = parts[0] || '';
                const model = parts.slice(1).join(' ') || '';
                return { make: brand, brand, model, yearRange: '' };
            });

            const payload = {
                ...selectedPart,
                purchasePrice: values.purchasePrice,
                sellingPrice: values.sellingPrice,
                companyRate: values.companyRate || 0,
                compatibleVehicles: vehicles
            };

            const updated = await databaseBridge.saveCollection('inventory', [payload]);
            if (updated && updated.length > 0) {
                setInventory(inventory.map(item => item.id === selectedPart.id ? updated[0] : item));
            }

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

            logActivity(`Updated details for '${selectedPart.name}'.`);
            setIsEditModalVisible(false);
            editForm.resetFields();
            setSelectedPart(null);
            message.success("Item updated successfully");
        } catch (error) {
            console.error(error);
            message.error("Failed to update item");
        }
    };
    
    return (
        <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: isDark ? '#FFFFFF' : '#000000', fontWeight: 600, letterSpacing: '0.2px' }}>{t('parts_inventory', language)}</Title>
                    <Text style={{ color: isDark ? '#3B82F6' : '#1d4ed8', fontWeight: 600, fontSize: 11, letterSpacing: '0.2px' }}>Mamun Automobiles ERP | Genuine spares | Stock management</Text>
                </div>
                <Space>
                    <Button
                        size="large"
                        onClick={() => setIsAddModalVisible(true)}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0, letterSpacing: '0.2px' }}
                    >
                        {t('register_new_part', language)}
                    </Button>
                </Space>
            </div>

            {/* Smart Alerts Section */}
            {(lowStockItems.length > 0) && (
                <div className="glass-card" style={{ padding: '20px', marginBottom: '30px', borderLeft: '4px solid #ff4d4f' }}>
                    <div style={{ color: '#ff4d4f', fontWeight: 600, marginBottom: '15px', letterSpacing: '0.2px' }}>{t('critical_stock_alerts', language)}</div>
                    <Row gutter={[16, 16]}>
                        {lowStockItems.map(item => (
                            <Col xs={24} sm={12} md={8} key={item.id}>
                                <div style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#fff1f0', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: isDark ? 'none' : '1px solid #ffa39e' }}>
                                    <div>
                                        <div style={{ fontWeight: 600, color: isDark ? '#FFF' : '#000', fontSize: 12 }}>{item.name}</div>
                                        <div style={{ fontSize: 11, color: isDark ? '#888' : '#374151' }}>Current Stock: {item.stock}</div>
                                    </div>
                                    <Button size="small" onClick={() => { setSelectedPart(item); setIsRestockModalVisible(true); }} style={{ borderRadius: 0, fontWeight: 600, fontSize: 10 }}>{t('restock_item', language)}</Button>
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}

            <div className="glass-card" style={{ padding: '24px' }}>
                <div style={{ marginBottom: 24 }}>
                    <Input
                        placeholder={t('search_parts', language)}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                        size="large"
                        style={{ background: isDark ? 'rgba(255,255,255,0.05)' : '#FFFFFF', border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #000000', color: isDark ? '#FFF' : '#000' }}
                    />
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredInventory}
                    rowKey="id"
                    pagination={{ pageSize: 15 }}
                    className="luxury-table"
                    size="middle"
                    scroll={{ x: 'max-content' }}
                />
            </div>

            <Modal title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>{t('add_new_item', language)}</span>} open={isAddModalVisible} onCancel={() => setIsAddModalVisible(false)} footer={null} destroyOnClose className="luxury-modal">
                <Form form={addForm} layout="vertical" onFinish={handleAddItem}>
                    <Form.Item name="name" label={t('item_name_label', language)} rules={[{ required: true }]}>
                        <Input 
                            size="large" 
                            onBlur={(e) => correctAdd('name', e.target.value, 'product_name')}
                        />
                    </Form.Item>
                    <Form.Item 
                        label={
                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', alignItems: 'center' }}>
                                <span>{t('category', language)}</span>
                                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => setIsQuickCategoryModalOpen(true)}>
                                    + New Category
                                </Button>
                            </div>
                        }
                        name="category" 
                        rules={[{ required: true }]}
                    >
                        <Select size="large" showSearch placeholder="Select or search category">
                            {availableCategories.map(cat => (
                                <Option key={cat} value={cat}>{cat}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="purchasePrice" label={t('cost_price', language)}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="sellingPrice" label={t('selling_price_label', language)}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="initialStock" label={t('initial_stock', language)}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="lowStockThreshold" label={t('low_stock_level', language)}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="compatibleVehicles" label={t('target_cars', language)} tooltip="Type car brand/model and press Enter">
                        <Select mode="tags" style={{ width: '100%' }} placeholder="e.g. Toyota Corolla">
                            {vehicleModels.map(m => (
                                <Option key={m._id || m.id} value={`${m.brand} ${m.model}`}>
                                    {m.brand} {m.model}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <div style={{ textAlign: 'right' }}>
                        <Space><Button onClick={() => setIsAddModalVisible(false)}>{t('cancel', language)}</Button><Button type="primary" htmlType="submit">{t('complete', language)}</Button></Space>
                    </div>
                </Form>
            </Modal>

            <Modal title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>{t('restock_item', language)}</span>} open={isRestockModalVisible} onCancel={() => setIsRestockModalVisible(false)} footer={null} destroyOnClose className="luxury-modal">
                <Form form={restockForm} layout="vertical" onFinish={handleRestock}>
                    <Form.Item name="quantity" label={t('qty', language)} rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="paymentMethod" label={t('settlement_method', language)} initialValue="Cash"><Select><Option value="Cash">Cash</Option></Select></Form.Item>
                    <div style={{ textAlign: 'right' }}>
                        <Space><Button onClick={() => setIsRestockModalVisible(false)}>{t('cancel', language)}</Button><Button type="primary" htmlType="submit">{t('restock_item', language)}</Button></Space>
                    </div>
                </Form>
            </Modal>

            <Modal title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>{t('adjust_stock', language)}</span>} open={isAdjustModalVisible} onCancel={() => setIsAdjustModalVisible(false)} footer={null} destroyOnClose className="luxury-modal">
                <Form form={adjustmentForm} layout="vertical" onFinish={handleInventoryAdjustment} initialValues={{ adjustmentType: 'return', direction: 'IN' }}>
                    <Form.Item name="quantity" label={t('qty', language)} rules={[{ required: true, min: 1 }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="adjustmentType" label="Adjustment Type">
                        <Select
                            onChange={(value) => {
                                adjustmentForm.setFieldsValue({
                                    direction: value === 'return' ? 'IN' : 'OUT'
                                });
                            }}
                        >
                            <Select.Option value="return">Return to Stock</Select.Option>
                            <Select.Option value="damage">Mark as Damaged / Removed</Select.Option>
                            <Select.Option value="correction">Manual Correction</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="direction" label={t('stock_impact', language)}>
                        <Select>
                            <Select.Option value="IN">Increase Stock (IN)</Select.Option>
                            <Select.Option value="OUT">Reduce Stock (OUT)</Select.Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="note" label={t('reduction_reason', language)}>
                        <Input.TextArea rows={2} placeholder="Provide context (e.g., returned to supplier, damaged during inspection)" />
                    </Form.Item>
                    <Form.Item name="reference" label="Reference">
                        <Input placeholder="Invoice #, challan, ticket ID" />
                    </Form.Item>
                    <div style={{ textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => setIsAdjustModalVisible(false)}>Cancel</Button>
                            <Button type="primary" htmlType="submit" loading={isAdjustingStock} style={{ backgroundColor: '#d97706', borderColor: '#d97706' }}>
                                {t('apply_adjustment', language)}
                            </Button>
                        </Space>
                    </div>
                </Form>
            </Modal>

            <Modal title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>{t('edit_item_details', language)}</span>} open={isEditModalVisible} onCancel={() => setIsEditModalVisible(false)} footer={null} destroyOnClose className="luxury-modal">
                <Form form={editForm} layout="vertical" onFinish={handleEditPart}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="purchasePrice" label={t('cost_price', language)}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="sellingPrice" label={t('selling_price_label', language)}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Form.Item name="companyRate" label={t('quotation', language)}><InputNumber style={{ width: '100%' }} /></Form.Item>
                    <Form.Item name="compatibleVehicles" label={t('target_cars', language)} tooltip="Type car brand/model and press Enter">
                        <Select mode="tags" style={{ width: '100%' }} placeholder="e.g. Toyota Corolla">
                            {vehicleModels.map(m => (
                                <Option key={m._id || m.id} value={`${m.brand} ${m.model}`}>
                                    {m.brand} {m.model}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <div style={{ textAlign: 'right' }}>
                        <Space><Button onClick={() => setIsEditModalVisible(false)}>Cancel</Button><Button type="primary" htmlType="submit">Update</Button></Space>
                    </div>
                </Form>
            </Modal>

            <Modal
                title="Add New Category"
                open={isQuickCategoryModalOpen}
                onCancel={() => setIsQuickCategoryModalOpen(false)}
                onOk={handleQuickAddCategory}
                okText="Save Category"
                width={400}
                className="luxury-modal"
                destroyOnClose
            >
                <div style={{ padding: '10px 0' }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>Enter new category name:</Text>
                    <Input 
                        placeholder="e.g. Turbochargers" 
                        value={newCategoryName}
                        onChange={e => setNewCategoryName(e.target.value)}
                        onPressEnter={handleQuickAddCategory}
                        autoFocus
                    />
                </div>
            </Modal>
        </>
    );
};

export default InventoryPage;




