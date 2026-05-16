import React from 'react'; Divider } 
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';
import { Card, Table, Button, Input, Select, DatePicker, Row, Col, Typography, InputNumber, Modal, Form, Space, message, Radio, Divider, Tabs, AutoComplete, Tag, Checkbox, Avatar, Alert, Tooltip, List } from 'antd'; Divider } from 'antd'; Divider } from 'antd'; Divider } from 'antd'; Divider } from 'antd'; Divider } from  Divider } from 'antd'; Tooltip, List } from 'antd';, Alert, Tooltip, List, Divider } from 'antd';, Divider, Tabs, AutoComplete, Tag, Checkbox, Avatar, Alert, Tooltip, List } from 'antd'; Divider, Tabs, AutoComplete, Tag, Checkbox, Avatar, Alert, Tooltip, List } from 'antd'; Tabs, AutoComplete, Tag, Checkbox, Avatar, Alert, Tooltip, List } from 'antd'; Divider, Tabs, AutoComplete, Tag, Checkbox, Avatar, Alert, Tooltip, List } from 'antd';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { Mic, MicOff, Sparkles } from 'lucide-react'; Divider } from 'antd';
import { useTheme } from './contexts/ThemeContext';
import { getFromLocalStorage, formatCurrency } from './utils/helpers';
import dayjs from 'dayjs';
import ErrorBoundary from './ErrorBoundary';
import './BillingPage.css';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import downloadElementAsPdf from './utils/domPdf';
import { buildShareableDocumentLink, createBillingWhatsAppMessage, openWhatsAppShare } from './utils/whatsAppShare';
import { getAppOrigin } from './utils/appConfig';
import { t } from './utils/translations';
import { processUserInput } from './services/aiServiceV2';
import SmartVoiceInput from './components/SmartVoiceInput';
import { professionalPrintTranslate } from './utils/translationMiddleware';
import useVehicleAutoFill from './hooks/useVehicleAutoFill';
import toWords from './utils/numberToWords';
import SignatureField from './components/SignatureField';
import LuxuryCarWatermarkSVG from './components/LuxuryCarWatermarkSVG';

const { Title, Text } = Typography;
const { Option } = Select;

const VAT_RATE = 0.05; // 5%
const QR_HISTORY_BASE_URL = `${getAppOrigin()}/#/history?v=`;

const generateId = () => Date.now().toString().slice(-6) + Math.floor(Math.random() * 100);

