import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';
import {
    Card, Row, Col, Typography, DatePicker, Table, Statistic, Modal,
    Button, Tag, Divider, Space, Calendar, Badge, List, Empty, message
} from 'antd';

import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend, BarChart, Bar, ComposedChart, Line
} from 'recharts';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useTheme } from './contexts/ThemeContext';
import generateMonthlyPdf from './utils/monthlyPdfReport';
import { exportToExcel } from './utils/excelExport';
import { t } from './utils/translations';

dayjs.extend(isBetween);

const { Title, Text } = Typography;
const toNumber = (val) => {
    const n = parseFloat(val);
    return isNaN(n) ? 0 : n;
};
const { RangePicker } = DatePicker;

const TECHNICIAN_KEYWORDS = [
    'technician',
    'mechanic',
    'helper',
    'electrician',
    'painter',
    'denter',
    'welder',
    'service'
];
const NON_TECH_KEYWORDS = ['manager', 'head', 'admin', 'account', 'cashier', 'clerk', 'n/a'];

const normalizeNameKey = (name) => String(name || '').trim().toLowerCase();

const getPrimaryDesignation = (user = {}) => {
    const sub = user.subStaffPosts || {};
    return user.designation || user.specific_post || sub.mamun || sub.rentacar || sub.muntaha || 'Staff';
};

const isTechnicianDesignation = (designation = '', role = '') => {
    const text = String(designation || '').trim().toLowerCase();
    const roleText = String(role || '').trim().toLowerCase();
    if (roleText === 'customer') return false;
    if (!text) return roleText === 'staff';
    if (NON_TECH_KEYWORDS.some((kw) => text.includes(kw))) return false;
    return TECHNICIAN_KEYWORDS.some((kw) => text.includes(kw)) || roleText === 'staff';
};

const getTaskCompletionTimestamp = (task, job) => {
    const history = Array.isArray(task?.history) ? [...task.history] : [];
    const completed = history.reverse().find((h) => h?.status === 'completed' && h?.timestamp);
    return completed?.timestamp || task?.completedAt || job?.completedAt || task?.updatedAt || null;
};

// Global Anti-Gravity Print Engine active system-wide

