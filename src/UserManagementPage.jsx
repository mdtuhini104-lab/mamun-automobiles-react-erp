import React from 'react';
import {
    Card, Table, Button, Modal, Form, Input, Select, Tag, Space,
    Typography, Row, Col, Statistic, message, Badge, Tooltip, Alert, Divider, Checkbox, InputNumber
} from 'antd';

import axios from 'axios';
import { useAuth } from './contexts/AuthContext';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useTheme } from './contexts/ThemeContext';
import { getApiBaseUrl } from './utils/appConfig';
import { useAICorrection } from './hooks/useAICorrection';
import { t } from './utils/translations';

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Role Definitions & Permissions ─────────────────────────────────────────
const ROLE_PERMISSIONS = {
    SuperAdmin: {
        color: 'volcano',
        permissions: ['Full Access', 'Delete Admins', 'Quotation History', 'Financial Automation']
    },
    Admin: {
        color: 'blue',
        permissions: [
            'Dashboard', 'Job Cards', 'Billing & Invoices', 'Inventory',
            'Reports', 'Company Ledgers', 'Accounts', 'Used Buy & Sell',
            'Expenses', 'Staff Salary', 'User Management', 'Settings'
        ]
    },
    Manager: {
        color: 'blue',
        permissions: [
            'Dashboard', 'Job Cards', 'Billing & Invoices', 'Inventory',
            'Reports', 'Company Ledgers', 'Accounts', 'Used Buy & Sell', 'Expenses'
        ]
    },
    Staff: {
        color: 'green',
        permissions: ['Job Cards', 'Billing & Invoices', 'Inventory']
    },
    Customer: {
        color: 'purple',
        permissions: ['My Bills', 'Payment History']
    }
};

const apiBaseUrl = getApiBaseUrl();

const api = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});

