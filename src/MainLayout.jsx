import React from 'react';
import { Layout, Menu, Button, theme, Tag, Typography, Drawer, Grid, message, Badge, Popover, List, Avatar, Modal, Space, Spin, Result, Skeleton } from 'antd';
import { ShoppingCartOutlined, InboxOutlined, ShopOutlined, SettingOutlined, DashboardOutlined, TeamOutlined, ToolOutlined, DollarOutlined, SolutionOutlined } from '@ant-design/icons';

import { useAuth } from './contexts/AuthContext';
import { useGlobalState } from './contexts/GlobalStateContext';
import { useTheme } from './contexts/ThemeContext';
import { lazyWithRetry } from './utils/helpers';
import logoLight from './assets/logo-light.png';
import logoDark from './assets/logo-dark.png';
import { Switch } from 'antd';
import { TranslationOutlined, UserOutlined, BgColorsOutlined, PoweroffOutlined } from '@ant-design/icons';


import { t } from './utils/translations';
import { getUploadUrl } from './utils/appConfig';
import ErrorBoundary from './ErrorBoundary';

const WorkOrderPage = lazyWithRetry(() => import('./WorkOrderPage'));
const PurchaseOrderPage = React.lazy(() => import('./PurchaseOrderPage'));
const GRNDashboard = React.lazy(() => import('./GRNDashboard'));
const InventoryDashboard = React.lazy(() => import('./InventoryDashboard'));
const PurchaseOrderForm = React.lazy(() => import('./PurchaseOrderForm'));
const BillingPage = lazyWithRetry(() => import('./BillingPage'));
const InvoicesPage = lazyWithRetry(() => import('./InvoicesPage'));
const BillPage = lazyWithRetry(() => import('./BillPage'));
const SettingsPage = lazyWithRetry(() => import('./SettingsPage'));
const ReportsPage = lazyWithRetry(() => import('./ReportsPage'));
const LedgersPage = lazyWithRetry(() => import('./LedgersPage'));
const DashboardPage = lazyWithRetry(() => import('./DashboardPage'));
const JobCardsPage = lazyWithRetry(() => import('./JobCardsPage'));
const CustomersPage = lazyWithRetry(() => import('./CustomersPage'));
const MasterAccountsPage = lazyWithRetry(() => import('./MasterAccountsPage'));
const ExpensesPage = lazyWithRetry(() => import('./ExpensesPage'));
const UsedBuySell = lazyWithRetry(() => import('./UsedBuySell'));
const SalaryPage = lazyWithRetry(() => import('./SalaryPage'));
const UserManagementPage = lazyWithRetry(() => import('./UserManagementPage'));
const RoleManagementPage = lazyWithRetry(() => import('./RoleManagementPage'));
const CustomerPortalPage = lazyWithRetry(() => import('./CustomerPortalPage'));
const ServicesPage = lazyWithRetry(() => import('./ServicesPage'));
const QuotationsPage = lazyWithRetry(() => import('./QuotationsPage'));
const SuppliersPage = lazyWithRetry(() => import('./SuppliersPage'));
const LoanManagementPage = lazyWithRetry(() => import('./LoanManagementPage'));
const FinanceDashboard = lazyWithRetry(() => import('./FinanceDashboard'));
const InventoryPage = lazyWithRetry(() => import('./InventoryPage'));
const JobIntakePage = lazyWithRetry(() => import('./JobIntakePage'));
const MechanicDashboardPage = lazyWithRetry(() => import('./MechanicDashboardPage'));
const ManagerDashboardPage = lazyWithRetry(() => import('./ManagerDashboardPage'));
const CorporateBillingPage = lazyWithRetry(() => import('./CorporateBillingPage'));
const ProfilePage = lazyWithRetry(() => import('./ProfilePage'));
const PremiumProfilePage = lazyWithRetry(() => import('./PremiumProfilePage'));
const ThemePage = lazyWithRetry(() => import('./ThemePage'));
const RTVDashboard = React.lazy(() => import('./RTVDashboard'));
const APIKeysPage = lazyWithRetry(() => import('./APIKeysPage'));