const ReportsPage = () => {
    const { 
        savedBills, expenses, salaries, usedItems, payments, 
        jobCards, userManagement, language 
    } = useGlobalState();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    // ── Range filter (existing) ──
    const [dateRange, setDateRange] = React.useState([null, null]);

    // ── Calendar drill-down state ──
    const [selectedMonth, setSelectedMonth] = React.useState(dayjs());
    const [selectedDate, setSelectedDate] = React.useState(null);
    const [dayModalVisible, setDayModalVisible] = React.useState(false);

    // ── UI View Toggle ──
    const [viewMode, setViewMode] = React.useState('tabular'); // 'tabular' or 'analytics'

    // ─── P/L Modal & Print state ──
    const [plModalVisible, setPlModalVisible] = React.useState(false);
    const [isPrintingPL, setIsPrintingPL] = React.useState(false);
    const [isPrintingTabular, setIsPrintingTabular] = React.useState(false);
    const [plMonth, setPlMonth] = React.useState(dayjs());

    const handlePrintPL = () => {
        setIsPrintingPL(true);
    };

    React.useEffect(() => {
        if (isPrintingPL) {
            bufferedPrint(() => setIsPrintingPL(false));
        }
    }, [isPrintingPL]);

    React.useEffect(() => {
        if (isPrintingTabular) {
            bufferedPrint(() => setIsPrintingTabular(false));
        }
    }, [isPrintingTabular]);

    // ─── Filtered bills (existing range filter) ───────────────
    const { filteredBills, totalRevenue, totalCollected, totalDues } = React.useMemo(() => {
        let filtered = savedBills || [];
        if (dateRange && dateRange[0] && dateRange[1]) {
            const startDate = dateRange[0].startOf('day');
            const endDate = dateRange[1].endOf('day');
            filtered = filtered.filter(bill => {
                const billDate = dayjs(bill.date);
                return billDate.isBetween(startDate, endDate, null, '[]');
            });
        }
        const revenue = filtered.reduce((s, b) => s + (b.amount || 0), 0);
        const collected = filtered.reduce((s, b) => s + (b.paid || 0), 0);
        const dues = filtered.reduce((s, b) => s + (b.due || 0), 0);
        return { filteredBills: filtered, totalRevenue: revenue, totalCollected: collected, totalDues: dues };
    }, [dateRange, savedBills]);

    // ─── Chart Data Aggregation ───────────────
    const dailyChartData = React.useMemo(() => {
        let start = dateRange && dateRange[0] ? dateRange[0] : dayjs().startOf('month');
        let end = dateRange && dateRange[1] ? dateRange[1] : dayjs().endOf('month');

        let dataMap = {};
        for (let d = start.clone(); d.isBefore(end) || d.isSame(end, 'day'); d = d.add(1, 'day')) {
            dataMap[d.format('YYYY-MM-DD')] = { date: d.format('DD MMM'), Revenue: 0, Expenses: 0 };
        }

        (payments || []).forEach(p => {
            if (p.date) {
                const d = dayjs(p.date);
                if (d.isBetween(start, end, 'day', '[]') && dataMap[d.format('YYYY-MM-DD')]) {
                    dataMap[d.format('YYYY-MM-DD')].Revenue += (p.amount || 0);
                }
            }
        });

        (expenses || []).forEach(e => {
            if (e.date) {
                const d = dayjs(e.date);
                if (d.isBetween(start, end, 'day', '[]') && dataMap[d.format('YYYY-MM-DD')]) {
                    dataMap[d.format('YYYY-MM-DD')].Expenses += (e.amount || 0);
                }
            }
        });

        return Object.values(dataMap);
    }, [dateRange, payments, expenses]);

    const pieChartData = React.useMemo(() => {
        let start = dateRange && dateRange[0] ? dateRange[0] : dayjs().startOf('month');
        let end = dateRange && dateRange[1] ? dateRange[1] : dayjs().endOf('month');

        const monthUsedSales = (usedItems || []).filter(u =>
            u.status === 'Sold' && u.dateSold && dayjs(u.dateSold).isBetween(start, end, null, '[]')
        );
        const usedProfit = monthUsedSales.reduce((s, u) => s + ((u.salePrice || 0) - (u.purchasePrice || 0)), 0);

        const coreRevenue = (payments || []).filter(p =>
            p.date && dayjs(p.date).isBetween(start, end, null, '[]')
        ).reduce((s, p) => s + (p.amount || 0), 0);

        return [
            { name: 'Core Services & Parts', value: coreRevenue },
            { name: 'Used Car Profit', value: usedProfit > 0 ? usedProfit : 0 }
        ];
    }, [dateRange, payments, usedItems]);

    const PIE_COLORS = ['#3b82f6', '#10b981'];

    // ─── Calendar: get transactions for a given date ──────────
    const getBillsForDate = (date) => {
        const d = dayjs(date).format('YYYY-MM-DD');
        return (savedBills || []).filter(b => b.date && dayjs(b.date).format('YYYY-MM-DD') === d);
    };

    const getExpensesForDate = (date) => {
        const d = dayjs(date).format('YYYY-MM-DD');
        return (expenses || []).filter(e => e.date && dayjs(e.date).format('YYYY-MM-DD') === d);
    };

    const handleDateCellClick = (value) => {
        const billsOnDay = getBillsForDate(value);
        const expensesOnDay = getExpensesForDate(value);
        if (billsOnDay.length > 0 || expensesOnDay.length > 0) {
            setSelectedDate(value);
            setDayModalVisible(true);
        }
    };

    // ─── Calendar: render dots on days with data ─────────────
    const dateCellRender = (value) => {
        const bills = getBillsForDate(value);
        const exps = getExpensesForDate(value);
        if (bills.length === 0 && exps.length === 0) return null;
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {bills.length > 0 && (
                    <Badge
                        status="success"
                        text={<span style={{ fontSize: 10 }}>৳ {bills.reduce((s, b) => s + (b.amount || 0), 0).toLocaleString()}</span>}
                    />
                )}
                {exps.length > 0 && (
                    <Badge
                        status="error"
                        text={<span style={{ fontSize: 10 }}>-৳ {exps.reduce((s, e) => s + (e.amount || 0), 0).toLocaleString()}</span>}
                    />
                )}
            </div>
        );
    };

    // ─── P/L Calculation for selected month ──────────────────
    const plData = React.useMemo(() => {
        const start = plMonth.startOf('month');
        const end = plMonth.endOf('month');

        const monthBills = (savedBills || []).filter(b =>
            b.date && dayjs(b.date).isBetween(start, end, null, '[]')
        );
        const monthExpenses = (expenses || []).filter(e =>
            e.date && dayjs(e.date).isBetween(start, end, null, '[]')
        );
        const monthSalaries = (salaries || []).filter(s =>
            s.date && dayjs(s.date).isBetween(start, end, null, '[]')
        );

        const monthPayments = (payments || []).filter(p =>
            p.date && dayjs(p.date).isBetween(start, end, null, '[]')
        );
        const totalSales = monthPayments.reduce((s, p) => s + (p.amount || 0), 0);

        const cashPayments = monthPayments.filter(p => {
            const bill = (savedBills || []).find(b => b.id === p.invoiceId);
            return !bill || bill.saleType !== 'Credit';
        });
        const creditPayments = monthPayments.filter(p => {
            const bill = (savedBills || []).find(b => b.id === p.invoiceId);
            return bill && bill.saleType === 'Credit';
        });

        const monthUsedSales = (usedItems || []).filter(u =>
            u.status === 'Sold' && u.dateSold && dayjs(u.dateSold).isBetween(start, end, null, '[]')
        );
        const usedSaleRevenue = monthUsedSales.reduce((s, u) => s + (u.salePrice || 0), 0);
        const usedPurchaseCost = monthUsedSales.reduce((s, u) => s + (u.purchasePrice || 0), 0);
        const usedProfit = usedSaleRevenue - usedPurchaseCost;

        const cashBills = monthBills.filter(b => b.saleType !== 'Credit');
        const creditBills = monthBills.filter(b => b.saleType === 'Credit');

        const totalExpensesAmt = monthExpenses.reduce((s, e) => s + (e.amount || 0), 0);
        const totalSalaryAmt = monthSalaries.reduce((s, sal) => s + (sal.amount || 0), 0);

        const totalCOGS = monthBills.reduce((acc, bill) => {
            const billCOGS = (bill.items || []).reduce((itemAcc, item) => {
                if (item.partId || item.isNewInventoryPart) {
                    return itemAcc + ((item.purchasePrice || 0) * (item.quantity || 1));
                }
                return itemAcc;
            }, 0);
            return acc + billCOGS;
        }, 0);

        const netProfit = totalSales + usedProfit - totalExpensesAmt - totalSalaryAmt - totalCOGS;
        const totalDue = monthBills.reduce((s, b) => s + (b.due || 0), 0);
        const totalVat = monthPayments.reduce((s, p) => {
            const bill = (savedBills || []).find(b => b?.id === p?.invoiceId);
            return s + (bill?.vat ? Math.round(((p?.amount || 0) / (bill?.netPayable || 1)) * bill?.vat) : 0);
        }, 0);

        return {
            monthBills, monthExpenses, monthSalaries, monthPayments,
            totalSales, totalExpensesAmt, totalSalaryAmt, netProfit, totalDue, totalVat,
            usedSaleRevenue, usedPurchaseCost, usedProfit, totalCOGS,
            cashCount: cashBills.length, creditCount: creditBills.length,
            cashRevenue: cashPayments.reduce((s, p) => s + (p.amount || 0), 0),
            creditRevenue: creditPayments.reduce((s, p) => s + (p.amount || 0), 0),
        };
    }, [plMonth, savedBills, payments, expenses, salaries, usedItems]);

    const monthlyTrendData = React.useMemo(() => {
        const data = [];
        for (let i = 5; i >= 0; i--) {
            const m = dayjs().subtract(i, 'month');
            const start = m.startOf('month');
            const end = m.endOf('month');
            const mPayments = (payments || []).filter(p => dayjs(p.date).isBetween(start, end, null, '[]'));
            const mExps = (expenses || []).filter(e => dayjs(e.date).isBetween(start, end, null, '[]'));
            const mSalaries = (salaries || []).filter(s => dayjs(s.date).isBetween(start, end, null, '[]'));
            const income = mPayments.reduce((s, p) => s + (p.amount || 0), 0);
            const expense = mExps.reduce((s, e) => s + (e.amount || 0), 0) + mSalaries.reduce((s, sal) => s + (sal.amount || 0), 0);
            data.push({ name: m.format('MMM'), Income: income, Expense: expense, Profit: income - expense });
        }
        return data;
    }, [payments, expenses, salaries]);

    const topPartsData = React.useMemo(() => {
        const counts = {};
        (savedBills || []).forEach(bill => {
            (bill.items || []).forEach(item => {
                const name = item.description || item.name || 'Unknown Part';
                counts[name] = (counts[name] || 0) + (toNumber(item.quantity) || 1);
            });
        });
        return Object.entries(counts)
            .map(([name, qty]) => ({ name, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);
    }, [savedBills]);

    // ─── Analytics: Mechanic Revenue Performance ───────────
    const mechanicPerformanceData = React.useMemo(() => {
        const revenueMap = {};
        (savedBills || []).forEach(bill => {
            (bill.services || []).forEach(service => {
                const tech = service.assignedStaffName || 'Unassigned';
                // Only count service cost as tech performance
                revenueMap[tech] = (revenueMap[tech] || 0) + (toNumber(service.price) || 0);
            });
        });
        return Object.entries(revenueMap)
            .map(([name, revenue]) => ({ name, revenue }))
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 10);
    }, [savedBills]);

    const mechanicJobSummary = React.useMemo(() => {
        const summary = {};
        (jobCards || []).forEach(job => {
            const key = String(job.assigned_staff_name || job.assigned_staff_id || 'Unassigned').trim() || 'Unassigned';
            if (!summary[key]) {
                summary[key] = { name: key, total: 0, completed: 0 };
            }
            summary[key].total += 1;
            const status = String(job.status || '').toLowerCase();
            if (['completed', 'billed', 'paid'].includes(status)) {
                summary[key].completed += 1;
            }
        });
        return Object.values(summary)
            .map(item => ({ ...item, pending: Math.max(0, item.total - item.completed) }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);
    }, [jobCards]);

    // ─── Table columns (existing) ─────────────────────────────
    const columns = [
        { title: t('bill_id', language), dataIndex: 'billNo', key: 'billNo', render: (v, r) => v || r.id },
        { title: t('customer', language), dataIndex: 'customerName', key: 'customerName' },
        { title: t('date', language), dataIndex: 'date', key: 'date', render: v => v ? dayjs(v).format('DD MMM YYYY') : '-' },
        { title: `${t('amount', language)} (৳)`, dataIndex: 'amount', key: 'amount', render: v => (v || 0).toLocaleString() },
        { title: `${t('paid', language)} (৳)`, dataIndex: 'paid', key: 'paid', render: v => (v || 0).toLocaleString() },
        {
            title: `${t('due', language)} (৳)`, dataIndex: 'due', key: 'due',
            render: v => <span style={{ color: v > 0 ? '#cf1322' : 'inherit' }}>{(v || 0).toLocaleString()}</span>
        },
    ];

    const handleDownloadReport = async () => {
        try {
            const monthStart = plMonth.startOf('month');
            const monthEnd = plMonth.endOf('month');

            const jobsInMonth = (jobCards || []).filter((job) => {
                if (!job?.date) return false;
                const d = dayjs(job.date);
                return d.isValid() && d.isBetween(monthStart, monthEnd, null, '[]');
            });

            // Prepare monthly task breakdown by department
            const breakdown = {};
            jobsInMonth.forEach((job) => {
                const tasksObj = job.departmentsTasks || {};
                Object.keys(tasksObj).forEach((dept) => {
                    const tasks = (tasksObj[dept] && tasksObj[dept].tasks) || [];
                    if (!breakdown[dept]) breakdown[dept] = { total: 0, pending: 0, completed: 0 };
                    breakdown[dept].total += tasks.length;
                    tasks.forEach((t) => {
                        if ((t.status || 'pending') === 'completed') breakdown[dept].completed += 1;
                        else breakdown[dept].pending += 1;
                    });
                });
            });

            // Build technician performance from migrated designations + assigned tasks
            const staffDirectory = new Map();
            (userManagement || [])
                .filter((u) => u && u.name && u.role !== 'Customer')
                .forEach((u) => {
                    const name = String(u.name).trim();
                    const key = normalizeNameKey(name);
                    staffDirectory.set(key, {
                        name,
                        role: u.role || 'Staff',
                        designation: getPrimaryDesignation(u)
                    });
                });

            const performanceMap = new Map();
            Array.from(staffDirectory.values())
                .filter((s) => isTechnicianDesignation(s.designation, s.role))
                .forEach((s) => {
                    performanceMap.set(normalizeNameKey(s.name), {
                        name: s.name,
                        designation: s.designation,
                        totalTasks: 0,
                        completedTasks: 0,
                        pendingTasks: 0
                    });
                });

            (jobCards || []).forEach((job) => {
                const jobDate = job?.date ? dayjs(job.date) : null;
                const jobInMonth = !!jobDate && jobDate.isValid() && jobDate.isBetween(monthStart, monthEnd, null, '[]');
                const tasksObj = job?.departmentsTasks || {};

                Object.keys(tasksObj).forEach((dept) => {
                    const tasks = (tasksObj[dept] && tasksObj[dept].tasks) || [];
                    tasks.forEach((task) => {
                        const assignedName = String(task?.assigned_staff_name || task?.assignedStaffName || '').trim();
                        if (!assignedName) return;

                        const key = normalizeNameKey(assignedName);
                        const profile = staffDirectory.get(key);
                        const designation = profile?.designation || 'Technician';
                        const role = profile?.role || 'Staff';
                        if (!isTechnicianDesignation(designation, role)) return;

                        if (!performanceMap.has(key)) {
                            performanceMap.set(key, {
                                name: profile?.name || assignedName,
                                designation,
                                totalTasks: 0,
                                completedTasks: 0,
                                pendingTasks: 0
                            });
                        }

                        const row = performanceMap.get(key);
                        const completionTs = getTaskCompletionTimestamp(task, job);
                        const completedInMonth = (task?.status === 'completed') &&
                            completionTs &&
                            dayjs(completionTs).isValid() &&
                            dayjs(completionTs).isBetween(monthStart, monthEnd, null, '[]');
                        const pendingInMonth = (task?.status || 'pending') !== 'completed' && jobInMonth;

                        if (completedInMonth) {
                            row.completedTasks += 1;
                            row.totalTasks += 1;
                        } else if (pendingInMonth) {
                            row.pendingTasks += 1;
                            row.totalTasks += 1;
                        }
                    });
                });
            });

            const staffPerformance = Array.from(performanceMap.values())
                .map((row) => ({
                    ...row,
                    pendingTasks: row.pendingTasks || Math.max(row.totalTasks - row.completedTasks, 0)
                }))
                .sort((a, b) =>
                    (b.completedTasks - a.completedTasks) ||
                    (b.totalTasks - a.totalTasks) ||
                    a.name.localeCompare(b.name)
                );

            await generateMonthlyPdf({
                month: plMonth.toISOString(),
                plData,
                breakdown,
                staffPerformance,
                companyName: 'Mamun Automobiles',
                companyAddress: 'Plot # 117, Road # 13, Sector # 10, Uttara, Dhaka-1230 | Phone: 01712-345678'
            });
            message.success('Monthly PDF generated and downloaded');
        } catch (err) {
            console.error(err);
            message.error('Failed to generate PDF');
        }
    };

    const handleExportExcel = () => {
        try {
            const plRow = {
                Category: 'Financial Summary',
                Month: plMonth.format('MMMM YYYY'),
                Revenue: plData.totalSales || 0,
                Expenses: plData.totalExpensesAmt || 0,
                'Net Profit': plData.netProfit || 0,
                'Outstanding Due': plData.totalDue || 0
            };

            const exportData = [plRow, {}];
            exportToExcel(exportData, `Monthly_Report_${plMonth.format('MMM_YYYY')}`, 'Monthly Report');
            message.success('Excel report exported.');
        } catch (err) {
            console.error(err);
            message.error('Failed to export Excel');
        }
    };

    const PLPrintContent = () => (
        <div className="alive-print-area">
            {/* Self-Healing Anti-Gravity Engine Active (v3.3) */}
            <div style={{ textAlign: 'center', borderBottom: '3px double #333', paddingBottom: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: '0.5px' }}>Mamun Automobiles</div>
                <div style={{ fontSize: 13, color: '#555', fontWeight: 600 }}>Auto Workshop & Spare Parts</div>
                <div style={{ fontSize: 15, fontWeight: 600, color: '#10b981', marginTop: 10, border: '1px solid #10b981', display: 'inline-block', padding: '4px 15px' }}>
                    {t('pl_statement', language)} — {plMonth.format('MMMM YYYY')}
                </div>
            </div>

            <div style={{ flexGrow: 1, minHeight: 0 }}>
                {/* Cash vs Credit split */}
                <Row gutter={16} style={{ marginBottom: 15 }}>
                    <Col span={12}><Text style={{ fontSize: 12 }}>💵 {t('cash_sales', language)} ({plData.cashCount} {t('sales_invoices', language).toLowerCase()}): <strong>৳ {plData.cashRevenue.toLocaleString()}</strong></Text></Col>
                    <Col span={12} style={{ textAlign: 'right' }}><Text style={{ fontSize: 12 }}>💳 {t('credit_sales', language)} ({plData.creditCount} {t('sales_invoices', language).toLowerCase()}): <strong>৳ {plData.creditRevenue.toLocaleString()}</strong></Text></Col>
                </Row>

                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: 20 }}>
                    <Row gutter={16} style={{ marginBottom: 10 }}>
                        <Col span={16}><Text strong>{t('total_cash_collected', language)}:</Text></Col>
                        <Col span={8} style={{ textAlign: 'right' }}><Text style={{ color: '#16a34a', fontSize: 16, fontWeight: 600 }}>৳ {plData.totalSales.toLocaleString()}</Text></Col>
                    </Row>
                    {plData.usedSaleRevenue > 0 && (
                        <Row gutter={16} style={{ marginBottom: 10 }}>
                            <Col span={16}><Text strong>{t('used_profit_label', language)}:</Text></Col>
                            <Col span={8} style={{ textAlign: 'right' }}><Text style={{ color: plData.usedProfit >= 0 ? '#16a34a' : '#dc2626', fontWeight: 600 }}>৳ {plData.usedProfit.toLocaleString()}</Text></Col>
                        </Row>
                    )}
                    <Row gutter={16} style={{ marginBottom: 10 }}>
                        <Col span={16}><Text strong>{t('total_operating_expenses', language)} (incl. Salaries):</Text></Col>
                        <Col span={8} style={{ textAlign: 'right' }}><Text style={{ color: '#dc2626' }}>- ৳ {(plData.totalExpensesAmt + plData.totalSalaryAmt).toLocaleString()}</Text></Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={16}><Text strong>{t('cogs_label', language)}:</Text></Col>
                        <Col span={8} style={{ textAlign: 'right' }}><Text style={{ color: '#dc2626' }}>- ৳ {(plData.totalCOGS || 0).toLocaleString()}</Text></Col>
                    </Row>
                </div>

                <div style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', color: '#fff', marginBottom: 25, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text strong style={{ fontSize: 18, color: '#fff' }}>{t('net_profit_loss', language)}:</Text>
                    <Text style={{ fontSize: 24, fontWeight: 600, color: plData.netProfit >= 0 ? '#4ade80' : '#f87171' }}>
                        ৳ {plData.netProfit.toLocaleString()}
                    </Text>
                </div>

                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.5px' }}>Top Performing Parts & Services</div>
                <table className="premium-print-table">
                    <thead>
                        <tr>
                            <th style={{ width: '60%', textAlign: 'left', padding: '10px' }}>Item Description</th>
                            <th style={{ textAlign: 'right', padding: '10px' }}>Total Quantity Sold</th>
                        </tr>
                    </thead>
                    <tbody>
                        {topPartsData.map((part, idx) => {
                            const compress = topPartsData.length > 5;
                            const cellStyle = { 
                                padding: compress ? '3px 10px' : '8px 10px', 
                                fontSize: compress ? '11px' : '12px',
                                lineHeight: compress ? '1.1' : '1.4'
                            };
                            return (
                                <tr key={idx}>
                                    <td style={cellStyle}>{part.name}</td>
                                    <td style={{ ...cellStyle, textAlign: 'right' }}>{part.qty}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

            {plData.monthExpenses.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.5px' }}>Monthly Expenses ({plData.monthExpenses.length})</div>
                    <table className="premium-print-table">
                        <thead>
                            <tr style={{ background: '#fff1f0' }}>
                                {['Description', 'Category', 'Date', 'Amount'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {plData.monthExpenses.map(e => {
                                const compress = plData.monthExpenses.length > 5;
                                const cellStyle = { 
                                    padding: compress ? '2.5px 10px' : '8px 10px', 
                                    fontSize: compress ? '11px' : '12px',
                                    lineHeight: compress ? '1.1' : '1.4'
                                };
                                return (
                                    <tr key={e.id}>
                                        <td style={cellStyle}>{e.description || e.category}</td>
                                        <td style={cellStyle}>{e.category}</td>
                                        <td style={cellStyle}>{e.date ? dayjs(e.date).format('DD MMM') : '-'}</td>
                                        <td style={{ ...cellStyle, fontWeight: 700 }}>৳{(e.amount || 0).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {plData.monthSalaries.length > 0 && (
                <div style={{ marginTop: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 10, letterSpacing: '0.5px' }}>Staff Salaries ({plData.monthSalaries.length})</div>
                    <table className="premium-print-table">
                        <thead>
                            <tr>
                                {['Staff Name', 'Role', 'Gross', 'Net Payable'].map(h => (
                                    <th key={h} style={{ padding: '8px 10px', textAlign: 'left' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {plData.monthSalaries.map(s => {
                                const compress = plData.monthSalaries.length > 5;
                                const cellStyle = { 
                                    padding: compress ? '2.5px 10px' : '8px 10px', 
                                    fontSize: compress ? '11px' : '12px',
                                    lineHeight: compress ? '1.1' : '1.4'
                                };
                                return (
                                    <tr key={s.id}>
                                        <td style={{ ...cellStyle, fontWeight: 700 }}>{s.staffName}</td>
                                        <td style={cellStyle}>{s.role}</td>
                                        <td style={cellStyle}>৳{(s.amount || 0).toLocaleString()}</td>
                                        <td style={{ ...cellStyle, fontWeight: 600 }}>৳{(s.netPayable || 0).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="alive-footer-lock" style={{ marginTop: 32, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <Text type="secondary" style={{ fontSize: 10 }}>Generated by Mamun Automobiles Management System • {dayjs().format('DD MMM YYYY, hh:mm A')}</Text>
            </div>
        </div>
    </div>
);

return (
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '40px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '20px' }}>
                <div>
                    <Title level={2} style={{ margin: 0, color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.2px' }}>{t('financial_reports', language)}</Title>
                    <Text style={{ color: '#3B82F6', fontWeight: 500, fontSize: 12, letterSpacing: '0.2px' }}>{t('reports_subtitle', language)}</Text>
                </div>
                <Space size="middle">
                    <Button 
                        size="large" 
                        onClick={handlePrintPL}
                        style={{ background: 'transparent', border: '1px solid #3B82F6', color: '#3B82F6', fontWeight: 600 }}
                    >
                        {t('monthly_pl_statement', language)}
                    </Button>
                    <Button 
                        size="large" 
                        onClick={handleDownloadReport}
                        style={{ background: '#3B82F6', border: 'none', color: '#FFFFFF', fontWeight: 600 }}
                    >
                        {t('download_monthly_report', language)}
                    </Button>
                </Space>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
                <div style={{ display: 'flex', gap: '2px' }}>
                    <Button 
                        onClick={() => setViewMode('tabular')}
                        style={{ 
                            background: viewMode === 'tabular' ? '#3B82F6' : 'rgba(255,255,255,0.05)', 
                            border: 'none', 
                            color: viewMode === 'tabular' ? '#FFFFFF' : '#FFF', 
                            fontWeight: 600, 
                            padding: '0 25px'
                        }}
                    >
                        {t('data_table', language)}
                    </Button>
                    <Button 
                        onClick={() => setViewMode('analytics')}
                        style={{ 
                            background: viewMode === 'analytics' ? '#3B82F6' : 'rgba(255,255,255,0.05)', 
                            border: 'none', 
                            color: viewMode === 'analytics' ? '#FFFFFF' : '#FFF', 
                            fontWeight: 600, 
                            padding: '0 25px'
                        }}
                    >
                        {t('smart_analytics', language)}
                    </Button>
                </div>
                <RangePicker
                    onChange={(dates) => setDateRange(dates)}
                    format="YYYY-MM-DD"
                    size="large"
                    className="luxury-search"
                    style={{ borderRadius: 0 }}
                />
            </div>

            {/* ── Metric Cards ── */}
            <Row gutter={[20, 20]} style={{ marginBottom: 40 }}>
                <Col span={8}>
                    <div className="glass-card" style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#AAA', fontSize: 11, fontWeight: 600, marginBottom: 15, letterSpacing: '0.2px' }}>{t('total_revenue', language)}</div>
                        <div style={{ fontSize: 32, fontWeight: 600, color: '#FFFFFF' }}>৳ {totalRevenue.toLocaleString()}</div>
                        <div style={{ color: '#3B82F6', fontSize: 10, fontWeight: 600, marginTop: 10 }}>{t('performance', language)}</div>
                    </div>
                </Col>
                <Col span={8}>
                    <div className="glass-card" style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#AAA', fontSize: 11, fontWeight: 600, marginBottom: 15, letterSpacing: '0.2px' }}>{t('total_collected', language)}</div>
                        <div style={{ fontSize: 32, fontWeight: 600, color: '#3B82F6' }}>৳ {totalCollected.toLocaleString()}</div>
                        <div style={{ color: '#3B82F6', fontSize: 10, fontWeight: 600, marginTop: 10 }}>{t('cash_flow', language)}</div>
                    </div>
                </Col>
                <Col span={8}>
                    <div className="glass-card" style={{ padding: '30px', textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ color: '#AAA', fontSize: 11, fontWeight: 600, marginBottom: 15, letterSpacing: '0.2px' }}>{t('outstanding_dues', language)}</div>
                        <div style={{ fontSize: 32, fontWeight: 600, color: '#ff4d4f' }}>৳ {totalDues.toLocaleString()}</div>
                        <div style={{ color: '#ff4d4f', fontSize: 10, fontWeight: 600, marginTop: 10 }}>{t('action_required', language)}</div>
                    </div>
                </Col>
            </Row>

            {/* ── Premium Charts ── */}
            <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col xs={24} lg={16}>
                    <Card className="glass-card" bordered={false} title={t('revenue_vs_expenses', language)} style={{ height: '100%' }}>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <AreaChart data={dailyChartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                        </linearGradient>
                                        <linearGradient id="colorExp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    
                                    <YAxis stroke="var(--text-secondary)" />
                                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                    />
                                    <Legend />
                                    <Area type="monotone" dataKey="Revenue" stroke="#3b82f6" fillOpacity={1} fill="url(#colorRev)" />
                                    <Area type="monotone" dataKey="Expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
                <Col xs={24} lg={8}>
                    <Card className="glass-card" bordered={false} title={t('income_breakdown', language)} style={{ height: '100%' }}>
                        <div style={{ width: '100%', height: 300 }}>
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie
                                        data={pieChartData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {pieChartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip
                                        contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value) => `৳ ${value?.toLocaleString()}`}
                                    />
                                    <Legend verticalAlign="bottom" height={36} />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </Card>
                </Col>
            </Row>

            {/* ── Monthly Calendar ── */}
            <Card
                title={t('monthly_business_pulse', language)}
                className="glass-card"
                bordered={false}
                style={{ marginBottom: 24 }}
                extra={
                    <Space>
                        <Badge status="success" text={<span style={{ color: 'var(--text-secondary)' }}>{t('revenue_target', language)}</span>} />
                        <Badge status="error" text={<span style={{ color: 'var(--text-secondary)' }}>{t('major_expense', language)}</span>} />
                    </Space>
                }
            >
                <Calendar
                    value={selectedMonth}
                    onSelect={(val) => {
                        setSelectedMonth(val);
                        handleDateCellClick(val);
                    }}
                    cellRender={dateCellRender}
                    style={{ padding: '0 8px', background: 'transparent' }}
                />
            </Card>

            {viewMode === 'tabular' ? (
                <div className="glass-card" style={{ padding: '30px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                        <Title level={4} style={{ margin: 0, color: '#FFFFFF', fontWeight: 600, letterSpacing: '0.2px' }}>{t('generative_data_report', language)}</Title>
                        <Button 
                            onClick={() => setIsPrintingTabular(true)}
                            style={{ background: '#FFF', border: 'none', color: '#000', fontWeight: 600, borderRadius: 0 }}
                        >
                            {t('export_print_report', language)}
                        </Button>
                    </div>
                    <Table
                        className="luxury-table"
                        dataSource={filteredBills}
                        columns={columns}
                        rowKey={(r) => r.id || r.billNo}
                        pagination={{ pageSize: 15 }}
                        locale={{ emptyText: 'Select a date range above to filter reports' }}
                    />
                </div>
            ) : (
                <div className="analytics-view">
                    <Row gutter={[16, 16]}>
                        <Col span={24}>
                            <Card className="glass-card" title="Monthly Profit/Loss Trend (Cash Flow)">
                                <div style={{ height: 350 }}>
                                    <ResponsiveContainer>
                                        <BarChart data={monthlyTrendData}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            
                                            <YAxis />
                                            <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), borderRadius: 8, color: isDark ? '#fff' : '#000' }} itemStyle={{ color: isDark ? '#fff' : '#000' }} />
                                            <Legend />
                                            <Bar dataKey="Income" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Expense" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                            <Bar dataKey="Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card className="glass-card" title="Top Selling Parts (Quantity)">
                                <div style={{ height: 350 }}>
                                    <ResponsiveContainer>
                                        <BarChart layout="vertical" data={topPartsData} margin={{ left: 40 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                            
                                            <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 11 }} />
                                            <RechartsTooltip contentStyle={{ backgroundColor: isDark ? '#1e293b' : '#ffffff', border: '1px solid ' + (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'), borderRadius: 8, color: isDark ? '#fff' : '#000' }} itemStyle={{ color: isDark ? '#fff' : '#000' }} />
                                            <Bar dataKey="qty" fill="#6366f1" radius={[0, 4, 4, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                        <Col xs={24} lg={12}>
                            <Card className="glass-card" title="Mechanic Revenue Contribution">
                                <div style={{ height: 350 }}>
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={mechanicPerformanceData}
                                                dataKey="revenue"
                                                nameKey="name"
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={100}
                                                label
                                            >
                                                {mechanicPerformanceData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'][index % 5]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip formatter={(v) => `৳ ${v.toLocaleString()}`} contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: 8 }} />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            </Card>
                        </Col>
                    </Row>
                </div>
            )}

            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                <Col xs={24}>
                    <Card className="glass-card" title="Mechanic Workload Summary">
                        <List
                            size="small"
                            dataSource={mechanicJobSummary}
                            locale={{ emptyText: <Text type="secondary">No mechanics have been assigned yet.</Text> }}
                            renderItem={(item) => (
                                <List.Item>
                                    <List.Item.Meta
                                        title={item.name}
                                        description={
                                            <span>
                                                Jobs: {item.total} • Completed: {item.completed} • Pending: {item.pending}
                                            </span>
                                        }
                                    />
                                </List.Item>
                            )}
                        />
                    </Card>
                </Col>
            </Row>

            {/* ── Day Drill-Down Modal ── */}
            <Modal
                title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>Daily transaction drill-down</span>}
                open={dayModalVisible}
                onCancel={() => setDayModalVisible(false)}
                className="luxury-modal"
                footer={<Button onClick={() => setDayModalVisible(false)} style={{ borderRadius: 0, fontWeight: 600 }}>Close</Button>}
                width={900}
            >
                {selectedDate && (() => {
                    const dayBills = getBillsForDate(selectedDate);
                    const dayExps = getExpensesForDate(selectedDate);
                    const daySales = dayBills.reduce((s, b) => s + (b.paid || 0), 0);
                    const dayExpTotal = dayExps.reduce((s, e) => s + (e.amount || 0), 0);

                    return (
                        <>
                            <Row gutter={12} style={{ marginBottom: 16 }}>
                                <Col span={8}>
                                    <Card size="small" style={{ background: '#f6ffed', borderColor: '#b7eb8f' }}>
                                        <Statistic title="Revenue" value={`৳ ${daySales.toLocaleString()}`} valueStyle={{ color: '#52c41a', fontSize: 18 }} />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card size="small" style={{ background: '#fff1f0', borderColor: '#ffa39e' }}>
                                        <Statistic title="Expenses" value={`৳ ${dayExpTotal.toLocaleString()}`} valueStyle={{ color: '#cf1322', fontSize: 18 }} />
                                    </Card>
                                </Col>
                                <Col span={8}>
                                    <Card size="small" style={{ background: (daySales - dayExpTotal) >= 0 ? '#f6ffed' : '#fff1f0', borderColor: '#d9d9d9' }}>
                                        <Statistic title="Net" value={`৳ ${(daySales - dayExpTotal).toLocaleString()}`} valueStyle={{ color: (daySales - dayExpTotal) >= 0 ? '#52c41a' : '#cf1322', fontSize: 18 }} />
                                    </Card>
                                </Col>
                            </Row>

                            {dayBills.length > 0 && (
                                <>
                                    <Text strong>Sales Invoices</Text>
                                    <Table
                                        size="small"
                                        dataSource={dayBills}
                                        rowKey={(r) => r.id || r.billNo}
                                        pagination={false}
                                        style={{ marginTop: 8, marginBottom: 16 }}
                                        columns={[
                                            { title: 'Bill No', dataIndex: 'billNo', key: 'billNo', render: (v, r) => v || r.id },
                                            { title: 'Customer', dataIndex: 'customerName', key: 'customerName' },
                                            { title: 'Amount', dataIndex: 'amount', key: 'amount', render: v => `৳ ${(v || 0).toLocaleString()}` },
                                            { title: 'Paid', dataIndex: 'paid', key: 'paid', render: v => `৳ ${(v || 0).toLocaleString()}` },
                                            { title: 'Due', dataIndex: 'due', key: 'due', render: v => <span style={{ color: v > 0 ? '#cf1322' : 'inherit' }}>৳ {(v || 0).toLocaleString()}</span> },
                                        ]}
                                    />
                                </>
                            )}

                            {dayExps.length > 0 && (
                                <>
                                    <Text strong>Expenses</Text>
                                    <List
                                        size="small"
                                        dataSource={dayExps}
                                        style={{ marginTop: 8 }}
                                        renderItem={item => (
                                            <List.Item extra={<Text style={{ color: '#cf1322' }}>-৳ {(item.amount || 0).toLocaleString()}</Text>}>
                                                <List.Item.Meta
                                                    title={item.description || item.category}
                                                    description={<Tag color="red">{item.category}</Tag>}
                                                />
                                            </List.Item>
                                        )}
                                    />
                                </>
                            )}

                            {dayBills.length === 0 && dayExps.length === 0 && <Empty description="No transactions on this date" />}
                        </>
                     );
                })()}
            </Modal>

            {/* ── P/L Statement Modal ── */}
            <Modal
                title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>Monthly profit & loss statement</span>}
                open={plModalVisible}
                onCancel={() => setPlModalVisible(false)}
                className="luxury-modal"
                width={1000}
                footer={[
                    <Button key="close" onClick={() => setPlModalVisible(false)} style={{ borderRadius: 0, fontWeight: 600 }}>Close</Button>,
                    <Button key="print" onClick={handlePrintPL} style={{ background: '#3B82F6', border: 'none', color: '#FFF', fontWeight: 600, borderRadius: 0 }}>
                        Print / Save as PDF
                    </Button>
                ]}
            >
                <div className="no-print" style={{ marginBottom: 16 }}>
                    <Space>
                        <Text>Select Month:</Text>
                        <DatePicker
                            picker="month"
                            value={plMonth}
                            onChange={val => val && setPlMonth(val)}
                            format="MMMM YYYY"
                        />
                    </Space>
                </div>

                <div className="no-print">
                    <PLPrintContent />
                </div>
            </Modal>

            {/* ---- P&L STATEMENT PRINT PORTAL (v4.2 Isolation) ---- */}
            {isPrintingPL && createPortal(
                <PLPrintContent />,
                document.body
            )}

            {/* ---- TABULAR REPORT PRINT PORTAL (v4.2 Isolation) ---- */}
            {isPrintingTabular && createPortal(
                <div className="alive-print-area">
                    <BrandedDocumentHeader 
                        title={t('generative_data_report', language)} 
                        subtitle="Mamun Automobiles Financials"
                        meta={[
                            { label: 'Report Mode', value: 'Tabular' },
                            { label: 'Generated At', value: dayjs().format('DD MMM YYYY, hh:mm A') }
                        ]}
                    />
                    
                    <div style={{ flexGrow: 1, minHeight: 0, marginTop: 20 }}>
                        <table className="premium-print-table">
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left' }}>{t('date', language)}</th>
                                    <th style={{ textAlign: 'left' }}>{t('invoice_no', language)}</th>
                                    <th style={{ textAlign: 'left' }}>{t('customer', language)}</th>
                                    <th style={{ textAlign: 'right' }}>{t('amount', language)}</th>
                                    <th style={{ textAlign: 'right' }}>{t('due', language)}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredBills.map((r, i) => {
                                    const compress = filteredBills.length > 8;
                                    const cellStyle = { 
                                        padding: compress ? '2.5px 8px' : '8px 8px', 
                                        fontSize: compress ? '11px' : '12.5px',
                                        lineHeight: compress ? '1.1' : '1.4'
                                    };
                                    return (
                                        <tr key={r.id || i}>
                                            <td style={cellStyle}>{dayjs(r.date).format('DD MMM YYYY')}</td>
                                            <td style={{ ...cellStyle, fontWeight: 700 }}>{r.billNo || r.id}</td>
                                            <td style={cellStyle}>{r.customerName}</td>
                                            <td style={{ ...cellStyle, textAlign: 'right' }}>৳{(r.amount || 0).toLocaleString()}</td>
                                            <td style={{ ...cellStyle, textAlign: 'right', color: (r.due || 0) > 0 ? '#cf1322' : 'inherit' }}>৳{(r.due || 0).toLocaleString()}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="alive-footer-lock">
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 20 }}>
                            <div style={{ width: 300, borderTop: '2px solid #000', paddingTop: 10 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 16, fontWeight: 600 }}>
                                    <span>{t('total_revenue', language)}:</span>
                                    <span>৳{totalRevenue.toLocaleString()}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#cf1322', fontWeight: 700 }}>
                                    <span>{t('total_dues', language)}:</span>
                                    <span>৳{totalDues.toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                        <div style={{ textAlign: 'center', fontSize: 9, color: '#64748b', borderTop: '1px solid #eee', paddingTop: 10 }}>
                            MAMUN AUTOMOBILES // FINANCIAL MODULE // ZERO-GAP V4.2
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

export default ReportsPage;
