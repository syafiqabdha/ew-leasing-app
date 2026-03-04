import React, { useState, useEffect } from 'react';
import { Bell, X, Trash2, Plus, Clock, User } from 'lucide-react';

// --- DATA SERVICE (SIMULATED BACKEND) ---

// Helper for relative time
const getRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
};

// Generates a random color class for properties (consistent by string)
const getPropertyColor = (name) => {
    if (!name || name === 'General') return 'bg-red-100 text-red-600 border-red-200';

    // Simple hash to select color consistently for same name
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);

    // Palette of vibrant but readable colors
    const colors = [
        'bg-blue-100 text-blue-600 border-blue-200',
        'bg-emerald-100 text-emerald-600 border-emerald-200',
        'bg-violet-100 text-violet-600 border-violet-200',
        'bg-amber-100 text-amber-600 border-amber-200',
        'bg-cyan-100 text-cyan-600 border-cyan-200',
        'bg-fuchsia-100 text-fuchsia-600 border-fuchsia-200',
        'bg-lime-100 text-lime-600 border-lime-200'
    ];

    return colors[Math.abs(hash) % colors.length];
};

// --- CONFIGURATION ---
const API_URL = '/api'; // Relative path (Proxied by Vite)

// --- HOOKS ---
export function useAnnouncements(user) {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(false);

    const fetchAnnouncements = async () => {
        const token = localStorage.getItem('token');
        if (!token) return;

        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/announcements`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setAnnouncements(data);
            }
        } catch (err) {
            console.error("Failed to load announcements", err);
        }
        setLoading(false);
    };

    // Initial load
    useEffect(() => {
        if (user && user.role !== 'viewer') {
            fetchAnnouncements();
        }
    }, [user]);

    const createAnnouncement = async (title, desc, expiry, targetProperty) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/announcements`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    title,
                    description: desc,
                    expiry_date: expiry,
                    target_property: targetProperty
                })
            });

            if (res.ok) {
                fetchAnnouncements();
            }
        } catch (err) {
            console.error(err);
            alert('Failed to create announcement');
        }
    };

    const deleteAnnouncement = async (id) => {
        const token = localStorage.getItem('token');
        try {
            await fetch(`${API_URL}/announcements/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            // Update local state immediately
            setAnnouncements(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            console.error(err);
            alert('Failed to delete announcement');
        }
    };

    return { announcements, loading, createAnnouncement, deleteAnnouncement };
}

// --- COMPONENTS ---

export function NotificationBell({ count, onClick, isMobile = false }) {
    return (
        <button
            onClick={onClick}
            className={`
        relative p-2 rounded-xl transition-all duration-200
        ${isMobile ? 'text-slate-600 hover:bg-slate-100 mr-2' : 'border border-transparent hover:border-indigo-100 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 mr-2'}
      `}
        >
            <Bell size={isMobile ? 24 : 20} className={count > 0 ? "animate-pulse" : ""} />
            {count > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-red-500 text-white text-[10px] font-bold items-center justify-center">
                        {count > 9 ? '9+' : count}
                    </span>
                </span>
            )}
        </button>
    );
}

export function NotificationPanel({ isOpen, onClose, user, malls, isMobile, announcements, loading, onCreate, onDelete }) {
    // Create Form State
    const [showForm, setShowForm] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [expiryDate, setExpiryDate] = useState('');

    const [targetProperty, setTargetProperty] = useState('General');

    const handleCreate = (e) => {
        e.preventDefault();
        if (!newTitle || !newDesc) return;
        onCreate(newTitle, newDesc, expiryDate, targetProperty);
        // Reset form
        setNewTitle('');
        setNewDesc('');
        setExpiryDate('');
        setTargetProperty('General');
        setShowForm(false);
    };

    const canCreate = ['admin', 'director', 'staff'].includes(user?.role);
    const canDelete = ['admin', 'director'].includes(user?.role);

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 transition-opacity"
                onClick={onClose}
            />

            {/* Panel */}
            <div className={`
        fixed z-50 bg-white shadow-2xl transition-all duration-300 ease-in-out flex flex-col
        ${isMobile
                    ? 'top-16 left-0 right-0 border-b border-t border-slate-200 max-h-[80vh] animate-in slide-in-from-top-4'
                    : 'top-0 right-0 h-full w-96 border-l border-slate-100 animate-in slide-in-from-right'
                }
      `}>
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50/50">
                    <div className="flex items-center">
                        <Bell size={18} className="text-indigo-600 mr-2" />
                        <h3 className="font-bold text-slate-700">Notifications</h3>
                        <span className="ml-2 bg-indigo-100 text-indigo-600 text-xs px-2 py-0.5 rounded-full font-bold">
                            {announcements.length}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-200 rounded-full transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 bg-slate-50/30">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 space-y-3">
                            <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            <p className="text-xs text-slate-400">Syncing updates...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {/* Create New - visible to Admin/Staff */}
                            {canCreate && (
                                <div className="mb-6">
                                    {!showForm ? (
                                        <button
                                            onClick={() => setShowForm(true)}
                                            className="w-full py-2 border-2 border-dashed border-indigo-200 rounded-xl text-indigo-500 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus size={18} /> Post Announcement
                                        </button>
                                    ) : (
                                        <div className="bg-white p-4 rounded-xl shadow-sm border border-indigo-100 animate-in fade-in zoom-in-95">
                                            <div className="flex justify-between items-center mb-3">
                                                <h4 className="text-sm font-bold text-indigo-900">New Announcement</h4>
                                                <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
                                            </div>
                                            <form onSubmit={handleCreate} className="space-y-3">
                                                <input
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                    placeholder="Title"
                                                    value={newTitle}
                                                    onChange={e => setNewTitle(e.target.value)}
                                                    required
                                                />
                                                <textarea
                                                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all resize-none"
                                                    placeholder="What's happening?"
                                                    rows={3}
                                                    value={newDesc}
                                                    onChange={e => setNewDesc(e.target.value)}
                                                    required
                                                />

                                                {/* Property Selection */}
                                                <div className="flex flex-col gap-1">
                                                    <label className="text-xs text-slate-400 font-medium uppercase">Target Property:</label>
                                                    <select
                                                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                                        value={targetProperty}
                                                        onChange={e => setTargetProperty(e.target.value)}
                                                    >
                                                        <option value="General">General</option>
                                                        {malls && malls.map(mall => (
                                                            <option key={mall.id} value={mall.name}>{mall.name}</option>
                                                        ))}
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-400 font-medium uppercase">Expires:</span>
                                                    <input
                                                        type="date"
                                                        className="px-2 py-1 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-600 focus:outline-none focus:border-indigo-400"
                                                        value={expiryDate}
                                                        onChange={e => setExpiryDate(e.target.value)}
                                                    />
                                                </div>
                                                <button type="submit" className="w-full bg-linear-to-r from-indigo-600 to-purple-600 text-white py-2 rounded-lg text-sm font-bold shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-0.5 transition-all">
                                                    Post Now
                                                </button>
                                            </form>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* List */}
                            {announcements.length === 0 ? (
                                <div className="text-center py-10 opacity-50">
                                    <Bell size={48} className="mx-auto mb-2 text-slate-300" />
                                    <p className="text-slate-500">No new announcements at the moment.</p>
                                </div>
                            ) : (
                                announcements.map((item) => (
                                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 relative group hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <div className='pr-6'>
                                                <h4 className="font-bold text-slate-800 leading-tight">{item.title}</h4>

                                                {/* Property Tag */}
                                                <div className="flex items-center mt-1">
                                                    <span className={`
                                                        text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border
                                                        ${getPropertyColor(item.target_property)}
                                                    `}>
                                                        {item.target_property || 'General'}
                                                    </span>
                                                </div>
                                            </div>

                                            {canDelete && (
                                                <button
                                                    onClick={() => onDelete(item.id)}
                                                    className="opacity-0 group-hover:opacity-100 bg-red-50 text-red-500 p-1.5 rounded-md hover:bg-red-100 transition-all absolute top-2 right-2"
                                                    title="Delete"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        <p className="text-slate-600 text-sm mb-3 leading-relaxed">{item.description}</p>

                                        <div className="flex items-center justify-between pt-3 border-t border-slate-50 mt-2">
                                            <div className="flex items-center text-xs text-slate-400">
                                                <User size={12} className="mr-1" />
                                                <span className="font-medium mr-1">{item.author}</span>
                                                <span className="bg-slate-100 text-slate-500 px-1.5 rounded text-[10px] uppercase font-bold tracking-wider">{item.role}</span>
                                            </div>
                                            <div className="flex items-center text-xs text-indigo-400 font-medium">
                                                <Clock size={12} className="mr-1" />
                                                {getRelativeTime(item.created_at)}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
