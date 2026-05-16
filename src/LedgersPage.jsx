import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';
import {            
  Card, Table, Button, Modal, Form, InputNumber, Select, Typography,
    Space, Tag, Row, Col, Statistic, Alert, Tabs, Divider, message, Input, DatePicker
} from 'antd';
import { 
    PrinterOutlined, FilePdfOutlined, FileExcelOutlined, BankOutlined 
} from '@ant-design/icons';


import { formatCurrency } from './utils/helpers';
import { exportToExcel } from './utils/excelExport';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useGlobalState } from './contexts/GlobalStateContext';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import downloadElementAsPdf from './utils/domPdf';

const { Title, Text } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

dayjs.extend(isBetween);

const LedgersPage = ({ defaultTab = 'customer' }) => {
    const {
        savedBills, payments, setPayments, setSavedBills,
        customers, setCustomers, updateCustomerLedger,
        companies, setCompanies, suppliers, setSuppliers,
        generateSafeId
    } = useGlobalState();
    const [activeTab, setActiveTab] = React.useState(defaultTab);

    // Sync activeTab when defaultTab prop changes
    React.useEffect(() => {
        setActiveTab(defaultTab);
    }, [defaultTab]);

    // ─── Company Credit Tab ───────────────────────────────────────
    const [selectedCompany, setSelectedCompany] = React.useState(null);
    const [isPayModalVisible, setIsPayModalVisible] = React.useState(false);
    const [selectedCreditBill, setSelectedCreditBill] = React.useState(null);
    const [payForm] = Form.useForm();

    // Flexible Settlement 
    const [isFlexiblePayModalVisible, setIsFlexiblePayModalVisible] = React.useState(false);
    const [paymentTab, setPaymentTab] = React.useState('bill-wise');
    const [selectedBillsToPay, setSelectedBillsToPay] = React.useState([]);
    const [monthWiseForm] = Form.useForm();
    const [advanceForm] = Form.useForm();

    // ─── Customer Ledger Tab ──────────────────────────────────────
    const [selectedCustomer, setSelectedCustomer] = React.useState(null);
    const [ledgerDateRange, setLedgerDateRange] = React.useState([dayjs().subtract(30, 'day'), dayjs()]);
    const [isAddCustomerModalVisible, setIsAddCustomerModalVisible] = React.useState(false);
    const [addCustomerForm] = Form.useForm();

    // ─── Supplier Ledger Tab ──────────────────────────────────────
    const [selectedSupplier, setSelectedSupplier] = React.useState(null);
    const [isAddSupplierModalVisible, setIsAddSupplierModalVisible] = React.useState(false);
    const [addSupplierForm] = Form.useForm();

    // ── Derive all unique companies from credit bills AND explicit companies ──
    const [isAddCompanyModalVisible, setIsAddCompanyModalVisible] = React.useState(false);
    const [addCompanyForm] = Form.useForm();

    const companyList = React.useMemo(() => {
        const map = {};

        // 1. Add explicitly created companies
        (companies || []).forEach(c => {
            if (c?.name) {
                map[c.name] = { ...c, totalBilled: 0, totalPaid: 0, bills: [] };
            }
        });

        // 2. Add derived companies from bills and accumulate totals
        (savedBills || []).forEach(b => {
            if (b?.saleType === 'Credit' && b?.companyName) {
                if (!map[b.companyName]) {
                    map[b.companyName] = { name: b.companyName, totalBilled: 0, totalPaid: 0, bills: [], openingBalance: 0 };
                }
                map[b.companyName].totalBilled += (b.netPayable || b.amount || 0);
                map[b.companyName].totalPaid += (b.paid || 0);
                map[b.companyName].bills.push(b);
            }
        });

        // 3. Compute outstanding including opening balance
        return Object.values(map).map(c => ({
            ...c,
            outstanding: (c?.openingBalance || 0) + (c?.totalBilled || 0) - (c?.totalPaid || 0)
        }));
    }, [savedBills, companies]);

    const selectedCompanyData = companyList.find(c => c.name === selectedCompany);

    const agingSummary = React.useMemo(() => {
        if (!selectedCompanyData?.bills) return [];
        const pending = (selectedCompanyData.bills || []).filter(b => (b?.due || 0) > 0);
        const grouped = {};
        pending.forEach(b => {
            const billDate = b.date ? dayjs(b.date) : dayjs();
            const month = billDate.format('MMMM YYYY');
            if (!grouped[month]) grouped[month] = { month, count: 0, due: 0 };
            grouped[month].count += 1;
            grouped[month].due += (b.due || 0);
        });
        return Object.values(grouped).sort((a, b) => new Date(`1 ${a.month}`) - new Date(`1 ${b.month}`));
    }, [selectedCompanyData]);

    // Payments for selected company
    const companyPayments = React.useMemo(() => {
        if (!selectedCompany) return [];
        return (payments || []).filter(p => p.companyName === selectedCompany || (p.customerName === selectedCompany));
    }, [payments, selectedCompany]);

    const handleCompanyPayment = (values) => {
        if (!selectedCreditBill) return;
        const amount = values.amount;
        if (amount > (selectedCreditBill.due || 0)) {
            message.error(`Max payable is ৳${(selectedCreditBill.due || 0).toLocaleString()}`);
            return;
        }
        // Record payment
        const newPayment = {
            id: `PAY-${Date.now()}`,
            invoiceId: selectedCreditBill.id,
            customerName: selectedCreditBill.customerName,
            companyName: selectedCreditBill.companyName,
            amount,
            date: dayjs().toISOString(),
            method: values.method || 'Cash',
            note: values.note || ''
        };
        setPayments([newPayment, ...(payments || [])]);

        // Update bill
        setSavedBills((savedBills || []).map(b =>
            b.id === selectedCreditBill.id
                ? { ...b, paid: (b.paid || 0) + amount, due: (b.due || 0) - amount }
                : b
        ));
        message.success(`Payment of ৳${amount.toLocaleString()} recorded.`);
        setIsPayModalVisible(false);
        payForm.resetFields();
        setSelectedCreditBill(null);
    };

    const pendingCompanyBills = selectedCompanyData?.bills?.filter(b => (b?.due || 0) > 0).sort((a, b) => new Date(a.date) - new Date(b.date)) || [];
    const monthOptions = Array.from(new Set(pendingCompanyBills.map(b => dayjs(b?.date || undefined).format('MMMM YYYY')))).map(m => ({ label: m, value: m }));

    const isWithinLedgerRange = (dateValue) => {
        if (!dateValue) return false;
        if (!ledgerDateRange?.[0] || !ledgerDateRange?.[1]) return true;
        return dayjs(dateValue).isBetween(ledgerDateRange[0].startOf('day'), ledgerDateRange[1].endOf('day'), null, '[]');
    };

    const handleFlexibleCompanyPayment = (values) => {
        if (!selectedCompanyData) return;
        let totalAmountPaid = 0;
        let paymentsToLog = [];
        let updatedBills = [...savedBills];
        const method = values.method || 'Cash';
        const isoDate = dayjs().toISOString();

        if (paymentTab === 'bill-wise') {
            if (selectedBillsToPay.length === 0) return message.error('No bills selected');
            selectedBillsToPay.forEach(billId => {
                const bill = pendingCompanyBills.find(b => b.id === billId);
                if (bill) {
                    totalAmountPaid += bill.due;
                    updatedBills = updatedBills.map(b => b.id === billId ? { ...b, paid: (b.paid || 0) + b.due, due: 0 } : b);
                    paymentsToLog.push({ id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, invoiceId: bill.id, companyName: selectedCompanyData.name, amount: bill.due, date: isoDate, method });
                }
            });
        } else if (paymentTab === 'month-wise') {
            const selectedMonth = monthWiseForm.getFieldValue('month');
            if (!selectedMonth) return message.error('Select a month');
            const monthBills = pendingCompanyBills.filter(b => dayjs(b.date).format('MMMM YYYY') === selectedMonth);
            monthBills.forEach(bill => {
                totalAmountPaid += bill.due;
                updatedBills = updatedBills.map(b => b.id === bill.id ? { ...b, paid: (b.paid || 0) + b.due, due: 0 } : b);
                paymentsToLog.push({ id: `PAY-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, invoiceId: bill.id, companyName: selectedCompanyData.name, amount: bill.due, date: isoDate, method });
            });
        } else if (paymentTab === 'advance') {
            totalAmountPaid = advanceForm.getFieldValue('amount');
            if (!totalAmountPaid || totalAmountPaid <= 0) return message.error('Enter valid amount');
            paymentsToLog.push({ id: `PAY-${Date.now()}`, companyName: selectedCompanyData.name, amount: totalAmountPaid, date: isoDate, method });
        }

        if (totalAmountPaid <= 0) return;

        if (paymentsToLog.length > 0) setPayments([...paymentsToLog, ...payments]);
        if (paymentTab !== 'advance') setSavedBills(updatedBills);

        message.success(`Payment of ৳${totalAmountPaid.toLocaleString()} processed successfully for ${selectedCompanyData.name}`);

        setIsFlexiblePayModalVisible(false);
        monthWiseForm.resetFields();
        advanceForm.resetFields();
        setSelectedBillsToPay([]);
    };

    // ── Customer ledger data ───────────────────────────────────────
    const customerLedgerData = React.useMemo(() => {
        if (!selectedCustomer) return null;
        const c = (customers || []).find(cu => cu.id === selectedCustomer);
        if (!c) return null;
        const customerBills = (savedBills || []).filter(b =>
            (b?.customerName || '').toLowerCase() === (c?.name || '').toLowerCase() ||
            (b?.phone && b?.phone === c?.phone)
        );
        const filteredBills = customerBills.filter((bill) => isWithinLedgerRange(bill?.date));
        const customerPayments = (payments || [])
            .filter(p => p.customerName?.toLowerCase() === c.name?.toLowerCase())
            .filter((payment) => isWithinLedgerRange(payment?.date))
            .sort((a, b) => new Date(b.date) - new Date(a.date));
        return {
            customer: c,
            bills: filteredBills,
            totalBilled: filteredBills.reduce((s, b) => s + (b.netPayable || b.amount || 0), 0),
            totalPaid: filteredBills.reduce((s, b) => s + (b.paid || 0), 0),
            outstanding: filteredBills.reduce((s, b) => s + (b.due || 0), 0),
            paymentHistory: customerPayments
        };
    }, [selectedCustomer, savedBills, payments, customers, ledgerDateRange]);

    // Bill columns for company
    const creditBillColumns = [
        { title: 'Invoice ID', dataIndex: 'id', render: t => <Text strong style={{ fontSize: 12 }}>{t}</Text> },
        { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YY') },
        { title: 'Customer', dataIndex: 'customerName' },
        { title: 'Net Payable', dataIndex: 'netPayable', render: (v, r) => `৳ ${(v || r.amount || 0).toLocaleString()}` },
        { title: 'Paid', dataIndex: 'paid', render: v => <Text type="success">৳ {(v || 0).toLocaleString()}</Text> },
        {
            title: 'Due', dataIndex: 'due',
            render: v => (v || 0) > 0 ? <Text type="danger" strong>৳ {(v || 0).toLocaleString()}</Text> : <Tag color="success">Settled ✓</Tag>
        },
        {
            title: 'Action',
            render: (_, record) => (record.due || 0) > 0 && (
                <Button size="small" type="primary" style={{ background: '#52c41a' }}
                    onClick={() => { setSelectedCreditBill(record); payForm.setFieldsValue({ amount: record.due, method: 'Cash' }); setIsPayModalVisible(true); }}>
                    Receive Payment
                </Button>
            )
        }
    ];

    const paymentHistoryColumns = [
        { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YYYY, hh:mm A') },
        { title: 'Invoice', dataIndex: 'invoiceId' },
        { title: 'Method', dataIndex: 'method', render: m => <Tag>{m}</Tag> },
        { title: 'Amount Paid', dataIndex: 'amount', align: 'right', render: v => <Text strong style={{ color: '#52c41a' }}>+ ৳ {(v || 0).toLocaleString()}</Text> }
    ];

    const handleAddCompany = (values) => {
        const newCompany = {
            id: generateSafeId('COMP'),
            name: values.name,
            contactPerson: values.contactPerson || '',
            phone: values.phone || '',
            email: values.email || '',
            openingBalance: values.openingBalance || 0,
            createdAt: dayjs().toISOString()
        };
        setCompanies([...(companies || []), newCompany]);
        message.success(`Company '${values.name}' created successfully!`);
        setIsAddCompanyModalVisible(false);
        addCompanyForm.resetFields();
    };

    const handleAddCustomer = (values) => {
        const newCustomer = {
            id: generateSafeId('CUST'),
            name: values.name,
            phone: values.phone,
            vehicleNo: values.vehicleNo || '',
            initialBalance: values.initialBalance || 0,
            lastUpdated: dayjs().toISOString()
        };
        setCustomers([newCustomer, ...(customers || [])]);
        message.success(`Customer '${values.name}' added!`);
        setIsAddCustomerModalVisible(false);
        addCustomerForm.resetFields();
    };

    const handleAddSupplier = (values) => {
        const newSupplier = {
            id: generateSafeId('SUPP'),
            name: values.name,
            phone: values.phone,
            contactPerson: values.contactPerson || '',
            category: values.category || 'General',
            address: values.address || '',
            openingBalance: values.openingBalance || 0,
            createdAt: dayjs().toISOString()
        };
        setSuppliers([newSupplier, ...(suppliers || [])]);
        message.success(`Supplier '${values.name}' added!`);
        setIsAddSupplierModalVisible(false);
        addSupplierForm.resetFields();
    };

    const [isPrinting, setIsPrinting] = React.useState(false);
    const [printingType, setPrintingType] = React.useState(null); // 'customer' or 'company'
    const [printingData, setPrintingData] = React.useState(null);

    const handleCustomerPrint = () => {
        setPrintingType('customer');
        setPrintingData(customerLedgerData);
        setIsPrinting(true);
    };

    const handleCompanyPrint = () => {
        setPrintingType('company');
        setPrintingData(selectedCompanyData);
        setIsPrinting(true);
    };

    React.useEffect(() => {
        if (isPrinting && printingData) {
            bufferedPrint(() => {
                setIsPrinting(false);
                setPrintingType(null);
                setPrintingData(null);
            });
        }
    }, [isPrinting, printingData]);

    const supplierLedgerData = React.useMemo(() => {
        if (!selectedSupplier) return null;
        const s = (suppliers || []).find(su => su.id === selectedSupplier);
        if (!s) return null;
        // Logic for supplier bills (purchases) could be added here in future
        return {
            supplier: s,
            bills: [],
            totalBilled: 0,
            totalPaid: 0,
            outstanding: s.openingBalance || 0,
            paymentHistory: []
        };
    }, [selectedSupplier, suppliers]);

    // Handled by v3.3 bufferPrint protocol below
    /*
    const handleCustomerPrint = () => {
        window.print();
    };
    */

    const handleCustomerPdfDownload = async () => {
        try {
            if (!customerLedgerData) return;
            await downloadElementAsPdf('customer-ledger-print-area', `Ledger_${customerLedgerData.customer.name.replace(/\s+/g, '_')}.pdf`);
            message.success('Customer ledger PDF downloaded.');
        } catch (err) {
            console.error('Customer ledger PDF export failed:', err);
            message.error('Could not export customer ledger PDF.');
        }
    };

    const handleCustomerExcelExport = () => {
        if (!customerLedgerData) return;
        const { customer, bills, paymentHistory } = customerLedgerData;
        
        const exportData = [
            { Type: 'Summary', Name: customer.name, Phone: customer.phone, 'Total Billed': customerLedgerData.totalBilled, 'Total Paid': customerLedgerData.totalPaid, Outstanding: customerLedgerData.outstanding },
            {}, // Empty row
            { Type: 'Invoice ID', Date: 'Date', 'Sale Type': 'Sale Type', Amount: 'Amount', Paid: 'Paid', Due: 'Due' },
            ...bills.map(b => ({
                Type: 'Bill',
                'Invoice ID': b.id,
                Date: dayjs(b.date).format('DD MMM YY'),
                'Sale Type': b.saleType || 'Cash',
                Amount: b.netPayable || b.amount || 0,
                Paid: b.paid || 0,
                Due: b.due || 0
            })),
            {},
            { Type: 'Payment Date', 'Invoice ID': 'Invoice ID', Method: 'Method', 'Amount Paid': 'Amount Paid' },
            ...paymentHistory.map(p => ({
                Type: 'Payment',
                'Payment Date': dayjs(p.date).format('DD MMM YYYY'),
                'Invoice ID': p.invoiceId,
                Method: p.method,
                'Amount Paid': p.amount
            }))
        ];
        
        exportToExcel(exportData, `Ledger_${customer.name.replace(/\s+/g, '_')}`, 'Customer Ledger');
    };

    const handleCompanyExcelExport = () => {
        if (!selectedCompanyData || !selectedCompanyData.bills) return;
        const exportData = selectedCompanyData.bills.map(b => ({
            'Invoice ID': b?.id,
            'Date': dayjs(b?.date).format('DD MMM YY'),
            'Customer': b?.customerName,
            'Net Payable': b?.netPayable || b?.amount || 0,
            'Paid': b.paid || 0,
            'Due': b.due || 0
        }));
        exportToExcel(exportData, `Company_Ledger_${selectedCompanyData.name.replace(/\s+/g, '_')}`, 'Company Ledger');
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Title level={3} style={{ margin: 0 }}>📒 Ledgers</Title>
            </div>

            <Tabs
                type="card"
                activeKey={activeTab}
                onChange={setActiveTab}
                items={[
                    {
                        key: 'customer',
                        label: 'Customer Ledgers',
                        children: (
                            <div style={{ padding: '0px' }}>
                                <Card style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
                                        <Select 
                                            showSearch 
                                            style={{ flex: 1, maxWidth: 400 }}
                                            placeholder="Search customer by name or phone"
                                            size="large"
                                            value={selectedCustomer}
                                            onChange={setSelectedCustomer}
                                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                            options={(customers || []).map(c => ({ label: `${c.name} — ${c.phone}`, value: c.id }))}
                                        />
                                        <Button type="primary" size="large" onClick={() => setIsAddCustomerModalVisible(true)}>
                                            Add Customer
                                        </Button>
                                        <RangePicker
                                            value={ledgerDateRange}
                                            onChange={(value) => setLedgerDateRange(value || [null, null])}
                                            presets={[
                                                { label: 'Last 30 Days', value: [dayjs().subtract(30, 'day'), dayjs()] },
                                                { label: 'This Month', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
                                                { label: 'Last Month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] }
                                            ]}
                                        />
                                    </div>
                                </Card>

                                {customerLedgerData ? (
                                    <>
                                        <Row gutter={16} style={{ marginBottom: 24 }}>
                                            <Col span={8}>
                                                <div className="dashboard-metric-card">
                                                    <Statistic title="Total Billed" value={customerLedgerData.totalBilled} prefix="৳" valueStyle={{ fontWeight: 700 }} />
                                                </div>
                                            </Col>
                                            <Col span={8}>
                                                <div className="dashboard-metric-card">
                                                    <Statistic title="Total Received" value={customerLedgerData.totalPaid} prefix="৳" valueStyle={{ color: '#52c41a', fontWeight: 700 }} />
                                                </div>
                                            </Col>
                                            <Col span={8}>
                                                <div className="dashboard-metric-card">
                                                    <Statistic title="Outstanding" value={customerLedgerData.outstanding} prefix="৳" valueStyle={{ color: '#ff4d4f', fontWeight: 700 }} />
                                                </div>
                                            </Col>
                                        </Row>

                                        <Card className="glass-card" style={{ padding: '20px' }}>
                                            <div className="no-print" style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
                                                <Title level={4} style={{ margin: 0 }}>Customer Ledger Statement</Title>
                                                <Space>
                                                    <Button type="primary" icon={<PrinterOutlined />} onClick={handleCustomerPrint}>Print</Button>
                                                    <Button icon={<FilePdfOutlined />} onClick={handleCustomerPdfDownload}>Export PDF</Button>
                                                    <Button icon={<FileExcelOutlined />} onClick={handleCustomerExcelExport}>Excel</Button>
                                                </Space>
                                            </div>

                                            <div id="customer-ledger-print-area">
                                                <Table
                                                    size="small"
                                                    dataSource={customerLedgerData.bills}
                                                    rowKey="id"
                                                    pagination={false}
                                                    columns={[
                                                        { title: 'Invoice', dataIndex: 'id' },
                                                        { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YY') },
                                                        { title: 'Type', dataIndex: 'saleType', render: t => <Tag color={t === 'Credit' ? 'orange' : 'green'}>{t || 'Cash'}</Tag> },
                                                        { title: 'Amount', dataIndex: 'netPayable', render: (v, r) => `৳ ${(v || r.amount || 0).toLocaleString()}` },
                                                        { title: 'Paid', dataIndex: 'paid', render: v => <Tag color="green">৳ {(v || 0).toLocaleString()}</Tag> },
                                                        { title: 'Due', dataIndex: 'due', render: v => (v || 0) > 0 ? <Tag color="red">৳ {(v || 0).toLocaleString()}</Tag> : <Tag color="success">✓</Tag> }
                                                    ]}
                                                />
                                                {customerLedgerData.paymentHistory.length > 0 && (
                                                    <div style={{ marginTop: 24 }}>
                                                        <Title level={5}>Payment History</Title>
                                                        <Table 
                                                            size="small" 
                                                            dataSource={customerLedgerData.paymentHistory}
                                                            columns={paymentHistoryColumns} 
                                                            rowKey="id" 
                                                            pagination={false} 
                                                        />
                                                    </div>
                                                )}
                                                <div style={{ marginTop: 32, textAlign: 'center', fontSize: 10, color: '#666', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                                                    Statement Generated by Mamun Automobiles Management System • {dayjs().format('DD MMM YYYY, hh:mm A')}
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Simplified Portal Logic */}
                                        {isPrinting && printingType === 'customer' && printingData && createPortal(
                                            <div className="alive-print-area">
                                                <BrandedDocumentHeader
                                                    title="Customer Ledger Statement"
                                                    subtitle={customerLedgerData.customer.name}
                                                    meta={[
                                                        { label: 'Phone', value: customerLedgerData.customer.phone || 'N/A' },
                                                        { label: 'Date', value: dayjs().format('DD MMM YYYY') },
                                                        { label: 'Due', value: `৳ ${customerLedgerData.outstanding.toLocaleString()}` }
                                                    ]}
                                                />
                                                <div style={{ marginTop: 20 }}>
                                                    <table className="premium-print-table">
                                                        <thead>
                                                            <tr><th>Invoice</th><th>Date</th><th style={{ textAlign: 'right' }}>Amount</th><th style={{ textAlign: 'right' }}>Paid</th><th style={{ textAlign: 'right' }}>Due</th></tr>
                                                        </thead>
                                                        <tbody>
                                                            {customerLedgerData.bills.map((b, idx) => (
                                                                <tr key={idx}>
                                                                    <td>{b.id}</td>
                                                                    <td>{dayjs(b.date).format('DD MMM YY')}</td>
                                                                    <td style={{ textAlign: 'right' }}>৳ {(b.netPayable || 0).toLocaleString()}</td>
                                                                    <td style={{ textAlign: 'right' }}>৳ {(b.paid || 0).toLocaleString()}</td>
                                                                    <td style={{ textAlign: 'right', fontWeight: 700 }}>৳ {(b.due || 0).toLocaleString()}</td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                                {createPortal(<div className="alive-footer-lock">
                                                        <div style={{ fontSize: 12 }}>Total Billed: ৳ {customerLedgerData.totalBilled.toLocaleString()}</div>
                                                        <div style={{ fontSize: 14, fontWeight: 600 }}>Total Due: ৳ {customerLedgerData.outstanding.toLocaleString()}</div>
                                                    </div>
                                                </div>
                                            </div>,
                                            document.body
                                        )}
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', margin: '40px 0', color: '#aaa' }}>
                                        <Title level={5} type="secondary">Select a customer to see their ledger</Title>
                                    </div>
                                )}
                            </div>
                        )
                    },
                    {
                        key: 'supplier',
                        label: 'Supplier Ledger',
                        children: (
                            <>
                                <Card style={{ marginBottom: 24 }}>
                                    <div style={{ display: 'flex', gap: 16 }}>
                                        <Select showSearch style={{ flex: 1, maxWidth: 400 }}
                                            placeholder="Search supplier by name or phone"
                                            size="large"
                                            value={selectedSupplier}
                                            onChange={setSelectedSupplier}
                                            filterOption={(input, opt) => (opt?.label ?? '').toLowerCase().includes(input.toLowerCase())}
                                            options={(suppliers || []).map(s => ({ label: `${s.name} — ${s.phone}`, value: s.id }))}
                                        />
                                        <Button type="primary" size="large" onClick={() => setIsAddSupplierModalVisible(true)} >
                                            Add Supplier
                                        </Button>
                                    </div>
                                </Card>

                                {supplierLedgerData ? (
                                    <>
                                        <Row gutter={16} style={{ marginBottom: 24 }}>
                                            <Col span={12}>
                                                <div className="dashboard-metric-card">
                                                    <Statistic title="Total Purchase" value={supplierLedgerData.totalBilled} prefix="৳" valueStyle={{ fontWeight: 700 }} />
                                                </div>
                                            </Col>
                                            <Col span={12}>
                                                <div className="dashboard-metric-card">
                                                    <Statistic title="Outstanding Due" value={supplierLedgerData.outstanding} prefix="৳" valueStyle={{ color: '#ff4d4f', fontWeight: 700 }} />
                                                </div>
                                            </Col>
                                        </Row>
                                        <Alert message="Supplier Invoices coming soon in Inventory module." type="info"  />
                                    </>
                                ) : (
                                    <div style={{ textAlign: 'center', margin: '40px 0', color: '#aaa' }}>
                                        
                                        <Title level={5} type="secondary">Select a supplier to see their ledger</Title>
                                    </div>
                                )}
                            </>
                        )
                    }
                ]} />

            {/* Payment Modal for individual bill */}
            <Modal title="💳 Receive Payment from Company" open={isPayModalVisible}
                onCancel={() => { setIsPayModalVisible(false); setSelectedCreditBill(null); payForm.resetFields(); }} footer={null}>
                {selectedCreditBill && (
                    <div style={{ marginBottom: 12, padding: 8, background: '#fff7e6', borderRadius: 6 }}>
                        <Text>Invoice: <strong>{selectedCreditBill.id}</strong></Text><br />
                        <Text>Max due: <strong style={{ color: '#cf1322' }}>৳ {(selectedCreditBill.due || 0).toLocaleString()}</strong></Text>
                    </div>
                )}
                <Form form={payForm} onFinish={handleCompanyPayment} layout="vertical">
                    <Form.Item name="amount" label="Amount to Receive (৳)" rules={[{ required: true }]}>
                        <InputNumber min={1} max={selectedCreditBill?.due || undefined} style={{ width: '100%' }} size="large" />
                    </Form.Item>
                    <Form.Item name="method" label="Payment Method" initialValue="Cash">
                        <Select>
                            <Option value="Cash">Cash</Option>
                            <Option value="Cheque">Cheque</Option>
                            <Option value="Bank">Bank Transfer</Option>
                            <Option value="Bkash">Bkash</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="note" label="Notes">
                        <Select mode="tags" placeholder="e.g. Partial payment 1/3" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large">✅ Confirm Payment</Button>
                </Form>
            </Modal>

            {/* Flexible Payment Modal for Company */}
            <Modal
                title={`Advance & Payment Settlement: ${selectedCompanyData?.name}`}
                open={isFlexiblePayModalVisible}
                onCancel={() => { setIsFlexiblePayModalVisible(false); monthWiseForm.resetFields(); advanceForm.resetFields(); setSelectedBillsToPay([]); }}
                footer={null}
                width={700}
                destroyOnClose
            >
                {selectedCompanyData && (
                    <div style={{ marginBottom: 16, padding: '12px', background: '#fafafa', borderRadius: '6px', border: '1px solid #f0f0f0' }}>
                        <Row gutter={[16, 8]}>
                            <Col span={24}>
                                <Text type="secondary">Company Outstanding Balance:</Text>
                                <Text type={(selectedCompanyData.outstanding || 0) > 0 ? 'danger' : 'success'} strong style={{ fontSize: 16, marginLeft: 8 }}>
                                    ৳ {Math.abs(selectedCompanyData.outstanding || 0).toLocaleString()} {(selectedCompanyData.outstanding || 0) > 0 ? '(Due)' : (selectedCompanyData.outstanding < 0 ? '(Advance)' : '')}
                                </Text>
                            </Col>
                        </Row>
                    </div>
                )}

                <Tabs activeKey={paymentTab} onChange={setPaymentTab} items={[
                    {
                        key: 'bill-wise', label: 'Bill-Wise Settlement',
                        children: (
                            <Form layout="vertical" onFinish={handleFlexibleCompanyPayment}>
                                <Table
                                    size="small" dataSource={pendingCompanyBills} rowKey="id"
                                    rowSelection={{ selectedRowKeys: selectedBillsToPay, onChange: setSelectedBillsToPay }}
                                    pagination={{ pageSize: 5 }}
                                    columns={[
                                        { title: 'Invoice', dataIndex: 'id' },
                                        { title: 'Date', dataIndex: 'date', render: d => dayjs(d).format('DD MMM YY') },
                                        { title: 'Due Amount', dataIndex: 'due', render: v => <Text type="danger" strong>৳{v.toLocaleString()}</Text> }
                                    ]}
                                    style={{ marginBottom: 16 }}
                                />
                                <Form.Item name="method" label="Payment Method" initialValue="Cash" rules={[{ required: true }]}>
                                    <Select><Option value="Cash">Cash</Option><Option value="Bkash">Bkash</Option><Option value="Bank">Bank</Option><Option value="Cheque">Cheque</Option></Select>
                                </Form.Item>
                                <Button type="primary" htmlType="submit" disabled={selectedBillsToPay.length === 0} style={{ width: '100%', backgroundColor: '#52c41a' }}>Settle Selected Bills</Button>
                            </Form>
                        )
                    },
                    {
                        key: 'month-wise', label: 'Month-Wise Settlement',
                        children: (
                            <Form form={monthWiseForm} layout="vertical" onFinish={handleFlexibleCompanyPayment}>
                                {monthOptions.length > 0 ? (
                                    <Form.Item name="month" label="Select Month to Clear Dues" rules={[{ required: true }]}>
                                        <Select options={monthOptions} size="large" />
                                    </Form.Item>
                                ) : <Alert message="No pending bills found." type="info"  style={{ marginBottom: 16 }} />}
                                <Form.Item name="method" label="Payment Method" initialValue="Cash" rules={[{ required: true }]}>
                                    <Select><Option value="Cash">Cash</Option><Option value="Bkash">Bkash</Option><Option value="Bank">Bank</Option><Option value="Cheque">Cheque</Option></Select>
                                </Form.Item>
                                <Button type="primary" htmlType="submit" disabled={monthOptions.length === 0} style={{ width: '100%', backgroundColor: '#52c41a' }}>Clear Month's Dues</Button>
                            </Form>
                        )
                    },
                    {
                        key: 'advance', label: 'Lump Sum / Advance',
                        children: (
                            <Form form={advanceForm} layout="vertical" onFinish={handleFlexibleCompanyPayment}>
                                <Form.Item name="amount" label="Advance Amount (৳)" rules={[{ required: true, message: 'Please enter amount' }]}>
                                    <InputNumber min={1} size="large" style={{ width: '100%' }} />
                                </Form.Item>
                                <Form.Item name="method" label="Payment Method" initialValue="Cash" rules={[{ required: true }]}>
                                    <Select><Option value="Cash">Cash</Option><Option value="Bkash">Bkash</Option><Option value="Bank">Bank</Option><Option value="Cheque">Cheque</Option></Select>
                                </Form.Item>
                                <Button type="primary" htmlType="submit" style={{ width: '100%', backgroundColor: '#52c41a' }}>Deposit to Wallet</Button>
                            </Form>
                        )
                    }
                ]} />
            </Modal>

            {/* Add New Company Modal */}
            <Modal
                title={<span><BankOutlined /> Add New Company</span>}
                open={isAddCompanyModalVisible}
                onCancel={() => { setIsAddCompanyModalVisible(false); addCompanyForm.resetFields(); }}
                footer={null}
                destroyOnClose
            >
                <Form form={addCompanyForm} layout="vertical" onFinish={handleAddCompany}>
                    <Form.Item name="name" label="Company Name" rules={[{ required: true, message: 'Please enter company name' }]}>
                        <Input placeholder="e.g. ABC Corporation" size="large" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="contactPerson" label="Contact Person">
                                <Input placeholder="Name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="Phone Number">
                                <Input placeholder="017..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="email" label="Email Address">
                        <Input type="email" placeholder="email@example.com" />
                    </Form.Item>
                    <Form.Item name="openingBalance" label="Opening Balance / Previous Dues (৳)" tooltip="If the company already owes money, enter it here.">
                        <InputNumber min={0} style={{ width: '100%' }} size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" style={{ backgroundColor: '#1890ff' }}>
                        Save Company
                    </Button>
                </Form>
            </Modal>

            {/* Add New Customer Modal */}
            <Modal
                title={<span>👤 Add New Customer</span>}
                open={isAddCustomerModalVisible}
                onCancel={() => { setIsAddCustomerModalVisible(false); addCustomerForm.resetFields(); }}
                footer={null}
                destroyOnClose
            >
                <Form form={addCustomerForm} layout="vertical" onFinish={handleAddCustomer}>
                    <Form.Item name="name" label="Customer Name" rules={[{ required: true, message: 'Please enter customer name' }]}>
                        <Input placeholder="Enter full name" size="large" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Please enter phone number' }]}>
                        <Input placeholder="e.g. 01700-000000" size="large" />
                    </Form.Item>
                    <Form.Item name="vehicleNo" label="Vehicle Number">
                        <Input placeholder="e.g. DHA-11-2034" size="large" />
                    </Form.Item>
                    <Form.Item name="initialBalance" label="Initial Balance (৳)" tooltip="Positive for Advance, Negative for Due">
                        <InputNumber style={{ width: '100%' }} size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" style={{ backgroundColor: '#1890ff' }}>
                        Save Customer
                    </Button>
                </Form>
            </Modal>

            {/* Add New Supplier Modal */}
            <Modal
                title={<span>📦 Add New Supplier</span>}
                open={isAddSupplierModalVisible}
                onCancel={() => { setIsAddSupplierModalVisible(false); addSupplierForm.resetFields(); }}
                footer={null}
                destroyOnClose
            >
                <Form form={addSupplierForm} layout="vertical" onFinish={handleAddSupplier}>
                    <Form.Item name="name" label="Supplier Name" rules={[{ required: true, message: 'Please enter supplier name' }]}>
                        <Input placeholder="e.g. XYZ Spare Parts Ltd" size="large" />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="contactPerson" label="Contact Person">
                                <Input placeholder="Name" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Please enter phone number' }]}>
                                <Input placeholder="017..." />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Form.Item name="category" label="Category" initialValue="General">
                        <Select>
                            <Option value="General">General</Option>
                            <Option value="Parts">Spare Parts</Option>
                            <Option value="Tyres">Tyres & Battery</Option>
                            <Option value="Oil">Oil & Lubricants</Option>
                            <Option value="Body">Body/Paint Supplies</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item name="address" label="Address">
                        <Input.TextArea rows={2} placeholder="Office/Shop Address" />
                    </Form.Item>
                    <Form.Item name="openingBalance" label="Opening Balance / Previous Dues (৳)">
                        <InputNumber min={0} style={{ width: '100%' }} size="large" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block size="large" style={{ backgroundColor: '#1890ff' }}>
                        Save Supplier
                    </Button>
                </Form>
            </Modal>
        </div>
    );
};

export default LedgersPage;






