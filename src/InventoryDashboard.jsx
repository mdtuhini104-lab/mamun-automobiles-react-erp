import React from 'react';
import { Table, Tag, Input, Space, Typography, Card, Badge, Button, message, Modal, Form, InputNumber, Select, Divider } from 'antd';
import { SearchOutlined, AlertOutlined, PlusOutlined, EditOutlined, ReloadOutlined, MinusCircleOutlined, CarOutlined } from '@ant-design/icons';
import databaseBridge from './services/databaseBridge';
import { useGlobalState } from './contexts/GlobalStateContext';

const { Title, Text } = Typography;
const { Option } = Select;

const InventoryDashboard = () => {
    const { inventory, setInventory, services, categories, logActivity, vehicleModels, setVehicleModels, inventorySearchTerm, setInventorySearchTerm } = useGlobalState();
    const [loading, setLoading] = React.useState(true);
    const [searchText, setSearchText] = React.useState('');
    const [vehicleSearchText, setVehicleSearchText] = React.useState('');
    const [alerts, setAlerts] = React.useState([]);
    const [isModalVisible, setIsModalVisible] = React.useState(false);
    const [editingItem, setEditingItem] = React.useState(null);
    const [form] = Form.useForm();
    const [isCorrecting, setIsCorrecting] = React.useState(false);

    const correctAI = async (fieldName, text) => {
        if (!text || text.length < 3) return;
        setIsCorrecting(true);
        try {
            // Production Standard: Terminology Correction
            const response = await fetch('/api/ai/correct-term', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term: text })
            });
            const data = await response.json();
            if (data.corrected) {
                form.setFieldsValue({ [fieldName]: data.corrected });
                message.success(`Corrected to: ${data.corrected}`);
            }
        } catch (err) {
            console.error('[Terminology] Error fixing terminology:', err);
        } finally {
            setIsCorrecting(false);
        }
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const [items, lowStock] = await Promise.all([
                databaseBridge.fetchCollection('inventory'),
                databaseBridge.fetchCollection('inventoryAlerts')
            ]);
            setInventory(items || []);
            setAlerts(lowStock || []);
        } catch (error) {
            console.error('Error fetching inventory:', error);
            message.error('Failed to load inventory data');
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        fetchData();
        // Clear global search term on unmount so dashboard starts fresh next time? 
        // Actually, user might want it to persist, but for "jump" logic, it's better to clear it when leaving?
        // Let's just track it here.
    }, []);

    // Sync local search with global search term
    React.useEffect(() => {
        if (inventorySearchTerm !== undefined) {
            setSearchText(inventorySearchTerm);
        }
    }, [inventorySearchTerm]);

    const handleSave = async (values) => {
        setLoading(true);
        try {
            const vehicles = (values.compatibleVehicles || []).map(tag => {
                const parts = tag.trim().split(' ');
                const brand = parts[0] || '';
                const model = parts.slice(1).join(' ') || '';
                return { make: brand, brand, model, yearRange: '' };
            });

            const payload = {
                ...values,
                id: editingItem?.id || `INV-${Date.now()}`,
                compatibleVehicles: vehicles
            };

            const updated = await databaseBridge.saveCollection('inventory', [payload]);
            if (updated && updated.length > 0) {
                setInventory(inventory.map(item => item.id === (editingItem?.id || '') ? updated[0] : item));
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

            message.success(`Part ${editingItem ? 'updated' : 'added'} successfully`);
            setIsModalVisible(false);
            setEditingItem(null);
            form.resetFields();
            fetchData();
        } catch (error) {
            message.error('Failed to save part');
        } finally {
            setLoading(false);
        }
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        form.setFieldsValue({
            ...record,
            compatibleVehicles: (record.compatibleVehicles || []).map(v => 
                `${v.brand || v.make || ''} ${v.model || ''}`.trim()
            ).filter(Boolean)
        });
        setIsModalVisible(true);
    };

    const columns = [
        {
            title: 'Part Number',
            dataIndex: 'partNumber',
            key: 'partNumber',
            render: (text) => <Text strong>{text || 'N/A'}</Text>,
        },
        {
            title: 'Part Name',
            dataIndex: 'partName',
            key: 'partName',
            render: (text, record) => (
                <Space>
                    <Text>{text}</Text>
                    {record.quantity <= record.minStockLevel && (
                        <Badge count="Low Stock" style={{ backgroundColor: '#ff4d4f' }} />
                    )}
                </Space>
            ),
        },
        {
            title: 'Category',
            dataIndex: 'category',
            key: 'category',
            render: (text) => <Tag color="blue">{text || 'Uncategorized'}</Tag>,
        },
        {
            title: 'Quantity',
            dataIndex: 'quantity',
            key: 'quantity',
            render: (qty, record) => (
                <Text type={qty <= record.minStockLevel ? 'danger' : 'success'} strong>
                    {qty}
                </Text>
            ),
            sorter: (a, b) => a.quantity - b.quantity,
        },
        {
            title: 'Unit Price',
            dataIndex: 'unitPrice',
            key: 'unitPrice',
            render: (price) => `৳ ${Number(price || 0).toLocaleString()}`,
        },
        {
            title: 'Compatible Vehicles',
            dataIndex: 'compatibleVehicles',
            key: 'compatibleVehicles',
            render: (vehicles) => (
                <Space direction="vertical" size={2}>
                    {(vehicles || []).map((v, idx) => {
                        if (!v) return null;
                        const label = typeof v === 'string' ? v : `${v.brand || v.make || ''} ${v.model || ''}`.trim();
                        return (
                            <Tag key={idx} color="orange" style={{ fontSize: '10px' }}>
                                {label || 'N/A'}
                            </Tag>
                        );
                    })}
                    {(!vehicles || vehicles.length === 0) && <Text type="secondary" italic>No models linked</Text>}
                </Space>
            ),
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Button type="text" icon={<EditOutlined />} onClick={() => handleEdit(record)}>Edit</Button>
            )
        }
    ];

    const filteredData = inventory.filter(item => {
        const searchLower = searchText.toLowerCase();
        const matchesPart = (item.partName || '').toLowerCase().includes(searchLower) ||
                           (item.partNumber || '').toLowerCase().includes(searchLower);
        
        const matchesVehicleInMain = (item.compatibleVehicles || []).some(v => 
            `${v.make || ''} ${v.model || ''} ${v.yearRange || ''}`.toLowerCase().includes(searchLower)
        );

        const vehicleSearchLower = vehicleSearchText.toLowerCase();
        const matchesVehicleSpecific = !vehicleSearchText || (item.compatibleVehicles || []).some(v => 
            `${v.make || ''} ${v.model || ''} ${v.yearRange || ''}`.toLowerCase().includes(vehicleSearchLower)
        );

        return (matchesPart || matchesVehicleInMain) && matchesVehicleSpecific;
    });

    return (
        <div className="page-transition-enter" style={{ padding: '24px', background: 'transparent', minHeight: '100vh' }}>
            <div className="glass-card" style={{ padding: '24px', marginBottom: '32px', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: 'var(--text-main)' }}>Inventory Dashboard</Title>
                    <Text style={{ color: 'var(--text-muted)' }}>Manage parts and monitor stock levels across the warehouse.</Text>
                </div>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={fetchData}>Refresh</Button>
                    {alerts.length > 0 && (
                        <div style={{ marginRight: '16px', display: 'flex', alignItems: 'center' }}>
                            <Badge count={alerts.length}>
                                <AlertOutlined style={{ fontSize: '20px', color: '#ff4d4f' }} />
                            </Badge>
                            <Text style={{ marginLeft: '8px', color: '#ff4d4f', fontWeight: 'bold' }}>Low Stock</Text>
                        </div>
                    )}
                    <Button type="primary" className="premium-blue-btn" icon={<PlusOutlined />} onClick={() => { setEditingItem(null); form.resetFields(); setIsModalVisible(true); }}>
                        Add New Part
                    </Button>
                </Space>
            </div>

            <Card className="glass-card" bordered={false} styles={{ body: { padding: 0 } }} style={{ borderRadius: '12px', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border-color, #f0f0f0)' }}>
                    <Space direction="horizontal" size="middle">
                        <Input
                            placeholder="Part Search..."
                            prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                            value={searchText}
                            onChange={e => setSearchText(e.target.value)}
                            style={{ width: '250px', borderRadius: '8px' }}
                        />
                        <Input
                            placeholder="Vehicle Compatibility Search (e.g. Corolla)..."
                            prefix={<CarOutlined style={{ color: '#bfbfbf' }} />}
                            value={vehicleSearchText}
                            onChange={e => setVehicleSearchText(e.target.value)}
                            style={{ width: '350px', borderRadius: '8px' }}
                        />
                    </Space>
                </div>
                <Table
                    columns={columns}
                    dataSource={filteredData}
                    loading={loading}
                    rowKey="id"
                    pagination={{ pageSize: 12 }}
                    style={{ background: 'transparent' }}
                />
            </Card>

            <Modal
                title={editingItem ? 'Edit Part' : 'Add New Part'}
                visible={isModalVisible}
                onCancel={() => setIsModalVisible(false)}
                onOk={() => form.submit()}
                confirmLoading={loading}
                destroyOnClose
            >
                <Form form={form} layout="vertical" onFinish={handleSave} initialValues={{ minStockLevel: 5, quantity: 0 }}>
                    <Form.Item name="partName" label="Part Name" rules={[{ required: true, message: 'Please enter part name' }]}>
                        <Input 
                            placeholder="e.g. Brake Pad - Front" 
                            onBlur={(e) => correctAI('partName', e.target.value)}
                        />
                    </Form.Item>
                    <Form.Item name="partNumber" label="Part Number" rules={[{ required: true, message: 'Please enter part number' }]}>
                        <Input placeholder="e.g. BP-101-FR" />
                    </Form.Item>
                    <Form.Item name="category" label="Category">
                        <Select placeholder="Select Category">
                            <Option value="Engine">Engine</Option>
                            <Option value="Brakes">Brakes</Option>
                            <Option value="Suspension">Suspension</Option>
                            <Option value="Electrical">Electrical</Option>
                            <Option value="Body">Body</Option>
                            <Option value="Filter">Filter</Option>
                            <Option value="Others">Others</Option>
                        </Select>
                    </Form.Item>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item name="quantity" label="Initial Quantity" style={{ flex: 1 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="minStockLevel" label="Min Stock Level" style={{ flex: 1 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>
                    <div style={{ display: 'flex', gap: '16px' }}>
                        <Form.Item name="unitPrice" label="Standard Purchase Rate (৳)" style={{ flex: 1 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="sellingPrice" label="Standard Selling Rate (৳)" style={{ flex: 1 }}>
                            <InputNumber min={0} style={{ width: '100%' }} />
                        </Form.Item>
                    </div>
                    <Form.Item
                        name="compatibleVehicles"
                        label="Target Car(s)"
                        tooltip="Type car model and press Enter to add as a tag"
                    >
                        <Select
                            mode="tags"
                            placeholder="e.g. Toyota Corolla 2015, Honda Civic 2018"
                            style={{ width: '100%' }}
                            showSearch
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
                </Form>
            </Modal>
        </div>
    );
};

export default InventoryDashboard;




