import React from 'react';
import { createPortal } from 'react-dom';
import {
    Alert,
    Button,
    Card,
    Col,
    Empty,
    List,
    Modal,
    Progress,
    Row,
    Segmented,
    Space,
    Statistic,
    Table,
    Tag,
    Timeline,
    Typography
} from 'antd';
import { FileTextOutlined, PrinterOutlined, QrcodeOutlined, WalletOutlined } from '@ant-design/icons';
import { CarFront, Clock3, ShieldCheck, Sparkles } from 'lucide-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

import { useAuth } from './contexts/AuthContext';
import { useGlobalState } from './contexts/GlobalStateContext';
import { bufferedPrint } from './utils/printAssistant';
import databaseBridge from './services/databaseBridge';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';

const { Title, Text, Paragraph } = Typography;

const Speedometer = ({ percent, label, color }) => {
    const radius = 50;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percent / 100) * circumference;

    return (
        <div className="speedometer-container">
            <svg className="speedometer-svg" width="120" height="120" viewBox="0 0 120 120">
                <circle className="speedometer-track" cx="60" cy="60" r={radius} />
                <circle 
                    className="speedometer-progress" 
                    cx="60" cy="60" r={radius} 
                    style={{ strokeDasharray: circumference, strokeDashoffset: offset }}
                />
            </svg>
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', textAlign: 'center' }}>
                <div className="font-montserrat" style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{percent}%</div>
                <div style={{ fontSize: 10, textTransform: 'uppercase', color: color, fontWeight: 700, letterSpacing: 1 }}>{label}</div>
            </div>
        </div>
    );
};

const LuxuryTimeline = ({ items }) => (
    <div className="luxury-timeline">
        {items.map((item, idx) => (
            <div key={idx} className="luxury-timeline-item">
                <div className="luxury-timeline-dot">
                    <Sparkles size={10} color="#3B82F6" />
                </div>
                <div className="luxury-timeline-content glass-panel">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <Text strong className="font-montserrat" style={{ color: '#fff', fontSize: 15 }}>{item.title}</Text>
                        <Tag color={item.color} style={{ borderRadius: 6, fontSize: 10 }}>{item.status}</Tag>
                    </div>
                    <Text type="secondary" style={{ fontSize: 12 }}>{item.date}</Text>
                    {item.details && <Paragraph style={{ color: 'rgba(255,255,255,0.6)', marginTop: 8, fontSize: 13, marginBottom: 0 }}>{item.details}</Paragraph>}
                </div>
            </div>
        ))}
    </div>
);

dayjs.extend(relativeTime);

const getPublicVehicleNo = () => {
    if (typeof window === 'undefined') return '';
    const hash = window.location.hash || '';
    const query = hash.includes('?') ? hash.split('?')[1] : '';
    const params = new URLSearchParams(query);
    return decodeURIComponent(params.get('v') || '').trim();
};

const resolveProgressMeta = (job) => {
    // If it's an Intake without a status, default to pending
    const rawStatus = job?.status || (job?.source === 'Intake' ? 'Pending' : '');
    const status = String(rawStatus).toLowerCase().trim();
    const stage = String(job?.workflowStage || '').toLowerCase().trim();
    
    // HISTORY STATUSES
    if (status === 'completed' || status === 'delivered' || status === 'closed' || stage === 'ready_to_deliver' || stage === 'gate_pass') {
        return { label: 'Completed', percent: 100, color: '#16a34a', isHistory: true };
    }
    
    // CURRENT / ACTIVE STATUSES
    if (status === 'active' || status === 'inspecting' || status === 'in progress' || stage === 'work_in_progress' || stage === 'quality_check') {
        return { label: 'In Progress', percent: 65, color: '#2563eb', isHistory: false };
    }
    
    // PENDING STATUSES
    if (status === 'pending' || status === 'queued' || status === 'ready' || status === '') {
        return { label: status === 'ready' ? 'Ready for Delivery' : 'Queued', percent: 30, color: '#f59e0b', isHistory: false };
    }

    return { label: 'Processing', percent: 15, color: '#94a3b8', isHistory: false };
};

