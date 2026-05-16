// v1.5.1 - Final Anti-Gravity Alignment (Hard-Locked 1-Page Layout)
import React from 'react';
import { createPortal } from 'react-dom';
import {
    Card, Table, Button, Modal, Form, Input, Select, Tag, Space,
    Typography, Row, Col, Statistic, message, Badge, Tooltip, Alert, Divider, Descriptions, List, AutoComplete
} from 'antd';
import { Sparkles, Mic, MicOff } from 'lucide-react';
import databaseBridge from './services/databaseBridge';
import { useAuth } from './contexts/AuthContext';
import { useGlobalState } from './contexts/GlobalStateContext';
import { t } from './utils/translations';
import { syncToLocalStorage, getFromLocalStorage, formatCurrency } from './utils/helpers';
import dayjs from 'dayjs';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import downloadElementAsPdf from './utils/domPdf';
import { buildShareableDocumentLink, createBillingWhatsAppMessage, openWhatsAppShare } from './utils/whatsAppShare';
import { enhanceAutomotiveText, processUserInput } from './services/aiServiceV2';
import SmartVoiceInput from './components/SmartVoiceInput';
import { professionalPrintTranslate } from './utils/translationMiddleware';
import { bufferedPrint } from './utils/printAssistant';
import toWords from './utils/numberToWords';
import SignatureField from './components/SignatureField';
import LuxuryCarWatermarkSVG from './components/LuxuryCarWatermarkSVG';
// Global Print Assistant active via App.jsx

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Print Quotation Component (Engineered for Zero-Margin & Hard 1-Page Lock) 
const PrintQuotation = ({ quotation, lang }) => {
    if (!quotation) return null;
    const items = Array.isArray(quotation.items) ? quotation.items : [];

    const subtotal = items.reduce((acc, item) => {
        const itemPrice = Number(item.unitPrice || item.price || 0);
        return acc + (itemPrice * (Number(item.quantity) || 1));
    }, 0);

    const vatAmount = Math.round(subtotal * 0.05);
    const netPayable = subtotal + vatAmount;
    const headerColor = quotation.billingEntity === 'Muntaha Motors' ? '#8b0000' : '#1f3b5b';

    return createPortal(
        <div className="alive-print-area">
            {/* Professional Luxury Vector Watermark Engine - Native SVG Implementation */}
            <LuxuryCarWatermarkSVG />


            {/* Self-Healing Anti-Gravity Engine Active */}
            <BrandedDocumentHeader
                title={t('quotation', lang)}
                subtitle="Mamun Automobiles // Premium service quote"
                meta={[
                    { label: 'Date', value: dayjs(quotation.date).format('DD MMM YYYY') },
                    { label: 'Quote ID', value: quotation.id || 'New' },
                    { label: 'Vehicle No', value: quotation.vehicleNo || 'N/A' }
                ]}
                lang={lang}
            />

            <div style={{ marginTop: 15, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}>
                    <div style={{ width: '48%' }}>
                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Client Details</Text>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{quotation.clientName}</div>
                        <div style={{ fontSize: 18, color: '#1e293b', fontWeight: 500 }}>{quotation.clientPhone}</div>
                    </div>
                    <div style={{ width: '48%', textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Vehicle Info</Text>
                        <div style={{ fontSize: 28, fontWeight: 600, color: '#0f172a' }}>{quotation.vehicleNo}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Verified Registration</div>
                    </div>
                </div>

                <style>{`
                    .premium-print-table {
                        border-collapse: collapse !important;
                        border-spacing: 0 !important;
                        border: 3px double #a1a1a1 !important;
                        width: 100% !important;
                        margin-bottom: 25px !important;
                        table-layout: fixed !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .premium-print-table th, .premium-print-table td {
                        border: 3px double #a1a1a1 !important;
                        color: #0f172a !important;
                        word-wrap: break-word !important;
                    }
                    .premium-print-table th {
                        background-color: #f1f5f9 !important;
                        color: #003399 !important;
                        font-weight: 600 !important;
                        font-size: 13px !important;
                        letter-spacing: 0.5px !important;
                        padding: 10px 12px !important;
                    }
                `}</style>
                <table className="premium-print-table">
                    <thead>
                        <tr>
                            <th style={{ width: '40px', textAlign: 'center' }}>#</th>
                            <th style={{ textAlign: 'left' }}>Description of Work / Parts</th>
                            <th style={{ textAlign: 'right', width: '60px' }}>Qty</th>
                            <th style={{ textAlign: 'right', width: '90px' }}>Rate</th>
                            <th style={{ textAlign: 'right', width: '110px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const compress = items.length > 5;
                            const rowCellStyle = {
                                padding: compress ? '8px 12px' : '12px 12px',
                                fontSize: compress ? '13.5px' : '14px',
                                lineHeight: compress ? '1.2' : '1.4'
                            };
                            return (
                                <tr key={idx}>
                                    <td style={{ ...rowCellStyle, textAlign: 'center', fontWeight: 500 }}>{idx + 1}</td>
                                    <td style={{ ...rowCellStyle, fontWeight: 500 }}>{professionalPrintTranslate(item.name || item.description)}</td>
                                    <td style={{ ...rowCellStyle, textAlign: 'right', fontWeight: 500 }}>{item.quantity}</td>
                                    <td style={{ ...rowCellStyle, textAlign: 'right', fontWeight: 500 }}>৳ {(Number(item.unitPrice || item.price || 0)).toLocaleString()}</td>
                                    <td style={{ ...rowCellStyle, textAlign: 'right', fontWeight: 700 }}>৳ {(Number(item.quantity || 1) * Number(item.unitPrice || item.price || 0)).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
                <div className="flex-grow"></div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                    <div style={{ width: '320px', fontSize: 15.5 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #cbd5e1' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>Subtotal:</span>
                            <span style={{ fontWeight: 600 }}>৳ {subtotal.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #cbd5e1' }}>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{t('vat', lang)} (5%):</span>
                            <span style={{ fontWeight: 600 }}>+ ৳ {vatAmount.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 0', fontSize: 22, fontWeight: 600, color: '#0f172a', borderBottom: '2px solid #94a3b8' }}>
                            <span>Total:</span>
                            <span>৳ {netPayable.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div style={{ textAlign: 'left', marginTop: 10, fontSize: 14.5, fontStyle: 'italic', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize', border: '1px solid #cbd5e1', borderRadius: 6, background: '#f8fafc', padding: '12px 15px', WebkitPrintColorAdjust: 'exact', breakInside: 'avoid' }}>
                    In Words: {toWords(netPayable)}
                </div>
            </div>

    <div className="alive-footer-lock">

        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 35, marginTop: 20 }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '220px', borderTop: '1.5px solid #94a3b8', paddingTop: 8 }}>
                {quotation.customerSignature && (
                    <img src={quotation.customerSignature} style={{ height: 60, display: 'block', margin: '0 auto -8px auto' }} alt="Customer Sign" />
                )}
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', width: '100%', textAlign: 'center' }}>Customer Signature</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '220px', borderTop: '1.5px solid #94a3b8', paddingTop: 8 }}>
                {quotation.sellerSignature && (
                    <img src={quotation.sellerSignature} style={{ height: 60, display: 'block', margin: '0 auto -8px auto' }} alt="Seller Sign" />
                )}
                <span style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', width: '100%', textAlign: 'center' }}>Authorized Sign</span>
            </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', fontSize: '13.5px', color: '#1e293b', marginTop: 15 }}>
            <div style={{ maxWidth: '60%', lineHeight: 1.4, fontSize: '13px', background: '#f8fafc', padding: '12px', border: '1px solid #cbd5e1', borderRadius: 6, WebkitPrintColorAdjust: 'exact' }}>
                <div style={{ marginBottom: '5px' }}>
                    Note: <span style={{ fontStyle: 'italic' }}>The authority is not responsible for any goods left for more than 3 months or for any kind of damage or loss.</span>
                </div>
                <div>
                    Validity: This quotation is valid for 15 days from the date of issue.
                </div>
            </div>
            <div style={{ textAlign: 'right', maxWidth: '38%', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                <span style={{ fontWeight: 600, fontSize: '12.5px', color: '#334155' }}>Dua for Traveling: "Bismillahi majreha wa mursaha, inna Rabbi la-Ghafurur Rahim."</span>
            </div>
        </div>
    </div>
        </div >,
    document.body
    );
};

// ─── Main Quotations Page Component ──────────────────────────────────────────
const QuotationsPage = () => {
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'SuperAdmin';
    const {
        inventory, customers, generateSafeId, navigateTo,
        loading: globalLoading, jobIntakes: globalJobIntakes,
        setJobIntakes: setGlobalJobIntakes,
        language: lang
    } = useGlobalState();

    const [quotations, setQuotations] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = React.useState(false);
    const [isRejectModalOpen, setIsRejectModalOpen] = React.useState(false);
    const [selectedQuotation, setSelectedQuotation] = React.useState(null);
    const [editForm] = Form.useForm();
    const [rejectForm] = Form.useForm();
    const [saving, setSaving] = React.useState(false);
    const [printingQuotation, setPrintingQuotation] = React.useState(null);
    const [shouldPrint, setShouldPrint] = React.useState(false);
    const [aiSuggestions, setAiSuggestions] = React.useState({});
    const [jobIntakes, setJobIntakes] = React.useState([]);
    const [isRequestPickerOpen, setIsRequestPickerOpen] = React.useState(false);

    // Lead Architect Implementation: Unified Nuclear Sync (v4.4)
    React.useEffect(() => {
        if (printingQuotation && shouldPrint) {
            bufferedPrint(() => {
                setShouldPrint(false);
                setPrintingQuotation(null);
            });
        }
    }, [printingQuotation, shouldPrint]);



    // Global Print Engine active system-wide

    const loadQuotations = React.useCallback(async () => {
        setLoading(true);
        try {
            const [qList, iList] = await Promise.all([
                databaseBridge.fetchQuotations(),
                databaseBridge.fetchCollection('jobIntakes')
            ]);
            setQuotations(qList || []);
            setJobIntakes((iList || []).filter(i => ['Req Sent', 'Quotation Ready'].includes(i.status)));
        } catch (err) {
            console.error('Failed to load data:', err);
            message.error('Could not load technical data.');
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadQuotations();
        const pending = getFromLocalStorage('pendingQuotationData');
        if (pending) {
            handleOpenNewQuotation(pending);
            syncToLocalStorage('pendingQuotationData', null);
        }
    }, [loadQuotations]);

    const handleOpenNewQuotation = (data) => {
        const permanentSign = localStorage.getItem('permanent_seller_signature') || '';
        editForm.resetFields();
        setAiSuggestions({});
        setSelectedQuotation(null);
        editForm.setFieldsValue({
            jobIntakeId: data?.jobIntakeId || (data?.id && data.id.startsWith('INTAKE') ? data.id : null),
            jobCardId: data?.jobCardId || (data?.id && !data.id.startsWith('INTAKE') ? data.id : 'DIRECT'),
            clientName: data?.clientName || data?.customerName || '',
            clientPhone: data?.clientPhone || data?.phone || '',
            vehicleNo: data?.vehicleNo || '',
            items: (data?.items || []).map(i => ({ ...i, type: i.type || 'Service', quantity: i.quantity || 1, price: i.price || 0 })),
            billingEntity: data?.billingEntity || 'Mamun Automobiles',
            status: 'Draft',
            customerSignature: data?.customerSignature || '',
            sellerSignature: data?.sellerSignature || currentUser?.savedSignature || permanentSign
        });
        setIsEditModalOpen(true);
    };

    const handleSaveQuotation = async (values) => {
        setSaving(true);
        try {
            const sanitizedItems = (values.items || []).map(item => ({
                ...item,
                type: item.type || 'Service',
                quantity: Number(item.quantity) || 1,
                price: Number(item.price) || 0
            }));
            const payload = { ...values, items: sanitizedItems };

            if (selectedQuotation) {
                const savedData = await databaseBridge.updateQuotation(selectedQuotation.id, payload);
                message.success('Quotation updated.');
                // Update local state immediately to avoid stale data
                setQuotations(prev => prev.map(q => q.id === selectedQuotation.id ? { ...q, ...payload } : q));
            } else {
                const newQt = {
                    ...payload,
                    id: `QT-${generateSafeId()}`,
                    date: dayjs().toISOString(),
                    version: 1,
                    history: [],
                    jobCardId: values.jobCardId || 'DIRECT',
                    jobIntakeId: values.jobIntakeId || null
                };
                const savedData = await databaseBridge.addQuotation(newQt);
                setQuotations(prev => [savedData || newQt, ...prev]);
                const intakeId = values.jobIntakeId || (values.jobCardId && values.jobCardId.startsWith('INTAKE') ? values.jobCardId : null);
                if (intakeId) {
                    await databaseBridge.updateJobIntake(intakeId, { status: 'Quotation Ready' });
                    setGlobalJobIntakes((prev) => (prev || []).map(i => i.id === intakeId ? { ...i, status: 'Quotation Ready' } : i));
                }
                message.success('New Quotation created.');
            }
            setIsEditModalOpen(false);
            await loadQuotations();
        } catch (err) {
            console.error('Save failed:', err);
            message.error('Failed to save quotation.');
        } finally {
            setSaving(false);
        }
    };

    const handlePass = async (record) => {
        try {
            await databaseBridge.updateQuotation(record.id, { status: 'Passed' });
            message.success('Quotation marked as Passed.');
            loadQuotations();
        } catch (err) {
            message.error('Failed to pass quotation.');
        }
    };

    const handlePrintQt = async (qt) => {
        let finalQt = qt;
        message.loading({ content: 'Preparing professional English proposal...', key: 'qt_print_translate', duration: 0 });
        try {
            const translatedItems = await Promise.all((qt.items || []).map(async item => ({
                ...item,
                name: await processUserInput(item.name || item.description, 'en')
            })));
            finalQt = { ...qt, items: translatedItems };
            message.success({ content: 'Proposal Ready (Translated to English)', key: 'qt_print_translate', duration: 2 });
        } catch (err) {
            console.error('Translation failed:', err);
            message.destroy('qt_print_translate');
        }
        setPrintingQuotation(finalQt);
        setShouldPrint(true);
    };

    const handleSendWhatsApp = async (q) => {
        if (!q.clientPhone) return message.error('No phone number.');
        const items = Array.isArray(q.items) ? q.items : [];
        const subtotal = items.reduce((a, b) => a + ((Number(b?.price) || 0) * (Number(b?.quantity) || 0)), 0);
        const netPayable = Math.round(subtotal * 1.05);

        const shareLink = buildShareableDocumentLink('quotation', q.id || 'New');
        const msg = `Hello ${q.clientName || 'Customer'},\n\nYour *Quotation #${q.id || 'New'}* from *Mamun Automobiles* has been generated.\n\n*Total Amount:* ৳${formatCurrency(netPayable)}\n*Vehicle No:* ${q.vehicleNo || 'N/A'}\n\nView and Download here: ${shareLink}\n\nThank you!`;

        openWhatsAppShare({ phone: q.clientPhone.replace(/\s+/g, ''), message: msg });
        message.success('WhatsApp link opened!');
    };

    const columns = [
        { 
            title: lang === 'bn' ? 'কোটেশন আইডি' : 'Quotation ID', 
            dataIndex: 'id', 
            key: 'id', 
            render: (text) => <Text style={{ fontWeight: 600 }}>{text || 'N/A'}</Text> 
        },
        { 
            title: t('customer', lang), 
            render: (_, r) => (
                <div>
                    <div>{r?.clientName || r?.customerName || 'N/A'}</div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>{r?.clientPhone || r?.phone || ''}</Text>
                </div>
            ) 
        },
        { 
            title: lang === 'bn' ? 'গাড়ির নম্বর' : 'Vehicle No', 
            dataIndex: 'vehicleNo', 
            key: 'vehicleNo', 
            render: (text) => <Tag color="blue">{text || 'N/A'}</Tag> 
        },
        {
            title: t('total', lang), 
            render: (_, r) => {
                const items = Array.isArray(r?.items) ? r.items : (Array.isArray(r?.lineItems) ? r.lineItems : []);
                const subtotal = items.reduce((a, b) => a + ((Number(b?.price || b?.unitPrice) || 0) * (Number(b?.quantity) || 0)), 0);
                const grandTotal = Math.round(subtotal * 1.05);
                return <b style={{ color: 'inherit', fontWeight: 600 }}>৳ {formatCurrency(grandTotal)}</b>;
            }
        },
        { 
            title: t('status', lang), 
            dataIndex: 'status', 
            render: s => <Tag color={s === 'Passed' ? 'green' : s === 'Rejected' ? 'red' : 'blue'}>{s || 'Pending'}</Tag> 
        },
        {
            title: t('actions', lang),
            render: (_, record) => (
                <Space>
                    <Button style={{ fontWeight: 600 }} onClick={() => { if(!record) return; setSelectedQuotation(record); editForm.setFieldsValue(record); setIsEditModalOpen(true); }}>{t('edit', lang)}</Button>
                    {record?.status !== 'Passed' && <Button type="primary" size="small" style={{ fontWeight: 600 }} onClick={() => handlePass(record)}>Pass</Button>}
                    <Button style={{ fontWeight: 600 }} onClick={() => handlePrintQt(record)}>Print</Button>
                    <Button style={{ fontWeight: 600 }} onClick={() => handleSendWhatsApp(record)}>WhatsApp</Button>
                </Space>
            )
        }
    ];

    return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: 0, width: '100%' }}>
            {/* portal renders document outside #root for 100% isolation */}
            {printingQuotation && <PrintQuotation quotation={printingQuotation} lang="en" />}

            <div className="no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                    <div>
                        <Title level={2} style={{ margin: 0, color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.5px' }}>Quotations</Title>
                        <Text style={{ color: '#3B82F6', fontWeight: 500, fontSize: 12, letterSpacing: '0.5px' }}>Proposal & estimation management board</Text>
                    </div>
                    <Button
                        size="large"
                        onClick={() => handleOpenNewQuotation({})}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600 }}
                    >
                        {t('create_quotation', lang)}
                    </Button>
                </div>

                <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <Table
                        columns={columns}
                        dataSource={quotations}
                        rowKey="id"
                        loading={loading}
                        pagination={{ pageSize: 15 }}
                    />
                </div>

                <Modal
                    title={<span style={{ fontWeight: 600, letterSpacing: '0.5px' }}>{selectedQuotation ? t('refine_quotation', lang) : t('create_new_proposal', lang)}</span>}
                    open={isEditModalOpen}
                    onOk={() => editForm.submit()}
                    onCancel={() => setIsEditModalOpen(false)}
                    width={1000}
                    className="luxury-modal"
                    footer={[
                        <Button key="cancel" onClick={() => setIsEditModalOpen(false)} style={{ fontWeight: 600 }}>{t('discard', lang)}</Button>,
                        <Button key="submit" onClick={() => editForm.submit()} style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600 }}>
                            {selectedQuotation ? t('update_proposal', lang) : t('generate_quotation', lang)}
                        </Button>
                    ]}
                >
                    <Form form={editForm} onFinish={handleSaveQuotation} layout="vertical">
                        <Row gutter={16}>
                            <Col span={6}><Form.Item name="clientName" label={t('client', lang)}><SmartVoiceInput placeholder="Client Name" /></Form.Item></Col>
                            <Col span={6}><Form.Item name="clientPhone" label={t('phone_number', lang)}><SmartVoiceInput placeholder="01XXX-XXXXXX" /></Form.Item></Col>
                            <Col span={6}><Form.Item name="vehicleNo" label={t('vehicle_registration_no', lang)} rules={[{ required: true }]}><SmartVoiceInput placeholder="DHA-XX-XXXX" /></Form.Item></Col>
                            <Col span={6}><Form.Item name="billingEntity" label={t('entity', lang)}><Select options={[{ value: 'Mamun Automobiles', label: 'Mamun Automobiles' }, { value: 'Trust Motors', label: 'Trust Motors' }]} /></Form.Item></Col>
                        </Row>
                        <Form.List name="items">
                            {(fields, { add, remove }) => (
                                <>
                                    {fields.map(({ key, name, ...restField }) => (
                                        <Row key={key} gutter={8}>
                                            <Col span={10}><Form.Item {...restField} name={[name, 'name']}><SmartVoiceInput placeholder={t('item', lang)} /></Form.Item></Col>
                                            <Col span={4}><Form.Item {...restField} name={[name, 'type']}><Select><Option value="Part">{t('part', lang)}</Option><Option value="Service">{t('service', lang)}</Option></Select></Form.Item></Col>
                                            <Col span={3}><Form.Item {...restField} name={[name, 'quantity']}><Input type="number" placeholder={t('qty', lang)} /></Form.Item></Col>
                                            <Col span={5}><Form.Item {...restField} name={[name, 'price']}><Input type="number" prefix="৳" placeholder={t('price', lang)} /></Form.Item></Col>
                                            <Col span={2}><Button type="link" danger onClick={() => remove(name)}>X</Button></Col>
                                        </Row>
                                    ))}
                                    <Button type="dashed" onClick={() => add()} block>+ {t('add_item', lang)}</Button>
                                </>
                            )}
                        </Form.List>

                        <Divider className="border-[var(--text-muted)] border-opacity-10 my-8" />

                        <Row gutter={32} style={{ marginTop: 24 }}>
                            <Col span={12}>
                                <Form.Item name="customerSignature" label={<Text strong style={{ fontSize: 11, color: '#3B82F6' }}>{t('customer_signature', lang)}</Text>}>
                                    <SignatureField height={100} />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="sellerSignature" label={<Text strong style={{ fontSize: 11, color: '#3B82F6' }}>{t('authorized_signature', lang)}</Text>}>
                                    <SignatureField
                                        height={100}
                                        isPermanent={true}
                                        storageKey="permanent_seller_signature"
                                    />
                                </Form.Item>
                            </Col>
                        </Row>

                        <div style={{ textAlign: 'center', marginTop: 20 }}>
                            <Button
                                type="primary"
                                size="large"
                                icon={<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style={{ width: 18, marginRight: 8 }} alt="WA" />}
                                onClick={() => handleSendWhatsApp(editForm.getFieldsValue())}
                                style={{ background: '#25D366', border: 'none', fontWeight: 600, height: 45, padding: '0 25px' }}
                                disabled={!editForm.getFieldValue('clientPhone')}
                            >
                                Share to WhatsApp
                            </Button>
                        </div>
                    </Form>
                </Modal>
            </div>
        </div>
    );
};

export default QuotationsPage;





