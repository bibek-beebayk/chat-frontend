'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';

const API_BASE = process.env.NEXT_PUBLIC_API_URL;

// Helper component to wrap SearchParams logic
function SetPasswordForm() {
    const searchParams = useSearchParams();
    const router = useRouter();

    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    const next = searchParams.get('next') || '/';

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
    const [errorMsg, setErrorMsg] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            setErrorMsg("Passwords do not match");
            setStatus('error');
            return;
        }

        setStatus('loading');
        setErrorMsg('');

        try {
            const res = await fetch(`${API_BASE}/api/events/set-password/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ uid, token, password, confirm_password: confirmPassword }),
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to set password');

            // Auto Login - Store Tokens
            if (data.access && data.refresh) {
                localStorage.setItem('accessToken', data.access);
                localStorage.setItem('refreshToken', data.refresh);
                // Also setting cookie if your app uses it, but localStorage is common for JWT
            }

            setStatus('success');

            // Redirect after short delay
            setTimeout(() => {
                router.push(next);
            }, 2000);

        } catch (err) {
            console.error(err);
            setErrorMsg(err instanceof Error ? err.message : 'Something went wrong');
            setStatus('error');
        }
    };

    if (!uid || !token) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
                <p className="text-red-500">Invalid Link. Missing parameters.</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-[#1a0b2e] text-white p-4">
            <div className="w-full max-w-md p-8 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-xl">
                <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-[#ffd700] to-[#fffacD] bg-clip-text text-transparent">
                    Complete Setup
                </h1>

                {status === 'success' ? (
                    <div className="text-center">
                        <h2 className="text-xl text-green-400 mb-2">Password Set!</h2>
                        <p className="text-gray-300">Redirecting you to the event...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-[#ffd700] mb-1">New Password</label>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full p-3 rounded-lg bg-black/30 border border-[#ffd700]/30 text-white focus:outline-none focus:border-[#ffd700]"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[#ffd700] mb-1">Confirm Password</label>
                            <input
                                type="password"
                                required
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="w-full p-3 rounded-lg bg-black/30 border border-[#ffd700]/30 text-white focus:outline-none focus:border-[#ffd700]"
                            />
                        </div>

                        {status === 'error' && (
                            <p className="text-red-400 text-sm text-center bg-red-500/10 p-2 rounded">{errorMsg}</p>
                        )}

                        <button
                            type="submit"
                            disabled={status === 'loading'}
                            className="w-full py-3 px-6 rounded-full bg-gradient-to-r from-[#ffd700] to-[#ffb900] text-[#1a0b2e] font-bold uppercase transition hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {status === 'loading' ? 'Setting Password...' : 'Set Password & Enter'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}

export default function SetPasswordPage() {
    return (
        <Suspense fallback={<div>Loading...</div>}>
            <SetPasswordForm />
        </Suspense>
    );
}