const computeNextInvoiceId = (savedBills) => {
    const year = dayjs().year();
    const maxSeq = (savedBills || []).reduce((max, b) => {
        const match = b?.id && b.id.match(/MA-\d{4}-(\d+)/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 0);
    return `MA-${year}-${String(maxSeq + 1).padStart(4, '0')}`;
};

// ─── Single draft bill state factory ────────────────────────────
const createDraft = (id) => {
    const permanentSign = localStorage.getItem('permanent_seller_signature') || '';
    return {
        draftId: id,
        customerName: '',
        phone: '',
        vehicleNo: '',
        billingEntity: 'Mamun Automobiles',
        saleType: 'Cash',
        companyName: '',
        contactPerson: '',
        clientType: 'Customer',
        lineItems: [],
        discount: 0,
        paidAmount: 0,
        paymentMethod: 'Cash',
        customerId: '',
        jobIntakeId: null,
        customerSignature: '',
        sellerSignature: permanentSign
    };
};

// ─── Print Invoice Component (Standardized v3.4 Architecture) ──────────────────────
const PrintInvoice = ({ bill, payments, lang = 'en' }) => {
    if (!bill) return null;
    const vatAmount = Math.round((bill.amount || 0) * VAT_RATE);
    const netPayable = (bill.amount || 0) + vatAmount;

    const billPayments = (payments || []).filter(p => p?.invoiceId === bill?.id);
    const calculatedPaidFromLogs = billPayments.reduce((acc, p) => acc + (p?.amount || 0), 0);
    const totalPaid = calculatedPaidFromLogs > 0 ? calculatedPaidFromLogs : (bill.paid || 0);
    const dueAmount = Math.max(0, netPayable - totalPaid);
    const paymentStatus = (totalPaid >= netPayable ? t('paid', lang) : (totalPaid > 0 ? t('partially_paid', lang) : t('unpaid', lang)));

    const items = bill.items || bill.lineItems || [];
    const resolvedMethod = bill.paymentMethod || (billPayments.length > 0 ? billPayments[0].method : 'Cash');

    return createPortal(
        <div className="alive-print-area">
            {/* Professional Luxury Vector Watermark Engine - Set exactly to 4% opacity as per premium design specifications */}
            <LuxuryCarWatermarkSVG opacity={0.04} />

            {/* Spiritual Invocation */}
            <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: 600, marginBottom: 4, color: '#0f172a', letterSpacing: '0.5px' }}>
                Bismillahir Rahmanir Rahim
            </div>
            
            <BrandedDocumentHeader 
                title="CASH MEMO // INVOICE" 
                subtitle={bill.billingEntity || 'Mamun Automobiles'}
                meta={[
                    { label: t('invoice', lang), value: bill.id },
                    { label: t('customer', lang), value: bill.customerName || 'N/A' },
                    { label: 'Vehicle No', value: bill.vehicleNo || 'N/A' },
                    { label: t('date', lang), value: dayjs(bill.date).format('DD MMM YYYY') }
                ]}
                lang={lang}
            />

            <div style={{ marginTop: 15, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ width: '48%' }}>
                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Client Details</Text>
                        <div style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{bill.companyName || bill.customerName}</div>
                        <div style={{ fontSize: 16, color: '#1e293b', fontWeight: 500 }}>{bill.phone}</div>
                    </div>
                    <div style={{ width: '48%', textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Vehicle Info</Text>
                        <div style={{ fontSize: 26, fontWeight: 600, color: '#0f172a' }}>{bill.vehicleNo}</div>
                        <div style={{ fontSize: 12, color: '#003399', fontWeight: 600 }}>Verified Registration</div>
                    </div>
                </div>

                {/* Applying Double Border styling scheme with Royal Blue Header text matching the Quotation framework */}
                <style>{`
                    .premium-print-table {
                        border-collapse: collapse !important;
                        border-spacing: 0 !important;
                        border: 3px double #a1a1a1 !important;
                        width: 100% !important;
                        margin-bottom: 20px !important;
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
                            <th style={{ textAlign: 'left' }}>{t('description', lang)}</th>
                            <th style={{ textAlign: 'right', width: '65px' }}>{t('qty', lang)}</th>
                            <th style={{ textAlign: 'right', width: '90px' }}>{t('unit_price', lang)}</th>
                            <th style={{ textAlign: 'right', width: '110px' }}>{t('total', lang)}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {items.map((item, idx) => {
                            const unitPrice = Number(item.unitPrice || item.price || 0);
                            const rowTotal = (Number(item.quantity) || 1) * unitPrice;
                            const compress = items.length > 5;
                            const cellStyle = { 
                                padding: compress ? '6px 12px' : '10px 12px', 
                                fontSize: compress ? '13.5px' : '14px',
                                lineHeight: compress ? '1.2' : '1.4'
                            };
                            return (
                                <tr key={item.id || idx}>
                                    <td style={{ ...cellStyle, textAlign: 'center', fontWeight: 500 }}>{idx + 1}</td>
                                    <td style={{ ...cellStyle, fontWeight: 600 }}>{professionalPrintTranslate(item.description || item.name)}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 500 }}>{item.quantity}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 500 }}>৳ {unitPrice.toLocaleString()}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }}>৳ {rowTotal.toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {/* Explicit Payment Summary Section table to display clear breakdown */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 15 }}>
                    <div style={{ width: '340px', fontSize: 14.5, border: '3px double #a1a1a1', padding: '12px 16px', background: '#ffffff' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 700, color: '#64748b' }}>Subtotal:</span>
                            <span style={{ fontWeight: 600 }}>৳ {(bill.subtotal || 0).toLocaleString()}</span>
                        </div>
                        {bill.discount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', color: '#c2165e' }}>
                                <span style={{ fontWeight: 700 }}>Discount:</span>
                                <span style={{ fontWeight: 700 }}>- ৳ {bill.discount.toLocaleString()}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                            <span style={{ fontWeight: 600, color: '#64748b' }}>{t('vat', lang)} (5%):</span>
                            <span style={{ fontWeight: 600 }}>+ ৳ {vatAmount.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 20, fontWeight: 600, color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
                            <span>Total Amount:</span>
                            <span>৳ {netPayable.toLocaleString()}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 15, color: '#003399' }}>
                            <span style={{ fontWeight: 600 }}>Paid Amount:</span>
                            <span style={{ fontWeight: 600 }}>৳ {totalPaid.toLocaleString()}</span>
                        </div>
                        {dueAmount > 0 && (
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15.5, color: '#dc2626', background: '#fef2f2', margin: '4px -8px', padding: '4px 8px', borderRadius: 4 }}>
                                <span style={{ fontWeight: 600 }}>Due Amount:</span>
                                <span style={{ fontWeight: 600 }}>৳ {dueAmount.toLocaleString()}</span>
                            </div>
                        )}
                        <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 6, fontSize: 13, color: '#475569', borderTop: '1px solid #e2e8f0', marginTop: 4 }}>
                            <span style={{ fontWeight: 600 }}>Payment Method:</span>
                            <span style={{ fontWeight: 600 }}>{resolvedMethod}</span>
                        </div>
                    </div>
                </div>
                <div style={{ textAlign: 'left', fontSize: 14, fontStyle: 'italic', fontWeight: 700, color: '#1e293b', border: '3px double #a1a1a1', background: '#f8fafc', padding: '10px 14px', WebkitPrintColorAdjust: 'exact', borderRadius: 4 }}>
                    In Words: {toWords(netPayable)}
                </div>
            </div>

            <div className="alive-footer-lock">
                {/* Professional Double Border Signatures Setup */}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, marginTop: 20 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '220px', borderTop: '3px double #a1a1a1', paddingTop: 8 }}>
                        {bill.customerSignature && (
                            <img src={bill.customerSignature} style={{ height: 50, display: 'block', margin: '0 auto -6px auto' }} alt="Receiver Sign" />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Receiver's Signature</span>
                    </div>
                    {bill.vehicleNo && (
                        <div style={{ textAlign: 'center' }}>
                            <img 
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=55x55&data=${encodeURIComponent(`${QR_HISTORY_BASE_URL}${bill.vehicleNo.replace(/\s+/g, '')}`)}`} 
                                alt="QR Record" 
                            />
                            <div style={{ fontSize: 8, fontWeight: 600, marginTop: 3, color: '#64748b' }}>Verified Record</div>
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '220px', borderTop: '3px double #a1a1a1', paddingTop: 8 }}>
                        {bill.sellerSignature && (
                            <img src={bill.sellerSignature} style={{ height: 50, display: 'block', margin: '0 auto -6px auto' }} alt="Authorized Sign" />
                        )}
                        <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Authorized Signature</span>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', fontSize: '13px', color: '#1e293b', marginTop: 10 }}>
                    <div style={{ maxWidth: '60%', lineHeight: 1.3, background: '#f8fafc', padding: '10px', border: '3px double #a1a1a1', WebkitPrintColorAdjust: 'exact', borderRadius: 4 }}>
                        <div style={{ marginBottom: '4px' }}>
                            Note: <span style={{ fontStyle: 'italic' }}>The authority is not responsible for any goods left for more than 3 months or for any kind of damage or loss.</span>
                        </div>
                        <div>
                            Validity: This invoice is valid for 15 days from the date of issue.
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', maxWidth: '38%', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 600, fontSize: '12px', color: '#334155' }}>Dua for Traveling: "Bismillahi majreha wa mursaha, inna Rabbi la-Ghafurur Rahim."</span>
                    </div>
                </div>
            </div>
        </div>,
        document.body
    );
};

