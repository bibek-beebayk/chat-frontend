const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Custom API Error class
export class ApiError extends Error {
    public status?: number;
    public code?: string;
    public errors?: Record<string, any>;

    constructor(message: string, status?: number, code?: string, errors?: Record<string, any>) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
        this.code = code;
        this.errors = errors;
    }
}

class ApiClient {
    private baseURL: string;
    private accessToken: string | null = null;
    private refreshToken: string | null = null;
    private isRefreshing = false;
    private failedQueue: any[] = [];

    constructor() {
        this.baseURL = API_URL;
        // Try to load from localStorage on init (optional, but helpful if static)
        if (typeof window !== 'undefined') {
            this.accessToken = localStorage.getItem('accessToken');
            this.refreshToken = localStorage.getItem('refreshToken');
        }
    }

    public setTokens(access: string, refresh: string) {
        this.accessToken = access;
        this.refreshToken = refresh;
        if (typeof window !== 'undefined') {
            localStorage.setItem('accessToken', access);
            localStorage.setItem('refreshToken', refresh);
        }
    }

    public clearTokens() {
        this.accessToken = null;
        this.refreshToken = null;
        if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('user'); // Clean up user as well
        }
    }

    private processQueue(error: any, token: string | null = null) {
        this.failedQueue.forEach(prom => {
            if (error) {
                prom.reject(error);
            } else {
                prom.resolve(token);
            }
        });
        this.failedQueue = [];
    }

    private isFormData(body: any): boolean {
        return typeof FormData !== 'undefined' && body instanceof FormData;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit & { skipAuth?: boolean; _retry?: boolean } = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
        };

        if (options.body && !this.isFormData(options.body)) {
            headers['Content-Type'] = 'application/json';
        }

        if (!options.skipAuth && typeof window !== 'undefined') {
            this.accessToken = this.accessToken || localStorage.getItem('accessToken');
            this.refreshToken = this.refreshToken || localStorage.getItem('refreshToken');
        }

        if (this.accessToken && !options.skipAuth) {
            headers['Authorization'] = `Bearer ${this.accessToken}`;
        }

        const config: RequestInit = {
            ...options,
            headers,
        };

        try {
            const response = await fetch(url, config);

            // Handle 401 for Token Refresh
            if (response.status === 401 && !options._retry && !options.skipAuth) {
                if (this.isRefreshing) {
                    return new Promise((resolve, reject) => {
                        this.failedQueue.push({ resolve, reject });
                    }).then(token => {
                        // Retry with new token
                        headers['Authorization'] = `Bearer ${token}`;
                        return this.request<T>(endpoint, { ...options, headers });
                    });
                }

                if (this.refreshToken) {
                    options._retry = true;
                    this.isRefreshing = true;

                    try {
                        const refreshResponse = await fetch(`${this.baseURL}/api/auth/token/refresh/`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ refresh: this.refreshToken }),
                        });

                        if (refreshResponse.ok) {
                            const data = await refreshResponse.json();
                            // Depending on backend, might return 'access' and/or 'refresh'
                            const newAccess = data.access;
                            const newRefresh = data.refresh || this.refreshToken; // Use old if not rotated, but settings say rotate

                            this.setTokens(newAccess, newRefresh);
                            this.isRefreshing = false;
                            this.processQueue(null, newAccess);

                            // Retry original
                            return this.request<T>(endpoint, options);
                        } else {
                            // Refresh failed
                            throw new Error('Refresh failed');
                        }
                    } catch (err) {
                        this.isRefreshing = false;
                        this.processQueue(err, null);
                        this.clearTokens();
                        if (typeof window !== 'undefined') {
                            // Dispatch event for UI to redirect to login
                            window.dispatchEvent(new Event('auth:unauthorized'));
                        }
                        throw new ApiError('Session expired', 401, 'session_expired');
                    }
                }
            }


            const data = await response.json().catch(() => ({})); // Handle empty responses

            if (!response.ok) {
                // Parse standard error format: { message, code, errors, ... }
                // Fallback to legacy format if needed
                const message = data.message || data.detail || data.error || 'An error occurred';
                const code = data.code || 'unknown_error';
                const errors = data.errors || null;

                throw new ApiError(message, response.status, code, errors);
            }

            // Standard Response Unwrapping
            if (data && data.status === 'success' && data.data !== undefined) {
                return data.data;
            }

            return data;
        } catch (error) {
            if (error instanceof ApiError) {
                throw error;
            }
            if (error instanceof Error) {
                throw new ApiError(error.message);
            }
            throw new ApiError('An unexpected error occurred');
        }
    }

    // GET request
    async get<T>(endpoint: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'GET' });
    }

    // POST request
    async post<T>(endpoint: string, data?: any, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // POST FormData request
    async postFormData<T>(endpoint: string, formData: FormData, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'POST',
            body: formData,
        });
    }

    // PUT request
    async put<T>(endpoint: string, data?: any, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // PATCH request
    async patch<T>(endpoint: string, data?: any, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data),
        });
    }

    // PATCH FormData request
    async patchFormData<T>(endpoint: string, formData: FormData, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, {
            ...options,
            method: 'PATCH',
            body: formData,
        });
    }

    // DELETE request
    async delete<T>(endpoint: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
