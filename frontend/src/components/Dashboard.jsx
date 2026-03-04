import React, { useState, useEffect, useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, PieChart, Pie,
    ResponsiveContainer, Tooltip, Legend
} from 'recharts';
import {
    Plus, Trash2, Building, LayoutGrid, Activity,
    Settings, User, FileText, Search, AlertTriangle, Menu, X, Check,
    ChevronLeft, ChevronRight, Users, ChevronDown
} from 'lucide-react';

const API_URL = '/api';

const CollapsibleWidget = ({ title, icon, children, headerRight, defaultExpanded = true, contentClassName = "", className = "" }) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    return (
        <div className={`glass-card flex flex-col transition-all duration-300 overflow-hidden ${className}`}>
            <div
                className={`p-5 md:p-6 flex justify-between items-center cursor-pointer select-none transition-colors hover:bg-white/10 ${expanded ? 'border-b border-white/20' : ''}`}
                onClick={(e) => {
                    if (e.target.closest('.no-collapse')) return;
                    setExpanded(!expanded);
                }}
            >
                <div className="flex items-center gap-3 w-full overflow-hidden">
                    {icon && (
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-inner shrink-0">
                            {icon}
                        </div>
                    )}
                    {typeof title === 'string' ? <h3 className="text-lg font-bold text-slate-700 truncate">{title}</h3> : title}
                </div>
                <div className="flex flex-1 items-center justify-end gap-3 pl-2">
                    {headerRight && <div className="no-collapse flex items-center">{headerRight}</div>}
                    <div className={`p-1.5 rounded-lg bg-white/50 text-slate-400 transition-transform duration-300 shrink-0 ${expanded ? 'rotate-180' : ''}`}>
                        <ChevronDown size={18} />
                    </div>
                </div>
            </div>
            <div
                className={`transition-all duration-500 ease-in-out`}
                style={{
                    maxHeight: expanded ? '2500px' : '0px',
                    opacity: expanded ? 1 : 0,
                    overflow: 'visible'
                }}
            >
                <div className={`p-5 md:p-6 ${contentClassName}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

const COLORS = ['#6d5dfc', '#ff6b6b', '#48bb78', '#f6ad55', '#4fd1c5', '#9f7aea'];

const DashboardAvatar = ({ user, size = 'sm' }) => {
    const sizeClasses = { sm: 'w-8 h-8 text-xs', md: 'w-10 h-10 text-sm' };
    if (user?.avatarUrl) {
        return <img src={user.avatarUrl} alt={user.firstName || user.email} className={`${sizeClasses[size]} rounded-full object-cover shadow-sm ring-2 ring-white`} title={user.firstName || user.email} />;
    }
    const getInitials = () => {
        if (user?.firstName && user?.lastName) return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        if (user?.firstName) return user.firstName[0].toUpperCase();
        if (user?.email) return user.email[0].toUpperCase();
        return 'U';
    };
    const getColor = () => {
        const c = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
        let hash = 0;
        const nameStr = user?.email || user?.firstName || 'user';
        for (let i = 0; i < nameStr.length; i++) hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
        return c[Math.abs(hash) % c.length];
    };
    return (
        <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white shadow-sm font-bold tracking-wider ${getColor()} ring-2 ring-white`} title={user.firstName || user.email}>
            {getInitials()}
        </div>
    );
};

