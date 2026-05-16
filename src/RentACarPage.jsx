import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';
import { Card, Table, Button, Modal, Form, Input, InputNumber, Select, Typography, Space, Tag, Row, Col, DatePicker, message, Upload, Divider, Checkbox } from 'antd';
import { CarOutlined } from '@ant-design/icons';

import { useGlobalState } from './contexts/GlobalStateContext';
import dayjs from 'dayjs';
import databaseBridge from './services/databaseBridge';
import { jsPDF } from 'jspdf';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import downloadElementAsPdf from './utils/domPdf';

const { Title, Text } = Typography;
const { Option } = Select;

const PrintRentalAgreement = ({ trip }) => {
    if (!trip) return null;
    const car = trip.carId || {};
    
    return createPortal(
        <div className="alive-print-area">
            <BrandedDocumentHeader
                title="Rental agreement / চুক্তিপত্র"
                subtitle="Mamun Automobiles"
                meta={[
                    { label: 'Date', value: dayjs().format('DD MMM YYYY') },
                    { label: 'Agreement ID', value: `RENT-${trip.id?.toString().slice(-6).toUpperCase() || 'NEW'}` }
                ]}
            />

            <div style={{ marginTop: 20, flex: 1 }}>
                <p style={{ fontSize: 13 }}>This Rental Agreement is made between <strong>Mamun Automobiles</strong> (Owner) and <strong>{trip.customerName}</strong> (Renter).</p>
                
                <h4 style={{ borderBottom: '2px solid #000', paddingBottom: 5, marginTop: 20, textTransform: 'uppercase', fontSize: 13 }}>Vehicle & Trip Details</h4>
                <table className="premium-print-table">
                    <tbody>
                        <tr>
                            <td style={{ width: '150px' }}><strong>Vehicle:</strong></td>
                            <td>{car.make} {car.model} ({car.plateNumber})</td>
                        </tr>
                        <tr>
                            <td><strong>Destination:</strong></td>
                            <td>{trip.destination}</td>
                        </tr>
                        <tr>
                            <td><strong>Start Date:</strong></td>
                            <td>{dayjs(trip.startDate).format('DD MMM YYYY, hh:mm A')}</td>
                        </tr>
                        <tr>
                            <td><strong>Daily Rate:</strong></td>
                            <td>৳{trip.dailyRate?.toLocaleString()}</td>
                        </tr>
                    </tbody>
                </table>

                <h4 style={{ borderBottom: '2px solid #000', paddingBottom: 5, marginTop: 20, textTransform: 'uppercase', fontSize: 13 }}>Terms & Conditions / শর্তাবলী</h4>
                <div style={{ fontSize: 11, lineHeight: 1.6 }}>
                    <p>১. গাড়ি চালানোর সময় ট্রাফিক আইন মেনে চলতে হবে। (Traffic rules must be followed.)</p>
                    <p>২. কোনো দুর্ঘটনা বা যান্ত্রিক ক্ষতির জন্য ভাড়াটিয়া দায়ী থাকবে। (Renter responsible for damages.)</p>
                    <p>৩. নির্ধারিত সময়ের বেশি গাড়ি রাখলে অতিরিক্ত চার্জ প্রযোজ্য হবে। (Overtime charges apply.)</p>
                    <p>৪. Fuel and tolls are to be paid by the renter unless otherwise agreed.</p>
                </div>

                {trip.consentGiven && (
                    <div style={{ marginTop: 20, padding: '10px', border: '1.5px solid #52c41a', backgroundColor: '#f6ffed' }}>
                        <p style={{ color: '#52c41a', fontWeight: 'bold', margin: 0, fontSize: 12 }}>
                             ✓ DIGITALLY SIGNED & ACCEPTED
                        </p>
                        <p style={{ fontSize: '11px', color: '#1e293b', margin: '4px 0 0 0' }}>
                            Accepted by {trip.customerName} on {dayjs(trip.consentDate || trip.createdAt).format('DD MMM YYYY, hh:mm A')}
                        </p>
                    </div>
                )}
            </div>

            <div className="alive-footer-lock">
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 40 }}>
                    <div style={{ textAlign: 'center', width: '200px', borderTop: '1.5px solid #000', paddingTop: 8, fontSize: 11, fontWeight: 700 }}>Owner Signature</div>
                    <div style={{ textAlign: 'center', width: '200px', borderTop: '1.5px solid #000', paddingTop: 8, fontSize: 11, fontWeight: 700 }}>Renter Signature</div>
                </div>
                <div style={{ textAlign: 'center', fontSize: 9, color: '#64748b', borderTop: '1px solid #eee', paddingTop: 10 }}>
                    Mamun Automobiles // Luxury Rent-A-Car // Anti-Gravity Engine Active
                </div>
            </div>
        </div>,
        document.body
    );
};


