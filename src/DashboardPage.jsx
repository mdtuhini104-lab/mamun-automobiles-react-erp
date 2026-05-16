import React from 'react';
import { Typography, Row, Col, Card, Statistic, Progress, List, Tag, Alert, Grid, Modal, Input, Button, Divider, Space, message, Spin } from 'antd';
const AlertCenter = React.lazy(() => import('./components/AlertCenter'));
const FinancialDashboard = React.lazy(() => import('./components/FinancialDashboard'));
import { ResponsiveContainer, LineChart, ComposedChart, Line, Bar, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell } from 'recharts';
import { DollarSign, Activity, CreditCard, PieChart as PieChartIcon, TrendingUp, Sparkles, ShoppingCart, Target, Briefcase, PenTool, Mic, MicOff } from 'lucide-react';

import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useAuth } from './contexts/AuthContext';
import { useTheme } from './contexts/ThemeContext';
import { formatCurrency, getFromLocalStorage } from './utils/helpers';
import { enhanceAutomotiveText, generateBusinessTip, generateFinancialInsights } from './services/aiServiceV2';
import { t } from './utils/translations';

dayjs.extend(relativeTime);
dayjs.extend(isBetween);

const { Title, Text } = Typography;
const LEDGER_KEYS = ['Mamun Automobiles', 'Muntha Motors', 'Rent-A-Car'];

const toNumber = (value) => Number(value) || 0;
const normalizeMethod = (value) => String(value || '').trim().toLowerCase();
const isCashMethod = (method) => {
    const normalized = normalizeMethod(method);
    if (!normalized) return true;
    return normalized === 'cash';
};
const isBankMethod = (method) => {
    const normalized = normalizeMethod(method);
    return normalized.includes('bank') || normalized.includes('cheque') || normalized.includes('check');
};