export default function Dashboard({ user, malls, units }) {
    const [notes, setNotes] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [noteContent, setNoteContent] = useState('');
    const [userStatus, setUserStatus] = useState({ online: [], offline: [] });
    const [showNotesPanel, setShowNotesPanel] = useState(false);

    useEffect(() => {
        fetchNotes();
        fetchUserStatus();
        const interval = setInterval(fetchUserStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    const fetchUserStatus = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/users/status`, { headers: { 'Authorization': `Bearer ${token}` } });
            if (res.ok) setUserStatus(await res.json());
        } catch (err) {
            console.error("Failed to fetch user status");
        }
    };

    const fetchNotes = async () => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/dashboard/notes`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) setNotes(await res.json());
        } catch (err) {
            console.error("Failed to fetch notes");
        }
    };

    const handleAddNote = async (e) => {
        e.preventDefault();
        if (!noteContent.trim()) return;

        const token = localStorage.getItem('token');
        try {
            const target_date = selectedDate.toISOString().split('T')[0];
            const res = await fetch(`${API_URL}/dashboard/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ target_date, content: noteContent })
            });
            if (res.ok) {
                setNoteContent('');
                fetchNotes();
            }
        } catch (err) {
            alert('Failed to add note');
        }
    };

    const handleDeleteNote = async (id) => {
        const token = localStorage.getItem('token');
        try {
            const res = await fetch(`${API_URL}/dashboard/notes/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) fetchNotes();
        } catch (err) {
            alert('Failed to delete note');
        }
    };

    // --- CHART DATA (With Simulated 6-Month History) ---
    const chartData = useMemo(() => {
        return malls.map((mall, idx) => {
            const mallUnits = units.filter(u => u.mall_id === mall.id);
            const total = mallUnits.length;
            const vacant = mallUnits.filter(u => u.status === 'vacant').length;
            const occupied = total - vacant;

            // Build 6-month realistic simulation looking backward
            const history = [];
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            const today = new Date();
            let currentTempVacant = Math.min(total, vacant + Math.floor(Math.random() * 8) + 1); // Started with more vacancies 5 months ago

            for (let i = 5; i >= 0; i--) {
                const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
                const monthStr = monthNames[d.getMonth()];

                if (i === 0) {
                    history.push({ name: monthStr, occupied, vacant, total });
                } else {
                    const simOccupied = Math.max(0, total - currentTempVacant);
                    history.push({ name: monthStr, occupied: simOccupied, vacant: currentTempVacant, total });
                    // Improve vacancy randomly for the next loop to simulate leasing progress
                    currentTempVacant = Math.max(vacant, currentTempVacant - Math.floor(Math.random() * 3));
                }
            }

            return {
                id: mall.id,
                name: mall.name,
                total: total,
                vacant,
                occupied,
                occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0,
                history,
                fill: COLORS[idx % COLORS.length]
            };
        });
    }, [malls, units]);

    const totalPortfolioStats = useMemo(() => {
        const total = units.length;
        const vacant = units.filter(u => u.status === 'vacant').length;
        return {
            total,
            vacant,
            occupied: total - vacant,
            occupancyRate: total > 0 ? ((total - vacant) / total * 100).toFixed(1) : 0
        };
    }, [units]);

    // --- CALENDAR LOGIC ---
    const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const calendarDays = useMemo(() => {
        const year = selectedDate.getFullYear();
        const month = selectedDate.getMonth();
        const days = [];
        const totalDays = daysInMonth(year, month);
        const firstDay = firstDayOfMonth(year, month);

        for (let i = 0; i < firstDay; i++) days.push(null);
        for (let i = 1; i <= totalDays; i++) days.push(new Date(year, month, i));

        return days;
    }, [selectedDate]);

    const selectedDateNotes = useMemo(() => {
        const dStr = selectedDate.toISOString().split('T')[0];
        return notes.filter(n => n.target_date === dStr);
    }, [notes, selectedDate]);

    const changeMonth = (offset) => {
        const nextDate = new Date(selectedDate);
        nextDate.setMonth(selectedDate.getMonth() + offset);
        setSelectedDate(nextDate);
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">

            <style>{`
        .glass-card {
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          border-radius: 24px;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07);
        }
        .calendar-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--accent);
          margin-top: 2px;
        }
      `}</style>

            {/* HEADER SECTION */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Executive Overview</h1>
                    <p className="text-slate-500 font-medium">Welcome back, <span className="text-indigo-600 font-bold">{user.firstName || (user.email ? user.email.split('@')[0] : 'User')}</span>.</p>
                </div>
                <div className="glass-card px-4 py-2 flex items-center space-x-3">
                    <div className="neu-icon-box bg-green-50 text-green-600 shadow-none scale-90">
                        <LayoutGrid size={18} />
                    </div>
                    <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Portfolio Occupancy</p>
                        <p className="text-lg font-bold text-slate-700">{totalPortfolioStats.occupancyRate}%</p>
                    </div>
                </div>
            </div>

            {/* PROPERTY PERFORMANCE CARDS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {chartData.map((mallData) => (
                    <CollapsibleWidget
                        key={mallData.id}
                        title={<span className="text-sm font-bold text-slate-700 truncate max-w-[140px] block">{mallData.name}</span>}
                        headerRight={
                            <div className="px-3 py-1 rounded-full bg-slate-100/80 border border-slate-200 text-[10px] font-black tracking-widest text-slate-500 uppercase whitespace-nowrap shadow-sm">
                                {mallData.total} Units
                            </div>
                        }
                        contentClassName="flex flex-col h-[320px] pt-2"
                        className="h-auto"
                    >
                        {/* Radial Occupancy Meter (PieChart Gauge) */}
                        <div className="flex justify-center mb-6 h-[140px] relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'Occupied', value: mallData.occupancyRate, fill: mallData.fill },
                                            { name: 'Vacant', value: 100 - mallData.occupancyRate, fill: '#f1f5f9' }
                                        ]}
                                        cx="50%" cy="100%"
                                        startAngle={180} endAngle={0}
                                        innerRadius={80} outerRadius={100}
                                        dataKey="value"
                                        stroke="none"
                                        cornerRadius={5}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute bottom-0 left-0 w-full flex flex-col items-center justify-end pb-1 translate-y-4">
                                <span className="text-4xl font-black text-slate-800 leading-none">{mallData.occupancyRate}%</span>
                                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider mt-2">Occupancy</span>
                            </div>
                        </div>

                        {/* 6-Month Trend Chart */}
                        <div className="flex-1 mt-auto relative min-h-[100px] border-t border-slate-100 pt-4 border-dashed">
                            <div className="flex justify-between items-end mb-2">
                                <h4 className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">6-Month Trend</h4>
                                <div className="flex gap-3">
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center"><span className="w-2 h-2 rounded-full mr-1 opacity-80" style={{ backgroundColor: mallData.fill }}></span>Occupied</span>
                                    <span className="text-[10px] font-bold text-slate-500 flex items-center"><span className="w-2 h-2 rounded-full mr-1 bg-slate-300"></span>Vacant</span>
                                </div>
                            </div>
                            <div className="h-[90px] w-full mt-2 relative -left-4">
                                <ResponsiveContainer width="110%" height="100%">
                                    <AreaChart data={mallData.history} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                        <defs>
                                            <linearGradient id={`colorOccupied_${mallData.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor={mallData.fill} stopOpacity={0.5} />
                                                <stop offset="95%" stopColor={mallData.fill} stopOpacity={0} />
                                            </linearGradient>
                                            <linearGradient id={`colorVacant_${mallData.id}`} x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#e2e8f0" stopOpacity={0.8} />
                                                <stop offset="95%" stopColor="#f8fafc" stopOpacity={0.2} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" opacity={0.5} />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 600 }} dy={5} />
                                        <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }} />
                                        <Area type="monotone" dataKey="vacant" stackId="1" stroke="#cbd5e1" strokeWidth={0} fillOpacity={1} fill={`url(#colorVacant_${mallData.id})`} />
                                        <Area type="monotone" dataKey="occupied" stackId="1" stroke={mallData.fill} strokeWidth={2} fillOpacity={1} fill={`url(#colorOccupied_${mallData.id})`} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </CollapsibleWidget>
                ))}
            </div>

            {/* ROW 3: CALENDAR & TEAM STATUS */}
            <div className="flex flex-col gap-8">
                {/* CALENDAR & NOTES COMBINED */}
                <CollapsibleWidget
                    title="Team Calendar"
                    icon={<LayoutGrid size={20} />}
                    headerRight={
                        <div className="flex items-center space-x-2 bg-slate-50 p-1 rounded-xl border border-slate-100 shadow-sm shrink-0">
                            <button onClick={() => changeMonth(-1)} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-600 hover:text-indigo-600 shadow-sm"><ChevronLeft size={16} /></button>
                            <div className="px-2 text-xs font-bold text-slate-700 min-w-[100px] text-center tracking-wide">
                                {selectedDate.toLocaleString('default', { month: 'short', year: 'numeric' })}
                            </div>
                            <button onClick={() => changeMonth(1)} className="p-1 hover:bg-white rounded-lg transition-colors text-slate-600 hover:text-indigo-600 shadow-sm"><ChevronRight size={16} /></button>
                        </div>
                    }
                    contentClassName="p-0"
                >
                    <div className="relative flex overflow-hidden min-h-[400px]">
                        {/* CALENDAR GRID */}
                        <div className={`p-6 flex-1 transition-all duration-300`}>
                            <div className="grid grid-cols-7 gap-2">
                                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(day => (
                                    <div key={day} className="text-center text-[10px] font-black text-slate-400 py-2 uppercase tracking-widest">{day}</div>
                                ))}
                                {calendarDays.map((date, idx) => {
                                    if (!date) return <div key={`empty-${idx}`} className="h-12"></div>;
                                    const isSelected = selectedDate.toDateString() === date.toDateString();
                                    const hasNotes = notes.some(n => n.target_date === date.toISOString().split('T')[0]);
                                    return (
                                        <button
                                            key={date.toISOString()}
                                            onClick={() => {
                                                setSelectedDate(date);
                                                setShowNotesPanel(true);
                                            }}
                                            className={`h-12 flex flex-col items-center justify-center rounded-xl transition-all border ${isSelected ? 'bg-indigo-600 text-white border-indigo-600 shadow-md ring-2 ring-indigo-200 ring-offset-1' : 'bg-transparent border-transparent hover:bg-slate-50 hover:border-slate-200 text-slate-600'}`}
                                        >
                                            <span className="text-sm font-bold">{date.getDate()}</span>
                                            {hasNotes && <div className={`calendar-dot ${isSelected ? 'bg-white' : ''}`}></div>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* SLIDE-OUT NOTES SIDE-PANEL */}
                        <div
                            className={`absolute top-0 right-0 h-full w-[300px] bg-slate-50 border-l border-white/40 shadow-xl flex flex-col transition-transform duration-300 ease-in-out z-10 ${showNotesPanel ? 'translate-x-0' : 'translate-x-full'}`}
                        >
                            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-white">
                                <h4 className="font-bold text-slate-700 text-sm">{selectedDate.toLocaleDateString()} Notes</h4>
                                <button onClick={() => setShowNotesPanel(false)} className="text-slate-400 hover:text-red-500 neu-btn w-6 h-6 p-0 rounded-sm flex items-center justify-center"><X size={14} /></button>
                            </div>

                            <div className="p-4 flex-1 flex flex-col overflow-y-auto">
                                {selectedDateNotes.length > 0 ? (
                                    <div className="space-y-3 flex-1 custom-scrollbar">
                                        {selectedDateNotes.map(note => (
                                            <div key={note.id} className="p-4 rounded-xl bg-white border border-indigo-100 shadow-sm relative group hover:border-indigo-300 transition-colors flex flex-col gap-2">
                                                <p className="text-sm text-slate-700 font-medium leading-relaxed">{note.content}</p>
                                                <div className="flex justify-between items-center">
                                                    <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-wider">By {note.author}</p>
                                                    {(user.id === note.user_id || ['admin', 'director'].includes(user.role)) && (
                                                        <button onClick={() => handleDeleteNote(note.id)} className="text-slate-300 hover:text-red-500 p-1" aria-label="Delete note">
                                                            <Trash2 size={14} />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
                                        <FileText size={20} className="mb-2 opacity-20" />
                                        <p className="text-xs font-medium">No notes</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-white border-t border-slate-200">
                                <form onSubmit={handleAddNote} className="relative">
                                    <input
                                        type="text" value={noteContent} onChange={e => setNoteContent(e.target.value)}
                                        placeholder={`Add new note...`}
                                        className="w-full neu-input pr-10 text-sm placeholder:text-slate-400 shadow-inner"
                                    />
                                    <button type="submit" disabled={!noteContent.trim()} className="absolute right-1.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md">
                                        <Plus size={14} />
                                    </button>
                                </form>
                            </div>
                        </div>
                    </div>
                </CollapsibleWidget>

                {/* TEAM STATUS */}
                <CollapsibleWidget
                    title="Team Directory"
                    icon={<Users size={20} />}
                    defaultExpanded={true}
                >
                    <div className="flex justify-center flex-wrap gap-4 py-4 px-4 w-full bg-slate-50/50 rounded-2xl border border-slate-100 shadow-inner">
                        {userStatus.online.length === 0 && userStatus.offline.length === 0 && (
                            <span className="text-xs text-slate-400 py-2">No team members found</span>
                        )}
                        {[...userStatus.online, ...userStatus.offline].map(u => {
                            const isOnline = userStatus.online.some(onlineUser => onlineUser.id === u.id);
                            const lastSeen = u.lastActiveAt ? new Date(u.lastActiveAt).toLocaleString([], { dateStyle: 'long', timeStyle: 'short' }) : 'Never';
                            const tooltipText = `${u.firstName || u.email}\nLast Seen: ${isOnline ? 'Active Now' : lastSeen}`;

                            return (
                                <div
                                    key={u.id}
                                    className={`relative inline-block transition-all hover:-translate-y-1 ${!isOnline ? 'opacity-60 grayscale hover:opacity-100' : 'z-10'} rounded-full ring-4 ring-white shadow-sm`}
                                    title={tooltipText}
                                >
                                    <DashboardAvatar user={u} size="md" />
                                    {isOnline && (
                                        <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </CollapsibleWidget>
            </div>
        </div>
    );
}
