import dayjs from 'dayjs';

const MAX_DUTY_DAYS = 30;

const toNumber = (value, fallback = 0) => {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
};

const clampDutyDays = (value) => {
    const n = Math.round(toNumber(value, MAX_DUTY_DAYS));
    return Math.max(0, Math.min(MAX_DUTY_DAYS, n));
};

const calculateDutyPay = (monthlyGross, dutyDays) => {
    return Math.round((toNumber(monthlyGross) / MAX_DUTY_DAYS) * clampDutyDays(dutyDays));
};

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

export const isTechnicianDesignation = (designation = '', role = '') => {
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

export const calculatePayrollData = ({
    staffNames,
    salaries,
    jobCards,
    savedBills,
    userManagement,
    independentStaffs,
    expenses,
    monthKey,
    selectedMonth
}) => {
    // 1. Prepare Performance Map
    const monthlyTaskPerformance = new Map();
    const monthlyCommissions = new Map();

    (jobCards || []).forEach((job) => {
        // --- Commission logic ---
        if (dayjs(job.date).format('YYYY-MM') === monthKey && Number(job.commissionPercent || 0) > 0) {
            const mechanic = job.assigned_staff_name || job.assigned_staff_id;
            if (mechanic) {
                const linkedBill = (savedBills || []).find((bill) => String(bill.jobId || '') === String(job.id || ''));
                const revenue = Number(linkedBill?.netPayable || linkedBill?.amount || 0);
                const commissionAmount = Math.round(revenue * (Number(job.commissionPercent || 0) / 100));
                
                const key = normalizeNameKey(mechanic);
                monthlyCommissions.set(key, (monthlyCommissions.get(key) || 0) + commissionAmount);
            }
        }

        const tasksObj = job?.departmentsTasks || {};
        Object.keys(tasksObj).forEach((dept) => {
            const tasks = (tasksObj[dept] && tasksObj[dept].tasks) || [];
            tasks.forEach((task) => {
                const assignedName = String(task?.assigned_staff_name || task?.assignedStaffName || '').trim();
                if (!assignedName) return;

                const completionTs = getTaskCompletionTimestamp(task, job);
                if (!completionTs || !dayjs(completionTs).isValid() || dayjs(completionTs).format('YYYY-MM') !== monthKey) {
                    return;
                }

                const key = normalizeNameKey(assignedName);
                if (!monthlyTaskPerformance.has(key)) {
                    monthlyTaskPerformance.set(key, { completedTasks: 0, completionDates: new Set() });
                }
                const row = monthlyTaskPerformance.get(key);
                row.completedTasks += 1;
                row.completionDates.add(dayjs(completionTs).format('YYYY-MM-DD'));
            });
        });
    });

    // 2. Prepare Profile Map
    const profileMap = new Map();
    const latestSalaryByStaff = new Map();
    [...(salaries || [])].sort((a, b) => new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0)).forEach(row => {
        if (row?.staffName && !latestSalaryByStaff.has(row.staffName)) latestSalaryByStaff.set(row.staffName, row);
    });

    (userManagement || []).filter(u => u.role !== 'Customer').forEach(u => {
        const sub = u.subStaffPosts || {};
        const designationFromSub = sub.mamun || sub.rentacar || sub.muntaha || null;
        profileMap.set(u.name, {
            userId: u.id,
            staffName: u.name,
            role: u.role || 'Staff',
            designation: u.designation || designationFromSub || 'Staff',
            currentSalary: toNumber(u.currentSalary ?? u.salary, 0),
            promotionHistory: Array.isArray(u.promotionHistory) ? u.promotionHistory : []
        });
    });

    (independentStaffs || []).forEach(staff => {
        if (!staff?.name) return;
        profileMap.set(staff.name, {
            userId: null,
            staffName: staff.name,
            role: staff.role || 'Staff',
            designation: staff.designation || 'Staff',
            currentSalary: toNumber(staff.currentSalary, 0),
            promotionHistory: Array.isArray(staff.promotionHistory) ? staff.promotionHistory : []
        });
    });

    // 3. Helper for Previous Outstanding
    const getPreviousOutstanding = (name) => {
        const byMonth = new Map();
        (salaries || []).filter(r => r.staffName === name).forEach(r => {
            if (!byMonth.has(r.monthKey)) byMonth.set(r.monthKey, r);
        });
        return Array.from(byMonth.values())
            .filter(r => String(r.monthKey) < String(monthKey) && r.status !== 'PAID')
            .reduce((sum, r) => {
                const dp = calculateDutyPay(r.amount, r.dutyDays ?? MAX_DUTY_DAYS);
                const net = dp + toNumber(r.bonus) - toNumber(r.deduction);
                return sum + toNumber(r.netPayable, net);
            }, 0);
    };

    const monthExpenses = (expenses || []).filter(
        (e) => e.isStaffPayment && dayjs(e.date).format('YYYY-MM') === monthKey
    );

    // 4. Consolidate
    return staffNames.map(name => {
        const existingRecord = (salaries || []).find(s => s.staffName === name && s.monthKey === monthKey);
        const profile = profileMap.get(name) || {};
        const designation = existingRecord?.designation || profile.designation || 'Staff';
        const role = profile.role || existingRecord?.role || 'Staff';
        const isTech = isTechnicianDesignation(designation, role);

        const perfKey = normalizeNameKey(name);
        const performance = monthlyTaskPerformance.get(perfKey) || { completedTasks: 0, completionDates: new Set() };

        const staffExps = monthExpenses.filter(e => e.staffName === name);
        const advance = staffExps
            .filter(e => e.category === 'Salary Advance' || e.category === 'Partial Salary')
            .reduce((acc, e) => acc + toNumber(e.amount, 0), 0);

        const amount = toNumber(existingRecord?.amount, toNumber(profile.currentSalary, 0));
        const autoDutyDays = isTech ? clampDutyDays(performance.completionDates.size) : MAX_DUTY_DAYS;
        const dutyDays = clampDutyDays(existingRecord?.dutyDays ?? autoDutyDays);
        const dutyPayable = calculateDutyPay(amount, dutyDays);

        const bonus = toNumber(existingRecord?.bonus, 0);
        const deduction = toNumber(existingRecord?.deduction, 0);
        const previousBalance = getPreviousOutstanding(name);
        const commissionAmount = monthlyCommissions.get(perfKey) || 0;
        const netPayable = dutyPayable + bonus + commissionAmount - deduction + previousBalance - advance;

        return {
            id: existingRecord?.id || `draft-${name}-${monthKey}`,
            staffName: name,
            userId: profile.userId || existingRecord?.userId || null,
            role,
            designation,
            amount, // Base Salary
            dutyDays,
            autoDutyDays,
            dutyPayable,
            bonus,
            deduction,
            commissionAmount,
            advance,
            previousBalance,
            netPayable,
            status: existingRecord?.status || 'UNPAID',
            isTechnician: isTech,
            completedTasks: performance.completedTasks,
            expenseTraces: staffExps,
            isDraft: !existingRecord,
            monthKey
        };
    });
};

