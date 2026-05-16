import React from 'react';
import { Card, Table, Button, Modal, Form, Select, Typography, message, Space, Tag, Spin } from 'antd';
import axios from 'axios';
import { useAuth } from './contexts/AuthContext';
import { getApiBaseUrl } from './utils/appConfig';

const { Title, Text } = Typography;
const { Option } = Select;

const apiBaseUrl = getApiBaseUrl();
const api = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' }
});

const ROLE_COLORS = {
    SuperAdmin: 'volcano',
    Admin: 'blue',
    Manager: 'blue',
    Staff: 'green',
    Mechanic: 'cyan',
    Customer: 'purple'
};

const RoleManagementPage = () => {
    const { user: currentUser } = useAuth();
    const isSuperAdmin = currentUser?.role === 'SuperAdmin';
    
    const [users, setUsers] = React.useState([]);
    const [loading, setLoading] = React.useState(true);
    const [isEditModalOpen, setIsEditModalOpen] = React.useState(false);
    const [selectedUser, setSelectedUser] = React.useState(null);
    const [editForm] = Form.useForm();
    const [saving, setSaving] = React.useState(false);

    React.useEffect(() => {
        if (currentUser) {
            api.defaults.headers.common['x-user-id'] = currentUser.id;
            api.defaults.headers.common['x-user-role'] = currentUser.role;
            api.defaults.headers.common['x-user-post'] = currentUser.specific_post;
            api.defaults.headers.common['x-user-email'] = currentUser.email?.toLowerCase();
        }
    }, [currentUser]);

    const loadUsers = React.useCallback(async () => {
        setLoading(true);
        try {
            const response = await api.get('/users');
            setUsers(Array.isArray(response?.data?.data) ? response.data.data : []);
        } catch (err) {
            message.error('Failed to load users: ' + err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => { loadUsers(); }, [loadUsers]);

    const handleEditRole = async (values) => {
        if (!isSuperAdmin || !selectedUser) {
            message.error('Permission denied: Only SuperAdmins can change roles.');
            return;
        }
        if (selectedUser.id === currentUser?.id) {
            message.error('You cannot change your own role from this panel.');
            return;
        }

        setSaving(true);
        try {
            await api.put(`/users/${selectedUser.id}/role`, {
                role: values.role
            });
            message.success(`Role for ${selectedUser.name} updated to ${values.role}`);
            setIsEditModalOpen(false);
            setSelectedUser(null);
            loadUsers();
        } catch (err) {
            message.error('Failed to update user role: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const columns = [
        {
            title: 'User',
            render: (_, r) => (
                <Space>
                    <div style={{
                        width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: '#1f2937', color: '#fff', fontWeight: 800, borderRadius: 4
                    }}>
                        {(r.name || 'U')[0].toUpperCase()}
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{r.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{r.email}</div>
                    </div>
                </Space>
            )
        },
        {
            title: 'Current Role',
            dataIndex: 'role',
            render: role => (
                <Tag color={ROLE_COLORS[role] || 'default'} style={{ fontWeight: 700 }}>
                    {role ? role.toUpperCase() : 'UNKNOWN'}
                </Tag>
            )
        },
        {
            title: 'Department',
            dataIndex: 'department',
            render: dept => <span style={{ color: 'var(--text-main)', fontWeight: 500 }}>{dept || '—'}</span>
        },
        {
            title: 'Actions',
            render: (_, record) => {
                const isSelf = record.id === currentUser?.id;
                return (
                    <Button
                        size="small"
                        disabled={isSelf || !isSuperAdmin}
                        onClick={() => {
                            setSelectedUser(record);
                            editForm.setFieldsValue({ role: record.role });
                            setIsEditModalOpen(true);
                        }}
                        style={{ background: '#3B82F6', color: '#FFFFFF', fontWeight: 800, border: 'none', borderRadius: 4 }}
                    >
                        CHANGE ROLE
                    </Button>
                );
            }
        }
    ];

    if (!isSuperAdmin) {
        return (
            <div style={{ padding: 40, textAlign: 'center' }}>
                <Title level={3} style={{ color: '#ff4d4f' }}>Access Denied</Title>
                <Text style={{ color: 'var(--text-main)' }}>You must be a SuperAdmin to access the Central Role Management system.</Text>
            </div>
        );
    }

    return (
        <div style={{ padding: '24px' }}>
            <div style={{ marginBottom: 24 }}>
                <Title level={2} style={{ color: 'var(--text-main)', margin: 0, fontWeight: 900, letterSpacing: '1px' }}>ROLE MANAGEMENT</Title>
                <Text style={{ color: '#3B82F6', fontWeight: 700, fontSize: 12, letterSpacing: '1px' }}>
                    RESTRICTED SUPERADMIN PANEL
                </Text>
            </div>

            <Card className="glass-card" bordered={false} styles={{ body: { padding: 0 } }}>
                <Table
                    dataSource={users}
                    columns={columns}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 12 }}
                />
            </Card>

            <Modal
                title={`CHANGE ROLE: ${selectedUser?.name}`}
                open={isEditModalOpen}
                onCancel={() => { setIsEditModalOpen(false); setSelectedUser(null); }}
                footer={null}
            >
                <Form form={editForm} layout="vertical" onFinish={handleEditRole}>
                    <Form.Item name="role" label="Assign New Role" rules={[{ required: true }]}>
                        <Select>
                            <Option value="SuperAdmin">SuperAdmin</Option>
                            <Option value="Admin">Admin</Option>
                            <Option value="Manager">Manager</Option>
                            <Option value="Staff">Staff</Option>
                            <Option value="Mechanic">Mechanic</Option>
                            <Option value="Customer">Customer</Option>
                            <Option value="Water">Water Service Staff</Option>
                            <Option value="Engine">Engine Staff</Option>
                            <Option value="AC">AC Staff</Option>
                            <Option value="Electric">Electric Staff</Option>
                            <Option value="Paint">Paint Staff</Option>
                            <Option value="Dent">Dent Staff</Option>
                        </Select>
                    </Form.Item>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                        <Button onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                        <Button type="primary" htmlType="submit" loading={saving} style={{ background: '#3B82F6', color: '#FFFFFF', fontWeight: 800 }}>
                            UPDATE ROLE
                        </Button>
                    </div>
                </Form>
            </Modal>
        </div>
    );
};

export default RoleManagementPage;




