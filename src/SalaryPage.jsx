import React from 'react';
import { bufferedPrint } from './utils/printAssistant';
import { createPortal } from 'react-dom';
import {
    Button,
    Card,
    Col,
    DatePicker,
    Divider,
    Form,
    Input,
    InputNumber,
    List,
    Modal,
    Row,
    Space,
    Statistic,
    Table,
    Tag,
    Tooltip,
    Typography,
    message
} from 'antd';
import { CheckCircleOutlined, ClockCircleOutlined, CloseCircleOutlined, RiseOutlined } from '@ant-design/icons';

import dayjs from 'dayjs';

import { useAuth } from './contexts/AuthContext';
import { useGlobalState } from './contexts/GlobalStateContext';
import { formatCurrency } from './utils/helpers';
import { exportToExcel } from './utils/excelExport';

import {
    calculatePayrollData,
    normalizeRecord,
    isTechnicianDesignation,
    upsertSalaryRecord
} from './utils/salaryUtils';
import BrandedDocumentHeader from './components/BrandedDocumentHeader';
import downloadElementAsPdf from './utils/domPdf';

const { Title, Text } = Typography;

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

const SalaryPage = () => {
    const {
        salaries,
        setSalaries,
        expenses,
        jobCards,
        savedBills,
        userManagement,
        independentStaffs,
        setIndependentStaffs,
        addExpense
    } = useGlobalState();
    const { user: currentUser } = useAuth();
    const isAdmin = currentUser?.role === 'Admin';

    const [selectedMonth, setSelectedMonth] = React.useState(dayjs());
    const [isPrintModalVisible, setIsPrintModalVisible] = React.useState(false);
    const [isPrinting, setIsPrinting] = React.useState(false);
    const [isArrearsModalVisible, setIsArrearsModalVisible] = React.useState(false);
    const [isPromotionModalVisible, setIsPromotionModalVisible] = React.useState(false);
    const [isHistoryModalVisible, setIsHistoryModalVisible] = React.useState(false);
    const [isIndependentStaffModalVisible, setIsIndependentStaffModalVisible] = React.useState(false);
    const [isAdvanceHistoryModalVisible, setIsAdvanceHistoryModalVisible] = React.useState(false);
    const [isBreakdownModalVisible, setIsBreakdownModalVisible] = React.useState(false);
    const [breakdownTarget, setBreakdownTarget] = React.useState(null);
    const [promotionTarget, setPromotionTarget] = React.useState(null);
    const [historyTarget, setHistoryTarget] = React.useState(null);
    const [advanceHistoryTarget, setAdvanceHistoryTarget] = React.useState(null);
    const [profileOverrides, setProfileOverrides] = React.useState({});
    const [editingKey, setEditingKey] = React.useState('');


        React.useEffect(() => {
        if (isPrinting) {
            bufferedPrint(() => setIsPrinting(false));
        }
    }, [isPrinting]);

    const sortedSalaryRecords = React.useMemo(() => {
        return [...(salaries || [])].sort((a, b) => {
            const monthCmp = String(b.monthKey || '').localeCompare(String(a.monthKey || ''));
            if (monthCmp !== 0) return monthCmp;
            return new Date(b.updatedAt || b.date || 0) - new Date(a.updatedAt || a.date || 0);
        });
    }, [salaries]);

    const latestSalaryByStaff = React.useMemo(() => {
        const map = new Map();
        sortedSalaryRecords.forEach((row) => {
            if (!row?.staffName) return;
            if (!map.has(row.staffName)) map.set(row.staffName, row);
        });
        return map;
    }, [sortedSalaryRecords]);

    const profileMap = React.useMemo(() => {
        const map = new Map();

        (userManagement || [])
            .filter((u) => u.role !== 'Customer')
            .forEach((u) => {
                const sub = u.subStaffPosts || {};
                const designationFromSub = sub.mamun || sub.rentacar || sub.muntaha || null;
                map.set(u.name, {
                    userId: u.id,
                    staffName: u.name,
                    role: u.role || 'Staff',
                    designation: u.designation || designationFromSub || 'Staff',
                    currentSalary: toNumber(u.currentSalary ?? u.salary, 0),
                    promotionHistory: Array.isArray(u.promotionHistory) ? u.promotionHistory : []
                });
            });

        (independentStaffs || []).forEach((staff) => {
            if (!staff?.name) return;
            map.set(staff.name, {
                userId: null,
                staffName: staff.name,
                role: staff.role || 'Staff',
                designation: staff.designation || 'Staff',
                currentSalary: toNumber(staff.currentSalary, 0),
                promotionHistory: Array.isArray(staff.promotionHistory) ? staff.promotionHistory : []
            });
        });

        latestSalaryByStaff.forEach((latest, staffName) => {
            const current = map.get(staffName) || {
                userId: null,
                staffName,
                role: latest.role || 'Staff',
                designation: 'Staff',
                currentSalary: 0,
                promotionHistory: []
            };

            map.set(staffName, {
                ...current,
                designation: current.designation || latest.designation || 'Staff',
                currentSalary: current.currentSalary || toNumber(latest.amount, 0)
            });
        });

        Object.entries(profileOverrides).forEach(([staffName, override]) => {
            const current = map.get(staffName) || {
                userId: null,
                staffName,
                role: 'Staff',
                designation: 'Staff',
                currentSalary: 0,
                promotionHistory: []
            };
            map.set(staffName, { ...current, ...override });
        });

        return map;
    }, [userManagement, independentStaffs, latestSalaryByStaff, profileOverrides]);

    const allStaffNames = React.useMemo(() => {
        const names = new Set();
        Array.from(profileMap.keys()).forEach((n) => names.add(n));
        (salaries || []).forEach((s) => {
            if (s?.staffName) names.add(s.staffName);
        });
        return Array.from(names).sort();
    }, [profileMap, salaries]);

    const getLatestUniqueRecordsByStaff = (staffName) => {
        const byMonth = new Map();
        sortedSalaryRecords
            .filter((row) => row.staffName === staffName)
            .forEach((row) => {
                if (!byMonth.has(row.monthKey)) byMonth.set(row.monthKey, row);
            });
        return Array.from(byMonth.values());
    };

    const consolidatedData = React.useMemo(() => {
        return calculatePayrollData({
            staffNames: allStaffNames,
            salaries,
            jobCards,
            savedBills,
            userManagement,
            independentStaffs,
            expenses,
            monthKey,
            selectedMonth
        });
    }, [allStaffNames, salaries, jobCards, savedBills, userManagement, independentStaffs, expenses, monthKey, selectedMonth]);

    const commissionReport = React.useMemo(() => {
        const paidJobs = (jobCards || []).filter((job) => dayjs(job.date).format('YYYY-MM') === monthKey);
        return paidJobs
            .filter((job) => Number(job.commissionPercent || 0) > 0 && (job.assigned_staff_name || job.assigned_staff_id))
            .map((job) => {
                const linkedBill = (savedBills || []).find((bill) => String(bill.jobId || '') === String(job.id || ''));
                const revenue = Number(linkedBill?.netPayable || linkedBill?.amount || 0);
                const commissionAmount = Math.round(revenue * (Number(job.commissionPercent || 0) / 100));
                return {
                    id: job.id,
                    mechanic: job.assigned_staff_name || job.assigned_staff_id,
                    vehicleNo: job.vehicleNo,
                    revenue,
                    commissionPercent: Number(job.commissionPercent || 0),
                    commissionAmount
                };
            })
            .sort((a, b) => b.commissionAmount - a.commissionAmount);
    }, [jobCards, monthKey, savedBills]);

    const commissionSummary = React.useMemo(() => {
        const summaryMap = new Map();
        commissionReport.forEach((row) => {
            if (!summaryMap.has(row.mechanic)) {
                summaryMap.set(row.mechanic, { mechanic: row.mechanic, jobs: 0, revenue: 0, commission: 0 });
            }
            const current = summaryMap.get(row.mechanic);
            current.jobs += 1;
            current.revenue += row.revenue;
            current.commission += row.commissionAmount;
        });
        return Array.from(summaryMap.values()).sort((a, b) => b.commission - a.commission);
    }, [commissionReport]);

    const handleSaveRecord = async (record) => {
        try {
            const row = await editForm.validateFields();
            const normalized = normalizeRecord(record, {
                amount: toNumber(row.amount, 0),
                dutyDays: clampDutyDays(row.dutyDays ?? MAX_DUTY_DAYS),
                bonus: toNumber(row.bonus, 0),
                deduction: toNumber(row.deduction, 0)
            }, monthKey, selectedMonth);
            const updatedList = upsertSalaryRecord(salaries, normalized);
            setSalaries(updatedList);
            setEditingKey('');
            message.success(`Payroll data saved for ${record.staffName}.`);
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleApproveAndPay = (record) => {
        if (!isAdmin) {
            message.error('Admin only action.');
            return;
        }

        Modal.confirm({
            title: `Pay salary for ${record.staffName}?`,
            content: `Payable amount: Tk ${formatCurrency(record.netPayable)}. Status will be marked as PAID immediately.`,
            onOk: async () => {
                const paymentTime = dayjs().toISOString();

                const paidRecord = normalizeRecord(record, {
                    status: 'PAID',
                    paymentDate: paymentTime,
                    paidBy: currentUser?.name || 'System'
                }, monthKey, selectedMonth);

                let updated = upsertSalaryRecord(salaries, paidRecord);

                updated = updated.map((s) => {
                    if (s.staffName === record.staffName && String(s.monthKey) < String(monthKey) && s.status !== 'PAID') {
                        return {
                            ...s,
                            status: 'PAID',
                            paymentDate: paymentTime,
                            paidBy: currentUser?.name || 'System',
                            notes: `${s.notes || ''} Paid with ${monthKey}`.trim()
                        };
                    }
                    return s;
                });

                setSalaries(updated);

                addExpense({
                    id: `EXP-SAL-${Date.now()}`,
                    title: `Salary Payment: ${record.staffName} (${selectedMonth.format('MMM YYYY')})`,
                    amount: paidRecord.netPayable,
                    category: 'Staff Salary',
                    date: paymentTime,
                    staffName: record.staffName,
                    isStaffPayment: true,
                    ledger: 'Mamun Automobiles'
                });

                message.success(`Payment complete. ${record.staffName} is now marked as PAID.`);
            }
        });
    };

    const isEditing = (record) => record.id === editingKey;

    const edit = (record) => {
        editForm.setFieldsValue({
            amount: toNumber(record.amount, 0),
            dutyDays: clampDutyDays(record.dutyDays ?? MAX_DUTY_DAYS),
            bonus: toNumber(record.bonus, 0),
            deduction: toNumber(record.deduction, 0)
        });
        setEditingKey(record.id);
    };

    const cancel = () => {
        setEditingKey('');
    };

    const save = async (record) => {
        try {
            const row = await editForm.validateFields();
            const normalized = normalizeRecord(record, {
                amount: toNumber(row.amount, 0),
                dutyDays: clampDutyDays(row.dutyDays ?? MAX_DUTY_DAYS),
                bonus: toNumber(row.bonus, 0),
                deduction: toNumber(row.deduction, 0)
            }, monthKey, selectedMonth);
            const updatedList = upsertSalaryRecord(salaries, normalized);
            setSalaries(updatedList);
            setEditingKey('');
            message.success(`Payroll data saved for ${record.staffName}.`);
        } catch (err) {
            console.error('Save failed:', err);
        }
    };

    const handleApproveAndPay_Deprecated = () => { }; // Replaced by the implementation above

    const openPromotionModal = (record) => {
        if (!isAdmin) {
            message.error('Admin only action.');
            return;
        }

        setPromotionTarget(record);
        promotionForm.setFieldsValue({
            designation: record.designation || 'Staff',
            newGross: toNumber(record.amount, 0),
            note: ''
        });
        setIsPromotionModalVisible(true);
    };

    const submitPromotion = async () => {
        if (!promotionTarget) return;

        try {
            const values = await promotionForm.validateFields();
            const oldDesignation = promotionTarget.designation || 'Staff';
            const newDesignation = (values.designation || oldDesignation).trim();
            const oldSalary = toNumber(promotionTarget.amount, 0);
            const newSalary = toNumber(values.newGross, oldSalary);
            const byUser = currentUser?.name || 'System';

            if (newDesignation === oldDesignation && newSalary === oldSalary) {
                message.warning('No designation or salary change detected.');
                return;
            }

            const messages = [];

            if (newDesignation !== oldDesignation) {
                messages.push(`Promoted from ${oldDesignation} to ${newDesignation}`);
            }

            const salaryDelta = newSalary - oldSalary;
            if (salaryDelta > 0) {
                messages.push(`Salary increased by ${salaryDelta}`);
            } else if (salaryDelta < 0) {
                messages.push(`Salary adjusted by ${salaryDelta}`);
            }

            if (values.note && values.note.trim()) {
                messages.push(values.note.trim());
            }

            const historyEntry = {
                id: `PROMO-${Date.now()}`,
                timestamp: dayjs().toISOString(),
                changedBy: byUser,
                oldDesignation,
                newDesignation,
                oldSalary,
                newSalary,
                salaryDelta,
                summary: messages.join(' | ')
            };

            const nextHistory = [...(promotionTarget.promotionHistory || []), historyEntry];

            // If promotionTarget.userId is present, it means it's a user from userManagement
            // If not, it's an independent staff.
            // Firebase updateDoc logic removed as per instruction.
            // Now only update independent staff locally.
            const updatedIndependent = (independentStaffs || []).map((staff) => {
                if (staff.name !== promotionTarget.staffName) return staff;
                return {
                    ...staff,
                    designation: newDesignation,
                    currentSalary: newSalary,
                    promotionHistory: nextHistory,
                    updatedAt: dayjs().toISOString(),
                    updatedBy: byUser
                };
            });
            setIndependentStaffs(updatedIndependent);
            // Notify Staff locally (Firebase removed)
            console.log(`[Notification] Salary record added for ${promotionTarget.staffName}`);

            setProfileOverrides((prev) => ({
                ...prev,
                [promotionTarget.staffName]: {
                    designation: newDesignation,
                    currentSalary: newSalary,
                    promotionHistory: nextHistory
                }
            }));

            const normalized = normalizeRecord(promotionTarget, {
                designation: newDesignation,
                amount: newSalary,
                promotionHistory: nextHistory
            }, monthKey, selectedMonth);

            setSalaries(upsertSalaryRecord(salaries, normalized));

            setIsPromotionModalVisible(false);
            setPromotionTarget(null);
            promotionForm.resetFields();
            message.success(messages.join(' | '));
        } catch (err) {
            console.error('Promotion update failed:', err);
            message.error('Could not save promotion/increment update.');
        }
    };

    const createIndependentStaff = async () => {
        try {
            const values = await independentStaffForm.validateFields();
            const staffName = values.name.trim();
            const duplicateExists = allStaffNames.some((name) => name.toLowerCase() === staffName.toLowerCase());
            if (duplicateExists) {
                message.warning(`Staff "${staffName}" already exists.`);
                return;
            }

            const baseSalary = toNumber(values.currentSalary, 0);
            const history = [];
            if (values.note && values.note.trim()) {
                history.push({
                    id: `PROMO-${Date.now()}`,
                    timestamp: dayjs().toISOString(),
                    changedBy: currentUser?.name || 'System',
                    oldDesignation: '-',
                    newDesignation: values.designation.trim(),
                    oldSalary: 0,
                    newSalary: baseSalary,
                    salaryDelta: baseSalary,
                    summary: values.note.trim()
                });
            }

            const entry = {
                id: `IND-${Date.now()}`,
                name: staffName,
                role: 'Staff',
                designation: values.designation.trim(),
                currentSalary: baseSalary,
                promotionHistory: history,
                createdAt: dayjs().toISOString(),
                createdBy: currentUser?.name || 'System'
            };

            setIndependentStaffs([entry, ...(independentStaffs || [])]);
            setIsIndependentStaffModalVisible(false);
            independentStaffForm.resetFields();
            message.success(`Independent staff "${staffName}" created.`);
        } catch (err) {
            console.error('Create independent staff failed:', err);
        }
    };

    const openAdvanceHistory = (record) => {
        setAdvanceHistoryTarget(record);
        setIsAdvanceHistoryModalVisible(true);
    };

    const openHistoryModal = (record) => {
        setHistoryTarget(record);
        setIsHistoryModalVisible(true);
    };

    const handlePrint = () => {
        setIsPrinting(true);
    };

    const handleSalaryPdfDownload = async () => {
        try {
            await downloadElementAsPdf('salary-print-container', `Salary_Sheet_${selectedMonth.format('MMM_YYYY')}.pdf`);
            message.success('Salary sheet PDF downloaded.');
        } catch (err) {
            console.error('Salary PDF export failed:', err);
            message.error('Could not export salary sheet PDF.');
        }
    };

    const handleExportExcel = () => {
        const exportData = consolidatedData.map(r => ({
            'Staff Name': r.staffName,
            'Designation': r.designation,
            'Month': selectedMonth.format('MMMM YYYY'),
            'Monthly Gross (Tk)': toNumber(r.amount, 0),
            'Duty Days': r.dutyDays,
            'Duty Pay (Tk)': toNumber(r.dutyPayable, 0),
            'Bonus (Tk)': toNumber(r.bonus, 0),
            'Deduction (Tk)': toNumber(r.deduction, 0),
            'Previous Balance (Tk)': toNumber(r.previousBalance, 0),
            'Advance Taken (Tk)': toNumber(r.advance, 0),
            'Net Payable (Tk)': toNumber(r.netPayable, 0),
            'Status': r.status
        }));
        exportToExcel(exportData, `Salary_Sheet_${selectedMonth.format('MMM_YYYY')}`, 'Salary Sheet');
    };

    const columns = [
        {
            title: 'Staff',
            dataIndex: 'staffName',
            fixed: 'left',
            width: 190,
            render: (name, row) => (
                <Space direction="vertical" size={0}>
                    <Text strong>{name}</Text>
                    <Space size={6}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{row.designation || 'Staff'}</Text>
                        {row.isTechnician ? (
                            <Tag color="blue" style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>Technician</Tag>
                        ) : (
                            <Tag color="default" style={{ marginInlineEnd: 0, fontSize: 10, lineHeight: '16px' }}>Non-Tech</Tag>
                        )}
                    </Space>
                </Space>
            )
        },
        {
            title: 'Net Payable (Tk)',
            dataIndex: 'netPayable',
            width: 200,
            render: (v) => <Text strong style={{ color: '#0ea5e9', fontSize: 16, fontWeight: 600 }}>Tk {formatCurrency(v)}</Text>
        },
        {
            title: 'Status',
            dataIndex: 'status',
            width: 110,
            render: (status) => {
                const color = status === 'PAID' ? 'success' : status === 'PARTIAL' ? 'warning' : 'error';
                const icon = status === 'PAID'
                    ? <CheckCircleOutlined />
                    : status === 'PARTIAL'
                        ? <ClockCircleOutlined />
                        : <CloseCircleOutlined />;
                const label = status === 'PAID' ? 'Paid' : status === 'PARTIAL' ? 'Partial' : 'Unpaid';
                return <Tag icon={icon} color={color} style={{ fontWeight: 600 }}>{label}</Tag>;
            }
        },
        {
            title: 'Action',
            dataIndex: 'operation',
            fixed: 'right',
            width: 320,
            render: (_, record) => {
                const editable = isEditing(record);

                if (editable) {
                    return (
                        <Space>
                            <Button type="primary" size="small" onClick={() => save(record)}>
                                Save
                            </Button>
                            <Button size="small" onClick={cancel}>Cancel</Button>
                        </Space>
                    );
                }

                return (
                    <Space wrap>
                        <Button size="small" onClick={() => { setBreakdownTarget(record); setIsBreakdownModalVisible(true); }}>
                            View Details
                        </Button>
                        <Button size="small" onClick={() => edit(record)} disabled={editingKey !== ''}>
                            Edit
                        </Button>
                        <Button size="small" onClick={() => openPromotionModal(record)} disabled={!isAdmin}>
                            Promotion
                        </Button>
                        {record.status !== 'PAID' && (
                            <Button type="primary" ghost size="small" onClick={() => handleApproveAndPay(record)}>
                                Pay
                            </Button>
                        )}
                    </Space>
                );
            }
        }
    ];

    const mergedColumns = columns.map((col) => {
        if (!col.editable) return col;
        return {
            ...col,
            onCell: (record) => ({
                record,
                dataIndex: col.dataIndex,
                title: col.title,
                editing: isEditing(record)
            })
        };
    });

    const EditableCell = ({ editing, dataIndex, title, children, ...restProps }) => {
        const isDuty = dataIndex === 'dutyDays';
        return (
            <td {...restProps}>
                {editing ? (
                    <Form.Item
                        name={dataIndex}
                        style={{ margin: 0 }}
                        rules={[{ required: true, message: `Enter ${title}` }]}
                    >
                        <InputNumber
                            min={0}
                            max={isDuty ? MAX_DUTY_DAYS : undefined}
                            style={{ width: '100%' }}
                        />
                    </Form.Item>
                ) : children}
            </td>
        );
    };

    const stats = React.useMemo(() => {
        const totalNet = consolidatedData.reduce((sum, row) => sum + toNumber(row.netPayable, 0), 0);
        const paidCount = consolidatedData.filter((row) => row.status === 'PAID').length;
        const autoCalculatedCount = consolidatedData.filter((row) => row.isTechnician && !row.hasManualDutyOverride).length;
        return { totalNet, paidCount, autoCalculatedCount };
    }, [consolidatedData]);

    const arrearsReport = React.useMemo(() => {
        const months = [0, 1, 2].map((idx) => selectedMonth.subtract(idx, 'month').format('YYYY-MM'));

        return allStaffNames.map((staffName) => {
            const profile = profileMap.get(staffName) || {};
            const records = getLatestUniqueRecordsByStaff(staffName).filter((r) => months.includes(r.monthKey));

            const automatedPayable3M = records.reduce((sum, r) => {
                const dutyPay = calculateDutyPay(r.amount, r.dutyDays ?? MAX_DUTY_DAYS);
                return sum + dutyPay + toNumber(r.bonus, 0) - toNumber(r.deduction, 0);
            }, 0);

            const unpaid3M = records
                .filter((r) => r.status !== 'PAID')
                .reduce((sum, r) => {
                    const dutyPay = calculateDutyPay(r.amount, r.dutyDays ?? MAX_DUTY_DAYS);
                    return sum + toNumber(r.netPayable, dutyPay + toNumber(r.bonus, 0) - toNumber(r.deduction, 0));
                }, 0);

            const totalDutyDays = records.reduce((sum, r) => sum + clampDutyDays(r.dutyDays ?? MAX_DUTY_DAYS), 0);

            const advances = (expenses || [])
                .filter(
                    (e) =>
                        e.staffName === staffName &&
                        months.includes(dayjs(e.date).format('YYYY-MM')) &&
                        (e.category === 'Salary Advance' || e.category === 'Partial Salary')
                )
                .reduce((sum, e) => sum + toNumber(e.amount, 0), 0);

            const paidRecords = getLatestUniqueRecordsByStaff(staffName)
                .filter((r) => r.status === 'PAID' && r.paymentDate)
                .sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate));

            const lastPaid = paidRecords.length
                ? dayjs(paidRecords[0].paymentDate).format('DD MMM YYYY')
                : '-';

            return {
                key: staffName,
                staffName,
                designation: profile.designation || 'Staff',
                automatedPayable3M,
                unpaid3M,
                advances,
                netDue: unpaid3M - advances,
                dutyDays: totalDutyDays,
                lastPaid
            };
        }).sort((a, b) => b.netDue - a.netDue);
    }, [selectedMonth, allStaffNames, profileMap, expenses, sortedSalaryRecords]);

    const activeHistory = historyTarget?.promotionHistory || [];
    const advanceHistoryRows = advanceHistoryTarget?.advanceEntries || [];

    return (
        <div style={{ paddingBottom: 100 }}>
            <div className="no-print">
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 24,
                        flexWrap: 'wrap',
                        gap: 16
                    }}
                >
                    <div>
                        <Title level={2} style={{ margin: 0, fontWeight: 600 }}>Staff management & automated payroll</Title>
                        <Text type="secondary" style={{ fontSize: 13 }}>Task-driven duty-day automation with designation-aware payroll, promotion tracking, and arrears control.</Text>
                    </div>
                    <Space>
                        <DatePicker
                            picker="month"
                            value={selectedMonth}
                            onChange={(v) => v && setSelectedMonth(v)}
                            allowClear={false}
                            format="MMMM YYYY"
                            style={{ width: 220, height: 42 }}
                        />
                        <Button onClick={() => setIsIndependentStaffModalVisible(true)} disabled={!isAdmin} style={{ fontWeight: 600 }}>
                            Create Independent Staff
                        </Button>
                        <Button onClick={() => setIsArrearsModalVisible(true)} style={{ fontWeight: 600 }}>3-Month Arrears Report</Button>
                        <Button onClick={handleExportExcel} style={{ color: '#166534', fontWeight: 600 }}>
                            Excel Export
                        </Button>
                        <Button type="primary" onClick={() => setIsPrintModalVisible(true)} style={{ fontWeight: 600 }}>
                            Print Report
                        </Button>
                    </Space>
                </div>

                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                    <Col xs={24} sm={12} lg={8}>
                        <Card size="small" className="glass-card" style={{ borderLeft: '4px solid #0ea5e9' }}>
                            <Statistic title={<span style={{ fontWeight: 600 }}>Net Monthly Payroll</span>} value={stats.totalNet} prefix="Tk" valueStyle={{ color: '#0ea5e9', fontWeight: 600 }} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card size="small" className="glass-card" style={{ borderLeft: '4px solid #0369a1' }}>
                            <Statistic title={<span style={{ fontWeight: 600 }}>Total Staff</span>} value={consolidatedData.length} valueStyle={{ color: '#0369a1', fontWeight: 600 }} />
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} lg={8}>
                        <Card size="small" className="glass-card" style={{ borderLeft: '4px solid #10b981' }}>
                            <Statistic
                                title={<span style={{ fontWeight: 600 }}>Paid Count</span>}
                                value={`${stats.paidCount}`}
                                suffix={`of ${consolidatedData.length}`}
                                valueStyle={{ color: '#10b981', fontWeight: 600 }}
                            />
                        </Card>
                    </Col>
                </Row>

                <Card title={<span><RiseOutlined style={{ marginRight: 8 }} />Mechanic Commission Report - {selectedMonth.format('MMMM YYYY')}</span>} className="glass-card" style={{ marginBottom: 24 }}>
                    {commissionSummary.length === 0 ? (
                        <Text type="secondary">No commission-enabled billed jobs found for this month.</Text>
                    ) : (
                        <Table
                            size="small"
                            pagination={false}
                            dataSource={commissionSummary}
                            rowKey="mechanic"
                            columns={[
                                { title: 'Mechanic', dataIndex: 'mechanic' },
                                { title: 'Jobs', dataIndex: 'jobs' },
                                { title: 'Revenue', dataIndex: 'revenue', render: (value) => `Tk ${formatCurrency(value)}` },
                                { title: 'Commission', dataIndex: 'commission', render: (value) => <Text strong style={{ color: '#d97706' }}>Tk {formatCurrency(value)}</Text> }
                            ]}
                            summary={() => (
                                <Table.Summary.Row>
                                    <Table.Summary.Cell index={0} colSpan={3}>
                                        <Text strong>Total Commission Payable</Text>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={1}>
                                        <Text strong style={{ color: '#b45309' }}>
                                            Tk {formatCurrency(commissionSummary.reduce((sum, row) => sum + row.commission, 0))}
                                        </Text>
                                    </Table.Summary.Cell>
                                </Table.Summary.Row>
                            )}
                        />
                    )}
                </Card>

                <Card title={<span>Payroll Sheet - {selectedMonth.format('MMMM YYYY')}</span>} className="glass-card">
                    <Form form={editForm} component={false}>
                        <Table
                            components={{ body: { cell: EditableCell } }}
                            dataSource={consolidatedData}
                            columns={mergedColumns}
                            rowClassName="editable-row"
                            pagination={false}
                            scroll={{ x: 1000 }}
                            rowKey="staffName"
                        />
                    </Form>
                </Card>
            </div>

            {/* Detailed Breakdown Modal */}
            <Modal
                title={`Payroll Breakdown: ${breakdownTarget?.staffName || ''}`}
                open={isBreakdownModalVisible}
                onCancel={() => { setIsBreakdownModalVisible(false); setBreakdownTarget(null); }}
                footer={[<Button key="close" onClick={() => setIsBreakdownModalVisible(false)}>Close</Button>]}
                width={600}
            >
                {breakdownTarget && (
                    <div style={{ padding: '10px 0' }}>
                        <Row gutter={[16, 24]}>
                            <Col span={24}>
                                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0', marginBottom: 20 }}>
                                    <Title level={4} style={{ margin: 0, color: '#1e293b' }}>{breakdownTarget.staffName}</Title>
                                    <Text type="secondary">{breakdownTarget.designation} | {selectedMonth.format('MMMM YYYY')}</Text>
                                </div>
                            </Col>

                            <Col span={12}>
                                <Statistic title="Base Monthly Salary" value={breakdownTarget.amount} prefix="Tk" />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Duty Days / Pay" value={breakdownTarget.dutyDays} suffix={`days (Tk ${formatCurrency(breakdownTarget.dutyPayable)})`} />
                            </Col>

                            <Col span={24}><Divider style={{ margin: '12px 0' }} /></Col>

                            <Col span={12}>
                                <Statistic title="Bonus" value={breakdownTarget.bonus} prefix="+ Tk" valueStyle={{ color: '#10b981' }} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Deduction" value={breakdownTarget.deduction} prefix="- Tk" valueStyle={{ color: '#ef4444' }} />
                            </Col>

                            <Col span={12}>
                                <Statistic title="Advance Taken" value={breakdownTarget.advance} prefix="- Tk" valueStyle={{ color: '#f59e0b' }} />
                            </Col>
                            <Col span={12}>
                                <Statistic title="Previous Balance" value={breakdownTarget.previousBalance} prefix="+ Tk" valueStyle={{ color: '#0ea5e9' }} />
                                <Text type="secondary" style={{ fontSize: 11 }}>Unpaid dues from previous months</Text>
                            </Col>

                            <Col span={24}><Divider style={{ margin: '12px 0' }} /></Col>

                            <Col span={24}>
                                <Card size="small" style={{ background: '#f0f9ff', borderColor: '#bae6fd' }}>
                                    <Statistic
                                        title="Final Net Payable"
                                        value={breakdownTarget.netPayable}
                                        prefix="Tk"
                                        valueStyle={{ color: '#0369a1', fontWeight: 600, fontSize: 24 }}
                                    />
                                    <div style={{ marginTop: 8, fontSize: 12, color: '#64748b' }}>
                                        Calculation: (Duty Pay: {formatCurrency(breakdownTarget.dutyPayable)} + Prev: {formatCurrency(breakdownTarget.previousBalance)} + Bonus: {breakdownTarget.bonus}) - (Ded: {breakdownTarget.deduction} + Adv: {breakdownTarget.advance})
                                    </div>
                                </Card>
                            </Col>
                        </Row>
                    </div>
                )}
            </Modal>

            <Modal
                title={`3-Month Arrears Report - ending ${selectedMonth.format('MMMM YYYY')}`}
                open={isArrearsModalVisible}
                onCancel={() => setIsArrearsModalVisible(false)}
                footer={[<Button key="close" onClick={() => setIsArrearsModalVisible(false)}>Close</Button>]}
                width={980}
            >
                <Table
                    dataSource={arrearsReport}
                    rowKey="key"
                    size="small"
                    pagination={{ pageSize: 20 }}
                    columns={[
                        {
                            title: 'Staff',
                            dataIndex: 'staffName',
                            render: (name, row) => (
                                <div>
                                    <Text strong>{name}</Text>
                                    <div style={{ fontSize: 11 }}><Text type="secondary">{row.designation}</Text></div>
                                </div>
                            )
                        },
                        { title: 'Duty Days (3M)', dataIndex: 'dutyDays' },
                        {
                            title: 'Automated Payable (Tk)',
                            dataIndex: 'automatedPayable3M',
                            render: (v) => `Tk ${formatCurrency(v)}`
                        },
                        {
                            title: 'Unpaid Arrears (Tk)',
                            dataIndex: 'unpaid3M',
                            render: (v) => `Tk ${formatCurrency(v)}`
                        },
                        {
                            title: 'Advances (Tk)',
                            dataIndex: 'advances',
                            render: (v) => `Tk ${formatCurrency(v)}`
                        },
                        {
                            title: 'Net Due (Tk)',
                            dataIndex: 'netDue',
                            render: (v) => (
                                <Text strong style={{ color: v > 0 ? '#f43f5e' : '#10b981' }}>
                                    Tk {formatCurrency(v)}
                                </Text>
                            )
                        },
                        { title: 'Last Paid', dataIndex: 'lastPaid' }
                    ]}
                />
            </Modal>

            <Modal
                title="Create Independent Staff"
                open={isIndependentStaffModalVisible}
                onCancel={() => {
                    setIsIndependentStaffModalVisible(false);
                    independentStaffForm.resetFields();
                }}
                onOk={createIndependentStaff}
                okText="Create Staff"
                okButtonProps={{ disabled: !isAdmin }}
            >
                <Form
                    form={independentStaffForm}
                    layout="vertical"
                    initialValues={{
                        designation: 'Staff',
                        currentSalary: 0,
                        note: ''
                    }}
                >
                    <Form.Item
                        name="name"
                        label="Staff Name"
                        rules={[{ required: true, message: 'Please enter staff name' }]}
                    >
                        <Input placeholder="Example: Akash" />
                    </Form.Item>
                    <Form.Item
                        name="designation"
                        label="Designation"
                        rules={[{ required: true, message: 'Please enter designation' }]}
                    >
                        <Input placeholder="Example: Technician" />
                    </Form.Item>
                    <Form.Item
                        name="currentSalary"
                        label="Base Monthly Salary"
                        rules={[{ required: true, message: 'Please enter salary' }]}
                    >
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="note" label="Initial Remark (Optional)">
                        <Input.TextArea rows={3} placeholder="Example: Joined as independent workshop helper." />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Advance Transaction History - ${advanceHistoryTarget?.staffName || ''} (${selectedMonth.format('MMMM YYYY')})`}
                open={isAdvanceHistoryModalVisible}
                onCancel={() => {
                    setIsAdvanceHistoryModalVisible(false);
                    setAdvanceHistoryTarget(null);
                }}
                footer={[<Button key="close" onClick={() => setIsAdvanceHistoryModalVisible(false)}>Close</Button>]}
                width={860}
            >
                {advanceHistoryRows.length === 0 ? (
                    <Text type="secondary">No individual advance transactions found for this month.</Text>
                ) : (
                    <Table
                        size="small"
                        pagination={false}
                        rowKey={(row) => row.id}
                        dataSource={advanceHistoryRows}
                        summary={() => {
                            const total = advanceHistoryRows.reduce((sum, row) => sum + toNumber(row.amount, 0), 0);
                            return (
                                <Table.Summary>
                                    <Table.Summary.Row>
                                        <Table.Summary.Cell index={0} colSpan={2}>
                                            <Text strong>Total Advances</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={2}>
                                            <Text strong type="danger">Tk {formatCurrency(total)}</Text>
                                        </Table.Summary.Cell>
                                        <Table.Summary.Cell index={3}>
                                            <Text type="secondary">
                                                Base {formatCurrency(toNumber(advanceHistoryTarget?.dutyPayable, 0))} - Total Advances {formatCurrency(total)} = {formatCurrency(toNumber(advanceHistoryTarget?.dutyPayable, 0) - total)}
                                            </Text>
                                        </Table.Summary.Cell>
                                    </Table.Summary.Row>
                                </Table.Summary>
                            );
                        }}
                        columns={[
                            {
                                title: 'Date',
                                dataIndex: 'date',
                                width: 130,
                                render: (v) => dayjs(v).format('DD MMM YYYY')
                            },
                            {
                                title: 'Category',
                                dataIndex: 'category',
                                width: 150,
                                render: (v) => <Tag color="orange">{v}</Tag>
                            },
                            {
                                title: 'Amount',
                                dataIndex: 'amount',
                                width: 120,
                                render: (v) => <Text type="danger">Tk {formatCurrency(v)}</Text>
                            },
                            {
                                title: 'Remarks',
                                render: (_, row) => row.note || row.title || row.description || '-'
                            }
                        ]}
                    />
                )}
            </Modal>

            <Modal
                title="Promotion / Increment"
                open={isPromotionModalVisible}
                onCancel={() => {
                    setIsPromotionModalVisible(false);
                    setPromotionTarget(null);
                    promotionForm.resetFields();
                }}
                onOk={submitPromotion}
                okText="Save Changes"
                okButtonProps={{ disabled: !isAdmin }}
            >
                {promotionTarget && (
                    <div style={{ marginBottom: 12 }}>
                        <Text strong>{promotionTarget.staffName}</Text>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Current designation: {promotionTarget.designation}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Current gross salary: Tk {formatCurrency(promotionTarget.amount)}</div>
                    </div>
                )}
                <Form form={promotionForm} layout="vertical">
                    <Form.Item name="designation" label="New Designation" rules={[{ required: true, message: 'Please enter designation' }]}>
                        <Input placeholder="Example: Senior Technician" />
                    </Form.Item>
                    <Form.Item name="newGross" label="New Monthly Gross Salary" rules={[{ required: true, message: 'Please enter salary' }]}>
                        <InputNumber min={0} style={{ width: '100%' }} />
                    </Form.Item>
                    <Form.Item name="note" label="History Note (Optional)">
                        <Input.TextArea rows={3} placeholder="Example: Promoted after annual performance review." />
                    </Form.Item>
                </Form>
            </Modal>

            <Modal
                title={`Promotion History - ${historyTarget?.staffName || ''}`}
                open={isHistoryModalVisible}
                onCancel={() => {
                    setIsHistoryModalVisible(false);
                    setHistoryTarget(null);
                }}
                footer={[<Button key="close" onClick={() => setIsHistoryModalVisible(false)}>Close</Button>]}
                width={860}
            >
                {activeHistory.length === 0 ? (
                    <Text type="secondary">No promotion/increment history found for this staff.</Text>
                ) : (
                    <List
                        bordered
                        dataSource={[...activeHistory].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))}
                        renderItem={(item) => (
                            <List.Item>
                                <div style={{ width: '100%' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
                                        <Text strong>{item.summary}</Text>
                                        <Text type="secondary">{dayjs(item.timestamp).format('DD MMM YYYY, hh:mm A')}</Text>
                                    </div>
                                    <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>
                                        By {item.changedBy} | {item.oldDesignation}{' -> '}{item.newDesignation} | Salary: Tk {formatCurrency(item.oldSalary)}{' -> '}Tk {formatCurrency(item.newSalary)}
                                    </div>
                                </div>
                            </List.Item>
                        )}
                    />
                )}
            </Modal>

            <Modal
                title="Salary Sheet Print View"
                open={isPrintModalVisible}
                onCancel={() => setIsPrintModalVisible(false)}
                footer={[
                    <div key="actions" style={{ textAlign: 'right', marginTop: 16 }}>
                        <Space>
                            <Button onClick={() => setIsPrintModalVisible(false)}>Close</Button>
                            <Button type="primary" onClick={handlePrint}>Print Now (v3.3 Protocol)</Button>
                        </Space>
                    </div>
                ]}
                width={1100}
            >
                <div style={{ padding: '20px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <Title level={4}>Audit Preview Mode</Title>
                    <Text type="secondary">The document will be isolated and scaled to A4 during final print.</Text>
                </div>
            </Modal>

            {/* Portal Render for v3.3 Isolation */}
            {isPrinting && createPortal(
                <div className="alive-print-area">
                    <BrandedDocumentHeader
                        title="Salary Sheet"
                        subtitle={`Monthly Payroll Statement • ${selectedMonth.format('MMMM YYYY')}`}
                        meta={[
                            { label: 'Month', value: selectedMonth.format('MMMM YYYY') },
                            { label: 'Staff Count', value: consolidatedData.length },
                            { label: 'Total Payable', value: `Tk ${formatCurrency(consolidatedData.reduce((sum, row) => sum + toNumber(row.netPayable, 0), 0))}` }
                        ]}
                    />

                    <div style={{ flexGrow: 1, minHeight: 0, marginTop: 25 }}>
                        <table className="premium-print-table">
                            <thead>
                                <tr>
                                    <th style={printHeaderStyle}>Staff</th>
                                    <th style={printHeaderStyle}>Designation</th>
                                    <th style={{ ...printHeaderStyle, textAlign: 'right' }}>Gross</th>
                                    <th style={{ ...printHeaderStyle, textAlign: 'right' }}>Duty Days</th>
                                    <th style={{ ...printHeaderStyle, textAlign: 'right' }}>Duty Pay</th>
                                    <th style={{ ...printHeaderStyle, textAlign: 'right' }}>Prev Balance</th>
                                    <th style={{ ...printHeaderStyle, textAlign: 'right' }}>Advance</th>
                                    <th style={{ ...printHeaderStyle, textAlign: 'right' }}>Net</th>
                                    <th style={printHeaderStyle}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {consolidatedData.map((r, idx) => {
                                    const compress = consolidatedData.length > 5;
                                    const dynCellStyle = { 
                                        ...printCellStyle, 
                                        padding: compress ? '2.5px 8px' : '9px 8px', 
                                        fontSize: compress ? '11px' : '12px',
                                        lineHeight: compress ? '1.1' : '1.4'
                                    };
                                    return (
                                        <tr key={idx}>
                                            <td style={{ ...dynCellStyle, fontWeight: 600 }}>{r.staffName}</td>
                                            <td style={dynCellStyle}>{r.designation}</td>
                                            <td style={{ ...dynCellStyle, textAlign: 'right' }}>৳{toNumber(r.amount).toLocaleString()}</td>
                                            <td style={{ ...dynCellStyle, textAlign: 'right' }}>{r.dutyDays}d</td>
                                            <td style={{ ...dynCellStyle, textAlign: 'right' }}>৳{toNumber(r.dutyPayable).toLocaleString()}</td>
                                            <td style={{ ...dynCellStyle, textAlign: 'right' }}>৳{toNumber(r.previousBalance).toLocaleString()}</td>
                                            <td style={{ ...dynCellStyle, textAlign: 'right', color: '#dc2626' }}>৳{toNumber(r.advance).toLocaleString()}</td>
                                            <td style={{ ...dynCellStyle, textAlign: 'right', fontWeight: 600 }}>৳{toNumber(r.netPayable).toLocaleString()}</td>
                                            <td style={dynCellStyle}>{r.status === 'PAID' ? 'Paid' : r.status === 'PARTIAL' ? 'Partial' : 'Unpaid'}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="alive-footer-lock">
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '2.5px solid #000', paddingTop: 10 }}>
                            <div style={{ fontSize: 12 }}>
                                <div><strong>Total Disbursed:</strong> ৳ {consolidatedData.reduce((sum, row) => sum + toNumber(row.netPayable, 0), 0).toLocaleString()}</div>
                                <div style={{ marginTop: 5 }}>* All figures in BDT. This is a computer generated sheet.</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: 10, marginBottom: 20 }}>Authorized Signatory</div>
                                <div style={{ width: '180px', borderTop: '2px solid #000' }}></div>
                            </div>
                        </div>
                        <div style={{ marginTop: 15, fontSize: 8, color: '#94a3b8', textAlign: 'center' }}>
                            Mamun Automobiles Payroll Engine v3.3 • Generated: {dayjs().format('DD MMM YYYY, hh:mm A')}
                        </div>
                    </div>
                </div>,
                document.body
            )}

            </div>
        );
};

const printHeaderStyle = {
    padding: '10px 8px',
    textAlign: 'left',
    fontSize: '12px',
    borderBottom: '2px solid #000'
};

const printCellStyle = {
    padding: '9px 8px',
    fontSize: '12px'
};

export default SalaryPage;