const DashboardPage = () => {
    const {
        payments,
        expenses,
        jobCards,
        departments,
        companies,
        customers,
        inventory,
        salaries,
        rentACars,
        cashInEntries,
        savedBills,
        navigateTo,
        smartAlerts,
        featureToggles: toggles,
        language
    } = useGlobalState();
    const { user } = useAuth();
    const { theme } = useTheme();
    
    const roleLower = (user?.role || '').toLowerCase();
    const isSuperAdmin = roleLower.includes('super');
    const isAdmin = isSuperAdmin || roleLower.includes('admin');
    const isManager = roleLower.includes('manager');
    const isStaff = roleLower.includes('staff') && !isAdmin && !isManager;
    const isCustomer = roleLower.includes('customer');
    
    // Safety check: Never render Executive Dashboard for Customers
    if (isCustomer) return null;

    const canViewFinancials = isAdmin || isManager;
    const isDark = String(theme || '').includes('dark') || String(theme || '').includes('purple');
    const aiEnabled = toggles?.ai_service?.enabled ?? true;
    const tooltipContentStyle = {
        backgroundColor: 'var(--card-bg)',
        border: '1px solid var(--border-default)',
        borderRadius: 10,
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
        color: 'var(--text-main)',
    };
    const tooltipItemStyle = { color: 'var(--text-main)' };
    const currencyFormatter = (value) => `৳ ${formatCurrency(value)}`;

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

    const todayRange = React.useMemo(() => {
        return {
            start: dayjs().startOf('day'),
            end: dayjs().endOf('day')
        };
    }, []);

    // ─── Filtered Data for Customers ───
    const myPayments = React.useMemo(() => {
        if (!isCustomer) return payments;
        return (payments || []).filter(p => 
            (p.customerEmail && p.customerEmail.toLowerCase() === user?.email?.toLowerCase()) ||
            (p.customerPhone && p.customerPhone === user?.phone) ||
            p.customerId === user?.id
        );
    }, [payments, isCustomer, user]);

    const myJobCards = React.useMemo(() => {
        if (!isCustomer) return jobCards;
        return (jobCards || []).filter(j => 
            (j.customerEmail && j.customerEmail.toLowerCase() === user?.email?.toLowerCase()) ||
            (j.phone && j.phone === user?.phone) ||
            j.customerId === user?.id
        );
    }, [jobCards, isCustomer, user]);

    const myCashInEntries = React.useMemo(() => {
        if (!isCustomer) return cashInEntries;
        return (cashInEntries || []).filter(e => e.customerId === user?.id);
    }, [cashInEntries, isCustomer, user]);

    const revenueToday = React.useMemo(() => {
        return (myPayments || [])
            .filter((payment) => dayjs(payment.date).isBetween(todayRange.start, todayRange.end, 'day', '[]'))
            .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    }, [myPayments, todayRange]);

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

    const activeJobs = React.useMemo(() => {
        return (myJobCards || []).filter((job) => (job.status || 'active') === 'active').length;
    }, [myJobCards]);

    const dashboardStats = React.useMemo(() => ({
        revenue: revenueToday,
        cash: cashCollectionToday,
        pending: activeJobs,
        role: user?.role
    }), [revenueToday, cashCollectionToday, activeJobs, user?.role]);

    const [businessTip, setBusinessTip] = React.useState('Loading AI insight...');

    React.useEffect(() => {
        if (!toggles?.ai_service?.enabled) {
            setBusinessTip('AI diagnostics have been disabled by the Owner.');
            return;
        }
        const fetchTip = async () => {
            const tip = await generateBusinessTip(dashboardStats, language);
            setBusinessTip(tip);
        };
        fetchTip();
    }, [dashboardStats, aiEnabled, language]);



    const readyToDeliver = React.useMemo(() => {
        return (jobCards || []).filter((job) => {
            if ((job.workflowStage || '').toLowerCase() === 'ready_to_deliver') return true;
            const departmentsTasks = job.departmentsTasks || {};
            const deptKeys = Object.keys(departmentsTasks);
            if (deptKeys.length === 0) return false;
            return deptKeys.every((dept) => {
                const tasks = (departmentsTasks[dept]?.tasks || []);
                return tasks.length > 0 && tasks.every((task) => task.status === 'completed');
            });
        }).length;
    }, [jobCards]);

    const departmentalLoad = React.useMemo(() => {
        const depList = (departments || []).length > 0 ? departments : ['Mechanical', 'Paint', 'Electrical', 'Accounts'];
        const pendingByDepartment = depList.reduce((acc, dep) => ({ ...acc, [dep]: 0 }), {});

        (jobCards || []).forEach((job) => {
            const deptTasks = job.departmentsTasks || {};
            depList.forEach((dep) => {
                const depState = deptTasks[dep];
                const depTasks = depState?.tasks || [];
                if (depTasks.length > 0) {
                    pendingByDepartment[dep] += depTasks.filter((task) => task.status !== 'completed').length;
                    return;
                }
                const involved = (job.departmentsInvolved || []).includes(dep);
                if (involved && (job.status || 'active') !== 'completed' && (job.status || 'active') !== 'billed') {
                    pendingByDepartment[dep] += 1;
                }
            });
        });

        const totalPending = Object.values(pendingByDepartment).reduce((sum, value) => sum + value, 0);
        return depList
            .filter(dep => !['Admin', 'Manager'].includes(dep))
            .map((dep) => {
                const pending = pendingByDepartment[dep] || 0;
                const percent = totalPending > 0 ? Math.round((pending / totalPending) * 100) : 0;
                return { department: dep, pending, percent };
            });
    }, [jobCards, departments]);

    const monthlyNetProfit = React.useMemo(() => {
        const start = dayjs().startOf('month');
        const end = dayjs().endOf('month');
        const monthlyInflow = (payments || [])
            .filter((payment) => dayjs(payment.date).isBetween(start, end, 'day', '[]'))
            .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
        const monthlyExpenses = (expenses || [])
            .filter((expense) => dayjs(expense.date).isBetween(start, end, 'day', '[]'))
            .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
        const monthlySalaries = (salaries || [])
            .filter((salary) => dayjs(salary.paymentDate || salary.date).isBetween(start, end, 'day', '[]'))
            .reduce((sum, salary) => sum + toNumber(salary.netPayable || salary.amount), 0);
        return monthlyInflow - monthlyExpenses - monthlySalaries;
    }, [payments, expenses, salaries]);

    const totalReceivables = React.useMemo(() => {
        const companyDue = (companies || []).reduce((sum, company) => sum + toNumber(company.due), 0);
        const customerDue = (customers || []).reduce((sum, customer) => sum + toNumber(customer.due), 0);
        return companyDue + customerDue;
    }, [companies, customers]);

    const quickActions = React.useMemo(() => [
        {
            key: 'cash-today',
            label: isCustomer ? (language === 'bn' ? 'আমার আজকের পেমেন্ট' : 'My Payments Today') : t('cash_collection_today', language),
            value: `৳ ${formatCurrency(cashCollectionToday)}`,
        },
        {
            key: 'pending-cars',
            label: isCustomer ? (language === 'bn' ? 'আমার সক্রিয় জব কার্ড' : 'My Active Job Cards') : t('active_job_cards', language),
            value: `${activeJobs} ${language === 'bn' ? 'টি' : 'Units'}`,
        },
        {
            key: 'ai-tip',
            label: language === 'bn' ? 'এআই বিজনেস টিপ' : 'AI Business Tip',
            value: businessTip,
            isTip: true
        }
    ], [cashCollectionToday, activeJobs, businessTip]);

    const totalOutstandingDue = React.useMemo(() => {
        return (savedBills || []).reduce((sum, bill) => sum + Math.max(0, toNumber(bill.due)), 0);
    }, [savedBills]);

    const cashOnHand = React.useMemo(() => {
        const cashPayments = (payments || [])
            .filter((payment) => isCashMethod(payment.method))
            .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
        const manualCashIn = (cashInEntries || []).reduce((sum, entry) => sum + toNumber(entry.amount), 0);
        const cashExpenses = (expenses || [])
            .filter((expense) => isCashMethod(expense.paymentMethod))
            .reduce((sum, expense) => sum + toNumber(expense.amount), 0);
        const cashSalaryOut = (salaries || [])
            .filter((salary) => isCashMethod(salary.paymentMethod || salary.method))
            .reduce((sum, salary) => sum + toNumber(salary.netPayable || salary.amount), 0);
        return cashPayments + manualCashIn - cashExpenses - cashSalaryOut;
    }, [payments, expenses, salaries, cashInEntries]);

    const financialHighlights = React.useMemo(() => [
        {
            key: 'cash-collection',
            title: t('cash_collection_today', language),
            value: cashCollectionToday,
            valueColor: 'var(--accent)',
            icon: <DollarSign className="branding-visible" size={20} />,
            hiddenText: 'Data reserved'
        },
        {
            key: 'total-outstanding',
            title: t('total_outstanding_due', language),
            value: totalOutstandingDue,
            valueColor: '#ef4444',
            icon: <Activity className="branding-visible" size={20} />,
            hiddenText: 'Data reserved'
        },
        {
            key: 'revenue-today',
            title: t('revenue_today', language),
            value: revenueToday,
            valueColor: 'var(--accent)',
            icon: <TrendingUp className="branding-visible" size={20} />,
            hiddenText: 'Data reserved'
        },
        {
            key: 'monthly-profit',
            title: t('monthly_net_profit', language),
            value: monthlyNetProfit,
            valueColor: '#10b981',
            icon: <Briefcase className="branding-visible" size={20} />,
            hiddenText: 'Funds data reserved for Admin'
        },
        {
            key: 'cash-on-hand',
            title: t('cash_on_hand', language),
            value: cashOnHand,
            valueColor: 'var(--accent)',
            icon: <CreditCard className="branding-visible" size={20} />,
            hiddenText: 'Cash balances are hidden',
            sharp: true
        },
        {
            key: 'total-receivables',
            title: t('total_receivables', language),
            value: totalReceivables,
            valueColor: 'var(--accent)',
            icon: <Target className="branding-visible" size={20} />,
            hiddenText: 'Data reserved'
        },
    ], [cashCollectionToday, totalOutstandingDue, revenueToday, monthlyNetProfit, cashOnHand, totalReceivables, language]);

    const rentDrivers = React.useMemo(() => {
        return new Set((rentACars || []).map((car) => car.driverName).filter(Boolean));
    }, [rentACars]);

    const getLedgerName = (entry, type) => {
        if (entry?.ledger && LEDGER_KEYS.includes(entry.ledger)) return entry.ledger;
        if (type === 'salary' && rentDrivers.has(entry?.staffName)) return 'Rent-A-Car';
        return 'Mamun Automobiles';
    };

    const revenueExpenseData = React.useMemo(() => {
        const rows = [];
        for (let monthIndex = 5; monthIndex >= 0; monthIndex -= 1) {
            const monthStart = dayjs().subtract(monthIndex, 'month').startOf('month');
            const monthEnd = dayjs().subtract(monthIndex, 'month').endOf('month');

            let revenue = 0;
            let expense = 0;

            (payments || [])
                .filter((p) => dayjs(p.date).isBetween(monthStart, monthEnd, 'day', '[]'))
                .forEach((p) => { revenue += toNumber(p.amount); });

            (expenses || [])
                .filter((e) => dayjs(e.date).isBetween(monthStart, monthEnd, 'day', '[]'))
                .forEach((e) => { expense += toNumber(e.amount); });

            (salaries || [])
                .filter((s) => dayjs(s.paymentDate || s.date).isBetween(monthStart, monthEnd, 'day', '[]'))
                .forEach((s) => { expense += toNumber(s.netPayable || s.amount); });

            rows.push({
                name: monthStart.format('MMM YYYY'),
                Revenue: revenue,
                Expenses: expense,
                Profit: revenue - expense
            });
        }
        return rows;
    }, [payments, expenses, salaries]);

    const expectedRevenue = smartAlerts?.expectedRevenue || 0;
    const serviceTrends = Array.isArray(smartAlerts?.trendingServices) ? smartAlerts.trendingServices : [];

    const lowStockItems = React.useMemo(() => {
        return smartAlerts?.lowStockItems?.length
            ? smartAlerts.lowStockItems
            : (inventory || []).filter((item) => toNumber(item.stock) <= toNumber(item.lowStockThreshold));
    }, [inventory, smartAlerts]);

    const highDueTargets = React.useMemo(() => {
        const companiesDue = (companies || []).map((company) => ({
            name: company.companyName || company.name,
            phone: company.contactPhone || company.phone,
            due: toNumber(company.due || Math.max(0, -toNumber(company.balance))),
            type: 'Company'
        }));
        const customersDue = (customers || []).map((customer) => ({
            name: customer.name,
            phone: customer.phone,
            due: toNumber(customer.due || Math.max(0, -toNumber(customer.balance))),
            type: 'Customer'
        }));
        return [...companiesDue, ...customersDue]
            .filter((item) => item.due > 0)
            .sort((a, b) => b.due - a.due)
            .slice(0, 5);
    }, [companies, customers]);

    const maintenanceDue = React.useMemo(() => {
        return (rentACars || [])
            .map((car) => {
                const logs = car.maintenanceLogs || [];
                if (logs.length === 0) {
                    return {
                        model: car.model || 'Vehicle',
                        plateNo: car.plateNo || 'N/A',
                        reason: 'No maintenance log found'
                    };
                }
                const latest = dayjs(logs[0].date);
                const overdueDays = dayjs().diff(latest, 'day');
                if (overdueDays > 30) {
                    return {
                        model: car.model || 'Vehicle',
                        plateNo: car.plateNo || 'N/A',
                        reason: `Last serviced ${latest.fromNow()}`
                    };
                }
                return null;
            })
            .filter(Boolean)
            .slice(0, 5);
    }, [rentACars]);

    const bouncedCheques = React.useMemo(() => {
        const cheques = getFromLocalStorage('bankCheques') || [];
        return cheques.filter(c => c.status === 'Bounced');
    }, []);
    
    const serviceReminders = React.useMemo(() => {
        const today = dayjs().startOf('day');
        const in10Days = dayjs().add(10, 'day').endOf('day');
        return (customers || [])
            .filter(c => c.nextServiceDate && dayjs(c.nextServiceDate).isBetween(today, in10Days, 'day', '[]'))
            .map(c => ({
                id: c.id,
                name: c.name,
                phone: c.phone,
                vehicleNo: c.vehicleNo,
                date: dayjs(c.nextServiceDate).format('DD MMM'),
                daysLeft: dayjs(c.nextServiceDate).diff(today, 'day')
            }))
            .sort((a, b) => a.daysLeft - b.daysLeft);
    }, [customers]);

    const dashboardTopParts = React.useMemo(() => {
        const counts = {};
        (savedBills || []).forEach(bill => {
            (bill.items || []).forEach(item => {
                const name = item.name || 'Unknown Part';
                counts[name] = (counts[name] || 0) + (toNumber(item.quantity) || 1);
            });
        });
        return Object.entries(counts)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 5);
    }, [savedBills]);

    const dashboardMechPerformance = React.useMemo(() => {
        const revenueMap = {};
        (savedBills || []).forEach(bill => {
            (bill.services || []).forEach(service => {
                const tech = service.assignedStaffName || 'Unassigned';
                revenueMap[tech] = (revenueMap[tech] || 0) + (toNumber(service.price) || 0);
            });
        });
        return Object.entries(revenueMap)
            .map(([name, revenue]) => ({ name, revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);
    }, [savedBills]);

    const handleSearchVehicle = (value) => {
        const query = (value || '').trim();
        if (!query) return;

        const matchedJobs = (jobCards || []).filter(j => (j.vehicleNo || '').toUpperCase().includes(query));
        const matchedBills = (savedBills || []).filter(b => (b.vehicleNo || '').toUpperCase().includes(query));

        if (matchedJobs.length === 0 && matchedBills.length === 0) {
            message.info('No history found for this vehicle.');
            return;
        }

        setSearchVehicleNo(query);
        setHistoryResults({ jobs: matchedJobs, bills: matchedBills });
        setIsHistoryModalVisible(true);
    };

    if (isStaff) {
        return (
            <div className="dashboard-page" style={{ padding: '8px 0' }}>
                <Card className="glass-card dashboard-card">
                    <Alert type="info"  message="Dashboard is enabled for Admin and Manager accounts." />
                </Card>
            </div>
        );
    }

    return (
        <div className="transition-all duration-300" style={{ maxWidth: 1400, margin: '0 auto', padding: '20px', background: 'var(--bg-main)' }}>
            <Row justify="space-between" align="middle" className="mb-14 border-b border-[var(--text-muted)] border-opacity-20 pb-8">
                <Col xs={24} lg={15}>
                    <Title level={1} className="text-[var(--text-main)] m-0 font-bold tracking-normal text-3xl md:text-5xl">Executive dashboard</Title>
                    <Text className="text-[var(--text-muted)] font-semibold text-xs md:text-sm tracking-normal mt-2 block opacity-80">Strategic insights & operational analytics</Text>
                </Col>
                <Col xs={24} lg={9} className="mt-5 lg:mt-0 text-left lg:text-right">
                    <div style={{ position: 'relative', width: '100%', maxWidth: '450px' }}>
                        <Input.Search
                            placeholder={t('search_vehicle_history', language)}
                            allowClear
                            enterButton={<Button className="bg-blue-600 text-[#FFFFFF] border-none font-semibold h-12 px-8 hover:scale-105 transition-transform" style={{ borderRadius: '0 8px 8px 0', background: '#3B82F6' }}>{t('search', language)}</Button>}
                            size="large"
                            value={searchVehicleNo}
                            onChange={(e) => setSearchVehicleNo(e.target.value)}
                            onSearch={handleSearchVehicle}
                            style={{ 
                                height: '52px', 
                                width: '100%',
                                borderRadius: '12px',
                                overflow: 'hidden',
                                border: '1.2px solid rgba(0, 0, 0, 0.1)'
                            }}
                        />
                        <Button 
                            type="text"
                            icon={isListening ? <MicOff style={{ color: '#ff4d4f' }} /> : <Mic style={{ color: 'var(--accent)' }} />}
                            onClick={handleVoiceSearch}
                            style={{ 
                                position: 'absolute', 
                                right: '110px', 
                                top: '50%', 
                                transform: 'translateY(-50%)',
                                zIndex: 10,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        />
                    </div>
                </Col>
            </Row>

            {/* Bounced Cheque Alert */}
            {bouncedCheques.length > 0 && (
                <Alert
                    type="error"
                    
                    style={{ marginBottom: 16, borderRadius: 12, borderLeft: '5px solid #ff4d4f' }}
                    message={<Text style={{ color: '#ff4d4f', fontSize: 16, fontWeight: 600 }}>Action Required: {bouncedCheques.length} Cheque(s) Dishonored/Bounced!</Text>}
                    description={
                        <Space direction="vertical" size={2} style={{ marginTop: 4 }}>
                            {bouncedCheques.slice(0, 3).map(c => (
                                <Text key={c.id}>Cheque #{c.chequeNo} from <b>{c.payerName}</b> for ৳ {formatCurrency(c.amount)}</Text>
                            ))}
                            <Button type="link" danger size="small" style={{ padding: 0 }} onClick={() => navigateTo('banking')}>
                                Go to Bank Management to Resolve →
                            </Button>
                        </Space>
                    }
                />
            )}

            {/* Smart Alerts Section */}
            {smartAlerts?.alerts && smartAlerts.alerts.length > 0 && (
                <div style={{ marginBottom: 30 }}>
                    {smartAlerts.alerts.map((alert, idx) => (
                        <div key={idx} style={{ 
                            background: alert.type === 'error' ? 'rgba(255, 77, 79, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                            borderLeft: `4px solid ${alert.type === 'error' ? '#ff4d4f' : '#3B82F6'}`,
                            padding: '16px 24px',
                            marginBottom: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div>
                                <div className="text-[var(--text-main)]" style={{ fontWeight: 600, fontSize: 13, letterSpacing: '0.5px' }}>{alert.message}</div>
                                <div className="text-[var(--text-muted)]" style={{ fontSize: 12 }}>{alert.description}</div>
                            </div>
                            {alert.action && (
                                <Button 
                                    size="small" 
                                    onClick={() => navigateTo(alert.action.key)}
                                    style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600, borderRadius: 0, fontSize: 10 }}
                                >
                                    {alert.action.label}
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            <div className="checkin-desk-grid mb-8 p-0">
                {quickActions.map((action) => (
                    <div key={action.key} className="glass-card bg-[var(--card-bg)] p-8 text-center min-h-[300px] flex flex-col justify-center transition-all duration-500 hover:translate-y-[-5px]">
                        <div className="speedometer-metric mb-5">
                            <div className="speedometer-value text-[var(--text-main)]">
                                {action.isTip ? 'AI' : (action.value ? String(action.value).replace(/[^0-9.]/g, '') : '0')}
                            </div>
                            <div className="speedometer-label text-[#3B82F6] opacity-80">
                                {action.isTip ? 'Insight' : (String(action.value).includes('৳') ? 'TK' : 'Units')}
                            </div>
                        </div>
                        <Title level={5} className="text-[var(--text-main)] m-0 font-bold tracking-normal text-sm">
                            {action.label}
                        </Title>
                        {action.isTip && (
                            <Text className="text-[var(--text-main)] text-xs mt-3 leading-relaxed opacity-90">
                                {action.value}
                            </Text>
                        )}
                    </div>
                ))}
            </div>

            <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
                <Col span={24}>
                    <div className="glass-card" style={{ padding: '30px' }}>
                        <div className="text-[var(--text-main)]" style={{ fontWeight: 600, marginBottom: '25px', letterSpacing: '0.5px' }}>{t('departmental_status_load', language)}</div>
                        <Row gutter={[24, 24]}>
                            {(departmentalLoad || []).map((item) => (
                                <Col xs={12} sm={6} key={item.department}>
                                    <div style={{ padding: '4px 0' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                                            <Text className="text-[var(--text-main)]" style={{ fontWeight: 600, fontSize: 13 }}>{item.department}</Text>
                                            <div className="text-[var(--text-muted)]" style={{ fontWeight: 600, fontSize: 12 }}>{item.pending} {t('active', language)}</div>
                                        </div>
                                        <Progress 
                                            percent={item.percent} 
                                            showInfo={false} 
                                            strokeWidth={4} 
                                            strokeColor={item.percent > 70 ? '#ff4d4f' : '#3B82F6'}
                                            trailColor="var(--border-default)"
                                        />
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    </div>
                </Col>
            </Row>

            <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
                {financialHighlights.filter(m => !m.hidden).map((metric) => (
                    <Col xs={24} sm={12} lg={4} key={metric.key}>
                        <div className="glass-card" style={{ padding: '24px 15px', textAlign: 'center', border: '1px solid var(--border-default)', height: '100%' }}>
                            <div className="text-[var(--text-muted)]" style={{ fontSize: 11, fontWeight: 500, marginBottom: 12, letterSpacing: '0.2px' }}>{metric.title}</div>
                            {canViewFinancials ? (
                                <div className="text-[var(--text-main)]" style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.5px' }}>
                                    {metric.key.includes('cash') || metric.key.includes('revenue') || metric.key.includes('profit') || metric.key.includes('receivables') ? `৳${formatCurrency(metric.value)}` : metric.value}
                                </div>
                            ) : (
                                <div className="text-[var(--text-muted)]" style={{ fontSize: 10 }}>Restricted</div>
                            )}
                        </div>
                    </Col>
                ))}
            </Row>

            <Row gutter={[20, 20]} className="no-print">
                <Col xs={24} lg={10}>
                    <React.Suspense fallback={<Card className="glass-card" loading />}>
                        <AlertCenter />
                    </React.Suspense>
                </Col>
                <Col xs={24} lg={14}>
                    <React.Suspense fallback={<Card className="glass-card" loading />}>
                        <FinancialDashboard />
                    </React.Suspense>
                </Col>
            </Row>

            <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
                <Col xs={24}>
                    <div className="glass-card" style={{ padding: '30px' }}>
                        <div className="text-[var(--text-main)]" style={{ fontWeight: 600, marginBottom: '25px', letterSpacing: '0.2px' }}>Strategic insights & forecasts</div>
                        <Row gutter={[30, 30]}>
                            <Col xs={24} md={8}>
                                <div style={{ background: 'rgba(255,255,255,0.02)', padding: '20px', borderLeft: '2px solid var(--accent)' }}>
                                    <div className="text-[var(--text-muted)]" style={{ fontSize: 11, fontWeight: 600, marginBottom: 5 }}>Expected monthly revenue</div>
                                    <div className="text-[var(--text-main)]" style={{ fontSize: 28, fontWeight: 600 }}>৳ {formatCurrency(expectedRevenue)}</div>
                                    <div className="text-[var(--text-muted)]" style={{ marginTop: 15, fontSize: 12, lineHeight: 1.5 }}>
                                        Calculated based on 6-month rolling performance trends and current intake volume.
                                    </div>
                                </div>
                            </Col>
                            <Col xs={24} md={16}>
                                {(serviceTrends || []).length === 0 ? (
                                    <Alert type="info" message="Not enough data for trend analysis." style={{ background: 'transparent', border: '1px solid var(--border-default)', color: 'var(--text-muted)' }} />
                                ) : (
                                    <List
                                        size="small"
                                        dataSource={serviceTrends.slice(0, 4)}
                                        renderItem={(item, index) => (
                                            <List.Item style={{ borderBottom: '1px solid var(--border-default)', padding: '12px 0' }}>
                                                <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                    <div>
                                                        <div className="text-[var(--text-main)]" style={{ fontWeight: 600, fontSize: 13 }}>{item.service}</div>
                                                        <div className="text-[var(--text-muted)]" style={{ fontSize: 11 }}>{index < 2 ? 'High Performance Indicator' : 'Stable Market Demand'}</div>
                                                    </div>
                                                    <div className="text-[var(--text-main)]" style={{ fontWeight: 600, color: 'var(--accent)' }}>{item.quantity} Units</div>
                                                </div>
                                            </List.Item>
                                        )}
                                    />
                                )}
                            </Col>
                        </Row>
                    </div>
                </Col>
            </Row>

            <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
                <Col xs={24} lg={12}>
                    <Card className="glass-card dashboard-card" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} className="branding-visible" />Monthly Revenue vs Expenses</span>}>
                        <div style={{ height: 280 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={revenueExpenseData} margin={{ top: 12, right: 16, left: -10, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="4 4" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                                    
                                    <YAxis tick={{ fill: isDark ? '#cbd5e1' : '#475569', fontSize: 11 }} tickFormatter={(value) => `৳${Math.round(value / 1000)}k`} />
                                    <RechartsTooltip
                                        formatter={currencyFormatter}
                                        labelFormatter={(label) => `${label}`}
                                        contentStyle={tooltipContentStyle}
                                        itemStyle={tooltipItemStyle}
                                    />
                                    <Legend />
                                    <Line type="monotone" dataKey="Revenue" stroke="#1d4ed8" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                    <Line type="monotone" dataKey="Profit" stroke="#10b981" strokeWidth={3} strokeDasharray="5 5" dot={false} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={12}>
                    <Card className="glass-card dashboard-card" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TrendingUp size={16} className="branding-visible" />Top Selling Parts & Service Lead</span>}>
                        <Row gutter={8}>
                            <Col span={12}>
                                <div style={{ height: 240 }}>
                                <ResponsiveContainer>
                                    <ComposedChart layout="vertical" data={dashboardTopParts} margin={{ left: -20 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke={isDark ? '#1e293b' : '#e2e8f0'} />
                                        
                                        <YAxis dataKey="name" type="category" width={88} tick={{ fontSize: 10, fill: isDark ? '#cbd5e1' : '#475569' }} />
                                        <RechartsTooltip
                                            contentStyle={tooltipContentStyle}
                                            itemStyle={tooltipItemStyle}
                                            formatter={(value) => `${value} units`}
                                            labelFormatter={(label) => `Part: ${label}`}
                                        />
                                        <Bar dataKey="qty" fill="#1d4ed8" radius={[0, 6, 6, 0]} barSize={15} />
                                        <Line type="monotone" dataKey="qty" stroke="#1d4ed8" strokeDasharray="4 4" strokeWidth={3} dot={false} />
                                    </ComposedChart>
                                </ResponsiveContainer>
                                </div>
                                <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>Top Moving Parts</div>
                            </Col>
                            <Col span={12}>
                                <div style={{ height: 240 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={dashboardMechPerformance}
                                                dataKey="revenue"
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={40}
                                                outerRadius={60}
                                            >
                                                {dashboardMechPerformance.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(v) => `৳${Math.round(v / 1000)}k`} contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 4, fontSize: 10 }} />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                                <div style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8' }}>Tech Performance</div>
                            </Col>
                        </Row>
                    </Card>
                </Col>
            </Row>

            <Row gutter={[12, 12]}>
                <Col xs={24}>
                    {/* Handled by Smart Alerts Section above */}
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="glass-card dashboard-card" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>Service Reminders</span>}>
                        {serviceReminders.length === 0 && <Alert type="success"  message="No upcoming services." />}
                        <List
                            size="small"
                            dataSource={serviceReminders.slice(0, 5)}
                            renderItem={(item) => (
                                <List.Item style={{ padding: '8px 0' }}>
                                    <div style={{ width: '100%' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <Text strong>{item.vehicleNo}</Text>
                                            <Tag color={item.daysLeft <= 2 ? 'red' : 'orange'}>{item.date}</Tag>
                                        </div>
                                        <div style={{ fontSize: 12, color: '#888' }}>
                                            {item.name} • {item.daysLeft === 0 ? 'Today' : `In ${item.daysLeft} days`}
                                        </div>
                                    </div>
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="glass-card dashboard-card" title={<span className="text-[var(--text-main)]" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ShoppingCart size={14} className="branding-visible" />Low stock intelligence</span>}>
                        {(lowStockItems || []).length === 0 && <Alert type="success"  message="No low-stock alert." />}
                        {(lowStockItems || []).slice(0, 5).map((item) => {
                            const stock = toNumber(item.stock);
                            const threshold = Math.max(1, toNumber(item.lowStockThreshold));
                            const stockPercent = Math.min(100, Math.round((stock / threshold) * 100));
                            return (
                                <div key={item.id || item.name} style={{ marginBottom: 10 }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                                        <Space>
                                            <Text className="text-[var(--text-main)]">{item.name}</Text>
                                            <Button type="link" size="small" style={{ padding: 0, height: 'auto' }} onClick={() => window.location.hash = '#/suppliers'}>
                                                Order
                                            </Button>
                                        </Space>
                                        <Text strong className="text-[var(--text-main)]">{stock}</Text>
                                    </div>
                                    <Progress percent={stockPercent} showInfo={false} strokeWidth={8} />
                                </div>
                            );
                        })}
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="glass-card dashboard-card" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><TrendingUp size={14} />Demand forecast</span>}>
                        {(smartAlerts?.predictedDemand || []).length === 0 ? (
                            <Alert type="info"  message="Need more billing history for forecast." />
                        ) : (
                            <List
                                size="small"
                                dataSource={smartAlerts.predictedDemand.slice(0, 5)}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                            <Text strong>{item.partName}</Text>
                                            <Text type="secondary">{item.month}: {item.quantity}</Text>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="glass-card dashboard-card" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>High-Due Target List</span>}>
                        {(highDueTargets || []).length === 0 ? (
                            <Alert type="success"  message="No high-due account." />
                        ) : (
                            <List
                                size="small"
                                dataSource={highDueTargets}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <div>
                                                <Text strong className="text-[var(--text-main)]">{item.name}</Text>
                                                <div>
                                                    <Tag>{item.type}</Tag>
                                                </div>
                                            </div>
                                            <div style={{ textAlign: 'right' }}>
                                                <Text strong className="text-[var(--text-main)]">৳ {formatCurrency(item.due)}</Text>
                                                <div><Text className="text-[var(--text-muted)]">{item.phone || 'N/A'}</Text></div>
                                            </div>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
                <Col xs={24} lg={6}>
                    <Card className="glass-card dashboard-card" title={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><PenTool size={14} />Rent-a-car maintenance</span>}>
                        {(maintenanceDue || []).length === 0 ? (
                            <Alert type="success"  message="No maintenance due item." />
                        ) : (
                            <List
                                size="small"
                                dataSource={maintenanceDue}
                                renderItem={(item) => (
                                    <List.Item>
                                        <div>
                                            <Text strong>{item.model}</Text>
                                            <div><Tag>{item.plateNo}</Tag></div>
                                            <Text type="secondary">{item.reason}</Text>
                                        </div>
                                    </List.Item>
                                )}
                            />
                        )}
                    </Card>
                </Col>
            </Row>
            <Modal
                title={<span className="text-themeText" style={{ fontWeight: 600, letterSpacing: '0.2px', color: 'var(--text-primary)' }}>Vehicle service history: {searchVehicleNo || 'Results'}</span>}
                open={isHistoryModalVisible}
                onCancel={() => setIsHistoryModalVisible(false)}
                footer={[
                    <Button 
                        key="close" 
                        onClick={() => setIsHistoryModalVisible(false)}
                        style={{ background: 'var(--accent)', border: 'none', color: '#000', fontWeight: 600, borderRadius: 0 }}
                    >
                        Close
                    </Button>
                ]}
                width={900}
                className="luxury-modal"
                styles={{ body: { maxHeight: '75vh', overflowY: 'auto', padding: '30px' } }}
            >
                <div style={{ marginBottom: 20 }}>
                    <Title level={5}>Previous Job Cards</Title>
                    <List
                        dataSource={historyResults.jobs}
                        renderItem={job => (
                            <List.Item>
                                <Card size="small" style={{ width: '100%', background: 'var(--border-default)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                                        <div>
                                            <Text strong>{dayjs(job.date).format('DD MMM YYYY')}</Text>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Job ID: JC-{String(job.id).padStart(3, '0')}</div>
                                            <div style={{ marginTop: 4 }}>
                                                {(job.services || []).map(s => <Tag key={s.id} size="small">{s.description}</Tag>)}
                                            </div>
                                        </div>
                                        <Tag color={job.status === 'completed' ? 'success' : 'processing'}>{job.status === 'completed' ? 'Completed' : 'Processing'}</Tag>
                                    </div>
                                </Card>
                            </List.Item>
                        )}
                        locale={{ emptyText: 'No previous job cards found.' }}
                    />
                </div>
                <Divider />
                <div>
                    <Title level={5}>Previous Bills & Invoices</Title>
                    <List
                        dataSource={historyResults.bills}
                        renderItem={bill => (
                            <List.Item>
                                <Card size="small" style={{ width: '100%', background: 'var(--border-default)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div>
                                            <Text strong>{dayjs(bill.date).format('DD MMM YYYY')}</Text>
                                            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Invoice: {bill.id}</div>
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <Text strong style={{ color: '#52c41a' }}>৳ {(bill.netPayable || bill.amount || 0).toLocaleString()}</Text>
                                            <div style={{ fontSize: 11, color: bill.due > 0 ? '#ff4d4f' : '#52c41a' }}>
                                                {bill.due > 0 ? `Due: ৳${bill.due.toLocaleString()}` : 'Fully Paid'}
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </List.Item>
                        )}
                        locale={{ emptyText: 'No previous bills found.' }}
                    />
                </div>
            </Modal>
        </div>
    );
};

export default DashboardPage;





