import React from 'react';
import {
    Card, Table, Button, Modal, Form, Input, InputNumber, Select,
    Tag, Space, Typography, Row, Col, Statistic, Popconfirm, message, Tooltip
} from 'antd';

import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const CATEGORIES = [
    'Maintenance', 'Engine', 'Brakes', 'Cooling', 'Tyres', 'Body Work',
    'Electrical', 'Transmission', 'Suspension', 'Exhaust', 'Other'
];

const ServicesPage = () => {
    const { services, setServices } = useGlobalState();
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';
    const canEdit = isAdmin || user?.role === 'Manager';

    const [isModalOpen, setIsModalOpen] = React.useState(false);
    const [editingService, setEditingService] = React.useState(null);
    const [form] = Form.useForm();
    const [saving, setSaving] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');

    // Stats
    const categoryCount = (services || []).reduce((acc, s) => {
        acc[s.category || 'Other'] = (acc[s.category || 'Other'] || 0) + 1;
        return acc;
    }, {});
    const avgRate = services?.length
        ? Math.round((services || []).reduce((s, sv) => s + (sv.basePrice || 0), 0) / services.length)
        : 0;

    const filteredServices = (services || []).filter(s =>
        !searchText || s.name?.toLowerCase().includes(searchText.toLowerCase()) || s.category?.toLowerCase().includes(searchText.toLowerCase())
    );

    // ─── Add / Edit ──────────────────────────────────────────────────────
    const openAdd = () => {
        setEditingService(null);
        form.resetFields();
        setIsModalOpen(true);
    };

    const openEdit = (svc) => {
        setEditingService(svc);
        form.setFieldsValue({ name: svc.name, basePrice: svc.basePrice, companyRate: svc.companyRate, category: svc.category, description: svc.description });
        setIsModalOpen(true);
    };

    const handleSave = async (values) => {
        setSaving(true);
        try {
            if (editingService) {
                // Update
                const updated = (services || []).map(s =>
                    s.id === editingService.id
                        ? { ...s, name: values.name.trim(), basePrice: values.basePrice, companyRate: values.companyRate ?? s.companyRate ?? 0, category: values.category, description: values.description || '', updatedAt: dayjs().toISOString() }
                        : s
                );
                setServices(updated);
                message.success(`Service '${values.name}' updated!`);
            } else {
                // Create — check for duplicate
                const exists = (services || []).some(s => s.name.toLowerCase() === values.name.trim().toLowerCase());
                if (exists) { message.error('A service with this name already exists.'); setSaving(false); return; }
                const newSvc = {
                    id: `svc-${Date.now()}`,
                    name: values.name.trim(),
                    basePrice: values.basePrice,
                    companyRate: values.companyRate ?? 0,
                    category: values.category || 'Other',
                    description: values.description || '',
                    createdAt: dayjs().toISOString()
                };
                setServices([...(services || []), newSvc]);
                message.success(`Service '${values.name}' added!`);
            }
            setIsModalOpen(false);
            form.resetFields();
            setEditingService(null);
        } finally {
            setSaving(false);
        }
    };

    // ─── Delete ──────────────────────────────────────────────────────────
    const handleDelete = (svc) => {
        setServices((services || []).filter(s => s.id !== svc.id));
        message.success(`Service '${svc.name}' deleted.`);
    };

    // ─── Table Columns ────────────────────────────────────────────────────
    const columns = [
        {
            title: '#', width: 45,
            render: (_, __, idx) => <Text type="secondary">{idx + 1}</Text>
        },
        {
            title: 'Service Name', dataIndex: 'name',
            render: (name, r) => (
                <Space>
                    <div>
                        <div style={{ fontWeight: 600 }}>{name}</div>
                        {r.description && <div style={{ fontSize: 11, color: '#888' }}>{r.description}</div>}
                    </div>
                </Space>
            )
        },
        {
            title: 'Category', dataIndex: 'category',
            render: cat => <Tag color="blue">{cat || 'Other'}</Tag>
        },
        {
            title: 'Rates',
            key: 'rates',
            align: 'right',
            sorter: (a, b) => (a.basePrice || 0) - (b.basePrice || 0),
            render: (_, r) => (
                <div style={{ textAlign: 'right', lineHeight: 1.6 }}>
                    <div><Tag color="green" style={{ margin: 0 }}>Standard</Tag> <Text strong style={{ color: '#52c41a' }}>৳ {(r.basePrice || 0).toLocaleString()}</Text></div>
                    <div style={{ marginTop: 2 }}><Tag color="purple" style={{ margin: 0 }}>Company</Tag> <Text strong style={{ color: '#722ed1' }}>৳ {(r.companyRate || 0).toLocaleString()}</Text></div>
                </div>
            )
        },
        {
            title: 'Added', dataIndex: 'createdAt',
            render: d => d ? dayjs(d).format('DD MMM YY') : '—'
        },
        {
            title: 'Actions', width: 120,
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="Edit">
                        <Button size="small" disabled={!canEdit} onClick={() => openEdit(record)}>Edit</Button>
                    </Tooltip>
                    <Popconfirm
                        title="Delete this service?"
                        description="This won't affect existing bills, only future billing suggestions."
                        onConfirm={() => handleDelete(record)}
                        okText="Delete" cancelText="Cancel" okButtonProps={{ danger: true }}
                        disabled={!isAdmin}
                    >
                        <Button size="small" danger disabled={!isAdmin}>Delete</Button>
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0 }}>Services & rates</Title>
                    <Text type="secondary">Manage service templates — rates auto-fill when creating bills</Text>
                </div>
                {canEdit && (
                    <Button type="primary" size="large" onClick={openAdd} className="premium-blue-btn" style={{ background: '#3B82F6', border: 'none' }}>
                        Add Service
                    </Button>
                )}
            </div>

            {/* Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ background: '#f0f5ff', border: '1px solid #adc6ff' }}>
                        <Statistic title="Total Services" value={services?.length || 0} valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ background: '#f6ffed', border: '1px solid #b7eb8f' }}>
                        <Statistic title="Avg. Base Rate" value={avgRate} prefix="৳" valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <Statistic title="Categories" value={Object.keys(categoryCount).length} valueStyle={{ color: '#3B82F6' }} />
                    </Card>
                </Col>
                <Col xs={12} sm={6}>
                    <Card size="small" style={{ background: '#f9f0ff', border: '1px solid #d3adf7' }}>
                        <Statistic title="Highest Rate" value={Math.max(0, ...(services || []).map(s => s.basePrice || 0))} prefix="৳" valueStyle={{ color: '#722ed1' }} />
                    </Card>
                </Col>
            </Row>

            {/* Category breakdown */}
            <Card style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Text strong style={{ marginRight: 4 }}>By Category:</Text>
                    {Object.entries(categoryCount).map(([cat, count]) => (
                        <Tag key={cat} color="blue">{cat}: {count}</Tag>
                    ))}
                </div>
            </Card>

            {/* Table */}
            <Card title={`All Services (${filteredServices.length})`}
                extra={
                    <Input.Search placeholder="Search services..." allowClear value={searchText}
                        onChange={e => setSearchText(e.target.value)} style={{ width: 220 }} />
                }
            >
                <Table
                    dataSource={filteredServices} columns={columns} rowKey="id"
                    pagination={{ pageSize: 15 }}
                    locale={{ emptyText: 'No services yet. Add one to get started.' }}
                />
            </Card>

            {/* Add/Edit Modal */}
            <Modal
                title={editingService ? `Edit Service: ${editingService.name}` : 'Add New Service'}
                open={isModalOpen}
                onCancel={() => { setIsModalOpen(false); form.resetFields(); setEditingService(null); }}
                footer={null} width={480}
            >
                <Form form={form} onFinish={handleSave} layout="vertical">
                    <Form.Item name="name" label="Service Name" rules={[{ required: true, message: 'Enter service name' }]}>
                        <Input placeholder="e.g. Full Engine Overhaul" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="basePrice" label="Standard Rate (৳)" rules={[{ required: true, message: 'Enter standard rate' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 2500"
                                    formatter={v => `৳ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={v => v.replace(/৳\s?|(,*)/g, '')} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="companyRate" label="Company Rate (৳)" rules={[{ required: true, message: 'Enter company rate' }]}>
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="e.g. 2200"
                                    formatter={v => `৳ ${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    parser={v => v.replace(/৳\s?|(,*)/g, '')} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="category" label="Category" initialValue="Maintenance">
                                <Select>
                                    {CATEGORIES.map(c => <Option key={c} value={c}>{c}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="description" label="Notes (optional)">
                        <Input.TextArea rows={2} placeholder="Any notes about this service..." />
                    </Form.Item>
                    <div style={{ background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 6, padding: '8px 12px', marginBottom: 16, fontSize: 12, color: '#1d3557' }}>
                        💡 <strong>Standard Rate</strong> applies for regular customers. <strong>Company Rate</strong> auto-fills when a registered company is selected in Billing. Both can be manually adjusted per bill.
                    </div>
                    <Button type="primary" htmlType="submit" block size="large" loading={saving} className="premium-blue-btn" style={{ background: '#3B82F6', border: 'none' }}>
                        {editingService ? 'Update Service' : 'Add Service'}
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default ServicesPage;




