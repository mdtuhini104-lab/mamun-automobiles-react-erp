import React from 'react';
import {
    Card, Button, Typography, Row, Col,
    Space, Tag, message, theme, Badge, Empty,
    Input, Modal, Form, Select, Timeline, Tabs, Tooltip, Statistic, Divider
} from 'antd';
import {
    Wrench, Car, Clock, CheckCircle2, Send,
    AlertTriangle, Eye, User, Play, Timer,
    ClipboardCheck, RefreshCw
} from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import { useGlobalState } from './contexts/GlobalStateContext';
import { t } from './utils/translations';
import SmartVoiceInput from './components/SmartVoiceInput';
import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const { Option } = Select;

/* ──────────────────────────────────────────────────────────
   Status Config
   ────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
    Pending:          { color: 'default',    key: 'pending',           icon: <Clock size={14} /> },
    Inspecting:       { color: 'processing', key: 'inspecting',        icon: <Eye size={14} /> },
    'Req Sent':       { color: 'warning',    key: 'req_sent',          icon: <Send size={14} /> },
    'In Progress':    { color: 'processing', key: 'in_progress',       icon: <Wrench size={14} /> },
    Ready:            { color: 'cyan',       key: 'ready_to_deliver',  icon: <ClipboardCheck size={14} /> },
    Finished:         { color: 'success',    key: 'finished',          icon: <CheckCircle2 size={14} /> },
};

const getStatusTag = (status, lang) => {
    const cfg = STATUS_CONFIG[status] || { color: 'default', key: status, icon: null };
    return <Tag icon={cfg.icon} color={cfg.color} style={{ fontSize: 13, padding: '4px 12px', fontWeight: 600, borderRadius: 8, letterSpacing: '0.3px' }}>{t(cfg.key, lang)}</Tag>;
};

/* ──────────────────────────────────────────────────────────
   Vehicle Job Card (Mechanic View)
   ────────────────────────────────────────────────────────── */
