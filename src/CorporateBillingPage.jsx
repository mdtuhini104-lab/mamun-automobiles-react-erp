import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { Typography, Card, Table, Button, Space, Modal, Form, Input, InputNumber, Select, message, Tag, Row, Col, Divider, Alert, DatePicker, Radio, AutoComplete, Empty, Tooltip, Statistic, Tabs, theme } from 'antd';
import { Building2, FileText, Settings } from 'lucide-react';
import SmartVoiceInput from './components/SmartVoiceInput';
import { useGlobalState } from './contexts/GlobalStateContext';
import { syncToLocalStorage, getFromLocalStorage, formatCurrency } from './utils/helpers';
import dayjs from 'dayjs';
import { createPortal } from 'react-dom';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import LuxuryCarWatermarkSVG from './components/LuxuryCarWatermarkSVG';

const { Title, Text } = Typography;
const { Option } = Select;

const PrintCorporateBill = ({ bill }) => {
    if (!bill) return null;
    
    return createPortal(
        <div className="alive-print-area">
            <LuxuryCarWatermarkSVG opacity={0.08} />
            {/* Spiritual Invocation */}
            <div style={{ textAlign: 'center', fontSize: '16px', fontWeight: 600, marginBottom: 5, color: '#000', letterSpacing: '0.5px' }}>
                Bismillahir Rahmanir Rahim
            </div>

            <BrandedDocumentHeader
                title="CORPORATE MONTHLY BILL"
                subtitle="Mamun Automobiles"
                meta={[
                    { label: 'Bill ID', value: bill.id },
                    { label: 'Month', value: bill.billingMonthLabel },
                    { label: 'Company', value: bill.companyName },
                    { label: 'Date', value: dayjs().format('DD MMM YYYY') }
                ]}
            />

            <div style={{ marginTop: 15, flex: 1, display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 25 }}>
                    <div style={{ width: '48%' }}>
                        <Text type="secondary" style={{ fontSize: 13, fontWeight: 600, color: '#64748b' }}>Bill to / Corporate client</Text>
                        <div style={{ fontSize: 24, fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>{bill.companyName}</div>
                    </div>
                </div>

                <style>{`
                    .premium-print-table {
                        border-collapse: collapse !important;
                        border-spacing: 0 !important;
                        border: 7px double #000 !important;
                        width: 100% !important;
                        margin-bottom: 25px !important;
                        table-layout: fixed !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }
                    .premium-print-table th, .premium-print-table td {
                        border: 5px double #000 !important;
                        padding: 10px 8px !important;
                        color: #000 !important;
                        word-wrap: break-word !important;
                    }
                    .premium-print-table th {
                        background-color: #2D326E !important;
                        color: #ffffff !important;
                        font-weight: 950 !important;
                        text-transform: uppercase !important;
                        font-size: 14px !important;
                        letter-spacing: 1px !important;
                    }
                `}</style>

                <table className="premium-print-table">
                    <thead>
                        <tr>
                            <th style={{ textAlign: 'left' }}>Description</th>
                            <th style={{ textAlign: 'right', width: '150px' }}>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td style={{ fontWeight: 600 }}>Monthly Base Contract / Rental Summary</td>
                            <td style={{ textAlign: 'right', fontWeight: 800 }}>৳ {bill.baseAmount?.toLocaleString()}</td>
                        </tr>
                        {bill.extraCharges > 0 && (
                            <tr>
                                <td style={{ fontWeight: 600 }}>Extra Charges (Fuel, Toll, Others)</td>
                                <td style={{ textAlign: 'right', fontWeight: 800 }}>৳ {bill.extraCharges?.toLocaleString()}</td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {bill.lineItems?.length > 0 && (
                    <div style={{ marginTop: 10 }}>
                        <Text strong style={{ fontSize: 13, color: '#2D326E', textTransform: 'uppercase' }}>Detailed Trip Context:</Text>
                        <table className="premium-print-table" style={{ marginTop: 10 }}>
                            <thead>
                                <tr>
                                    <th style={{ fontSize: '11px !important' }}>Vehicle</th>
                                    <th style={{ fontSize: '11px !important' }}>Days</th>
                                    <th style={{ fontSize: '11px !important' }}>Rate</th>
                                    <th style={{ textAlign: 'right', fontSize: '11px !important' }}>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {bill.lineItems.map((item, idx) => (
                                    <tr key={idx}>
                                        <td style={{ fontSize: 12 }}>{item.plateNo}</td>
                                        <td style={{ fontSize: 12 }}>{item.days}</td>
                                        <td style={{ fontSize: 12 }}>৳{item.rate.toLocaleString()}</td>
                                        <td style={{ textAlign: 'right', fontWeight: 700, fontSize: 12 }}>৳{item.amount.toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="alive-footer-lock">
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 25 }}>
                    <div style={{ width: 320 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '15px 0', fontSize: 24, fontWeight: 600, color: '#000', borderBottom: '7px double #000' }}>
                            <span>Grand total:</span>
                            <span>৳ {bill.totalAmount?.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 35, marginTop: 40 }}>
                    <div style={{ textAlign: 'center', width: '240px', borderTop: '5.5px double #000', paddingTop: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Accounts Dept.</span>
                    </div>
                    <div style={{ textAlign: 'center', width: '240px', borderTop: '5.5px double #000', paddingTop: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700 }}>Authorized Signatory</span>
                    </div>
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', fontSize: '14px', color: '#000000', marginTop: 15 }}>
                    <div style={{ maxWidth: '60%', lineHeight: 1.3, fontSize: '13px', background: '#F0F0FF', padding: '10px', border: '5.5px double #2D326E', WebkitPrintColorAdjust: 'exact' }}>
                        <div style={{ marginBottom: '5px' }}>
                            Note: <span style={{ fontStyle: 'italic' }}>This monthly statement is generated based on the active corporate contract. Please clear dues within 7 days.</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right', maxWidth: '42%', lineHeight: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>
                        <span style={{ fontWeight: 950 }}>Dua for Traveling: "Bismillahi majreha wa mursaha, inna Rabbi la-Ghafurur Rahim."</span>
                    </div>
                </div>
                
                <div style={{ textAlign: 'center', fontSize: 9, color: '#AAA', marginTop: 20, borderTop: '1px solid #eee', paddingTop: 10 }}>
                    MAMUN AUTOMOBILES // CORPORATE SERVICES // ANTI-GRAVITY ALIGNMENT v1.5
                </div>
            </div>
        </div>,
        document.body
    );
};

const CorporateBillingPage = () => {
    const { token } = theme.useToken();
    const { companies, rentalTrips } = useGlobalState();
    const [bills, setBills] = React.useState(() => getFromLocalStorage('corporateBills') || []);
    const [profiles, setProfiles] = React.useState(() => getFromLocalStorage('corporateBillingProfiles') || []);
    const [isBillModal, setIsBillModal] = React.useState(false);
    const [isProfileModal, setIsProfileModal] = React.useState(false);
    const [billForm] = Form.useForm();
    const [profileForm] = Form.useForm();
    
    const [printingBill, setPrintingBill] = React.useState(null);
    const [isPrinting, setIsPrinting] = React.useState(false);

    React.useEffect(() => {
        if (isPrinting && printingBill) {
            bufferedPrint(() => {
                setIsPrinting(false);
                setPrintingBill(null);
            });
        }
    }, [isPrinting, printingBill]);

    React.useEffect(() => { syncToLocalStorage('corporateBills', bills); }, [bills]);
    React.useEffect(() => { syncToLocalStorage('corporateBillingProfiles', profiles); }, [profiles]);

    // Unique companies list combining trips, company list, and profiles
    const companyList = React.useMemo(() => {
        const fromTrips = [...new Set((rentalTrips || []).map(t => t.companyName || t.customerName).filter(Boolean))];
        const fromCompanies = (companies || []).map(c => c.companyName || c.name).filter(Boolean);
        const fromProfiles = profiles.map(p => p.companyName);
        return [...new Set([...fromTrips, ...fromCompanies, ...fromProfiles])].sort();
    }, [rentalTrips, companies, profiles]);

    // --- Profile Management ---
    const handleSaveProfile = (values) => {
        setProfiles(prev => {
            const existing = prev.find(p => p.companyName === values.companyName);
            if (existing) {
                return prev.map(p => p.companyName === values.companyName ? { ...p, monthlyContractAmount: Number(values.monthlyContractAmount) } : p);
            }
            return [...prev, {
                id: `PROF-${Date.now()}`,
                companyName: values.companyName,
                monthlyContractAmount: Number(values.monthlyContractAmount),
                createdAt: dayjs().toISOString()
            }];
        });
        setIsProfileModal(false);
        profileForm.resetFields();
        message.success(`Billing profile saved for ${values.companyName}`);
    };

    const handleDeleteProfile = (id) => {
        setProfiles(prev => prev.filter(p => p.id !== id));
        message.success('Billing profile deleted.');
    };

    // --- Bill Generation ---
    const getCompanyTrips = (companyName, month) => {
        return (rentalTrips || []).filter(t => {
            const name = t.companyName || t.customerName || '';
            const tripMonth = dayjs(t.startDate).format('YYYY-MM');
            return name.toLowerCase() === companyName.toLowerCase() && tripMonth === month;
        });
    };

    // Auto-fill form when company or month changes
    const onBillFormValuesChange = (changedValues, allValues) => {
        if (changedValues.companyName || changedValues.billingMonth) {
            const cName = allValues.companyName;
            const bMonth = allValues.billingMonth;
            if (cName && bMonth) {
                const profile = profiles.find(p => p.companyName === cName);
                if (profile) {
                    billForm.setFieldsValue({ baseAmount: profile.monthlyContractAmount });
                } else {
                    // Calculate from auto trips
                    const trips = getCompanyTrips(cName, bMonth.format('YYYY-MM'));
                    let sum = 0;
                    trips.forEach(t => {
                        const days = Math.max(1, dayjs(t.endDate || dayjs()).diff(dayjs(t.startDate), 'day'));
                        sum += days * (t.dailyRate || 0);
                    });
                    billForm.setFieldsValue({ baseAmount: sum });
                }
            }
        }
    };

    const handleGenerateBill = (values) => {
        const month = values.billingMonth.format('YYYY-MM');
        const trips = getCompanyTrips(values.companyName, month);

        const lineItems = trips.map(trip => {
            const days = Math.max(1, dayjs(trip.endDate || dayjs()).diff(dayjs(trip.startDate), 'day'));
            return {
                vehicle: trip.carModel || trip.vehiclePlate || 'Vehicle',
                plateNo: trip.vehiclePlate || '',
                days,
                rate: trip.dailyRate || 0,
                amount: days * (trip.dailyRate || 0)
            };
        });

        const totalAmount = Number(values.baseAmount) + (Number(values.extraCharges) || 0);

        const newBill = {
            id: `CORP-${Date.now()}`,
            companyName: values.companyName,
            billingMonth: month,
            billingMonthLabel: values.billingMonth.format('MMMM YYYY'),
            lineItems,
            baseAmount: Number(values.baseAmount),
            extraCharges: Number(values.extraCharges) || 0,
            extraNotes: values.extraNotes || '',
            totalAmount,
            paidAmount: 0,
            status: 'Unpaid',
            payments: [], 
            createdAt: dayjs().toISOString()
        };

        setBills(prev => [newBill, ...prev]);
        setIsBillModal(false);
        billForm.resetFields();
        message.success(`Monthly bill generated for ${values.companyName} — ${values.billingMonth.format('MMMM YYYY')}`);
    };

    // --- Payment Receive (Partial support) ---
    const [payModal, setPayModal] = React.useState(null);
    const [payForm] = Form.useForm();

    const handleReceivePayment = (values) => {
        const billId = payModal.id;
        const depositAmount = Number(values.amount);
        const method = values.method;
        const chequeNo = values.chequeNo || '';

        setBills(prev => prev.map(b => {
            if (b.id !== billId) return b;
            
            const newPaid = b.paidAmount + depositAmount;
            const newStatus = newPaid >= b.totalAmount ? 'Paid' : (newPaid > 0 ? 'Partially Paid' : 'Unpaid');

            const newPaymentEntry = {
                date: dayjs().toISOString(),
                amount: depositAmount,
                method,
                chequeNo
            };

            // If cheque, add to bank cheques array
            if (method === 'Cheque' && chequeNo) {
                const existingCheques = getFromLocalStorage('bankCheques') || [];
                existingCheques.unshift({
                    id: `CHQ-${Date.now()}`,
                    chequeNo,
                    bankAccountId: '', 
                    amount: depositAmount,
                    payerName: b.companyName,
                    source: 'Corporate Billing',
                    depositDate: dayjs().toISOString(),
                    expectedClearDate: dayjs().add(3, 'day').toISOString(),
                    status: 'Deposited',
                    notes: `Bill: ${b.billingMonthLabel} (Partial) - Auto`
                });
                syncToLocalStorage('bankCheques', existingCheques);
            }

            return {
                ...b,
                paidAmount: newPaid,
                status: newStatus,
                payments: [...(b.payments || []), newPaymentEntry],
                lastPaymentDate: dayjs().toISOString()
            };
        }));
        setPayModal(null);
        payForm.resetFields();
        message.success(`Payment received successfully!`);
    };

    // Stats
    const totalUnpaid = bills.filter(b => ['Unpaid', 'Partially Paid'].includes(b.status)).reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0);
    const totalPaid = bills.reduce((s, b) => s + b.paidAmount, 0);

    const billColumns = [
        { title: 'Company', dataIndex: 'companyName', render: (v) => <Text strong>{v}</Text> },
        { title: 'Month', dataIndex: 'billingMonthLabel' },
        { title: 'Total Amount', dataIndex: 'totalAmount', render: (v) => <Text strong>৳ {formatCurrency(v)}</Text> },
        { title: 'Paid', dataIndex: 'paidAmount', render: (v) => <Text style={{ color: '#52c41a' }} strong>৳ {formatCurrency(v)}</Text> },
        { title: 'Due', render: (_, row) => <Text type="danger" strong>৳ {formatCurrency(row.totalAmount - row.paidAmount)}</Text> },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (v) => {
                const color = v === 'Paid' ? 'success' : v === 'Partially Paid' ? 'processing' : 'warning';
                return <Tag color={color}>{v}</Tag>;
            }
        },
        {
            title: 'Action',
            render: (_, row) => (
                <Space>
                    <Button size="small" type="primary" onClick={() => {
                        setPayModal(row);
                        payForm.setFieldsValue({ amount: row.totalAmount - row.paidAmount, method: 'Cheque' });
                    }}>Receive</Button>
                    <Button size="small" onClick={() => {
                        setPrintingBill(row);
                        setIsPrinting(true);
                    }}>Print Bill</Button>
                </Space>
            )
        }
    ];

    const profileColumns = [
        { title: 'Company Name', dataIndex: 'companyName', render: (v) => <Text strong>{v}</Text> },
        { title: 'Monthly Contract (Base)', dataIndex: 'monthlyContractAmount', render: (v) => <Text strong style={{ color: '#1d4ed8' }}>৳ {formatCurrency(v)}</Text> },
        { title: 'Configured On', dataIndex: 'createdAt', render: (v) => dayjs(v).format('DD MMM YYYY') },
        { title: 'Action', render: (_, row) => <Button size="small" danger onClick={() => handleDeleteProfile(row.id)}>Delete</Button> }
    ];

    return (
        <div style={{ maxWidth: 1300, margin: '0 auto' }}>
            {printingBill && <PrintCorporateBill bill={printingBill} />}
            <div className="no-print">
                <div style={{ marginBottom: 20 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 600 }}>
                    <Space><Building2 size={28} style={{ color: token.colorPrimary }} /> Corporate bills & contracts</Space>
                </Title>
                <Text type="secondary">Manage fixed monthly contracts, generate corporate bills, and receive partial or full payments (Cash/Cheque).</Text>
            </div>

            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                <Col xs={8}>
                    <Card className="glass-card" size="small">
                        <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>Total Billed Value</Text>}
                            value={totalPaid + totalUnpaid} prefix="৳" valueStyle={{ color: token.colorTextBase, fontSize: 24, fontWeight: 700 }}
                            formatter={(v) => formatCurrency(v)} />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card className="glass-card" size="small">
                        <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>Total Due (Receivable)</Text>}
                            value={totalUnpaid} prefix="৳" valueStyle={{ color: '#ff4d4f', fontSize: 24, fontWeight: 700 }}
                            formatter={(v) => formatCurrency(v)} />
                    </Card>
                </Col>
                <Col xs={8}>
                    <Card className="glass-card" size="small">
                        <Statistic title={<Text type="secondary" style={{ fontSize: 12 }}>Total Collected</Text>}
                            value={totalPaid} prefix="৳" valueStyle={{ color: '#52c41a', fontSize: 24, fontWeight: 700 }}
                            formatter={(v) => formatCurrency(v)} />
                    </Card>
                </Col>
            </Row>

            <Tabs defaultActiveKey="bills" items={[
                {
                    key: 'bills',
                    label: <Space><FileText size={14} /> Issued Bills ({bills.length})</Space>,
                    children: (
                        <Card className="glass-card" extra={<Button type="primary" onClick={() => setIsBillModal(true)}>Generate Monthly Bill</Button>}>
                            <Table
                                dataSource={bills}
                                columns={billColumns}
                                rowKey="id"
                                pagination={{ pageSize: 10 }}
                                locale={{ emptyText: <Empty description="No corporate bills generated yet." /> }}
                                expandable={{
                                    expandedRowRender: (record) => (
                                        <div style={{ padding: '0 20px 20px', background: 'rgba(0,0,0,0.02)', borderRadius: 8 }}>
                                            <Divider style={{ margin: '10px 0' }} />
                                            <Row gutter={24}>
                                                <Col span={12}>
                                                    <Text strong>Vehicles / Line Items (Context)</Text>
                                                    <Table
                                                        dataSource={record.lineItems || []}
                                                        rowKey={(_, idx) => idx}
                                                        pagination={false}
                                                        size="small"
                                                        columns={[
                                                            { title: 'Vehicle', dataIndex: 'plateNo' },
                                                            { title: 'Days', dataIndex: 'days' },
                                                        ]}
                                                    />
                                                </Col>
                                                <Col span={12}>
                                                    <Text strong>Payment History ({record.payments?.length || 0})</Text>
                                                    <Table
                                                        dataSource={record.payments || []}
                                                        rowKey={(_, idx) => idx}
                                                        pagination={false}
                                                        size="small"
                                                        columns={[
                                                            { title: 'Date', dataIndex: 'date', render: (v) => dayjs(v).format('DD MMM') },
                                                            { title: 'Method', dataIndex: 'method', render: (v, r) => `${v} ${r.chequeNo ? `(#${r.chequeNo})` : ''}` },
                                                            { title: 'Amount', dataIndex: 'amount', render: (v) => <Text style={{ color: '#52c41a' }} strong>৳ {formatCurrency(v)}</Text> },
                                                        ]}
                                                    />
                                                </Col>
                                            </Row>
                                        </div>
                                    )
                                }}
                            />
                        </Card>
                    )
                },
                {
                    key: 'profiles',
                    label: <Space><Settings size={14} /> Billing Profiles ({profiles.length})</Space>,
                    children: (
                        <Card className="glass-card" extra={<Button onClick={() => setIsProfileModal(true)}>Add Billing Profile</Button>}>
                            <Table dataSource={profiles} columns={profileColumns} rowKey="id" pagination={false} locale={{ emptyText: <Empty description="Set monthly contract amounts for corporate clients here." /> }} />
                        </Card>
                    )
                }
            ]} />

            <Modal title="Add Company Billing Profile" open={isProfileModal} onCancel={() => setIsProfileModal(false)} onOk={() => profileForm.submit()} okText="Save Profile">
                <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile}>
                    <Form.Item name="companyName" label="Select or Type Company" rules={[{ required: true }]}>
                        <Select mode="tags" maxCount={1} placeholder="XYZ Corp" style={{ width: '100%' }}>
                            {companyList.map(c => <Option key={c} value={c}>{c}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="monthlyContractAmount" label="Fixed Monthly Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix="৳" min={0} />
                    </Form.Item>
                    <Text type="secondary">This base amount will auto-fill when you generate bills for this company.</Text>
                </Form>
            </Modal>

            <Modal title="Generate Monthly Corporate Bill" open={isBillModal} onCancel={() => setIsBillModal(false)} onOk={() => billForm.submit()} okText="Generate" width={550}>
                <Form form={billForm} layout="vertical" onFinish={handleGenerateBill} onValuesChange={onBillFormValuesChange}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="companyName" label="Company" rules={[{ required: true }]}>
                                <Select placeholder="Select company" showSearch allowClear>
                                    {companyList.map(c => <Option key={c} value={c}>{c}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="billingMonth" label="Billing Month" rules={[{ required: true }]}>
                                <DatePicker picker="month" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <div style={{ background: 'rgba(0,0,0,0.03)', padding: '12px', borderRadius: 8, marginBottom: 16 }}>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="baseAmount" label="Base Amount" rules={[{ required: true }]}>
                                    <InputNumber style={{ width: '100%' }} prefix="৳" />
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="extraCharges" label="Extra Charges (Toll, Fuel)">
                                    <InputNumber style={{ width: '100%' }} prefix="৳" />
                                </Form.Item>
                            </Col>
                        </Row>
                    </div>
                    <Form.Item name="extraNotes" label="Notes">
                        <SmartVoiceInput textarea rows={2} placeholder="Optional memo..." />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal title={`Receive Payment — ${payModal?.companyName}`} open={!!payModal} onCancel={() => setPayModal(null)} onOk={() => payForm.submit()} okText="Receive Payment">
                <div style={{ marginBottom: 20, background: '#fffbe6', border: '1px solid #ffe58f', padding: '10px 15px', borderRadius: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Total Bill Amount:</Text> <Text strong>৳ {formatCurrency(payModal?.totalAmount || 0)}</Text>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text>Already Paid:</Text> <Text strong style={{ color: '#52c41a' }}>৳ {formatCurrency(payModal?.paidAmount || 0)}</Text>
                    </div>
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Text strong>Current Due:</Text> <Text strong style={{ color: '#ff4d4f', fontSize: 16 }}>৳ {formatCurrency((payModal?.totalAmount || 0) - (payModal?.paidAmount || 0))}</Text>
                    </div>
                </div>

                <Form form={payForm} layout="vertical" onFinish={handleReceivePayment}>
                    <Form.Item name="amount" label="Deposit Amount" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} prefix="৳" max={(payModal?.totalAmount || 0) - (payModal?.paidAmount || 0)} />
                    </Form.Item>
                    <Form.Item name="method" label="Payment Method" rules={[{ required: true }]}>
                        <Select>
                            <Option value="Cash">Cash</Option>
                            <Option value="Cheque">Cheque</Option>
                            <Option value="Bank Transfer">Bank Transfer</Option>
                            <Option value="Bkash/Nagad">Bkash/Nagad</Option>
                        </Select>
                    </Form.Item>
                    <Form.Item noStyle shouldUpdate={(prev, cur) => prev.method !== cur.method}>
                        {({ getFieldValue }) => getFieldValue('method') === 'Cheque' && (
                            <Form.Item name="chequeNo" label="Cheque Number" rules={[{ required: true }]}>
                                <SmartVoiceInput placeholder="Enter cheque number" />
                            </Form.Item>
                        )}
                    </Form.Item>
                </Form>
            </Modal>
            </div>
        </div>
    );
};

export default CorporateBillingPage;