const CustomerPortalPage = ({ mode = 'private', initialTab = 'overview' }) => {
    const { user } = useAuth();
    const { savedBills: globalBills } = useGlobalState(); // Keep only if needed for something else, but portalData is preferred
    const [printBill, setPrintBill] = React.useState(null);
    const [publicVehicle, setPublicVehicle] = React.useState(() => getPublicVehicleNo());
    const [activeTab, setActiveTab] = React.useState(initialTab);
    const [loading, setLoading] = React.useState(true);
    const [portalData, setPortalData] = React.useState({
        customer: null,
        jobCards: [],
        jobIntakes: [],
        savedBills: [],
        payments: [],
        quotations: []
    });
    
    React.useEffect(() => {
        setActiveTab(initialTab);
    }, [initialTab]);

    const getIdentifier = () => {
        if (mode === 'public') return publicVehicle;
        const baseIden = user?.phone || user?.id || user?.vehicleNo;
        if (!baseIden && user?.role?.toLowerCase() === 'admin') return 'ADMIN_GLOBAL';
        return baseIden || '';
    };

    const loadPortalData = async () => {
        const iden = getIdentifier();
        if (!iden) return;
        
        setLoading(true);
        try {
            const result = await databaseBridge.fetchCustomerPortalData(iden);
            if (result) {
                setPortalData(result);
            }
        } catch (err) {
            console.error('[Portal] Data load failed:', err);
        } finally {
            setLoading(false);
        }
    };

    React.useEffect(() => {
        loadPortalData();
    }, [publicVehicle, user?.id]);

    const handleApproveQuotation = async (quote) => {
        try {
            await databaseBridge.updateQuotation(quote.id, { status: 'Passed' });
            loadPortalData(); // Refresh
            Modal.success({
                title: 'Quotation Approved',
                content: 'Our team has been notified and a Work Order has been created to start the job.',
                className: 'luxury-modal'
            });
        } catch (err) {
            console.error('Approval failed:', err);
        }
    };

    const handleRejectQuotation = async (quote) => {
        try {
            await databaseBridge.updateQuotation(quote.id, { status: 'Rejected' });
            loadPortalData();
        } catch (err) {
            console.error('Rejection failed:', err);
        }
    };

    const customerPhone = mode === 'public' ? '' : (user?.phone || '');
    const customerName = mode === 'public' ? '' : String(user?.name || '').toLowerCase();



    const vehicleNo = mode === 'public' ? publicVehicle : (portalData.customer?.vehicleNo || user?.vehicleNo || '');

    const vehicleJobs = React.useMemo(() => {
        const myJobCards = (portalData.jobCards || []).map(j => ({ ...j, source: 'JobCard' }));
        const myIntakes = (portalData.jobIntakes || []).map(i => ({ ...i, source: 'Intake', date: i.createdAt || i.date }));

        return [...myJobCards, ...myIntakes]
            .sort((a, b) => new Date(b.date || b.createdAt || 0) - new Date(a.date || a.createdAt || 0));
    }, [portalData.jobCards, portalData.jobIntakes]);

    const currentServices = React.useMemo(() => {
        return vehicleJobs.filter(job => !resolveProgressMeta(job).isHistory);
    }, [vehicleJobs]);

    const serviceHistory = React.useMemo(() => {
        return vehicleJobs.filter(job => resolveProgressMeta(job).isHistory);
    }, [vehicleJobs]);

    const vehicleBills = React.useMemo(() => (portalData.savedBills || [])
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [portalData.savedBills]);

    const myPayments = React.useMemo(() => (portalData.payments || [])
        .sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0)), [portalData.payments]);

    const myQuotations = React.useMemo(() => (portalData.quotations || [])
        .filter(q => q.status !== 'Draft')
        .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)), [portalData.quotations]);


    const latestJob = currentServices[0] || serviceHistory[0];
    const progressMeta = resolveProgressMeta(latestJob);
    const nextServiceDate = portalData.customer?.nextServiceDate ? dayjs(portalData.customer.nextServiceDate) : null;
    const totalBilled = vehicleBills.reduce((sum, bill) => sum + Number(bill.netPayable || bill.amount || 0), 0);
    const totalDue = vehicleBills.reduce((sum, bill) => sum + Number(bill.due || 0), 0);

    const historyColumns = [
        { title: 'Date', dataIndex: 'date', render: (value) => dayjs(value).format('DD MMM YYYY') },
        { title: 'Job', dataIndex: 'description', render: (value) => value || 'General service' },
        { title: 'Status', render: (_, row) => <Tag color={resolveProgressMeta(row).color}>{resolveProgressMeta(row).label}</Tag> }
    ];

    if (mode === 'public' && !publicVehicle) {
        return (
            <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg, #082f49, #f8fafc)', padding: 20 }}>
                <Card style={{ maxWidth: 560, margin: '80px auto', borderRadius: 24 }}>
                    <Empty description="No vehicle linked in QR URL." />
                </Card>
            </div>
        );
    }

    if (!loading && !portalData.customer && vehicleJobs.length === 0 && vehicleBills.length === 0) {
        return (
            <div style={{ minHeight: '100vh', background: 'radial-gradient(circle at center, #1E293B 0%, #0F172A 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
                <Card 
                    className="glass-panel" 
                    style={{ 
                        maxWidth: 500, 
                        borderRadius: 32, 
                        textAlign: 'center', 
                        border: '1px solid rgba(59, 130, 246, 0.2)', 
                        background: 'rgba(30, 41, 59, 0.7)', 
                        backdropFilter: 'blur(20px)',
                        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                    }}
                >
                    <Empty 
                        image={<CarFront size={64} color="#3B82F6" strokeWidth={1} style={{ opacity: 0.5, marginBottom: 20 }} />}
                        description={
                            <Space direction="vertical" size={12}>
                                <Text className="font-montserrat" style={{ color: '#fff', fontSize: 22, fontWeight: 900, letterSpacing: -0.5 }}>Vehicle record not found</Text>
                                <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 15, lineHeight: 1.6 }}>Please contact Mamun Automobiles support for assistance or ensure your profile is linked.</Text>
                            </Space>
                        } 
                    />
                </Card>
            </div>
        );
    }

    return (
        <div style={{ minHeight: '100vh', background: '#0B0F19', padding: '24px 16px 60px', color: '#fff' }}>
            {/* --- Modals & Overlays --- */}
            <Modal 
                open={!!printBill} 
                footer={null} 
                onCancel={() => setPrintBill(null)} 
                width={900}
                styles={{ content: { background: 'rgba(15, 23, 42, 0.9)', backdropFilter: 'blur(20px)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: 24 } }}
            >
                {printBill && (
                    <div className="font-montserrat">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24, alignItems: 'center' }}>
                            <Title level={3} style={{ color: '#fff', margin: 0 }}>Invoice #{printBill.id}</Title>
                            <Button 
                                icon={<PrinterOutlined />} 
                                onClick={() => bufferedPrint()}
                                className="premium-blue-btn"
                                style={{ borderRadius: 12, height: 40, padding: '0 24px', background: '#3B82F6', border: 'none', color: '#FFF' }}
                            >
                                Print Document
                            </Button>
                        </div>
                        <Table
                            dataSource={printBill.items || []}
                            pagination={false}
                            rowKey="id"
                            className="luxury-table"
                            columns={[
                                { title: 'Service / Part', dataIndex: 'description', render: (t) => <Text style={{ color: '#fff' }}>{t}</Text> },
                                { title: 'Qty', dataIndex: 'quantity', render: (t) => <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{t}</Text> },
                                { title: 'Amount', render: (_, row) => <Text strong style={{ color: '#3B82F6' }}>Tk {Number((row.quantity || 0) * (row.unitPrice || 0)).toLocaleString()}</Text> }
                            ]}
                            summary={(data) => (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={2}><Text style={{ color: '#fff' }}>Total Amount</Text></Table.Summary.Cell>
                                    <Table.Summary.Cell index={1}><Text strong style={{ color: '#3B82F6', fontSize: 18 }}>Tk {(printBill.amount || 0).toLocaleString()}</Text></Table.Summary.Cell>
                                </Table.Summary.Row>
                            )}
                        />
                    </div>
                )}
            </Modal>

            {/* --- PRINT ENGINE (v3.4) --- */}
            {printBill && createPortal(
                <div className="alive-print-area">
                    <BrandedDocumentHeader 
                        title="OFFICIAL INVOICE" 
                        subtitle="Mamun Automobiles"
                        meta={[
                            { label: 'Invoice #', value: printBill.id },
                            { label: 'Date', value: dayjs(printBill.date).format('DD MMM YYYY') }
                        ]}
                    />
                    
                    <div style={{ marginTop: 25, flexGrow: 1 }}>
                        <table className="premium-print-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>Description</th>
                                    <th style={{ textAlign: 'center', width: '80px' }}>Qty</th>
                                    <th style={{ textAlign: 'right', width: '120px' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(printBill.items || []).map((item, idx) => (
                                    <tr key={idx}>
                                        <td>{item.description}</td>
                                        <td style={{ textAlign: 'center' }}>{item.quantity}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 800 }}>Tk {Number((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="alive-footer-lock">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 30 }}>
                            <div style={{ width: 250, borderTop: '2px solid #000', paddingTop: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 900 }}>
                                    <span>TOTAL:</span>
                                    <span>Tk {(printBill.amount || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #eee', paddingTop: 10 }}>
                            MAMUN AUTOMOBILES // LUXURY CARE PORTAL // V4.0
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div style={{ maxWidth: 1200, margin: '0 auto' }}>
                {/* Welcome / Header Section */}
                <div className="glass-panel" style={{ borderRadius: 32, padding: '48px 32px', marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', top: -100, right: -100, width: 400, height: 400, background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)', zIndex: 0 }}></div>
                    
                    <Row gutter={[32, 32]} align="middle" style={{ position: 'relative', zIndex: 1 }}>
                        <Col xs={24} lg={16}>
                            <Space direction="vertical" size={20}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ padding: '8px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid #3B82F6', borderRadius: 99, color: '#3B82F6', fontSize: 11, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' }}>
                                        Mamun Automobiles Luxury Experience
                                    </div>
                                </div>
                                
                                <Title level={1} className="font-montserrat" style={{ color: '#fff', margin: 0, fontSize: 'clamp(28px, 5vw, 48px)', fontWeight: 900, lineHeight: 1.1 }}>
                                    {mode === 'public' ? 'Live Service Status' : `Welcome back, \n${portalData.customer?.name || user?.name || 'Customer'}`}
                                </Title>
                                
                                <Paragraph style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16, maxWidth: 550, lineHeight: 1.6 }}>
                                    Monitor your {vehicleNo}'s precision servicing in real-time. Our commitment to excellence, visible to you.
                                </Paragraph>
                                
                                <Space wrap size={16}>
                                    <div className="glass-panel" style={{ padding: '8px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,0.1)' }}>
                                        <CarFront size={18} style={{ color: '#3B82F6' }} />
                                        <Text strong style={{ color: '#fff', fontSize: 16 }}>{vehicleNo || 'N/A'}</Text>
                                    </div>
                                    {nextServiceDate && (
                                        <div className="glass-panel" style={{ padding: '8px 20px', borderRadius: 16, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                                            <Clock3 size={18} style={{ color: '#A855F7' }} />
                                            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Next Service: {nextServiceDate.format('DD MMM')}</Text>
                                        </div>
                                    )}
                                </Space>
                            </Space>
                        </Col>
                        
                        <Col xs={24} lg={8}>
                            <div className="glass-panel" style={{ padding: 32, borderRadius: 28, border: '1px solid rgba(59, 130, 246, 0.2)', textAlign: 'center' }}>
                                <Speedometer percent={progressMeta.percent} label={progressMeta.label} color={progressMeta.color} />
                                <div style={{ marginTop: 16 }}>
                                    <Text style={{ color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', fontSize: 10, letterSpacing: 1 }}>Current Phase</Text>
                                    <div className="text-blue font-montserrat" style={{ fontSize: 16, fontWeight: 700, color: '#3B82F6' }}>{progressMeta.label}</div>
                                </div>
                            </div>
                        </Col>
                    </Row>
                </div>

                {/* Stats Grid */}
                <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
                    {[
                        { title: 'Active Projects', value: currentServices.length, icon: <Clock3 size={20} />, color: '#3B82F6' },
                        { title: 'Service History', value: serviceHistory.length, icon: <ShieldCheck size={20} />, color: '#16a34a' },
                        { title: 'Outstanding Balance', value: `Tk ${totalDue.toLocaleString()}`, icon: <WalletOutlined />, color: totalDue > 0 ? '#ff4d4f' : '#3B82F6' }
                    ].map((stat, i) => (
                        <Col xs={24} md={8} key={i}>
                            <Card className="glass-panel luxury-card-hover" bordered={false} style={{ borderRadius: 24, padding: '8px 0' }}>
                                <Statistic 
                                    title={<span className="font-montserrat" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700 }}>{stat.title}</span>} 
                                    value={stat.value} 
                                    prefix={<span style={{ color: stat.color, marginRight: 12 }}>{stat.icon}</span>}
                                    valueStyle={{ color: '#fff', fontWeight: 900, fontFamily: 'Montserrat', fontSize: 28 }} 
                                />
                            </Card>
                        </Col>
                    ))}
                </Row>

                {/* Navigation */}
                <div style={{ marginBottom: 32, display: 'flex', justifyContent: 'center' }}>
                    <Segmented
                        value={activeTab}
                        onChange={setActiveTab}
                        options={[
                            { label: 'Overview', value: 'overview', icon: <Sparkles size={14} /> },
                            { label: 'Timeline', value: 'history', icon: <Clock3 size={14} /> },
                            { label: 'Financials', value: 'billing', icon: <FileTextOutlined /> },
                            { label: 'Quotations', value: 'quotes', icon: <WalletOutlined /> }
                        ]}
                        className="glass-panel"
                        style={{ padding: 6, borderRadius: 20, background: 'rgba(255,255,255,0.03)' }}
                    />
                </div>

                {/* Tab Content */}
                {activeTab === 'overview' && (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={16}>
                            <div className="glass-panel" style={{ borderRadius: 32, padding: 32 }}>
                                <Title level={4} className="font-montserrat" style={{ color: '#fff', marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <Clock3 size={20} style={{ color: '#3B82F6' }} /> Live Progress Timeline
                                </Title>
                                {currentServices.length === 0 ? (
                                    <Empty description={<Text style={{ color: 'rgba(255,255,255,0.4)' }}>No active service sessions at this moment.</Text>} />
                                ) : (
                                    <LuxuryTimeline 
                                        items={currentServices.map(job => ({
                                            title: job.description || job.complaints || 'Workshop Service',
                                            status: resolveProgressMeta(job).label,
                                            color: resolveProgressMeta(job).color,
                                            date: dayjs(job.date).format('DD MMM YYYY, hh:mm A'),
                                            details: job.source === 'Intake' ? 'Vehicle successfully checked in and awaiting technician assignment.' : 'Service execution in progress by our expert team.'
                                        }))} 
                                    />
                                )}
                            </div>
                        </Col>
                        <Col xs={24} lg={8}>
                            <div className="glass-panel" style={{ borderRadius: 32, padding: 24, marginBottom: 24 }}>
                                <Title level={5} className="font-montserrat" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>Recommendation</Title>
                                {nextServiceDate ? (
                                    <div>
                                        <Title level={2} className="text-blue font-montserrat" style={{ margin: 0, color: '#3B82F6' }}>{nextServiceDate.format('DD MMM')}</Title>
                                        <Text style={{ color: '#fff', fontSize: 16 }}>{nextServiceDate.format('YYYY')}</Text>
                                        <div style={{ marginTop: 12 }}>
                                            <Tag color="blue" style={{ borderRadius: 6 }}>{nextServiceDate.fromNow()}</Tag>
                                        </div>
                                    </div>
                                ) : (
                                    <Text style={{ color: 'rgba(255,255,255,0.4)' }}>Maintain schedule will be updated shortly.</Text>
                                )}
                            </div>
                            
                            <div className="glass-panel" style={{ borderRadius: 32, padding: 24 }}>
                                <Title level={5} className="font-montserrat" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 20 }}>Primary Service</Title>
                                {latestJob ? (
                                    <Space direction="vertical" size={16} style={{ width: '100%' }}>
                                        <div>
                                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Service Type</Text>
                                            <div style={{ color: '#fff', fontWeight: 600 }}>{latestJob.description || 'General Maintenance'}</div>
                                        </div>
                                        <div>
                                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Lead Specialist</Text>
                                            <div style={{ color: '#fff', fontWeight: 600 }}>{latestJob.assigned_staff_name || 'Senior Technician'}</div>
                                        </div>
                                        <div>
                                            <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 11 }}>Current Status</Text>
                                            <div style={{ marginTop: 4 }}><Tag color={progressMeta.color}>{progressMeta.label}</Tag></div>
                                        </div>
                                    </Space>
                                ) : (
                                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No active jobs." />
                                )}
                            </div>
                        </Col>
                    </Row>
                )}

                {activeTab === 'history' && (
                    <div className="glass-panel" style={{ borderRadius: 32, padding: 32 }}>
                        <Title level={4} className="font-montserrat" style={{ color: '#fff', marginBottom: 24 }}>Service Archive</Title>
                        <Table 
                            dataSource={serviceHistory} 
                            rowKey="id"
                            className="luxury-table"
                            pagination={{ pageSize: 10, className: 'luxury-pagination' }}
                            columns={[
                                { title: 'Date', dataIndex: 'date', render: (v) => <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{dayjs(v).format('DD MMM YYYY')}</Text> },
                                { title: 'Vehicle', dataIndex: 'vehicleNo', render: (v) => <Tag color="blue" style={{ fontWeight: 800 }}>{String(v).toUpperCase()}</Tag> },
                                { title: 'Details', render: (_, row) => <Text strong style={{ color: '#fff' }}>{row.description || row.complaints || 'Maintenance'}</Text> },
                                { title: 'Outcome', render: () => <Tag color="#16a34a" style={{ borderRadius: 6 }}>EXCELLENT</Tag> },
                                { title: 'Report', render: () => <Button type="link" style={{ color: '#3B82F6', padding: 0 }}>View Details</Button> }
                            ]}
                        />
                    </div>
                )}

                {activeTab === 'billing' && (
                    <Row gutter={[24, 24]}>
                        <Col xs={24} lg={16}>
                            <div className="glass-panel" style={{ borderRadius: 32, padding: 32 }}>
                                <Title level={4} className="font-montserrat" style={{ color: '#fff', marginBottom: 24 }}>Invoices & Statements</Title>
                                <Table
                                    dataSource={vehicleBills}
                                    rowKey="id"
                                    className="luxury-table"
                                    columns={[
                                        { title: 'ID', dataIndex: 'id', render: (v) => <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{v}</Text> },
                                        { title: 'Vehicle', dataIndex: 'vehicleNo', render: (v) => <Text style={{ color: '#3B82F6', fontWeight: 700 }}>{String(v || 'N/A').toUpperCase()}</Text> },
                                        { title: 'Date', dataIndex: 'date', render: (v) => <Text style={{ color: 'rgba(255,255,255,0.7)' }}>{dayjs(v).format('DD MMM YYYY')}</Text> },
                                        { title: 'Amount', render: (_, row) => <Text strong style={{ color: '#fff' }}>Tk {Number(row.netPayable || row.amount || 0).toLocaleString()}</Text> },
                                        { title: 'Status', render: (_, row) => <Tag color={Number(row.due || 0) > 0 ? 'red' : 'blue'}>{Number(row.due || 0) > 0 ? 'DUE' : 'PAID'}</Tag> },
                                        { title: 'Action', render: (_, row) => <Button icon={<FileTextOutlined />} onClick={() => setPrintBill(row)} ghost style={{ borderColor: '#3B82F6', color: '#3B82F6', borderRadius: 10 }}>View</Button> }
                                    ]}
                                />
                            </div>
                        </Col>
                        <Col xs={24} lg={8}>
                            <div className="glass-panel" style={{ borderRadius: 32, padding: 32 }}>
                                <Title level={4} className="font-montserrat" style={{ color: '#fff', marginBottom: 24 }}>Recent Payments</Title>
                                {myPayments.length === 0 ? (
                                    <Empty description="No transactions found." />
                                ) : (
                                    <List
                                        dataSource={myPayments.slice(0, 5)}
                                        renderItem={(item) => (
                                            <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '16px 0' }}>
                                                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div style={{ color: '#fff', fontWeight: 600 }}>{item.invoiceId || 'Deposit'}</div>
                                                        <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>{dayjs(item.date).format('DD MMM YYYY')}</Text>
                                                    </div>
                                                    <Text strong style={{ color: '#16a34a', fontSize: 16 }}>+ Tk {Number(item.amount || 0).toLocaleString()}</Text>
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </div>
                        </Col>
                    </Row>
                )}

                {activeTab === 'quotes' && (
                    <div className="glass-panel" style={{ borderRadius: 32, padding: 32 }}>
                        <Title level={4} className="font-montserrat" style={{ color: '#fff', marginBottom: 24 }}>Pending Estimates</Title>
                        {myQuotations.length === 0 ? (
                            <Empty description="No quotations awaiting approval." />
                        ) : (
                            <Row gutter={[24, 24]}>
                                {myQuotations.map(quote => (
                                    <Col xs={24} key={quote.id}>
                                        <Card className="glass-panel" style={{ borderRadius: 20, border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                                            <Row justify="space-between" align="middle">
                                                <Col>
                                                    <Title level={5} style={{ color: '#fff', margin: 0 }}>Quotation #{quote.id}</Title>
                                                    <Text style={{ color: 'rgba(255,255,255,0.5)' }}>{dayjs(quote.createdAt).format('DD MMM YYYY')}</Text>
                                                </Col>
                                                <Col>
                                                    <Title level={4} style={{ margin: 0, color: '#3B82F6' }}>Tk {Number(quote.totalAmount || 0).toLocaleString()}</Title>
                                                </Col>
                                                <Col>
                                                    <Space>
                                                        {quote.status === 'Passed' ? (
                                                            <Tag color="green" icon={<ShieldCheck size={12} />}>APPROVED</Tag>
                                                        ) : quote.status === 'Rejected' ? (
                                                            <Tag color="red">REJECTED</Tag>
                                                        ) : (
                                                            <>
                                                                <Button onClick={() => handleRejectQuotation(quote)} danger ghost style={{ borderRadius: 10 }}>Reject</Button>
                                                                <Button onClick={() => handleApproveQuotation(quote)} className="premium-blue-btn" style={{ borderRadius: 10, background: '#3B82F6', border: 'none', color: '#FFF' }}>Approve & Start Job</Button>
                                                            </>
                                                        )}
                                                    </Space>
                                                </Col>
                                            </Row>
                                            <div style={{ marginTop: 20, padding: 16, background: 'rgba(255,255,255,0.02)', borderRadius: 12 }}>
                                                <List
                                                    size="small"
                                                    dataSource={quote.items || []}
                                                    renderItem={item => (
                                                        <List.Item style={{ border: 'none', padding: '4px 0' }}>
                                                            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>• {item.name} x {item.quantity}</Text>
                                                            <Text style={{ color: 'rgba(255,255,255,0.8)' }}>Tk {Number(item.price * item.quantity).toLocaleString()}</Text>
                                                        </List.Item>
                                                    )}
                                                />
                                            </div>
                                        </Card>
                                    </Col>
                                ))}
                            </Row>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default CustomerPortalPage;






