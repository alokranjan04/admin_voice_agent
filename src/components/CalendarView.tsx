import React, { useState, useEffect } from 'react';
import { Loader2, Calendar as CalendarIcon, Clock, Users, Activity, ExternalLink, CalendarDays } from 'lucide-react';

interface EventData {
    id: string;
    summary: string;
    startTime: string;
    endTime: string;
    htmlLink: string;
}

interface CalendarMetrics {
    totalEventsNext7Days: number;
    eventsToday: number;
    availableSlotsToday: number;
    isHighlyAvailable: boolean;
}

export const CalendarView: React.FC = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [metrics, setMetrics] = useState<CalendarMetrics | null>(null);
    const [events, setEvents] = useState<EventData[]>([]);

    useEffect(() => {
        const fetchAvailability = async () => {
            setIsLoading(true);
            setError(null);
            try {
                const response = await fetch('/api/calendar/availability');
                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Failed to fetch calendar data');
                }

                setMetrics(data.metrics);
                setEvents(data.events);
            } catch (err: any) {
                console.error("Calendar fetch error:", err);
                setError(err.message || 'An unexpected error occurred.');
            } finally {
                setIsLoading(false);
            }
        };

        fetchAvailability();
    }, []);

    const formatTime = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(new Date(dateString));
    };

    const formatDate = (dateString: string) => {
        return new Intl.DateTimeFormat('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        }).format(new Date(dateString));
    };

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-indigo-500" />
                    <h3 className="text-lg font-semibold text-slate-800">Booking Availability Dashboard</h3>
                </div>
                <button
                    onClick={() => window.location.reload()}
                    className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
                >
                    Refresh Data
                </button>
            </div>

            <div className="p-6">
                {isLoading ? (
                    <div className="py-12 flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                        <p>Loading real-time calendar data...</p>
                    </div>
                ) : error ? (
                    <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
                        <h4 className="font-semibold mb-1">Could not load calendar</h4>
                        <p className="text-sm">{error}</p>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Metrics Grid */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-start gap-4">
                                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                    <Users className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Bookings Today</p>
                                    <h4 className="text-2xl font-bold text-slate-800">{metrics?.eventsToday || 0}</h4>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex items-start gap-4">
                                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
                                    <CalendarDays className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Next 7 Days</p>
                                    <h4 className="text-2xl font-bold text-slate-800">{metrics?.totalEventsNext7Days || 0} Bookings</h4>
                                </div>
                            </div>

                            <div className={`rounded-xl p-5 border flex items-start gap-4 ${metrics?.isHighlyAvailable ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
                                <div className={`p-3 rounded-lg ${metrics?.isHighlyAvailable ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                                    <Clock className="w-6 h-6" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-slate-500">Today's Availability</p>
                                    <h4 className="text-2xl font-bold text-slate-800">{metrics?.availableSlotsToday || 0} Slots Open</h4>
                                    <p className={`text-xs mt-1 font-medium ${metrics?.isHighlyAvailable ? 'text-emerald-600' : 'text-amber-600'}`}>
                                        {metrics?.isHighlyAvailable ? 'Good availability' : 'Busy schedule'}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Recent Events List */}
                        <div>
                            <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                <CalendarIcon className="w-4 h-4 text-slate-400" />
                                Upcoming Bookings
                            </h4>

                            {events.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl">
                                    <p className="text-slate-500">No upcoming bookings found.</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {events.map((event) => (
                                        <div key={event.id} className="flex items-center justify-between p-4 bg-white border border-slate-200 rounded-lg hover:border-indigo-300 transition-colors">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-slate-800">{event.summary || 'Reserved Slot'}</span>
                                                <div className="flex items-center gap-3 mt-1 text-sm text-slate-500 h-5">
                                                    <span className="flex items-center gap-1">
                                                        <CalendarIcon className="w-3.5 h-3.5" />
                                                        {formatDate(event.startTime)}
                                                    </span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3.5 h-3.5" />
                                                        {formatTime(event.startTime)} - {formatTime(event.endTime)}
                                                    </span>
                                                </div>
                                            </div>
                                            {event.htmlLink && (
                                                <a
                                                    href={event.htmlLink}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-slate-50 rounded-md transition-colors"
                                                    title="View in Google Calendar"
                                                >
                                                    <ExternalLink className="w-5 h-5" />
                                                </a>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
