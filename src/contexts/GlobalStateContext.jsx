import React from 'react';
import { getFromLocalStorage } from '../utils/helpers';
import dayjs from 'dayjs';
import databaseBridge from '../services/databaseBridge';
import { useAuth } from './AuthContext';

export const GlobalStateContext = React.createContext();

export const useGlobalState = () => React.useContext(GlobalStateContext);

const NOTIFICATIONS_STORAGE_KEY = 'mamun-notifications';

const readStoredNotifications = () => {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.localStorage.getItem(NOTIFICATIONS_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const defaultJobs = [
    {
        id: '1',
        vehicleNo: 'DHA-11-2034',
        customerName: 'Rahim Uddin',
        phone: '01711000000',
        description: 'Engine oil change and brake pad check',
        status: 'active',
        date: dayjs().subtract(1, 'day').toISOString(),
        parts: []
    }
];

const defaultCustomers = [
    {
        id: '1',
        name: 'Rahim Uddin',
        phone: '01711000000',
        vehicleNo: 'DHA-11-2034',
        balance: -1500,
        lastUpdated: dayjs().subtract(2, 'day').toISOString()
    },
    {
        id: '2',
        name: 'Karim Hasan',
        phone: '01822000000',
        vehicleNo: 'CTX-44-9988',
        balance: 500,
        lastUpdated: dayjs().toISOString()
    }
];

const defaultInventory = [
    { id: '1', name: 'Engine Oil 5W-30', category: 'Lubricants', purchasePrice: 2000, sellingPrice: 2500, companyRate: 2300, stock: 15, lowStockThreshold: 5 },
    { id: '2', name: 'Brake Pads (Front)', category: 'Parts', purchasePrice: 1500, sellingPrice: 2200, companyRate: 2000, stock: 3, lowStockThreshold: 4 },
    { id: '3', name: 'Hybrid Brake Pad', partName: 'Hybrid Brake Pad', category: 'Parts', purchasePrice: 3500, sellingPrice: 4500, companyRate: 4000, stock: 10, lowStockThreshold: 2 },
    { id: '4', name: 'Hybrid Brake Oil', partName: 'Hybrid Brake Oil', category: 'Fluids', purchasePrice: 800, sellingPrice: 1200, companyRate: 1100, stock: 20, lowStockThreshold: 5 },
];

const MASTER_TOGGLE_DEFINITIONS = [
    {
        key: 'ai_service',
        label: 'AI Diagnostic Responses',
        description: 'Enable or disable all AI diagnostic insights delivered to dashboards.',
        enabled: true,
        meta: { accent: '#3B82F6' }
    },
    {
        key: 'staff_access',
        label: 'Staff & Mechanic Modules',
        description: 'Lock Job Intake, Staff Portal, and Mechanic Dashboard for all staff roles.',
        enabled: true,
        meta: { lockedModules: ['job-intake', 'mechanic-dashboard', 'staff-portal'] }
    },
    {
        key: 'maintenance_mode',
        label: 'Maintenance Mode',
        description: 'Switch the platform into an Under Maintenance experience with a premium notice.',
        enabled: false,
        meta: {
            premiumNotice: 'Mamun Automobiles Luxury Workshop is under a premium maintenance window. The Owner will reopen the suite shortly.'
        }
    }
];

const reduceToggleList = (list = []) => {
    return (list || []).reduce((acc, item) => {
        if (item && item.key) {
            acc[item.key] = item;
        }
        return acc;
    }, {});
};

const mergeWithDefaultToggles = (incoming = []) => ({
    ...reduceToggleList(MASTER_TOGGLE_DEFINITIONS),
    ...reduceToggleList(incoming)
});

export const GlobalStateProvider = ({ children }) => {
    // 1. Initialize State with defaults (will be overwritten by database)
    const [jobCards, setJobCardsState] = React.useState([]);
    const [inventory, setInventoryState] = React.useState(defaultInventory);
    const [customers, setCustomersState] = React.useState([]);
    const [companies, setCompaniesState] = React.useState([]);
    const [expenses, setExpensesState] = React.useState([]);
    const [purchases, setPurchasesState] = React.useState([]);
    const [savedBills, setSavedBillsState] = React.useState([]);
    const [payments, setPaymentsState] = React.useState([]);
    const [stockActivity, setStockActivityState] = React.useState([]);
    const [usedItems, setUsedItemsState] = React.useState([]);
    const [cashInEntries, setCashInEntriesState] = React.useState([]);
    const [rentACars, setRentACarsState] = React.useState([]);
    const [rentACarCompanies, setRentACarCompaniesState] = React.useState([]);
    const [carInventory, setCarInventoryState] = React.useState([]);
    const [carSales, setCarSalesState] = React.useState([]);
    const [rentalTrips, setRentalTripsState] = React.useState([]);
    const [jobIntakes, setJobIntakesState] = React.useState([]);
    
    // Services (pre-set service templates with base rates)
    const [services, setServicesState] = React.useState([
        { id: '1', name: 'Mobil Change', basePrice: 500, companyRate: 450, category: 'Maintenance' },
        { id: '2', name: 'Engine Tuning', basePrice: 2000, companyRate: 1800, category: 'Engine' },
        { id: '3', name: 'Brake Service', basePrice: 1500, companyRate: 1350, category: 'Brakes' },
        { id: '4', name: 'AC Service', basePrice: 3000, companyRate: 2700, category: 'Cooling' },
        { id: '5', name: 'Tyre Change', basePrice: 800, companyRate: 720, category: 'Tyres' },
        { id: '6', name: 'Water Service', basePrice: 300, companyRate: 270, category: 'Maintenance' },
        { id: '7', name: 'Denting & Painting', basePrice: 5000, companyRate: 4500, category: 'Body Work' },
        { id: '8', name: 'Repair & Maintenance', basePrice: 1000, companyRate: 900, category: 'Maintenance' },
    ]);
    
    // Staff Salaries
    const [salaries, setSalariesState] = React.useState([]);
    const [independentStaffs, setIndependentStaffsState] = React.useState([]);
    const [userManagement, setUserManagementState] = React.useState([]);
    
    // Departments and job posts for ACL and staff profiles
    const [departments, setDepartmentsState] = React.useState(['Water Service', 'Engine', 'AC', 'Electric', 'Paint', 'Dent', 'Accounts', 'Manager', 'Admin']);
    const [jobPosts, setJobPostsState] = React.useState(['Department Head', 'Senior Technician', 'Technician', 'Junior Technician', 'Helper', 'Junior Helper', 'Accountant', 'Manager', 'Admin']);
    const [suppliers, setSuppliersState] = React.useState([]);
    const [notifications, setNotificationsState] = React.useState(() => readStoredNotifications());
    const [loading, setLoading] = React.useState(true);
    const [loans, setLoansState] = React.useState([]);
    const [quotations, setQuotationsState] = React.useState([]);
    const [featureToggles, setFeatureTogglesState] = React.useState(() => mergeWithDefaultToggles());
    const [vehicleModels, setVehicleModelsState] = React.useState([]);
    const [inventorySearchTerm, setInventorySearchTerm] = React.useState('');
    const [language, setLanguageState] = React.useState(() => {
        if (typeof window === 'undefined') return 'en';
        return window.localStorage.getItem('app-language') || 'en';
    });


    // Navigation callback ref
    const navigateRef = React.useRef(null);
    const registerNavigate = React.useCallback((fn) => { navigateRef.current = fn; }, []);
    const navigateTo = React.useCallback((menuKey) => {
        if (navigateRef.current) navigateRef.current(menuKey);
    }, []);

    const isCustomCollection = (key) => databaseBridge.shouldUseCustomForKey(key);

    const loadCustomCollections = async () => {
        if (!databaseBridge.isCustomMode()) return;
        try {
            const [customJobCards, customInventory, customSalaries, customCashInEntries] = await Promise.all([
                databaseBridge.fetchCollection('jobCards'),
                databaseBridge.fetchCollection('inventory'),
                databaseBridge.fetchCollection('salaries'),
                databaseBridge.fetchCollection('cashInEntries')
            ]);
            if (customJobCards.length > 0) setJobCardsState(customJobCards);
            if (customInventory.length > 0) setInventoryState(customInventory);
            if (customSalaries.length > 0) setSalariesState(customSalaries);
            if (customCashInEntries.length > 0) setCashInEntriesState(customCashInEntries);
        } catch (error) {
            console.error('Custom backend bootstrap failed:', error);
        }
    };

    // 2. Load All Data from MongoDB on startup
    const { user, isAuthenticated } = useAuth();

    // 2. Load All Data from MongoDB on startup or when user changes
    React.useEffect(() => {
        const bootstrapAllData = async () => {
            // Only bootstrap if authenticated
            if (!isAuthenticated) {
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const isCustomer = user?.role === 'Customer';
                const commonParams = isCustomer ? { 
                    customerId: user.id,
                    vehicleNo: user.vehicleNo 
                } : {};

                // Robust fetching: each fetch is independent to prevent one failure from blocking all
                const fetchSafe = async (key, setter, params = {}) => {
                    try {
                        const data = await databaseBridge.fetchCollection(key, { ...commonParams, ...params });
                        if (data && (Array.isArray(data) ? data.length >= 0 : true)) {
                            const actualData = data.pagination && Array.isArray(data.data) ? data.data : data;
                            setter(actualData);
                        }
                    } catch (err) {
                        console.warn(`Bootstrap failed for ${key}:`, err.message);
                    }
                };

                const fetchMethodSafe = async (methodName, setter, params = {}) => {
                    try {
                        if (databaseBridge[methodName]) {
                            // Some specific methods might not support params yet, but we'll try to pass them if they do
                            const data = await databaseBridge[methodName]({ ...commonParams, ...params });
                            if (data) setter(data);
                        }
                    } catch (err) {
                        console.warn(`Bootstrap failed for method ${methodName}:`, err.message);
                    }
                };

                // Execute all fetches in parallel, each handling its own success/failure
                const promises = [
                    fetchSafe('jobCards', setJobCardsState),
                    fetchSafe('payments', setPaymentsState),
                    fetchSafe('savedBills', setSavedBillsState),
                ];

                // Staff-only or General data
                if (!isCustomer) {
                    promises.push(
                        fetchSafe('customers', setCustomersState, { limit: 1000 }),
                        fetchSafe('inventory', setInventoryState),
                        fetchSafe('salaries', setSalariesState),
                        fetchSafe('cashInEntries', setCashInEntriesState),
                        fetchSafe('expenses', setExpensesState),
                        fetchSafe('purchases', setPurchasesState),
                        fetchSafe('users', setUserManagementState),
                        fetchSafe('suppliers', setSuppliersState),
                        fetchSafe('loans', setLoansState),
                        fetchSafe('quotations', setQuotationsState),
                        fetchSafe('jobIntakes', setJobIntakesState),
                        fetchSafe('usedItems', setUsedItemsState),
                        fetchSafe('companies', (comps) => comps && setCompaniesState(comps)),
                        fetchSafe('services', (svcs) => svcs && setServicesState(svcs)),
                        fetchMethodSafe('fetchRentalCars', setRentACarsState),
                        fetchMethodSafe('fetchRentalTrips', setRentalTripsState),
                        fetchMethodSafe('fetchCarInventory', setCarInventoryState),
                        fetchMethodSafe('fetchCarSales', setCarSalesState),
                        fetchMethodSafe('fetchVehicleModels', setVehicleModelsState),
                    );
                } else {
                    // For customers, we still might want their profile or basic info
                    promises.push(
                        fetchSafe('customers', setCustomersState), // Middleware will restrict to ONLY them
                        fetchSafe('jobIntakes', setJobIntakesState), // Now enabled for customers too
                    );
                }

                await Promise.all(promises);

            } catch (error) {
                console.error("Critical MongoDB Bootstrap Error:", error);
            } finally {
                // Ensure loading is set to false regardless of success/failure
                setLoading(false);
            }
        };
        
        // Immediate unblocking for authenticated users to allow shell rendering
        if (isAuthenticated) {
             // We can still trigger bootstrap but don't strictly have to wait for the VERY first render to be unblocked
             // if we want "instant" feel. However, bootstrapAllData handles its own setLoading(true)
             bootstrapAllData();
        } else {
             setLoading(false);
        }
    }, [isAuthenticated, user?.id, user?.role]);

    const saveToUnified = async (key, value) => {
        if (databaseBridge?.supportsCollection?.(key)) {
            try {
                await databaseBridge.saveCollection(key, value);
            } catch (err) {
                console.error(`Error saving ${key} to custom backend:`, err);
            }
        }
    };

    const safeGetLocalData = (key, defaultVal) => defaultVal;

    React.useEffect(() => {
        if (typeof window === 'undefined') return;
        try {
            window.localStorage.setItem(NOTIFICATIONS_STORAGE_KEY, JSON.stringify(notifications || []));
        } catch { }
    }, [notifications]);

    const resolveUpdater = (currentValue, nextValueOrUpdater) => (
        typeof nextValueOrUpdater === 'function' ? nextValueOrUpdater(currentValue) : nextValueOrUpdater
    );

    // 4. Synchronized Setters
    const setJobCards = (data) => {
        const next = resolveUpdater(jobCards, data);
        setJobCardsState(next);
        saveToUnified('jobCards', next);
    };
    const setInventory = (data) => {
        const next = resolveUpdater(inventory, data);
        setInventoryState(next);
        saveToUnified('inventory', next);
    };
    const setCustomers = (data) => {
        const next = resolveUpdater(customers, data);
        setCustomersState(next);
        saveToUnified('customers', next);
    };
    const setCompanies = (data) => {
        const next = resolveUpdater(companies, data);
        setCompaniesState(next);
        saveToUnified('companies', next);
    };
    const setExpenses = (data) => {
        const next = resolveUpdater(expenses, data);
        setExpensesState(next);
        saveToUnified('expenses', next);
    };
    const setPurchases = (data) => {
        const next = resolveUpdater(purchases, data);
        setPurchasesState(next);
        saveToUnified('purchases', next);
    };
    const setSavedBills = (data) => {
        const next = resolveUpdater(savedBills, data);
        setSavedBillsState(next);
        saveToUnified('savedBills', next);
    };
    const setPayments = (data) => {
        const next = resolveUpdater(payments, data);
        setPaymentsState(next);
        saveToUnified('payments', next);
    };
    const setStockActivity = (data) => {
        const next = resolveUpdater(stockActivity, data);
        setStockActivityState(next);
        saveToUnified('stockActivity', next);
    };
    const setUsedItems = (data) => {
        const next = resolveUpdater(usedItems, data);
        setUsedItemsState(next);
        saveToUnified('usedItems', next);
    };
    const setCashInEntries = (data) => {
        const next = resolveUpdater(cashInEntries, data);
        setCashInEntriesState(next);
        saveToUnified('cashInEntries', next);
    };
    const setServices = (data) => {
        const next = resolveUpdater(services, data);
        setServicesState(next);
        saveToUnified('services', next);
    };
    const setSalaries = (data) => {
        const next = resolveUpdater(salaries, data);
        setSalariesState(next);
        saveToUnified('salaries', next);
    };
    const setIndependentStaffs = (data) => {
        const next = resolveUpdater(independentStaffs, data);
        setIndependentStaffsState(next);
        saveToUnified('independentStaffs', next);
    };
    const setUserManagement = (data) => { setUserManagementState(resolveUpdater(userManagement, data)); };
    const setDepartments = (data) => {
        const next = resolveUpdater(departments, data);
        setDepartmentsState(next);
        saveToUnified('departments', next);
    };
    const setJobPosts = (data) => {
        const next = resolveUpdater(jobPosts, data);
        setJobPostsState(next);
        saveToUnified('jobPosts', next);
    };
    const setRentACars = (data) => {
        const next = resolveUpdater(rentACars, data);
        setRentACarsState(next);
        saveToUnified('rentACars', next);
    };
    const setRentACarCompanies = (data) => {
        const next = resolveUpdater(rentACarCompanies, data);
        setRentACarCompaniesState(next);
        saveToUnified('rentACarCompanies', next);
    };
    const setCarInventory = (data) => {
        const next = resolveUpdater(carInventory, data);
        setCarInventoryState(next);
        saveToUnified('carInventory', next);
    };
    const setCarSales = (data) => {
        const next = resolveUpdater(carSales, data);
        setCarSalesState(next);
        saveToUnified('carSales', next);
    };
    const setRentalTrips = (data) => {
        const next = resolveUpdater(rentalTrips, data);
        setRentalTripsState(next);
        saveToUnified('rentalTrips', next);
    };
    const setSuppliers = (data) => {
        const next = resolveUpdater(suppliers, data);
        setSuppliersState(next);
        saveToUnified('suppliers', next);
    };
    const setLoans = (data) => {
        const next = resolveUpdater(loans, data);
        setLoansState(next);
        saveToUnified('loans', next);
    };
    const setQuotations = (data) => {
        const next = resolveUpdater(quotations, data);
        setQuotationsState(next);
        saveToUnified('quotations', next);
    };
    const setJobIntakes = (data) => {
        const next = resolveUpdater(jobIntakes, data);
        setJobIntakesState(next);
        saveToUnified('jobIntakes', next);
    };
    const setVehicleModels = (data) => {
        const next = resolveUpdater(vehicleModels, data);
        setVehicleModelsState(next);
    };

    const setLanguage = (lang) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            window.localStorage.setItem('app-language', lang);
        }
    };

    const refreshFeatureToggles = React.useCallback(async () => {
        try {
            const toggles = await databaseBridge.fetchFeatureToggles();
            setFeatureTogglesState(mergeWithDefaultToggles(toggles));
        } catch (error) {
            console.error('Feature toggle refresh failed:', error);
        }
    }, []);

    React.useEffect(() => {
        refreshFeatureToggles();
    }, [refreshFeatureToggles]);

    const toggleFeature = React.useCallback(async (key, enabled) => {
        const updated = await databaseBridge.updateFeatureToggle(key, { enabled });
        setFeatureTogglesState((prev) => ({
            ...prev,
            [updated.key]: updated
        }));
        return updated;
    }, []);

    const addExpense = (expense) => {
        setExpenses([expense, ...(expenses || [])]);
        logActivity(`Expense recorded: ${expense.title || expense.category || ''}`);
    };
    const addPayment = (payment) => {
        setPayments([payment, ...(payments || [])]);
        logActivity(`Payment recorded: ${payment.description || payment.customerName || ''}`);
    };
    const addBill = (bill) => {
        setSavedBills([bill, ...(savedBills || [])]);
        logActivity(`Invoice generated: ${bill.billNo || bill.id}`);
    };
    const addCashInEntry = async (entry) => {
        if (isCustomCollection('cashInEntries')) {
            try {
                const persisted = await databaseBridge.addCashInEntry(entry);
                const savedEntry = persisted && typeof persisted === 'object' ? persisted : entry;
                const next = [savedEntry, ...(cashInEntries || []).filter(item => item.id !== savedEntry.id)];
                setCashInEntriesState(next);
                logActivity(`Cash in recorded: ${savedEntry.sourceType || 'Manual'} - ${savedEntry.amount || 0}`);
                return;
            } catch (err) {
                console.error('Custom cash in save failed:', err);
            }
        }
        setCashInEntries([entry, ...(cashInEntries || [])]);
        logActivity(`Cash in recorded: ${entry.sourceType || 'Manual'} - ${entry.amount || 0}`);
    };
    const addSalaryRecord = (salary) => {
        setSalaries([salary, ...(salaries || [])]);
        logActivity(`Salary record added for ${salary.staffName}`);
    };
    const fetchCheques = async (filters = {}) => {
        if (!databaseBridge.isCustomMode()) return [];
        try { return await databaseBridge.fetchCheques(filters); } catch (err) { return []; }
    };
    const createChequeEntry = async (payload) => {
        if (!databaseBridge.isCustomMode()) return null;
        try { return await databaseBridge.createCheque(payload); } catch (err) { return null; }
    };
    const updateChequeEntryStatus = async (chequeId, payload) => {
        if (!databaseBridge.isCustomMode()) return null;
        try { return await databaseBridge.updateChequeStatus(chequeId, payload); } catch (err) { return null; }
    };
    const logActivity = (messageText) => {
        const newActivity = { id: Date.now().toString(), message: messageText, timestamp: new Date().toISOString() };
        const updatedActivities = [newActivity, ...stockActivity].slice(0, 20);
        setStockActivity(updatedActivities);
    };
    const updateCustomerLedger = ({ customerName, phone, vehicleNo, dueAmount }) => {
        const latestCustomers = customers;
        const latestBills = savedBills || [];
        const latestPayments = payments || [];
        const existingCustomerIndex = latestCustomers.findIndex(c => (c.phone && c.phone === phone) || (c.name && c.name.toLowerCase() === customerName.toLowerCase()));
        let updatedList = [...latestCustomers];
        let c;
        if (existingCustomerIndex !== -1) { c = { ...updatedList[existingCustomerIndex] }; }
        else { c = { id: Date.now().toString(), name: customerName, phone: phone, vehicleNo: vehicleNo || '', initialBalance: 0, balance: 0, lastUpdated: dayjs().toISOString() }; }
        const customerBills = latestBills.filter(b => b.customerId === c.id || (b.customerName && b.phone && b.customerName.toLowerCase() === c.name.toLowerCase() && b.phone === c.phone));
        const totalDue = customerBills.reduce((sum, b) => sum + (Number(b.due) || 0), 0);
        const customerPayments = latestPayments.filter(p => (!p.invoiceId) && (p.customerId === c.id || (p.customerName && p.customerName.toLowerCase() === c.name.toLowerCase() && p.phone === c.phone)));
        const totalPayments = customerPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const initial = c.initialBalance || 0;
        c.balance = initial + totalPayments - totalDue;
        c.lastUpdated = dayjs().toISOString();
        if (existingCustomerIndex !== -1) { updatedList[existingCustomerIndex] = c; }
        else { updatedList = [c, ...updatedList]; }
        saveToUnified('customers', updatedList);
        setCustomersState(updatedList);
        return { isNewCustomer: existingCustomerIndex === -1 };
    };
    const generateSafeId = (prefix = '') => {
        const ts = Date.now().toString(36);
        const r = Math.random().toString(36).slice(2, 6);
        return prefix ? `${prefix}-${ts}-${r}`.toUpperCase() : `${ts}-${r}`.toUpperCase();
    };
    const pushNotification = React.useCallback((payload) => {
        const notification = {
            id: payload?.id || `NTF-${Date.now()}`,
            type: payload?.type || 'info', title: payload?.title || 'Update',
            message: payload?.message || '', timestamp: payload?.timestamp || dayjs().toISOString(),
            read: false, audience: payload?.audience || ['Admin', 'Manager', 'SuperAdmin'],
            linkMenuKey: payload?.linkMenuKey || null, meta: payload?.meta || {}
        };
        setNotificationsState((prev) => [notification, ...(prev || [])].slice(0, 100));
        return notification;
    }, []);
    const markNotificationRead = React.useCallback((notificationId) => {
        setNotificationsState((prev) => (prev || []).map((item) => (item.id === notificationId ? { ...item, read: true } : item)));
    }, []);
    const markAllNotificationsRead = React.useCallback((role) => {
        const normalizedRole = String(role || '').toLowerCase();
        setNotificationsState((prev) => (prev || []).map((item) => {
            const audience = (item.audience || []).map((entry) => String(entry).toLowerCase());
            if (!normalizedRole || audience.length === 0 || audience.includes(normalizedRole)) { return { ...item, read: true }; }
            return item;
        }));
    }, []);
    const smartAlerts = React.useMemo(() => {
        const lowStockItems = (inventory || [])
            .filter((item) => Number(item?.stock || 0) < Number(item?.lowStockThreshold || 5))
            .map((item) => ({
                ...item, severity: Number(item?.stock || 0) === 0 ? 'critical' : 'warning',
                purchaseHistory: (purchases || []).flatMap((purchase) => (purchase.items || []).map((line) => ({ ...line, purchaseDate: purchase.date, purchaseId: purchase.id }))).filter((line) => line.inventoryId === item.id || String(line.name || '').toLowerCase() === String(item.name || '').toLowerCase()).sort((a, b) => new Date(b.purchaseDate || 0) - new Date(a.purchaseDate || 0)).slice(0, 3)
            }));

        const overduePOs = (purchases || [])
            .filter(po => po.status === 'Pending' && dayjs().diff(dayjs(po.orderDate), 'day') >= 7)
            .map(po => ({
                ...po,
                daysPending: dayjs().diff(dayjs(po.orderDate), 'day')
            }));

        const alerts = [];
        if (lowStockItems.length > 0) {
            alerts.push({
                message: `Smart Alert: ${lowStockItems.length} low-stock item(s) need attention`,
                description: lowStockItems.slice(0, 5).map((item) => `${item.name || item.partName || 'Unknown Part'} (${item.stock ?? 0} left)`).join(' • '),
                type: 'error'
            });
        }
        if (overduePOs.length > 0) {
            alerts.push({
                message: `Critical: ${overduePOs.length} Purchase Order(s) are overdue (Pending > 7 days)`,
                description: "Please follow up with suppliers or mark orders as received in the Purchase Orders section.",
                type: 'warning',
                action: { label: 'View Orders', key: 'purchase-orders' }
            });
        }

        return { lowStockItems, overduePOs, alerts };
    }, [inventory, purchases]);

    const returnToInventory = (partsToReturn) => {
        if (!Array.isArray(partsToReturn) || partsToReturn.length === 0) return;
        setInventoryState(prev => {
            const next = [...prev];
            partsToReturn.forEach(item => {
                const idx = next.findIndex(p => p.id === item.partId);
                if (idx !== -1) { next[idx] = { ...next[idx], stock: (next[idx].stock || 0) + (item.quantity || 0) }; }
            });
            saveToUnified('inventory', next);
            return next;
        });
    };

    const fetchCustomersPaged = React.useCallback(async (page, limit, search = '') => {
        try {
            const params = { page, limit };
            if (search) params.search = search;
            const result = await databaseBridge.fetchCollection('customers', params);
            if (result && result.pagination) {
                return result;
            }
            return { data: result, pagination: { total: result.length, page, limit } };
        } catch (error) {
            console.error('Failed to fetch paged customers:', error);
            return { data: [], pagination: { total: 0, page, limit } };
        }
    }, []);

    const fetchBillsPaged = React.useCallback(async (page, limit, search = '') => {
        try {
            const params = { page, limit };
            if (search) params.search = search;
            const result = await databaseBridge.fetchCollection('savedBills', params);
            if (result && result.pagination) {
                return result;
            }
            return { data: result, pagination: { total: result.length, page, limit } };
        } catch (error) {
            console.error('Failed to fetch paged bills:', error);
            return { data: [], pagination: { total: 0, page, limit } };
        }
    }, []);

    return (
        <GlobalStateContext.Provider value={{
            jobCards, setJobCards,
            inventory, setInventory,
            customers, setCustomers,
            companies, setCompanies,
            expenses, setExpenses,
            purchases, setPurchases,
            savedBills, setSavedBills,
            payments, setPayments,
            stockActivity, setStockActivity,
            usedItems, setUsedItems,
            cashInEntries, setCashInEntries,
            services, setServices,
            salaries, setSalaries,
            independentStaffs, setIndependentStaffs,
            userManagement, setUserManagement,
            departments, setDepartments,
            jobPosts, setJobPosts,
            rentACars, setRentACars,
            rentACarCompanies, setRentACarCompanies,
            carInventory, setCarInventory,
            carSales, setCarSales,
            rentalTrips, setRentalTrips,
            suppliers, setSuppliers,
            loans, setLoans,
            quotations, setQuotations,
            jobIntakes, setJobIntakes,
            addExpense, addPayment, addBill, addCashInEntry, addSalaryRecord,
            logActivity, safeGetLocalData, updateCustomerLedger,
            registerNavigate, navigateTo, notifications, pushNotification,
            fetchCheques, createChequeEntry, updateChequeEntryStatus,
            markNotificationRead, markAllNotificationsRead, smartAlerts,
            featureToggles, refreshFeatureToggles, toggleFeature,
            generateSafeId, returnToInventory, loading,
            fetchCustomersPaged, fetchBillsPaged,
            vehicleModels, setVehicleModels,
            inventorySearchTerm, setInventorySearchTerm,
            language, setLanguage
        }}>
            {children}
        </GlobalStateContext.Provider>
    );
};




