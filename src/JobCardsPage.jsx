import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';

import { 
    Card, Button, Table, Modal, Form, Input, Typography, Tag, Space, 
    message, Popconfirm, Select, InputNumber, AutoComplete, Divider, 
    Row, Col, Avatar, Tooltip 
} from 'antd';
import { Sparkles, Printer, Car, Settings, Users, PlusCircle, Calendar, Clipboard, PlayCircle, PauseCircle, CheckCircle, ShieldCheck, Wrench, XCircle, Search, Edit3, Trash2, ArrowRight, FileText, Send, Clock, Phone, UserCheck, DollarSign } from 'lucide-react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { optimizeCloudinaryUrl } from './utils/cloudinaryUtils';
import dayjs from 'dayjs';

import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { t } from './utils/translations';
import SmartVoiceInput from './components/SmartVoiceInput';
import databaseBridge from './services/databaseBridge';
import { syncToLocalStorage, getFromLocalStorage } from './utils/helpers';
import { processUserInput } from './services/aiServiceV2';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const defaultJobs = [
    {
        id: '1',
        vehicleNo: 'DHA-11-2034',
        customerName: 'Rahim Uddin',
        phone: '01711000000',
        description: 'Engine oil change and brake pad check',
        status: 'active',
        date: dayjs().subtract(1, 'day').toISOString(),
        parts: []
    }
];

const WORKFLOW_STAGES = [
    { value: 'estimate', label: 'Estimate' },
    { value: 'work_in_progress', label: 'Work in Progress' },
    { value: 'quality_check', label: 'Quality Check' },
    { value: 'ready_to_deliver', label: 'Ready to Deliver' },
    { value: 'gate_pass', label: 'Gate Pass' }
];

const WORKFLOW_STAGE_ORDER = WORKFLOW_STAGES.map((item) => item.value);

const normalizeWorkflowStage = (stage) => (
    WORKFLOW_STAGE_ORDER.includes(stage) ? stage : 'estimate'
);

const promoteWorkflowStage = (currentStage, nextStage) => {
    const currentIndex = WORKFLOW_STAGE_ORDER.indexOf(normalizeWorkflowStage(currentStage));
    const nextIndex = WORKFLOW_STAGE_ORDER.indexOf(normalizeWorkflowStage(nextStage));
    if (nextIndex > currentIndex) return nextStage;
    return normalizeWorkflowStage(currentStage);
};

const appendStageHistory = (history, stage, by) => {
    const normalized = normalizeWorkflowStage(stage);
    const safeHistory = Array.isArray(history) ? history : [];
    const last = safeHistory[safeHistory.length - 1];
    if (last && last.stage === normalized) return safeHistory;
    return [...safeHistory, { stage: normalized, timestamp: dayjs().toISOString(), by: by || 'System' }];
};

// ─── Print Work Order Component (For Mechanics) ─────────────────────
const PrintWorkOrder = ({ job, lang }) => {
    if (!job) return null;
 
    const isMuntaha = job.billingEntity === 'Muntaha Motors';
    const accentColor = '#3B82F6'; // Royal Blue
 
    return createPortal(
        <div className="alive-print-area">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '4px solid #000', paddingBottom: 20, marginBottom: 30 }}>
                <div>
                    <div style={{ fontSize: 32, fontWeight: 600, color: '#000', letterSpacing: '0.2px' }}>{isMuntaha ? 'Muntaha Motors' : 'Mamun Automobiles'}</div>
                    <div style={{ fontSize: 12, color: '#666', fontWeight: 600, marginTop: 4, letterSpacing: '0.2px' }}>
                        {isMuntaha ? 'Workshop Road, Dhaka | Hotline: 01798-324523' : 'Premium auto care | European standards'}
                    </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 40, fontWeight: 600, color: accentColor, lineHeight: 1 }}>Work order</div>
                    <div style={{ fontSize: 16, fontWeight: 600, color: '#000', marginTop: 5 }}>#JC-{String(job.id || '').padStart(3, '0')}</div>
                </div>
            </div>
 
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '40px', marginBottom: 30 }}>
                <div>
                    <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, marginBottom: 8, letterSpacing: '0.2px' }}>{lang === 'bn' ? 'গাড়ি ও কাস্টমার' : 'Vehicle & Client'}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>{job.vehicleNo}</div>
                    <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4 }}>{job.customerName}</div>
                    <div style={{ fontSize: 14, color: '#444' }}>{job.phone}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, marginBottom: 8, letterSpacing: '0.2px' }}>{t('date_opened', lang)}</div>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#000' }}>{dayjs(job.date).format('DD MMM, YYYY')}</div>
                    <div style={{ display: 'inline-block', marginTop: 10, padding: '4px 12px', border: '1px solid #000', fontSize: 10, fontWeight: 600 }}>{lang === 'bn' ? 'মেকানিক কপি' : 'Mechanic copy'}</div>
                </div>
            </div>
 
            <div style={{ marginBottom: 30, flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, marginBottom: 10, letterSpacing: '0.2px', borderBottom: '1.5px solid #eee', paddingBottom: 5 }}>{t('work_description', lang)}</div>
                <div style={{ fontSize: 15, color: '#000', fontWeight: 600, lineHeight: 1.6, minHeight: '60px' }}>{job.description || (lang === 'bn' ? 'কোনো বিবরণ দেওয়া হয়নি।' : 'No description provided.')}</div>

                <div style={{ marginTop: 25 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, marginBottom: 10, letterSpacing: '0.2px', borderBottom: '1.5px solid #eee', paddingBottom: 5 }}>{lang === 'bn' ? 'ব্যবহৃত পার্টস' : 'Parts to be Installed'}</div>
                    <table className="premium-print-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>{t('part', lang)} {t('item_name', lang)}</th>
                                <th style={{ textAlign: 'center', width: '80px' }}>{t('qty', lang)}</th>
                                <th style={{ textAlign: 'center', width: '150px' }}>{lang === 'bn' ? 'যাচাইকরণ' : 'Verification'}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(job.parts || []).length > 0 ? (job.parts || []).map((p, i) => {
                                const compress = (job.parts || []).length > 5;
                                const cellStyle = { 
                                    padding: compress ? '2.5px 8px' : '8px 8px', 
                                    fontSize: compress ? '11px' : '12.5px',
                                    lineHeight: compress ? '1.1' : '1.4'
                                };
                                return (
                                    <tr key={i}>
                                        <td style={{ ...cellStyle, fontWeight: 600 }}>{p.name}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 600 }}>{p.quantity}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontSize: 11, color: '#999' }}>[ ] {lang === 'bn' ? 'লাগানো হয়েছে' : 'Installed'}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={3} style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: 12 }}>{t('no_parts', lang)}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div style={{ marginTop: 25 }}>
                    <div style={{ fontSize: 10, fontWeight: 600, color: accentColor, marginBottom: 10, letterSpacing: '0.2px', borderBottom: '1.5px solid #eee', paddingBottom: 5 }}>{lang === 'bn' ? 'সার্ভিস টাস্ক' : 'Service Tasks'}</div>
                    <table className="premium-print-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>{t('work_description', lang)}</th>
                                <th style={{ textAlign: 'center', width: '150px' }}>{t('status', lang)}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {(job.services || []).length > 0 ? (job.services || []).map((s, i) => {
                                const compress = (job.services || []).length > 3;
                                const cellStyle = { 
                                    padding: compress ? '2.5px 8px' : '8px 8px', 
                                    fontSize: compress ? '11px' : '12.5px',
                                    lineHeight: compress ? '1.1' : '1.4'
                                };
                                return (
                                    <tr key={i}>
                                        <td style={{ ...cellStyle, fontWeight: 600 }}>{s.name}</td>
                                        <td style={{ ...cellStyle, textAlign: 'center', fontSize: 11, color: '#999' }}>[ ] {t('completed', lang)}</td>
                                    </tr>
                                );
                            }) : (
                                <tr>
                                    <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#999', fontSize: 12 }}>{lang === 'bn' ? 'কোনো সার্ভিস নেই' : 'No Services Assigned'}</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
 
            <div className="alive-footer-lock">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                    <div style={{ width: '250px', textAlign: 'center' }}>
                        <div style={{ height: '1.5px', background: '#000', marginBottom: 8 }}></div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2px' }}>{lang === 'bn' ? 'মেকানিক সিগনেচার' : 'Mechanic signature'}</div>
                    </div>
                    <div style={{ width: '250px', textAlign: 'center' }}>
                        <div style={{ height: '1.5px', background: '#000', marginBottom: 8 }}></div>
                        <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.2px' }}>{lang === 'bn' ? 'সুপারভাইজার সাইন-অফ' : 'Supervisor sign-off'}</div>
                    </div>
                </div>
                
                <div style={{ textAlign: 'center', borderTop: '1px solid #eee', paddingTop: 10, fontSize: 9, color: '#999', fontWeight: 600 }}>
                    Mamun Automobiles ERP - {lang === 'bn' ? 'তৈরি করেছেন' : 'Generated By'} {job.assigned_staff_name || (lang === 'bn' ? 'সিস্টেম' : 'System')} - {dayjs().format('DD/MM/YYYY HH:mm')} - Anti-Gravity V3
                </div>
            </div>
        </div>,
        document.body
    );
};


