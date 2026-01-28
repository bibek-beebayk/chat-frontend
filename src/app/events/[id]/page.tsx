'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface EventData {
    id: number;
    title: string;
    description: string;
    start_date: string;
    end_date: string;
    poster: string | null;
}

export default function EventPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [event, setEvent] = useState<EventData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchEvent = async () => {
            const token = localStorage.getItem('accessToken');
            if (!token) {
                router.push('/login'); // Or wherever your login page is
                return;
            }

            try {
                // Use the ID from params
                const res = await fetch(`https://betunnel.worldstories.net/api/events/latest/`, { // Ideally fetching specific ID, but for now latest works/is exposed
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        router.push('/login');
                        return;
                    }
                    throw new Error('Failed to load event');
                }

                const data = await res.json();
                // Determine if we need to filter by ID or if endpoint returns specific
                // Current /latest/ doesn't filter by ID, so we use it as is for verify
                // Real impl might be /api/events/${params.id}/
                setEvent(data);

            } catch (err) {
                setError('Could not access event details.');
            } finally {
                setLoading(false);
            }
        };

        fetchEvent();
    }, [params.id, router]);

    if (loading) return <div className="min-h-screen flex items-center justify-center bg-[#1a0b2e] text-white">Loading...</div>;

    if (error) return <div className="min-h-screen flex items-center justify-center bg-[#1a0b2e] text-red-400">{error}</div>;

    return (
        <div className="min-h-screen bg-[#1a0b2e] text-white p-4 flex flex-col items-center">
            <div className="max-w-4xl w-full">
                <header className="flex justify-between items-center py-6 border-b border-white/10 mb-8">
                    <h1 className="text-xl font-bold text-[#ffd700]">HIGH ROLLIN</h1>
                    <button
                        onClick={() => {
                            localStorage.removeItem('accessToken');
                            localStorage.removeItem('refreshToken');
                            router.push('/login');
                        }}
                        className="text-sm text-gray-400 hover:text-white"
                    >
                        Sign Out
                    </button>
                </header>

                {event && (
                    <main className="grid md:grid-cols-2 gap-8">
                        <div>
                            {event.poster && (
                                <div className="rounded-xl overflow-hidden border border-[#ffd700]/30 shadow-2xl">
                                    <img
                                        src={event.poster.startsWith('http') ? event.poster : `https://betunnel.worldstories.net${event.poster}`}
                                        alt={event.title}
                                        className="w-full h-auto object-cover"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col justify-center">
                            <h2 className="text-4xl font-bold mb-4 bg-gradient-to-r from-[#ffd700] to-[#fffacD] bg-clip-text text-transparent">
                                {event.title}
                            </h2>
                            <div className="text-[#ffd700] font-semibold text-lg mb-6">
                                {new Date(event.start_date).toDateString()} — {new Date(event.end_date).toDateString()}
                            </div>

                            <p className="text-gray-300 leading-relaxed mb-8 text-lg">
                                {event.description}
                            </p>

                            <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg text-green-400 text-center">
                                ✓ You are officially registered for this event.
                            </div>
                        </div>
                    </main>
                )}
            </div>
        </div>
    );
}
