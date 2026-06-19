'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { rewardsApi } from '@/lib/rewards';
import { User, LoginData, RegisterData } from '@/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: LoginData) => Promise<User>;
    googleLogin: (credential: string) => Promise<User>;
    register: (data: RegisterData) => Promise<{ email: string; email_sent: boolean }>;
    logout: () => Promise<void>;
    deleteAccount: () => Promise<void>;
    checkAuth: () => Promise<void>;
    verifyOTP: (email: string, otpCode: string) => Promise<User>;
    resendOTP: (email: string) => Promise<void>;
    verifyUserID: (userId: string, otp: string) => Promise<User>;
    initiateVerificationRequest: () => Promise<void>;
    forgotPasswordInit: (email: string) => Promise<void>;
    forgotPasswordVerify: (email: string, otpCode: string) => Promise<string>;
    forgotPasswordConfirm: (resetToken: string, newPassword: string, confirmNewPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const normalizeUserType = (value: unknown): User['user_type'] => {
    const normalized = String(value ?? '').trim().toLowerCase();
    if (normalized === 'agent' || normalized === 'staff') return normalized;
    return 'player';
};

const normalizeUser = (raw: User): User => ({
    ...raw,
    user_type: normalizeUserType(raw?.user_type),
});

const recordPlayerVisit = (currentUser: User) => {
    if (currentUser.user_type !== 'player') return;
    rewardsApi.recordVisit().catch(() => {
        // Streak recording should never block normal app navigation.
    });
};

// ... imports
// (Note: interface LoginData/RegisterData likely needs no change if inputs are same)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const data = await apiClient.get<User>('/api/auth/me/');
            const normalized = normalizeUser(data);
            setUser(normalized);
            localStorage.setItem('user', JSON.stringify(normalized));
            recordPlayerVisit(normalized);
        } catch (error) {
            setUser(null);
            localStorage.removeItem('user');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Try to get user from localStorage first
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            try {
                const parsed = JSON.parse(storedUser) as User;
                setUser(normalizeUser(parsed));
            } catch {
                localStorage.removeItem('user');
            }
        }

        // Initialize Auth
        // ApiClient constructor already loads tokens from localStorage.
        // We just verify validity by fetching user.
        checkAuth();

        const handleUnauthorized = () => {
            setUser(null);
            localStorage.removeItem('user');
            // apiClient clears tokens internally on final failure, but we can ensure it here if we want
            setLoading(false);
        };

        window.addEventListener('auth:unauthorized', handleUnauthorized);
        return () => {
            window.removeEventListener('auth:unauthorized', handleUnauthorized);
        };
    }, []);

    const login = async (data: LoginData) => {
        const response = await apiClient.post<{ user: User; access: string; refresh: string }>(
            '/api/auth/login/',
            data,
            { skipAuth: true }
        );

        apiClient.setTokens(response.access, response.refresh);
        const normalized = normalizeUser(response.user);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        recordPlayerVisit(normalized);
        return normalized;
    };

    const googleLogin = async (credential: string) => {
        const response = await apiClient.post<{ user: User; access: string; refresh: string }>(
            '/api/auth/google-login/',
            { credential },
            { skipAuth: true }
        );

        apiClient.setTokens(response.access, response.refresh);
        const normalized = normalizeUser(response.user);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        recordPlayerVisit(normalized);
        return normalized;
    };

    const register = async (data: RegisterData) => {
        const response = await apiClient.post<{ message: string; email: string; email_sent: boolean }>(
            '/api/auth/register/',
            data,
            { skipAuth: true }
        );
        return { email: response.email, email_sent: response.email_sent };
    };

    const verifyOTP = async (email: string, otpCode: string) => {
        const response = await apiClient.post<{ user: User; access: string; refresh: string }>(
            '/api/auth/verify-otp/',
            { email, otp_code: otpCode },
            { skipAuth: true }
        );

        apiClient.setTokens(response.access, response.refresh);
        const normalized = normalizeUser(response.user);
        setUser(normalized);
        localStorage.setItem('user', JSON.stringify(normalized));
        recordPlayerVisit(normalized);
        return normalized;
    };

    const resendOTP = async (email: string) => {
        await apiClient.post<{ message: string }>(
            '/api/auth/resend-otp/',
            { email },
            { skipAuth: true }
        );
    };

    const initiateVerificationRequest = async () => {
        await apiClient.post('/api/auth/initiate-verification-request/');
        // Do not update user status to pending here. 
        // The OTP flow is handled within the modal, and verification is synchronous.
        // Updating it to 'pending' blocks the Verify button if the modal is closed.
    };

    const verifyUserID = async (userId: string, otp: string) => {
        const response = await apiClient.post<{ message: string; user: any; status: string }>(
            '/api/auth/verify-user-id/',
            { user_id: userId, otp }
        );

        if (response.status === 'verified') {
            if (user) {
                const updatedUser: User = {
                    ...user,
                    is_verified: true,
                    verification_status: 'approved'
                };
                setUser(updatedUser);
                localStorage.setItem('user', JSON.stringify(updatedUser));
                return updatedUser;
            }
        } else {
            throw new Error(response.message || 'Verification failed');
        }

        throw new Error('User not found in state');
    };

    const forgotPasswordInit = async (email: string) => {
        await apiClient.post('/api/auth/forgot-password/initiate/', { email }, { skipAuth: true });
    };

    const forgotPasswordVerify = async (email: string, otpCode: string) => {
        const response = await apiClient.post<{ reset_token: string }>(
            '/api/auth/forgot-password/verify-otp/',
            { email, otp_code: otpCode },
            { skipAuth: true }
        );
        return response.reset_token;
    };

    const forgotPasswordConfirm = async (resetToken: string, newPassword: string, confirmNewPassword: string) => {
        await apiClient.post(
            '/api/auth/forgot-password/complete/',
            { reset_token: resetToken, new_password: newPassword, confirm_new_password: confirmNewPassword },
            { skipAuth: true }
        );
    };

    const logout = async () => {
        try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
                await apiClient.post('/api/auth/logout/', { refresh: refreshToken });
            }
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            apiClient.clearTokens();
            setUser(null);
            localStorage.removeItem('user');
        }
    };

    const deleteAccount = async () => {
        await apiClient.delete('/api/auth/delete-account/');
        apiClient.clearTokens();
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            googleLogin,
            register,
            logout,
            deleteAccount,
            checkAuth,
            verifyOTP,
            resendOTP,
            verifyUserID,
            initiateVerificationRequest,
            forgotPasswordInit,
            forgotPasswordVerify,
            forgotPasswordConfirm
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
