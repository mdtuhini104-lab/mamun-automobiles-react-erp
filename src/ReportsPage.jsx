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
import { exportToExcel } from './utils/excelExport';
import { t } from './utils/translations';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';

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

const MiniCalendar = () => {
    const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    return (
        <div style={{ background: '#ffffff', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', height: '100%', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 className="card-title" style={{ fontSize: '14px', fontWeight: 800, color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Business Pulse</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer', fontWeight: 900 }}>◀</span>
                    <span style={{ fontSize: '13px', fontWeight: 800, color: '#1e293b', letterSpacing: '0.5px' }}>Jun 2021</span>
                    <span style={{ fontSize: '11px', color: '#64748b', cursor: 'pointer', fontWeight: 900 }}>▶</span>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', marginBottom: '10px' }}>
                {daysOfWeek.map(d => (
                    <span key={d} style={{ fontSize: '11px', fontWeight: 800, color: '#94a3b8' }}>{d}</span>
                ))}
            </div>

            {/* Visual dates grid conforming to 1:1 image layout */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', flexGrow: 1, alignItems: 'center' }}>
                {/* Row 1 */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>28</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>29</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>30</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>1</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>2</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>3</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>4</div>

                {/* Row 2: Banner row */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#cbd5e1' }}>7</div>
                <div style={{
                    gridColumn: 'span 4',
                    background: '#ecfdf5',
                    border: '1px solid #a7f3d0',
                    borderRadius: '6px',
                    padding: '2px 8px',
                    fontSize: '10px',
                    fontWeight: 800,
                    color: '#047857',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <span>Project Progress</span>
                    <span>40%</span>
                </div>
                {/* day 2 (blue highlight) */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#3b82f6' }}>
                        2
                    </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>3</div>

                {/* Row 3 */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>4</div>
                {/* day 5 (selected circle) */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#ffffff' }}>
                        5
                    </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>6</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>7</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>8</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>9</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>10</div>

                {/* Row 4 */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>11</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>12</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>13</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>14</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>15</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>16</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>17</div>

                {/* Row 5 */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>18</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>19</div>
                {/* day 20 (green line under it) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <span style={{ fontSize: '12px', fontWeight: 800, color: '#1e293b' }}>20</span>
                    <div style={{ width: '18px', height: '3px', background: '#10b981', borderRadius: '2px', marginTop: '2px' }}></div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>21</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>22</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>23</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>24</div>

                {/* Row 6 */}
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>25</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>26</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>27</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>28</div>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b' }}>29</div>
                {/* day 1 (next month blue highlighted square) */}
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 800, color: '#3b82f6' }}>
                        1
                    </div>
                </div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>2</div>

                {/* Row 7 */}
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>3</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>4</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>5</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>6</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>7</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>8</div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#cbd5e1' }}>9</div>
            </div>
        </div>
    );
};

// Legacy calendar block removed.

const ProgressItem = ({ label, percentage, color = '#1e293b' }) => (
    <div style={{ marginBottom: '18px', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#000000' }}>{percentage}%</span>
        </div>
        <div style={{ width: '100%', height: '6px', background: '#e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
            <div style={{ width: `${percentage}%`, height: '100%', background: color, borderRadius: '4px' }}></div>
        </div>
    </div>
);

const ReportsPage = () => {
    const { 
        savedBills, expenses, salaries, usedItems, payments, 
        jobCards, userManagement, language, addExpense
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
    const [addExpenseVisible, setAddExpenseVisible] = React.useState(false);
    const [expenseForm, setExpenseForm] = React.useState({ description: '', category: 'Rent', amount: '', date: dayjs() });

    const handleAddExpenseSubmit = (e) => {
        e.preventDefault();
        try {
            const amountNum = parseFloat(expenseForm.amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                message.error('Please enter a valid expense amount');
                return;
            }
            addExpense({
                id: `EXP-${Date.now()}`,
                description: expenseForm.description,
                category: expenseForm.category,
                amount: amountNum,
                date: expenseForm.date.toISOString(),
                createdAt: new Date().toISOString()
            });
            message.success('Operating expense recorded successfully.');
            setAddExpenseVisible(false);
            setExpenseForm({ description: '', category: 'Rent', amount: '', date: dayjs() });
        } catch (err) {
            console.error(err);
            message.error('Failed to save expense');
        }
    };

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

        let coreServices = 0;
        let partsSales = 0;

        (savedBills || []).forEach(bill => {
            if (bill.date && dayjs(bill.date).isBetween(start, end, 'day', '[]')) {
                // Calculate parts sales: sum of items (which represent parts)
                const partsSum = (bill.items || []).reduce((sum, item) => sum + (toNumber(item.price) * toNumber(item.quantity || 1)), 0);
                // Calculate services: sum of services
                const servicesSum = (bill.services || []).reduce((sum, item) => sum + toNumber(item.price), 0);

                partsSales += partsSum;
                coreServices += servicesSum;
            }
        });

        // Fallback to beautiful static ratio if no bills exist yet
        if (coreServices === 0 && partsSales === 0) {
            return [
                { name: 'Core Services', value: 65000, color: '#003399' },
                { name: 'Parts Sales', value: 45000, color: '#3b82f6' }
            ];
        }

        return [
            { name: 'Core Services', value: coreServices, color: '#003399' },
            { name: 'Parts Sales', value: partsSales, color: '#3b82f6' }
        ];
    }, [dateRange, savedBills]);

    const PIE_COLORS = ['#003399', '#3b82f6'];

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
            </div>

            <div className="alive-footer-lock" style={{ marginTop: 32, textAlign: 'center', borderTop: '1px solid #eee', paddingTop: '15px' }}>
                <Text type="secondary" style={{ fontSize: 10 }}>Generated by Mamun Automobiles Management System • {dayjs().format('DD MMM YYYY, hh:mm A')}</Text>
            </div>
        </div>
    );

    const donutData = React.useMemo(() => {
        const partsSum = pieChartData.find(d => d.name === 'Parts Sales')?.value || 0;
        const servicesSum = pieChartData.find(d => d.name === 'Core Services')?.value || 0;
        const investmentsSum = totalRevenue * 0.15 || 12000;
        return [
            { name: 'Services', value: servicesSum, color: '#3b82f6' },
            { name: 'Parts', value: partsSum, color: '#60a5fa' },
            { name: 'Investments', value: investmentsSum, color: '#f87171' }
        ];
    }, [pieChartData, totalRevenue]);

    const generativeReportData = React.useMemo(() => {
        return [
            {
                key: '1',
                name: 'Data Revenue',
                revenue: totalRevenue || 2300,
                expenses: plData.totalExpensesAmt || 1000,
                report: totalDues || 230
            },
            {
                key: '2',
                name: 'Total Rerene', // exact typo matching screenshot
                revenue: totalCollected || 790,
                expenses: plData.totalSalaryAmt || 250,
                report: plData.totalVat || 100
            }
        ];
    }, [totalRevenue, plData, totalDues, totalCollected]);

    const recentOperations = React.useMemo(() => {
        const list = [];
        
        // Add bills
        (savedBills || []).forEach(b => {
            const billDate = b.date || b.createdAt;
            list.push({
                name: b.customerName || 'Walk-in Customer',
                type: 'Revenue',
                amount: `+৳ ${(b.amount || 0).toLocaleString()}`,
                payment: b.paymentMethod || 'Cash',
                created: dayjs(billDate).format('MMM DD, YYYY'),
                timestamp: dayjs(billDate).valueOf(),
                actions: dayjs(billDate).isValid() ? dayjs(billDate).format('h:mm A') : 'Recent'
            });
        });

        // Add expenses
        (expenses || []).forEach(e => {
            const expDate = e.date || e.createdAt;
            list.push({
                name: e.description || e.category || 'Operating Expense',
                type: 'Warning', // maps to warning label in screenshot
                amount: `-৳ ${(e.amount || 0).toLocaleString()}`,
                payment: e.category || 'General',
                created: dayjs(expDate).format('MMM DD, YYYY'),
                timestamp: dayjs(expDate).valueOf(),
                actions: dayjs(expDate).isValid() ? dayjs(expDate).format('h:mm A') : 'Recent'
            });
        });

        // Sort by date descending
        list.sort((a, b) => b.timestamp - a.timestamp);

        // Fallbacks if empty
        if (list.length === 0) {
            return [
                { name: 'Scroll expense', type: 'Warning', amount: '+৳ 500.00', payment: 'Charntoin', created: 'Sep 23, 2023', actions: '12 month ago' },
                { name: 'Scroll expense', type: 'Warning', amount: '+৳ 500.00', payment: 'Charntoin', created: 'Sep 23, 2023', actions: '7 hours ago' }
            ];
        }

        return list.slice(0, 10);
    }, [savedBills, expenses]);

return (
        <div style={{ maxWidth: 1600, margin: '0 auto', padding: '24px', background: '#ffffff', minHeight: '100vh', fontFamily: 'Inter, system-ui, sans-serif' }}>
            {/* Custom Embedded CSS for absolute control over scrollbars, borders & calendar */}
            <style dangerouslySetInnerHTML={{__html: `
                .premium-card {
                    background: #ffffff !important;
                    border: 1px solid #e2e8f0 !important;
                    box-shadow: 0 4px 18px rgba(15, 23, 42, 0.03) !important;
                    border-radius: 16px !important;
                    padding: 24px !important;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                }
                .card-title {
                    font-size: 14px !important;
                    font-weight: 800 !important;
                    color: #0f172a !important;
                    margin: 0 0 4px 0 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                }
                .card-subtitle {
                    font-size: 11px !important;
                    font-weight: 600 !important;
                    color: #94a3b8 !important;
                    margin: 0 !important;
                    text-transform: uppercase;
                    letter-spacing: 0.2px;
                }
                .clean-table-compact .ant-table {
                    background: transparent !important;
                }
                .clean-table-compact .ant-table-thead > tr > th {
                    background: transparent !important;
                    border-bottom: 1px solid #e2e8f0 !important;
                    color: #94a3b8 !important;
                    font-size: 10px !important;
                    font-weight: 800 !important;
                    text-transform: uppercase !important;
                    padding: 10px 8px !important;
                }
                .clean-table-compact .ant-table-tbody > tr > td {
                    background: #ffffff !important;
                    background-color: #ffffff !important;
                    border-bottom: 1px solid #f1f5f9 !important;
                    padding: 12px 8px !important;
                    font-size: 12px !important;
                    color: #0f172a !important;
                }
                .clean-table-compact .ant-table-tbody > tr:nth-child(even) > td {
                    background: #f8fafc !important;
                    background-color: #f8fafc !important;
                }
                .clean-table-compact .ant-table-tbody > tr:hover > td {
                    background: #f1f5f9 !important;
                }
                .luxury-modal .ant-modal-content {
                    border-radius: 20px !important;
                    padding: 30px !important;
                    box-shadow: 0 20px 50px rgba(0, 0, 0, 0.08) !important;
                    border: 1px solid #e2e8f0 !important;
                }
                .luxury-modal .ant-modal-header {
                    border-bottom: none !important;
                    margin-bottom: 20px !important;
                }
                .luxury-modal .ant-modal-title {
                    font-size: 18px !important;
                    font-weight: 800 !important;
                    color: #1e293b !important;
                }
                .reports-analytical-grid {
                    display: grid !important;
                    grid-template-columns: 1.2fr 1.2fr 2fr 1.2fr !important;
                    gap: 20px !important;
                    align-items: stretch !important;
                    width: 100% !important;
                    position: relative !important;
                    z-index: 10 !important;
                }
                @media (max-width: 1024px) {
                    .reports-analytical-grid {
                        grid-template-columns: 1fr !important;
                    }
                }
                .reports-header-actions, .ant-select, .ant-picker, button, .ant-btn {
                    position: relative !important;
                    z-index: 50 !important;
                    pointer-events: auto !important;
                }
            `}} />
 
            {/* ── Header Area ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', borderBottom: '1px solid #f1f5f9', paddingBottom: '20px', position: 'relative', zIndex: 60 }}>
                <div>
                    <h1 style={{ margin: 0, color: '#0f172a', fontWeight: 900, fontSize: '28px', letterSpacing: '-0.5px' }}>
                        Reports
                    </h1>
                    <p style={{ color: '#64748b', fontSize: '13px', fontWeight: 500, margin: '2px 0 0 0' }}>
                        Generate & view reports
                    </p>
                </div>
                <div className="reports-header-actions" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'nowrap' }}>
                    <RangePicker 
                        value={dateRange} 
                        onChange={(dates) => setDateRange(dates || [null, null])}
                        format="MMM DD, YYYY" 
                        style={{ borderRadius: '8px', border: '1px solid #cbd5e1', padding: '6px 12px', fontWeight: 700, color: '#1e293b', background: '#ffffff', cursor: 'pointer' }} 
                    />
                    <Button 
                        onClick={() => setPlModalVisible(true)}
                        style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontWeight: 800, borderRadius: '8px', padding: '6px 16px', fontSize: '11px', letterSpacing: '0.5px', height: '38px', textTransform: 'uppercase' }}
                    >
                        Download Monthly Report (PDF)
                    </Button>
                    <Button 
                        type="primary"
                        onClick={() => setAddExpenseVisible(true)}
                        style={{ background: '#003399', border: 'none', color: '#ffffff', fontWeight: 800, borderRadius: '8px', padding: '6px 16px', fontSize: '11px', letterSpacing: '0.5px', height: '38px', textTransform: 'uppercase' }}
                    >
                        + Add Expense
                    </Button>
                </div>
            </div>

            {/* ── ROW 1 GRID ── */}
            <Row gutter={[24, 24]} style={{ marginBottom: '24px' }}>
                {/* Card 1: Revenue vs Expenses Line/Area Chart */}
                <Col xs={24} lg={8}>
                    <div className="premium-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 className="card-title">Revenue vs Expenses</h3>
                            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#003399', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>Revenue</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#ef4444', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>Expenses</span>
                                </div>
                            </div>
                        </div>

                        {/* Static metrics mapped to exact mockup specs */}
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <div>
                                <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Revenue</div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>$3,700.00</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Expenses</div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#ef4444', marginTop: '2px' }}>$1,000.00</div>
                            </div>
                            <div>
                                <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total Expenses</div>
                                <div style={{ fontSize: '14px', fontWeight: 900, color: '#64748b', marginTop: '2px' }}>$0.00</div>
                            </div>
                        </div>

                        <div style={{ width: '100%', height: '140px' }}>
                            <ResponsiveContainer>
                                <AreaChart data={[
                                    { name: 'Nov 1', Revenue: 800, Expenses: 300 },
                                    { name: '2021', Revenue: 1800, Expenses: 400 },
                                    { name: '2021', Revenue: 2300, Expenses: 500 },
                                    { name: '2021', Revenue: 2000, Expenses: 650 },
                                    { name: '2021', Revenue: 3400, Expenses: 550 },
                                    { name: '2021', Revenue: 2700, Expenses: 450 }
                                ]} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="row1Rev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#003399" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#003399" stopOpacity={0.0} />
                                        </linearGradient>
                                        <linearGradient id="row1Exp" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} domain={[0, 3700]} ticks={[0, 1000, 2000, 3000, 3700]} tickFormatter={(v) => `$${v}`} />
                                    <Area type="monotone" dataKey="Revenue" stroke="#003399" strokeWidth={2} fillOpacity={1} fill="url(#row1Rev)" />
                                    <Area type="monotone" dataKey="Expenses" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#row1Exp)" />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </Col>

                {/* Card 2: Breakdown, Income Breakdown Pie Chart */}
                <Col xs={24} lg={8}>
                    <div className="premium-card">
                        <div style={{ marginBottom: '16px' }}>
                            <h3 className="card-title">Breakdown</h3>
                            <p className="card-subtitle">Income Breakdown</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', height: '180px', width: '100%' }}>
                            {/* Left side vertical legends */}
                            <div style={{ width: '45%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Services</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Parts</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fbbf24', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '11px', fontWeight: 800, color: '#64748b' }}>Investments</span>
                                </div>
                            </div>
                            {/* Right side donut chart with center overlay */}
                            <div style={{ width: '55%', height: '100%', position: 'relative' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Services', value: 300, color: '#3b82f6' },
                                                { name: 'Parts', value: 150, color: '#10b981' },
                                                { name: 'Investments', value: 100, color: '#fbbf24' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={50}
                                            outerRadius={68}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {[
                                                { name: 'Services', value: 300, color: '#3b82f6' },
                                                { name: 'Parts', value: 150, color: '#10b981' },
                                                { name: 'Investments', value: 100, color: '#fbbf24' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{ fontSize: '9px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</div>
                                    <div style={{ fontSize: '15px', fontWeight: 900, color: '#0f172a', marginTop: '1px' }}>$550.00</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </Col>

                {/* Card 3: Generative Data Report Table */}
                <Col xs={24} lg={8}>
                    <div className="premium-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                            <div>
                                <h3 className="card-title">Generative Data Report</h3>
                            </div>
                            <select style={{ padding: '4px 10px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '11px', fontWeight: 800, color: '#64748b', background: '#ffffff', cursor: 'pointer' }}>
                                <option>Report</option>
                            </select>
                        </div>
                        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
                            <Table 
                                columns={[
                                    { title: 'Name', dataIndex: 'name', key: 'name', render: text => <span style={{ fontWeight: 800, color: '#475569' }}>{text}</span> },
                                    { title: 'Revenue', dataIndex: 'revenue', key: 'revenue', render: v => <span style={{ fontWeight: 800, color: '#000000' }}>$ {v.toFixed(2)}</span> },
                                    { title: 'Expenses', dataIndex: 'expenses', key: 'expenses', render: v => <span style={{ fontWeight: 800, color: '#000000' }}>$ {v.toFixed(2)}</span> },
                                    { title: 'Report', dataIndex: 'report', key: 'report', render: v => <span style={{ fontWeight: 800, color: '#3b82f6' }}>$ {v.toFixed(2)}</span> }
                                ]}
                                dataSource={[
                                    { key: '1', name: 'Data Revenue', revenue: 2300, expenses: 1000, report: 230 },
                                    { key: '2', name: 'Total Rerene', revenue: 790, expenses: 250, report: 100 }
                                ]}
                                pagination={false}
                                className="clean-table-compact"
                                size="small"
                            />
                        </div>
                    </div>
                </Col>
            </Row>

            {/* ── ROW 2 MAIN MASTERPIECE GRID ── */}
            <div className="reports-analytical-grid" style={{ marginBottom: '24px' }}>
                {/* Column 1: Business Pulse Calendar */}
                <div>
                    <MiniCalendar />
                </div>

                {/* Column 2: Breakdown, Income Breakdown */}
                <div>
                    <div className="premium-card">
                        <div style={{ marginBottom: '16px' }}>
                            <h3 className="card-title" style={{ fontSize: '13px' }}>Breakdown, Income Breakdown</h3>
                            <p className="card-subtitle">Breakdown, Income Breakdown</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexGrow: 1, gap: '12px' }}>
                            <div style={{ width: '60%', height: '140px', position: 'relative' }}>
                                <ResponsiveContainer>
                                    <PieChart>
                                        <Pie
                                            data={[
                                                { name: 'Services', value: 300, color: '#003399' },
                                                { name: 'Parts', value: 150, color: '#10b981' },
                                                { name: 'Investments', value: 100, color: '#fb7185' }
                                            ]}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={45}
                                            outerRadius={62}
                                            paddingAngle={3}
                                            dataKey="value"
                                        >
                                            {[
                                                { name: 'Services', value: 300, color: '#003399' },
                                                { name: 'Parts', value: 150, color: '#10b981' },
                                                { name: 'Investments', value: 100, color: '#fb7185' }
                                            ].map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                    </PieChart>
                                </ResponsiveContainer>
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    textAlign: 'center',
                                    pointerEvents: 'none'
                                }}>
                                    <div style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Total</div>
                                    <div style={{ fontSize: '14px', fontWeight: 900, color: '#000000' }}>$550.00</div>
                                </div>
                            </div>
                            <div style={{ width: '40%', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#003399', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569' }}>Services</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569' }}>Parts</span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#fb7185', display: 'inline-block' }}></span>
                                    <span style={{ fontSize: '10px', fontWeight: 800, color: '#475569' }}>Investments</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Column 3: Revenue vs Expenses with Float Tooltip Annotations */}
                <div>
                    <div className="premium-card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <div>
                                <h3 className="card-title">Revenue vs Expenses</h3>
                            </div>
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b', textTransform: 'lowercase', letterSpacing: '0.2px' }}>diagnostics_&_strategy</span>
                        </div>
                        {/* Relative Wrapper for Floating Badges */}
                        <div style={{ position: 'relative', width: '100%', height: '340px' }}>
                            <ResponsiveContainer width="100%" height={320}>
                                <AreaChart data={[
                                    { date: 'Jun 17', Revenue: 27300 },
                                    { date: 'Jun 18', Revenue: 18000 },
                                    { date: 'Jun 19', Revenue: 12000 },
                                    { date: 'Jun 23', Revenue: 25000 },
                                    { date: 'Jun 25', Revenue: 29000 },
                                    { date: 'Sep 27', Revenue: 23000 }
                                ]} margin={{ top: 20, right: 30, left: -20, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id="row2Rev" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="#003399" stopOpacity={0.12} />
                                            <stop offset="95%" stopColor="#003399" stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                    <XAxis dataKey="date" interval={0} tick={{ fontSize: 11, fill: '#64748b' }} dx={-5} tickLine={false} axisLine={false} />
                                    <YAxis stroke="#94a3b8" fontSize={9} fontWeight={700} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v >= 1000 ? (v/1000)+'k' : v}`} />
                                    <Area type="monotone" dataKey="Revenue" stroke="#003399" strokeWidth={2.5} fillOpacity={1} fill="url(#row2Rev)" />
                                </AreaChart>
                            </ResponsiveContainer>

                            {/* Floating popup Dot 1 (Jun 17, 2021) */}
                            <div style={{
                                position: 'absolute',
                                top: '22%',
                                left: '3%',
                                background: '#ffffff',
                                border: '1.5px solid #003399',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                zIndex: 10,
                                pointerEvents: 'none'
                            }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#003399' }}></div>
                                <span style={{ fontSize: '9px', fontWeight: 800, color: '#64748b' }}>Jun 17, 2021</span>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#000000' }}>$27,300.00</span>
                            </div>
                            {/* Dotted vertical guideline and point dot for Marker 1 */}
                            <div style={{ position: 'absolute', top: '35%', left: '16.5%', width: '1px', height: '180px', borderLeft: '1.5px dashed #cbd5e1', zIndex: 5 }}></div>
                            <div style={{ position: 'absolute', top: '32%', left: '15.5%', width: '6px', height: '6px', borderRadius: '50%', background: '#003399', border: '1px solid #ffffff', zIndex: 6 }}></div>

                            {/* Floating popup Dot 2 (Data Annotations) */}
                            <div style={{
                                position: 'absolute',
                                top: '10%',
                                left: '46%',
                                background: '#ffffff',
                                border: '1.5px solid #003399',
                                borderRadius: '6px',
                                padding: '4px 8px',
                                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                zIndex: 10,
                                pointerEvents: 'none'
                            }}>
                                <span style={{ fontSize: '8px', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.3px' }}>Data Annotations</span>
                                <span style={{ fontSize: '10px', fontWeight: 900, color: '#000000', marginTop: '1px' }}>$2,300.00</span>
                            </div>
                            {/* Dotted vertical guideline and point dot for Marker 2 */}
                            <div style={{ position: 'absolute', top: '22%', left: '65.5%', width: '1px', height: '180px', borderLeft: '1.5px dashed #cbd5e1', zIndex: 5 }}></div>
                            <div style={{ position: 'absolute', top: '19%', left: '64.5%', width: '6px', height: '6px', borderRadius: '50%', background: '#003399', border: '1px solid #ffffff', zIndex: 6 }}></div>
                        </div>
                    </div>
                </div>

                {/* Column 4: Progress bars ("Revenue, Expenses, Diagnostics & Strategy...") */}
                <div>
                    <div className="premium-card" style={{ background: '#eff6ff !important', backgroundColor: '#eff6ff', border: '1px solid #bfdbfe !important' }}>
                        <div style={{ marginBottom: '20px' }}>
                            <h3 className="card-title" style={{ fontSize: '12px', color: '#1e3a8a' }}>Revenue, Expenses, Diagnostics & Strategy...</h3>
                            <p className="card-subtitle" style={{ color: '#3b82f6' }}>diagnostics_&_strategy</p>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, justifyContent: 'center' }}>
                            <ProgressItem label="Data Revenue" percentage={100} color="#003399" />
                            <ProgressItem label="Parts" percentage={70} color="#10b981" />
                            <ProgressItem label="Investments" percentage={30} color="#fb7185" />
                            <ProgressItem label="Project Progress" percentage={57} color="#6366f1" />
                        </div>
                    </div>
                </div>
            </div>

            {/* ── ROW 3 GRID ── */}
            <Row gutter={[24, 24]}>
                <Col span={24}>
                    <div className="premium-card">
                        <div style={{ marginBottom: '20px' }}>
                            <h3 className="card-title">Recent Operations</h3>
                        </div>
                        <div style={{ width: '100%', overflowX: 'auto' }}>
                            <Table
                                columns={[
                                    { title: 'Name', dataIndex: 'name', key: 'name', render: text => <span style={{ fontWeight: 800, color: '#475569' }}>{text}</span> },
                                    { 
                                        title: 'Type', 
                                        dataIndex: 'type', 
                                        key: 'type', 
                                        render: type => (
                                            <span style={{ 
                                                fontWeight: 900, 
                                                color: '#b45309', 
                                                background: '#fffbeb', 
                                                border: '1px solid #fde68a',
                                                padding: '4px 8px', 
                                                borderRadius: '6px', 
                                                fontSize: '10px', 
                                                textTransform: 'uppercase' 
                                            }}>
                                                {type}
                                            </span>
                                        ) 
                                    },
                                    { 
                                        title: 'Amount', 
                                        dataIndex: 'amount', 
                                        key: 'amount', 
                                        render: amt => (
                                            <span style={{ fontWeight: 800, color: '#000000' }}>
                                                {amt}
                                            </span>
                                        ) 
                                    },
                                    { title: 'Payment', dataIndex: 'payment', key: 'payment', render: text => <span style={{ fontWeight: 800, color: '#000000' }}>{text}</span> },
                                    { title: 'Created', dataIndex: 'created', key: 'created', render: text => <span style={{ fontWeight: 600, color: '#64748b' }}>{text}</span> },
                                    { title: 'Actions', dataIndex: 'actions', key: 'actions', render: text => <span style={{ fontWeight: 600, color: '#94a3b8' }}>{text}</span> }
                                ]}
                                dataSource={recentOperations}
                                pagination={{ pageSize: 8 }}
                                className="clean-table-compact"
                                size="small"
                                rowKey={(r, idx) => r.timestamp || idx}
                            />
                        </div>
                    </div>
                </Col>
            </Row>

            {/* ── Add Expense Modal ── */}
            <Modal
                title={<span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#003399' }}>Record New Operating Expense</span>}
                open={addExpenseVisible}
                onCancel={() => setAddExpenseVisible(false)}
                className="luxury-modal"
                footer={null}
                destroyOnClose
            >
                <form onSubmit={handleAddExpenseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '16px' }}>
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: '6px', color: '#0f172a' }}>Expense Description</Text>
                        <input
                            type="text"
                            required
                            placeholder="e.g., Office Rent, Utility Bills, Tool Maintenance"
                            value={expenseForm.description}
                            onChange={e => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, color: '#000000' }}
                        />
                    </div>
                    <div>
                        <Text strong style={{ display: 'block', marginBottom: '6px', color: '#0f172a' }}>Category</Text>
                        <select
                            value={expenseForm.category}
                            onChange={e => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                            style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 600, color: '#000000' }}
                        >
                            <option value="Rent">Rent</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Staff Salary">Staff Salary</option>
                            <option value="Tools & Equipments">Tools & Equipments</option>
                            <option value="Refreshments">Refreshments</option>
                            <option value="Others">Others</option>
                        </select>
                    </div>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Text strong style={{ display: 'block', marginBottom: '6px', color: '#0f172a' }}>Amount (৳)</Text>
                            <input
                                type="number"
                                required
                                min="0"
                                placeholder="0"
                                value={expenseForm.amount}
                                onChange={e => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc', fontWeight: 700, color: '#000000' }}
                            />
                        </Col>
                        <Col span={12}>
                            <Text strong style={{ display: 'block', marginBottom: '6px', color: '#0f172a' }}>Date</Text>
                            <DatePicker
                                style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f8fafc' }}
                                value={expenseForm.date}
                                onChange={val => val && setExpenseForm(prev => ({ ...prev, date: val }))}
                                format="YYYY-MM-DD"
                                allowClear={false}
                            />
                        </Col>
                    </Row>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                        <Button onClick={() => setAddExpenseVisible(false)} style={{ borderRadius: '8px', fontWeight: 700 }}>Cancel</Button>
                        <Button type="primary" htmlType="submit" style={{ background: '#003399', border: 'none', borderRadius: '8px', fontWeight: 700 }}>Save Expense</Button>
                    </div>
                </form>
            </Modal>

            {/* ── Day Drill-Down Modal ── */}
            <Modal
                title={<span style={{ fontWeight: 600, letterSpacing: '0.2px' }}>Daily transaction drill-down</span>}
                open={dayModalVisible}
                onCancel={() => setDayModalVisible(false)}
                className="luxury-modal"
                footer={<Button onClick={() => setDayModalVisible(false)} style={{ borderRadius: '8px', fontWeight: 600 }}>Close</Button>}
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
                title={<span style={{ fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Monthly Profit & Loss Statement</span>}
                open={plModalVisible}
                onCancel={() => setPlModalVisible(false)}
                className="luxury-modal"
                width={1000}
                footer={[
                    <Button key="close" onClick={() => setPlModalVisible(false)} style={{ borderRadius: '8px', fontWeight: 600 }}>Close</Button>,
                    <Button key="print" onClick={handlePrintPL} style={{ background: '#003399', border: 'none', color: '#FFF', fontWeight: 700, borderRadius: '8px' }}>
                        Print / Save as PDF
                    </Button>
                ]}
            >
                <div className="no-print" style={{ marginBottom: 16 }}>
                    <Space>
                        <Text strong>Select Month:</Text>
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