export const upsertSalaryRecord = (list, record) => {
    const filtered = (list || []).filter(
        (item) => !(item.staffName === record.staffName && item.monthKey === record.monthKey)
    );
    return [record, ...filtered];
};

export const normalizeRecord = (record, patch = {}, monthKey, selectedMonth) => {
    const merged = { ...record, ...patch };
    const amount = toNumber(merged.amount, 0);
    const dutyDays = clampDutyDays(merged.dutyDays ?? MAX_DUTY_DAYS);
    const dutyPayable = calculateDutyPay(amount, dutyDays);
    const bonus = toNumber(merged.bonus, 0);
    const deduction = toNumber(merged.deduction, 0);
    const commissionAmount = toNumber(merged.commissionAmount, 0);
    const advance = toNumber(merged.advance, 0);
    const previousBalance = toNumber(merged.previousBalance, 0);
    const netPayable = dutyPayable + bonus + commissionAmount - deduction + previousBalance - advance;

    const id = merged.id && !String(merged.id).startsWith('draft-')
        ? merged.id
        : `SAL-${Date.now()}-${String(merged.staffName || 'staff').replace(/\s+/g, '-')}`;

    return {
        ...merged,
        id,
        monthKey,
        month: selectedMonth.format('MMMM YYYY'),
        amount,
        dutyDays,
        dutyPayable,
        bonus,
        deduction,
        advance,
        previousBalance,
        netPayable,
        designation: merged.designation || 'Staff',
        role: merged.role || 'Staff',
        status: merged.status || 'UNPAID',
        updatedAt: dayjs().toISOString()
    };
};