const VehicleCard = ({ intake, onAction, onInspect, onReassign, token, lang }) => {
    const elapsed = dayjs(intake.createdAt).fromNow();

    return (
        <div className="job-card-modern">
            <div>
                {/* Top Section: Large prominent Vehicle No on Left, Status Badge on Right */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                    <div className="veh-number-box">
                        <Car size={22} style={{ color: '#00e5ff', flexShrink: 0 }} />
                        <span className="veh-number-text">{intake.vehicleNo}</span>
                    </div>
                    <div>
                        {getStatusTag(intake.status, lang)}
                    </div>
                </div>

                {/* Middle Section: Customer Name & Customer Complaint enclosed in a unified highlighted container */}
                <div className="middle-section-unified">
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <User size={15} style={{ color: '#00e5ff', flexShrink: 0 }} />
                        <span style={{ wordBreak: 'break-word' }}>
                            {intake.customerName || 'Walk-in Customer'} {intake.phone ? `• ${intake.phone}` : ''}
                        </span>
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <Timer size={12} style={{ color: '#38bdf8' }} /> 
                        <span>{lang === 'bn' ? 'দেখা হয়েছে' : 'Checked in'} {elapsed}</span>
                    </div>

                    {/* Highlighted box specifically for Customer Complaints */}
                    {intake.complaints ? (
                        <div className="complaint-box-premium">
                            <div className="complaint-label">
                                <AlertTriangle size={13} />
                                <span>{t('customer_complaint', lang)}</span>
                            </div>
                            <div className="complaint-text">
                                {intake.complaints}
                            </div>
                        </div>
                    ) : (
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', opacity: 0.6, paddingTop: 4 }}>
                            {lang === 'bn' ? 'কোনো পূর্ববর্তী অভিযোগ উল্লেখ নেই' : 'No preliminary complaint stated'}
                        </div>
                    )}
                </div>

                {/* Internal Mechanic Notes display */}
                {intake.mechanicNotes && (
                    <div style={{ marginBottom: 14, padding: '10px 14px', borderRadius: 12, background: 'rgba(59, 130, 246, 0.06)', borderLeft: '3px solid #3b82f6' }}>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#3b82f6', marginBottom: 2, letterSpacing: '0.3px' }}>
                            {t('my_notes', lang)}
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text-main)' }}>
                            {intake.mechanicNotes}
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Section: Action buttons neatly aligned on a single horizontal row */}
            <div className="bottom-actions-row">
                {intake.status === 'Pending' && (
                    <Button type="primary" className="btn-vibrant-cyan" size="small" icon={<Play size={13} />} onClick={() => onAction(intake.id, 'Inspecting')}>
                        {t('start_inspection', lang)}
                    </Button>
                )}
                {intake.status === 'Inspecting' && (
                    <>
                        <Button className="btn-vibrant-blue" size="small" icon={<ClipboardCheck size={13} />} onClick={() => onInspect(intake)}>
                            {t('add_notes', lang)}
                        </Button>
                        <Button type="primary" className="btn-vibrant-cyan" size="small" icon={<Send size={13} />} onClick={() => onAction(intake.id, 'Req Sent')}>
                            {t('send_requirements', lang)}
                        </Button>
                    </>
                )}
                {intake.status === 'Req Sent' && (
                    <Button type="primary" className="btn-vibrant-cyan" size="small" icon={<Wrench size={13} />} onClick={() => onAction(intake.id, 'In Progress')}>
                        {t('start_work', lang)}
                    </Button>
                )}
                {intake.status === 'In Progress' && (
                    <Button 
                        type="primary" 
                        size="small" 
                        style={{ 
                            background: 'linear-gradient(135deg, #10b981, #059669)', 
                            border: 'none', 
                            color: '#fff', 
                            fontWeight: 600, 
                            borderRadius: 10, 
                            boxShadow: '0 4px 15px rgba(16, 185, 129, 0.35)',
                            padding: '0 12px'
                        }} 
                        icon={<CheckCircle2 size={13} />} 
                        onClick={() => onAction(intake.id, 'Finished')}
                    >
                        {t('mark_finished', lang)}
                    </Button>
                )}
                {onReassign && (
                    <Button className="btn-luxury-outline" size="small" icon={<RefreshCw size={12} />} onClick={() => onReassign(intake)}>
                        {t('reassign', lang)}
                    </Button>
                )}
            </div>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   Admin Overview Row / Advanced Activity Progress Tracker
   ────────────────────────────────────────────────────────── */
const AdminOverviewCard = ({ mechanic, intakes, token, lang, index = 0 }) => {
    const myIntakes = intakes.filter(i => i.mechanicId === mechanic.id && i.status !== 'Finished');
    const finished = intakes.filter(i => i.mechanicId === mechanic.id && i.status === 'Finished');

    // Array of predefined beautiful color classes for distinct variety per specialist line
    const chipClasses = ['chip-cyan', 'chip-blue', 'chip-amber', 'chip-emerald', 'chip-purple', 'chip-rose'];
    const assignedChipClass = chipClasses[index % chipClasses.length];

    return (
        <div className="mechanic-tracker-card">
            <Row gutter={[16, 12]} align="middle">
                <Col xs={24} sm={8} md={6}>
                    <Space align="center" size={12}>
                        <div style={{ width: 44, height: 44, borderRadius: 14, background: index % 2 === 0 ? 'linear-gradient(135deg, #00e5ff, #0284c7)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 600, fontSize: 18, flexShrink: 0, boxShadow: '0 4px 12px rgba(0, 229, 255, 0.25)' }}>
                            {mechanic.name ? mechanic.name.charAt(0).toUpperCase() : 'M'}
                        </div>
                        <div style={{ minWidth: 0 }}>
                            <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-main)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {mechanic.name}
                            </div>
                            <div style={{ fontSize: 11, fontWeight: 600, color: '#00e5ff', letterSpacing: '0.5px', marginTop: 2 }}>
                                {mechanic.department || 'Specialist'}
                            </div>
                        </div>
                    </Space>
                </Col>
                <Col xs={24} sm={16} md={18}>
                    <div className="tracker-stream">
                        {myIntakes.length === 0 ? (
                            <span style={{ fontSize: 13, color: 'var(--text-muted)', fontStyle: 'italic', background: 'rgba(255, 255, 255, 0.02)', padding: '5px 14px', borderRadius: 20, border: '1px dashed rgba(255, 255, 255, 0.08)' }}>
                                ● {lang === 'bn' ? 'বর্তমানে ফ্রি আছেন / কোনো গাড়ি নেই' : 'Available / No Active Assignment'}
                            </span>
                        ) : (
                            myIntakes.map(i => (
                                <Tooltip key={i.id} title={`${i.customerName || 'Walk-in'} • Checked in ${dayjs(i.createdAt).fromNow()}`}>
                                    <div className={`mechanic-chip ${assignedChipClass}`}>
                                        <Car size={14} />
                                        <span>{i.vehicleNo}</span>
                                        <span style={{ opacity: 0.4 }}>|</span>
                                        <span style={{ fontSize: 11, fontWeight: 600 }}>{i.status}</span>
                                    </div>
                                </Tooltip>
                            ))
                        )}
                        {finished.length > 0 && (
                            <div className="mechanic-chip chip-emerald" style={{ marginLeft: 'auto' }}>
                                ✓ <span style={{ fontWeight: 600 }}>{finished.length} {lang === 'bn' ? 'টি শেষ হয়েছে' : 'Finished Today'}</span>
                            </div>
                        )}
                    </div>
                </Col>
            </Row>
        </div>
    );
};

/* ──────────────────────────────────────────────────────────
   Main Component
   ────────────────────────────────────────────────────────── */
const MechanicDashboardPage = () => {
    const { token } = theme.useToken();
    const { user: currentUser } = useAuth();
    const { navigateTo, jobIntakes: intakes, setJobIntakes: setIntakes, language: lang } = useGlobalState();

    const [mechanics, setMechanics] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [inspectModal, setInspectModal] = React.useState(null);
    const [reassignModal, setReassignModal] = React.useState(null);
    const [items, setItems] = React.useState([]);
    const [noteForm] = Form.useForm();
    const [reassignForm] = Form.useForm();

    const isAdmin = ['Admin', 'SuperAdmin', 'Manager'].includes(currentUser?.role);
    const myId = currentUser?.id;

    // ─── Load Mechanics Suite ───
    const loadMechanics = React.useCallback(async () => {
        setLoading(true);
        try {
            const allUsers = await databaseBridge.fetchUsers(currentUser);
            const staffMechanics = (allUsers || []).filter(u => {
                const role = (u.role || '').toLowerCase();
                const dept = (u.department || '').toLowerCase();
                return role === 'staff' || dept.includes('engine') || dept.includes('water')
                    || dept.includes('ac') || dept.includes('electric')
                    || dept.includes('paint') || dept.includes('dent')
                    || dept.includes('mechanic');
            });
            setMechanics(staffMechanics);
        } catch (err) {
            console.error('Failed to load mechanics:', err);
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    React.useEffect(() => { loadMechanics(); }, [loadMechanics]);

    // ─── Filter for Mechanic's assigned vehicles ───
    const myIntakes = React.useMemo(() => {
        if (isAdmin) return intakes;
        return intakes.filter(i => i.mechanicId === myId);
    }, [intakes, myId, isAdmin]);

    const activeJobs = myIntakes.filter(i => i.status !== 'Finished');
    const finishedJobs = myIntakes.filter(i => i.status === 'Finished');

    // ─── Real-time Status Update ───
    const handleStatusChange = async (intakeId, newStatus) => {
        try {
            const updated = intakes.map(i => i.id === intakeId ? { ...i, status: newStatus } : i);
            setIntakes(updated);
            
            // Persist securely to DB
            await databaseBridge.updateJobIntake(intakeId, { status: newStatus });
            
            message.success(lang === 'bn' ? `অবস্থা পরিবর্তন করা হয়েছে: "${t(STATUS_CONFIG[newStatus]?.key || newStatus, lang)}"` : `Status updated to "${t(STATUS_CONFIG[newStatus]?.key || newStatus, lang)}"`);
        } catch (err) {
            console.error('Failed to update status:', err);
            message.error('Failed to update status on server.');
        }
    };

    const handleAddItem = (type) => {
        setItems([...items, { id: Date.now(), type, name: '', quantity: 1, price: 0 }]);
    };

    const handleRemoveItem = (id) => {
        setItems(items.filter(i => i.id !== id));
    };

    const handleItemChange = (id, field, value) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    // ─── Mechanic Inspection Notes Handler ───
    const handleSaveNotes = async (values) => {
        if (!inspectModal) return;
        const updatedIntake = {
            ...inspectModal,
            mechanicNotes: values.mechanicNotes || '',
            observations: values.observations || inspectModal.observations,
            partsNeeded: values.partsNeeded || '',
            items: items.map(it => ({ name: it.name, type: it.type, quantity: it.quantity, price: it.price }))
        };

        try {
            // Update shared local state
            const updated = intakes.map(i => i.id === inspectModal.id ? updatedIntake : i);
            setIntakes(updated);

            // Sync to database system
            await databaseBridge.updateJobIntake(inspectModal.id, updatedIntake);

            setInspectModal(null);
            noteForm.resetFields();
            setItems([]);
            message.success('Inspection notes and parts list saved successfully!');
        } catch (err) {
            message.error('Failed to save inspection notes.');
        }
    };

    // ─── Specialist Re-assignment ───
    const handleReassign = (values) => {
        if (!reassignModal) return;
        const updated = intakes.map(i =>
            i.id === reassignModal.id ? { ...i, mechanicId: values.mechanicId } : i
        );
        setIntakes(updated);
        setReassignModal(null);
        message.success('Vehicle successfully re-assigned!');
    };

    // ─── Dynamic Top Card Stats ───
    const stats = React.useMemo(() => ({
        waiting: myIntakes.filter(i => i.status === 'Pending').length,
        inspecting: myIntakes.filter(i => i.status === 'Inspecting').length,
        inProgress: myIntakes.filter(i => ['In Progress', 'Req Sent'].includes(i.status)).length,
        finished: finishedJobs.length,
    }), [myIntakes, finishedJobs]);

    return (
        <div className="mechanic-dashboard-premium" style={{ maxWidth: 1300, margin: '0 auto', padding: '10px 12px' }}>
            {/* Header Layout */}
            <div style={{ marginBottom: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <Title level={2} style={{ margin: 0, fontWeight: 600, letterSpacing: '0.5px' }}>
                        <Space align="center" size={12}>
                            <Wrench size={30} style={{ color: '#06b6d4' }} />
                            <span>{isAdmin ? t('workshop_overview', lang) : t('my_dashboard', lang)}</span>
                        </Space>
                    </Title>
                    <Text type="secondary" style={{ fontSize: 14, fontWeight: 500, marginTop: 4, display: 'block' }}>
                        {isAdmin
                            ? t('monitor_msg', lang)
                            : t('welcome_msg', lang, { name: currentUser?.name || 'Specialist' })}
                    </Text>
                </div>
                {isAdmin && (
                    <Button 
                        type="primary" 
                        className="btn-vibrant-cyan" 
                        icon={<RefreshCw size={15} />} 
                        onClick={loadMechanics}
                        loading={loading}
                        style={{ height: 42, padding: '0 20px', borderRadius: 12, fontWeight: 600 }}
                    >
                        {t('refresh', lang)}
                    </Button>
                )}
            </div>

            {/* Premium Top Status Cards Grid */}
            <Row gutter={[20, 20]} style={{ marginBottom: 32 }}>
                <Col xs={24} sm={12} lg={6}>
                    <div className="mechanic-stat-card" style={{ borderLeft: '4px solid #faad14' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                    {t('waiting', lang)}
                                </div>
                                <div style={{ fontSize: 34, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1 }}>
                                    {stats.waiting}
                                </div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(250, 173, 20, 0.15)', color: '#faad14' }}>
                                <Clock size={28} />
                            </div>
                        </div>
                        <div style={{ marginTop: 14, fontSize: 12, color: '#faad14', fontWeight: 700 }}>
                            ● {lang === 'bn' ? 'পরিদর্শনের অপেক্ষায়' : 'Pending Inspection'}
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="mechanic-stat-card" style={{ borderLeft: '4px solid #06b6d4' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                    {t('inspecting', lang)}
                                </div>
                                <div style={{ fontSize: 34, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1 }}>
                                    {stats.inspecting}
                                </div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(6, 182, 212, 0.15)', color: '#06b6d4' }}>
                                <Eye size={28} />
                            </div>
                        </div>
                        <div style={{ marginTop: 14, fontSize: 12, color: '#06b6d4', fontWeight: 700 }}>
                            ● {lang === 'bn' ? 'সমস্যা পর্যবেক্ষণ হচ্ছে' : 'Active Observation'}
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="mechanic-stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                    {t('in_progress', lang)}
                                </div>
                                <div style={{ fontSize: 34, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1 }}>
                                    {stats.inProgress}
                                </div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }}>
                                <Wrench size={28} />
                            </div>
                        </div>
                        <div style={{ marginTop: 14, fontSize: 12, color: '#3b82f6', fontWeight: 700 }}>
                            ● {lang === 'bn' ? 'মেরামত বা রিকুইজিশন' : 'Work Commenced'}
                        </div>
                    </div>
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <div className="mechanic-stat-card" style={{ borderLeft: '4px solid #10b981' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', letterSpacing: '0.5px', marginBottom: 6 }}>
                                    {t('finished', lang)}
                                </div>
                                <div style={{ fontSize: 34, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1 }}>
                                    {stats.finished}
                                </div>
                            </div>
                            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                                <CheckCircle2 size={28} />
                            </div>
                        </div>
                        <div style={{ marginTop: 14, fontSize: 12, color: '#10b981', fontWeight: 700 }}>
                            ✓ {lang === 'bn' ? 'সম্পন্ন ও প্রস্তুত' : 'Ready for QC'}
                        </div>
                    </div>
                </Col>
            </Row>

            {/* Advanced Progress Tracker / Specialist Activity Overview */}
            {isAdmin && mechanics.length > 0 && (
                <div style={{ marginBottom: 32 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                        <User size={18} style={{ color: '#06b6d4' }} />
                        <span style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', letterSpacing: '0.5px' }}>
                            {t('mechanic_activity', lang)}
                        </span>
                    </div>
                    <div style={{ background: 'rgba(11, 15, 25, 0.4)', borderRadius: 24, padding: 16, border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                        {mechanics.map((m, idx) => (
                            <AdminOverviewCard key={m.id} mechanic={m} intakes={intakes} token={token} lang={lang} index={idx} />
                        ))}
                    </div>
                </div>
            )}

            {/* Main Active & Finished Job Cards View */}
            <Tabs
                defaultActiveKey="active"
                style={{ marginTop: 12 }}
                items={[
                    {
                        key: 'active',
                        label: <Space style={{ fontWeight: 600, padding: '4px 8px', fontSize: 15 }}><Wrench size={16} /> {t('active_jobs', lang)} ({activeJobs.length})</Space>,
                        children: activeJobs.length === 0 ? (
                            <div style={{ padding: '60px 20px', background: 'rgba(15, 23, 42, 0.3)', borderRadius: 20, textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <Empty description={isAdmin ? (lang === 'bn' ? 'ওয়ার্কশপে বর্তমানে কোনো অ্যাক্টিভ কাজ নেই।' : 'No active job cards in the workshop.') : (lang === 'bn' ? 'আপনার জন্য কোনো গাড়ি বর্তমানে নিযুক্ত নেই।' : 'No vehicles assigned to you right now.')} />
                            </div>
                        ) : (
                            <div className="job-cards-grid">
                                {activeJobs.map(intake => (
                                    <VehicleCard
                                        key={intake.id}
                                        intake={intake}
                                        onAction={handleStatusChange}
                                        lang={lang}
                                        onInspect={(i) => { 
                                            setInspectModal(i); 
                                            noteForm.setFieldsValue({ 
                                                mechanicNotes: i.mechanicNotes || '', 
                                                observations: i.observations || '', 
                                                partsNeeded: i.partsNeeded || '' 
                                            });
                                            setItems((i.items || []).map((it, idx) => ({ ...it, id: Date.now() + idx })));
                                        }}
                                        onReassign={isAdmin ? (i) => { setReassignModal(i); reassignForm.setFieldsValue({ mechanicId: i.mechanicId }); } : null}
                                        token={token}
                                    />
                                ))}
                            </div>
                        )
                    },
                    {
                        key: 'finished',
                        label: <Space style={{ fontWeight: 600, padding: '4px 8px', fontSize: 15 }}><CheckCircle2 size={16} /> {t('finished_jobs', lang)} ({finishedJobs.length})</Space>,
                        children: finishedJobs.length === 0 ? (
                            <div style={{ padding: '60px 20px', background: 'rgba(15, 23, 42, 0.3)', borderRadius: 20, textAlign: 'center', border: '1px solid rgba(255, 255, 255, 0.05)' }}>
                                <Empty description={lang === 'bn' ? 'কোনো কাজ সম্পন্ন হয়নি।' : "No finished jobs logged yet."} />
                            </div>
                        ) : (
                            <div className="job-cards-grid">
                                {finishedJobs.map(intake => (
                                    <VehicleCard
                                        key={intake.id}
                                        intake={intake}
                                        onAction={handleStatusChange}
                                        onInspect={() => {}}
                                        lang={lang}
                                        onReassign={isAdmin ? (i) => { setReassignModal(i); reassignForm.setFieldsValue({ mechanicId: i.mechanicId }); } : null}
                                        token={token}
                                    />
                                ))}
                            </div>
                        )
                    }
                ]}
            />

            {/* Advanced Inspection Notes Dialog Modal */}
            <Modal
                title={<Space align="center" style={{ fontSize: 18, fontWeight: 600 }}><ClipboardCheck size={20} style={{ color: '#06b6d4' }} /> <span>{t('inspection_notes', lang)} — {inspectModal?.vehicleNo}</span></Space>}
                open={!!inspectModal}
                onCancel={() => { setInspectModal(null); noteForm.resetFields(); }}
                onOk={() => noteForm.submit()}
                okText={t('save_notes', lang)}
                width={750}
                className="luxury-modal"
                okButtonProps={{ className: 'btn-vibrant-cyan', style: { borderRadius: 10, fontWeight: 600, height: 40, padding: '0 24px' } }}
                cancelButtonProps={{ style: { borderRadius: 10, fontWeight: 500 } }}
            >
                <Form form={noteForm} layout="vertical" onFinish={handleSaveNotes} style={{ marginTop: 16 }}>
                    <Form.Item name="observations" label={<span style={{ fontWeight: 800 }}>{t('detailed_observations', lang)}</span>}>
                        <SmartVoiceInput isTextArea rows={3} placeholder={lang === 'bn' ? 'পরিদর্শনে আপনি যা পেয়েছেন...' : "What observations you captured during diagnostic inspection..."} />
                    </Form.Item>
                    <Form.Item name="mechanicNotes" label={<span style={{ fontWeight: 800 }}>{t('mechanic_notes_internal', lang)}</span>}>
                        <SmartVoiceInput isTextArea rows={3} placeholder={lang === 'bn' ? 'আপনার ব্যক্তিগত মন্তব্য...' : "Your personal notes or recommended fixes for this vehicle..."} />
                    </Form.Item>
                    <Form.Item name="partsNeeded" label={<span style={{ fontWeight: 800 }}>{t('quick_parts_list', lang)}</span>}>
                        <SmartVoiceInput isTextArea rows={2} placeholder={lang === 'bn' ? 'প্রয়োজনীয় পার্টসগুলোর তালিকা...' : "List critical parts needed to proceed with repair..."} />
                    </Form.Item>

                    <Divider style={{ borderColor: 'rgba(255, 255, 255, 0.1)', fontWeight: 800, color: '#06b6d4' }}>{t('structured_requirements', lang)}</Divider>
                    <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
                        <Button className="btn-vibrant-cyan" size="small" onClick={() => handleAddItem('Part')} style={{ fontWeight: 800, padding: '4px 16px' }}>+ {t('part', lang).toUpperCase()}</Button>
                        <Button className="btn-vibrant-blue" size="small" onClick={() => handleAddItem('Service')} style={{ fontWeight: 800, padding: '4px 16px' }}>+ {t('service', lang).toUpperCase()}</Button>
                    </div>
                    {items.map(item => (
                        <Row key={item.id} gutter={10} style={{ marginBottom: 12 }} align="middle">
                            <Col span={1}><Badge color={item.type === 'Part' ? '#06b6d4' : '#f59e0b'} /></Col>
                            <Col span={10}>
                                <Input value={item.name} onChange={v => handleItemChange(item.id, 'name', v.target.value)} placeholder={t('item_name', lang)} style={{ borderRadius: 8 }} />
                            </Col>
                            <Col span={4}>
                                <Input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value) || 1)} style={{ borderRadius: 8 }} />
                            </Col>
                            <Col span={5}>
                                <Input type="number" value={item.price} onChange={e => handleItemChange(item.id, 'price', Number(e.target.value) || 0)} placeholder={t('price', lang)} style={{ borderRadius: 8 }} />
                            </Col>
                            <Col span={4}>
                                <Button type="text" danger onClick={() => handleRemoveItem(item.id)} style={{ fontWeight: 900 }}>{t('remove', lang)}</Button>
                            </Col>
                        </Row>
                    ))}
                </Form>
            </Modal>

            {/* Specialist Re-assignment Modal */}
            <Modal
                title={<Space align="center" style={{ fontSize: 18, fontWeight: 600 }}><RefreshCw size={18} style={{ color: '#3b82f6' }} /> <span>{t('reassign', lang)} — {reassignModal?.vehicleNo}</span></Space>}
                open={!!reassignModal}
                onCancel={() => setReassignModal(null)}
                onOk={() => reassignForm.submit()}
                okText={t('reassign', lang)}
                width={420}
                okButtonProps={{ className: 'btn-vibrant-blue', style: { borderRadius: 10, fontWeight: 800 } }}
                cancelButtonProps={{ style: { borderRadius: 10, fontWeight: 700 } }}
            >
                <Form form={reassignForm} layout="vertical" onFinish={handleReassign} style={{ marginTop: 16 }}>
                    <Form.Item name="mechanicId" label={<span style={{ fontWeight: 800 }}>{t('select_specialist', lang)}</span>} rules={[{ required: true }]}>
                        <Select placeholder={lang === 'bn' ? 'মেকানিক নির্বাচন করুন...' : "Select a specialized mechanic..."} style={{ borderRadius: 8, height: 40 }}>
                            {mechanics.map(m => (
                                <Option key={m.id} value={m.id}>
                                    <span style={{ fontWeight: 700 }}>{m.name.toUpperCase()}</span> <span style={{ opacity: 0.6, fontSize: 11 }}>[{m.department?.toUpperCase() || 'GENERAL'}]</span>
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default MechanicDashboardPage;
