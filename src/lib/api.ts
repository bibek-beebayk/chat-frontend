const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
    private baseURL: string;
    private csrfToken: string | null = null;

    constructor() {
        this.baseURL = API_URL;
    }

    public setCsrfToken(token: string) {
        this.csrfToken = token;
    }

    private getCookie(name: string): string | null {
        if (typeof document === 'undefined') return null;
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

    // Check if body is FormData
    private isFormData(body: any): boolean {
        return typeof FormData !== 'undefined' && body instanceof FormData;
    }

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        const headers: Record<string, string> = {
            ...(options.headers as Record<string, string>),
        };

        // Only set Content-Type to application/json if it's NOT FormData
        if (options.body && !this.isFormData(options.body)) {
            headers['Content-Type'] = 'application/json';
        }

        const csrfToken = this.csrfToken || this.getCookie('csrftoken');
        if (csrfToken) {
            headers['X-CSRFToken'] = csrfToken;
        }

        const config: RequestInit = {
            ...options,
            headers,
            credentials: 'include', // Important for session cookies
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401 || response.status === 403) {
                    // Dispatch event for AuthContext to handle
                    if (typeof window !== 'undefined') {
                        window.dispatchEvent(new Event('auth:unauthorized'));
                    }
                }
                throw new Error(data.error || data.detail || 'An error occurred');
            }

            return data;
        } catch (error) {
            if (error instanceof Error) {
                throw error;
            }
            throw new Error('An unexpected error occurred');
        }
    }

    // GET request
    async get<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'GET' });
    }

    // POST request
    async post<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    // POST FormData request
    async postFormData<T>(endpoint: string, formData: FormData): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'POST',
            body: formData,
        });
    }

    // PUT request
    async put<T>(endpoint: string, data?: any): Promise<T> {
        return this.request<T>(endpoint, {
            method: 'PUT',
            body: JSON.stringify(data),
        });
    }

    // DELETE request
    async delete<T>(endpoint: string): Promise<T> {
        return this.request<T>(endpoint, { method: 'DELETE' });
    }
}

export const apiClient = new ApiClient();
