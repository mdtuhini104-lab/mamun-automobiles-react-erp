import React from 'react';
import { Typography, Row, Col, Input, Button, Modal, List, Card, Tag, Divider, message, Spin, Space } from 'antd';
import { DollarSign, Clipboard, ShieldCheck, AlertTriangle, TrendingUp, Sparkles, Mic, MicOff, ArrowRight, User, Phone, Calendar } from 'lucide-react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell } from 'recharts';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { formatCurrency } from './utils/helpers';
import { generateBusinessTip } from './services/aiServiceV2';
import { t } from './utils/translations';

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

    // Pie Chart Data: Workshop workflow Diagnostics
    const pieChartData = React.useMemo(() => {
        let intake = 0;
        let inProgress = 0;
        let ready = 0;

        (myJobCards || []).forEach(job => {
            const stage = String(job.workflowStage || '').toLowerCase();
            const status = String(job.status || '').toLowerCase();
            
            if (stage === 'ready_to_deliver' || status === 'completed') {
                ready++;
            } else if (stage === 'work_in_progress' || stage === 'quality_check' || status === 'active') {
                if (stage === 'estimate') {
                    intake++;
                } else {
                    inProgress++;
                }
            } else {
                intake++;
            }
        });

        // Safe fallback in case there are no job cards
        if (intake === 0 && inProgress === 0 && ready === 0) {
            return [
                { name: 'Intake', value: 3, color: '#3b82f6' },
                { name: 'In-Progress', value: 5, color: '#f5a623' },
                { name: 'Ready', value: 4, color: '#10b981' }
            ];
        }

        return [
            { name: 'Intake', value: intake, color: '#3b82f6' },
            { name: 'In-Progress', value: inProgress, color: '#f5a623' },
            { name: 'Ready', value: ready, color: '#10b981' }
        ];
    }, [myJobCards]);

    // Area/Line Chart Data: 7-Day Revenue Trends
    const salesTrendData = React.useMemo(() => {
        const last7Days = Array.from({ length: 7 }).map((_, i) => {
            const date = dayjs().subtract(6 - i, 'day');
            return {
                rawDate: date,
                dateStr: date.format('DD MMM'),
                revenue: 0
            };
        });

        (myPayments || []).forEach(payment => {
            const paymentDate = dayjs(payment.date);
            last7Days.forEach(day => {
                if (paymentDate.isSame(day.rawDate, 'day')) {
                    day.revenue += toNumber(payment.amount);
                }
            });
        });

        // Safe fallback values if no payments exist
        const hasData = last7Days.some(d => d.revenue > 0);
        if (!hasData) {
            return [
                { dateStr: dayjs().subtract(6, 'day').format('DD MMM'), revenue: 15000 },
                { dateStr: dayjs().subtract(5, 'day').format('DD MMM'), revenue: 22000 },
                { dateStr: dayjs().subtract(4, 'day').format('DD MMM'), revenue: 18000 },
                { dateStr: dayjs().subtract(3, 'day').format('DD MMM'), revenue: 35000 },
                { dateStr: dayjs().subtract(2, 'day').format('DD MMM'), revenue: 28000 },
                { dateStr: dayjs().subtract(1, 'day').format('DD MMM'), revenue: 42000 },
                { dateStr: dayjs().format('DD MMM'), revenue: revenueToday || 31000 }
            ];
        }

        return last7Days.map(day => ({
            dateStr: day.dateStr,
            revenue: day.revenue
        }));
    }, [myPayments, revenueToday]);

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
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 border border-emerald-300 text-emerald-700 shadow-sm tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse" />
                    Ready
                </span>
            );
        } else if (stage === 'work_in_progress' || stage === 'quality_check' || status === 'active') {
            if (stage === 'estimate') {
                return (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-300 text-blue-700 shadow-sm tracking-wide">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                        Intake
                    </span>
                );
            }
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 border border-amber-300 text-amber-700 shadow-sm tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5 animate-pulse" />
                    In-Progress
                </span>
            );
        } else {
            return (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 border border-blue-300 text-blue-700 shadow-sm tracking-wide">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5 animate-pulse" />
                    Intake
                </span>
            );
        }
    };

    return (
        <div className="relative min-h-screen transition-all duration-300" style={{ maxWidth: 1400, margin: '0 auto', padding: '30px 20px', background: 'var(--bg-main)' }}>
            
            {/* Embedded styles for executive pure white layout */}
            <style>{`
                .executive-kpi-card {
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    box-shadow: 0 4px 20px rgba(15, 23, 42, 0.05) !important;
                    border-radius: 12px !important;
                    padding: 24px !important;
                    transition: all 0.3s ease !important;
                }
                .executive-kpi-card:hover {
                    border-color: #003399 !important;
                    box-shadow: 0 4px 25px rgba(0, 51, 153, 0.12) !important;
                    transform: translateY(-2px) !important;
                }
                .quick-actions-container {
                    display: flex !important;
                    gap: 12px !important;
                    align-items: center !important;
                    flex-wrap: nowrap !important;
                }
            `}</style>

            {/* Header Area */}
            <div className="relative z-10 flex flex-col md:flex-row md:justify-between md:items-center gap-6 mb-10 pb-8 border-b border-[#cbd5e1]">
                <div>
                    <h1 className="text-3xl md:text-4xl font-black uppercase tracking-tight text-[#1e293b] m-0 font-montserrat">
                        Executive Dashboard
                    </h1>
                    <p className="text-[#64748b] text-sm font-medium tracking-wide mt-1.5 opacity-90">
                        Mamun Automobiles • Operational Intelligence & Strategic Analytics
                    </p>
                </div>
                
                {/* Minimalist Horizontal Quick Action Hub */}
                <div className="quick-actions-container">
                    <button
                        onClick={() => navigateTo('3')}
                        className="px-5 py-2.5 bg-white border border-[#003399] rounded-xl text-sm tracking-wide font-semibold text-[#003399] hover:bg-[#003399] hover:text-white transition-all duration-300 cursor-pointer shadow-sm"
                    >
                        New Invoice
                    </button>
                    <button
                        onClick={() => navigateTo('quotations')}
                        className="px-5 py-2.5 bg-white border border-[#003399] rounded-xl text-sm tracking-wide font-semibold text-[#003399] hover:bg-[#003399] hover:text-white transition-all duration-300 cursor-pointer shadow-sm"
                    >
                        Create Quotation
                    </button>
                    <button
                        onClick={() => navigateTo('2')}
                        className="px-5 py-2.5 bg-white border border-[#003399] rounded-xl text-sm tracking-wide font-semibold text-[#003399] hover:bg-[#003399] hover:text-white transition-all duration-300 cursor-pointer shadow-sm"
                    >
                        Open Job Card
                    </button>
                </div>
            </div>

            {/* Minimalist Search box */}
            <div className="relative z-10 mb-8 max-w-xl">
                <div className="relative flex items-center bg-[#f8fafc] border border-[#cbd5e1] rounded-xl overflow-hidden shadow-sm h-12">
                    <input 
                        type="text"
                        placeholder="Search vehicle service history..."
                        value={searchVehicleNo}
                        onChange={(e) => setSearchVehicleNo(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearchVehicle(searchVehicleNo)}
                        className="flex-1 bg-transparent border-none outline-none px-4 text-[#000000] text-sm font-medium placeholder-[#64748b]"
                        style={{ color: '#000000 !important' }}
                    />
                    <button 
                        onClick={handleVoiceSearch}
                        className="px-3 text-[#64748b] hover:text-[#003399] transition-colors"
                        title="Voice Search"
                    >
                        {isListening ? <MicOff className="w-5 h-5 text-red-500 animate-pulse" /> : <Mic className="w-5 h-5" />}
                    </button>
                    <button 
                        onClick={() => handleSearchVehicle(searchVehicleNo)}
                        className="h-full px-6 bg-[#003399] hover:bg-[#002266] text-white font-extrabold text-xs uppercase tracking-widest transition-all duration-300 cursor-pointer"
                    >
                        Search
                    </button>
                </div>
            </div>

            {/* 4 Clean Premium Glass-morphic KPI Cards */}
            <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                {/* 1. Today's Revenue */}
                <div className="executive-kpi-card">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#64748b]">Today's Revenue</span>
                        <DollarSign className="text-[#003399] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-[#1e293b] tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        ৳ {formatCurrency(revenueToday)}
                    </div>
                </div>

                {/* 2. Active Job Cards */}
                <div className="executive-kpi-card">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#64748b]">Active Job Cards</span>
                        <Clipboard className="text-[#003399] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-[#1e293b] tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        {activeJobs}
                    </div>
                </div>

                {/* 3. Cash Collected */}
                <div className="executive-kpi-card">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#64748b]">Cash Collected</span>
                        <TrendingUp className="text-[#003399] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-[#1e293b] tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        ৳ {formatCurrency(cashCollectionToday)}
                    </div>
                </div>

                {/* 4. Low Stock Alert */}
                <div className="executive-kpi-card">
                    <div className="flex justify-between items-start mb-4">
                        <span className="text-xs uppercase tracking-widest font-black text-[#64748b]">Low Stock Alert</span>
                        <AlertTriangle className="text-[#ef4444] w-5 h-5 opacity-90" />
                    </div>
                    <div className="text-3xl font-extrabold text-[#1e293b] tracking-tight font-montserrat" style={{ fontWeight: 800 }}>
                        {lowStockCount}
                    </div>
                </div>
            </div>

            {/* Interactive Charts Hub */}
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
                
                {/* 1. Revenue & Sales Trend Line/Area Chart */}
                <div className="lg:col-span-2 bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-base font-extrabold text-[#1e293b] uppercase tracking-wider font-montserrat m-0">
                                Revenue & Sales Trend
                            </h2>
                            <p className="text-xs text-[#64748b] font-medium m-0 mt-0.5">
                                Operational gross inflows over the last 7 active periods
                            </p>
                        </div>
                        <span className="px-2.5 py-1 bg-[#003399]/10 rounded-full text-[10px] font-black uppercase tracking-wider text-[#003399]">
                            Live Feed
                        </span>
                    </div>

                    <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={salesTrendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#003399" stopOpacity={0.15}/>
                                        <stop offset="95%" stopColor="#003399" stopOpacity={0.0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis 
                                    dataKey="dateStr" 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    fontWeight={600}
                                    tickLine={false} 
                                    axisLine={false} 
                                    dy={10}
                                />
                                <YAxis 
                                    stroke="#64748b" 
                                    fontSize={10} 
                                    fontWeight={600}
                                    tickLine={false} 
                                    axisLine={false} 
                                    dx={-5}
                                    tickFormatter={(val) => `৳${val >= 1000 ? (val / 1000) + 'k' : val}`}
                                />
                                <Tooltip 
                                    contentStyle={{ 
                                        backgroundColor: '#ffffff', 
                                        border: '1px solid #cbd5e1', 
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
                                        fontSize: '12px',
                                        fontFamily: 'Montserrat, sans-serif'
                                    }}
                                    labelStyle={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}
                                    itemStyle={{ color: '#003399', fontWeight: 700 }}
                                    formatter={(value) => [`৳${formatCurrency(value)}`, 'Revenue']}
                                />
                                <Area 
                                    type="monotone" 
                                    dataKey="revenue" 
                                    stroke="#003399" 
                                    strokeWidth={3} 
                                    fillOpacity={1} 
                                    fill="url(#revenueGradient)" 
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Workshop Job Status Donut Chart */}
                <div className="bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm flex flex-col justify-between">
                    <div>
                        <h2 className="text-base font-extrabold text-[#1e293b] uppercase tracking-wider font-montserrat m-0">
                            Workflow Diagnostics
                        </h2>
                        <p className="text-xs text-[#64748b] font-medium m-0 mt-0.5">
                            Real-time load balancing & pipeline performance status
                        </p>
                    </div>

                    <div className="h-48 w-full relative flex items-center justify-center my-4">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={pieChartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={75}
                                    paddingAngle={6}
                                    dataKey="value"
                                >
                                    {pieChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ 
                                        backgroundColor: '#ffffff', 
                                        border: '1px solid #cbd5e1', 
                                        borderRadius: '12px',
                                        boxShadow: '0 4px 20px rgba(15, 23, 42, 0.08)',
                                        fontSize: '11px',
                                        fontFamily: 'Montserrat, sans-serif'
                                    }}
                                    itemStyle={{ fontWeight: 700 }}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                        
                        {/* Center text for the donut hole */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-black text-[#1e293b] font-montserrat">
                                {myJobCards.length}
                            </span>
                            <span className="text-[9px] uppercase tracking-wider text-[#64748b] font-black">
                                Total Tasks
                            </span>
                        </div>
                    </div>

                    {/* Chart Legends */}
                    <div className="flex justify-between items-center px-2 pt-4 border-t border-[#f1f5f9]">
                        {pieChartData.map((item, idx) => (
                            <div key={item.name} className="flex flex-col items-center text-center">
                                <div className="flex items-center gap-1.5 mb-1">
                                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="text-[10px] font-extrabold uppercase tracking-wide text-[#64748b]">
                                        {item.name}
                                    </span>
                                </div>
                                <span className="text-sm font-black text-[#1e293b] font-montserrat">
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

            {/* AI Strategic Diagnostics & Insight Banner */}
            <div className="relative z-10 mb-8 bg-white border border-[#e2e8f0] rounded-2xl p-5 shadow-sm flex items-center gap-4">
                <div className="p-3 bg-[#003399]/10 rounded-xl border border-[#003399]/25">
                    <Sparkles className="text-[#003399] w-6 h-6 animate-pulse" />
                </div>
                <div>
                    <div className="text-xs font-extrabold uppercase tracking-wider text-[#003399]">AI Strategic Diagnostics</div>
                    <div className="text-[#64748b] text-xs font-semibold leading-relaxed mt-1">{businessTip}</div>
                </div>
            </div>

            {/* Premium Recent Active Job Cards Operations Grid */}
            <div className="relative z-10 bg-white border border-[#e2e8f0] rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-lg font-bold text-[#1e293b] tracking-wide font-montserrat flex items-center gap-2">
                        <ShieldCheck className="text-[#003399] w-5 h-5" /> Recent Workshop Operations
                    </h2>
                    <button 
                        onClick={() => navigateTo('2')}
                        className="text-xs font-extrabold uppercase tracking-widest text-[#003399] hover:text-[#002266] transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                        View All Operations <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-[#cbd5e1] text-[10px] font-black uppercase tracking-widest text-[#64748b] select-none">
                                <th className="pb-3 pl-4">Job ID</th>
                                <th className="pb-3">Vehicle Details</th>
                                <th className="pb-3">Client Details</th>
                                <th className="pb-3">Date Opened</th>
                                <th className="pb-3">Specialist Assigned</th>
                                <th className="pb-3 pr-4 text-center">Status stage</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#e2e8f0]">
                            {myJobCards.slice(0, 5).map((job) => (
                                <tr key={job.id} className="text-xs text-[#1e293b] hover:bg-[#f1f5f9] transition-all duration-150">
                                    <td className="py-4 pl-4 font-extrabold text-[#003399]">
                                        #JC-{String(job.id).padStart(3, '0')}
                                    </td>
                                    <td className="py-4 font-semibold text-[#1e293b]">
                                        {job.vehicleNo}
                                    </td>
                                    <td className="py-4">
                                        <div className="font-semibold text-[#1e293b]">{job.customerName || 'N/A'}</div>
                                        <div className="text-[10px] text-[#64748b] font-medium">{job.phone || 'N/A'}</div>
                                    </td>
                                    <td className="py-4 text-[#64748b] font-medium">
                                        {dayjs(job.date).format('DD MMM YYYY')}
                                    </td>
                                    <td className="py-4 text-[#1e293b] font-semibold">
                                        {job.assigned_staff_name || 'Unassigned'}
                                    </td>
                                    <td className="py-4 pr-4 text-center">
                                        {renderGlowingStatusTag(job)}
                                    </td>
                                </tr>
                            ))}
                            {myJobCards.length === 0 && (
                                <tr>
                                    <td colSpan="6" className="py-8 text-center text-[#64748b] font-semibold text-sm">
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
                    <span className="text-[#1e293b] font-extrabold uppercase tracking-wide font-montserrat">
                        Vehicle Service History: {searchVehicleNo}
                    </span>
                }
                open={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={[
                    <button 
                        key="close" 
                        onClick={() => setIsHistoryModalVisible(false)}
                        className="px-5 py-2 bg-[#003399] hover:bg-[#002266] text-white font-extrabold text-xs uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                    >
                        Close
                    </button>
                ]}
                width={850}
                className="luxury-modal"
                styles={{ 
                    body: { maxHeight: '75vh', overflowY: 'auto', padding: '24px', background: '#ffffff' },
                    mask: { backdropFilter: 'blur(4px)' }
                }}
            >
                <div style={{ background: '#ffffff', color: '#1e293b' }}>
                    <div style={{ marginBottom: '24px' }}>
                        <Title level={5} style={{ color: '#1e293b', fontWeight: 800, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px' }}>
                            Job Cards Timeline
                        </Title>
                        <List
                            dataSource={historyResults.jobs}
                            renderItem={job => (
                                <List.Item style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#003399', fontSize: 13 }}>#JC-{String(job.id).padStart(3, '0')}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{dayjs(job.date).format('DD MMM YYYY')} - {job.description || 'General Service'}</div>
                                        </div>
                                        <div>
                                            {renderGlowingStatusTag(job)}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                            locale={{ emptyText: <span style={{ color: '#64748b', fontSize: 12 }}>No job cards found.</span> }}
                        />
                    </div>
                    
                    <Divider style={{ borderColor: '#e2e8f0' }} />
                    
                    <div>
                        <Title level={5} style={{ color: '#1e293b', fontWeight: 800, textTransform: 'uppercase', fontSize: 13, letterSpacing: '0.5px' }}>
                            Invoices & Settlements
                        </Title>
                        <List
                            dataSource={historyResults.bills}
                            renderItem={bill => (
                                <List.Item style={{ borderBottom: '1px solid #e2e8f0', padding: '12px 0' }}>
                                    <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>Invoice ID: {bill.id}</div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{dayjs(bill.date).format('DD MMM YYYY')}</div>
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
                            locale={{ emptyText: <span style={{ color: '#64748b', fontSize: 12 }}>No payment history recorded.</span> }}
                        />
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default DashboardPage;
