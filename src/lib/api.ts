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
    // ... (previous members)

    // ... (constructor and auth methods)
    private baseURL: string;
    private csrfToken: string | null = null;
    private sessionToken: string | null = null;

    constructor() {
        this.baseURL = API_URL;
    }

    public setCsrfToken(token: string) {
        this.csrfToken = token;
    }

    public setSessionToken(token: string) {
        this.sessionToken = token;
    }

    private getCookie(name: string): string | null {
        if (typeof document === 'undefined') return null;
        let cookieValue = null;
        if (document.cookie && document.cookie !== '') {
            const cookies = document.cookie.split(';');
            for (let i = 0; i < cookies.length; i++) {
                const cookie = cookies[i].trim();
                if (cookie.substring(0, name.length + 1) === (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }

    private isFormData(body: any): boolean {
        return typeof FormData !== 'undefined' && body instanceof FormData;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit & { skipAuth?: boolean } = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
        };

        if (options.body && !this.isFormData(options.body)) {
            headers['Content-Type'] = 'application/json';
        }

        const csrfToken = this.csrfToken || this.getCookie('csrftoken');
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        if (this.sessionToken && !options.skipAuth) {
            headers['Authorization'] = `Session ${this.sessionToken}`;
        }

        const config: RequestInit = {
            ...options,
            headers,
            credentials: 'include',
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('auth:unauthorized'));
                    }
                }

                // Parse standard error format: { message, code, errors, ... }
                // Fallback to legacy format if needed
                const message = data.message || data.detail || data.error || 'An error occurred';
                const code = data.code || 'unknown_error';
                const errors = data.errors || null;

                throw new ApiError(message, response.status, code, errors);
            }

            // Standard Response Unwrapping
            // If the backend sends { status: 'success', data: ... }, unwrap it
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

    // DELETE request
    async delete<T>(endpoint: string, options: RequestInit & { skipAuth?: boolean } = {}): Promise<T> {
        return this.request<T>(endpoint, { ...options, method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
