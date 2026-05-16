import React from 'react';
import { createPortal } from 'react-dom';
import { bufferedPrint } from './utils/printAssistant';
import { Card, Button, Table, Modal, Form, Input, InputNumber, Typography, Space, message, Tag, Row, Col, Radio, Select, Alert, Tabs, DatePicker, ConfigProvider, theme as antTheme } from 'antd';
import { MessageOutlined, CopyOutlined } from '@ant-design/icons';
import { QRCodeCanvas } from 'qrcode.react';
// logo import removed

import { useGlobalState } from './contexts/GlobalStateContext';
import { formatCurrency } from './utils/helpers';
import databaseBridge from './services/databaseBridge';
import dayjs from 'dayjs';
import { getPortalLoginUrl } from './utils/appConfig';
import { useAICorrection } from './hooks/useAICorrection';
import { useAuth } from './contexts/AuthContext';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import LuxuryCarWatermarkSVG from './components/LuxuryCarWatermarkSVG';
import toWords from './utils/numberToWords';
import { professionalPrintTranslate } from './utils/translationMiddleware';
import logo from './assets/logo-dark.png';
import './BillingPage.css';

const { Title, Text } = Typography;

const HISTORY_URL_PREFIX = 'https://ai-coding-nu.vercel.app/#/history?v=';
const STICKER_PREVIEW_LIMIT = 36;

const formatVehicleHistoryUrl = (vehicleNo) => `${HISTORY_URL_PREFIX}${encodeURIComponent(vehicleNo || '')}`;

const defaultCustomers = [
    {
        id: '1',
        name: 'Rahim Uddin',
        phone: '01711000000',
        vehicleNo: 'DHA-11-2034',
        balance: -1500, // Negative means they owe money (Due)
        lastUpdated: dayjs().subtract(2, 'day').toISOString()
    },
    {
        id: '2',
        name: 'Karim Hasan',
        phone: '01822000000',
        vehicleNo: 'CTX-44-9988',
        balance: 500, // Positive means advance paid
        lastUpdated: dayjs().toISOString()
    }
];

