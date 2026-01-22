'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import { User, LoginData, RegisterData } from '@/types';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    login: (data: LoginData) => Promise<void>;
    register: (data: RegisterData) => Promise<void>;
    logout: () => Promise<void>;
    checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const checkAuth = async () => {
        try {
            const data = await apiClient.get<User>('/api/auth/me/');
            setUser(data);
            // Store in localStorage to persist across page refreshes
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
            setLoading(false);
        }

        // Then verify with backend
        checkAuth();
    }, []);

    const login = async (data: LoginData) => {
        const response = await apiClient.post<{ user: User; message: string }>(
            '/api/auth/login/',
            data
        );
        setUser(response.user);
        localStorage.setItem('user', JSON.stringify(response.user));
    };

    const register = async (data: RegisterData) => {
        await apiClient.post<{ user: User; message: string }>(
            '/api/auth/register/',
            data
        );
        // After registration, redirect to login
    };

    const logout = async () => {
        try {
            await apiClient.post('/api/auth/logout/');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            localStorage.removeItem('user');
        }
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, register, logout, checkAuth }}>
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
