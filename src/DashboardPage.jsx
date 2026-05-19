import React from 'react';
import { Typography, Row, Col, Input, Button, Modal, List, Card, Tag, Divider, message, Spin, Space } from 'antd';
import { DollarSign, Clipboard, ShieldCheck, AlertTriangle, TrendingUp, Sparkles, Mic, MicOff, ArrowRight, User, Phone, Calendar } from 'lucide-react';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { formatCurrency } from './utils/helpers';
import { generateBusinessTip } from './services/aiServiceV2';
import { t } from './utils/translations';
import LuxuryCarWatermarkSVG from './components/LuxuryCarWatermarkSVG';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

const { Title, Text } = Typography;

const toNumber = (value) => Number(value) || 0;
const normalizeMethod = (value) => String(value || '').trim().toLowerCase();
const isCashMethod = (method) => {
    const normalized = normalizeMethod(method);
    if (!normalized) return true;
    return normalized === 'cash';
};

const DashboardPage = () => {
    const {
        payments,
        jobCards,
        inventory,
        cashInEntries,
        savedBills,
        navigateTo,
        featureToggles: toggles,
        language
    } = useGlobalState();
    const { user } = useAuth();
    const { theme } = useTheme();
    
    const roleLower = (user?.role || '').toLowerCase();
    const isCustomer = roleLower.includes('customer');
    
    // Safety check: Never render Executive Dashboard for Customers
    if (isCustomer) return null;

    const todayRange = React.useMemo(() => {
        return {
            start: dayjs().startOf('day'),
            end: dayjs().endOf('day')
        };
    }, []);

    // ─── Filtered Data ───
    const myPayments = React.useMemo(() => payments || [], [payments]);
    const myJobCards = React.useMemo(() => jobCards || [], [jobCards]);
    const myCashInEntries = React.useMemo(() => cashInEntries || [], [cashInEntries]);

    // 1. Today's Revenue (৳)
    const revenueToday = React.useMemo(() => {
        return (myPayments || [])
            .filter((payment) => dayjs(payment.date).isBetween(todayRange.start, todayRange.end, 'day', '[]'))
            .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    }, [myPayments, todayRange]);

    // 2. Active Job Cards (Count)
    const activeJobs = React.useMemo(() => {
        return (myJobCards || []).filter((job) => (job.status || 'active') === 'active').length;
    }, [myJobCards]);

    // 3. Cash Collected (৳)
    const cashCollectionToday = React.useMemo(() => {
        const todaysCashPayments = (myPayments || [])
            .filter((payment) => isCashMethod(payment.method))
            .filter((payment) => dayjs(payment.date).isBetween(todayRange.start, todayRange.end, 'day', '[]'))
            .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
        const todaysManualCashIn = (myCashInEntries || [])
            .filter((entry) => dayjs(entry.date).isBetween(todayRange.start, todayRange.end, 'day', '[]'))
            .reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        return todaysCashPayments + todaysManualCashIn;
    }, [myPayments, myCashInEntries, todayRange]);

    // 4. Low Stock Alert (Count)
    const lowStockCount = React.useMemo(() => {
        return (inventory || []).filter((item) => toNumber(item.stock) <= toNumber(item.lowStockThreshold)).length;
    }, [inventory]);

    const dashboardStats = React.useMemo(() => ({
        revenue: revenueToday,
        cash: cashCollectionToday,
        pending: activeJobs,
        role: user?.role
    }), [revenueToday, cashCollectionToday, activeJobs, user?.role]);

    // AI Insight State
    const [businessTip, setBusinessTip] = React.useState('Loading operational diagnostics...');
    const aiEnabled = toggles?.ai_service?.enabled ?? true;

    React.useEffect(() => {
        if (!aiEnabled) {
            setBusinessTip('AI insights disabled by system administrator.');
            return;
        }
        const fetchTip = async () => {
            try {
                const tip = await generateBusinessTip(dashboardStats, language);
                setBusinessTip(tip);
            } catch (err) {
                setBusinessTip('Unlock strategic potential by maintaining balanced operational intake today.');
            }
        };
        fetchTip();
    }, [dashboardStats, aiEnabled, language]);

    // Voice & Vehicle Search States
    const [searchVehicleNo, setSearchVehicleNo] = React.useState('');
    const [isHistoryModalVisible, setIsHistoryModalVisible] = React.useState(false);
    const [historyResults, setHistoryResults] = React.useState({ jobs: [], bills: [] });
    const [isListening, setIsListening] = React.useState(false);

    const handleVoiceSearch = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            message.error('Voice search is not supported in this browser.');
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = language === 'bn' ? 'bn-BD' : 'en-US';
        recognition.interimResults = false;
        recognition.maxAlternatives = 1;

        recognition.onstart = () => {
            setIsListening(true);
            message.info(language === 'bn' ? 'আমি শুনছি...' : 'System Listening...');
        };

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            const cleaned = transcript.replace(/[^a-zA-Z0-9\s-]/g, '');
            setSearchVehicleNo(cleaned);
            handleSearchVehicle(cleaned);
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error:', event.error);
            setIsListening(false);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.start();
    };

    const handleSearchVehicle = (value) => {
        const query = (value || '').trim().toUpperCase();
        if (!query) return;

        const matchedJobs = (myJobCards || []).filter(j => (j.vehicleNo || '').toUpperCase().includes(query));
        const matchedBills = (savedBills || []).filter(b => (b.vehicleNo || '').toUpperCase().includes(query));

        if (matchedJobs.length === 0 && matchedBills.length === 0) {
            message.info('No history found for this vehicle.');
            return;
        }

        setSearchVehicleNo(query);
        setHistoryResults({ jobs: matchedJobs, bills: matchedBills });
        setIsHistoryModalVisible(true);
    };

    // Glow Tag Tokens for Job Stages
    const renderGlowingStatusTag = (job) => {
        const stage = String(job.workflowStage || '').toLowerCase();
        const status = String(job.status || '').toLowerCase();
        
        if (stage === 'ready_to_deliver' || status === 'completed') {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.15)] tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
                    Ready
                </span>
            );
        } else if (stage === 'work_in_progress' || stage === 'quality_check' || status === 'active') {
            if (stage === 'estimate') {
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/40 border border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
                        Intake
                    </span>
                );
            }
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/40 border border-amber-500/30 text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.15)] tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mr-1.5 animate-pulse" />
                    In-Progress
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-950/40 border border-blue-500/30 text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.15)] tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-1.5 animate-pulse" />
                    Intake
                </span>
            );
        }
    };

    return (
        <div className="relative min-h-screen transition-all duration-300" style={{ maxWidth: 1400, margin: '0 auto', padding: '30px 20px', background: 'var(--bg-main)' }}>
            
            {/* Background Watermark SVG Underlay */}
            <LuxuryCarWatermarkSVG opacity={0.06} />

            {/* Header Area */}
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10 pb-8 border-b border-[#334155]/40">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-white m-0 font-montserrat">
                        Executive Dashboard
                    </h1>
                    <p className="text-[#9ca3af] text-sm font-medium tracking-wide mt-1.5 opacity-90">
                        Mamun Automobiles • Operational Intelligence & Strategic Controls
                    </p>
                </div>
                
                {/* Minimalist Horizontal Quick Action Hub */}
                <div className="flex flex-wrap items-center gap-3">
                    <button
                        onClick={() => navigateTo('3')}
                        className="px-5 py-2.5 bg-[#1E293B]/60 backdrop-blur-md border border-[#334155] rounded-xl text-xs uppercase tracking-wider font-extrabold text-[#9ca3af] hover:text-white hover:border-[#003399] transition-all duration-300 cursor-pointer shadow-lg"
                    >
                        New Invoice
                    </button>
                    <button
                        onClick={() => navigateTo('quotations')}
                        className="px-5 py-2.5 bg-[#1E293B]/60 backdrop-blur-md border border-[#334155] rounded-xl text-xs uppercase tracking-wider font-extrabold text-[#9ca3af] hover:text-white hover:border-[#003399] transition-all duration-300 cursor-pointer shadow-lg"
                    >
                        Create Quotation
                    </button>
                    <button
                        onClick={() => navigateTo('2')}
                        className="px-5 py-2.5 bg-[#1E293B]/60 backdrop-blur-md border border-[#334155] rounded-xl text-xs uppercase tracking-wider font-extrabold text-[#9ca3af] hover:text-white hover:border-[#003399] transition-all duration-300 cursor-pointer shadow-lg"
                    >
                        Open Job Card
                    </button>
                </div>
            </div>

            {/* Minimalist Search box */}
            <div className="relative z-10 mb-8 max-w-xl">
                <div className="relative flex items-center bg-[#1E293B]/60 backdrop-blur-md border border-[#334155]/60 rounded-xl overflow-hidden shadow-lg h-12">
                    <input 
                        type="text"
                        placeholder="Search vehicle service history..."
                        value={searchVehicleNo}
                        onChange={(e) => setSearchVehicleNo(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicle(searchVehicleNo)}
                        className="flex-1 bg-transparent border-none outline-none px-4 text-white text-sm font-medium placeholder-[#9ca3af]/60"
                        style={{ color: '#ffffff !important' }}
                    />
                    <button 
                        onClick={handleVoiceSearch}
                        className="px-3 text-[#9ca3af] hover:text-[#3B82F6] transition-colors"
                        title="Voice Search"
                    >
                        {isListening ? <MicOff className="w-5 h-5 text-red-500 animate-pulse" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={() => handleSearchVehicle(searchVehicleNo)}
                        className="h-full px-6 bg-[#3b82f6] hover:bg-[#2563eb] text-white font-extrabold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* 4 Clean Premium Glass-morphic KPI Cards */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* 1. Today's Revenue */}
                <div className="bg-[#1E293B]/60 backdrop-blur-lg border border-[#334155]/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:border-[#3B82F6]/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#9ca3af]">Today's Revenue</span>
                        <DollarSign className="text-[#3B82F6] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-white tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        ৳ {formatCurrency(revenueToday)}
                    </div>
                </div>

                {/* 2. Active Job Cards */}
                <div className="bg-[#1E293B]/60 backdrop-blur-lg border border-[#334155]/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:border-[#3B82F6]/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#9ca3af]">Active Job Cards</span>
                        <Clipboard className="text-[#3B82F6] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-white tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        {activeJobs}
                    </div>
                </div>

                {/* 3. Cash Collected */}
                <div className="bg-[#1E293B]/60 backdrop-blur-lg border border-[#334155]/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:border-[#3B82F6]/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#9ca3af]">Cash Collected</span>
                        <TrendingUp className="text-[#3B82F6] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-white tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        ৳ {formatCurrency(cashCollectionToday)}
                    </div>
                </div>

                {/* 4. Low Stock Alert */}
                <div className="bg-[#1E293B]/60 backdrop-blur-lg border border-[#334155]/60 rounded-2xl p-6 shadow-2xl relative overflow-hidden transition-all duration-300 hover:translate-y-[-4px] hover:border-[#3B82F6]/40 hover:shadow-[0_0_20px_rgba(59,130,246,0.1)]">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#9ca3af]">Low Stock Alert</span>
                        <AlertTriangle className="text-[#ef4444] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-white tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        {lowStockCount}
                    </div>
                </div>
            </div>

            {/* AI Strategic Diagnostics & Insight Banner */}
            <div className="relative z-10 mb-8 bg-gradient-to-r from-[#1e293b]/80 to-[#0f172a]/60 backdrop-blur-md border border-[#334155]/50 rounded-2xl p-5 shadow-xl flex items-center gap-4">
                <div className="p-3 bg-[#3B82F6]/10 rounded-xl border border-[#3b82f6]/25">
                    <Sparkles className="text-[#3B82F6] w-6 h-6 animate-pulse" />
                </div>
                <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#3B82F6]">AI Strategic Diagnostics</div>
                    <div className="text-[#9ca3af] text-xs font-semibold leading-relaxed mt-1">{businessTip}</div>
                </div>
            </div>

            {/* Premium Recent Active Job Cards Operations Grid */}
            <div className="relative z-10 bg-[#1E293B]/50 backdrop-blur-md border border-[#334155]/60 rounded-2xl p-6 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-extrabold text-white uppercase tracking-wider font-montserrat flex items-center gap-2">
                        <ShieldCheck className="text-[#3b82f6] w-5 h-5" /> Recent Workshop Operations
                    </h2>
                    <button 
                        onClick={() => navigateTo('2')}
                        className="text-xs font-extrabold uppercase tracking-widest text-[#3b82f6] hover:text-[#2563eb] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        View All Operations <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#334155]/60 text-[10px] font-black uppercase tracking-widest text-[#9ca3af] select-none">
                                <th className="pb-3 pl-4">Job ID</th>
                                <th className="pb-3">Vehicle Details</th>
                                <th className="pb-3">Client Details</th>
                                <th className="pb-3">Date Opened</th>
                                <th className="pb-3">Specialist Assigned</th>
                                <th className="pb-3 pr-4 text-center">Status stage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#334155]/30">
                            {myJobCards.slice(0, 5).map((job) => (
                                <tr key={job.id} className="text-xs text-white hover:bg-[#334155]/20 transition-all duration-150">
                                    <td className="py-4 pl-4 font-extrabold text-[#3B82F6]">
                                        #JC-{String(job.id).padStart(3, '0')}
                                    </td>
                                    <td className="py-4 font-semibold text-white">
                                        {job.vehicleNo}
                                    </td>
                                    <td className="py-4">
                                        <div className="font-semibold text-white">{job.customerName || 'N/A'}</div>
                                        <div className="text-[10px] text-[#9ca3af]/80 font-medium">{job.phone || 'N/A'}</div>
                                    </td>
                                    <td className="py-4 text-[#9ca3af] font-medium">
                                        {dayjs(job.date).format('DD MMM YYYY')}
                                    </td>
                                    <td className="py-4 text-white font-semibold">
                                        {job.assigned_staff_name || 'Unassigned'}
                                    </td>
                                    <td className="py-4 pr-4 text-center">
                                        {renderGlowingStatusTag(job)}
                                    </td>
                                </tr>
                            ))}
                            {myJobCards.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-[#9ca3af] font-semibold text-sm">
                                        No active operations in progress.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Vehicle History Results Modal */}
            <Modal
                title={
                    <span className="text-white font-extrabold uppercase tracking-wide font-montserrat" style={{ color: '#ffffff' }}>
                        Vehicle Service History: {searchVehicleNo}
                    </span>
                }
                open={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={[
                    <button 
                        key="close" 
                        onClick={() => setIsHistoryModalVisible(false)}
                        className="px-5 py-2 bg-[#3B82F6] hover:bg-[#2563eb] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                ]}
                width={850}
                className="luxury-modal"
                styles={{ 
                    body: { maxHeight: '75vh', overflowY: 'auto', padding: '24px', background: '#0F172A' },
                    mask: { backdropFilter: 'blur(4px)' }
                }}
            >
                <div style={{ background: '#0F172A', color: '#ffffff' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <Title level={5} style={{ color: '#ffffff', fontWeight: 800, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px' }}>
                            Job Cards Timeline
                        </Title>
                        <List
                            dataSource={historyResults.jobs}
                            renderItem={job => (
                                <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#3B82F6', fontSize: 13 }}>#JC-{String(job.id).padStart(3, '0')}</div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{dayjs(job.date).format('DD MMM YYYY')} - {job.description || 'General Service'}</div>
                                        </div>
                                        <div>
                                            {renderGlowingStatusTag(job)}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                            locale={{ emptyText: <span style={{ color: '#9ca3af', fontSize: 12 }}>No job cards found.</span> }}
                        />
                    </div>
                    
                    <Divider style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
                    
                    <div>
                        <Title level={5} style={{ color: '#ffffff', fontWeight: 800, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px' }}>
                            Invoices & Settlements
                        </Title>
                        <List
                            dataSource={historyResults.bills}
                            renderItem={bill => (
                                <List.Item style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '12px 0' }}>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#ffffff', fontSize: 13 }}>Invoice ID: {bill.id}</div>
                                            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{dayjs(bill.date).format('DD MMM YYYY')}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: 800, color: '#10b981', fontSize: 13 }}>৳ {formatCurrency(bill.netPayable || bill.amount || 0)}</div>
                                            <div style={{ fontSize: 10, color: bill.due > 0 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                                {bill.due > 0 ? `Due: ৳ ${formatCurrency(bill.due)}` : 'Settle Paid'}
                                            </div>
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                            locale={{ emptyText: <span style={{ color: '#9ca3af', fontSize: 12 }}>No payment history recorded.</span> }}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DashboardPage;
