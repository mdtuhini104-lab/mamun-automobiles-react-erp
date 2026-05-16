import React from 'react';
import axios from 'axios';
import databaseBridge from '../services/databaseBridge';
import { getApiBaseUrl } from '../utils/appConfig';

export const AuthContext = React.createContext();

export const useAuth = () => React.useContext(AuthContext);

const apiBaseUrl = getApiBaseUrl();

const api = axios.create({
    baseURL: apiBaseUrl,
    timeout: 15000,
    headers: {
        'Content-Type': 'application/json'
    }
});
const getInitialAuthState = () => {
    try {
        const session = localStorage.getItem('mamun_auth_session');
        const storedUser = localStorage.getItem('mamun_auth_user');

        if (session === 'true' && storedUser) {
            const parsedUser = JSON.parse(storedUser);
            if (parsedUser && (parsedUser.id || parsedUser._id)) {
                databaseBridge.setCurrentUser(parsedUser);
                return { isAuthenticated: true, user: parsedUser };
            }
        }
    } catch (e) {
        console.error("Failed to parse/verify stored user session", e);
        localStorage.removeItem('mamun_auth_session');
        localStorage.removeItem('mamun_auth_user');
    }
    return { isAuthenticated: false, user: null };
};

export const AuthProvider = ({ children }) => {
    const [authState, setAuthState] = React.useState(getInitialAuthState);
    const [loading, setLoading] = React.useState(false);

    const { isAuthenticated, user } = authState;
    React.useEffect(() => {
        // Initialization handled synchronously directly in state setup.
        // No bootstrap timeout required as no async operation is blocking load.
    }, []);

    const login = async (identifier, password) => {
        try {
            const response = await api.post('/auth/login', { identifier, password });
            const foundUser = response?.data?.data?.user;

            if (foundUser) {
                databaseBridge.setCurrentUser(foundUser);
                localStorage.setItem('mamun_auth_session', 'true');
                localStorage.setItem('mamun_auth_user', JSON.stringify(foundUser));
                localStorage.setItem('mamun_auth_email', foundUser.email || foundUser.name || identifier);
                localStorage.removeItem('mamun_user_data');
                setAuthState({ isAuthenticated: true, user: foundUser });
                return true;
            }
        } catch (error) {
            console.error("Login failed:", error);
            throw error; // Let the caller (LoginPage) handle the error and display messages
        }
        return false;
    };

    const logout = () => {
        databaseBridge.clearAuthHeaders();
        localStorage.clear();
        sessionStorage.clear();
        setAuthState({ isAuthenticated: false, user: null });
        // Force redirect to login hash
        window.location.hash = '#/login';
    };



    const resetPassword = async (email) => {
        try {
            const response = await api.post('/auth/forgot-password', { email });
            const ok = Boolean(response?.data?.success);
            const msg = response?.data?.message || (ok ? 'Reset request received.' : 'Reset failed.');
            return { success: ok, message: msg };
        } catch (error) {
            return {
                success: false,
                message: error?.response?.data?.message || 'Failed to send reset request.'
            };
        }
    };

    const verifyOTP = async (email, otp) => {
        try {
            const response = await api.post('/auth/verify-otp', { email, otp });
            if (response.data.success) {
                return { success: true, token: response.data.data.token };
            }
            return { success: false, message: 'Invalid or expired OTP.' };
        } catch (error) {
            return {
                success: false,
                message: error?.response?.data?.message || 'OTP verification failed.'
            };
        }
    };

    const completePasswordReset = async (token, password) => {
        try {
            const response = await api.post('/auth/reset-password-action', { token, password });
            const foundUser = response?.data?.data?.user;

            if (foundUser) {
                databaseBridge.setCurrentUser(foundUser);
                localStorage.setItem('mamun_auth_session', 'true');
                localStorage.setItem('mamun_auth_user', JSON.stringify(foundUser));
                localStorage.setItem('mamun_auth_email', foundUser.email || foundUser.name);
                setAuthState({ isAuthenticated: true, user: foundUser });
                return { success: true };
            }
            return { success: false, message: 'Reset failed. No user returned.' };
        } catch (error) {
            console.error("Password reset update failed:", error);
            return {
                success: false,
                message: error?.response?.data?.message || 'Failed to update password.'
            };
        }
    };

    const updateUserData = async (formData) => {
        try {
            const config = {
                headers: {
                    'Content-Type': 'multipart/form-data',
                    'x-user-id': user?.id,
                    'x-user-role': user?.role,
                    'x-user-email': user?.email
                }
            };
            const response = await api.patch('/users/upload-avatar', formData, config);

            if (response.data.success) {
                const updatedUser = response.data.data;
                setAuthState(prev => ({ ...prev, user: updatedUser }));
                localStorage.setItem('mamun_auth_user', JSON.stringify(updatedUser));
                databaseBridge.setCurrentUser(updatedUser);
                return { success: true, user: updatedUser };
            }
            return { success: false, message: 'Update failed' };
        } catch (error) {
            console.error("Profile update failed:", error);
            return {
                success: false,
                message: error?.response?.data?.message || 'Failed to update profile.'
            };
        }
    };

    const value = {
        isAuthenticated,
        user,
        login,
        logout,
        resetPassword,
        verifyOTP,
        completePasswordReset,
        updateUserData,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};