const { Header, Sider, Content } = Layout;
const { Text, Title } = Typography;

const MainLayout = () => {
    const [collapsed, setCollapsed] = React.useState(false);
    const [mobileDrawerVisible, setMobileDrawerVisible] = React.useState(false);
    const [isProfileMenuOpen, setIsProfileMenuOpen] = React.useState(false);

    const { logout, user } = useAuth();
    const userRoleRaw = (user?.role || '').toLowerCase();
    const isSuperAdmin = userRoleRaw.includes('super');
    const isAdmin = isSuperAdmin || userRoleRaw.includes('admin');
    const isManager = userRoleRaw.includes('manager');
    const isStaff = userRoleRaw.includes('staff');
    const isCustomer = userRoleRaw.includes('customer');

    // ─── Persistent Active Menu ───────────────────────────────────────────────
    const [activeMenu, setActiveMenuState] = React.useState(() => {
        const saved = sessionStorage.getItem('erp_active_menu');
        if (saved) return saved;
        // Default based on role if no saved preference
        if (userRoleRaw.includes('customer')) return 'customer-portal';
        return '1';
    });

    const setActiveMenu = (key) => {
        sessionStorage.setItem('erp_active_menu', key);
        setActiveMenuState(key);
    };

    // Sync hash with menu for /profile and /settings
    React.useEffect(() => {
        const handleHash = () => {
            const h = window.location.hash;
            if (h === '#/profile') setActiveMenu('profile');
            else if (h === '#/settings') setActiveMenu('10');
            else if (h === '#/themes') setActiveMenu('themes');
            else if (h === '#/login' || h === '#/reset-password' || !h || h === '#/') {
                // If logged in but on login hash, force to dashboard
                setActiveMenu('1');
                if (h === '#/login' || h === '#/reset-password') window.location.hash = '';
            }
        };
        window.addEventListener('hashchange', handleHash);
        handleHash();
        return () => window.removeEventListener('hashchange', handleHash);
    }, []);

    const { registerNavigate, loading, notifications, markNotificationRead, markAllNotificationsRead, featureToggles: toggles, language, setLanguage } = useGlobalState();
    const { theme: currentTheme, toggleTheme } = useTheme();
    const isDark = currentTheme !== 'theme-light-minimal';

    React.useEffect(() => {
        registerNavigate(setActiveMenu);
    }, [registerNavigate]);

    // Force Customer Portal for newly logged in customers who default to '1'
    React.useEffect(() => {
        if (isCustomer && activeMenu === '1') {
            setActiveMenu('customer-portal');
        }
    }, [isCustomer, activeMenu]);

    const [openMenuKeys, setOpenMenuKeys] = React.useState([]);

    const screens = Grid.useBreakpoint();
    const isMobile = !screens.md;

    React.useEffect(() => {
        if (!isMobile && mobileDrawerVisible) {
            setMobileDrawerVisible(false);
        }
    }, [isMobile, mobileDrawerVisible]);


    const allMenuItems = [
        {
            key: 'grp-dashboard',
            label: t('dashboard', language),
            icon: <DashboardOutlined />,
            roles: ['Admin', 'Manager', 'SuperAdmin'],
            children: [
                { key: '1', label: t('executive_dashboard', language) },
                { key: 'manager-dashboard', label: t('manager_dashboard', language) },
                { key: '5', label: t('reports', language) },
            ]
        },
        {
            key: 'grp-front-desk',
            label: t('front_desk', language),
            icon: <TeamOutlined />,
            roles: ['Admin', 'Manager', 'Staff', 'SuperAdmin'],
            children: [
                { key: 'job-intake', label: t('job_intake', language) },
                { key: 'customers', label: 'Customers Directory' },
                { key: 'customer-portal', label: t('customer_portal', language) },
            ]
        },
        {
            key: 'grp-workshop',
            label: t('workshop', language),
            icon: <ToolOutlined />,
            roles: ['Admin', 'Manager', 'Staff', 'SuperAdmin'],
            children: [
                { key: 'mechanic-dashboard', label: t('mechanic_dashboard', language) },
                { key: '2', label: t('job_cards', language) },
                {
                    key: 'grp-service-teams',
                    label: t('service_teams', language),
                    children: [
                        { key: 'user-water', label: t('water_service', language) },
                        { key: 'user-engine', label: t('engine_dept', language) },
                        { key: 'user-ac', label: t('ac_cooling', language) },
                        { key: 'user-electric', label: t('electric_dept', language) },
                        { key: 'user-paint', label: t('paint_body', language) },
                        { key: 'user-dent', label: t('dent_frame', language) },
                    ]
                }
            ]
        },
        {
            key: 'grp-sales',
            label: t('sales', language),
            icon: <DollarOutlined />,
            roles: ['Admin', 'Manager', 'Staff', 'SuperAdmin'],
            children: [
                { key: 'quotations', label: t('quotations', language) },
                { key: 'invoices', label: 'Invoices' },
                { key: 'bills', label: 'Bills / Cash Memo' },
            ]
        },
        {
            key: 'grp-inventory',
            label: t('inventory', language),
            icon: <InboxOutlined />,
            roles: ['Admin', 'Manager', 'Staff', 'SuperAdmin'],
            children: [
                { key: 'inventory-product', label: t('inventory_dashboard', language) },
                { key: 'purchases', label: t('record_purchase', language) },
                { key: 'ledger-supplier', label: t('supplier_ledger', language) },
            ]
        },
    ];

    const rootSubmenuKeys = ['grp-dashboard', 'grp-front-desk', 'grp-workshop', 'grp-sales', 'grp-inventory'];

    const customerMenuItems = [
        { key: 'customer-portal', label: t('my_dashboard', language) },
        { key: '20', label: t('my_bills', language) },
        { key: '21', label: t('payment_history', language) },
    ];

    const roleFiltered = isCustomer
        ? customerMenuItems
        : allMenuItems.filter(item => {
            if (!item.roles) return true; // Groups don't always have roles in this simplified version
            return item.roles.some(r => {
                const rLower = r.toLowerCase();
                if (isSuperAdmin && rLower.includes('super')) return true;
                if (isAdmin && rLower.includes('admin')) return true;
                if (isManager && rLower.includes('manager')) return true;
                if (isStaff && rLower.includes('staff')) return true;
                return false;
            });
        });

    const staffAccessEnabled = toggles?.staff_access?.enabled ?? true;
    const lockedModuleKeys = toggles?.staff_access?.meta?.lockedModules || ['job-intake', 'mechanic-dashboard', 'staff-portal'];
    const blockedModuleSet = new Set(lockedModuleKeys);
    const filterLockedMenuItems = (items) => {
        return (items || []).reduce((acc, item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const filteredChildren = hasChildren ? item.children.filter(child => !blockedModuleSet.has(child.key)) : [];
            if (blockedModuleSet.has(item.key) && !hasChildren) return acc;
            if (hasChildren && filteredChildren.length === 0) return acc;
            acc.push({
                ...item,
                children: filteredChildren.length ? filteredChildren : undefined
            });
            return acc;
        }, []);
    };
    let filteredMenuItems = staffAccessEnabled ? roleFiltered : filterLockedMenuItems(roleFiltered);

    if (isStaff && !isAdmin && !isManager && !isSuperAdmin) {
        filteredMenuItems = [{
            key: 'grp-operations',
            label: t('operations', language),
            children: [
                { key: 'mechanic-dashboard', label: t('my_dashboard', language) },
                { key: 'job-intake',         label: t('job_intake', language) },
                { key: 'staff-portal',       label: t('my_job_cards', language) },
            ]
        }];
    }
    const staffModuleBlocked = !staffAccessEnabled && blockedModuleSet.has(activeMenu);
    const maintenanceActive = (toggles?.maintenance_mode?.enabled ?? false) && 
        !isSuperAdmin && 
        !isCustomer && 
        !['customer-portal', 'profile', 'themes'].includes(activeMenu);
    const maintenanceNotice = toggles?.maintenance_mode?.meta?.premiumNotice || 'Mamun Automobiles is undergoing a premium maintenance window. Please check back shortly.';

    const renderContent = () => {
        if (staffModuleBlocked) {
            return (
                <Result
                    status="warning"
                    title="Module locked"
                    subTitle="This section is temporarily disabled by the owner."
                />
            );
        }
        switch (activeMenu) {
            case '1': return <DashboardPage />;
            case 'manager-dashboard': return <ManagerDashboardPage />;
            case 'customers': return <CustomersPage />;
            case 'customer-portal': return <CustomerPortalPage />;
            case '20': return <CustomerPortalPage initialTab="billing" />;
            case '21': return <CustomerPortalPage initialTab="history" />;
            case 'job-intake': return <JobIntakePage />;
            case 'mechanic-dashboard': return <MechanicDashboardPage />;
            case 'staff-portal': return <JobCardsPage mode="staff" />;
            case '2': return <JobCardsPage />;
            case 'invoices': return <InvoicesPage />;
            case 'bills': return <BillPage />;
            case '3': return <BillingPage />;
            case 'inventory-product': return <InventoryDashboard />;
            case 'inventory-service': return <ServicesPage />;
            case '5': return <ReportsPage />;
            case 'quotations': return <QuotationsPage />;
            case 'work-orders': return <WorkOrderPage />;
            case 'purchase-orders': return <PurchaseOrderPage />;
            case 'grn-dashboard': return <GRNDashboard />;
            case 'purchases': return <PurchaseOrderForm />;
            case 'ledger-customer': return <LedgersPage defaultTab="customer" />;
            case 'ledger-supplier': return <SuppliersPage />;
            case 'loans': return <LoanManagementPage />;
            case '22': return <MasterAccountsPage />;
            case 'corporate-billing': return <CorporateBillingPage />;
            case '8': return <UsedBuySell />;
            case '10': return <SettingsPage />;
            case 'profile': return <PremiumProfilePage />;
            case 'themes': return <ThemePage />;
            case 'role-management': return <RoleManagementPage />;
            case '11': return <SalaryPage />;
            case 'user-admin': return <UserManagementPage filter="Admin" />;
            case 'user-manager': return <UserManagementPage filter="Manager" />;
            case 'user-accounts': return <UserManagementPage filter="Accounts" />;
            case 'user-customer': return <UserManagementPage filter="Customer" />;
            case 'user-water': return <UserManagementPage filter="Water" />;
            case 'user-engine': return <UserManagementPage filter="Engine" title="Engine Dept" />;
            case 'user-ac': return <UserManagementPage filter="AC" title="AC & Cooling" />;
            case 'user-electric': return <UserManagementPage filter="Electric" />;
            case 'user-paint': return <UserManagementPage filter="Paint" title="Paint & Body" />;
            case 'user-dent': return <UserManagementPage filter="Dent" title="Dent & Frame" />;
            case 'rtv-dashboard': return <RTVDashboard />;
            case 'finance-dashboard': return <FinanceDashboard />;
            case 'api-keys': return <APIKeysPage />;
            default: return <DashboardPage />;
        }
    };

    const mapMenuItems = (items) => items.map(item => ({
        key: item.key,
        icon: item.icon,
        label: <span className="dynamic-text-main" style={{ 
            fontWeight: item.children ? 600 : 500, 
            letterSpacing: '0.5px', 
            fontSize: item.children ? 13 : 12, 
            display: 'block',
            opacity: item.children ? 1 : 0.88 
        }}>{item.label}</span>,
        children: item.children ? mapMenuItems(item.children) : null
    }));

    const siderContent = React.useMemo(() => (
        <Sider trigger={null} collapsible collapsed={collapsed} width={280} className="glass-sidebar" style={{ background: 'var(--bg-main)', borderRight: '1px solid var(--border-default)' }}>
                <div className={`sidebar-brand ${collapsed ? 'sidebar-brand-collapsed' : ''}`} style={{ padding: collapsed ? '20px 0' : '40px 20px', textAlign: 'center', borderBottom: '1px solid var(--border-default)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <img 
                        key={isDark ? 'light-logo' : 'dark-logo'}
                        src={isDark ? logoLight : logoDark} 
                        alt="Mamun Automobiles Logo" 
                        className="logo-fade-in"
                        style={{ 
                            height: collapsed ? 35 : 70,
                            width: '100%',
                            maxWidth: collapsed ? 35 : 220, 
                            marginBottom: collapsed ? 0 : 20, 
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)', 
                            objectFit: 'contain' 
                        }} 
                    />

                    {!collapsed && (
                        <div style={{ marginTop: 24, width: '100%', textAlign: 'center' }}>
                            <div style={{ padding: '0 20px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, background: 'rgba(59, 130, 246, 0.05)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-default)' }}>
                                    <TranslationOutlined style={{ color: 'var(--accent)', fontSize: 16 }} />
                                    <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-muted)' }}>{language === 'en' ? 'English' : 'বাংলা'}</span>
                                    <Switch 
                                        size="small" 
                                        checked={language === 'bn'} 
                                        onChange={(checked) => setLanguage(checked ? 'bn' : 'en')}
                                        style={{ backgroundColor: language === 'bn' ? 'var(--accent)' : '' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                <Menu
                    theme={isDark ? 'dark' : 'light'} mode="inline"
                    selectedKeys={[activeMenu]}
                    openKeys={openMenuKeys}
                    onOpenChange={(keys) => {
                        const latestOpenKey = keys.find((key) => openMenuKeys.indexOf(key) === -1);
                        if (rootSubmenuKeys.indexOf(latestOpenKey) === -1) {
                            setOpenMenuKeys(keys);
                        } else {
                            setOpenMenuKeys(latestOpenKey ? [latestOpenKey] : []);
                        }
                    }}
                    onClick={({ key }) => {
                        setActiveMenu(key);
                        if (isMobile) setMobileDrawerVisible(false);
                        const isTopLevelLeaf = allMenuItems.find(i => i.key === key && !i.children);
                        if (isTopLevelLeaf) setOpenMenuKeys([]);
                    }}
                    style={{ background: 'transparent', border: 'none', marginTop: '40px' }}
                    items={mapMenuItems(filteredMenuItems)}
                />
            </Sider>
    ), [
        collapsed, isDark, openMenuKeys, filteredMenuItems, isMobile, 
        rootSubmenuKeys, allMenuItems, activeMenu, logoLight, logoDark, language
    ]);

    const headerContent = React.useMemo(() => (
        <Header id="dashboard-header-root" className="no-print dashboard-header" style={{ background: 'var(--bg-main)', backdropFilter: 'blur(20px)', opacity: 0.95, padding: '0 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid var(--border-default)', height: '80px', zIndex: 1000 }}>
                    <Button type="text" onClick={() => setCollapsed(!collapsed)} style={{ color: 'var(--text-main)', fontWeight: 600, letterSpacing: '0.5px' }}>
                        {collapsed ? t('expand', language) : t('collapse', language)}
                    </Button>
                    <div style={{ position: 'relative' }}>
                        <button 
                            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                            style={{ 
                                background: 'transparent', 
                                border: '1px solid var(--border-default)', 
                                padding: '8px 16px', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                gap: '12px',
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                borderRadius: '8px',
                                height: '48px',
                                outline: 'none'
                            }}

                        >
                            <div style={{ textAlign: 'right', display: isMobile ? 'none' : 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                <div className="text-[var(--text-main)]" style={{ fontWeight: 600, fontSize: 13, lineHeight: 1, whiteSpace: 'nowrap' }}>{user?.name || 'User'}</div>
                                <div className="text-[var(--text-muted)]" style={{ fontWeight: 600, fontSize: 10, letterSpacing: '0.5px', lineHeight: 1 }}>{t(`role_${userRoleRaw.replace(/\s+/g, '')}`, language)}</div>
                            </div>
                            <Avatar 
                                size={36} 
                                src={getUploadUrl(user?.photo)}
                                icon={!user?.photo && <div className="branding-visible" style={{ color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>{user?.username?.charAt(0).toUpperCase() || 'U'}</div>}
                                style={{ background: '#3B82F6' }}
                            />
                        </button>

                        {isProfileMenuOpen && (
                            <>
                                <div 
                                    style={{ position: 'fixed', inset: 0, zIndex: 998 }} 
                                    onClick={() => setIsProfileMenuOpen(false)}
                                />
                                <div 
                                    className="profile-dropdown-luxury"
                                    style={{ 
                                        position: 'absolute', 
                                        top: 'calc(100% + 12px)', 
                                        right: '-20px', 
                                        minWidth: '280px',
                                        width: 'max-content',
                                        background: 'rgba(5, 7, 12, 0.98)',
                                        backdropFilter: 'blur(25px)',
                                        borderRadius: '20px',
                                        border: '1.2px solid rgba(59, 130, 246, 0.3)',
                                        boxShadow: '0 30px 80px rgba(0, 0, 0, 0.9), 0 0 20px rgba(59, 130, 246, 0.1)', 
                                        padding: '8px 0',
                                        zIndex: 9999,
                                        overflow: 'visible',
                                        animation: 'pageEnterSoft 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    {/* Profile Header Section - Optimized Slim Version */}
                                    <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(59, 130, 246, 0.15)', marginBottom: '4px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
                                            <Avatar 
                                                size={46} 
                                                src={getUploadUrl(user?.photo)}
                                                style={{ background: 'linear-gradient(135deg, #3B82F6, #2563EB)', border: '1.5px solid #3B82F6', flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.4)' }}
                                            />
                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '2px', minWidth: 0, flex: 1 }}>
                                                <div style={{ color: '#fff', fontWeight: 600, fontSize: '14px', lineHeight: 1.1, letterSpacing: '0.3px', whiteSpace: 'nowrap', overflow: 'visible', textAlign: 'center' }}>
                                                    {user?.name || 'User'}
                                                </div>
                                                <div 
                                                    style={{ 
                                                        display: 'inline-flex', 
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        padding: '1px 10px', 
                                                        borderRadius: '20px', 
                                                        border: '1px solid rgba(59, 130, 246, 0.3)', 
                                                        background: 'rgba(59, 130, 246, 0.1)',
                                                        color: '#3B82F6',
                                                        fontSize: '9px',
                                                        fontWeight: 600,
                                                        letterSpacing: '1px',
                                                        width: 'fit-content',
                                                        transition: 'all 0.3s ease',
                                                        cursor: 'default'
                                                    }}
                                                    onMouseEnter={(e) => {
                                                        e.currentTarget.style.boxShadow = '0 0 10px rgba(59, 130, 246, 0.4)';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.6)';
                                                    }}
                                                    onMouseLeave={(e) => {
                                                        e.currentTarget.style.boxShadow = 'none';
                                                        e.currentTarget.style.borderColor = 'rgba(59, 130, 246, 0.3)';
                                                    }}
                                                >
                                                    {userRoleRaw.charAt(0).toUpperCase() + userRoleRaw.slice(1)}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Menu Items */}
                                    {[
                                        { key: 'profile', label: 'My Profile', icon: <UserOutlined style={{ fontSize: '16px', color: '#3B82F6' }} />, hash: '/profile' },
                                        { key: '10', label: 'Settings', icon: <SettingOutlined style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }} />, hash: '/settings' },
                                        { key: 'themes', label: 'Theme Gallery', icon: <BgColorsOutlined style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)' }} />, hash: '/themes' },
                                    ].map((item) => (
                                        <div 
                                            key={item.key}
                                            onClick={() => { setActiveMenu(item.key); setIsProfileMenuOpen(false); window.location.hash = item.hash; }}
                                            style={{ 
                                                padding: '8px 16px', 
                                                fontWeight: 600, 
                                                fontSize: '14px', 
                                                cursor: 'pointer', 
                                                transition: 'all 0.2s ease', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                gap: '12px',
                                                color: 'rgba(255,255,255,0.9)',
                                                margin: '1px 8px',
                                                borderRadius: '8px'
                                            }}
                                            onMouseEnter={(e) => { 
                                                e.currentTarget.style.background = 'rgba(59, 130, 246, 0.12)'; 
                                                e.currentTarget.style.color = '#fff';
                                                e.currentTarget.style.transform = 'translateX(4px)';
                                            }}
                                            onMouseLeave={(e) => { 
                                                e.currentTarget.style.background = 'transparent'; 
                                                e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                                                e.currentTarget.style.transform = 'translateX(0)';
                                            }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', opacity: 0.8 }}>
                                                {item.icon}
                                            </div>
                                            <span style={{ letterSpacing: '0.3px' }}>{item.label}</span>
                                        </div>
                                    ))}

                                    <div style={{ height: '1px', background: 'rgba(251, 113, 133, 0.25)', margin: '8px 20px' }} />
                                    
                                    <div 
                                        onClick={logout}
                                        style={{ 
                                            padding: '10px 16px', 
                                            color: '#fb7185', 
                                            fontWeight: 600, 
                                            fontSize: '13px', 
                                            cursor: 'pointer', 
                                            transition: 'all 0.3s ease', 
                                            display: 'flex', 
                                            alignItems: 'center', 
                                            gap: '12px',
                                            margin: '2px 8px 6px 8px',
                                            borderRadius: '8px'
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = 'rgba(251, 113, 133, 0.1)';
                                            e.currentTarget.style.color = '#fff';
                                            e.currentTarget.style.transform = 'translateX(5px)';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'transparent';
                                            e.currentTarget.style.color = '#fb7185';
                                            e.currentTarget.style.transform = 'translateX(0)';
                                        }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px' }}>
                                            <PoweroffOutlined style={{ fontSize: '16px', color: '#fb7185' }} />
                                        </div>
                                        <span style={{ letterSpacing: '0.5px' }}>Logout system</span>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </Header>
    ), [collapsed, isProfileMenuOpen, isMobile, user, userRoleRaw]);

    return (
        <Layout style={{ minHeight: '100vh', background: 'transparent' }}>
            {siderContent}
            <Layout style={{ background: 'transparent' }}>
                {headerContent}
                <Content className="no-print-margin" style={{ margin: '24px', minHeight: 280 }}>
                    <ErrorBoundary>
                        <React.Suspense fallback={<div style={{ padding: '100px', textAlign: 'center', height: '60vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}><Spin size="large" tip="Loading module..." /></div>}>
                            {loading ? (
                                <div style={{ 
                                    padding: '100px', 
                                    textAlign: 'center', 
                                    height: '70vh', 
                                    display: 'flex', 
                                    flexDirection: 'column', 
                                    alignItems: 'center', 
                                    justifyContent: 'center',
                                    gap: '20px'
                                }}>
                                    <Spin size="large" />
                                    <div style={{ color: 'var(--text-main)', fontWeight: 600, fontSize: 16, letterSpacing: '1px' }}>
                                        Initializing ERP Hub...
                                    </div>
                                    <div style={{ color: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}>
                                        Syncing Workshop Database & Real-time Metrics
                                    </div>
                                    <div style={{ width: '100%', maxWidth: 400, marginTop: 20 }}>
                                        <Skeleton active paragraph={{ rows: 4 }} />
                                    </div>
                                </div>
                            ) : renderContent()}
                        </React.Suspense>
                    </ErrorBoundary>
                    {maintenanceActive && (
                        <div className="maintenance-overlay" style={{ background: 'rgba(0,0,0,0.8)' }}>
                            <div className="maintenance-card glass-card" style={{ border: '1px solid var(--accent)', background: 'var(--bg-main)' }}>
                                <Title level={3} style={{ color: 'var(--accent)', marginBottom: 6 }}>Under maintenance</Title>
                                <Text strong style={{ color: 'var(--text-main)', fontWeight: 600 }}>{maintenanceNotice}</Text>
                                <Text style={{ marginTop: 10, color: 'var(--text-muted)' }}>Only the owner can reopen the workshop for everyone.</Text>
                            </div>
                        </div>
                    )}
                </Content>
            </Layout>
        </Layout>
    );
};

export default MainLayout;





