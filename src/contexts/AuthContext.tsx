'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { User, LoginData, RegisterData } from '@/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: LoginData) => Promise<User>;
    register: (data: RegisterData) => Promise<{ email: string; email_sent: boolean }>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
    verifyOTP: (email: string, otpCode: string) => Promise<User>;
    resendOTP: (email: string) => Promise<void>;
    verifyUserID: (userId: string, otp: string) => Promise<User>;
    initiateVerificationRequest: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ... imports
// (Note: interface LoginData/RegisterData likely needs no change if inputs are same)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const data = await apiClient.get<User>('/api/auth/me/');
            setUser(data);
            localStorage.setItem('user', JSON.stringify(data));
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
            setUser(JSON.parse(storedUser));
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

        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.user;
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

        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
        return response.user;
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
        if (user) {
            const updatedUser: User = { ...user, verification_status: 'pending' };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
        }
    };

    const verifyUserID = async (userId: string, otp: string) => {
        const response = await apiClient.post<{ message: string; user: any; status: string }>(
            '/api/auth/verify-user-id/',
            { user_id: userId, otp }
        );

        if (user) {
            const updatedUser: User = {
                ...user,
                verification_status: response.status as User['verification_status']
            };
            setUser(updatedUser);
            localStorage.setItem('user', JSON.stringify(updatedUser));
            return updatedUser;
        }

        throw new Error('User not found in state');
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

    return (
        <AuthContext.Provider value={{
            user,
            loading,
            login,
            register,
            logout,
            checkAuth,
            verifyOTP,
            resendOTP,
            verifyUserID,
            initiateVerificationRequest
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