const RentACarPage = () => {
    const { rentACars, setRentACars, rentalTrips, setRentalTrips, addBill, logActivity } = useGlobalState();
    const [isCarModalVisible, setIsCarModalVisible] = React.useState(false);
    const [isTripModalVisible, setIsTripModalVisible] = React.useState(false);
    const [selectedCar, setSelectedCar] = React.useState(null);
    const [printingTrip, setPrintingTrip] = React.useState(null);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [isEndTripModalVisible, setIsEndTripModalVisible] = React.useState(false);
    const [endingTrip, setEndingTrip] = React.useState(null);
    const [carForm] = Form.useForm();
    const [tripForm] = Form.useForm();
    const [endTripForm] = Form.useForm();

    React.useEffect(() => {
        const load = async () => {
            try {
                const [cars, trips] = await Promise.all([
                    databaseBridge.fetchRentalCars(),
                    databaseBridge.fetchRentalTrips()
                ]);
                setRentACars(cars || []);
                setRentalTrips(trips || []);
            } catch (err) {
                console.error("Failed to load rental data", err);
            }
        };
        load();
    }, []);

    React.useEffect(() => {
        if (isPrinting && printingTrip) {
            bufferedPrint(() => setIsPrinting(false));
        }
    }, [isPrinting, printingTrip]);

    const handleAddCar = async (values) => {
        try {
            const saved = await databaseBridge.addRentalCar({ ...values, status: 'Available' });
            setRentACars([saved, ...(rentACars || [])]);
            logActivity(`Added rental car: ${values.plateNumber}`);
            message.success('Rental car added!');
            setIsCarModalVisible(false);
            carForm.resetFields();
        } catch (err) {
            message.error('Error adding car: ' + err.message);
        }
    };

    const handleStartTrip = async (values) => {
        if (!selectedCar) return;
        const tripData = {
            carId: selectedCar.id,
            customerName: values.customerName,
            customerPhone: values.customerPhone,
            driverName: values.driverName,
            destination: values.destination,
            advancePayment: values.advancePayment,
            startDate: values.startDate.toISOString(),
            status: 'Ongoing',
            dailyRate: selectedCar.dailyRate,
            consentGiven: values.consentGiven,
            consentDate: values.consentGiven ? new Date().toISOString() : null
        };

        try {
            const savedTrip = await databaseBridge.addRentalTrip(tripData);
            setRentalTrips([savedTrip, ...(rentalTrips || [])]);
            
            // Update car status
            setRentACars(prev => prev.map(c => c.id === selectedCar.id ? { ...c, status: 'Rented' } : c));
            
            logActivity(`Trip started for ${selectedCar.plateNumber} by ${values.customerName}`);
            message.success('Trip started!');
            setIsTripModalVisible(false);
            tripForm.resetFields();
        } catch (err) {
            message.error('Error starting trip: ' + err.message);
        }
    };

    const handleEndTripPrompt = (trip) => {
        const endDate = dayjs();
        const startDate = dayjs(trip.startDate);
        const days = Math.max(1, endDate.diff(startDate, 'day'));
        const totalAmount = days * (trip.dailyRate || 0);
        
        setPrintingTrip(trip);
        setEndingTrip(trip);
        endTripForm.setFieldsValue({
            totalAmount: totalAmount,
            fuelExpense: 0,
            tollExpense: 0,
        });
        setIsEndTripModalVisible(true);
    };

    const submitEndTrip = async (values) => {
        try {
            const result = await databaseBridge.endRentalTrip(endingTrip.id, values);
            
            // 1. Generate Invoice locally if you want it visible on board
            const newInvoice = {
                id: `INV-RENT-${Date.now()}`,
                billNo: `RT-${Date.now().toString().slice(-4)}`,
                date: dayjs().toISOString(),
                customerName: endingTrip.customerName,
                phone: endingTrip.customerPhone,
                vehicleNo: endingTrip.carId?.plateNumber || 'Rental',
                amount: values.totalAmount,
                netPayable: values.totalAmount,
                paid: 0,
                due: values.totalAmount,
                status: 'Unpaid',
                note: `Rental Trip Fee (${endingTrip.destination})`
            };
            addBill(newInvoice);

            // Update UI State
            setRentACars(prev => prev.map(c => c.id === endingTrip.carId?.id || c.id === endingTrip.carId ? { ...c, status: 'Available' } : c));
            setRentalTrips(prev => prev.map(t => t.id === endingTrip.id ? result.data : t));

            logActivity(`Trip ended for ${endingTrip.customerName}. Bill: ৳${values.totalAmount}`);
            message.success('Trip ended and Master Ledger expenses updated!');
            setIsEndTripModalVisible(false);
            setEndingTrip(null);
        } catch (err) {
            message.error('Error ending trip: ' + err.message);
        }
    };

    const carColumns = [
        {
            title: 'Vehicle',
            key: 'vehicle',
            render: (_, record) => (
                <Space>
                    <CarOutlined style={{ fontSize: 20 }} />
                    <Space direction="vertical" size={0}>
                        <Text strong>{record.make} {record.model}</Text>
                        <Tag color="cyan">{record.plateNumber}</Tag>
                    </Space>
                </Space>
            )
        },
        {
            title: 'Daily Rate',
            dataIndex: 'dailyRate',
            render: (val) => `৳${val.toLocaleString()}`
        },
        {
            title: 'Status',
            dataIndex: 'status',
            render: (status) => (
                <Tag color={status === 'Available' ? 'green' : status === 'Rented' ? 'orange' : 'red'}>
                    {status}
                </Tag>
            )
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {record.status === 'Available' && (
                        <Button type="primary" size="small" onClick={() => { setSelectedCar(record); setIsTripModalVisible(true); }}>
                            Start Trip
                        </Button>
                    )}
                    {record.status === 'Rented' && (
                        <Tag color="warning">On Trip</Tag>
                    )}
                    <Button size="small" >Docs</Button>
                </Space>
            )
        }
    ];

    const tripColumns = [
        { title: 'Customer', dataIndex: 'customerName' },
        { title: 'Phone', dataIndex: 'customerPhone' },
        { 
            title: 'Start Date', 
            dataIndex: 'startDate', 
            render: (d) => dayjs(d).format('DD MMM HH:mm') 
        },
        {
            title: 'Current Bill',
            key: 'bill',
            render: (_, record) => {
                const days = Math.max(1, dayjs().diff(dayjs(record.startDate), 'day'));
                return `৳${(days * (record.dailyRate || 0)).toLocaleString()} (${days}d)`;
            }
        },
        {
            title: 'Action',
            key: 'action',
            render: (_, record) => (
                <Space>
                    {record.status === 'Ongoing' && (
                        <Button type="primary" danger size="small" onClick={() => handleEndTripPrompt(record)}>
                            End Trip
                        </Button>
                    )}
                    <Button size="small" onClick={() => generateAgreement(record)}>
                        Agreement
                    </Button>
                    <Button 
                        size="small" 
                        style={{ backgroundColor: '#25D366', color: 'white', border: 'none' }}
                        onClick={() => shareToWhatsApp(record)}
                    >
                        WhatsApp
                    </Button>
                </Space>
            )
        }
    ];

    const generateAgreement = async (trip) => {
        try {
            setPrintingTrip(trip);
            // Small delay to ensure the DOM is updated for html2canvas
            await new Promise(resolve => setTimeout(resolve, 300));
            await downloadElementAsPdf('rental-agreement-print-area', `Agreement_${trip.customerName}_${dayjs().format('YYYYMMDD')}.pdf`);
            message.success('Agreement Generated!');
            setPrintingTrip(null);
        } catch (err) {
            console.error('Agreement generation failed:', err);
            message.error('Failed to generate agreement PDF.');
        }
    };

    const shareToWhatsApp = (trip) => {
        const car = trip.carId || {};
        const text = `Hello ${trip.customerName}, here is your Rental Trip details for ${car.make} ${car.model} (${car.plateNumber}). Start Date: ${dayjs(trip.startDate).format('DD MMM')}. Daily Rate: BDT ${trip.dailyRate}. Thank you for choosing Mamun Automobiles!`;
        const url = `https://wa.me/${trip.customerPhone.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
        window.open(url, '_blank');
    };

    return (
        <div style={{ padding: '0 0px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                <div>
                    <Title level={3} style={{ margin: 0, fontWeight: 600 }}>Rent-a-car hub</Title>
                    <Text type="secondary">Manage fleet, ongoing trips, and automatic rentals</Text>
                </div>
                <Button type="primary" onClick={() => setIsCarModalVisible(true)} className="premium-blue-btn" style={{ background: '#3B82F6', border: 'none' }}>
                    Register Vehicle
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                <Col span={15}>
                    <Card title="Vehicle Fleet" className="glass-card shadow-sm">
                        <Table dataSource={rentACars} columns={carColumns} rowKey="id" pagination={{ pageSize: 5 }} />
                    </Card>
                </Col>
                <Col span={9}>
                    <Card title="Ongoing Trips" className="glass-card shadow-sm" styles={{ header: { color: '#3B82F6' } }}>
                        <Table dataSource={rentalTrips} columns={tripColumns} rowKey="id" size="small" />
                    </Card>
                </Col>
            </Row>

            {/* Agreement Print Area - Invisible on screen */}
            <div style={{ position: 'absolute', left: '-9999px', top: '-9999px' }}>
                {printingTrip && <PrintRentalAgreement trip={printingTrip} />}
            </div>

            {/* REGISTER CAR MODAL */}
            <Modal title="Register Rental Vehicle" open={isCarModalVisible} onCancel={() => setIsCarModalVisible(false)} footer={null}>
                <Form layout="vertical" form={carForm} onFinish={handleAddCar}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="make" label="Make" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="model" label="Model" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="plateNumber" label="Plate Number" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="dailyRate" label="Daily Rate (৳)" rules={[{ required: true }]}><InputNumber style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Button type="primary" htmlType="submit" block className="premium-blue-btn" style={{ background: '#3B82F6', border: 'none' }}>Register</Button>
                </Form>
            </Modal>

            {/* START TRIP MODAL */}
            <Modal title="Start New Trip" open={isTripModalVisible} onCancel={() => setIsTripModalVisible(false)} footer={null} width={600}>
                <Form layout="vertical" form={tripForm} onFinish={handleStartTrip} initialValues={{ startDate: dayjs(), consentGiven: true, advancePayment: 0 }}>
                    <Row gutter={16}>
                        <Col span={12}><Form.Item name="customerName" label="Customer Name" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="customerPhone" label="Customer Phone" rules={[{ required: true }]}><Input /></Form.Item></Col>
                        <Col span={12}><Form.Item name="driverName" label="Driver's Name" rules={[{ required: true }]}><Input placeholder="Who is driving?" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="destination" label="Trip Destination" rules={[{ required: true }]}><Input placeholder="Where to?" /></Form.Item></Col>
                        <Col span={12}><Form.Item name="advancePayment" label="Advance Payment (৳)"><InputNumber style={{ width: '100%' }} min={0} /></Form.Item></Col>
                        <Col span={12}><Form.Item name="startDate" label="Start Date/Time" rules={[{ required: true }]}><DatePicker showTime style={{ width: '100%' }} /></Form.Item></Col>
                    </Row>
                    <Divider>Compliance & Agreement</Divider>
                    <Form.Item name="consentGiven" valuePropName="checked">
                        <Checkbox>
                            <Text strong>ভাড়াটিয়া সকল শর্তাবলীতে সম্মত আছেন।</Text>
                            <br />
                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                (Customer agrees to all rental terms and traffic regulations.)
                            </Text>
                        </Checkbox>
                    </Form.Item>

                    <Divider>Customer Documents</Divider>
                    <Upload listType="picture" maxCount={2}>
                        <Button >Upload NID / License</Button>
                    </Upload>
                    <br />
                    <Button type="primary" htmlType="submit" block className="premium-blue-btn" style={{ background: '#3B82F6', border: 'none' }}>Begin Trip</Button>
                </Form>
            </Modal>

            {/* END TRIP MODAL */}
            <Modal title="End Trip & Register Expenses" open={isEndTripModalVisible} onCancel={() => setIsEndTripModalVisible(false)} footer={null}>
                <div style={{ background: '#fffbe6', padding: '12px 16px', borderRadius: '4px', marginBottom: '24px', border: '1px solid #ffe58f' }}>
                    <Text type="warning" strong>Note:</Text> Fuel and Toll expenses entered here will instantly deduct from the Master Ledger as Expenses.
                </div>
                <Form layout="vertical" form={endTripForm} onFinish={submitEndTrip}>
                    <Form.Item name="totalAmount" label="Calculated Bill Amount (৳)" rules={[{ required: true }]}>
                        <InputNumber style={{ width: '100%' }} disabled />
                    </Form.Item>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="fuelExpense" label="Fuel Expense (৳)">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="tollExpense" label="Toll Expense (৳)">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Button type="primary" danger htmlType="submit" block>Finalize Trip & Sync Ledgers</Button>
                </Form>
            </Modal>
        </div>
    );
};

export default RentACarPage;