const JobCardsPage = ({ mode = 'default' }) => {
    // State Initialization with Global Context
    const { jobCards: jobs, setJobCards: setJobs, jobIntakes: intakes, inventory, setInventory, customers, setCustomers, companies, logActivity, services, navigateTo, userManagement, departments, generateSafeId, loading, pushNotification, language: lang } = useGlobalState();
    const { user } = useAuth();
    const { theme } = useTheme();
    const isDark = theme.includes('dark') || theme.includes('purple');
    const isAdmin = user?.role === 'Admin';
    const isManager = user?.role === 'Manager';
    const isDeptHead = ((user?.specific_post || '').toLowerCase() === 'head');
    const roleLower = (user?.role || '').toLowerCase();
    const isSuperAdmin = roleLower === 'superadmin' || roleLower === 'super admin' || user?.role === 'SuperAdmin';
    const canAssign = isDeptHead || isManager || isAdmin || isSuperAdmin;
    const canCreate = isDeptHead || isManager || isAdmin || isSuperAdmin;

    console.log('Permission Check:', { role: user?.role, isSuperAdmin, canCreate });

    // build assignee list based on Department Head's department (or all staff for Manager/Admin)
    const assignableStaff = (() => {
        const allStaff = (userManagement || []).filter(u => u.role !== 'Customer');
        if (isManager || isAdmin) return allStaff;
        const dept = user?.department;
        if (!dept) return allStaff; // fallback
        return allStaff.filter(u => u.department === dept);
    })();

    const [isModalVisible, setIsModalVisible] = React.useState(false);
    const [isPartModalVisible, setIsPartModalVisible] = React.useState(false);
    const [selectedJobId, setSelectedJobId] = React.useState(null);
    const [selectedTimelineJobId, setSelectedTimelineJobId] = React.useState(null);

    const [form] = Form.useForm();
    const [partForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [barcodeScanValue, setBarcodeScanValue] = React.useState('');
    const barcodeScannerRef = React.useRef(null);

    // Edit modal state
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [isRequestPickerOpen, setIsRequestPickerOpen] = React.useState(false);
    const [editingJob, setEditingJob] = React.useState(null);
    const [editParts, setEditParts] = React.useState([]);
    const [editServices, setEditServices] = React.useState([]);
    const [editPartForm] = Form.useForm();

    const [selectedCustomerId, setSelectedCustomerId] = React.useState(null);
    const [printingWorkOrder, setPrintingWorkOrder] = React.useState(null);
    const [shouldPrintWorkOrder, setShouldPrintWorkOrder] = React.useState(false);

    // Forced Vehicle Sync: Watch jobIntakeId and populate missing data from intakes (global state)
    const currentIntakeId = Form.useWatch('jobIntakeId', editForm);
    const createIntakeId = Form.useWatch('jobIntakeId', form);

    React.useEffect(() => {
        const syncForm = (f, id) => {
            if (id && intakes) {
                const intake = intakes.find(i => String(i.id) === String(id));
                if (intake) {
                    const vals = f.getFieldsValue(['vehicleNo', 'customerName', 'phone']);
                    const updates = {};
                    if (!vals.vehicleNo || vals.vehicleNo.trim() === '') updates.vehicleNo = intake.vehicleNo;
                    if (!vals.customerName || vals.customerName.trim() === '') updates.customerName = intake.customerName;
                    if (!vals.phone || vals.phone.trim() === '') updates.phone = intake.phone;
                    if (Object.keys(updates).length > 0) f.setFieldsValue(updates);
                }
            }
        };
        if (isEditModalVisible) syncForm(editForm, currentIntakeId);
        if (isModalVisible) syncForm(form, createIntakeId);
    }, [currentIntakeId, createIntakeId, intakes, isEditModalVisible, isModalVisible, editForm, form]);

    React.useEffect(() => {
        if (printingWorkOrder && shouldPrintWorkOrder) {
            bufferedPrint(() => setShouldPrintWorkOrder(false));
        }
    }, [printingWorkOrder, shouldPrintWorkOrder]);

    // Background live inventory database sync triggered instantly upon Request Parts action
    React.useEffect(() => {
        if (isPartModalVisible) {
            databaseBridge.fetchCollection('inventory')
                .then(res => {
                    if (res && res.length > 0) {
                        setInventory(res);
                    }
                })
                .catch(err => console.error('[Inventory-Sync] Soft reload error:', err));
        }
    }, [isPartModalVisible]);

    const handleSelectIntake = (intake) => {
        const f = isEditModalVisible ? editForm : form;
        f.setFieldsValue({
            jobIntakeId: intake.id,
            vehicleNo: intake.vehicleNo,
            customerName: intake.customerName,
            phone: intake.phone,
            description: intake.complaints || ''
        });
        setIsRequestPickerOpen(false);
        message.success(`Populated from ${intake.vehicleNo}`);
    };

    React.useEffect(() => {
        if (isPartModalVisible) {
            setBarcodeScanValue('');
            setTimeout(() => barcodeScannerRef.current?.focus(), 80);
        }
    }, [isPartModalVisible]);

    React.useEffect(() => {
        const pendingQuotation = getFromLocalStorage('pendingJobCardFromQuotation');
        if (pendingQuotation) {
            form.setFieldsValue({
                customerName: pendingQuotation.customerName,
                phone: pendingQuotation.phone,
                vehicleNo: pendingQuotation.vehicleNo,
                billingEntity: pendingQuotation.billingEntity,
                description: pendingQuotation.description,
                jobIntakeId: pendingQuotation.jobIntakeId || null
            });
            setIsModalVisible(true);
            syncToLocalStorage('pendingJobCardFromQuotation', null);
        }

        const pendingIntake = getFromLocalStorage('pendingJobCardFromIntake');
        if (pendingIntake) {
            form.setFieldsValue({
                customerName: pendingIntake.customerName,
                phone: pendingIntake.phone,
                vehicleNo: pendingIntake.vehicleNo,
                description: pendingIntake.description,
                jobIntakeId: pendingIntake.jobIntakeId || null
            });
            setIsModalVisible(true);
            syncToLocalStorage('pendingJobCardFromIntake', null);
        }
    }, [form]);

    const visibleJobs = React.useMemo(() => {
        const reqSentIntakes = (intakes || []).filter(i => ['Req Sent', 'Quotation Ready', 'Quotation Sent'].includes(i.status)).map(i => ({ ...i, isIntake: true, workflowStage: 'estimate' }));
        const allPotentialJobs = [...(jobs || []), ...reqSentIntakes];

        if (isSuperAdmin || isAdmin || isManager) {
            if (mode === 'staff') {
                return allPotentialJobs.filter((job) => job.assigned_staff_id === user?.id || job.mechanicId === user?.id);
            }
            return allPotentialJobs;
        }

        const dept = user?.department;
        if (isDeptHead) {
            return allPotentialJobs.filter((job) => (job.departmentsInvolved || []).includes(dept) || job.department === dept);
        }

        const staffJobs = allPotentialJobs.filter((job) => (job.assigned_staff_id === user?.id) || (job.mechanicId === user?.id) || (job.departmentsInvolved || []).includes(user?.department) || job.department === user?.department);
        if (mode === 'staff') {
            return staffJobs.filter((job) => (job.assigned_staff_id === user?.id) || (job.mechanicId === user?.id) || (job.assigned_staff_name || '').toLowerCase() === String(user?.name || '').toLowerCase());
        }
        return staffJobs;
    }, [isSuperAdmin, isAdmin, isManager, isDeptHead, jobs, intakes, mode, user?.department, user?.id, user?.name]);

    const activeTimelineJob = React.useMemo(() => {
        if (selectedTimelineJobId && visibleJobs) {
            const found = visibleJobs.find(j => j.id === selectedTimelineJobId);
            if (found) return found;
        }
        return visibleJobs?.[0] || null;
    }, [selectedTimelineJobId, visibleJobs]);

    // Table Columns
    const columns = [
        {
            title: t('job_id', lang),
            dataIndex: 'id',
            key: 'id',
            render: (text) => <Text strong style={{ color: isDark ? '#9ca3af' : '#4b5563', fontWeight: 600 }}>#JC-{String(text || '').padStart(3, '0')}</Text>,
        },
        {
            title: t('billing_status', lang),
            dataIndex: 'billingStatus',
            key: 'billingStatus',
            render: (status, record) => {
                if (record.isIntake) {
                    const statusVal = record.status || 'Req Sent';
                    const color = statusVal === 'Quotation Sent' ? 'success' : 'warning';
                    return <Tag color={color} style={{ fontWeight: 600 }}>{t(statusVal === 'Req Sent' ? 'req_sent' : statusVal === 'Quotation Sent' ? 'quotation_sent' : statusVal, lang)}</Tag>;
                }
                const color = status === 'READY' ? 'success' : status === 'OK' ? 'blue' : status === 'PAID' ? 'blue' : 'error';
                const label = status === 'PAID' ? 'Paid' : status === 'READY' ? 'Ready' : status === 'OK' ? 'OK' : 'Hold';

                const pendingDepts = (record.departmentsInvolved || []).filter(dept => {
                    const dTask = record.departmentsTasks?.[dept];
                    return !dTask || dTask.status !== 'completed';
                });

                return (
                    <Space direction="vertical" size={0}>
                        <Tag color={color} style={{ fontWeight: 600 }}>{label}</Tag>
                        {label === 'HOLD' && pendingDepts.length > 0 && (
                            <Text type="secondary" style={{ fontSize: 10 }}>{lang === 'bn' ? 'অপেক্ষমাণ:' : 'Wtg for:'} {pendingDepts.join(', ')}</Text>
                        )}
                    </Space>
                );
            }
        },
        {
            title: t('date_opened', lang),
            dataIndex: 'date',
            key: 'date',
            render: (date) => <span style={{ fontSize: 12, color: isDark ? '#d1d5db' : '#374151' }}>{dayjs(date).format('DD MMM, YYYY hh:mm A')}</span>,
        },
        {
            title: t('vehicle_customer', lang),
            key: 'vehicle',
            render: (_, record) => (
                <div 
                    onClick={() => setSelectedTimelineJobId(record.id)}
                    style={{ 
                        cursor: 'pointer',
                        padding: '10px 14px', 
                        background: isDark ? 'rgba(6, 182, 212, 0.05)' : '#f0f9ff', 
                        border: '1px solid rgba(6, 182, 212, 0.3)', 
                        borderLeft: '4px solid #06b6d4', 
                        borderRadius: '6px',
                        lineHeight: 1.5,
                        transition: 'all 0.2s'
                    }}
                >
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
                        <div>
                            <span style={{ color: isDark ? '#67e8f9' : '#0284c7', fontWeight: 600, fontSize: 11 }}>Vehicle:</span>{' '}
                            <span style={{ color: isDark ? '#fff' : '#000', fontWeight: 600, fontSize: 13 }}>{record.vehicleNo || 'N/A'}</span>
                        </div>
                        <div>
                            <span style={{ color: isDark ? '#67e8f9' : '#0284c7', fontWeight: 600, fontSize: 11 }}>Client:</span>{' '}
                            <span style={{ color: isDark ? '#e5e7eb' : '#1f2937', fontWeight: 600, fontSize: 12 }}>{record.customerName || 'N/A'}</span>
                        </div>
                        <div>
                            <span style={{ color: isDark ? '#67e8f9' : '#0284c7', fontWeight: 600, fontSize: 11 }}>Phone:</span>{' '}
                            <span style={{ color: isDark ? '#9ca3af' : '#4b5563', fontSize: 11 }}>{record.phone || 'N/A'}</span>
                        </div>
                    </div>
                    {record.assigned_staff_name ? (
                        <div style={{ marginTop: 6, borderTop: '1px solid rgba(6, 182, 212, 0.1)', paddingTop: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 10 }}>Assigned Mechanic:</span>
                            <span style={{ color: isDark ? '#fde047' : '#d97706', fontWeight: 600, fontSize: 11 }}>{record.assigned_staff_name}</span>
                        </div>
                    ) : null}
                </div>
            ),
        },
        {
            title: t('work_description', lang),
            dataIndex: 'description',
            key: 'description',
            render: (text) => (
                <div style={{ 
                    fontSize: 13, 
                    fontWeight: 600, 
                    color: isDark ? '#f3f4f6' : '#111827',
                    maxWidth: 240,
                    whiteSpace: 'normal',
                    wordBreak: 'break-word',
                    lineHeight: 1.4
                }}>
                    {text || '—'}
                </div>
            )
        },
        {
            title: t('parts_used', lang),
            key: 'parts',
            render: (_, record) => {
                const partsCount = record.parts?.reduce((sum, p) => sum + p.quantity, 0) || 0;
                return partsCount > 0 ? (
                    <Tag color="purple">{partsCount} {t('parts_added', lang)}</Tag>
                ) : (
                    <Text type="secondary" style={{ fontSize: 12 }}>{t('no_parts', lang)}</Text>
                );
            }
        },
        {
            title: t('status', lang),
            dataIndex: 'status',
            key: 'status',
            render: (status, record) => {
                const isComp = status === 'completed';
                return (
                    <Tag 
                        color={isComp ? '#10b981' : '#f59e0b'}
                        style={{ 
                            padding: '4px 10px', 
                            borderRadius: '4px', 
                            fontWeight: 600, 
                            fontSize: 11,
                            letterSpacing: '0.5px',
                            color: '#fff',
                            border: 'none',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                    >
                        {record.isIntake ? 'Pending' : (isComp ? 'Completed' : 'In Progress')}
                    </Tag>
                );
            },
        },
        {
            title: t('workflow', lang),
            dataIndex: 'workflowStage',
            key: 'workflowStage',
            render: (stage) => {
                const normalized = normalizeWorkflowStage(stage);
                const stageObj = WORKFLOW_STAGES.find((item) => item.value === normalized);
                const stageLabel = stageObj ? t(stageObj.value, lang) : t('estimate', lang);
                return <Tag>{stageLabel}</Tag>;
            }
        },
        {
            title: t('commission', lang),
            dataIndex: 'commissionPercent',
            key: 'commissionPercent',
            render: (value) => <Tag color="blue">{Number(value || 0)}%</Tag>
        },
        {
            title: t('actions', lang),
            key: 'actions',
            render: (_, record) => (
                <Space size="small" wrap>
                    {record.isIntake ? (
                        <Button
                            size="small"
                            onClick={() => handleGenerateQuotation(record)}
                            style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0 }}
                        >
                            {t('create_quotation', lang)}
                        </Button>
                    ) : (
                        <Button
                            size="small"
                            onClick={() => openEditModal(record)}
                            style={{ background: isDark ? 'rgba(255,255,255,0.05)' : 'transparent', border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid #000', color: isDark ? '#FFF' : '#000', fontWeight: 600, borderRadius: 0 }}
                        >
                            {t('edit', lang)}
                        </Button>
                    )}
                    {record.status === 'active' && (
                        <>
                            <Button
                                size="small"
                                onClick={() => {
                                    setSelectedJobId(record.id);
                                    setIsPartModalVisible(true);
                                }}
                                style={{ background: 'rgba(59,130,246,0.1)', border: '1px solid rgba(59,130,246,0.3)', color: '#3B82F6', fontWeight: 600, borderRadius: 0 }}
                            >
                                + {t('add_parts', lang)}
                            </Button>
                            <Button
                                size="small"
                                style={{ background: '#FFF', border: 'none', color: '#000', fontWeight: 600, borderRadius: 0 }}
                                onClick={() => handleGenerateQuotation(record)}
                            >
                                {t('quotation', lang)}
                            </Button>
                            <Button
                                size="small"
                                style={{ background: 'transparent', border: '1px solid #FFF', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                                onClick={() => handlePrintWorkOrder(record)}
                            >
                                {t('work_order', lang)}
                            </Button>
                            <Popconfirm
                                title={lang === 'bn' ? 'আপনি কি কাজ সম্পন্ন হয়েছে বলে চিহ্নিত করতে চান?' : "Mark as completed?"}
                                onConfirm={() => handleCompleteJob(record.id)}
                            >
                                <Button style={{ background: '#3B82F6', border: isDark ? 'none' : '1px solid #000', color: '#FFFFFF', fontWeight: 600, borderRadius: 0, fontSize: 11 }}>
                                    {t('complete', lang)}
                                </Button>
                            </Popconfirm>
                        </>
                    )}
                    {record.status === 'completed' && (
                        <Space>
                            <Button
                                size="small"
                                style={{ background: 'transparent', border: '1px solid #FFF', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                                onClick={() => handlePrintWorkOrder(record)}
                            >
                                {t('work_order', lang)}
                            </Button>
                            <Button
                                size="small"
                                disabled={record.billingStatus === 'HOLD'}
                                style={{
                                    background: record.billingStatus === 'HOLD' ? 'rgba(255,255,255,0.1)' : '#3B82F6',
                                    border: 'none',
                                    color: record.billingStatus === 'HOLD' ? '#666' : '#FFFFFF',
                                    fontWeight: 600,
                                    borderRadius: 0,
                                    fontSize: 11
                                }}
                                onClick={() => handleGenerateBill(record)}
                            >
                                {t('generate_bill', lang)}
                            </Button>
                        </Space>
                    )}
                    {isAdmin && (
                        <Popconfirm
                            title={lang === 'bn' ? 'আপনি কি জব কার্ডটি মুছতে চান?' : "Delete Job Card?"}
                            onConfirm={() => handleDeleteJob(record.id)}
                            okText={lang === 'bn' ? 'হ্যাঁ' : "Yes"}
                            cancelText={lang === 'bn' ? 'না' : "No"}
                        >
                            <Button danger type="text">{lang === 'bn' ? 'মুছে ফেলুন' : 'Delete'}</Button>
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    const handleCompleteJob = async (id) => {
        const job = (jobs || []).find(j => j.id === id);
        if (!job) return;

        const nextStage = promoteWorkflowStage(job.workflowStage, 'ready_to_deliver');
        const updatedJob = {
            ...job,
            status: 'completed',
            completedAt: dayjs().toISOString(),
            workflowStage: nextStage,
            workflowHistory: appendStageHistory(job.workflowHistory, nextStage, user?.name)
        };

        try {
            await databaseBridge.updateJobCard(updatedJob);
            setJobs((jobs || []).map(j => j.id === id ? updatedJob : j));
            pushNotification({
                type: 'success',
                title: 'Work Finished',
                message: `${updatedJob.assigned_staff_name || user?.name || 'Staff'} marked Job ${updatedJob.id} as Work Finished.`,
                audience: ['Admin', 'Manager', 'SuperAdmin'],
                linkMenuKey: '2',
                meta: {
                    jobId: updatedJob.id,
                    vehicleNo: updatedJob.vehicleNo,
                    customerName: updatedJob.customerName
                }
            });
            message.success("Job marked as Work Finished!");
        } catch (err) {
            console.error(err);
            message.error(`Failed to update job status: ${err.message}`);
        }
    };

    const handleDeleteJob = (id) => {
        setJobs(jobs.filter(job => job.id !== id));
        message.success("Job card deleted successfully.");
    };

    const handleCreateJob = async (values) => {
        // AI Auto-Correction Logic
        const refinedDescription = await processUserInput(values.description, lang);

        // Check if customer exists, if not create one
        const currentCustomers = customers || [];
        const existingCustomer = currentCustomers.find(c => c.phone === values.phone);
        if (!existingCustomer) {
            const newCustomer = {
                id: generateSafeId('CUST'),
                name: values.customerName,
                phone: values.phone,
                vehicleNo: values.vehicleNo,
                balance: 0,
                lastUpdated: dayjs().toISOString()
            };
            setCustomers([newCustomer, ...currentCustomers]);
        }

        let assigned_staff_id = null;
        let assigned_staff_name = null;
        if (values.assigned_staff_id) {
            const s = (userManagement || []).find(u => u.id === values.assigned_staff_id);
            assigned_staff_id = values.assigned_staff_id;
            assigned_staff_name = s ? s.name : null;
        }

        const newJob = {
            id: generateSafeId('JC'),
            ...values,
            description: refinedDescription || values.description || '',
            customerId: selectedCustomerId || (existingCustomer ? existingCustomer.id : null),
            departmentsInvolved,
            departmentsTasks,
            status: 'active',
            commissionPercent: Number(values.commissionPercent || 0),
            date: dayjs().toISOString(),
            parts: [],
            workflowStage: 'estimate',
            workflowHistory: [{ stage: 'estimate', timestamp: dayjs().toISOString(), by: user?.name || 'System' }]
        };
        // support optional assigned staff when creating via form (if form contains it)
        if (values.assigned_staff_id) {
            const s = (userManagement || []).find(u => u.id === values.assigned_staff_id);
            newJob.assigned_staff_id = values.assigned_staff_id;
            newJob.assigned_staff_name = s ? s.name : null;
        }

        try {
            await databaseBridge.updateJobCard(newJob);
            setJobs([newJob, ...(jobs || [])]);
            setIsModalVisible(false);
            form.resetFields();
            message.success("New Job Card created successfully!");
        } catch (err) {
            console.error('Failed to create job card:', err);
            message.error(lang === 'bn' ? 'জব কার্ড তৈরি করতে ব্যর্থ হয়েছে!' : 'Failed to create job card in database.');
        }
    };


    const handleGenerateQuotation = (jobRecord) => {
        const quotationData = {
            jobCardId: jobRecord.id,
            clientName: jobRecord.customerName,
            clientPhone: jobRecord.phone,
            vehicleNo: jobRecord.vehicleNo,
            items: [
                ...(jobRecord.parts || []).map(p => ({ ...p, type: 'Part' })),
                ...(jobRecord.services || []).map(s => ({ ...s, type: 'Service' }))
            ]
        };
        // Sync to local storage for QuotationsPage to pickup if it's a new draft
        syncToLocalStorage('pendingQuotationData', quotationData);
        message.success(`Job #${jobRecord.id} quotation context prepared!`);
        if (navigateTo) navigateTo('quotations');
    };

    const handlePrintWorkOrder = (job) => {
        setPrintingWorkOrder(job);
        setShouldPrintWorkOrder(true);
    };

    const handleGenerateBill = async (jobRecord) => {
        const nextStage = promoteWorkflowStage(jobRecord.workflowStage, 'ready_to_deliver');
        const updatedJob = {
            ...jobRecord,
            workflowStage: nextStage,
            workflowHistory: appendStageHistory(jobRecord.workflowHistory, nextStage, user?.name)
        };

        try {
            await databaseBridge.updateJobCard(updatedJob);
            setJobs((jobs || []).map(job => job.id === jobRecord.id ? updatedJob : job));
        } catch (err) {
            console.error(err);
            message.error(`Failed to update job status: ${err.message}`);
            return;
        }

        const billData = {
            jobId: jobRecord.id,
            customerId: jobRecord.customerId,
            customerName: jobRecord.customerName,
            vehicleNo: jobRecord.vehicleNo,
            phone: jobRecord.phone,
            description: jobRecord.description,
            parts: jobRecord.parts || [],
            services: jobRecord.services || []
        };
        syncToLocalStorage('pendingBillData', billData);
        message.success(`Job #${jobRecord.id} data synced! Redirecting to Billing...`);
        if (navigateTo) navigateTo('3');
    };

    const handleAddPart = (values, options = {}) => {
        const { keepModalOpen = false } = options;
        // Try to find part by ID or exact Name / Part Name
        let part = inventory.find(p => p.id === values.partId || (p.partName || p.name)?.toLowerCase() === (values.partId || '').toLowerCase());

        // If not found in inventory, check if it's a known service
        let serviceMatch = !part && (services || []).find(s => s.name?.toLowerCase() === (values.partId || '').toLowerCase());

        if (!part && !serviceMatch && values.partId) {
            // Treat as new inventory product if typed directly
            const newPart = {
                id: generateSafeId('INV'),
                partName: values.partId,
                name: values.partId,
                quantity: values.quantity,
                stock: values.quantity,
                buyingPrice: 0,
                sellingPrice: 0,
                unitPrice: 0,
                category: 'Other',
                supplierId: 'AUTO-GEN',
                status: 'New Product',
                lastUpdated: dayjs().toISOString()
            };
            setInventory([...inventory, newPart]);
            part = newPart;
            message.info(`New product "${values.partId}" auto-saved to Inventory.`);
        }

        if (part) {
            const availableQty = part.quantity !== undefined ? part.quantity : (part.stock || 0);
            const partLabelName = part.partName || part.name || 'Unnamed Part';
            if (values.quantity > availableQty && part.status !== 'New Product') {
                message.error(`Insufficient stock! ${partLabelName} only has ${availableQty} items left.`);
                return;
            }

            // 1. Deduct from Inventory (if existed)
            const updatedInventory = inventory.map(p => {
                if (p.id === part.id) {
                    const oldQty = p.quantity !== undefined ? p.quantity : (p.stock || 0);
                    const newQty = Math.max(0, oldQty - values.quantity);
                    return { ...p, quantity: newQty, stock: newQty };
                }
                return p;
            });
            if (part.status !== 'New Product') setInventory(updatedInventory);

            // 2. Add to Job Card
            const newPartEntry = {
                id: generateSafeId('PART-ENTRY'),
                partId: part.id,
                name: partLabelName,
                partNumber: part.partNumber || '',
                price: part.sellingPrice || part.unitPrice || 0,
                quantity: values.quantity
            };

            const updatedJobs = jobs.map(j =>
                j.id === selectedJobId
                    ? { ...j, parts: [...(j.parts || []), newPartEntry] }
                    : j
            );
            setJobs(updatedJobs);
            logActivity(`${values.quantity}x ${partLabelName} used in Job #JC-${String(selectedJobId || '').padStart(3, '0')}`);
            message.success(`Added ${values.quantity} ${partLabelName} to Job #JC-${String(selectedJobId || '').padStart(3, '0')}`);
          } else if (serviceMatch) {
              // Add as a service directly
              const newSvcEntry = {
                  id: generateSafeId('SVC-ENTRY'),
                name: serviceMatch.name,
                basePrice: serviceMatch.basePrice || 0
            };
            const updatedJobs = jobs.map(j =>
                j.id === selectedJobId
                    ? { ...j, services: [...(j.services || []), newSvcEntry] }
                    : j
            );
            setJobs(updatedJobs);
            logActivity(`Service "${serviceMatch.name}" added to Job #JC-${String(selectedJobId || '').padStart(3, '0')}`);
              message.success(`Added ${serviceMatch.name} to Job #JC-${String(selectedJobId || '').padStart(3, '0')}`);
          }

          partForm.resetFields();
          setBarcodeScanValue('');
            if (!keepModalOpen) {
                setIsPartModalVisible(false);
                setSelectedJobId(null);
            } else {
                setTimeout(() => barcodeScannerRef.current?.focus(), 60);
            }
    };

    const handleBarcodeScan = (codeInput) => {
        const code = String(codeInput || '').trim();
        if (!code) return;
        if (!selectedJobId) {
            message.warning('Select a job before scanning parts.');
            setBarcodeScanValue('');
            return;
        }
        const normalized = code.toLowerCase();

        const matchesCode = (item = {}) => {
            const fields = [item.barcode, item.barcodeId, item.sku, item.partNumber, item.id];
            return fields.some(field => field && String(field).toLowerCase().trim() === normalized);
        };

        const matchesName = (item = {}) => {
            const name = item.name || '';
            return name.toLowerCase().includes(normalized) && normalized.length > 2;
        };

        const matchedPart = inventory.find(item => matchesCode(item) || matchesName(item));
        if (!matchedPart) {
            message.warning('No matching part found for that barcode/code.');
            setBarcodeScanValue('');
            return;
        }

        handleAddPart({ partId: matchedPart.id, quantity: 1 }, { keepModalOpen: true });
        setBarcodeScanValue('');
    };

    // ─── Edit Modal Logic ──────────────────────────────────────────────
    const openEditModal = (job) => {
        setEditingJob(job);
        setEditParts([...(job.parts || [])]);
        setEditServices([...(job.services || [])]);
        editForm.setFieldsValue({
            vehicleNo: job.vehicleNo,
            customerName: job.customerName,
            phone: job.phone,
            description: job.description, // Reverted from 'workDescription'
            status: job.status,
            workflowStage: normalizeWorkflowStage(job.workflowStage),
            commissionPercent: Number(job.commissionPercent || 0)
        });
        setIsEditModalVisible(true);
    };

    // If a notification requested navigation to a job, open it once jobs are loaded
    React.useEffect(() => {
        const pending = sessionStorage.getItem('navigateToJobId');
        if (pending && jobs && jobs.length > 0) {
            const job = jobs.find(j => String(j.id) === String(pending));
            if (job) {
                openEditModal(job);
                sessionStorage.removeItem('navigateToJobId');
            }
        }
    }, [jobs]);

    React.useEffect(() => {
        const openFlag = sessionStorage.getItem('openJobModal');
        if (openFlag === 'true') {
            setIsModalVisible(true);
            sessionStorage.removeItem('openJobModal');
        }
    }, []);

    const handleAddDeptTask = (jobId, dept, taskText, assigneeId) => {
        if (!taskText?.trim()) return message.error('Task description required');
        const staff = (userManagement || []).find(u => u.id === assigneeId);
        const newTask = {
            id: generateSafeId('TASK'),
            text: taskText.trim(),
            assigned_staff_id: assigneeId || null,
            assigned_staff_name: staff ? staff.name : null,
            status: 'pending',
            history: [{ status: 'pending', timestamp: dayjs().toISOString(), by: user?.name }]
        };
        const updated = (jobs || []).map(j => {
            if (j.id !== jobId) return j;
            const dt = { ...(j.departmentsTasks || {}) };
            if (!dt[dept]) dt[dept] = { tasks: [] };
            dt[dept].tasks = [...dt[dept].tasks, newTask];
            return { ...j, departmentsTasks: dt };
        });
        setJobs(updated);
        message.success('Task added to ' + dept);
    };

    const handleUpdateTaskStatus = async (jobId, dept, taskId, newStatus) => {
        let allDeptDone = false;
        let hasPending = false;
        let updatedJobSnapshot = null;

        const updatedJobs = (jobs || []).map((job) => {
            if (job.id !== jobId) return job;

            const departmentsTasks = { ...(job.departmentsTasks || {}) };
            const deptTasks = (departmentsTasks[dept]?.tasks || []).map((task) => {
                if (task.id !== taskId) return task;
                return {
                    ...task,
                    status: newStatus,
                    history: [...(task.history || []), { status: newStatus, timestamp: dayjs().toISOString(), by: user?.name }]
                };
            });

            departmentsTasks[dept] = {
                ...(departmentsTasks[dept] || {}),
                tasks: deptTasks,
                status: deptTasks.length > 0 && deptTasks.every((task) => task.status === 'completed') ? 'completed' : 'in_progress'
            };

            allDeptDone = departmentsTasks[dept].status === 'completed';
            hasPending = Object.keys(departmentsTasks).some((depKey) => {
                const taskList = departmentsTasks[depKey]?.tasks || [];
                return taskList.some((task) => task.status !== 'completed');
            });

            let workflowStage = normalizeWorkflowStage(job.workflowStage);
            if (newStatus === 'in_progress' || newStatus === 'completed') {
                workflowStage = promoteWorkflowStage(workflowStage, 'work_in_progress');
            }
            if (!hasPending) {
                workflowStage = promoteWorkflowStage(workflowStage, 'ready_to_deliver');
            }

            const billingStatus = !hasPending ? 'READY' : 'HOLD';

            const nextJob = {
                ...job,
                departmentsTasks,
                status: hasPending ? job.status : 'completed',
                completedAt: hasPending ? job.completedAt : (job.completedAt || dayjs().toISOString()),
                workflowStage,
                billingStatus,
                workflowHistory: appendStageHistory(job.workflowHistory, workflowStage, user?.name)
            };
            updatedJobSnapshot = nextJob;
            return nextJob;
        });

        setJobs(updatedJobs);
        message.success('Task status updated');

        if (!updatedJobSnapshot) return;

        if (!hasPending) {
            logActivity(`Job #JC-${String(jobId || '').padStart(3, '0')} fully completed (all departments).`);
            return;
        }

        if (allDeptDone) {
            const order = updatedJobSnapshot.departmentsInvolved || [];
            const otherDepts = order.filter((depName) => depName !== dept);
            const heads = (userManagement || []).filter((member) => (
                (member.department || '') &&
                otherDepts.map((value) => value.toLowerCase()).includes((member.department || '').toLowerCase()) &&
                (member.specific_post || '').toLowerCase().includes('head')
            ));

            heads.forEach(async (head) => {
                try {
                    const note = {
                        id: generateSafeId('NOTI'),
                        message: `Job #${jobId}: ${dept} finished and ready for ${head.department}.`,
                        timestamp: dayjs().toISOString(),
                        read: false
                    };
                    // Notification logic (Firebase removed, needs MongoDB notification API)
                    console.log(`[Notification] Job #${jobId}: ${dept} finished and ready for ${head.department}.`);
                    message.info(`Completed ${dept}! Notified ${head.name} (${head.department})`);
                    logActivity(`${dept} head was notified locally.`);
                } catch (err) {
                    console.error('Notification failed', err);
                }
            });

            if (heads.length === 0 && otherDepts.length > 0) {
                message.info(`Department ${dept} completed. No department heads found for: ${otherDepts.join(', ')}`);
            }
        }
    };

    const handleSaveEdit = async (values) => {
        if (!editingJob) return;

        // AI Auto-Correction Logic
        const refinedDescription = await processUserInput(values.description, lang);

        // Calculate and apply inventory differences for modified parts
        let currentInventory = [...inventory];
        let stockError = null;

        // 1. Temporarily 'return' all original parts from this job to available stock
        (editingJob.parts || []).forEach(oldPart => {
            const idx = currentInventory.findIndex(p => p.id === oldPart.partId);
            if (idx !== -1) {
                currentInventory[idx] = { ...currentInventory[idx], stock: currentInventory[idx].stock + oldPart.quantity };
            }
        });

        // 2. Try to 'deduct' all new parts from the adjusted stock
        editParts.forEach(newPart => {
            const idx = currentInventory.findIndex(p => p.id === newPart.partId);
            if (idx !== -1) {
                if (currentInventory[idx].stock < newPart.quantity) {
                    stockError = `Not enough stock for ${newPart.name} (Max available: ${currentInventory[idx].stock})`;
                }
                currentInventory[idx] = { ...currentInventory[idx], stock: currentInventory[idx].stock - newPart.quantity };
            }
        });

        if (stockError) {
            message.error(stockError);
            return; // Abort save if any part exceeds available stock
        }

        // Apply validated inventory changes
        setInventory(currentInventory);

        // Map assigned staff id -> name (if provided)
        let assigned_staff_id = values.assigned_staff_id || editingJob.assigned_staff_id || null;
        let assigned_staff_name = null;
        if (assigned_staff_id) {
            const staff = (userManagement || []).find(u => u.id === assigned_staff_id);
            assigned_staff_name = staff ? staff.name : (editingJob.assigned_staff_name || null);
        }

        const nextJob = {
            ...editingJob,
            vehicleNo: values.vehicleNo,
            customerName: values.customerName,
            phone: values.phone,
            jobIntakeId: values.jobIntakeId || editingJob.jobIntakeId || null,
            description: refinedDescription || values.description || '',
            status: values.status,
            workflowStage: normalizeWorkflowStage(values.workflowStage || editingJob.workflowStage),
            workflowHistory: appendStageHistory(
                editingJob.workflowHistory,
                normalizeWorkflowStage(values.workflowStage || editingJob.workflowStage),
                user?.name
            ),
            parts: editParts,
            services: editServices,
            commissionPercent: Number(values.commissionPercent || 0),
            assigned_staff_id,
            assigned_staff_name,
            updatedAt: dayjs().toISOString()
        };

        try {
            await databaseBridge.updateJobCard(nextJob);
            const updatedJobs = jobs.map(j => j.id === editingJob.id ? nextJob : j);
            setJobs(updatedJobs);
            logActivity(`Job #${editingJob.id} updated (Parts/Details modified)`);
            message.success(`Job #${editingJob.id} updated successfully!`);
            setIsEditModalVisible(false);
            setEditingJob(null);
            editForm.resetFields();
        } catch (err) {
            console.error('Failed to update job card:', err);
            message.error(lang === 'bn' ? 'জব কার্ড আপডেট করতে ব্যর্থ হয়েছে!' : 'Failed to update job card in database.');
        }
    };


    // Add service item inside edit modal
    const handleAddEditService = (serviceName) => {
        if (!serviceName?.trim()) return;
        const svc = (services || []).find(s => s.name.toLowerCase() === serviceName.toLowerCase());

        if (!svc) {
            // Auto-save new service
            const newSvc = {
                id: generateSafeId('SVC'),
                name: serviceName.trim(),
                basePrice: 0,
                companyRate: 0,
                category: 'General',
                createdAt: dayjs().toISOString()
            };
            setServices([...(services || []), newSvc]);
            message.info(`New service "${serviceName}" auto-saved to Services.`);
        }

        setEditServices(prev => [...prev, {
            id: generateSafeId('SVC-ENTRY'),
            name: serviceName.trim(),
            basePrice: svc?.basePrice || 0
        }]);
    };

    // Remove service item inside edit modal
    const handleRemoveEditService = (svcId) => {
        setEditServices(prev => prev.filter(s => s.id !== svcId));
    };

    // Add part inside edit modal (deferred stock deduction)
    const handleAddEditPart = () => {
        const partId = editPartForm.getFieldValue('editPartId');
        const qty = editPartForm.getFieldValue('editPartQty');

        if (!partId || !qty) {
            message.error('Please select a part and enter quantity.');
            return;
        }

        const part = inventory.find(p => p.id === partId);
        if (!part) return;

        // Calculate max allowed (current free stock + what was originally reserved for this job)
        // This is safe because actual deduction happens on Save
        const originallyInJob = (editingJob?.parts || []).find(p => p.partId === part.id)?.quantity || 0;
        const alreadyAddedToEdit = editParts.filter(p => p.partId === part.id).reduce((sum, p) => sum + p.quantity, 0);
        const maxAvailable = part.stock + originallyInJob - alreadyAddedToEdit;

        if (qty > maxAvailable) {
            message.error(`Insufficient stock! ${part.name} only has ${maxAvailable} available (including reserved).`);
            return;
        }

        setEditParts(prev => [...prev, {
            id: generateSafeId('PART-ENTRY'),
            partId: part.id,
            name: part.name,
            price: part.sellingPrice,
            quantity: qty
        }]);
        editPartForm.resetFields();
    };

    // Remove part inside edit modal (deferred stock restore)
    const handleRemoveEditPart = (partEntry) => {
        setEditParts(prev => prev.filter(p => p.id !== partEntry.id));
    };

    const serviceAutoOptions = (services || []).map(s => ({
        value: s.name,
        label: (
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{s.name}</span>
            </div>
        )
    }));

    // Customer & Company AutoComplete Options
    const unifiedClientOptions = React.useMemo(() => {
        const custOptions = (customers || []).map(c => ({
            value: c.name,
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{c.name} <Tag size="small" color="blue" style={{ marginLeft: 8 }}>Customer</Tag></span>
                    <span style={{ fontSize: 12, color: '#888' }}>{c.phone}</span>
                </div>
            ),
            clientData: { ...c, type: 'Customer' }
        }));

        const compOptions = (companies || []).map(c => ({
            value: c.companyName || c.name,
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{c.companyName || c.name} <Tag size="small" color="purple" style={{ marginLeft: 8 }}>Company</Tag></span>
                    <span style={{ fontSize: 12, color: '#888' }}>{c.phone}</span>
                </div>
            ),
            clientData: { ...c, type: 'Company', name: c.companyName || c.name }
        }));

        return [...custOptions, ...compOptions];
    }, [customers, companies]);

    const handleClientSelect = (value, option) => {
        const data = option.clientData;
        if (data) {
            setSelectedCustomerId(data.id || null);
            form.setFieldsValue({
                phone: data.phone || '',
                vehicleNo: data.vehicleNo || ''
            });
        }
    };

    const handleEditClientSelect = (value, option) => {
        const data = option.clientData;
        if (data) {
            editForm.setFieldsValue({
                phone: data.phone || '',
                vehicleNo: data.vehicleNo || ''
            });
        }
    };

    return (
        <div className="job-cards-container" style={{ padding: '20px', paddingBottom: '90px', fontFamily: '"Poppins", "Inter", sans-serif' }}>
            {printingWorkOrder && <PrintWorkOrder job={printingWorkOrder} lang={lang} />}
            <div className="no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <Title level={2} style={{ margin: 0, color: isDark ? '#FFFFFF' : '#000000', fontWeight: 900, letterSpacing: '2px' }}>
                            {mode === 'staff' ? t('staff_portal', lang) : t('active_job_cards', lang)}
                        </Title>
                        <Text style={{ color: isDark ? '#3B82F6' : '#1d4ed8', fontWeight: 800, fontSize: 11, letterSpacing: '1px' }}>
                            {t('management_board_msg', lang)}
                        </Text>
                    </div>
                    {mode !== 'staff' && canCreate ? (
                        <Button
                            size="large"
                            onClick={() => setIsModalVisible(true)}
                            style={{ background: '#3B82F6', border: 'none', color: '#FFF', fontWeight: 900, borderRadius: 0, letterSpacing: '1px' }}
                        >
                            {t('create_job_card', lang)}
                        </Button>
                    ) : null}
                </div>

                <Row gutter={[24, 24]}>
                    <Col xs={24} lg={18}>
                        <div className="glass-card" style={{ padding: 0, border: isDark ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid rgba(0,0,0,0.08)' }}>
                            <Table
                                columns={columns}
                                loading={loading}
                                dataSource={visibleJobs}
                                rowKey="id"
                                pagination={{ pageSize: 12 }}
                                showSorterTooltip={false}
                                size="middle"
                                scroll={{ x: 'max-content' }}
                                className="luxury-table ultra-contrast"
                            />
                        </div>
                    </Col>

                    {/* Corner Vertical Job Status Timeline Widget */}
                    <Col xs={24} lg={6}>
                        <div style={{ 
                            position: 'sticky', 
                            top: 20, 
                            background: isDark ? 'rgba(15, 23, 42, 0.6)' : '#ffffff', 
                            border: isDark ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid #e5e7eb', 
                            borderRadius: '8px', 
                            padding: '20px',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.05)' : '1px solid #f3f4f6', paddingBottom: '12px' }}>
                                <Wrench size={16} style={{ color: '#06b6d4' }} />
                                <Text style={{ fontWeight: 900, color: isDark ? '#fff' : '#000', fontSize: 13, letterSpacing: '0.5px' }}>
                                    LIVE PROGRESSION TIMELINE
                                </Text>
                            </div>

                            {activeTimelineJob ? (
                                <div>
                                    <div style={{ marginBottom: 16, background: isDark ? 'rgba(6, 182, 212, 0.1)' : '#f0f9ff', padding: '8px 12px', borderRadius: '4px', borderLeft: '3px solid #06b6d4' }}>
                                        <div style={{ fontSize: 11, fontWeight: 800, color: '#06b6d4' }}>ACTIVE TARGET</div>
                                        <div style={{ fontWeight: 900, color: isDark ? '#fff' : '#000', fontSize: 13 }}>{activeTimelineJob.vehicleNo}</div>
                                        <div style={{ fontSize: 11, color: isDark ? '#d1d5db' : '#4b5563' }}>{activeTimelineJob.customerName}</div>
                                    </div>

                                    {/* Pipeline Steps */}
                                    {(() => {
                                        const isFinished = activeTimelineJob.status === 'completed';
                                        const partsCount = activeTimelineJob.parts?.length || 0;
                                        const stageOrder = ['Inspection', 'Parts Waiting', 'In Progress', 'Finished'];
                                        let currentIdx = 0;
                                        if (isFinished) {
                                            currentIdx = 3;
                                        } else if (activeTimelineJob.workflowStage === 'work_in_progress') {
                                            currentIdx = 2;
                                        } else if (partsCount === 0 && activeTimelineJob.status === 'active') {
                                            currentIdx = 1; // Parts Waiting or Inspection
                                        } else {
                                            currentIdx = 2; // In Progress
                                        }

                                        return stageOrder.map((stepName, idx) => {
                                            const isDone = idx <= currentIdx;
                                            const isCurrent = idx === currentIdx;
                                            return (
                                                <div key={stepName} style={{ display: 'flex', gap: '12px', marginBottom: idx === 3 ? 0 : '16px', position: 'relative' }}>
                                                    {idx < 3 && (
                                                        <div style={{ 
                                                            position: 'absolute', 
                                                            left: '11px', 
                                                            top: '24px', 
                                                            bottom: '-4px', 
                                                            width: '2px', 
                                                            background: isDone ? '#06b6d4' : (isDark ? 'rgba(255,255,255,0.1)' : '#e5e7eb'),
                                                            zIndex: 1
                                                        }} />
                                                    )}
                                                    <div style={{ 
                                                        width: '24px', 
                                                        height: '24px', 
                                                        borderRadius: '50%', 
                                                        background: isCurrent ? '#06b6d4' : (isDone ? '#10b981' : (isDark ? 'rgba(255,255,255,0.05)' : '#f3f4f6')),
                                                        border: isCurrent ? '4px solid rgba(6, 182, 212, 0.3)' : 'none',
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        justifyContent: 'center',
                                                        color: isDone || isCurrent ? '#fff' : '#9ca3af',
                                                        fontWeight: 900,
                                                        fontSize: 11,
                                                        zIndex: 2
                                                    }}>
                                                        {isDone && !isCurrent ? '✓' : idx + 1}
                                                    </div>
                                                    <div style={{ flex: 1, paddingTop: '2px' }}>
                                                        <div style={{ 
                                                            fontWeight: isCurrent ? 800 : 600, 
                                                            color: isCurrent ? '#06b6d4' : (isDone ? (isDark ? '#e5e7eb' : '#1f2937') : '#9ca3af'),
                                                            fontSize: 12 
                                                        }}>
                                                            {stepName}
                                                        </div>
                                                        {isCurrent && (
                                                            <div style={{ fontSize: 10, color: isDark ? '#9ca3af' : '#6b7280', marginTop: 2 }}>
                                                                Active Operational State
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        });
                                    })()}
                                </div>
                            ) : (
                                <div style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', padding: '20px 0' }}>
                                    Select any Job record to inspect stage progression.
                                </div>
                            )}
                        </div>
                    </Col>
                </Row>

                {/* Fixed Sticky Action Bar */}
                <div style={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    zIndex: 999,
                    background: isDark ? 'rgba(15, 23, 42, 0.92)' : 'rgba(255, 255, 255, 0.92)',
                    backdropFilter: 'blur(16px)',
                    borderTop: isDark ? '1px solid rgba(6, 182, 212, 0.3)' : '1px solid #06b6d4',
                    padding: '12px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{ background: '#06b6d4', color: '#000', fontWeight: 900, padding: '4px 8px', fontSize: 10, borderRadius: '4px' }}>
                            STICKY ACTION PANEL
                        </div>
                        {activeTimelineJob ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontWeight: 900, color: isDark ? '#fff' : '#000', fontSize: 13 }}>{activeTimelineJob.vehicleNo}</span>
                                <span style={{ color: isDark ? '#9ca3af' : '#6b7280', fontSize: 12 }}>|</span>
                                <span style={{ color: isDark ? '#e5e7eb' : '#374151', fontSize: 12, fontWeight: 600 }}>{activeTimelineJob.customerName}</span>
                            </div>
                        ) : (
                            <Text type="secondary" style={{ fontSize: 12 }}>No active record selected</Text>
                        )}
                    </div>

                    <Space size="middle">
                        <Button 
                            type="primary" 
                            disabled={!activeTimelineJob || activeTimelineJob.status === 'completed'}
                            onClick={() => {
                                if (activeTimelineJob) openEditModal(activeTimelineJob);
                            }}
                            style={{ background: '#0284c7', borderColor: '#0284c7', fontWeight: 800, fontSize: 12 }}
                        >
                            Add New Service
                        </Button>
                        <Button 
                            type="primary" 
                            disabled={!activeTimelineJob || activeTimelineJob.status === 'completed'}
                            onClick={() => {
                                if (activeTimelineJob) {
                                    setSelectedJobId(activeTimelineJob.id);
                                    setIsPartModalVisible(true);
                                }
                            }}
                            style={{ background: '#722ed1', borderColor: '#722ed1', fontWeight: 800, fontSize: 12 }}
                        >
                            Request Parts
                        </Button>
                        <Button 
                            type="primary"
                            disabled={!activeTimelineJob}
                            onClick={() => {
                                if (!activeTimelineJob) return;
                                if (activeTimelineJob.status === 'completed') {
                                    handleGenerateBill(activeTimelineJob);
                                } else {
                                    handleCompleteJob(activeTimelineJob.id);
                                }
                            }}
                            style={{ background: activeTimelineJob?.status === 'completed' ? '#d97706' : '#10b981', borderColor: activeTimelineJob?.status === 'completed' ? '#d97706' : '#10b981', fontWeight: 900, fontSize: 12 }}
                        >
                            {activeTimelineJob?.status === 'completed' ? 'Generate Bill' : 'Finalize Job'}
                        </Button>
                    </Space>
                </div>

                {/* Create Job Card Modal */}
                <Modal
                    title={
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: isDark ? '1px solid rgba(6, 182, 212, 0.2)' : '1px solid #e5e7eb', paddingBottom: '12px' }}>
                            <div style={{ background: 'rgba(6, 182, 212, 0.1)', padding: '8px', borderRadius: '8px', color: '#06b6d4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Wrench size={20} />
                            </div>
                            <span style={{ fontWeight: 900, letterSpacing: '1px', fontSize: 18, color: isDark ? '#fff' : '#000' }}>
                                {t('open_new_job_card', lang)}
                            </span>
                        </div>
                    }
                    open={isModalVisible}
                    onCancel={() => {
                        setIsModalVisible(false);
                        form.resetFields();
                    }}
                    footer={null}
                    destroyOnClose
                    className="luxury-modal"
                    width={720}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleCreateJob}
                        style={{ marginTop: 16 }}
                    >
                        <Form.Item name="jobIntakeId" hidden><Input /></Form.Item>

                        {/* Section 1: Vehicle & Client Info */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Car size={14} style={{ color: '#06b6d4' }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', letterSpacing: '0.2px' }}>
                                    Vehicle & client info
                                </span>
                                <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(6, 182, 212, 0.15)' : '#e5e7eb' }} />
                            </div>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="vehicleNo"
                                        label={<span style={{ fontWeight: 700, color: isDark ? '#d1d5db' : '#374151' }}>{t('vehicle_number', lang)}</span>}
                                        rules={[{ required: true, message: lang === 'bn' ? 'অনুগ্রহ করে গাড়ি নম্বর লিখুন' : 'Please enter the vehicle number' }]}
                                    >
                                        <Input 
                                            prefix={<Car size={16} style={{ color: '#06b6d4', marginRight: 6 }} />} 
                                            placeholder="e.g., DHA-11-2034" 
                                            size="large" 
                                            disabled={!!form.getFieldValue('jobIntakeId')}
                                            style={{ borderRadius: '8px', borderColor: isDark ? 'rgba(6, 182, 212, 0.3)' : '#cbd5e1', boxShadow: isDark ? '0 0 10px rgba(6, 182, 212, 0.05)' : 'none' }}
                                        />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        name="customerName"
                                        label={<span style={{ fontWeight: 700, color: isDark ? '#d1d5db' : '#374151' }}>{t('customer_company_name', lang)}</span>}
                                        rules={[{ required: true, message: lang === 'bn' ? 'অনুগ্রহ করে নাম লিখুন বা নির্বাচন করুন' : 'Please enter or select a name' }]}
                                    >
                                        <AutoComplete
                                            options={unifiedClientOptions}
                                            onSelect={handleClientSelect}
                                            disabled={!!form.getFieldValue('jobIntakeId')}
                                            filterOption={(inputValue, option) =>
                                                option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                            }
                                        >
                                            <Input 
                                                prefix={<Users size={16} style={{ color: '#06b6d4', marginRight: 6 }} />} 
                                                placeholder={lang === 'bn' ? 'কাস্টমার বা কোম্পানি খুঁজুন...' : "Search Customer or Company..."} 
                                                size="large"
                                                style={{ borderRadius: '8px', borderColor: isDark ? 'rgba(6, 182, 212, 0.3)' : '#cbd5e1', boxShadow: isDark ? '0 0 10px rgba(6, 182, 212, 0.05)' : 'none' }}
                                            />
                                        </AutoComplete>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="phone"
                                        label={<span style={{ fontWeight: 700, color: isDark ? '#d1d5db' : '#374151' }}>{t('phone_number', lang)}</span>}
                                        rules={[
                                            { required: true, message: lang === 'bn' ? 'অনুগ্রহ করে ফোন নম্বর লিখুন' : 'Please enter phone number' },
                                            { pattern: /^[0-9+\-\s]+$/, message: lang === 'bn' ? 'সঠিক ফোন নম্বর লিখুন' : 'Please enter a valid phone number' }
                                        ]}
                                    >
                                        <Input 
                                            prefix={<Phone size={16} style={{ color: '#06b6d4', marginRight: 6 }} />} 
                                            placeholder="e.g., 01700-000000" 
                                            size="large" 
                                            disabled={!!form.getFieldValue('jobIntakeId')}
                                            style={{ borderRadius: '8px', borderColor: isDark ? 'rgba(6, 182, 212, 0.3)' : '#cbd5e1', boxShadow: isDark ? '0 0 10px rgba(6, 182, 212, 0.05)' : 'none' }}
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Section 2: Internal Assignment */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <Settings size={14} style={{ color: '#06b6d4' }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', letterSpacing: '0.2px' }}>
                                    Internal assignment
                                </span>
                                <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(6, 182, 212, 0.15)' : '#e5e7eb' }} />
                            </div>

                            <Row gutter={16}>
                                {canAssign && (
                                    <Col span={12}>
                                        <Form.Item 
                                            name="assigned_staff_id" 
                                            label={<span style={{ fontWeight: 700, color: isDark ? '#d1d5db' : '#374151' }}><UserCheck size={14} style={{ color: '#06b6d4', marginRight: 4, verticalAlign: 'middle' }} /> {t('assign_mechanic', lang)}</span>}
                                        >
                                            <Select 
                                                placeholder={lang === 'bn' ? 'মেকানিক নির্বাচন করুন' : "Select staff to assign"} 
                                                allowClear 
                                                size="large"
                                            >
                                                {(assignableStaff || []).map(staff => (
                                                    <Option key={staff.id} value={staff.id}>
                                                        {staff.name}{staff.department ? ` — ${staff.department}` : ''}
                                                    </Option>
                                                ))}
                                            </Select>
                                        </Form.Item>
                                    </Col>
                                )}
                                <Col span={canAssign ? 12 : 24}>
                                    <Form.Item 
                                        name="commissionPercent" 
                                        label={<span style={{ fontWeight: 700, color: isDark ? '#d1d5db' : '#374151' }}><DollarSign size={14} style={{ color: '#06b6d4', marginRight: 4, verticalAlign: 'middle' }} /> {t('commission_percent', lang)}</span>} 
                                        initialValue={0}
                                    >
                                        <InputNumber min={0} max={100} size="large" style={{ width: '100%', borderRadius: '8px' }} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col span={24}>
                                    <Form.Item 
                                        name="departmentsInvolved" 
                                        label={<span style={{ fontWeight: 700, color: isDark ? '#d1d5db' : '#374151' }}>{t('departments_involved', lang)}</span>}
                                    >
                                        <Select mode="multiple" size="large" placeholder={t('select_dept_msg', lang)} style={{ width: '100%' }}>
                                            {(departments || []).map(d => <Option key={d} value={d}>{d}</Option>)}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </div>

                        {/* Section 3: Problem Reported */}
                        <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                                <FileText size={14} style={{ color: '#06b6d4' }} />
                                <span style={{ fontSize: 12, fontWeight: 600, color: '#06b6d4', letterSpacing: '0.2px' }}>
                                    Problem reported
                                </span>
                                <div style={{ flex: 1, height: '1px', background: isDark ? 'rgba(6, 182, 212, 0.15)' : '#e5e7eb' }} />
                            </div>

                            <Form.Item
                                name="description"
                                label={<span style={{ fontWeight: 700, color: isDark ? '#d1d5db' : '#374151' }}>{t('work_description_label', lang)}</span>}
                                rules={[{ required: false }]}
                            >
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                    <div style={{ flex: 1 }}>
                                        <SmartVoiceInput 
                                            isTextArea 
                                            rows={3} 
                                            placeholder={lang === 'bn' ? 'কাজের বিবরণ বা সমস্যা লিখুন...' : "Describe the vehicle's problems and requested repairs..."} 
                                        />
                                    </div>
                                    <Tooltip title={lang === 'bn' ? 'এআই দিয়ে সংশোধন করুন' : 'Refine with AI'}>
                                        <Button 
                                            icon={<Sparkles size={14} />} 
                                            onClick={async () => {
                                                const val = form.getFieldValue('description');
                                                if (val) {
                                                    const refined = await processUserInput(val, lang);
                                                    form.setFieldsValue({ description: refined });
                                                }
                                            }}
                                            style={{ 
                                                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(59,130,246,0.2) 100%)', 
                                                border: '1px solid rgba(59, 130, 246, 0.4)', 
                                                color: '#3B82F6', 
                                                height: '40px',
                                                borderRadius: '8px' 
                                            }}
                                        />
                                    </Tooltip>
                                </div>
                            </Form.Item>
                        </div>

                        {/* Centered Primary Action Buttons */}
                        <div style={{ marginTop: 32, marginBottom: 8, display: 'flex', justifyContent: 'center', gap: '16px' }}>
                            <Button 
                                onClick={() => { setIsModalVisible(false); form.resetFields(); }}
                                style={{ 
                                    background: 'transparent', 
                                    border: '1px solid #06b6d4', 
                                    color: isDark ? '#22d3ee' : '#0284c7', 
                                    fontWeight: 800, 
                                    borderRadius: '8px',
                                    height: '44px',
                                    padding: '0 28px',
                                    fontSize: 14
                                }}
                            >
                                {t('cancel', lang)}
                            </Button>
                            <Button 
                                type="primary" 
                                htmlType="submit"
                                style={{ 
                                    background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 100%)', 
                                    border: 'none', 
                                    color: '#ffffff', 
                                    fontWeight: 600, 
                                    borderRadius: '8px',
                                    height: '44px',
                                    padding: '0 36px',
                                    fontSize: 14,
                                    boxShadow: '0 4px 14px rgba(6, 182, 212, 0.4)'
                                }}
                            >
                                {t('open_new_job_card', lang)}
                            </Button>
                        </div>
                    </Form>
                </Modal>

                {/* Add Part to Job Modal */}
                  <Modal
                      title={<span style={{ fontWeight: 900, letterSpacing: '2px' }}>{t('add_parts', lang)} #JC-{String(selectedJobId || '').padStart(3, '0')}</span>}
                      open={isPartModalVisible}
                      onCancel={() => {
                          setIsPartModalVisible(false);
                          partForm.resetFields();
                          setSelectedJobId(null);
                          setBarcodeScanValue('');
                      }}
                    footer={null}
                    className="luxury-modal"
                    destroyOnClose
                >
                      <Form
                          form={partForm}
                          layout="vertical"
                          onFinish={handleAddPart}
                          style={{ marginTop: 16 }}
                      >
                          <Form.Item label={t('scan_barcode', lang)}>
                              <Input
                                  ref={barcodeScannerRef}
                                  placeholder="Scan barcode and press Enter"
                                  size="large"
                                  allowClear
                                  value={barcodeScanValue}
                                  onChange={(e) => setBarcodeScanValue(e.target.value)}
                                  onPressEnter={() => handleBarcodeScan(barcodeScanValue)}
                              />
                          </Form.Item>
                          <Form.Item
                              name="partId"
                              label={t('select_from_inventory', lang)}
                              rules={[{ required: true, message: lang === 'bn' ? 'অনুগ্রহ করে পার্ট নির্বাচন করুন' : 'Please select a part' }]}
                          >
                            <Select
                                showSearch
                                placeholder={lang === 'bn' ? 'পার্ট নাম বা পার্ট নম্বর দিয়ে খুঁজুন (e.g. QA-L-999)' : "Search by Part Name or Part Number (e.g. QA-L-999)"}
                                size="large"
                                optionFilterProp="label"
                                optionLabelProp="label"
                                dropdownStyle={{ zIndex: 1050 }}
                                popupClassName="high-z-dropdown"
                                filterOption={(input, option) => {
                                    const searchContext = String(option?.['data-search'] ?? '').toLowerCase();
                                    return searchContext.includes(input.toLowerCase());
                                }}
                                notFoundContent={
                                    <div style={{ padding: '16px', textAlign: 'center', color: '#888', fontWeight: 600 }}>
                                        {loading ? (lang === 'bn' ? 'ইনভেন্টরি লোড হচ্ছে...' : 'Loading Inventory...') : (lang === 'bn' ? 'কোনো পার্টস পাওয়া যায়নি' : 'No Parts Found in Inventory')}
                                    </div>
                                }
                            >
                                {(inventory || [])
                                    .filter(item => {
                                        const qty = item.quantity !== undefined ? item.quantity : (item.stock || 0);
                                        return qty >= 1;
                                    })
                                    .map(item => {
                                        const itemName = item.partName || item.name || 'Unnamed Part';
                                        const partNo = item.partNumber || '';
                                        const qty = item.quantity !== undefined ? item.quantity : (item.stock || 0);
                                        const searchStr = `${itemName} ${partNo}`.toLowerCase();
                                        
                                        return (
                                            <Option 
                                                key={item.id} 
                                                value={item.id} 
                                                label={`${itemName} ${partNo ? `(${partNo})` : ''}`}
                                                data-search={searchStr}
                                            >
                                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                        <Avatar shape="square" size="small" src={optimizeCloudinaryUrl(item.imageUrl)} />
                                                        <span style={{ fontWeight: 600 }}>{itemName}</span>
                                                        {partNo && (
                                                            <Tag color="cyan" style={{ fontSize: 10, margin: 0, padding: '0 4px' }}>{partNo}</Tag>
                                                        )}
                                                    </div>
                                                    <span style={{ color: '#10b981', fontWeight: 700, fontSize: 12 }}>
                                                        Stock: {qty}
                                                    </span>
                                                </div>
                                            </Option>
                                        );
                                    })}
                            </Select>
                        </Form.Item>

                        <Form.Item
                            name="quantity"
                            label={t('quantity_used', lang)}
                            rules={[{ required: true, message: lang === 'bn' ? 'অনুগ্রহ করে পরিমাণ লিখুন' : 'Please enter quantity' }]}
                        >
                            <InputNumber min={1} size="large" style={{ width: '100%', borderRadius: '8px' }} />
                        </Form.Item>

                        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                            <Space>
                                <Button 
                                    onClick={() => { setIsPartModalVisible(false); partForm.resetFields(); }}
                                    style={{ borderRadius: '8px', fontWeight: 600 }}
                                >
                                    {lang === 'bn' ? 'বাতিল' : 'Cancel'}
                                </Button>
                                <Button 
                                    type="primary" 
                                    htmlType="submit" 
                                    style={{ backgroundColor: '#722ed1', borderColor: '#722ed1', borderRadius: '8px', fontWeight: 800 }}
                                >
                                    {t('deduct_stock_btn', lang)}
                                </Button>
                            </Space>
                        </Form.Item>
                    </Form>
                </Modal>

                {/* ── Edit Job Card Modal ──────────────────────────────── */}
                <Modal
                    title={editingJob ? `EDIT JOB CARD #JC-${String(editingJob.id).padStart(3, '0')}` : 'CREATE NEW JOB CARD'}
                    open={isEditModalVisible}
                    onCancel={() => setIsEditModalVisible(false)}
                    footer={null}
                    width={850}
                    className="luxury-modal"
                >
                    {/* Per-department task panels */}
                    {editingJob && (editingJob.departmentsInvolved || []).length > 0 && (
                        <div style={{ marginBottom: 12 }}>
                            <Divider orientation="left">Department Tasks</Divider>
                            {(editingJob.departmentsInvolved || []).map(dept => (
                                <Card key={dept} size="small" style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <div style={{ fontWeight: 700 }}>{dept}</div>
                                        <div style={{ fontSize: 12, color: '#888' }}>
                                            {(editingJob.departmentsTasks && editingJob.departmentsTasks[dept]) ? `${editingJob.departmentsTasks[dept].tasks.length} tasks` : '0 tasks'}
                                        </div>
                                    </div>
                                    {/* Tasks list */}
                                    <div style={{ marginBottom: 8 }}>
                                        {((editingJob.departmentsTasks && editingJob.departmentsTasks[dept] && editingJob.departmentsTasks[dept].tasks) || []).map(t => (
                                            <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                                                <div>
                                                    <div style={{ fontWeight: 600 }}>{t.text}</div>
                                                    <div style={{ fontSize: 12, color: '#666' }}>{t.assigned_staff_name || 'Unassigned'}</div>
                                                    <div style={{ fontSize: 11, color: '#999' }}>Last: {t.history && t.history.length ? dayjs(t.history[t.history.length - 1].timestamp).format('DD MMM, hh:mm A') : '-'}</div>
                                                </div>
                                                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                                                    <Select size="small" value={t.status} onChange={(val) => {
                                                        // allow only assigned staff or department head of THIS department (or manager/admin)
                                                        const isAssigned = (t.assigned_staff_id === user?.id);
                                                        const isThisDeptHead = (user?.department && (user?.department === dept) && ((user?.specific_post || '').toLowerCase().includes('head')));
                                                        const allowed = isAssigned || isThisDeptHead || isManager || isAdmin;
                                                        if (!allowed) return message.error('Not allowed to update this task');
                                                        handleUpdateTaskStatus(editingJob.id, dept, t.id, val);
                                                    }} style={{ width: 140 }}>
                                                        <Option value="pending">Pending</Option>
                                                        <Option value="in_progress">Work in Progress</Option>
                                                        <Option value="completed">Completed</Option>
                                                    </Select>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Add task form */}
                                    <DeptTaskForm dept={dept} jobId={editingJob.id} addTask={handleAddDeptTask} staffList={(userManagement || []).filter(u => u.department === dept)} />
                                </Card>
                            ))}
                        </div>
                    )}

                        {intakes?.length > 0 && (
                            <div style={{ marginBottom: 24, padding: 15, background: isDark ? 'rgba(59,130,246,0.05)' : 'rgba(29,78,216,0.05)', border: isDark ? '1px solid rgba(59,130,246,0.2)' : '1px solid rgba(29,78,216,0.2)', borderRadius: 4 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <Text style={{ color: isDark ? '#3B82F6' : '#1d4ed8', fontWeight: 600, fontSize: 12 }}>{t('pending_mechanic_requests', lang)} ({intakes.length})</Text>
                                    <Button size="small" type="link" onClick={() => setIsRequestPickerOpen(!isRequestPickerOpen)} style={{ color: isDark ? '#3B82F6' : '#1d4ed8' }}>
                                        {isRequestPickerOpen ? (lang === 'bn' ? 'লিস্ট লুকান' : 'Hide list') : (lang === 'bn' ? 'লিস্ট দেখুন' : 'View list')}
                                    </Button>
                                </div>
                                {isRequestPickerOpen && (
                                    <List
                                        size="small"
                                        style={{ marginTop: 10 }}
                                        dataSource={intakes}
                                        renderItem={item => (
                                            <List.Item 
                                                style={{ cursor: 'pointer', borderBottom: '1px solid rgba(255,255,255,0.05)' }}
                                                onClick={() => handleSelectIntake(item)}
                                            >
                                                <Space justify="space-between" style={{ width: '100%' }}>
                                                    <Space>
                                                        <Tag color="blue" style={{ borderRadius: 0 }}>{item.vehicleNo}</Tag>
                                                        <Text style={{ color: isDark ? '#FFF' : '#000' }}>{item.customerName}</Text>
                                                        <Text type="secondary" style={{ fontSize: 11 }}>[{item.items?.length || 0} items]</Text>
                                                    </Space>
                                                    <Button size="small" type="text" style={{ color: isDark ? '#3B82F6' : '#1d4ed8', fontSize: 10, fontWeight: 600 }}>{t('import', lang)}</Button>
                                                </Space>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </div>
                        )}

                        <Form form={editForm} layout="vertical" onFinish={handleSaveEdit}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="jobIntakeId" hidden><Input /></Form.Item>
                                <Form.Item name="vehicleNo" label="Vehicle Number" rules={[{ required: true }]} tooltip="Auto-filled from Intake">
                                    <SmartVoiceInput placeholder="e.g. DHA-11-2034" data-ai-clean="false" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="customerName" label="Customer / Company Name" rules={[{ required: true }]} tooltip="Auto-filled from Intake">
                                    <AutoComplete
                                        options={unifiedClientOptions}
                                        onSelect={handleClientSelect}
                                        filterOption={(inputValue, option) =>
                                            option.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
                                        }
                                    >
                                        <SmartVoiceInput placeholder="Search Customer or Company..." />
                                    </AutoComplete>
                                </Form.Item>
                            </Col>
                        </Row>
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]} tooltip="Auto-filled from Intake">
                                    <SmartVoiceInput placeholder="e.g. 01700-000000" data-ai-clean="false" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="status" label="Status" rules={[{ required: true }]}>
                                    <Select>
                                        <Option value="active">🔧 In progress</Option>
                                        <Option value="completed">✅ Completed</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                        {canAssign && (
                            <Form.Item name="assigned_staff_id" label="Assign To">
                                <Select placeholder="Select staff to assign" allowClear>
                                    {(assignableStaff || []).map(s => (
                                        <Option key={s.id} value={s.id}>{s.name} {s.department ? `— ${s.department}` : ''}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        )}
                        <Form.Item name="commissionPercent" label="Commission %">
                            <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                        <Form.Item name="description" label={<span style={{ fontWeight: 600, fontSize: 11, color: '#AAA' }}>{t('work_description_label', lang)}</span>}>

                            <div style={{ display: 'flex', gap: '4px', alignItems: 'flex-start' }}>
                                <div style={{ flex: 1 }}>
                                    <SmartVoiceInput isTextArea rows={4} placeholder={lang === 'bn' ? 'কাজের বিবরণ বা সমস্যা লিখুন...' : 'Enter work description or problem reported...'} />
                                </div>
                                <Tooltip title={lang === 'bn' ? 'এআই দিয়ে সংশোধন করুন' : 'Refine with AI'}>
                                    <Button 
                                        icon={<Sparkles size={14} />} 
                                        onClick={async () => {
                                            const val = editForm.getFieldValue('description');
                                            if (val) {
                                                const refined = await processUserInput(val, lang);
                                                editForm.setFieldsValue({ description: refined });
                                            }

                                        }}
                                        style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3B82F6', height: '40px' }}
                                    />
                                </Tooltip>
                            </div>
                        </Form.Item>

                        <Divider orientation="left" style={{ fontSize: 13, marginBottom: 8 }}>🔧 Services</Divider>
                        {/* Existing services list */}
                        {editServices.length > 0 ? (
                            <div style={{ marginBottom: 12 }}>
                                {editServices.map(s => (
                                    <Tag key={s.id} closable onClose={() => handleRemoveEditService(s.id)}
                                        style={{ marginBottom: 4, padding: '4px 10px', fontSize: 12 }} color="blue">
                                        {s.name}
                                    </Tag>
                                ))}
                            </div>
                        ) : (
                            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>No services added yet.</div>
                        )}
                        {/* Add service AutoComplete */}
                        <AutoComplete
                            options={serviceAutoOptions}
                            onSelect={handleAddEditService}
                            placeholder="Type or select a service to add..."
                            style={{ width: '100%', marginBottom: 16 }}
                            allowClear
                        />

                        <Divider orientation="left" style={{ fontSize: 13, marginBottom: 8 }}>📦 Parts Used</Divider>
                        {editParts.length > 0 ? (
                            <Table
                                dataSource={editParts} rowKey="id" size="small" pagination={false}
                                style={{ marginBottom: 12 }}
                                columns={[
                                    { title: 'Part', dataIndex: 'name' },
                                    { title: 'Qty', dataIndex: 'quantity', width: 60 },
                                    {
                                        title: '', width: 40,
                                        render: (_, r) => (
                                            <Popconfirm title="Remove this part? Stock will be restored." onConfirm={() => handleRemoveEditPart(r)} okText="Remove" cancelText="No">
                                                <Button size="small" danger type="text" />
                                            </Popconfirm>
                                        )
                                    }
                                ]}
                            />
                        ) : (
                            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 8 }}>No parts added yet.</div>
                        )}
                        {/* Add part inline (No layout="inline" Form to prevent bubbling) */}
                        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                            <Form form={editPartForm} layout="inline" style={{ flex: 1, display: 'flex' }}>
                                <Form.Item name="editPartId" style={{ flex: 1, margin: 0 }}>
                                    <Select showSearch optionFilterProp="children" placeholder="Select part" size="small">
                                        {(inventory || []).filter(Boolean).map(p => (
                                            <Option key={p.id} value={p.id} disabled={p.stock === 0}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                    <span>{p.partName || p.name}</span>
                                                    <span style={{ color: '#888', marginLeft: 8 }}>৳{p.sellingPrice || 0}</span>
                                                </div>
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                                <Form.Item name="editPartQty" style={{ margin: '0 8px 0 0' }}>
                                    <InputNumber min={1} placeholder="Qty" size="small" style={{ width: 70 }} />
                                </Form.Item>
                            </Form>
                            <Button type="dashed" size="small" onClick={handleAddEditPart} htmlType="button">
                                Add Part
                            </Button>
                            <Tooltip title={lang === 'bn' ? 'পার্ট নাম সংশোধন করুন' : 'Fix Part Name Grammar'}>
                                <Button 
                                    icon={<Sparkles size={12} />} 
                                    size="small"
                                    onClick={async () => {
                                        const partId = editPartForm.getFieldValue('editPartId');
                                        // This is tricky because it's a select. 
                                        // But if they typed a new part name in the search, we can refine it.
                                        // However, Select's search value isn't easily accessible via form.
                                        // Let's just add it to the services AutoComplete above.
                                    }}
                                    style={{ background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.3)', color: '#3B82F6' }}
                                />
                            </Tooltip>
                        </div>

                        <Divider style={{ margin: '8px 0' }} />

                        {/* Info banner about status */}
                        <div style={{
                            background: editForm.getFieldValue('status') === 'completed' ? '#f6ffed' : '#e6f7ff',
                            border: `1px solid ${editForm.getFieldValue('status') === 'completed' ? '#b7eb8f' : '#91d5ff'}`,
                            borderRadius: 6, padding: '6px 12px', marginBottom: 16, fontSize: 12,
                            color: editForm.getFieldValue('status') === 'completed' ? '#389e0d' : '#096dd9'
                        }}>
                            {editForm.getFieldValue('status') === 'completed'
                                ? '✅ Status: Completed — Generate Bill button will be enabled after saving.'
                                : '🔧 Status: In progress — Change to Completed to enable billing.'}
                        </div>

                        <Button 
                            type="primary" 
                            htmlType="submit" 
                            block 
                            size="large"
                            style={{ background: '#3B82F6', border: 'none', color: '#FFF', fontWeight: 600, borderRadius: 0, marginTop: 20 }}
                        >
                            {t('save_changes', lang)}
                        </Button>
                    </Form>
                </Modal>

            </div>
        </div>
    );
};

export default JobCardsPage;

// Small helper component for adding a department task
const DeptTaskForm = ({ dept, jobId, addTask, staffList }) => {
    const [text, setText] = React.useState('');
    const [assignee, setAssignee] = React.useState(null);
    return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: '10px' }}>
            <Input 
                placeholder={`Add task for ${dept}`} 
                value={text} 
                onChange={e => setText(e.target.value)} 
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF' }}
            />
            <Select 
                style={{ width: 220 }} 
                allowClear 
                placeholder="Assignee" 
                value={assignee} 
                onChange={v => setAssignee(v)}
                className="glass-select"
            >
                {(staffList || []).map(s => <Option key={s.id} value={s.id}>{s.name}{s.specific_post ? ` — ${s.specific_post}` : ''}</Option>)}
            </Select>
            <Button 
                onClick={() => { addTask(jobId, dept, text, assignee); setText(''); setAssignee(null); }}
                style={{ background: '#3B82F6', border: 'none', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
            >
                Add
            </Button>
        </div>
    );
};






