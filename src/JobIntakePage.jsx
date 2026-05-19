import React from 'react';
import {
    Card, Form, Input, Button, Typography, Row, Col,
    Space, Divider, List, Tag, message, theme, AutoComplete,
    Select, Table, Badge, Tooltip, Empty, Modal, ConfigProvider, Spin
} from 'antd';
import { Sparkles } from 'lucide-react';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { syncToLocalStorage, getFromLocalStorage } from './utils/helpers';
import SmartVoiceInput from './components/SmartVoiceInput';
import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';
import { t } from './utils/translations';
import { enhanceAutomotiveText, predictPartsFromComplaint } from './services/aiServiceV2';
import useVehicleAutoFill from './hooks/useVehicleAutoFill';
import { useAICorrection } from './hooks/useAICorrection';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

const JobIntakePage = () => {
    const { token } = theme.useToken();
    const { navigateTo, inventory, services, jobIntakes: intakes, setJobIntakes: setIntakes, customers, companies, lang } = useGlobalState();
    const { user: currentUser } = useAuth();
    const [form] = Form.useForm();
    const { lookupVehicle, notifyResult } = useVehicleAutoFill();
    
    const [vehicleContext, setVehicleContext] = React.useState('');
    const { handleBlurCorrection } = useAICorrection(form, vehicleContext);

    const [items, setItems] = React.useState([]);
    const [selectedCustomerId, setSelectedCustomerId] = React.useState(null);
    const [mechanics, setMechanics] = React.useState([]);
    const [loadingMechanics, setLoadingMechanics] = React.useState(true);
    const [submitting, setSubmitting] = React.useState(false);
    const [editingIntakeId, setEditingIntakeId] = React.useState(null);
    const [isEditModalVisible, setIsEditModalVisible] = React.useState(false);
    const [editingIntake, setEditingIntake] = React.useState(null);
    const [customerVehiclesOptions, setCustomerVehiclesOptions] = React.useState([]);
    const searchTimeoutRef = React.useRef(null);
    const [searching, setSearching] = React.useState(false);

    const loadMechanics = React.useCallback(async () => {
        // Only load if we have a valid auth context or after a short delay
        if (!currentUser) {
           console.log('[JobIntake] No current user found. Initializing retry in 1s...');
           setTimeout(loadMechanics, 1000);
           return;
        }

        setLoadingMechanics(true);
        try {
            console.log('[JobIntake-AUDIT] Fetching mechanics list with headers for user:', currentUser?.id);
            const allUsers = await databaseBridge.fetchUsers(currentUser);
            const staffMechanics = (allUsers || []).filter(u => {
                const role = String(u.role || '').toLowerCase();
                const dept = String(u.department || '').toLowerCase();
                const name = String(u.name || '').toLowerCase();
                // Broader check for mechanics/staff for production resilience
                return role === 'staff' || role === 'admin' || role === 'mechanic' || role === 'technician'
                    || dept.includes('engine') || dept.includes('water')
                    || dept.includes('ac') || dept.includes('electric')
                    || dept.includes('paint') || dept.includes('dent')
                    || dept.includes('mechanic') || name.includes('mechanic');
            });
            console.log(`[JobIntake-AUDIT] Found ${staffMechanics.length} mechanics in database.`);
            setMechanics(staffMechanics);
        } catch (err) {
            console.error('CRITICAL: Failed to load mechanics list from production API:', err);
            const status = err.response?.status;
            if (status === 401 || status === 403) {
                message.error('Session expired. Please re-login.');
            } else {
                message.warning(lang === 'bn' ? 'মেকানিক্স তালিকা লোড করা যায়নি (API Error)' : 'Could not load mechanics list! Check API connection.');
            }
        } finally {
            setLoadingMechanics(false);
        }
    }, [currentUser, lang]);

    React.useEffect(() => { loadMechanics(); }, [loadMechanics]);

    const handleAddItem = (type) => {
        setItems([...items, { id: Date.now(), type, name: '', quantity: 1, price: 0 }]);
    };
    const handleRemoveItem = (id) => setItems(items.filter(i => i.id !== id));
    const handleItemChange = (id, field, value) => {
        setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));
    };

    const handleSubmitIntake = async (values) => {
        setSubmitting(true);
        try {
            // AI Auto-Correction Logic
            const refinedComplaints = await enhanceAutomotiveText(values.complaints);
            const refinedObservations = await enhanceAutomotiveText(values.observations);

            if (editingIntakeId) {
                const updatedIntake = {
                    ...editingIntake,
                    ...values,
                    complaints: refinedComplaints || values.complaints,
                    observations: refinedObservations || values.observations,
                    items: items.map(it => ({ name: it.name, type: it.type, quantity: it.quantity, price: it.price })),
                    status: values.mechanicId ? (editingIntake.status === 'Pending' ? 'Inspecting' : editingIntake.status) : 'Pending'
                };
                
                if (values.address) updatedIntake.address = values.address;

                await databaseBridge.updateJobIntake(editingIntakeId, updatedIntake);
                setIntakes(prev => prev.map(i => i.id === editingIntakeId ? updatedIntake : i));
                
                setEditingIntake(null);
                setIsEditModalVisible(false);
                message.success(`Intake updated!`);
            } else {
                const newIntake = {
                    id: `INTAKE-${Date.now()}`,
                    customerId: selectedCustomerId,
                    vehicleNo: values.vehicleNo,
                    customerName: values.customerName || '',
                    phone: values.phone || '',
                    address: values.address || '',
                    complaints: refinedComplaints || values.complaints || '',
                    observations: refinedObservations || values.observations || '',
                    mechanicId: values.mechanicId || null,
                    items: items.map(it => ({ name: it.name, type: it.type, quantity: it.quantity, price: it.price })),
                    status: values.mechanicId ? 'Inspecting' : 'Pending',
                    createdAt: dayjs().toISOString()
                };
                
                await databaseBridge.updateJobIntake(newIntake.id, newIntake);
                setIntakes(prev => [newIntake, ...prev]);
                message.success(`Vehicle checked in!`);
            }
            form.resetFields();
            setItems([]);
        } catch (err) {
            console.error('Failed to submit intake:', err);
            message.error(lang === 'bn' ? 'সংরক্ষণ করতে ব্যর্থ হয়েছে!' : 'Failed to save intake to database.');
        } finally {
            setSubmitting(false);
        }
    };



    const handleEditIntake = (intake) => {
        setEditingIntake(intake);
        setEditingIntakeId(intake.id);
        setIsEditModalVisible(true);
        form.setFieldsValue({
            ...intake
        });
        setItems((intake.items || []).map((it, idx) => ({ ...it, id: Date.now() + idx })));
    };

    const handleMarkReady = (intakeId) => {
        setIntakes(prev => prev.map(i => i.id === intakeId ? { ...i, status: 'Ready' } : i));
        message.info('Inspection Complete.');
    };

    const handleSendToQuotation = (intake) => {
        const quotationData = {
            jobIntakeId: intake.id,
            clientName: intake.customerName,
            clientPhone: intake.phone,
            vehicleNo: intake.vehicleNo,
            notes: `Complaints: ${intake.complaints || 'None'}\nObservations: ${intake.observations || 'None'}`,
            items: (intake.items || []).map(it => ({
                name: it.name,
                type: it.type,
                quantity: it.quantity,
                price: it.price
            }))
        };
        syncToLocalStorage('pendingQuotationData', quotationData);
        // We don't filter it out here, let the user decide when it's done or move it to a 'Linked' status
        message.success('Redirecting to Quotation...');
        if (navigateTo) navigateTo('quotations');
    };

    const handleSendToJobCard = (intake) => {
        const jobCardData = {
            jobIntakeId: intake.id,
            vehicleNo: intake.vehicleNo,
            customerName: intake.customerName,
            phone: intake.phone,
            description: intake.complaints || '',
            departmentsInvolved: []
        };
        syncToLocalStorage('pendingJobCardFromIntake', jobCardData);
        message.success('Redirecting to Job Card...');
        if (navigateTo) navigateTo('job-cards');
    };

    const activeMechanics = (intakes || [])
        .filter(i => i && i.mechanicId && i.status === 'Inspecting')
        .map(i => {
            const mech = (mechanics || []).find(m => m.id === i.mechanicId);
            return { name: mech?.name || 'Unknown Specialist', vehicleNo: i.vehicleNo || 'Unknown' };
        });

    const [searchedCustomers, setSearchedCustomers] = React.useState([]);

    const handleCustomerSearch = (query) => {
        if (!query || query.trim().length < 1) {
            setSearchedCustomers([]);
            return;
        }

        // Debounce search to prevent API spam
        if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
        
        setSearching(true);
        searchTimeoutRef.current = setTimeout(async () => {
            try {
                console.log(`[JobIntake] Searching database for: "${query}"`);
                const results = await databaseBridge.searchCustomers(query);
                setSearchedCustomers(results || []);
            } catch (error) {
                console.error("Error searching customers:", error);
            } finally {
                setSearching(false);
            }
        }, 300); // 300ms debounce
    };

    const handleCustomerNameChange = (val) => {
        if (!val) {
            setCustomerVehiclesOptions([]);
            setSelectedCustomerId(null);
            // Optional: reset dependent fields if needed
            // form.setFieldsValue({ phone: '', address: '' });
        }
    };

    const unifiedClientOptions = React.useMemo(() => {
        const intakesCustomers = (intakes || [])
            .filter(i => i.customerName)
            .map(i => ({
                id: i.customerId || i._id,
                name: i.customerName,
                phone: i.phone || '',
                address: i.address || '',
                vehicleNo: i.vehicleNo || '',
                type: 'Customer'
            }));
            
        const allCusts = [...searchedCustomers, ...(customers || []), ...intakesCustomers];
        const uniqueCustsMap = new Map();
        allCusts.forEach(c => { 
            const nameKey = (c?.name || c?.companyName || 'UNKNOWN').trim();
            if (nameKey && nameKey !== 'UNKNOWN') {
                const existing = uniqueCustsMap.get(nameKey);
                // Priority: Overwrite if current entry is missing address or phone but new one has it
                if (!existing || (c.address && !existing.address) || (c.phone && !existing.phone)) {
                    uniqueCustsMap.set(nameKey, c); 
                }
            }
        });
        const finalCusts = Array.from(uniqueCustsMap.values());

        const custOptions = finalCusts.map(c => ({
            value: c.name || 'Unknown Customer',
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000' }}>
                    <span>{c.name || 'Unknown'} <Tag size="small" color="blue">Customer</Tag></span>
                    <span style={{ fontSize: 12, color: '#888' }}>{c.phone}</span>
                </div>
            ),
            clientData: { ...c, type: 'Customer' }
        }));
        const compOptions = (companies || []).map(c => ({
            value: c.companyName || c.name || 'Unknown Company',
            label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000' }}>
                    <span>{c.companyName || c.name} <Tag size="small" color="purple">Company</Tag></span>
                    <span style={{ fontSize: 12, color: '#888' }}>{c.phone}</span>
                </div>
            ),
            clientData: { ...c, type: 'Company', name: c.companyName || c.name }
        }));
        return [...custOptions, ...compOptions];
    }, [customers, companies, searchedCustomers]);

    const allVehiclesOptions = React.useMemo(() => {
        const uniqueVehicles = new Set();
        (intakes || []).forEach(i => { if (i.vehicleNo) uniqueVehicles.add(i.vehicleNo) });
        (customers || []).forEach(c => { if (c.vehicleNo) uniqueVehicles.add(c.vehicleNo.toUpperCase()) });
        return Array.from(uniqueVehicles).map(v => ({ value: v }));
    }, [intakes, customers]);

    const handleClientSelect = async (value, option) => {
        const data = option.clientData;
        if (data) {
            console.log('[JobIntake] Selected client data:', data);
            const customerId = data.id || data._id || null;
            const customerName = data.name || data.companyName || value;
            setSelectedCustomerId(customerId);
            
            // 1. Immediate Auto-fill from selection data
            form.setFieldsValue({
                customerName: customerName,
                phone: data.phone || data.mobile || data.contact || '',
                address: data.address || ''
            });

            // 2. Fetch Deep Relational Data (Vehicles, precise Address)
            try {
                // Use ID if available, otherwise name
                const identifier = customerId || customerName;
                console.log(`[JobIntake] Triggering deep relational fetch for: ${identifier}`);
                
                const relData = await databaseBridge.fetchCustomerRelationalData(identifier);
                if (relData) {
                    console.log('[JobIntake] Received Relational Data:', relData);
                    
                    // Priority Update: Use relational data for fields if available
                    form.setFieldsValue({
                        address: relData.address || data.address || '',
                        phone: relData.phone || data.phone || data.mobile || ''
                    });

                    // 3. Vehicle Intelligence
                    const vehicleList = relData.vehicles || [];
                    if (vehicleList.length > 0) {
                        const opts = vehicleList.map(v => ({ value: String(v).toUpperCase() }));
                        setCustomerVehiclesOptions(opts);

                        // If exactly 1 vehicle, auto-fill it. 
                        // If multiple, auto-fill the most recent/first one to satisfy user "Auto Add" request.
                        if (vehicleList.length >= 1) {
                            const targetV = String(vehicleList[0]).toUpperCase();
                            console.log(`[JobIntake] Auto-filling primary/recent vehicle: ${targetV}`);
                            form.setFieldsValue({ vehicleNo: targetV });
                            handleVehicleLookup(targetV, true);
                            if (vehicleList.length === 1) {
                                message.success(lang === 'bn' ? `গাড়ি নম্বর ${targetV} পাওয়া গেছে` : `Vehicle ${targetV} auto-detected.`);
                            } else {
                                message.info(lang === 'bn' ? `সর্বশেষ গাড়ি ${targetV} সেট করা হয়েছে` : `Latest vehicle ${targetV} selected.`);
                            }
                        }
                    } else if (data.vehicleNo) {
                        // Fallback to basic data vehicle
                        const fallbackV = String(data.vehicleNo).toUpperCase();
                        setCustomerVehiclesOptions([{ value: fallbackV }]);
                        form.setFieldsValue({ vehicleNo: fallbackV });
                        handleVehicleLookup(fallbackV);
                    } else {
                        setCustomerVehiclesOptions([]);
                        // form.setFieldsValue({ vehicleNo: '' }); // Don't force clear if user might be typing new one
                    }
                }
            } catch (err) {
                console.error('[JobIntake] Relational fetch failed:', err);
            }
        }
    };

    const handleVehicleLookup = async (vNo, skipFormUpdate = false) => {
        if (!vNo) return;
        const result = await lookupVehicle(vNo);
        if (result && !skipFormUpdate) {
            const customerName = result.customerName || form.getFieldValue('customerName');
            const phone = result.phone || form.getFieldValue('phone');
            
            form.setFieldsValue({
                customerName: customerName || 'Anonymous Client',
                phone: phone || ''
            });
            notifyResult(result, vNo);

            // AUTO-FILL ADDRESS: Trigger deep relational fetch if we found a customer name
            if (customerName && customerName !== 'Anonymous Client') {
                try {
                    const relData = await databaseBridge.fetchCustomerRelationalData(customerName);
                    if (relData && relData.address) {
                        form.setFieldsValue({ address: relData.address });
                        if (relData.phone) form.setFieldsValue({ phone: relData.phone });
                    }
                } catch (err) {
                    console.error('[JobIntake] Relational fetch from vehicle lookup failed:', err);
                }
            }
        }
        
        // Fetch AI-Ready Context
        const summary = await databaseBridge.fetchVehicleServiceSummary(vNo);
        if (summary) {
            setVehicleContext(summary);
        } else {
            setVehicleContext('');
        }
    };

    return (
        <ConfigProvider
            theme={{
                algorithm: theme.defaultAlgorithm,
                token: {
                    colorText: '#1e293b',
                    colorBgContainer: '#ffffff',
                    colorBorder: '#cbd5e1',
                    borderRadius: 8,
                },
                components: {
                    Select: {
                        colorBgContainer: '#f8fafc',
                        colorText: '#000000',
                        colorTextPlaceholder: 'rgba(0, 0, 0, 0.45)',
                        selectorBg: '#f8fafc',
                    },
                    Input: {
                        colorBgContainer: '#f8fafc',
                        colorText: '#000000',
                    }
                }
            }}
        >
        {/* COMPREHENSIVE STYLE INJECTION FOR PREMIUM MINIMALIST THEME */}
        <style dangerouslySetInnerHTML={{ __html: `
            .dashboard-page {
                background: #ffffff !important;
                color: #1e293b !important;
            }
            .dashboard-page h1,
            .dashboard-page h2,
            .dashboard-page h3,
            .dashboard-page h4,
            .dashboard-page h5,
            .dashboard-page .ant-typography,
            .dashboard-page .ant-card-head-title,
            .dashboard-page .ant-descriptions-item-label,
            .dashboard-page label,
            .dashboard-page .ant-form-item-label label {
                color: #0f172a !important;
                font-weight: 700 !important;
            }
            
            /* Text styling for standard labels, info texts, description details to make sure they are NOT white */
            .dashboard-page .ant-form-item-label label,
            .dashboard-page .ant-empty-description,
            .dashboard-page .ant-descriptions-item-content {
                color: #1e293b !important;
            }

            /* Single 1px slate-tinted borders and clean backgrounds for all inputs, textareas, selectors, pickers */
            .dashboard-page input,
            .dashboard-page textarea,
            .dashboard-page .ant-input,
            .dashboard-page .ant-select-selector,
            .dashboard-page .ant-picker,
            .dashboard-page .ant-input-affix-wrapper,
            .dashboard-page .glass-input {
                border: 1px solid #cbd5e1 !important;
                border-radius: 8px !important;
                background-color: #f8fafc !important;
                color: #000000 !important;
                font-weight: 600 !important;
                box-shadow: none !important;
                outline: none !important;
                transition: border-color 0.2s ease, box-shadow 0.2s ease !important;
            }

            /* Active focus border coloring */
            .dashboard-page input:focus,
            .dashboard-page textarea:focus,
            .dashboard-page .ant-input-focused,
            .dashboard-page .ant-select-focused .ant-select-selector,
            .dashboard-page .ant-picker-focused {
                border-color: #003399 !important;
                box-shadow: 0 0 0 2px rgba(0, 51, 153, 0.1) !important;
                background-color: #ffffff !important;
            }

            .dashboard-page .glass-card {
                background: #ffffff !important;
                border: 1px solid #cbd5e1 !important;
                border-radius: 12px !important;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.05) !important;
                margin-bottom: 24px !important;
                padding: 24px !important;
            }
            
            .dashboard-page .ant-tag {
                background-color: #eff6ff !important;
                color: #1e40af !important;
                border: 1px solid #bfdbfe !important;
                font-weight: 700 !important;
            }

            /* Clear & visible premium button styling with Royal Blue and white text */
            .dashboard-page button.ant-btn,
            .dashboard-page .ant-btn,
            .dashboard-page button {
                display: inline-flex !important;
                align-items: center !important;
                justify-content: center !important;
                font-weight: 700 !important;
                border-radius: 8px !important;
                transition: all 0.2s ease-in-out !important;
            }

            /* Specifically styling the primary / royal blue buttons to override any default black colors */
            .dashboard-page button.ant-btn-primary,
            .dashboard-page .ant-btn-primary,
            .dashboard-page button[type="submit"] {
                background-color: #003399 !important;
                background: #003399 !important;
                border: none !important;
                color: #ffffff !important;
                box-shadow: 0 4px 12px rgba(0, 51, 153, 0.15) !important;
            }

            .dashboard-page button.ant-btn-primary:hover,
            .dashboard-page .ant-btn-primary:hover,
            .dashboard-page button[type="submit"]:hover {
                background-color: #002266 !important;
                background: #002266 !important;
                color: #ffffff !important;
            }

            /* Force all text inside our buttons to render as bold white */
            .dashboard-page button.ant-btn-primary span,
            .dashboard-page .ant-btn-primary span,
            .dashboard-page button[type="submit"] span,
            .dashboard-page button.ant-btn-primary *,
            .dashboard-page .ant-btn-primary *,
            .dashboard-page button[type="submit"] * {
                color: #ffffff !important;
                font-weight: 700 !important;
            }
        `}} />
        <div className="dashboard-page" style={{ maxWidth: 1400, margin: '0 auto', padding: '0 8px' }}>
            <div style={{ marginBottom: 32, textAlign: 'center' }}>
                <Title level={1} style={{ margin: 0, fontWeight: 700, color: '#0f172a', letterSpacing: '0.2px' }}>
                    {t('checkin_desk', lang)}
                </Title>
                <Text style={{ color: '#003399', fontWeight: 600, letterSpacing: '0.2px' }}>{lang === 'bn' ? 'প্রিমিয়াম গাড়ি গ্রহণ ও ডায়াগনস্টিক' : 'Premium vehicle reception & diagnostics'}</Text>
            </div>

            {activeMechanics.length > 0 && (
                <div className="glass-card" style={{ marginBottom: 24, padding: '15px' }}>
                    <div className="checkin-desk-grid">
                        {activeMechanics.map((m, idx) => (
                            <div key={idx} style={{ borderLeft: '2px solid #003399', paddingLeft: 12 }}>
                                <div style={{ fontSize: 10, color: '#003399', fontWeight: 700 }}>{t('active_inspection', lang)}</div>
                                <div style={{ color: '#1e293b', fontWeight: 600 }}>{m.name} // {m.vehicleNo}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="checkin-desk-grid">
                <div className="glass-card" style={{ padding: '30px' }}>
                    <Title level={4} style={{ color: '#003399', fontWeight: 700, marginBottom: 24, borderBottom: '1px solid #cbd5e1', paddingBottom: 10 }}>{t('new_registration', lang)}</Title>
                    <Form form={form} layout="vertical" onFinish={handleSubmitIntake}>
                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="vehicleNo" label={<Text style={{ color: '#003399', fontWeight: 700, fontSize: 13, letterSpacing: '0.5px' }}>{t('vehicle_registration_number', lang)}</Text>}>
                                    <AutoComplete 
                                        className="glass-input"
                                        options={customerVehiclesOptions.length > 0 ? customerVehiclesOptions : allVehiclesOptions}
                                        placeholder="DHAKA METRO-XX-00-0000" 
                                        allowClear
                                        onSelect={(val) => handleVehicleLookup(val)}
                                        onBlur={(e) => handleVehicleLookup(e.target.value)}
                                        filterOption={(inputValue, option) =>
                                            option && option.value && String(option.value).toLowerCase().indexOf(String(inputValue || '').toLowerCase()) !== -1
                                        }
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="customerName" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('customer_company_name', lang)}</Text>}>
                                    <AutoComplete 
                                        className="glass-input"
                                        options={unifiedClientOptions}
                                        placeholder={t('type_customer_name', lang)}
                                        onSearch={handleCustomerSearch}
                                        onSelect={(val, option) => handleClientSelect(val, option)}
                                        filterOption={(inputValue, option) =>
                                            option && option.value && String(option.value).toLowerCase().indexOf(String(inputValue || '').toLowerCase()) !== -1
                                        }
                                        onChange={(val) => handleCustomerNameChange(val)}
                                        notFoundContent={searching ? <div style={{ textAlign: 'center', padding: '8px' }}><Spin size="small" /> Searching...</div> : null}
                                    >
                                        <Input 
                                            className="glass-input"
                                            autoComplete="off"
                                            allowClear
                                            suffix={searching ? <Spin size="small" /> : null}
                                        />
                                    </AutoComplete>
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={12}>
                                <Form.Item name="phone" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('contact_phone', lang)}</Text>}>
                                    <Input 
                                        placeholder="01777888999" 
                                        allowClear 
                                        onBlur={async (e) => {
                                            const phone = e.target.value;
                                            if (phone && phone.length >= 10 && !form.getFieldValue('customerName')) {
                                                try {
                                                    const relData = await databaseBridge.fetchCustomerRelationalData(phone);
                                                    if (relData) {
                                                        form.setFieldsValue({
                                                            customerName: relData.customerName || '',
                                                            address: relData.address || ''
                                                        });
                                                        if (relData.vehicles && relData.vehicles.length > 0) {
                                                            setCustomerVehiclesOptions(relData.vehicles.map(v => ({ value: v.toUpperCase() })));
                                                        }
                                                    }
                                                } catch (err) {
                                                    console.error('[JobIntake] Phone relational lookup failed:', err);
                                                }
                                            }
                                        }}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="address" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{lang === 'bn' ? 'ঠিকানা' : 'Address'}</Text>}>
                                    <Input placeholder={lang === 'bn' ? 'ঠিকানা লিখুন...' : 'Enter address...'} allowClear />
                                </Form.Item>
                            </Col>
                        </Row>

                        <Row gutter={24}>
                            <Col span={24}>
                                <Form.Item name="mechanicId" label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('assign_specialist', lang)}</Text>}>
                                    <Select 
                                        className="force-black-text"
                                        showSearch
                                        optionFilterProp="children"
                                        placeholder={lang === 'bn' ? 'বিশেষজ্ঞ নির্বাচন করুন...' : "Select luxury car specialist..."} 
                                        style={{ width: '100%' }}
                                        dropdownStyle={{ backgroundColor: '#ffffff', color: '#000000' }}
                                        loading={loadingMechanics}
                                    >
                                        {mechanics.map(m => (
                                            <Option key={m.id} value={m.id}>
                                                <span style={{ color: '#000000' }}>
                                                    {m.name || ""} [{m.department || "General"}]
                                                </span>
                                            </Option>
                                        ))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>

                        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div style={{ flex: 1 }}>
                                <Form.Item name="complaints" style={{ margin: 0 }} label={<Text style={{ color: '#0f172a', fontWeight: 700, fontSize: 13 }}>{t('customer_complaint', lang)}</Text>}>
                                    <SmartVoiceInput 
                                        isTextArea 
                                        rows={3} 
                                        autoRefine 
                                        placeholder={lang === 'bn' ? 'কাস্টমারের অভিযোগ লিখুন...' : 'Enter customer complaints...'} 
                                        onBlur={(e) => handleBlurCorrection('complaints', e.target.value, 'notes')}
                                    />
                                </Form.Item>
                            </div>
                            <Tooltip title={lang === 'bn' ? 'এআই দিয়ে সংশোধন করুন' : 'Refine with AI'}>
                                <Button 
                                    icon={<Sparkles size={16} />} 
                                    onClick={async () => {
                                         const current = form.getFieldValue('complaints');
                                         if (current) {
                                             const refined = await enhanceAutomotiveText(current, vehicleContext);
                                             form.setFieldsValue({ complaints: refined });
                                         }
                                     }}
                                    style={{ height: '45px', background: 'rgba(0, 51, 153, 0.05)', border: '1px solid rgba(0, 51, 153, 0.2)', color: '#003399', marginTop: '29px' }}
                                />
                            </Tooltip>
                        </div>

                        <Button
                            type="primary"
                            size="large"
                            block
                            htmlType="submit"
                            loading={submitting}
                            className="btn-commit-service"
                            style={{ height: 55, fontSize: 14, fontWeight: 700, backgroundColor: '#003399', border: 'none', borderRadius: '8px', marginTop: 20, color: '#ffffff', letterSpacing: '0.2px' }}
                        >
                            {t('commit_to_service', lang)}
                        </Button>
                    </Form>
                </div>

                <div className="glass-card" style={{ padding: '30px' }}>
                    <Title level={4} style={{ color: '#003399', fontWeight: 700, marginBottom: 24, borderBottom: '1px solid #cbd5e1', paddingBottom: 10 }}>{t('current_operations_queue', lang)}</Title>
                    { (intakes || []).length === 0 ? (
                        <Empty description={<Text style={{ color: '#64748b', fontWeight: 600 }}>{t('no_vehicles_in_queue', lang)}</Text>} />
                    ) : (
                        <div style={{ display: 'grid', gap: 16 }}>
                            {intakes.filter(Boolean).map(intake => (
                                <div key={intake.id} className="glass-card" style={{ padding: '20px', border: '1px solid #cbd5e1', position: 'relative' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 }}>
                                        <div>
                                            <div style={{ fontSize: 18, fontWeight: 700, color: '#003399', letterSpacing: '0.2px' }}>{intake.vehicleNo}</div>
                                            <div style={{ fontSize: 11, color: '#0f172a', fontWeight: 700, marginTop: 4 }}>{intake.customerName || (lang === 'bn' ? 'নামহীন গ্রাহক' : 'Anonymous Client')}</div>
                                        </div>
                                        <Tag style={{ background: intake.status === 'Ready' ? '#10b981' : '#003399', color: '#FFFFFF', border: 'none', borderRadius: '4px', fontWeight: 700, fontSize: 10 }}>{t(intake.status?.toLowerCase() || 'pending', lang)}</Tag>
                                    </div>
                                    <div style={{ display: 'flex', gap: 20, marginBottom: 15 }}>
                                        <div>
                                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, opacity: 0.8 }}>Specialist</div>
                                            <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{mechanics.find(m => m.id === intake.mechanicId)?.name || 'Unassigned'}</div>
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 9, color: '#64748b', fontWeight: 700, opacity: 0.8 }}>Diagnostics</div>
                                            <div style={{ fontSize: 12, color: '#0f172a', fontWeight: 600 }}>{(intake.items || []).length} Findings</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <Button size="small" type="primary" onClick={() => handleEditIntake(intake)} style={{ backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', fontSize: 10, visibility: 'visible' }}>{t('analyze', lang)}</Button>
                                        
                                        <Button size="small" type="primary" onClick={() => handleSendToJobCard(intake)} style={{ backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', fontSize: 10, visibility: 'visible' }}>{lang === 'bn' ? 'জব কার্ড তৈরি করুন' : 'Generate Job Card'}</Button>

                                        {intake.status === 'Ready' && (
                                            <Button size="small" type="primary" onClick={() => handleSendToQuotation(intake)} style={{ backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', fontSize: 10, visibility: 'visible' }}>{t('proceed_to_quote', lang)}</Button>
                                        )}
                                        {intake.status === 'Inspecting' && (
                                            <Button size="small" type="primary" onClick={() => handleMarkReady(intake.id)} style={{ backgroundColor: '#003399', color: '#ffffff', fontWeight: 700, borderRadius: '8px', border: 'none', fontSize: 10, visibility: 'visible' }}>{t('complete_inspection', lang)}</Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <Modal
                title={`${t('diagnostic_override', lang)} — ${editingIntake?.vehicleNo}`}
                open={isEditModalVisible}
                onCancel={() => { setIsEditModalVisible(false); setEditingIntake(null); setEditingIntakeId(null); form.resetFields(); setItems([]); }}
                footer={null}
                width={800}
                className="luxury-modal"
            >
                <Form form={form} layout="vertical" onFinish={handleSubmitIntake}>
                    <Row gutter={24}>
                        <Col span={12}>
                            <Form.Item name="vehicleNo" label="Registration"><Input className="glass-input" /></Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="mechanicId" label="Assigned specialist">
                                <Select className="glass-select">
                                    {mechanics.map(m => <Option key={m.id} value={m.id}>{m.name}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="complaints" label="Findings"><TextArea rows={4} className="glass-input" /></Form.Item>
                    
                    <Divider style={{ borderColor: '#cbd5e1' }}>Pre-estimation items</Divider>
                    <div style={{ marginBottom: 15 }}>
                        <Button size="small" onClick={() => handleAddItem('Part')} style={{ marginRight: 10, backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontWeight: 700, borderRadius: '8px' }}>+ Part</Button>
                        <Button size="small" onClick={() => handleAddItem('Service')} style={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontWeight: 700, borderRadius: '8px' }}>+ Service</Button>
                    </div>
                    {items.map(item => (
                        <Row key={item.id} gutter={8} style={{ marginBottom: 10 }}>
                            <Col span={12}>
                                <Input value={item.name} onChange={v => handleItemChange(item.id, 'name', v.target.value)} placeholder="Item Name" className="glass-input" />
                            </Col>
                            <Col span={2}>
                                <Tooltip title="AI Fix">
                                    <Button 
                                        icon={<Sparkles size={12} />} 
                                        size="small"
                                        onClick={async () => {
                                            const refined = await enhanceAutomotiveText(item.name);
                                            handleItemChange(item.id, 'name', refined);
                                        }}
                                        style={{ height: '38px', width: '100%', background: 'rgba(0, 51, 153, 0.05)', border: '1px solid rgba(0, 51, 153, 0.2)', color: '#003399' }}
                                    />
                                </Tooltip>
                            </Col>
                            <Col span={4}><Input type="number" value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', Number(e.target.value) || 1)} className="glass-input" /></Col>
                            <Col span={6}><Button type="text" danger onClick={() => handleRemoveItem(item.id)} style={{ fontWeight: 700 }}>Remove</Button></Col>
                        </Row>
                    ))}

                    <Button
                        type="primary"
                        size="large"
                        block
                        htmlType="submit"
                        loading={submitting}
                        style={{ height: 50, fontSize: 13, fontWeight: 700, backgroundColor: '#003399', border: 'none', color: '#FFFFFF', borderRadius: '8px', marginTop: 20 }}
                    >
                        Commit updates
                    </Button>
                </Form>
            </Modal>
            <style dangerouslySetInnerHTML={{ __html: `
                .luxury-modal .ant-modal-content {
                    background: #ffffff !important;
                    border: 1px solid #cbd5e1 !important;
                }
                .luxury-modal .ant-modal-header {
                    background: transparent !important;
                    border-bottom: 1px solid #cbd5e1 !important;
                }
                .luxury-modal .ant-modal-title {
                    color: #000000 !important;
                    font-weight: 800 !important;
                }
            `}} />
        </div>
        </ConfigProvider>
    );
};

export default JobIntakePage;