const CustomersPage = () => {
    // State for Customers (initialized from Global State)
    const { user } = useAuth();
    const { customers, setCustomers, savedBills, setSavedBills, payments, setPayments, updateCustomerLedger, navigateTo, generateSafeId, jobs, fetchCustomersPaged } = useGlobalState();

    const [searchText, setSearchText] = React.useState('');
    const [pageData, setPageData] = React.useState([]);
    const [pagination, setPagination] = React.useState({ current: 1, pageSize: 12, total: 0 });
    const [loadingTable, setLoadingTable] = React.useState(false);
    const [syncLoading, setSyncLoading] = React.useState(false);

    const fetchPagedData = React.useCallback(async (page, pageSize, search) => {
        setLoadingTable(true);
        try {
            const result = await fetchCustomersPaged(page, pageSize, search);
            if (!result || !result.data) {
                console.warn("[CustomersPage] No data returned from fetchCustomersPaged", result);
                setPageData([]);
                return;
            }
            setPageData(result.data);
            setPagination({
                current: result.pagination?.page || page,
                pageSize: result.pagination?.limit || pageSize,
                total: result.pagination?.total || 0
            });
        } catch (error) {
            message.error("Failed to load customers");
        } finally {
            setLoadingTable(false);
        }
    }, [fetchCustomersPaged]);

    React.useEffect(() => {
        fetchPagedData(pagination.current, pagination.pageSize, searchText);
    }, [pagination.current, pagination.pageSize, searchText, fetchPagedData]);

    const handleTableChange = (newPagination) => {
        setPagination(newPagination);
    };

    const [isCustomerModalVisible, setIsCustomerModalVisible] = React.useState(false);
    const [isTransactionModalVisible, setIsTransactionModalVisible] = React.useState(false);
    const [isPayDueModalVisible, setIsPayDueModalVisible] = React.useState(false);
    const [advanceSubmitting, setAdvanceSubmitting] = React.useState(false);
    const [selectedCustomer, setSelectedCustomer] = React.useState(null);

    // Login Creation State
    const [isLoginModalVisible, setIsLoginModalVisible] = React.useState(false);
    const [generatedCredentials, setGeneratedCredentials] = React.useState(null);
    const [isGenerating, setIsGenerating] = React.useState(false);
    const [registeredUsers, setRegisteredUsers] = React.useState([]);

    React.useEffect(() => {
        const fetchUsers = async () => {
            try {
                const users = await databaseBridge.fetchUsers(user);
                setRegisteredUsers(users);
            } catch (error) {
                console.error("Failed to fetch registered users", error);
            }
        };
        fetchUsers();
    }, [user]);

    const [customerForm] = Form.useForm();
    const [transactionForm] = Form.useForm();
    const [payDueForm] = Form.useForm();
    const [monthWiseForm] = Form.useForm();
    const [advanceForm] = Form.useForm();
    const [paymentTab, setPaymentTab] = React.useState('bill-wise');
    const [selectedBillsToPay, setSelectedBillsToPay] = React.useState([]);

    const [isHistoryModalVisible, setIsHistoryModalVisible] = React.useState(false);
    const [customerHistory, setCustomerHistory] = React.useState([]);
    const [isInvoiceModalVisible, setIsInvoiceModalVisible] = React.useState(false);
    const [selectedInvoice, setSelectedInvoice] = React.useState(null);
    const [printingBill, setPrintingBill] = React.useState(null);
    const [isQrModalVisible, setIsQrModalVisible] = React.useState(false);
    const [qrData, setQrData] = React.useState('');
    const [isStickerModalVisible, setIsStickerModalVisible] = React.useState(false);
    const [selectedStickerRows, setSelectedStickerRows] = React.useState([]);

    const { handleBlurCorrection } = useAICorrection(customerForm);

    const handleWhatsAppSend = (credentials) => {
        if (!credentials || !credentials.phone) {
            message.error("Phone number missing for WhatsApp.");
            return;
        }

        // 1. Normalize Phone: remove non-digits
        let cleanPhone = credentials.phone.replace(/\D/g, '');
        // Default to Bangladesh country code if starts with 0
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '88' + cleanPhone;
        }

        // 2. Format Message
        const appUrl = getPortalLoginUrl();
        const msg = `Hello ${credentials.name}, welcome to Mamun Automobiles. Your Login ID is ${credentials.email} and temporary password is ${credentials.password}. Link: ${appUrl}`;

        // 3. Open WhatsApp Web
        const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
        window.open(waUrl, '_blank');

        // 4. Feedback
        message.info(`WhatsApp message prepared for ${credentials.name}`);
    };

    const handleEmailBlur = async (e) => {
        const email = e.target.value;
        if (!email || !email.includes('@')) return;

        const currentName = customerForm.getFieldValue('name');
        if (!currentName) {
            const prefix = email.split('@')[0];
            const formattedName = prefix
                .split(/[._-]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
            
            customerForm.setFieldsValue({ name: formattedName });
            await handleBlurCorrection('name', formattedName, 'name');
        }
    };


    // Calculate live balance for a customer directly from global mamun_auto_data
    const calculateLiveBalance = (customer) => {
        if (!customer) return 0;
        // 1. Total Unpaid Due from Bills
        const customerBills = (savedBills || []).filter(b =>
            b.customerId === customer.id ||
            (b.customerName && b.phone && b.customerName.toLowerCase() === customer.name.toLowerCase() && b.phone === customer.phone)
        );
        const totalDue = customerBills.reduce((sum, b) => sum + (Number(b.due) || 0), 0);

        // 2. Total Unallocated Payments (like advance or direct pay from Accounts page)
        const customerPayments = (payments || []).filter(p =>
            (!p.invoiceId) &&
            (p.customerId === customer.id || (p.customerName && p.customerName.toLowerCase() === customer.name.toLowerCase() && p.phone === customer.phone))
        );
        const totalPayments = customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

        // Balance = Payments - Due + InitialBalance
        const initial = customer.initialBalance || 0;
        return initial + totalPayments - totalDue;
    };

    // Filtering Customers based on search
    const filteredCustomers = (customers || []).filter(c =>
        c?.name?.toLowerCase()?.includes(searchText.toLowerCase()) ||
        c?.phone?.includes(searchText) ||
        c?.vehicleNo?.toLowerCase()?.includes(searchText.toLowerCase())
    );

    const stickerDataset = React.useMemo(() => {
        const source = (pageData && pageData.length > 0) ? pageData : (customers || []);
        const availableCustomers = source.filter(c => c?.vehicleNo || c?.vehicleNumber);
        if (selectedStickerRows.length === 0) return availableCustomers;
        const selectedKeys = new Set(selectedStickerRows);
        const selectedCustomers = availableCustomers.filter(c => selectedKeys.has(`${c.id}`));
        return selectedCustomers.length > 0 ? selectedCustomers : availableCustomers;
    }, [filteredCustomers, selectedStickerRows]);

    const stickerPreviewItems = stickerDataset.slice(0, STICKER_PREVIEW_LIMIT);
    const stickerPreviewTruncated = stickerDataset.length > stickerPreviewItems.length;
    
    // Diagnostic logging
    console.log('[StickerModal] Data Stats:', {
        pageDataLength: pageData?.length,
        customersLength: customers?.length,
        stickerDatasetLength: stickerDataset.length,
        selectedRows: selectedStickerRows.length
    });

    const stickerSelectionSummary = selectedStickerRows.length > 0
        ? `${selectedStickerRows.length} vehicle(s) locked for sticker printing.`
        : `Printing ${stickerDataset.length} vehicles from the current list.`;

    // Columns for Customer Table
    const columns = [
        {
            title: 'Customer Name',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <Button type="link" style={{ padding: 0, fontWeight: 600 }} onClick={() => openCustomerHistory(record)}>
                    {text}
                </Button>
            ),
            sorter: (a, b) => a.name.localeCompare(b.name)
        },
        {
            title: 'Phone Number',
            dataIndex: 'phone',
            key: 'phone',
        },
        {
            title: 'Vehicle Number',
            dataIndex: 'vehicleNo',
            key: 'vehicleNo',
            render: (text) => <span className="glass-tag" style={{ background: 'rgba(59,130,246,0.1)', color: '#3B82F6', border: '1px solid rgba(59,130,246,0.3)', padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>{text}</span>,
        },
        {
            title: 'Current Balance',
            key: 'balance',
            render: (_, record) => {
                const balance = calculateLiveBalance(record);
                return (
                    <Text type={balance < 0 ? 'danger' : balance > 0 ? 'success' : 'secondary'} strong>
                        ৳ {formatCurrency(Math.abs(balance || 0))} {balance < 0 ? '(Due)' : balance > 0 ? '(Advance)' : ''}
                    </Text>
                );
            },
            sorter: (a, b) => calculateLiveBalance(a) - calculateLiveBalance(b)
        },
        {
            title: 'Last Updated',
            dataIndex: 'lastUpdated',
            key: 'lastUpdated',
            render: (date) => dayjs(date).format('DD MMM, YYYY')
        },
        {
            title: 'Service Flow',
            key: 'qr',
            render: (_, record) => (
                <Button
                    size="small"
                    onClick={() => {
                        const historyUrl = `https://ai-coding-nu.vercel.app/#/history?v=${record.vehicleNo}`;
                        setQrData(historyUrl);
                        setSelectedCustomer(record);
                        setIsQrModalVisible(true);
                    }}
                    style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                >
                    QR Code
                </Button>
            )
        },

        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => {
                const liveBalance = calculateLiveBalance(record);
                return (
                    <Space>
                        {liveBalance < 0 && (
                            <Button
                                size="small"
                                onClick={() => {
                                    setSelectedCustomer({ ...record, liveBalance });
                                    setIsPayDueModalVisible(true);
                                }}
                                style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0 }}
                            >
                                Settle Bills
                            </Button>
                        )}
                        {(() => {
                            const existingUser = registeredUsers.find(u => u.phone === record.phone && u.role === 'Customer');
                            if (existingUser) {
                                return (
                                    <Button
                                        size="small"
                                        onClick={() => {
                                            message.info("This user already has an account. Redirecting to User Management...");
                                            navigateTo('12');
                                        }}
                                        style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                                    >
                                        Manage Login
                                    </Button>
                                );
                            } else {
                                return (
                                    <Button
                                        size="small"
                                        onClick={() => handleCreateLogin(record)}
                                        loading={isGenerating}
                                        style={{ background: 'transparent', border: '1px solid #3B82F6', color: '#3B82F6', fontWeight: 600, borderRadius: 0 }}
                                    >
                                        Create Login
                                    </Button>
                                );
                            }
                        })()}
                        <Button
                            size="small"
                            onClick={() => openTransactionModal(record)}
                            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.2)', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                        >
                            + Transaction
                        </Button>
                    </Space>
                );
            },
        },
    ];

    const rowSelection = {
        selectedRowKeys: selectedStickerRows,
        onChange: (keys) => setSelectedStickerRows(keys.map(key => `${key}`)),
        getCheckboxProps: (record) => ({
            disabled: !record?.vehicleNo
        })
    };

    // Handlers
    const handleCreateLogin = async (customer) => {
        setIsGenerating(true);
        try {
            // Priority: Use existing Gmail if available, otherwise fallback to name-based generation
            const generatedEmail = customer.email || (() => {
                const baseName = customer.name.replace(/[^a-zA-Z]/g, '').toLowerCase() || 'customer';
                const phoneDigits = customer.phone.replace(/\D/g, '').slice(-4) || Math.floor(1000 + Math.random() * 9000);
                return `${baseName}${phoneDigits}@gmail.com`;
            })();
            
            const generatedPassword = Math.random().toString(36).slice(-8);

            // Create user document using MongoDB bridge
            const newUser = {
                name: customer.name,
                email: generatedEmail,
                password: generatedPassword,
                phone: customer.phone,
                role: 'Customer',
                status: 'Active'
            };

            await databaseBridge.addUser(newUser, user);

            // Refresh local state to immediately update button to "Manage Login"
            setRegisteredUsers(prev => [...prev, newUser]);

            setGeneratedCredentials({ 
                email: generatedEmail, 
                password: generatedPassword, 
                name: customer.name,
                phone: customer.phone
            });
            setIsLoginModalVisible(true);
            message.success("Customer Login created and synced to User Management.");
        } catch (error) {
            console.error(error);
            message.error("Failed to create login: " + error.message);
        } finally {
            setIsGenerating(false);
        }
    };

    const openCustomerHistory = (customer) => {
        setSelectedCustomer(customer);
        const historyBills = (savedBills || []).filter(b =>
            b.customerId === customer.id ||
            (b.customerName && b.phone && b.customerName.toLowerCase() === customer.name.toLowerCase() && b.phone === customer.phone)
        );
        const historyJobs = (jobs || []).filter(j =>
            j.customerId === customer.id ||
            (j.customerName && j.phone && j.customerName.toLowerCase() === customer.name.toLowerCase() && j.phone === customer.phone)
        );
        setCustomerHistory({ bills: historyBills, jobs: historyJobs });
        setIsHistoryModalVisible(true);
    };

    const openInvoiceDetail = (invoice) => {
        setSelectedInvoice(invoice);
        setIsInvoiceModalVisible(true);
    };

        const handlePrintInvoice = (invoice) => {
        setPrintingBill(invoice);
        bufferedPrint();
    };

        const handleStickerPrint = () => {
        if (!stickerDataset.length) {
            message.warning('Add vehicles to the sticker layout before printing.');
            return;
        }
        
        document.body.classList.add('sticker-printing');
        bufferedPrint(() => {
            document.body.classList.remove('sticker-printing');
        });
    };

    const handleAddCustomer = async (values) => {
        const password = "1234"; // Default password as frequently used for initial setup
        const email = values.email ? values.email.trim().toLowerCase() : '';
        
        const newCustomer = {
            id: generateSafeId('CUST'),
            name: values.name,
            phone: values.phone,
            email: email,
            vehicleNo: values.vehicleNo,
            initialBalance: values.initialBalance || 0,
            balance: values.initialBalance || 0,
            nextServiceDate: values.nextServiceDate ? values.nextServiceDate.toISOString() : null,
            lastUpdated: dayjs().toISOString()
        };

        try {
            // Automatically create a Login User for this customer if email is provided
            if (email) {
                const newUser = {
                    id: 'USR-' + Date.now(),
                    name: values.name,
                    email: email,
                    password: password,
                    role: 'Customer',
                    status: 'Active',
                    phone: values.phone
                };
                await databaseBridge.addUser(newUser, user);
                if (typeof setRegisteredUsers === 'function') {
                    setRegisteredUsers(prev => [...prev, newUser]);
                }
            }

            setCustomers([newCustomer, ...(customers || [])]);
            setIsCustomerModalVisible(false);
            customerForm.resetFields();
            
            if (email) {
                setGeneratedCredentials({ 
                    email: email, 
                    password: password, 
                    name: values.name, 
                    phone: values.phone 
                });
                setIsLoginModalVisible(true);
                message.success("Customer and Login Account created!");
            } else {
                message.success("New customer added successfully!");
            }
        } catch (error) {
            console.error('Customer/User creation error:', error);
            const backendMsg = error?.response?.data?.message || error.message;
            message.error("Failed to create customer/login: " + backendMsg);
        }
    };

    const openTransactionModal = (customer) => {
        setSelectedCustomer(customer);
        setIsTransactionModalVisible(true);
    };

    const handleAddTransaction = (values) => {
        // value.type = 'payment' (customer pays us) or 'bill' (we charge customer)
        const amount = values.amount;
        const type = values.type; // 'payment' or 'bill'

        // Use the global centralized method to update customer ledgers
        // If type === 'bill', it's a due amount (+). If 'payment', it's a paid amount (- dueAmount)
        updateCustomerLedger({
            customerName: selectedCustomer.name,
            phone: selectedCustomer.phone,
            vehicleNo: selectedCustomer.vehicleNo,
            dueAmount: type === 'bill' ? amount : -amount
        });

        // === Sync with Dashboard via Global Context ===
        const isoDate = new Date().toISOString();
        if (type === 'payment') {
            const newPayment = {
                id: generateSafeId('PAY'),
                customerId: selectedCustomer.id,
                amount: amount,
                date: isoDate
            };
            setPayments([...(payments || []), newPayment]);
        } else if (type === 'bill') {
            const newBill = {
                id: generateSafeId('INV'),
                customerId: selectedCustomer.id,
                amount: amount,
                paid: 0,
                due: amount,
                date: isoDate
            };
            setSavedBills([...(savedBills || []), newBill]);
        }

        message.success(`Transaction of ৳${amount} recorded successfully.`);
        setIsTransactionModalVisible(false);
        transactionForm.resetFields();
        setSelectedCustomer(null);
    };

    // Derived Pending Bills for Flexible Payment
    const pendingBills = Array.isArray(savedBills) && selectedCustomer
        ? savedBills.filter(b =>
            (b.customerId === selectedCustomer.id ||
                (b.customerName && b.phone && b.customerName.toLowerCase() === selectedCustomer.name.toLowerCase() && b.phone === selectedCustomer.phone))
            && b.due > 0
        ).sort((a, b) => new Date(a.date) - new Date(b.date))
        : [];

    const monthOptions = Array.from(new Set(pendingBills.map(b => dayjs(b.date).format('MMMM YYYY')))).map(m => ({ label: m, value: m }));

    const handleFlexiblePayment = async (values) => {
        if (!selectedCustomer) return;

        let totalAmountPaid = 0;
        let paymentsToLog = [];
        let updatedBills = [...savedBills];

        const method = values.method || 'Cash';
        const isoDate = dayjs().toISOString();

        if (paymentTab === 'bill-wise') {
            if (selectedBillsToPay.length === 0) {
                message.error('Please select at least one bill to pay');
                return;
            }
            selectedBillsToPay.forEach(billId => {
                const bill = pendingBills.find(b => b.id === billId);
                if (bill) {
                    totalAmountPaid += bill.due;
                    updatedBills = updatedBills.map(b => b.id === billId ? { ...b, paid: (b.paid || 0) + b.due, due: 0 } : b);
                    paymentsToLog.push({
                        id: generateSafeId('PAY'),
                        invoiceId: bill.id,
                        customerId: selectedCustomer.id,
                        customerName: selectedCustomer.name,
                        amount: bill.due,
                        date: isoDate,
                        method
                    });
                }
            });
        } else if (paymentTab === 'month-wise') {
            const selectedMonth = monthWiseForm.getFieldValue('month');
            if (!selectedMonth) return message.error('Please select a month');

            const monthBills = pendingBills.filter(b => dayjs(b.date).format('MMMM YYYY') === selectedMonth);
            monthBills.forEach(bill => {
                totalAmountPaid += bill.due;
                updatedBills = updatedBills.map(b => b.id === bill.id ? { ...b, paid: (b.paid || 0) + b.due, due: 0 } : b);
                paymentsToLog.push({
                    id: generateSafeId('PAY'),
                    invoiceId: bill.id,
                    customerId: selectedCustomer.id,
                    customerName: selectedCustomer.name,
                    amount: bill.due,
                    date: isoDate,
                    method
                });
            });
        } else if (paymentTab === 'advance') {
            const amountToPay = advanceForm.getFieldValue('amount');
            if (!amountToPay || amountToPay <= 0) return message.error('Enter a valid amount');

            setAdvanceSubmitting(true);
            try {
                const recorded = await databaseBridge.recordCustomerAdvance({
                    customerId: selectedCustomer.id,
                    amount: amountToPay,
                    paymentMethod: method,
                    note: values.note || ''
                });
                const advancePayment = recorded?.payment || {
                    id: generateSafeId('PAY'),
                    customerId: selectedCustomer.id,
                    customerName: selectedCustomer.name,
                    amount: amountToPay,
                    date: isoDate,
                    method
                };
                const normalizedPayment = {
                    ...advancePayment,
                    method: advancePayment.method || advancePayment.paymentMethod || method,
                    customerId: advancePayment.customerId || selectedCustomer.id,
                    customerName: advancePayment.customerName || selectedCustomer.name,
                    date: advancePayment.date || isoDate
                };
                paymentsToLog.push(normalizedPayment);
                totalAmountPaid = Number(normalizedPayment.amount) || 0;
            } catch (error) {
                console.error('Advance save failed:', error);
                message.error('Could not save the advance payment. Please try again.');
                return;
            } finally {
                setAdvanceSubmitting(false);
            }
        }

        if (totalAmountPaid <= 0) return;

        // Save states
        if (paymentsToLog.length > 0) setPayments([...paymentsToLog, ...(payments || [])]);
        if (paymentTab !== 'advance') setSavedBills(updatedBills);

        // Adjust ledger: Reduce due (or add advance)
        updateCustomerLedger({
            customerName: selectedCustomer.name,
            phone: selectedCustomer.phone,
            vehicleNo: selectedCustomer.vehicleNo,
            dueAmount: -totalAmountPaid
        });

        message.success(`Payment of ৳${totalAmountPaid.toLocaleString()} processed successfully for ${selectedCustomer.name}`);

        setIsPayDueModalVisible(false);
        payDueForm.resetFields();
        monthWiseForm.resetFields();
        advanceForm.resetFields();
        setSelectedBillsToPay([]);
    };

    const handleSyncDirectory = async () => {
        setSyncLoading(true);
        try {
            const result = await databaseBridge.syncAllCustomers();
            message.success(result?.message || "Directory synchronized successfully!");
            fetchPagedData(1, pagination.pageSize, searchText);
        } catch (error) {
            console.error("Sync failed:", error);
            message.error("Failed to synchronize directory.");
        } finally {
            setSyncLoading(false);
        }
    };

    return (
        <div className="accounts-container" style={{ padding: '20px' }}>
            {/* ---- PRINT TEMPLATE (Premium Royal Blue Print Engine v1.6.0) ---- */}
            {printingBill && createPortal(
                <div className="alive-print-area">
                    {/* Professional Luxury Vector Watermark Engine - Set exactly to 4% opacity as per premium design specifications */}
                    <LuxuryCarWatermarkSVG opacity={0.08} />

                    {/* Spiritual Invocation */}
                    <div style={{ textAlign: 'center', fontSize: '15px', fontWeight: 600, marginBottom: 4, color: '#0f172a', letterSpacing: '0.5px' }}>
                        Bismillahir Rahmanir Rahim
                    </div>
                    
                    <BrandedDocumentHeader 
                        title="Invoice // History record" 
                        subtitle={printingBill.billingEntity || 'Mamun Automobiles'}
                        meta={[
                            { label: 'Invoice No', value: printingBill.id },
                            { label: 'Customer', value: printingBill.customerName || 'N/A' },
                            { label: 'Vehicle No', value: printingBill.vehicleNo || 'N/A' },
                            { label: 'Date', value: dayjs(printingBill.date).format('DD MMM YYYY') }
                        ]}
                    />

                    <div style={{ marginTop: 15, flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                            <div style={{ width: '48%' }}>
                                <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Client Details</Text>
                                <div style={{ fontSize: 22, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{printingBill.companyName || printingBill.customerName}</div>
                                <div style={{ fontSize: 16, color: '#1e293b', fontWeight: 600 }}>{printingBill.phone}</div>
                            </div>
                            <div style={{ width: '48%', textAlign: 'right' }}>
                                <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Vehicle Info</Text>
                                <div style={{ fontSize: 26, fontWeight: 600, color: '#0f172a' }}>{printingBill.vehicleNo}</div>
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
                                    <th style={{ textAlign: 'left' }}>Description</th>
                                    <th style={{ textAlign: 'right', width: '65px' }}>Qty</th>
                                    <th style={{ textAlign: 'right', width: '90px' }}>Unit Price</th>
                                    <th style={{ textAlign: 'right', width: '110px' }}>Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(printingBill.items || printingBill.lineItems || []).map((item, idx) => {
                                    const unitPrice = Number(item.unitPrice || item.price || 0);
                                    const rowTotal = (Number(item.quantity) || 1) * unitPrice;
                                    const compress = (printingBill.items || []).length > 5;
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
                                            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 500 }}>৳ {formatCurrency(unitPrice)}</td>
                                            <td style={{ ...cellStyle, textAlign: 'right', fontWeight: 700 }}>৳ {formatCurrency(rowTotal)}</td>
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
                                    <span style={{ fontWeight: 600 }}>৳ {formatCurrency(printingBill.subtotal || 0)}</span>
                                </div>
                                {printingBill.discount > 0 && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0', color: '#c2165e' }}>
                                        <span style={{ fontWeight: 700 }}>Discount:</span>
                                        <span style={{ fontWeight: 700 }}>- ৳ {formatCurrency(printingBill.discount)}</span>
                                    </div>
                                )}
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid #e2e8f0' }}>
                                    <span style={{ fontWeight: 700, color: '#64748b' }}>VAT (5%):</span>
                                    <span style={{ fontWeight: 600 }}>+ ৳ {formatCurrency(printingBill.vat || Math.round((printingBill.amount || 0) * 0.05))}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', fontSize: 20, fontWeight: 600, color: '#0f172a', borderBottom: '2px solid #cbd5e1' }}>
                                    <span>Total Amount:</span>
                                    <span>৳ {formatCurrency(printingBill.netPayable || printingBill.amount || 0)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 15, color: '#003399' }}>
                                    <span style={{ fontWeight: 600 }}>Paid Amount:</span>
                                    <span style={{ fontWeight: 600 }}>৳ {formatCurrency(printingBill.paid || 0)}</span>
                                </div>
                                {(printingBill.due > 0) && (
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15.5, color: '#dc2626', background: '#fef2f2', margin: '4px -8px', padding: '4px 8px', borderRadius: 4 }}>
                                        <span style={{ fontWeight: 600 }}>Due Amount:</span>
                                        <span style={{ fontWeight: 600 }}>৳ {formatCurrency(printingBill.due)}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ textAlign: 'left', fontSize: 14, fontStyle: 'italic', fontWeight: 700, color: '#1e293b', border: '3px double #a1a1a1', background: '#f8fafc', padding: '10px 14px', WebkitPrintColorAdjust: 'exact', borderRadius: 4 }}>
                            In Words: {toWords(printingBill.netPayable || printingBill.amount || 0)}
                        </div>
                    </div>

                    <div className="alive-footer-lock">
                        {/* Professional Double Border Signatures Setup */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25, marginTop: 20 }}>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '220px', borderTop: '3px double #a1a1a1', paddingTop: 8 }}>
                                {printingBill.customerSignature && (
                                    <img src={printingBill.customerSignature} style={{ height: 50, display: 'block', margin: '0 auto -6px auto' }} alt="Receiver Sign" />
                                )}
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Receiver's signature</span>
                            </div>
                            {printingBill.vehicleNo && (
                                <div style={{ textAlign: 'center' }}>
                                    <img 
                                        src={`https://api.qrserver.com/v1/create-qr-code/?size=55x55&data=${encodeURIComponent(`https://ai-coding-nu.vercel.app/#/history?v=${printingBill.vehicleNo.replace(/\s+/g, '')}`)}`} 
                                        alt="QR Record" 
                                    />
                                    <div style={{ fontSize: 8, fontWeight: 600, marginTop: 3, color: '#64748b' }}>Verified Record</div>
                                </div>
                            )}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', width: '220px', borderTop: '3px double #a1a1a1', paddingTop: 8 }}>
                                {printingBill.sellerSignature && (
                                    <img src={printingBill.sellerSignature} style={{ height: 50, display: 'block', margin: '0 auto -6px auto' }} alt="Authorized Sign" />
                                )}
                                <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>Authorized signature</span>
                            </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', fontSize: '13px', color: '#1e293b', marginTop: 10 }}>
                            <div style={{ maxWidth: '60%', lineHeight: 1.3, background: '#f8fafc', padding: '10px', border: '3px double #a1a1a1', WebkitPrintColorAdjust: 'exact', borderRadius: 4 }}>
                                <div style={{ marginBottom: '4px' }}>
                                    Note: <span style={{ fontStyle: 'italic' }}>The authority is not responsible for any goods left for more than 3 months or for any kind of damage or loss.</span>
                                </div>
                            </div>
                            <div style={{ textAlign: 'right', maxWidth: '38%', lineHeight: 1.4, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                                <span style={{ fontWeight: 600, fontSize: '12px', color: '#334155' }}>Dua for Traveling: "Bismillahi majreha wa mursaha, inna Rabbi la-Ghafurur Rahim."</span>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.2px' }}>Customers directory</Title>
                    <Text style={{ color: '#3B82F6', fontWeight: 600, fontSize: 11, letterSpacing: '0.2px' }}>Client profiles | Vehicle records | Transaction history</Text>
                </div>
                <Space size="middle">
                    <Button
                        size="large"
                        onClick={handleSyncDirectory}
                        loading={syncLoading}
                        style={{ background: 'transparent', border: '1px solid #3B82F6', color: '#3B82F6', fontWeight: 600, borderRadius: 0, letterSpacing: '0.2px' }}
                    >
                        Sync directory
                    </Button>
                    <Button
                        size="large"
                        onClick={() => setIsCustomerModalVisible(true)}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFF', fontWeight: 600, borderRadius: 0, letterSpacing: '0.2px' }}
                    >
                        Add new customer
                    </Button>
                </Space>
            </div>

            <div className="glass-card" style={{ padding: 0 }}>
                <div style={{ padding: '24px', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                    <Row gutter={[16, 16]} align="middle">
                        <Col xs={24} md={16}>
                            <Input
                                placeholder="Search by name, phone, or vehicle..."
                                value={searchText}
                                onChange={e => setSearchText(e.target.value)}
                                allowClear
                                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#FFF' }}
                            />
                        </Col>
                        <Col xs={24} md={8} style={{ textAlign: 'right' }}>
                            <Button
                                size="large"
                                onClick={() => setIsStickerModalVisible(true)}
                                style={{ width: '100%', background: 'transparent', border: '1px solid #FFF', color: '#FFF', fontWeight: 600, borderRadius: 0 }}
                            >
                                Sticker batch
                            </Button>
                        </Col>
                    </Row>
                </div>
                <Table
                    columns={columns}
                    dataSource={pageData}
                    rowKey={record => `${record.id}`}
                    pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        pageSizeOptions: ['12', '24', '48', '96']
                    }}
                    onChange={handleTableChange}
                    loading={loadingTable}
                    rowSelection={rowSelection}
                    className="luxury-table"
                />
            </div>

            <Modal
                title={<span style={{ color: '#ffffff', fontWeight: 600, letterSpacing: '0.2px' }}>Mamun Automobiles QR sticker layout</span>}
                open={isStickerModalVisible}
                onCancel={() => setIsStickerModalVisible(false)}
                footer={null}
                width={1100}
                className="sticker-layout-modal"
                styles={{ body: { background: '#0f172a', borderRadius: 16, padding: '24px 32px 28px' } }}
                destroyOnClose
            >
                <ConfigProvider theme={{ 
                    algorithm: antTheme.defaultAlgorithm,
                    token: {
                        colorText: '#ffffff',
                        colorTextSecondary: '#ffffff',
                        colorTextHeading: '#ffffff'
                    }
                }}>
                    <div className="sticker-layout-header no-print">
                    <div>
                        <Title level={4} style={{ margin: 0, color: '#ffffff', fontWeight: 600 }}>Sticker layout</Title>
                        <Text style={{ display: 'block', marginBottom: 4, color: '#ffffff' }}>
                            Each card prints at ~2×2 inches so you can load the layout straight onto your sticker sheets.
                        </Text>
                        <Text style={{ display: 'block', marginBottom: 4, color: '#ffffff', fontWeight: 'bold' }}>{stickerSelectionSummary}</Text>
                        {stickerPreviewTruncated && (
                            <Text style={{ color: '#fbbf24', display: 'block', marginTop: 4 }}>
                                Preview is limited to the first {STICKER_PREVIEW_LIMIT} stickers; the Print All action includes all {stickerDataset.length} vehicles.
                            </Text>
                        )}
                    </div>
                    <div className="sticker-layout-actions">
                        <Button onClick={() => setSelectedStickerRows([])} disabled={!selectedStickerRows.length} style={{ color: '#ffffff', borderColor: '#ffffff', background: 'transparent' }}>
                            Clear Selection
                        </Button>
                        <Button type="primary" onClick={handleStickerPrint} style={{ background: '#fbbf24', color: '#000000', fontWeight: 600, borderColor: '#fbbf24' }}>
                            Print all
                        </Button>
                    </div>
                </div>

                {stickerPreviewItems.length === 0 ? (
                    <div className="sticker-empty-state" style={{ background: '#ffffff', padding: 24, borderRadius: 12, textAlign: 'center', border: '2px dashed #000' }}>
                        <div style={{ color: '#000000', fontWeight: 'bold' }}>No stickers ready</div>
                        <div style={{ color: '#000000', marginTop: 8 }}>Search or add customers with vehicles to fill this layout.</div>
                    </div>
                ) : (
                    <>
                        <div className="sticker-preview-note" style={{ color: '#94a3b8', fontSize: '13px', marginBottom: '16px' }}>
                            {stickerPreviewTruncated
                                ? `Showing ${stickerPreviewItems.length} of ${stickerDataset.length} stickers in the preview.`
                                : `Showing all ${stickerDataset.length} stickers.`}
                        </div>
                        <StickerGrid customers={stickerPreviewItems} />
                    </>
                )}
                </ConfigProvider>
            </Modal>

            {/* Add Customer Modal */}
            <Modal
                title="Add new customer"
                open={isCustomerModalVisible}
                onCancel={() => {
                    setIsCustomerModalVisible(false);
                    customerForm.resetFields();
                }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={customerForm}
                    layout="vertical"
                    onFinish={handleAddCustomer}
                    style={{ marginTop: 16 }}
                >
                    <Form.Item
                        name="name"
                        label="Customer Name"
                        rules={[{ required: true, message: 'Please enter customer name' }]}
                    >
                        <Input placeholder="Enter full name" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="phone"
                        label="Phone Number"
                        rules={[
                            { required: true, message: 'Please enter phone number' },
                            { pattern: /^[0-9+\-\s]+$/, message: 'Please enter a valid phone number' }
                        ]}
                    >
                        <Input placeholder="e.g., 01700-000000" size="large" />
                    </Form.Item>
                    
                    <Form.Item
                        name="email"
                        label="Gmail / Login ID"
                        rules={[{ required: true, message: 'Gmail required for login access' }]}
                    >
                        <Input 
                            placeholder="e.g., rahim.uddin@gmail.com" 
                            size="large" 
                            onBlur={handleEmailBlur}
                            data-ai-ignore="true"
                        />
                    </Form.Item>

                    <Form.Item
                        name="vehicleNo"
                        label="Vehicle Number"
                        rules={[{ required: true, message: 'Please enter the vehicle number' }]}
                    >
                        <Input placeholder="e.g., DHA-11-2034" size="large" />
                    </Form.Item>

                    <Form.Item
                        name="initialBalance"
                        label="Initial Balance (Optional)"
                        tooltip="Positive for Advance, Negative for Due"
                    >
                        <InputNumber
                            placeholder="0"
                            size="large"
                            style={{ width: '100%' }}
                            formatter={value => `৳ ${value}`}
                            parser={value => value.replace(/\৳\s?|(,*)/g, '')}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { setIsCustomerModalVisible(false); customerForm.resetFields(); }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Create customer
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Add Transaction Modal */}
            <Modal
                title={`Record Transaction for ${selectedCustomer?.name || 'Customer'}`}
                open={isTransactionModalVisible}
                onCancel={() => {
                    setIsTransactionModalVisible(false);
                    transactionForm.resetFields();
                    setSelectedCustomer(null);
                }}
                footer={null}
                destroyOnClose
            >
                <Form
                    form={transactionForm}
                    layout="vertical"
                    onFinish={handleAddTransaction}
                    style={{ marginTop: 16 }}
                    initialValues={{ type: 'payment' }}
                >
                    <Form.Item
                        name="type"
                        label="Transaction Type"
                        rules={[{ required: true }]}
                    >
                        <Row gutter={8}>
                            <Col span={12}>
                                <Button
                                    block
                                    type={transactionForm.getFieldValue('type') === 'payment' ? 'primary' : 'default'}
                                    onClick={() => transactionForm.setFieldsValue({ type: 'payment' })}
                                    style={{ backgroundColor: transactionForm.getFieldValue('type') === 'payment' ? '#52c41a' : undefined }}
                                >
                                    Payment Received
                                </Button>
                            </Col>
                            <Col span={12}>
                                <Button
                                    block
                                    type={transactionForm.getFieldValue('type') === 'bill' ? 'primary' : 'default'}
                                    danger={transactionForm.getFieldValue('type') === 'bill'}
                                    onClick={() => transactionForm.setFieldsValue({ type: 'bill' })}
                                >
                                    Bill/Charge Added
                                </Button>
                            </Col>
                        </Row>
                        {/* Hidden input to store value for form validation */}
                        <Input type="hidden" />
                    </Form.Item>

                    <Form.Item
                        name="amount"
                        label="Amount"
                        rules={[{ required: true, message: 'Please enter the amount' }]}
                    >
                        <InputNumber
                            min={1}
                            placeholder="Enter amount"
                            size="large"
                            style={{ width: '100%' }}
                            formatter={value => `৳ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                            parser={value => value.replace(/\৳\s?|(,*)/g, '')}
                        />
                    </Form.Item>

                    <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
                        <Space>
                            <Button onClick={() => { setIsTransactionModalVisible(false); transactionForm.resetFields(); }}>
                                Cancel
                            </Button>
                            <Button type="primary" htmlType="submit">
                                Save Transaction
                            </Button>
                        </Space>
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal: Flexible Payment Action */}
            <Modal
                title={`Advance & Payment Settlement: ${selectedCustomer?.name}`}
                open={isPayDueModalVisible}
                onCancel={() => { setIsPayDueModalVisible(false); payDueForm.resetFields(); monthWiseForm.resetFields(); advanceForm.resetFields(); setSelectedCustomer(null); setSelectedBillsToPay([]); }}
                footer={null}
                width={700}
                destroyOnClose
            >
                {selectedCustomer && (
                    <div style={{ marginBottom: 16, padding: '12px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                        <Row gutter={[16, 8]}>
                            <Col span={12}><Text type="secondary">Customer:</Text> <Text strong>{selectedCustomer.name}</Text></Col>
                            <Col span={12}><Text type="secondary">Phone:</Text> <Text strong>{selectedCustomer.phone}</Text></Col>
                            <Col span={24}>
                                <Text type="secondary">Wallet Balance:</Text>
                                <Text type={selectedCustomer.liveBalance < 0 ? 'danger' : 'success'} strong style={{ fontSize: 16, marginLeft: 8 }}>
                                    ৳ {Math.abs(selectedCustomer.liveBalance).toLocaleString()} {selectedCustomer.liveBalance < 0 ? '(Due)' : '(Advance/Credit)'}
                                </Text>
                            </Col>
                        </Row>
                    </div>
                )}

                <Radio.Group value={paymentTab} onChange={e => setPaymentTab(e.target.value)} style={{ marginBottom: 16, width: '100%', display: 'flex' }}>
                    <Radio.Button value="bill-wise" style={{ flex: 1, textAlign: 'center' }}>Bill-Wise</Radio.Button>
                    <Radio.Button value="month-wise" style={{ flex: 1, textAlign: 'center' }}>Month-Wise</Radio.Button>
                    <Radio.Button value="advance" style={{ flex: 1, textAlign: 'center' }}>Lump Sum / Advance</Radio.Button>
                </Radio.Group>

                {paymentTab === 'bill-wise' && (
                    <Form form={payDueForm} layout="vertical" onFinish={handleFlexiblePayment}>
                        <Table
                            size="small"
                            dataSource={pendingBills}
                            rowKey="id"
                            rowSelection={{
                                selectedRowKeys: selectedBillsToPay,
                                onChange: setSelectedBillsToPay
                            }}
                            pagination={{ pageSize: 5 }}
                            columns={[
                                { title: 'Invoice', dataIndex: 'id' },
                                { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YY') },
                                { title: 'Due Amount', dataIndex: 'due', render: v => <Text type="danger" strong>৳{v.toLocaleString()}</Text> }
                            ]}
                            style={{ marginBottom: 16 }}
                        />
                        <Form.Item name="method" label="Payment Method" initialValue="Cash" rules={[{ required: true }]}>
                            <Radio.Group buttonStyle="solid">
                                <Radio.Button value="Cash">Cash</Radio.Button>
                                <Radio.Button value="Bkash">Bkash</Radio.Button>
                                <Radio.Button value="Bank">Bank Transfer</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Button type="primary" htmlType="submit" disabled={selectedBillsToPay.length === 0} style={{ width: '100%', backgroundColor: '#52c41a' }}>Settle Selected Bills</Button>
                    </Form>
                )}

                {paymentTab === 'month-wise' && (
                    <Form form={monthWiseForm} layout="vertical" onFinish={handleFlexiblePayment}>
                        {monthOptions.length > 0 ? (
                            <Form.Item name="month" label="Select Month to Clear Dues" rules={[{ required: true }]}>
                                <Select options={monthOptions} size="large" placeholder="Select month" />
                            </Form.Item>
                        ) : (
                            <Alert message="No pending bills found for specific months." type="info"  style={{ marginBottom: 16 }} />
                        )}
                        <Form.Item name="method" label="Payment Method" initialValue="Cash" rules={[{ required: true }]}>
                            <Radio.Group buttonStyle="solid">
                                <Radio.Button value="Cash">Cash</Radio.Button>
                                <Radio.Button value="Bkash">Bkash</Radio.Button>
                                <Radio.Button value="Bank">Bank Transfer</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Button type="primary" htmlType="submit" disabled={monthOptions.length === 0} style={{ width: '100%', backgroundColor: '#52c41a' }}>Clear Month's Dues</Button>
                    </Form>
                )}

                {paymentTab === 'advance' && (
                    <Form form={advanceForm} layout="vertical" onFinish={handleFlexiblePayment}>
                        <Form.Item name="amount" label="Advance / Flat Amount (৳)" rules={[{ required: true, message: 'Please enter amount' }]}>
                            <InputNumber min={1} size="large" style={{ width: '100%' }} placeholder="Enter amount received" />
                        </Form.Item>
                        <Form.Item name="method" label="Payment Method" initialValue="Cash" rules={[{ required: true }]}>
                            <Radio.Group buttonStyle="solid">
                                <Radio.Button value="Cash">Cash</Radio.Button>
                                <Radio.Button value="Bkash">Bkash</Radio.Button>
                                <Radio.Button value="Bank">Bank Transfer</Radio.Button>
                            </Radio.Group>
                        </Form.Item>
                        <Form.Item name="note" label="Reference / Note">
                            <Input.TextArea rows={2} placeholder="Receipt no, challan, or memo" />
                        </Form.Item>
                        <Button type="primary" htmlType="submit" loading={advanceSubmitting} style={{ width: '100%', backgroundColor: '#52c41a' }}>Deposit to Wallet</Button>
                    </Form>
                )}
            </Modal>

            {/* Modal: Customer Transaction History */}
            <Modal
                title={`Transaction History: ${selectedCustomer?.name || 'Customer'}`}
                open={isHistoryModalVisible}
                onCancel={() => { setIsHistoryModalVisible(false); setSelectedCustomer(null); }}
                footer={null}
                width={800}
                className="no-print"
                destroyOnClose
            >
                {selectedCustomer && (
                    <div style={{ marginBottom: 16, padding: '12px', background: '#e6f7ff', border: '1px solid #91d5ff', borderRadius: '6px' }}>
                        <Row align="middle">
                            <Col flex="auto">
                                <Text strong style={{ fontSize: 16 }}>Advance Wallet / Current Balance:</Text>
                            </Col>
                            <Col>
                                <Text
                                    type={calculateLiveBalance(selectedCustomer) < 0 ? 'danger' : 'success'}
                                    strong
                                    style={{ fontSize: 18 }}
                                >
                                    ৳ {Math.abs(calculateLiveBalance(selectedCustomer)).toLocaleString()}
                                    {calculateLiveBalance(selectedCustomer) < 0 ? ' (Due)' : ' (Advance)'}
                                </Text>
                            </Col>
                        </Row>
                    </div>
                )}
                <Tabs defaultActiveKey="1" items={[
                    {
                        key: '1',
                        label: `Bills & Invoices (${customerHistory?.bills?.length || 0})`,
                        children: (
                            <Table
                                dataSource={customerHistory?.bills || []}
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                                size="small"
                                columns={[
                                    { title: 'Invoice ID', dataIndex: 'id', key: 'id', render: (text) => <Text strong>{text}</Text> },
                                    { title: 'Date', dataIndex: 'date', key: 'date', render: (date) => dayjs(date).format('DD MMM, YYYY') },
                                    { title: 'Amount', dataIndex: 'amount', key: 'amount', render: (amt) => <Text strong>৳ {(amt || 0).toLocaleString()}</Text> },
                                    { title: 'Status', key: 'status', render: (_, record) => record.due > 0 ? <Tag color="error">Due: ৳{(record.due || 0).toLocaleString()}</Tag> : <Tag color="success">Paid</Tag> },
                                    { title: 'Action', key: 'action', render: (_, record) => <Button type="default" size="small" onClick={() => openInvoiceDetail(record)}>View</Button> }
                                ]}
                            />
                        )
                    },
                    {
                        key: '2',
                        label: `Service History (${customerHistory?.jobs?.length || 0})`,
                        children: (
                            <Table
                                dataSource={customerHistory?.jobs || []}
                                rowKey="id"
                                pagination={{ pageSize: 5 }}
                                size="small"
                                columns={[
                                    { title: 'Job ID', dataIndex: 'id', key: 'id', render: (id) => <Text strong>JC-{String(id).padStart(3, '0')}</Text> },
                                    { title: 'Date', dataIndex: 'createdAt', render: (d) => dayjs(d).format('DD MMM, YYYY') },
                                    { title: 'Vehicle', dataIndex: 'vehicleNo' },
                                    { title: 'Summary', dataIndex: 'description', ellipsis: true },
                                    { title: 'Status', dataIndex: 'status', render: (s) => <Tag color={s === 'completed' ? 'success' : 'processing'}>{s}</Tag> }
                                ]}
                            />
                        )
                    }
                ]} />
            </Modal>

            {/* Modal: Detailed Invoice View */}
            <Modal
                title={`Invoice Details: #${selectedInvoice?.id}`}
                open={isInvoiceModalVisible}
                onCancel={() => { setIsInvoiceModalVisible(false); setSelectedInvoice(null); }}
                footer={
                    <Button type="primary" onClick={() => handlePrintInvoice(selectedInvoice)}>
                        Re-print Invoice
                    </Button>
                }
                width={700}
                className="no-print"
                destroyOnClose
            >
                {selectedInvoice && (
                    <div>
                        <Row style={{ marginBottom: 16, padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
                            <Col span={12}>
                                <Text strong style={{ display: 'block' }}>Generated On:</Text>
                                <Text>{dayjs(selectedInvoice.date).format('DD MMM, YYYY hh:mm A')}</Text>
                            </Col>
                            <Col span={12} style={{ textAlign: 'right' }}>
                                <Text strong style={{ display: 'block' }}>Payment Status:</Text>
                                {selectedInvoice.due > 0 ? <Tag color="error" style={{ margin: 0 }}>Due</Tag> : <Tag color="success" style={{ margin: 0 }}>Fully Paid</Tag>}
                            </Col>
                        </Row>
                        <Table
                            dataSource={selectedInvoice.items}
                            rowKey={(record, index) => index}
                            pagination={false}
                            bordered
                            columns={[
                                { title: 'Description / Service / Part', dataIndex: 'description', key: 'description' },
                                { title: 'Qty', dataIndex: 'quantity', key: 'quantity', align: 'center', width: 80 },
                                { title: 'Unit Price', dataIndex: 'unitPrice', key: 'unitPrice', align: 'right', render: (p) => `৳ ${(p || 0).toLocaleString()}` },
                                { title: 'Total', key: 'total', align: 'right', render: (_, item) => <Text strong>৳ {((item?.quantity || 1) * (item?.unitPrice || 0)).toLocaleString()}</Text> }
                            ]}
                        />
                        <div style={{ marginTop: 24, textAlign: 'right', paddingRight: '12px' }}>
                            <div><Text type="secondary">Subtotal:</Text> <Text strong>৳ {(selectedInvoice.subtotal || 0).toLocaleString()}</Text></div>
                            <div><Text type="secondary">Discount:</Text> <Text type="danger">- ৳ {(selectedInvoice.discount || 0).toLocaleString()}</Text></div>
                            <Title level={4} style={{ margin: '8px 0', borderTop: '1px solid #f0f0f0', paddingTop: '8px' }}>Grand Total: ৳ {(selectedInvoice.amount || 0).toLocaleString()}</Title>
                            <div><Text type="secondary">Paid Amount:</Text> <Text type="success">৳ {(selectedInvoice.paid || 0).toLocaleString()}</Text></div>
                            <div><Text type="secondary">Remaining Due:</Text> <Text type="danger" strong>৳ {(selectedInvoice.due || 0).toLocaleString()}</Text></div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal: Generated Customer Credentials */}
            <Modal
                title={<div>Login Auto-Generated Successfully</div>}
                open={isLoginModalVisible}
                onCancel={() => { setIsLoginModalVisible(false); setGeneratedCredentials(null); }}
                footer={[
                    <Button key="close" type="primary" onClick={() => { setIsLoginModalVisible(false); setGeneratedCredentials(null); }}>
                        Done
                    </Button>
                ]}
                width={500}
                destroyOnClose
            >
                {generatedCredentials && (
                    <div style={{ marginTop: 16 }}>
                        <Alert
                            message={`Credentials for ${generatedCredentials.name} have been securely generated and synced to User Management.`}
                            type="success"
                            
                            style={{ marginBottom: 20 }}
                        />
                        <div style={{ background: '#0f172a', padding: '16px 24px', borderRadius: 8, border: '1px solid #334155', position: 'relative' }}>
                            <Button
                                type="text"
                                style={{ position: 'absolute', top: 12, right: 12, color: '#38bdf8' }}
                                onClick={() => {
                                    navigator.clipboard.writeText(`Portal Login\nURL: ${getPortalLoginUrl()}\nID: ${generatedCredentials.email}\nPassword: ${generatedCredentials.password}`);
                                    message.success("Credentials copied to clipboard");
                                }}
                            >
                                <Space><CopyOutlined /> <span style={{ color: '#38bdf8' }}>Copy All</span></Space>
                            </Button>
                            
                            <Button
                                type="primary"
                                style={{ position: 'absolute', bottom: 12, right: 12, borderRadius: 8, background: '#25d366', borderColor: '#25d366', fontWeight: 600 }}
                                icon={<MessageOutlined />}
                                onClick={() => handleWhatsAppSend(generatedCredentials)}
                            >
                                Send via WhatsApp
                            </Button>

                            <Title level={5} style={{ marginTop: 0, marginBottom: 16, color: '#ffffff' }}>Customer Portal Access</Title>

                            <Row style={{ marginBottom: 12 }}>
                                <Col span={8}><span style={{ color: '#cbd5e1' }}>Gmail / Login ID:</span></Col>
                                <Col span={16}><Text strong copyable style={{ fontSize: 16, color: '#fbbf24' }}>{generatedCredentials.email}</Text></Col>
                            </Row>
                            <Row>
                                <Col span={8}><span style={{ color: '#cbd5e1' }}>Secure Password:</span></Col>
                                <Col span={16}><Text strong copyable style={{ fontSize: 16, color: '#fbbf24' }}>{generatedCredentials.password}</Text></Col>
                            </Row>
                        </div>
                        <div style={{ marginTop: 16, fontSize: 12, color: '#94a3b8', textAlign: 'center' }}>
                            Please share these exact credentials with the customer. You can always reset their password from the User Management page if they forget it.
                        </div>
                    </div>
                )}
            </Modal>

            {/* Modal: QR Code for Vehicle History */}
            <Modal
                title={`Vehicle History QR: ${selectedCustomer?.vehicleNo}`}
                open={isQrModalVisible}
                onCancel={() => { setIsQrModalVisible(false); setQrData(''); }}
                footer={[
                    <Button 
                        key="print" 
                        type="primary" 
                        onClick={() => {
                            const bufferPrint = async () => {
                                // Phase 1: Portal Stabilization (v4.3: 400ms)
                await new Promise(r => setTimeout(r, 400));
                                
                                // Phase 2: Anti-Gravity Calibrations
                                if (window.applyAliveAntiGravity) {
                    await window.applyAliveAntiGravity();
                }
                                
                                // Phase 3: Mandatory Sync Buffer (v4.3: 800ms)
                await new Promise(r => setTimeout(r, 800));
                                
                                // Phase 4: Trigger Print Dialog
                                bufferedPrint();
                            };
                            bufferPrint();
                        }}
                    >
                        Print QR
                    </Button>,
                    <Button key="close" onClick={() => setIsQrModalVisible(false)}>
                        Close
                    </Button>
                ]}
                width={400}
                centered
            >
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                    <div style={{ background: '#fff', padding: 16, display: 'inline-block', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                        <QRCodeCanvas value={qrData} size={256} level="H" includeMargin={true} />
                    </div>
                </div>
            </Modal>
            {isQrModalVisible && qrData && createPortal(
                <div className="alive-print-area" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ textAlign: 'center', marginBottom: 20 }}>
                        <Title level={4} style={{ margin: 0 }}>Vehicle history QR</Title>
                        <Text strong style={{ color: '#3B82F6' }}>Mamun Automobiles</Text>
                    </div>
                    
                    <div style={{ background: '#fff', padding: 20, border: '2px solid #000' }}>
                        <QRCodeCanvas value={qrData} size={300} level="H" includeMargin={true} />
                    </div>

                    <div style={{ marginTop: 20, textAlign: 'center' }}>
                        <Text strong style={{ fontSize: 16 }}>Vehicle: {selectedCustomer?.vehicleNo}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: 10 }}>Scan to view service records</Text>
                    </div>

                    <div className="alive-footer-lock" style={{ textAlign: 'center', fontSize: 9, color: '#94a3b8', borderTop: '1px solid #eee', paddingTop: 10, width: '100%' }}>
                        MAMUN AUTOMOBILES // ZERO-GAP V3.4 // QR ENGINE
                    </div>
                </div>,
                document.body
            )}

            {createPortal(
                <div className="sticker-print-helper" aria-hidden="true">
                    <StickerGrid customers={stickerDataset} />
                </div>,
                document.body
            )}
        </div>

    );
};

const StickerGrid = ({ customers }) => {
    if (!customers?.length) return null;

    return (
        <div className="sticker-grid">
            {customers.map(customer => {
                const vNumber = customer.vehicleNo || customer.vehicleNumber || 'N/A';
                return (
                    <article
                        key={`${customer.id}-${vNumber}`}
                        className="sticker-card"
                        aria-label={`Sticker for ${vNumber}`}
                        style={{ 
                            background: '#ffffff', 
                            border: '1px solid #000000', 
                            minHeight: '220px', 
                            height: 'auto', 
                            display: 'flex', 
                            flexDirection: 'column', 
                            justifyContent: 'space-between', 
                            alignItems: 'center', 
                            padding: '12px 8px', 
                            boxSizing: 'border-box', 
                            overflow: 'visible',
                            aspectRatio: 'auto'
                        }}
                    >
                        <div className="sticker-card__brand" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px' }}>
                            <img src={logo} alt="Mamun Automobiles" className="sticker-card__brand-logo" style={{ maxHeight: '28px', width: 'auto', objectFit: 'contain' }} />
                            <div className="sticker-card__brand-name" style={{ color: '#000000', fontWeight: 600, fontSize: '11px', letterSpacing: '0.1px' }}>
                                Mamun Automobiles
                            </div>
                        </div>
                        <div className="sticker-card__qr" style={{ margin: '2px 0' }}>
                            <QRCodeCanvas value={formatVehicleHistoryUrl(vNumber)} size={96} level="H" includeMargin />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', marginTop: '2px' }}>
                            <div className="sticker-card__vehicle" style={{ color: '#000000', fontWeight: 600, fontSize: '14px', lineHeight: 1.1, textAlign: 'center' }}>
                                {vNumber}
                            </div>
                            <div className="sticker-card__hint" style={{ color: '#000000', fontWeight: 600, fontSize: '11px', lineHeight: 1.1, textAlign: 'center', marginTop: '2px' }}>
                                Scan for service history
                            </div>
                        </div>
                    </article>
                );
            })}
        </div>
    );
};

export default CustomersPage;