// ─── Bill Draft Form (one per tab) ──────────────────────────────
const BillDraftForm = ({ draft, onUpdate, savedBills, inventory, services, setServices, customers, payments, setSavedBills, setInventory, setPayments, updateCustomerLedger, logActivity, isAdmin, jobCards, setJobCards, onPrintReady, companies, generateSafeId, returnToInventory, isDark, jobIntakes }) => {
    const { language } = useGlobalState();
    const { user: currentUser } = useAuth();
    const { lookupVehicle, notifyResult } = useVehicleAutoFill();
    const { lineItems, discount, paidAmount, customerName, phone, vehicleNo, billingEntity, saleType, companyName, contactPerson, jobId, jobIntakeId, clientType } = draft;

    const [isServiceModalVisible, setIsServiceModalVisible] = React.useState(false);
    const [isPartModalVisible, setIsPartModalVisible] = React.useState(false);
    const [serviceModalPrice, setServiceModalPrice] = React.useState(0);
    const [useAdvanceWallet, setUseAdvanceWallet] = React.useState(false);
    const [isRequestPickerOpen, setIsRequestPickerOpen] = React.useState(false);

    const [serviceForm] = Form.useForm();
    const [partForm] = Form.useForm();

    // Calculations
    const safeLineItems = lineItems || [];
    const subtotal = React.useMemo(() => safeLineItems.reduce((acc, item) => acc + ((item.quantity || 0) * (item.unitPrice || 0)), 0), [safeLineItems]);
    const grandTotal = Math.max(0, subtotal - (discount || 0));
    const vatAmount = Math.round(grandTotal * VAT_RATE);
    const netPayable = grandTotal + vatAmount;
    const dueAmount = Math.max(0, netPayable - (paidAmount || 0));

    const set = (field, value) => {
        const updates = { ...draft, [field]: value };
        if (field === 'companyName' && value && value.trim().length > 0) {
            updates.saleType = 'Credit';
        }
        onUpdate(updates);
    };

    const setItems = (items) => {
        const removedParts = safeLineItems.filter(oldItem =>
            oldItem.isNewInventoryPart &&
            oldItem.partId &&
            !items.some(newItem => newItem.id === oldItem.id)
        );
        if (removedParts.length > 0 && returnToInventory) {
            returnToInventory(removedParts);
        }
        onUpdate({ ...draft, lineItems: items });
    };

    const handleSelectMechanicRequest = (request) => {
        const updates = { ...draft };
        updates.customerName = request.customerName;
        updates.phone = request.phone;
        updates.vehicleNo = request.vehicleNo;
        updates.jobIntakeId = request.id;
        updates.lineItems = (request.items || []).map(i => ({
            id: generateSafeId('INTAKE-ITEM'),
            description: i.name,
            quantity: i.quantity || 1,
            unitPrice: i.price || 0,
            isNewInventoryPart: i.type === 'Part'
        }));
        onUpdate(updates);
        setIsRequestPickerOpen(false);
        message.success(`Populated from ${request.vehicleNo}`);
    };

    // Auto-Sign logic
    React.useEffect(() => {
        if (jobIntakeId && jobIntakes) {
            const intake = jobIntakes.find(i => String(i.id) === String(jobIntakeId));
            if (intake) {
                if (!customerName || customerName.trim() === '') {
                    onUpdate({ 
                        ...draft, 
                        customerName: intake.customerName, 
                        phone: intake.phone, 
                        vehicleNo: intake.vehicleNo,
                        sellerSignature: draft.sellerSignature || currentUser?.savedSignature || ''
                    });
                }
            }
        } else if (!draft.sellerSignature && currentUser?.savedSignature) {
            onUpdate({ ...draft, sellerSignature: currentUser.savedSignature });
        }
    }, [jobIntakeId, jobIntakes, currentUser]);

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
            const updates = { ...draft };
            if (data.type === 'Company') {
                updates.companyName = data.name;
                updates.customerName = data.name;
                updates.contactPerson = data.contactPerson || '';
                updates.saleType = 'Credit';
                updates.clientType = 'Company';
            } else {
                updates.customerName = data.name;
                updates.companyName = '';
                updates.contactPerson = '';
                updates.saleType = 'Cash';
                updates.clientType = 'Customer';
            }
            updates.phone = data.phone || '';
            updates.vehicleNo = data.vehicleNo || '';
            updates.customerId = data.id || '';
            onUpdate(updates);
        }
    };

    const handleAddService = (values) => {
        setItems([...safeLineItems, {
            id: generateSafeId('SVC'),
            description: values.servicePreset || values.description || 'Custom Service',
            quantity: values.quantity || 1,
            unitPrice: values.price || 0,
            isNewInventoryPart: false
        }]);
        setIsServiceModalVisible(false);
        serviceForm.resetFields();
        setServiceModalPrice(0);
    };

    const handleServicePresetSelect = (value, option) => {
        if (option?.service) {
            const svc = option.service;
            const resolvedPrice = (clientType === 'Company' && svc.companyRate) ? svc.companyRate : (svc.basePrice || 0);
            serviceForm.setFieldsValue({ price: resolvedPrice, description: svc.name });
            setServiceModalPrice(resolvedPrice);
        }
    };

    const handleAddPart = (values) => {
        const part = (inventory || []).find(p => p?.id === values?.partId);
        if (!part) return;
        if (values.quantity > part.stock) {
            message.error(`Insufficient stock! Only ${part.stock} left.`);
            return;
        }
        const resolvedPrice = (clientType === 'Company' && part.companyRate) ? part.companyRate : part.sellingPrice;
        setItems([...safeLineItems, {
            id: generateSafeId('PART-ENTRY'),
            description: part.name,
            quantity: values.quantity,
            unitPrice: resolvedPrice,
            purchasePrice: part.purchasePrice || 0,
            isNewInventoryPart: true,
            partId: part.id
        }]);
        setIsPartModalVisible(false);
        partForm.resetFields();
    };

    const autoSaveNewServices = React.useCallback((items) => {
        const newSvcs = [];
        (items || []).forEach(item => {
            const name = (item.description || '').trim();
            if (!name || name.startsWith('[')) return;
            const alreadyExists = (services || []).some(s => s.name?.toLowerCase() === name?.toLowerCase());
            if (!alreadyExists) {
                newSvcs.push({
                    id: generateSafeId('SVC'),
                    name,
                    basePrice: item.unitPrice || 0,
                    companyRate: 0,
                    category: 'Other',
                    description: 'Auto-added from billing',
                    createdAt: dayjs().toISOString()
                });
            }
        });
        if (newSvcs.length > 0 && setServices) {
            setServices([...(services || []), ...newSvcs]);
        }
    }, [services, setServices, generateSafeId]);

    const handleSendBillToWhatsApp = (bill) => {
        if (!bill?.phone) return;
        const shareLink = buildShareableDocumentLink('invoice', bill.id || 'draft');
        const whatsAppMessage = createBillingWhatsAppMessage({
            customerName: bill.customerName,
            id: bill.id || 'Draft',
            amount: bill.netPayable || bill.amount,
            link: shareLink
        });
        openWhatsAppShare({ phone: bill.phone, message: whatsAppMessage });
    };

    const handleFinalizeBill = () => {
        if (!customerName || !phone) { message.error('Customer Name and Phone are required.'); return; }
        if (safeLineItems.length === 0) { message.error('Cannot generate an empty bill.'); return; }

        const newInvoiceId = computeNextInvoiceId(savedBills);

        let currentInventory = Array.isArray(inventory) ? [...inventory] : [];
        (safeLineItems || []).forEach(item => {
            if (item?.isNewInventoryPart && item?.partId) {
                currentInventory = currentInventory.map(p =>
                    p?.id === item.partId ? { ...p, stock: (p?.stock || 0) - (item?.quantity || 0) } : p
                );
            }
        });
        setInventory(currentInventory);

        const finalBill = {
            id: newInvoiceId,
            date: dayjs().toISOString(),
            customerName, phone, vehicleNo,
            jobIntakeId: draft.jobIntakeId || null,
            billingEntity: billingEntity || 'Mamun Automobiles', saleType: saleType || 'Cash',
            companyName: (saleType === 'Credit' ? companyName : '') || '',
            contactPerson: contactPerson || '',
            items: safeLineItems,
            customerId: draft.customerId || '',
            subtotal: subtotal || 0,
            discount: discount || 0,
            amount: grandTotal,
            vat: vatAmount,
            netPayable,
            paid: saleType === 'Cash' ? paidAmount : 0,
            due: saleType === 'Cash' ? dueAmount : netPayable,
            customerSignature: draft.customerSignature || '',
            sellerSignature: draft.sellerSignature || ''
        };

        const updatedBills = [finalBill, ...(savedBills || [])];
        setSavedBills(updatedBills);

        const newPaymentsToLog = [];
        if (saleType === 'Cash' && paidAmount > 0) {
            newPaymentsToLog.push({
                id: generateSafeId('PAY'),
                invoiceId: newInvoiceId,
                customerName, companyName: '',
                amount: paidAmount,
                date: dayjs().toISOString(),
                method: draft.paymentMethod || 'Cash'
            });
            setPayments([...newPaymentsToLog, ...(payments || [])]);
        }

        updateCustomerLedger({ customerName, phone, vehicleNo, dueAmount: finalBill.due });
        logActivity(`Bill ${newInvoiceId} created for ${customerName}`);
        autoSaveNewServices(safeLineItems);

        if (jobId && setJobCards) {
            const updatedJobs = (jobCards || []).map(j => j.id === jobId ? { ...j, status: 'billed' } : j);
            setJobCards(updatedJobs);
        }

        message.success(`✅ Invoice ${newInvoiceId} generated!`);
        handleSendBillToWhatsApp(finalBill);
        if (onPrintReady) onPrintReady(finalBill, true);
        onUpdate(createDraft(draft.draftId));
    };

    const serviceOptions = (services || []).map(s => {
        const resolvedPrice = (clientType === 'Company' && s.companyRate) ? s.companyRate : (s.basePrice || 0);
        return { value: s.name, label: `${s.name} (৳${resolvedPrice.toLocaleString()})`, resolvedPrice, type: 'Service' };
    });

    const inventoryOptions = (inventory || []).map(p => {
        const resolvedPrice = (clientType === 'Company' && p.companyRate) ? p.companyRate : (p.sellingPrice || 0);
        return { value: p.name, label: `${p.name} (৳${resolvedPrice.toLocaleString()})`, resolvedPrice, type: 'Part', partId: p.id, purchasePrice: p.purchasePrice };
    });

    const unifiedOptions = [...serviceOptions, ...inventoryOptions];

    const itemColumns = [
        {
            title: t('description', language), dataIndex: 'description', key: 'description',
            render: (val, record) => (
                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                    <AutoComplete
                        options={unifiedOptions}
                        style={{ flex: 1 }}
                        onSelect={(selectedName, option) => {
                            setItems(safeLineItems.map(l =>
                                l.id === record.id
                                    ? {
                                        ...l,
                                        description: selectedName,
                                        unitPrice: option.resolvedPrice ?? l.unitPrice,
                                        isNewInventoryPart: option.type === 'Part',
                                        partId: option.partId || null,
                                        purchasePrice: option.purchasePrice || 0
                                      }
                                    : l
                            ));
                        }}
                        onChange={text => setItems(safeLineItems.map(l => l.id === record.id ? { ...l, description: text } : l))}
                        size="small"
                        filterOption={(inputValue, option) => (option?.value || '').toLowerCase().includes(inputValue.toLowerCase())}
                    >
                        <SmartVoiceInput placeholder="Type service/part..." style={{ background: 'transparent' }} />
                    </AutoComplete>
                </div>
            )
        },
        {
            title: t('qty', language), dataIndex: 'quantity', width: 80,
            render: (val, record) => (
                <InputNumber min={1} size="small" value={val}
                    onChange={v => setItems(safeLineItems.map(l => l.id === record.id ? { ...l, quantity: v || 1 } : l))}
                />
            )
        },
        {
            title: t('price', language), dataIndex: 'unitPrice', width: 120,
            render: (val, record) => (
                <InputNumber min={0} size="small" value={val} style={{ width: '100%' }}
                    onChange={v => setItems(safeLineItems.map(l => l.id === record.id ? { ...l, unitPrice: v || 0 } : l))}
                />
            )
        },
        {
            title: t('total', language), width: 100,
            render: (_, record) => <Text strong>৳ {( (record.quantity || 0) * (record.unitPrice || 0) ).toLocaleString()}</Text>
        },
        {
            title: '', width: 40,
            render: (_, record) => <Button type="text" danger size="small" onClick={() => setItems(safeLineItems.filter(l => l.id !== record.id))}>×</Button>
        }
    ];

    return (
        <div className="no-print" style={{ marginTop: 20 }}>
            <Row gutter={24}>
                <Col xs={24} lg={16}>
                    {jobIntakes?.length > 0 && (
                        <div style={{ marginBottom: 24, padding: 15, background: 'rgba(212,175,55,0.05)', border: '1px solid rgba(212,175,55,0.2)', borderRadius: 4 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text style={{ color: '#3B82F6', fontWeight: 600, fontSize: 12 }}>Pending Requests ({jobIntakes.length})</Text>
                                <Button size="small" type="link" onClick={() => setIsRequestPickerOpen(!isRequestPickerOpen)} style={{ color: '#3B82F6' }}>
                                    {isRequestPickerOpen ? 'Hide' : 'View'}
                                </Button>
                            </div>
                            {isRequestPickerOpen && (
                                <List
                                    size="small"
                                    dataSource={jobIntakes}
                                    renderItem={item => (
                                        <List.Item onClick={() => handleSelectMechanicRequest(item)} style={{ cursor: 'pointer' }}>
                                            <Space>
                                                <Tag color="blue">{item.vehicleNo}</Tag>
                                                <Text>{item.customerName}</Text>
                                            </Space>
                                            <Button size="small" type="text" style={{ color: '#3B82F6' }}>Import</Button>
                                        </List.Item>
                                    )}
                                />
                            )}
                        </div>
                    )}

                    <div className="glass-card billing-card-wrapper" style={{ padding: '25px', marginBottom: 24, background: '#1E293B', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#3B82F6', letterSpacing: '0.5px', marginBottom: '20px', borderBottom: '2px solid rgba(59,130,246,0.3)', paddingBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            Client Details
                        </div>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item label={<span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '14px' }}>Customer/Company</span>} required>
                                    <AutoComplete options={unifiedClientOptions} onSelect={handleClientSelect} onChange={v => set('customerName', v)} value={customerName}>
                                        <SmartVoiceInput className="glass-input premium-glow-input" placeholder="Enter Client Name..." />
                                    </AutoComplete>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item label={<span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '14px' }}>Contact Phone</span>} required>
                                    <SmartVoiceInput value={phone} onChange={v => set('phone', v)} className="glass-input premium-glow-input" placeholder="e.g. 01712345678" />
                                </Form.Item>
                            </Col>
                            <Col span={8}>
                                <Form.Item label={<span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '14px' }}>Vehicle No</span>}>
                                    <SmartVoiceInput value={vehicleNo} onChange={v => set('vehicleNo', v)} className="glass-input premium-glow-input" placeholder="e.g. Dm-Ga-12-3456" />
                                </Form.Item>
                            </Col>
                            <Col span={16}>
                                <Form.Item label={<span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '14px' }}>Billing Entity</span>}>
                                    <Radio.Group value={billingEntity} onChange={e => set('billingEntity', e.target.value)}>
                                        <Radio.Button value="Mamun Automobiles" style={{ fontWeight: 600 }}>Mamun Automobiles</Radio.Button>
                                        <Radio.Button value="Muntaha Motors" style={{ fontWeight: 600 }}>Muntaha Motors</Radio.Button>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>

                    <div className="glass-card billing-card-wrapper" style={{ padding: '25px', background: '#1E293B', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, borderBottom: '2px solid rgba(59,130,246,0.3)', paddingBottom: '10px' }}>
                            <div style={{ fontSize: '20px', fontWeight: 600, color: '#3B82F6', letterSpacing: '0.5px', margin: 0, textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                                Items & Services
                            </div>
                            <Space>
                                <Button size="small" onClick={() => setIsServiceModalVisible(true)} style={{ background: '#3B82F6', color: '#FFFFFF', fontWeight: 600, border: 'none' }}>+ Service</Button>
                                <Input 
                                    className="search-parts-input"
                                    size="small" 
                                    placeholder="Search parts..." 
                                    onClick={() => setIsPartModalVisible(true)}
                                    readOnly
                                    prefix={<span style={{ marginRight: 6, opacity: 0.7 }}>🔍</span>}
                                />
                            </Space>
                        </div>
                        <Table dataSource={safeLineItems} columns={itemColumns} rowKey="id" pagination={false} size="small" className="luxury-table" />
                        <Button type="dashed" block onClick={() => setItems([...safeLineItems, { id: generateSafeId('BLANK'), description: '', quantity: 1, unitPrice: 0 }])} style={{ marginTop: 16, fontWeight: 600, borderColor: '#3B82F6', color: '#3B82F6' }}>
                            Add Blank Row
                        </Button>
                    </div>

                    <div className="glass-card billing-card-wrapper" style={{ padding: '25px', marginTop: 24, background: '#1E293B', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#3B82F6', letterSpacing: '0.5px', marginBottom: '20px', borderBottom: '2px solid rgba(59,130,246,0.3)', paddingBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            Signatures & Verification
                        </div>
                        <Row gutter={32}>
                            <Col span={12}>
                                <SignatureField 
                                    label="Customer Signature" 
                                    value={draft.customerSignature} 
                                    onChange={v => set('customerSignature', v)} 
                                />
                            </Col>
                            <Col span={12}>
                                <SignatureField 
                                    label="Authorized Signature (Seller)" 
                                    value={draft.sellerSignature} 
                                    onChange={v => set('sellerSignature', v)}
                                    isPermanent={true}
                                    storageKey="permanent_seller_signature"
                                />
                            </Col>
                        </Row>
                        <Divider style={{ borderColor: 'rgba(59,130,246,0.1)' }} />
                        <div style={{ textAlign: 'center' }}>
                            <Button 
                                type="primary" 
                                size="large"
                                icon={<img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" style={{ width: 20, marginRight: 8 }} />}
                                onClick={() => handleSendBillToWhatsApp(draft)}
                                style={{ background: '#25D366', border: 'none', fontWeight: 600, height: 50, borderRadius: 8, padding: '0 30px' }}
                                disabled={!draft.phone}
                            >
                                Share Preview to WhatsApp
                            </Button>
                        </div>
                    </div>
                </Col>

                <Col xs={24} lg={8}>
                    <div className="glass-card valuation-panel" style={{ padding: '30px', position: 'sticky', top: 16, background: '#1E293B', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ fontSize: '20px', fontWeight: 600, color: '#3B82F6', letterSpacing: '0.5px', marginBottom: '24px', borderBottom: '2px solid rgba(59,130,246,0.3)', paddingBottom: '10px', textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
                            Valuation
                        </div>
                        <div style={{ lineHeight: 2.5 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>Subtotal</Text>
                                <Text style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '14px' }}>৳{subtotal.toLocaleString()}</Text>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text strong style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>Discount</Text>
                                <InputNumber min={0} value={discount} onChange={v => set('discount', v || 0)} className="premium-glow-input" style={{ width: '130px' }} />
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <Text strong style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '13px' }}>VAT (5%)</Text>
                                <Text style={{ color: '#FFFFFF', fontWeight: 600, fontSize: '14px' }}>+ ৳{vatAmount.toLocaleString()}</Text>
                            </div>
                            <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                            {/* Immense High-Visibility Total Highlight Banner */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(34, 197, 94, 0.15)', padding: '16px 20px', borderRadius: '12px', border: '2.5px solid #22c55e', marginTop: '12px', boxShadow: '0 4px 20px rgba(34, 197, 94, 0.25)' }}>
                                <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '20px', letterSpacing: '0.5px' }}>Total</span>
                                <span style={{ color: '#22c55e', fontWeight: 600, fontSize: '32px', textShadow: '0 2px 12px rgba(34, 197, 94, 0.5)' }}>৳{netPayable.toLocaleString()}</span>
                            </div>
                        </div>
                        <Divider style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
                        <Form.Item label={<span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '14px' }}>Payment Method</span>}>
                            <Radio.Group value={draft.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
                                <Radio.Button value="Cash" style={{ fontWeight: 600 }}>Cash</Radio.Button>
                                <Radio.Button value="Bank" style={{ fontWeight: 600 }}>Bank</Radio.Button>
                                <Radio.Button value="Bkash" style={{ fontWeight: 600 }}>Bkash</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item label={<span style={{ color: '#FFFFFF', fontWeight: 500, fontSize: '14px' }}>Paid Amount</span>}>
                            <InputNumber min={0} value={paidAmount} onChange={v => set('paidAmount', v || 0)} style={{ width: '100%' }} className="premium-glow-input" />
                        </Form.Item>
                        <Button 
                            type="primary" 
                            block 
                            size="large" 
                            onClick={handleFinalizeBill} 
                            style={{ 
                                background: 'linear-gradient(135deg, #003399 0%, #002266 100%)', 
                                border: 'none', 
                                color: '#ffffff', 
                                fontSize: '18px', 
                                fontWeight: 600, 
                                height: '65px', 
                                marginTop: '24px',
                                borderRadius: '10px',
                                boxShadow: '0 8px 25px rgba(0, 51, 153, 0.6)',
                                letterSpacing: '0.2px',
                                textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                                transition: 'all 0.3s ease'
                            }}
                        >
                            Finalize & print
                        </Button>
                    </div>
                </Col>
            </Row>

            <Modal title="Add service" open={isServiceModalVisible} onCancel={() => setIsServiceModalVisible(false)} footer={null}>
                <Form form={serviceForm} onFinish={handleAddService} layout="vertical">
                    <Form.Item name="servicePreset" label="Select Service">
                        <Select options={services.map(s => ({ value: s.name, label: s.name, service: s }))} onChange={handleServicePresetSelect} showSearch />
                    </Form.Item>
                    <Form.Item name="description" label="Or Type Description">
                        <SmartVoiceInput />
                    </Form.Item>
                    <Form.Item name="price" label="Price (৳)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>Add</Button>
                </Form>
            </Modal>

            <Modal title="Add part" open={isPartModalVisible} onCancel={() => setIsPartModalVisible(false)} footer={null}>
                <Form form={partForm} onFinish={handleAddPart} layout="vertical">
                    <Form.Item name="partId" label="Part from Inventory" rules={[{ required: true }]}>
                        <Select options={inventory.map(p => ({ value: p.id, label: `${p.name} (Stock: ${p.stock})` }))} showSearch />
                    </Form.Item>
                    <Form.Item name="quantity" label="Quantity" rules={[{ required: true }]}>
                        <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block>Add</Button>
                </Form>
            </Modal>
        </div>
    );
};

// ─── Main BillingPage Component ──────────────────────────────────
const BillingPage = () => {
    const { inventory, setInventory, savedBills, setSavedBills, payments, setPayments, customers, updateCustomerLedger, logActivity, services, setServices, jobCards, setJobCards, jobIntakes, companies, generateSafeId, returnToInventory, fetchBillsPaged } = useGlobalState();
    const { user } = useAuth();
    const isAdmin = user?.role === 'Admin' || user?.role === 'SuperAdmin';

    const [drafts, setDrafts] = React.useState([createDraft('1')]);
    const [activeDraftKey, setActiveDraftKey] = React.useState('1');
    const [printingBill, setPrintingBill] = React.useState(null);
    const [shouldPrint, setShouldPrint] = React.useState(false);

    const [pastInvoicesData, setPastInvoicesData] = React.useState([]);
    const [loadingInvoices, setLoadingInvoices] = React.useState(false);
    const [invoicePagination, setInvoicePagination] = React.useState({ current: 1, pageSize: 15, total: 0 });

    const fetchInvoices = async (page = 1) => {
        setLoadingInvoices(true);
        const res = await fetchBillsPaged(page, 15);
        if (res) {
            setPastInvoicesData(res.data || []);
            setInvoicePagination({ ...invoicePagination, current: page, total: res.pagination?.total || 0 });
        }
        setLoadingInvoices(false);
    };

    React.useEffect(() => { fetchInvoices(); }, []);

    React.useEffect(() => {
        if (printingBill && shouldPrint) {
            bufferedPrint(() => {
                setShouldPrint(false);
                setPrintingBill(null);
            });
        }
    }, [printingBill, shouldPrint]);

    const handlePrintBill = (bill) => {
        setPrintingBill(bill);
        setShouldPrint(true);
    };

    const updateDraft = (updated) => setDrafts(prev => prev.map(d => d.draftId === updated.draftId ? updated : d));
    const addNewTab = () => { const id = Date.now().toString(); setDrafts([...drafts, createDraft(id)]); setActiveDraftKey(id); };
    const removeTab = (key) => { if (drafts.length > 1) { const nd = drafts.filter(d => d.draftId !== key); setDrafts(nd); if (activeDraftKey === key) setActiveDraftKey(nd[0].draftId); } };

    return (
        <ErrorBoundary>
            <div className="billing-page-container">
                {printingBill && <PrintInvoice bill={printingBill} payments={payments} lang="en" />}
                <Tabs
                    type="editable-card"
                    activeKey={activeDraftKey}
                    onChange={setActiveDraftKey}
                    onEdit={(k, a) => a === 'add' ? addNewTab() : removeTab(k)}
                    className="luxury-tabs no-print"
                    items={[
                        ...drafts.map((d, i) => ({
                            key: d.draftId,
                            label: `Bill #${i + 1}`,
                            children: <BillDraftForm draft={d} onUpdate={updateDraft} savedBills={savedBills} inventory={inventory} services={services} setServices={setServices} customers={customers} payments={payments} setSavedBills={setSavedBills} setInventory={setInventory} setPayments={setPayments} updateCustomerLedger={updateCustomerLedger} logActivity={logActivity} isAdmin={isAdmin} jobCards={jobCards} setJobCards={setJobCards} generateSafeId={generateSafeId} returnToInventory={returnToInventory} onPrintReady={handlePrintBill} companies={companies} jobIntakes={jobIntakes} />
                        })),
                        {
                            key: 'archive',
                            label: 'Archive',
                            children: (
                                <div className="glass-card" style={{ padding: 20 }}>
                                    <Table
                                        dataSource={pastInvoicesData}
                                        loading={loadingInvoices}
                                        pagination={{ ...invoicePagination, onChange: fetchInvoices }}
                                        columns={[
                                            { title: 'ID', dataIndex: 'id' },
                                            { title: 'Customer', dataIndex: 'customerName' },
                                            { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YYYY') },
                                            { title: 'Amount', dataIndex: 'netPayable', render: v => `৳${v.toLocaleString()}` },
                                            { title: 'Action', render: (_, r) => <Button size="small" onClick={() => handlePrintBill(r)}>Print</Button> }
                                        ]}
                                    />
                                </div>
                            )
                        }
                    ]}
                />
            </div>
        </ErrorBoundary>
    );
};

export default BillingPage;