const UserManagementPage = ({ filter = 'All', title }) => {
    const { user: currentUser } = useAuth();
    const { language, departments, jobPosts, independentStaffs, setIndependentStaffs, userManagement, generateSafeId, jobCards } = useGlobalState();
    const { theme } = useTheme();
    const isDark = theme.includes('dark') || theme.includes('purple');
    
    const isSuperAdmin = currentUser?.role === 'SuperAdmin';
    const isAdmin = currentUser?.role === 'Admin' || isSuperAdmin;
    const isManager = currentUser?.role === 'Manager';

    React.useEffect(() => {
        const setHeader = (key, value) => {
            if (value) {
                api.defaults.headers.common[key] = value;
            } else {
                delete api.defaults.headers.common[key];
            }
        };

        setHeader('x-user-id', currentUser?.id);
        setHeader('x-user-role', currentUser?.role);
        setHeader('x-user-post', currentUser?.specific_post);
        setHeader('x-user-email', currentUser?.email ? currentUser.email.toLowerCase() : '');
    }, [currentUser]);

    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = React.useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [isPasswordModalOpen, setIsPasswordModalOpen] = React.useState(false);
    const [isProfileModalOpen, setIsProfileModalOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState(null);
    const [filterRole, setFilterRole] = React.useState(filter);
    const [addForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [quickAddForm] = Form.useForm();
    const [isQuickAddOpen, setIsQuickAddOpen] = React.useState(false);
    const [quickSaving, setQuickSaving] = React.useState(false);
    const [isDeclarePostOpen, setIsDeclarePostOpen] = React.useState(false);
    const [declareForm] = Form.useForm();
    const globalUsers = userManagement || [];
    const [passForm] = Form.useForm();
    const [profileForm] = Form.useForm();
    const [saving, setSaving] = React.useState(false);

    const { handleBlurCorrection } = useAICorrection(addForm);

    const handleEmailBlur = async (e) => {
        const email = e.target.value;
        if (!email || !email.includes('@')) return;

        // Auto-fill name if empty
        const currentName = addForm.getFieldValue('name');
        if (!currentName) {
            const prefix = email.split('@')[0];
            // Simple formatting: rahim.uddin -> Rahim Uddin
            const formattedName = prefix
                .split(/[._-]/)
                .map(part => part.charAt(0).toUpperCase() + part.slice(1))
                .join(' ');
            
            addForm.setFieldsValue({ name: formattedName });
            
            // Call AI to professionalize it
            await handleBlurCorrection('name', formattedName, 'name');
        }
    };

    // Context Detection
    const isCustomerContext = filter === 'Customer';
    const isAdminContext = filter === 'Admin';
    const isStaffContext = ['Staff', 'Water', 'Engine', 'AC', 'Electric', 'Paint', 'Dent', 'Accounts', 'Manager'].includes(filter);

    // Watch selected role in Add form for conditional field rendering
    const addRole = Form.useWatch('role', addForm);

    // Auto-set Role and Department when modal opens or filter changes
    React.useEffect(() => {
        if (isAddModalOpen) {
            let initialRole = 'Staff';
            if (isCustomerContext) initialRole = 'Customer';
            else if (isAdminContext) initialRole = 'Admin';
            else if (filter === 'Manager') initialRole = 'Manager';

            addForm.setFieldsValue({
                role: initialRole,
                department: isStaffContext && filter !== 'Staff' && filter !== 'Manager' ? filter : undefined
            });
        }
    }, [isAddModalOpen, filter, isCustomerContext, isAdminContext, isStaffContext, addForm]);

    // ─── Load users from Custom API ──────────────────────────────────────────
    const loadUsers = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(Array.isArray(response?.data?.data) ? response.data.data : []);
        } catch (err) {
            console.error('Failed to load users:', err);
            message.error('Could not load users from MongoDB API.');
        } finally {
            setLoading(false);
        }
    }, [currentUser]);

    React.useEffect(() => {
        setFilterRole(filter);
    }, [filter]);

    React.useEffect(() => { loadUsers(); }, [loadUsers]);

    // Safely map users to avoid a single bad document crashing the page
    const safeUsers = React.useMemo(() => {
        try {
            return (users || []).map(u => {
                try {
                    return {
                        id: u?.id || 'unknown',
                        name: u?.name || 'N/A',
                        email: u?.email || '',
                        role: u?.role || 'Staff',
                        status: u?.status || 'Active',
                        phone: u?.phone || '',
                        department: u?.department ?? 'N/A',
                        specific_post: u?.specific_post ?? 'N/A',
                        designation: u?.designation ?? 'N/A',
                        subStaffPosts: u?.subStaffPosts ?? {},
                        createdAt: u?.createdAt || null,
                        lastLogin: u?.lastLogin || null
                    };
                } catch (e) {
                    console.error('Malformed user document skipped', u, e);
                    return { id: u?.id || `bad-${generateSafeId()}`, name: 'N/A', email: '', role: 'Staff', status: 'Active', phone: '', department: 'N/A', specific_post: 'N/A', designation: 'N/A', subStaffPosts: {} };
                }
            });
        } catch (e) {
            console.error('Failed to map users', e);
            return [];
        }
    }, [users]);

    // Safely map globalUsers from global state (used in declare modal)
    const safeGlobalUsers = React.useMemo(() => {
        try {
            return (globalUsers || []).map(u => {
                try {
                    return {
                        id: u?.id || 'unknown',
                        name: u?.name || 'N/A',
                        role: u?.role || 'Staff',
                        department: u?.department ?? 'N/A'
                    };
                } catch (e) {
                    console.error('Malformed global user doc skipped', u, e);
                    return { id: u?.id || `bad-${generateSafeId()}`, name: 'N/A', role: 'Staff', department: 'N/A' };
                }
            });
        } catch (e) {
            console.error('Failed to map globalUsers', e);
            return [];
        }
    }, [globalUsers]);

    // ─── Stats ───────────────────────────────────────────────────────────────
    const stats = {
        total: safeUsers.length,
        active: safeUsers.filter(u => u.status !== 'Inactive').length,
        superAdmins: safeUsers.filter(u => u.role === 'SuperAdmin').length,
        admins: safeUsers.filter(u => u.role === 'Admin').length,
        managers: safeUsers.filter(u => u.role === 'Manager').length,
        staff: safeUsers.filter(u => u.role === 'Staff').length,
    };

    // ─── Add User ─────────────────────────────────────────────────────────────
    const handleAddUser = async (values) => {
        if (!isAdmin && !isManager) return;
        setSaving(true);
        try {
            const newUser = {
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                password: values.password,
                role: values.role,
                status: 'Active',
                phone: values.phone ? values.phone.trim() : '',
                department: values.department || null,
                specific_post: values.specific_post || null,
                salary: values.salary || null,
                address: values.address || null,
                vehicleDetails: values.vehicleDetails || null,
                customerType: values.customerType || null,
                id: `USR-${Date.now()}`
            };
            await api.post('/users', newUser);
            message.success(`User '${values.name}' added successfully.`);
            setIsAddModalOpen(false);
            addForm.resetFields();
            loadUsers();
        } catch (err) {
            message.error('Failed to add user: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    const handleQuickAddStaff = async (values) => {
        if (!isAdmin) return;
        setQuickSaving(true);
        try {
            const newStaff = {
                name: values.name.trim(),
                role: 'Staff',
                status: 'Active',
                phone: values.phone ? values.phone.trim() : '',
                department: values.department || null,
                specific_post: values.specific_post || null,
                createdAt: new Date().toISOString(),
                createdBy: currentUser?.name || 'Admin'
            };
            await api.post('/users', newStaff);
            message.success(`Staff '${values.name}' added successfully.`);
            setIsQuickAddOpen(false);
            quickAddForm.resetFields();
            loadUsers();
        } catch (err) {
            message.error('Failed to add staff: ' + err.message);
        } finally {
            setQuickSaving(false);
        }
    };

    const DESIGNATIONS = [
        'Department Head',
        'Senior Technician',
        'Technician',
        'Junior Technician',
        'Helper',
        'Junior Helper',
        'Accountant',
        'Manager',
        'Admin'
    ];

    // Render table safely to prevent whole page crash if a render step throws
    const renderUserTable = () => {
        try {
            const filtered = safeUsers.filter(u => {
                // Manager cannot see SuperAdmins
                if (isManager && u.role === 'SuperAdmin') return false;

                if (filterRole === 'All') return true;
                if (filterRole === 'SuperAdmin') return u.role === 'SuperAdmin';
                if (filterRole === 'Admin') return u.role === 'Admin';
                if (filterRole === 'Manager') return u.role === 'Manager';
                if (filterRole === 'Customer') return u.role === 'Customer';
                if (filterRole === 'Accounts') return u.department === 'Accounts' || u.role === 'Accounts';

                // Department match
                const lFilter = filterRole.toLowerCase();
                return (u.department || '').toLowerCase().includes(lFilter) ||
                    (u.role || '').toLowerCase().includes(lFilter);
            });

            return (
                <Table
                    dataSource={filtered}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 10 }}
                    rowClassName={r => r.status === 'Inactive' ? 'inactive-row' : ''}
                    locale={{ emptyText: 'No users found. Add the first user above.' }}
                />
            );
        } catch (err) {
            console.error('User table failed to render', err);
            return <Alert type="error" message="Some user records appear corrupted. Refresh to retry." />;
        }
    };

    const handleDeclareSubStaffPost = async (values) => {
        if (!isAdmin) return;
        setSaving(true);
        try {
            const payload = {
                subStaffPosts: {
                    mamun: values.mamun || null,
                    rentacar: values.rentacar || null,
                    muntaha: values.muntaha || null
                },
                designation: values.mamun || values.rentacar || values.muntaha || null,
                specific_post: values.mamun || values.rentacar || values.muntaha || null,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || 'Admin'
            };

            if (values.userId) {
                await api.patch(`/users/${values.userId}`, payload);
            }

            // Optionally create/update an independent staff record when name provided
            if (values.createIndependent && values.independentName) {
                const name = values.independentName.trim();
                // try to find existing independent staff
                const exists = (independentStaffs || []).find(s => s.name === name);
                const newEntry = {
                    id: exists ? exists.id : generateSafeId('IND'),
                    name,
                    role: 'Staff',
                    designation: values.mamun || values.rentacar || values.muntaha || 'Staff',
                    createdAt: new Date().toISOString(),
                    createdBy: currentUser?.name || 'Admin'
                };
                const updatedInd = exists ? independentStaffs.map(s => s.id === exists.id ? newEntry : s) : [newEntry, ...(independentStaffs || [])];
                setIndependentStaffs(updatedInd);
            }

            message.success('Sub-staff posts declared successfully.');
            setIsDeclarePostOpen(false);
            declareForm.resetFields();
            loadUsers();
        } catch (err) {
            message.error('Failed to declare posts: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Edit Role ────────────────────────────────────────────────────────────
    const handleEditRole = async (values) => {
        if (!isAdmin || !selectedUser) return;
        if (selectedUser.id === currentUser?.id) {
            message.error('You cannot change your own role.');
            return;
        }
        setSaving(true);
        try {
            await api.patch(`/users/${selectedUser.id}`, {
                role: values.role,
                department: values.department || null,
                specific_post: values.specific_post || null,
            });
            message.success(`Role updated to '${values.role}' for ${selectedUser.name}`);
            setIsEditModalOpen(false);
            setSelectedUser(null);
            loadUsers();
        } catch (err) {
            message.error('Failed to update role: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Reset Password (in-app password update) ──────────────────────────────
    const handleResetPassword = async (values) => {
        if (!isAdmin || !selectedUser) return;
        setSaving(true);
        try {
            await api.patch(`/users/${selectedUser.id}`, {
                password: values.newPassword,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || 'Admin',
                passwordChangedAt: new Date().toISOString(),
            });
            message.success(`Password updated for ${selectedUser.name}.`);
            setIsPasswordModalOpen(false);
            passForm.resetFields();
            setSelectedUser(null);
        } catch (err) {
            message.error('Failed to reset password: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Edit Customer Profile (Name/Email/Phone) ─────────────────────────
    const handleEditProfile = async (values) => {
        if (!isAdmin || !selectedUser) return;
        setSaving(true);
        try {
            await api.patch(`/users/${selectedUser.id}`, {
                name: values.name.trim(),
                email: values.email.trim().toLowerCase(),
                phone: values.phone ? values.phone.trim() : '',
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || 'Admin'
            });
            message.success(`Profile updated for ${values.name}`);
            setIsProfileModalOpen(false);
            profileForm.resetFields();
            setSelectedUser(null);
            loadUsers();
        } catch (err) {
            message.error('Failed to update profile: ' + err.message);
        } finally {
            setSaving(false);
        }
    };

    // ─── Toggle Status (Activate / Deactivate) ────────────────────────────────
    const handleToggleStatus = async (targetUser) => {
        if (!isAdmin) return;
        if (targetUser.id === currentUser?.id) {
            message.error('You cannot deactivate your own account.');
            return;
        }
        const newStatus = targetUser.status === 'Active' ? 'Inactive' : 'Active';
        try {
            await api.patch(`/users/${targetUser.id}`, {
                status: newStatus,
                updatedAt: new Date().toISOString(),
                updatedBy: currentUser?.name || 'Admin'
            });
            message.success(`${targetUser.name} is now ${newStatus}.`);
            loadUsers();
        } catch (err) {
            message.error('Failed to update status: ' + err.message);
        }
    };

    // ─── Delete User ──────────────────────────────────────────────────────────
    const handleDeleteUser = async (targetUser) => {
        if (!isAdmin) return;
        if (targetUser.id === currentUser?.id) {
            message.error('You cannot delete your own account.');
            return;
        }
        try {
            await api.delete(`/users/${targetUser.id}`);
            message.success(`User '${targetUser.name}' permanently deleted.`);
            loadUsers();
        } catch (err) {
            message.error('Failed to delete user: ' + err.message);
        }
    };

    // ─── Table Columns ────────────────────────────────────────────────────────
    const columns = [
        {
            title: '#', width: 45,
            render: (_, __, idx) => <Text type="secondary">{idx + 1}</Text>
        },
        {
            title: t('item_name_label', language),
            render: (_, r) => (
                <Space>
                    <div style={{
                        width: 36, height: 36, borderRadius: 0, flexShrink: 0,
                        background: (r?.role === 'SuperAdmin') ? '#ef4444' : (r?.role === 'Admin') ? '#3B82F6' : (r?.role === 'Manager') ? '#1890ff' : (r?.role === 'Customer') ? '#9254de' : '#52c41a',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 600, fontSize: 16, border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        {(r?.name || 'N/A')[0] || 'N'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, lineHeight: 1.4, color: isDark ? '#FFF' : '#000' }}>{r?.name || 'N/A'}</div>
                        <div style={{ fontSize: 12, color: isDark ? '#888' : '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                            {r?.email || '—'}
                            {r.role === 'Customer' && (
                                r.lastLogin ? (
                                    <Tooltip title={`Last Login: ${new Date(r.lastLogin).toLocaleString()}`}>
                                        <Badge status="success" /> <span style={{ fontSize: 10, color: '#52c41a' }}>Active</span>
                                    </Tooltip>
                                ) : (
                                    <Tooltip title="Has never logged in">
                                        <Badge status="default" /> <span style={{ fontSize: 10 }}>Never Logged In</span>
                                    </Tooltip>
                                )
                            )}
                        </div>
                        {r?.phone ? <div style={{ fontSize: 11, color: '#aaa' }}>{r.phone}</div> : <div style={{ fontSize: 11, color: '#aaa' }}>N/A</div>}
                    </div>
                </Space>
            )
        },
        {
            title: t('role_management', language), dataIndex: 'role',
            render: role => {
                const safeRole = role || 'Staff';
                const def = ROLE_PERMISSIONS[safeRole] || ROLE_PERMISSIONS.Staff;
                return (
                    <Tag color={def.color} style={{ fontWeight: 600, fontSize: 12 }}>
                        {safeRole}
                    </Tag>
                );
            }
        },
        {
            title: t('permissions', language),
            render: (_, r) => {
                const perms = ROLE_PERMISSIONS[r?.role || 'Staff']?.permissions || [];
                return (
                    <div style={{ maxWidth: 280 }}>
                        {perms.slice(0, 4).map(p => (
                            <Tag key={p} style={{ fontSize: 10, marginBottom: 2 }}>{p}</Tag>
                        ))}
                        {perms.length > 4 && <Tag style={{ fontSize: 10 }}>+{perms.length - 4} more</Tag>}
                    </div>
                );
            }
        },
        {
            title: t('status', language), dataIndex: 'status',
            render: status => {
                const safe = status || 'Active';
                const isActive = safe === 'Active';
                return (
                    <span className={`status-badge ${isActive ? 'status-active' : 'status-inactive'}`}>
                        <Badge status={isActive ? 'success' : 'error'} />
                        {safe}
                    </span>
                );
            }
        },
        {
            title: t('jobs_done', language),
            render: (_, r) => {
                if (r.role === 'Customer') return '—';
                const count = (jobCards || []).filter(j => 
                    (j.assigned_staff_id === r.id || (j.departmentsTasks && Object.values(j.departmentsTasks).some(dt => dt.assigned_staff_id === r.id))) && 
                    (String(j.status).toLowerCase() === 'completed' || String(j.status).toLowerCase() === 'billed' || j.billingStatus === 'PAID')
                ).length;
                return (
                    <Tooltip title="Total Completed/Billed Jobs assigned to this staff">
                        <Tag color={count > 10 ? 'blue' : count > 0 ? 'cyan' : 'default'} style={{ fontWeight: 600 }}>
                            {count} Jobs
                        </Tag>
                    </Tooltip>
                );
            }
        },
        {
            title: t('added', language), dataIndex: 'createdAt',
            render: d => d ? new Date(d).toLocaleDateString() : '—'
        },
        {
            title: t('actions', language),
            render: (_, record) => {
                const isSelf = record.id === currentUser?.id;
                return (
                    <Space size={4} wrap>
                        {/* Edit Role / Edit Profile */}
                        {record.role === 'Customer' ? (
                            <Tooltip title="Edit Customer Profile">
                                <Button
                                    size="small"
                                    disabled={!isAdmin}
                                    onClick={() => {
                                        setSelectedUser(record);
                                        profileForm.setFieldsValue({
                                            name: record.name,
                                            email: record.email,
                                            phone: record.phone
                                        });
                                        setIsProfileModalOpen(true);
                                    }}
                                    style={{ borderRadius: 0, fontWeight: 600, background: 'transparent', color: isDark ? '#FFF' : '#000', borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#000' }}
                                >
                                    Profile
                                </Button>
                            </Tooltip>
                        ) : (
                            <Tooltip title={isSelf ? 'Cannot edit own role' : (isManager && record.role === 'Admin') ? 'Managers cannot edit Admins' : 'Edit Role'}>
                                <Button
                                    size="small"
                                    disabled={isSelf || (!isAdmin && !isManager) || (isManager && record.role === 'Admin')}
                                    onClick={() => {
                                        setSelectedUser(record);
                                        editForm.setFieldsValue({ role: record.role, department: record.department || null, specific_post: record.specific_post || null });
                                        setIsEditModalOpen(true);
                                    }}
                                    style={{ borderRadius: 0, fontWeight: 600, background: '#3B82F6', color: '#FFFFFF', border: 'none' }}
                                >
                                    Role
                                </Button>
                            </Tooltip>
                        )}

                        {/* Reset Password */}
                        <Tooltip title={ (isManager && record.role === 'Admin') ? 'Managers cannot reset Admin passwords' : 'Set new password'}>
                            <Button
                                size="small" disabled={(!isAdmin && !isManager) || (isManager && record.role === 'Admin')}
                                onClick={() => {
                                    setSelectedUser(record);
                                    passForm.resetFields();
                                    setIsPasswordModalOpen(true);
                                }}
                                style={{ borderRadius: 0, fontWeight: 600, background: 'transparent', color: isDark ? '#FFF' : '#000', borderColor: isDark ? 'rgba(255,255,255,0.2)' : '#000' }}
                            >
                                Access
                            </Button>
                        </Tooltip>

                        {/* Activate / Deactivate */}
                        <Tooltip title={record.status === 'Active' ? 'Deactivate User' : 'Reactivate User'}>
                            <Button
                                size="small"
                                danger={record.status === 'Active'}
                                style={record.status !== 'Active' ? { borderColor: '#52c41a', color: '#52c41a' } : {}}
                                disabled={isSelf || (!isAdmin && !isManager) || (isManager && record.role === 'Admin')}
                                onClick={() => handleToggleStatus(record)}
                            >
                                {record.status === 'Active' ? 'Deactivate' : 'Activate'}
                            </Button>
                        </Tooltip>
                    </Space>
                );
            }
        }
    ];

    return (
        <div style={{ padding: '20px' }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
                <Title level={2} style={{ margin: 0, fontWeight: 600, color: isDark ? '#FFF' : '#000' }}>
                    👥 {t('role_management', language)}
                </Title>
                <Text type="secondary" style={{ fontSize: 13, letterSpacing: '0.5px' }}>
                    Mamun Automobiles ERP | {t('admin_accounts', language)} | Permission Control
                </Text>
            </div>

            {/* Stats Cards */}
            <Row gutter={[16, 16]} style={{ marginBottom: 30 }}>
                <Col xs={12} sm={6}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <Statistic 
                            title={<span style={{ color: '#C0C0C0', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>Total Users</span>} 
                            value={stats.total} 
                            valueStyle={{ color: '#FFF', fontWeight: 600 }} 
                        />
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <Statistic 
                            title={<span style={{ color: '#C0C0C0', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>Active Accounts</span>} 
                            value={stats.active} 
                            valueStyle={{ color: '#10b981', fontWeight: 600 }} 
                        />
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <Statistic 
                            title={<span style={{ color: '#C0C0C0', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>Administrators</span>} 
                            value={stats.admins} 
                            valueStyle={{ color: '#3B82F6', fontWeight: 600 }} 
                        />
                    </div>
                </Col>
                <Col xs={12} sm={6}>
                    <div className="glass-card" style={{ padding: '20px' }}>
                        <Statistic 
                            title={<span style={{ color: '#C0C0C0', fontWeight: 600, fontSize: 10, letterSpacing: '0.5px' }}>Operations Staff</span>} 
                            value={stats.managers + stats.staff} 
                            valueStyle={{ color: '#1890ff', fontWeight: 600 }} 
                        />
                    </div>
                </Col>
            </Row>

            {/* RBAC Summary */}
            <Card title="Role Permissions Summary" style={{ marginBottom: 24 }}>
                <Row gutter={[16, 16]}>
                    {Object.entries(ROLE_PERMISSIONS).map(([role, def]) => (
                        <Col key={role} xs={24} md={8}>
                            <div className="glass-light-panel" style={{
                                padding: 14, border: `1px solid`,
                                borderColor: role === 'Admin' ? '#faad14' : role === 'Manager' ? '#1890ff' : '#52c41a',
                                borderRadius: 8, background: role === 'Admin' ? '#fffbe6' : role === 'Manager' ? '#e6f7ff' : '#f6ffed'
                            }}>
                                <div style={{ fontWeight: 600, fontSize: 15, marginBottom: 8, color: '#1a1a1a' }}>{role}</div>
                                <div>
                                    {def.permissions.map(p => (
                                        <Tag key={p} style={{ fontSize: 10, marginBottom: 3 }}>{p}</Tag>
                                    ))}
                                </div>
                            </div>
                        </Col>
                    ))}
                </Row>
            </Card>

            {/* User Table */}
            <div className="glass-card" style={{ padding: 0 }}>
                <div style={{ padding: '24px', borderBottom: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ color: isDark ? '#FFF' : '#000', fontWeight: 600, letterSpacing: '0.5px' }}>All System Users</div>
                    <Select
                        value={filterRole}
                        onChange={setFilterRole}
                        style={{ width: 220, marginLeft: 'auto' }}
                        className="glass-select"
                        options={[
                            { value: 'All', label: 'All Users' },
                            { value: 'SuperAdmin', label: 'Super Admins' },
                            { value: 'Admin', label: 'Admins' },
                            { value: 'Manager', label: 'Managers' },
                            { value: 'Staff', label: 'Staff Only' },
                            { value: 'Customer', label: 'Customers Only' }
                        ]}
                    />
                </div>
                <div style={{ padding: '0 24px 24px' }}>
                    {renderUserTable()}
                </div>
            </div>

            {/* ─── Add User Modal ────────────────────────────────────────────── */}
            <Modal 
                title={<span style={{ letterSpacing: '0.2px', fontWeight: 600 }}>Add new {isCustomerContext ? 'customer' : isStaffContext ? 'staff / mechanic' : isAdminContext ? 'admin' : 'user'}</span>}
                open={isAddModalOpen}
                onCancel={() => { setIsAddModalOpen(false); addForm.resetFields(); }} 
                footer={null} 
                width={isCustomerContext ? 600 : 500}
            >
                <Form form={addForm} onFinish={handleAddUser} layout="vertical">
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                                <Input placeholder={isCustomerContext ? "Customer Name" : "Karim Hossain"} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="role" label="Role" rules={[{ required: true }]}>
                                <Select disabled={filter !== 'All'}>
                                    <Option value="SuperAdmin" disabled={stats.superAdmins >= 2}>SuperAdmin</Option>
                                    <Option value="Admin">Admin</Option>
                                    <Option value="Manager">Manager</Option>
                                    <Option value="Staff">Staff</Option>
                                    <Option value="Customer">Customer</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>

                    {/* Department & Job Post: Hidden for Customers and Admins */}
                    {!isCustomerContext && !isAdminContext && (
                        <Row gutter={12}>
                            <Col span={12}>
                                <Form.Item
                                    name="department"
                                    label="Department"
                                >
                                    <Select
                                        allowClear
                                        placeholder="Select department"
                                        disabled={isStaffContext && filter !== 'Staff' && filter !== 'Manager'}
                                    >
                                        {(departments || []).map(d => <Option key={d} value={d}>{d}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="specific_post" label="Job Post">
                                    <Select allowClear placeholder="Select job post">
                                        {(jobPosts || []).map(p => <Option key={p} value={p}>{p}</Option>)}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                    )}

                    <Row gutter={12}>
                        <Col span={isCustomerContext ? 24 : 12}>
                            <Form.Item name="email" label="Gmail / Login ID" rules={[{ required: true }]}>
                                <Input 
                                    placeholder="e.g. rahim.uddin@gmail.com" 
                                    onBlur={handleEmailBlur}
                                />
                            </Form.Item>
                        </Col>
                        {!isCustomerContext && (
                            <Col span={12}>
                                <Form.Item name="salary" label="Monthly Salary (Tk)">
                                    <InputNumber style={{ width: '100%' }} placeholder="e.g. 15000" min={0} />
                                </Form.Item>
                            </Col>
                        )}
                    </Row>

                    {/* Customer Specific Fields: Phone, Type, Address, Vehicle */}
                    {(addRole === 'Customer' || isCustomerContext) && (
                        <>
                            <Row gutter={12}>
                                <Col span={12}>
                                    <Form.Item name="customerType" label="Customer Type" initialValue="Individual" rules={[{ required: true }]}>
                                        <Select>
                                            <Option value="Individual">Individual</Option>
                                            <Option value="Company">Company</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="phone" label="Phone Number" rules={[{ required: true, message: 'Phone required' }]}>
                                        <Input placeholder="e.g. 01700-000000" />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="address" label="Home/Office Address">
                                <Input.TextArea rows={2} placeholder="Complete address for record keeping" />
                            </Form.Item>
                            <Form.Item name="vehicleDetails" label="Vehicle Details (Year, Model, Registration)">
                                <Input placeholder="e.g. 2018 Toyota Corolla [DHAKA METRO-KA-11-2222]" />
                            </Form.Item>
                        </>
                    )}

                    {!isCustomerContext && addRole !== 'Customer' && (
                         <Form.Item name="phone" label="Phone Number">
                            <Input placeholder="e.g. 01700-000000" />
                        </Form.Item>
                    )}

                    <Form.Item name="password" label="Initial Password" rules={[{ required: true, min: 4 }]} initialValue="1234">
                        <Input.Password placeholder="Minimum 4 characters" />
                    </Form.Item>
                    
                    <Divider style={{ margin: '12px 0' }} />
                    
                    <Button type="primary" htmlType="submit" block size="large" loading={saving} style={{ height: '50px', fontWeight: 600, background: '#3B82F6', border: 'none', color: '#FFFFFF' }}>
                        Create {isCustomerContext ? 'customer' : isStaffContext ? 'staff' : 'user'} account
                    </Button>
                </Form>
            </Modal>

            {/* ─── Edit Role Modal ───────────────────────────────────────────── */}
            <Modal title="Edit user role" open={isEditModalOpen}
                onCancel={() => { setIsEditModalOpen(false); setSelectedUser(null); }} footer={null}>
                {selectedUser && (
                    <div style={{ marginBottom: 16, padding: 10, background: '#f5f5f5', borderRadius: 6 }}>
                        <Text>Editing: <strong>{selectedUser.name}</strong> ({selectedUser.email})</Text><br />
                        <Text type="secondary" style={{ fontSize: 12 }}>Current role: <Tag>{selectedUser.role}</Tag></Text>
                    </div>
                )}
                <Form form={editForm} onFinish={handleEditRole} layout="vertical">
                    <Form.Item name="role" label="New Role" rules={[{ required: true }]}>
                        <Select size="large">
                            <Option value="Admin">Admin</Option>
                            <Option value="Manager">Manager</Option>
                            <Option value="Staff">Staff</Option>
                            <Option value="Customer">Customer</Option>
                        </Select>
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="department" label="Department">
                                <Select allowClear placeholder="Select department">
                                    {(departments || []).map(d => <Option key={d} value={d}>{d}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="specific_post" label="Job Post">
                                <Select allowClear placeholder="Select job post">
                                    {(jobPosts || []).map(p => <Option key={p} value={p}>{p}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Alert type="info"  message="Role changes take effect immediately on the user's next login or page refresh." style={{ marginBottom: 16 }} />
                    <Button type="primary" htmlType="submit" block loading={saving}>Update Role</Button>
                </Form>
            </Modal>

            {/* ─── Quick Add Staff Modal ───────────────────────────────────── */}
            <Modal title="Quick add staff" open={isQuickAddOpen}
                onCancel={() => { setIsQuickAddOpen(false); quickAddForm.resetFields(); }} footer={null}>
                <Form form={quickAddForm} onFinish={handleQuickAddStaff} layout="vertical">
                    <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                        <Input placeholder="e.g. Karim Hossain" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone (optional)">
                        <Input placeholder="e.g. 01700-000000" />
                    </Form.Item>
                    <Row gutter={12}>
                        <Col span={12}>
                            <Form.Item name="department" label="Department">
                                <Select allowClear placeholder="Select department">
                                    {(departments || []).map(d => <Option key={d} value={d}>{d}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="specific_post" label="Job Post">
                                <Select allowClear placeholder="Select job post">
                                    {(jobPosts || []).map(p => <Option key={p} value={p}>{p}</Option>)}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Button type="primary" htmlType="submit" block size="large" loading={quickSaving}>Create Staff</Button>
                </Form>
            </Modal>

            {/* ─── Declare Sub-Staff Post Modal ───────────────────────────────── */}
            <Modal title="Declare sub-staff post" open={isDeclarePostOpen}
                onCancel={() => { setIsDeclarePostOpen(false); declareForm.resetFields(); }} footer={null}>
                <Form form={declareForm} onFinish={handleDeclareSubStaffPost} layout="vertical">
                    <Form.Item name="userId" label="Select staff" rules={[{ required: true }]}>
                        <Select showSearch placeholder="Select staff to declare posts for">
                            {(safeGlobalUsers || []).filter(u => (u?.role || 'Staff') !== 'Customer').map(u => (
                                <Option key={u.id} value={u.id}>{u.name} {u.department && u.department !== 'N/A' ? `— ${u.department}` : ''}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                    <Divider />
                    <Form.Item name="mamun" label="Mamun Automobiles Post">
                        <Select allowClear placeholder="Select designation">
                            {DESIGNATIONS.map(d => <Option key={`mamun-${d}`} value={d}>{d}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="rentacar" label="Rent-A-Car Post">
                        <Select allowClear placeholder="Select designation">
                            {DESIGNATIONS.map(d => <Option key={`rentacar-${d}`} value={d}>{d}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="muntaha" label="Muntaha Post">
                        <Select allowClear placeholder="Select designation">
                            {DESIGNATIONS.map(d => <Option key={`muntaha-${d}`} value={d}>{d}</Option>)}
                        </Select>
                    </Form.Item>
                    <Form.Item name="createIndependent" valuePropName="checked">
                        <Checkbox>Create independent staff entry if user account does not exist</Checkbox>
                    </Form.Item>
                    <Form.Item name="independentName" label="Independent Staff Name (optional)">
                        <Input placeholder="Full name for independent staff" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block loading={saving}>Save Posts</Button>
                </Form>
            </Modal>

            {/* ─── Reset Password Modal ──────────────────────────────────────── */}
            <Modal title="Reset password" open={isPasswordModalOpen}
                onCancel={() => { setIsPasswordModalOpen(false); passForm.resetFields(); setSelectedUser(null); }} footer={null}>
                {selectedUser && (
                    <div style={{ marginBottom: 16, padding: 10, background: '#fff7e6', borderRadius: 6 }}>
                        <Text>Setting password for: <strong>{selectedUser.name}</strong></Text>
                    </div>
                )}
                <Form form={passForm} onFinish={handleResetPassword} layout="vertical">
                    <Form.Item name="newPassword" label="New Password" rules={[{ required: true, min: 4, message: 'Minimum 4 characters' }]}>
                        <Input.Password placeholder="Enter new password" />
                    </Form.Item>
                    <Form.Item name="confirmPassword" label="Confirm Password"
                        rules={[
                            { required: true },
                            ({ getFieldValue }) => ({
                                validator(_, value) {
                                    if (!value || getFieldValue('newPassword') === value) return Promise.resolve();
                                    return Promise.reject('Passwords do not match!');
                                }
                            })
                        ]}>
                        <Input.Password placeholder="Re-enter password" />
                    </Form.Item>
                    <Button type="primary" htmlType="submit" block loading={saving}>
                        Set new password
                    </Button>
                </Form>
            </Modal>

            {/* ─── Edit Customer Profile Modal ───────────────────────────────── */}
            <Modal title="Edit user profile" open={isProfileModalOpen}
                onCancel={() => { setIsProfileModalOpen(false); profileForm.resetFields(); setSelectedUser(null); }} footer={null}>
                {selectedUser && (
                    <div style={{ marginBottom: 16, padding: 10, background: '#f5f5f5', borderRadius: 6 }}>
                        <Text>Editing Profile for: <strong>{selectedUser.name}</strong></Text>
                    </div>
                )}
                <Form form={profileForm} onFinish={handleEditProfile} layout="vertical">
                    <Form.Item name="name" label="Full Name" rules={[{ required: true }]}>
                        <Input placeholder="Update name" />
                    </Form.Item>
                    <Form.Item name="email" label="Gmail / Login ID" rules={[{ required: true, type: 'email' }]}>
                        <Input placeholder="Update login email" />
                    </Form.Item>
                    <Form.Item name="phone" label="Phone Number" rules={[{ required: true }]}>
                        <Input placeholder="Update linked phone number" />
                    </Form.Item>
                    <Alert type="info"  message="Updating the email here automatically updates their login credentials." style={{ marginBottom: 16 }} />
                    <Button type="primary" htmlType="submit" block loading={saving}>Update Profile</Button>
                </Form>
            </Modal>

            <style>{`
                .inactive-row { opacity: 0.5; background: #fafafa !important; }
                .inactive-row:hover td { background: #f0f0f0 !important; }
            `}</style>
        </div>
    );
};

export default UserManagementPage;





