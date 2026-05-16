import React from 'react';
import {
    Table, Button, Tag, Typography, Card, message, Spin, Space,
    Modal, Descriptions, Badge, Row, Col, Statistic, Input, Select, Tooltip, Alert, Form
} from 'antd';


import databaseBridge from './services/databaseBridge';
import { syncToLocalStorage } from './utils/helpers';
import { useGlobalState } from './contexts/GlobalStateContext';
import { t } from './utils/translations';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const STATUS_COLOR = {
    pending: 'orange',
    approved: 'blue',
    in_progress: 'processing',
    completed: 'success',
    cancelled: 'error',
};

const WorkOrderPage = () => {
    const { navigateTo, userManagement, lang } = useGlobalState();
    const [allWorkOrders, setAllWorkOrders] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [generatingId, setGeneratingId] = React.useState(null);
    const [viewRecord, setViewRecord] = React.useState(null);
    const [workOrderForm] = Form.useForm();
    const [assigningMechanic, setAssigningMechanic] = React.useState(false);
    const [searchText, setSearchText] = React.useState('');
    const [statusFilter, setStatusFilter] = React.useState('all');
    // Highlighted quotation (from sessionStorage when navigated from Quotations page)
    const [highlightedQuotationId, setHighlightedQuotationId] = React.useState(null);

    const loadWorkOrders = React.useCallback(async () => {
        setLoading(true);
        try {
            const data = await databaseBridge.fetchWorkOrders();
            setAllWorkOrders(data || []);
        } catch (err) {
            console.error(err);
            message.error('Failed to load work orders');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadWorkOrders();

        // Check if we were navigated here to highlight a specific quotation's WO
        const pending = sessionStorage.getItem('highlightWorkOrderForQuotation');
        if (pending) {
            setHighlightedQuotationId(pending);
            sessionStorage.removeItem('highlightWorkOrderForQuotation');
        }
    }, [loadWorkOrders]);

    // Auto-open the highlighted work order details when it loads
    React.useEffect(() => {
        if (highlightedQuotationId && allWorkOrders.length > 0) {
            const wo = allWorkOrders.find(w => String(w.quotationId) === String(highlightedQuotationId));
            if (wo) {
                setViewRecord(wo);
            }
        }
    }, [highlightedQuotationId, allWorkOrders]);

    React.useEffect(() => {
        if (viewRecord) {
            workOrderForm.setFieldsValue({
                assigned_staff_id: viewRecord.assigned_staff_id || null
            });
        } else {
            workOrderForm.resetFields();
        }
    }, [viewRecord, workOrderForm]);

    // Filter work orders
    const workOrders = (allWorkOrders || []).filter(wo => {
        const statusOk = statusFilter === 'all' ? true : wo.status === statusFilter;
        const searchOk = !searchText
            ? true
            : (String(wo.id || '').toLowerCase().includes(searchText.toLowerCase()) ||
                String(wo.quotationId || '').toLowerCase().includes(searchText.toLowerCase()) ||
                String(wo.jobCardId || '').toLowerCase().includes(searchText.toLowerCase()) ||
                String(wo.clientName || '').toLowerCase().includes(searchText.toLowerCase()));
        return statusOk && searchOk;
    });

    // Stats
    const stats = {
        total: allWorkOrders.length,
        approved: allWorkOrders.filter(w => w.status === 'approved' || w.status === 'pending').length,
        inProgress: allWorkOrders.filter(w => w.status === 'in_progress').length,
        completed: allWorkOrders.filter(w => w.status === 'completed').length,
    };

    const availableMechanics = React.useMemo(() => {
        return (userManagement || []).filter((staff) => staff.role !== 'Customer');
    }, [userManagement]);

    const closeWorkOrderModal = () => {
        workOrderForm.resetFields();
        setViewRecord(null);
    };

    const handleGenerateBill = async (record) => {
        setGeneratingId(record.id);
        try {
            await databaseBridge.updateWorkOrder(record.id, { status: 'completed' });
            message.success('Work Order completed — redirecting to Billing...');
            loadWorkOrders();

            const billData = {
                jobId: record.jobCardId,
                customerName: record.clientName,
                phone: record.clientPhone,
                vehicleNo: record.vehicleNo,
                billingEntity: record.billingEntity || 'Mamun Automobiles',
                description: `Work Order #${record.id} (Quotation #${record.quotationId || '—'})`,
                parts: (record.items || []).filter(i => i.type === 'Part'),
                services: (record.items || []).filter(i => i.type === 'Service').map(s => ({
                    ...s, basePrice: s.price || s.basePrice || 0
                }))
            };
            syncToLocalStorage('pendingBillData', billData);
            setTimeout(() => {
                if (navigateTo) navigateTo('3');
            }, 1200);
        } catch (err) {
            console.error(err);
            message.error('Failed to complete work order');
        } finally {
            setGeneratingId(null);
        }
    };

    const handleAssignMechanic = async (values) => {
        if (!viewRecord) return;
        setAssigningMechanic(true);
        const staff = (userManagement || []).find(u => u.id === values.assigned_staff_id);
        const payload = {
            assigned_staff_id: values.assigned_staff_id || null,
            assigned_staff_name: staff ? staff.name : null
        };
        try {
            const updated = await databaseBridge.updateWorkOrder(viewRecord.id, payload);
            setAllWorkOrders(prev => prev.map(wo => wo.id === viewRecord.id ? updated : wo));
            setViewRecord(updated);
            message.success('Mechanic assignment saved.');
        } catch (err) {
            console.error('Failed to assign mechanic:', err);
            message.error('Failed to update mechanic assignment.');
        } finally {
            setAssigningMechanic(false);
        }
    };

    const columns = [
        {
            title: t('wo_id', lang),
            dataIndex: 'id',
            key: 'id',
            render: (v, record) => (
                <Space direction="vertical" size={0}>
                    <Text strong style={{ color: '#1890ff' }}>#{v}</Text>
                    {record.quotationId && (
                        <Text type="secondary" style={{ fontSize: 10 }}>Qt: {record.quotationId}</Text>
                    )}
                </Space>
            ),
            width: 140,
        },
        {
            title: t('job_cards', lang),
            dataIndex: 'jobCardId',
            key: 'jobCardId',
            render: v => v ? <Tag color="geekblue">#{v}</Tag> : <Tag color="purple">Direct</Tag>,
        },
        {
            title: t('vehicle_customer', lang),
            key: 'client',
            render: (_, r) => (
                <div>
                    <div><Text strong>{r.clientName || '—'}</Text></div>
                    {r.vehicleNo && <Tag color="purple" style={{ marginTop: 2 }}>{r.vehicleNo}</Tag>}
                    {r.clientPhone && <div><Text type="secondary" style={{ fontSize: 11 }}>{r.clientPhone}</Text></div>}
                </div>
            ),
        },
        {
            title: t('total_amount', lang),
            dataIndex: 'totalAmount',
            key: 'totalAmount',
            render: v => <Text strong>৳ {Number(v || 0).toLocaleString()}</Text>,
        },
        {
            title: t('status', lang),
            dataIndex: 'status',
            key: 'status',
            render: s => (
                <Tag color={STATUS_COLOR[s] || 'blue'} style={{ fontWeight: 600 }}>
                    {t(s || 'approved', lang)}
                </Tag>
            ),
        },
        {
            title: t('created', lang),
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: v => v ? dayjs(v).format('DD MMM YYYY') : '—',
        },
        {
            title: t('actions', lang),
            key: 'action',
            render: (_, record) => (
                <Space>
                    <Tooltip title="View / Print Details">
                        <Button
                            size="small"
                            type="default"
                            onClick={() => setViewRecord(record)}
                        >
                            {t('view', lang)}
                        </Button>
                    </Tooltip>
                    {record.status !== 'completed' && record.status !== 'cancelled' && (
                        <Button
                            type="primary"
                            size="small"
                            loading={generatingId === record.id}
                            onClick={() => handleGenerateBill(record)}
                            style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                        >
                            {t('generate_final_bill', lang)}
                        </Button>
                    )}
                    {record.status === 'completed' && (
                        <Tag color="success" >{t('billed', lang)}</Tag>
                    )}
                </Space>
            ),
        },
    ];

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Loading work orders..." />
            </div>
        );
    }

    return (
        <div style={{ padding: '0 8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={2} style={{ margin: 0 }}>Work orders</Title>
                    <Text type="secondary">{lang === 'bn' ? 'কোটেশন অনুমোদিত হলে ওয়ার্ক অর্ডার স্বয়ংক্রিয়ভাবে তৈরি হয়' : 'Auto-created when Quotations are approved (Passed)'}</Text>
                </div>
                <Button onClick={loadWorkOrders}>{t('refresh', lang)}</Button>
            </div>

            {highlightedQuotationId && allWorkOrders.some(w => String(w.quotationId) === String(highlightedQuotationId)) && (
                <Alert
                    message={`Work Order created from Quotation #${highlightedQuotationId} — details are shown below.`}
                    type="success"
                    closable
                    style={{ marginBottom: 16 }}
                />
            )}

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={12} md={6}>
                    <Card size="small" className="glass-card">
                        <Statistic title={t('total', lang)} value={stats.total} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" className="glass-card">
                        <Statistic title={`${t('approved', lang)} / ${t('active_jobs', lang)}`} value={stats.approved} valueStyle={{ color: '#1890ff' }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" className="glass-card">
                        <Statistic title={t('work_in_progress', lang)} value={stats.inProgress} valueStyle={{ color: '#fa8c16' }} />
                    </Card>
                </Col>
                <Col xs={12} md={6}>
                    <Card size="small" className="glass-card">
                        <Statistic title={t('completed', lang)} value={stats.completed} valueStyle={{ color: '#52c41a' }} />
                    </Card>
                </Col>
            </Row>

            <Card className="glass-card" style={{ marginBottom: 16 }}>
                <Space wrap>
                    <Input
                        placeholder={t('search_placeholder_wo', lang)}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        style={{ width: 320 }}
                        allowClear
                    />
                    <Select value={statusFilter} onChange={setStatusFilter} style={{ width: 160 }}>
                        <Option value="all">{t('all_statuses', lang)}</Option>
                        <Option value="approved">{t('approved', lang)}</Option>
                        <Option value="in_progress">{t('work_in_progress', lang)}</Option>
                        <Option value="completed">{t('completed', lang)}</Option>
                        <Option value="cancelled">{t('cancelled', lang)}</Option>
                    </Select>
                </Space>
            </Card>

            <Card className="glass-card">
                <Table
                    dataSource={workOrders}
                    columns={columns}
                    rowKey="id"
                    pagination={{ pageSize: 10, showSizeChanger: false }}
                    locale={{
                        emptyText: (
                            <div style={{ padding: 32, textAlign: 'center' }}>
                                <div><Text type="secondary">{lang === 'bn' ? 'কোনো ওয়ার্ক অর্ডার নেই' : 'No work orders yet.'}</Text></div>
                                <div><Text type="secondary" style={{ fontSize: 12 }}>{lang === 'bn' ? 'ওয়ার্ক অর্ডার স্বয়ংক্রিয়ভাবে তৈরি করতে একটি কোটেশন পাস করুন' : 'Pass a Quotation to automatically create a Work Order here.'}</Text></div>
                            </div>
                        )
                    }}
                    rowClassName={(record) =>
                        String(record.quotationId) === String(highlightedQuotationId) ? 'highlighted-row' : ''
                    }
                />
            </Card>

            <Modal
                title={
                    <span>
                        {t('work_order', lang)} – #{viewRecord?.id}
                        {viewRecord?.quotationId && (
                            <Tag color="blue" style={{ marginLeft: 8 }}>{t('quotation', lang)} #{viewRecord.quotationId}</Tag>
                        )}
                    </span>
                }
                open={!!viewRecord}
                onCancel={closeWorkOrderModal}
                footer={[
                    <Button key="close" onClick={closeWorkOrderModal}>{t('cancel', lang)}</Button>,
                    viewRecord && viewRecord.status !== 'completed' && viewRecord.status !== 'cancelled' && (
                        <Button
                            key="bill"
                            type="primary"
                            loading={generatingId === viewRecord?.id}
                            onClick={() => { handleGenerateBill(viewRecord); closeWorkOrderModal(); }}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}
                        >
                            {t('generate_final_bill', lang)}
                        </Button>
                    )
                ].filter(Boolean)}
                width={720}
            >
                {viewRecord && (
                    <>
                        <Form form={workOrderForm} layout="vertical" onFinish={handleAssignMechanic} style={{ marginBottom: 16 }}>
                            <Form.Item name="assigned_staff_id" label={t('assign_mechanic', lang)}>
                                <Select placeholder={lang === 'bn' ? 'মেকানিক নির্বাচন করুন' : 'Select mechanic'} allowClear>
                                    {availableMechanics.map((staff) => (
                                        <Option key={staff.id} value={staff.id}>
                                            {staff.name}{staff.department ? ` — ${staff.department}` : ''}
                                        </Option>
                                    ))}
                                </Select>
                            </Form.Item>
                            <Button type="primary" htmlType="submit" loading={assigningMechanic}>
                                {t('save_notes', lang)}
                            </Button>
                        </Form>
                        <Descriptions bordered size="small" column={2} style={{ marginBottom: 16 }}>
                            <Descriptions.Item label={t('wo_id', lang)}><Text strong>#{viewRecord.id}</Text></Descriptions.Item>
                            <Descriptions.Item label={t('status', lang)}>
                                <Tag color={STATUS_COLOR[viewRecord.status] || 'blue'} style={{ fontWeight: 600 }}>{t(viewRecord.status || 'approved', lang)}</Tag>
                            </Descriptions.Item>
                            <Descriptions.Item label={t('quotation', lang) + ' ID'}>{viewRecord.quotationId || '—'}</Descriptions.Item>
                            <Descriptions.Item label={t('job_cards', lang) + ' ID'}>{viewRecord.jobCardId || 'Direct'}</Descriptions.Item>
                            <Descriptions.Item label={t('customer', lang)}>{viewRecord.clientName || '—'}</Descriptions.Item>
                            <Descriptions.Item label={t('phone_number', lang)}>{viewRecord.clientPhone || '—'}</Descriptions.Item>
                            <Descriptions.Item label={t('vehicle', lang)}>{viewRecord.vehicleNo || '—'}</Descriptions.Item>
                            <Descriptions.Item label={t('entity', lang)}>{viewRecord.billingEntity || '—'}</Descriptions.Item>
                            <Descriptions.Item label={t('mechanic', lang)}>{viewRecord.assigned_staff_name || (lang === 'bn' ? 'নিযুক্ত করা হয়নি' : 'Unassigned')}</Descriptions.Item>
                            <Descriptions.Item label={t('total_amount', lang)} span={2}>
                                <Text strong style={{ fontSize: 16, color: '#1890ff' }}>৳ {Number(viewRecord.totalAmount || 0).toLocaleString()}</Text>
                            </Descriptions.Item>
                            {viewRecord.notes && (
                                <Descriptions.Item label={t('inspection_notes', lang)} span={2}>{viewRecord.notes}</Descriptions.Item>
                            )}
                        </Descriptions>
                        {viewRecord.items && viewRecord.items.length > 0 && (
                            <>
                                <Title level={5}>{t('structured_requirements', lang)} ({viewRecord.items.length})</Title>
                                <Table
                                    size="small"
                                    dataSource={viewRecord.items}
                                    rowKey={(r, idx) => idx}
                                    pagination={false}
                                    columns={[
                                        { title: t('item_name', lang), dataIndex: 'name', key: 'name', render: v => <Text strong>{v}</Text> },
                                        { title: t('status', lang), dataIndex: 'type', key: 'type', render: s => <Tag>{t(s === 'Part' ? 'part' : 'service', lang)}</Tag> },
                                        { title: t('qty', lang), dataIndex: 'quantity', key: 'quantity' },
                                        { title: t('unit_price', lang), dataIndex: 'price', key: 'price', render: v => `৳ ${Number(v || 0).toLocaleString()}` },
                                        {
                                            title: t('total', lang),
                                            render: (_, r) => <Text strong>৳ {((r.quantity || 1) * (r.price || 0)).toLocaleString()}</Text>
                                        }
                                    ]}
                                    summary={() => (
                                        <Table.Summary>
                                            <Table.Summary.Row>
                                                <Table.Summary.Cell index={0} colSpan={4}>
                                                    <Text strong>{t('grand_total', lang)}</Text>
                                                </Table.Summary.Cell>
                                                <Table.Summary.Cell index={1}>
                                                    <Text strong style={{ color: '#1890ff' }}>৳ {Number(viewRecord.totalAmount || 0).toLocaleString()}</Text>
                                                </Table.Summary.Cell>
                                            </Table.Summary.Row>
                                        </Table.Summary>
                                    )}
                                />
                            </>
                        )}
                    </>
                )}
            </Modal>
            <style>{`.highlighted-row td { background: #e6f4ff !important; }`}</style>
        </div>
    );
};

export default WorkOrderPage;




