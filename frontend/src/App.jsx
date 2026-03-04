import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Building, MapPin, User, LogOut, Search, Edit3, Check, X,
  LayoutGrid, Store, FileText, Download, Upload, Shield,
  Droplet, Zap, Wifi, Wind, AlertTriangle, File, Plus, Trash2,
  Users, Key, FolderOpen, Image, Camera, Map, FilePlus, Settings, Menu,
  Clock, Lock, Activity
} from 'lucide-react';
import { NotificationBell, NotificationPanel, useAnnouncements } from './components/NotificationSystem';
import EvaChatbot from './components/EvaChatbot';
import Dashboard from './components/Dashboard';
import PWAReloadPrompt from './components/PWAReloadPrompt';

// --- CONFIGURATION ---
// ULTRA-ROBUST: Use relative path. Vite Proxy handles the rest.
const API_URL = '/api';

// --- STYLES & FONT INJECTION (LIGHT NEUMORPHISM THEME) ---
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    
    :root {
      /* Light Theme Colors */
      --bg-color: #e0e5ec;
      --surface-color: #e0e5ec;
      --text-main: #4a5568;
      --text-muted: #a0aec0;
      
      /* Light Theme Shadows */
      --shadow-light: #ffffff;
      --shadow-dark: #a3b1c6;
      
      --accent: #6d5dfc;
    }

    body {
      font-family: 'Inter', sans-serif;
      background-color: transparent; /* Allow animated-bg to show */
      color: var(--text-main);
      overflow-x: hidden;
    }
    
    /* Animated Background */
    .animated-bg {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: -1;
      background-color: var(--bg-color);
      background-image: 
        radial-gradient(circle at 15% 50%, rgba(109, 93, 252, 0.15), transparent 30%), 
        radial-gradient(circle at 85% 30%, rgba(255, 107, 107, 0.15), transparent 30%);
      animation: moveGradient 20s ease-in-out infinite alternate;
    }

    @keyframes moveGradient {
      0% { background-position: 0% 50%; transform: scale(1); }
      100% { background-position: 100% 50%; transform: scale(1.1); }
    }

    /* Neumorphism Base Classes */
    .neu-panel {
      background: var(--surface-color);
      border-radius: 20px;
      box-shadow: 9px 9px 16px var(--shadow-dark), -9px -9px 16px var(--shadow-light);
      border: 1px solid rgba(255,255,255,0.4);
    }

    .neu-card {
      background: var(--surface-color);
      border-radius: 16px;
      box-shadow: 6px 6px 12px var(--shadow-dark), -6px -6px 12px var(--shadow-light);
      transition: all 0.3s ease;
      border: 1px solid rgba(255,255,255,0.4);
    }

    .neu-card:hover {
      transform: translateY(-4px);
      box-shadow: 12px 12px 20px var(--shadow-dark), -12px -12px 20px var(--shadow-light);
    }
    
    .neu-input {
      background: var(--surface-color);
      border: 1px solid rgba(255,255,255,0.4);
      border-radius: 12px;
      box-shadow: inset 5px 5px 10px var(--shadow-dark), inset -5px -5px 10px var(--shadow-light);
      color: var(--text-main);
      padding: 12px 16px;
      transition: all 0.2s ease;
    }
    
    .neu-input:focus {
      outline: none;
      box-shadow: inset 6px 6px 12px var(--shadow-dark), inset -6px -6px 12px var(--shadow-light);
      color: var(--accent);
    }

    .neu-btn {
      background: var(--surface-color);
      border-radius: 12px;
      box-shadow: 6px 6px 10px var(--shadow-dark), -6px -6px 10px var(--shadow-light);
      color: #64748b;
      font-weight: 600;
      transition: all 0.2s ease;
      border: 1px solid rgba(255,255,255,0.4);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .neu-btn:hover {
      color: var(--accent);
      transform: translateY(-2px);
      box-shadow: 8px 8px 15px var(--shadow-dark), -8px -8px 15px var(--shadow-light);
    }

    .neu-btn:active, .neu-btn.active {
      box-shadow: inset 4px 4px 8px var(--shadow-dark), inset -4px -4px 8px var(--shadow-light) !important;
      color: #4f46e5 !important;
      transform: translateY(1px);
    }

    .neu-btn-primary {
      color: var(--accent);
    }
    
    .neu-btn-primary:hover {
      text-shadow: 0 0 15px rgba(109, 93, 252, 0.4);
    }

    .neu-icon-box {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-color);
      box-shadow: 5px 5px 10px var(--shadow-dark), -5px -5px 10px var(--shadow-light);
      color: #64748b;
    }

    /* Scrollbar Styling */
    ::-webkit-scrollbar { width: 8px; }
    ::-webkit-scrollbar-track { background: var(--bg-color); }
    ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
    ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
  `}</style>
);

// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  const [activeTab, setActiveTabState] = useState(() => {
    const hash = window.location.hash.replace('#', '');
    return hash || 'dashboard';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    window.location.hash = tab;
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '');
      if (hash && hash !== activeTab) {
        setActiveTabState(hash);
      }
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [activeTab]);
  const [loading, setLoading] = useState(false);
  const [setupRequired, setSetupRequired] = useState(false);

  // Check setup status on load
  useEffect(() => {
    fetch(`${API_URL}/setup/status`)
      .then(res => res.json())
      .then(data => setSetupRequired(data.setupRequired))
      .catch(err => console.error("Setup check failed", err));
  }, []);

  // Notification System State
  const [showNotifications, setShowNotifications] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { announcements, createAnnouncement, deleteAnnouncement, loading: notifLoading } = useAnnouncements(user || { username: 'Guest', role: 'viewer' });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // App Data
  const [malls, setMalls] = useState([]);
  const [units, setUnits] = useState([]);
  const [documents, setDocuments] = useState([]);
  const [users, setUsers] = useState([]);
  const [contacts, setContacts] = useState([]);

  // --- AUTHENTICATION ---
  // Restore session on load
  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (token && savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setView('dashboard');
      fetchData(token, parsedUser.role);
    }
  }, []);

  const fetchData = async (token, role) => {
    setLoading(true);
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      const mallsRes = await fetch(`${API_URL}/malls`, { headers });
      if (mallsRes.ok) setMalls(await mallsRes.json());

      const unitsRes = await fetch(`${API_URL}/units`, { headers });
      if (unitsRes.ok) setUnits(await unitsRes.json());

      const docsRes = await fetch(`${API_URL}/documents`, { headers });
      if (docsRes.ok) setDocuments(await docsRes.json());

      // Fetch users ONLY if the user is an admin
      if (['admin', 'director'].includes(role)) {
        const usersRes = await fetch(`${API_URL}/users`, { headers });
        if (usersRes.ok) setUsers(await usersRes.json());
      } else {
        // If staff, populate users array just with themselves so they appear in list
        // Or handle differently. For now, let's keep it empty or handle in UserManagement
        // But the requirement says "user can change their own password".
        // Let's create a special endpoint or just let staff see themselves? 
        // Simpler: Just don't fetch full user list for staff, but pass 'user' prop to UserManagement
        // and let UserManagement display the current user even if 'users' array is empty.
      }

      // Fetch contacts if Admin or Staff
      if (['admin', 'director', 'staff'].includes(role)) {
        const contactsRes = await fetch(`${API_URL}/contacts`, { headers });
        if (contactsRes.ok) setContacts(await contactsRes.json());
      }

    } catch (error) {
      console.error("Failed to fetch data:", error);
    }
    setLoading(false);
  };

  const handleLogin = async (email, password, isSignup = false, firstName = '', lastName = '') => {
    try {
      const endpoint = isSignup ? `${API_URL}/setup` : `${API_URL}/login`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName })
      });

      if (!res.ok) {
        let errorMsg = isSignup ? 'Setup failed' : 'Invalid credentials';
        try {
          const errData = await res.json();
          if (errData.error) errorMsg = errData.error;
        } catch (e) {
          if (res.status === 500) errorMsg = "Server Error (Database might be unavailable)";
        }
        return { success: false, message: errorMsg };
      }

      const data = await res.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setSetupRequired(false); // Clear setup flag on success
      setView('dashboard');
      setActiveTabState('dashboard');
      window.location.hash = 'dashboard';
      fetchData(data.token, data.user.role);

      // Fire initial heartbeat
      fetch(`${API_URL}/users/heartbeat`, { method: 'POST', headers: { 'Authorization': `Bearer ${data.token}` } }).catch(() => { });
      return { success: true };
    } catch (err) {
      console.error(err);
      return { success: false, message: 'Network Error: Cannot reach server. Please check your connection or server status.' };
    }
  };

  // Heartbeat Interval
  useEffect(() => {
    if (!user) return;
    const interval = setInterval(() => {
      const token = localStorage.getItem('token');
      if (token) {
        fetch(`${API_URL}/users/heartbeat`, { method: 'POST', headers: { 'Authorization': `Bearer ${token}` } }).catch(() => { });
      }
    }, 60000); // Every minute
    return () => clearInterval(interval);
  }, [user]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    setView('login');
  };

  // --- DATA ACTIONS (REAL API CALLS) ---

  const handleSaveUnit = async (unitData) => {
    const token = localStorage.getItem('token');
    const method = unitData.id ? 'PUT' : 'POST';
    const url = unitData.id ? `${API_URL}/units/${unitData.id}` : `${API_URL}/units`;

    try {
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(unitData)
      });

      if (res.ok) {
        fetchData(token, user.role); // Refresh data
      }
    } catch (err) {
      alert('Failed to save unit');
    }
  };

  const handleDeleteUnit = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/units/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setUnits(prev => prev.filter(u => u.id !== id));
    } catch (err) {
      alert('Failed to delete');
    }
  };

  const handleAddDocument = async (formData) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/documents`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // Don't set Content-Type for FormData
        body: formData
      });
      fetchData(token, user.role);
    } catch (err) {
      alert('Upload failed');
    }
  };

  const handleDeleteDocument = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/documents/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setDocuments(prev => prev.filter(d => d.id !== id));
    } catch (err) {
      alert('Delete failed');
    }
  };

  // Contacts Actions
  const handleAddContact = async (contact) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/contacts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(contact)
      });

      if (res.ok) {
        const newContact = await res.json();
        // Optimistically update or use returned data
        // If backend returns the full object with ID, we use it.
        // Our backend currently returns { id: ..., ...body }

        // However, created_at might be missing or date format diff. 
        // But for display it should be fine.
        setContacts(prev => [newContact, ...prev]);

        // Also fetch fresh in background just in case - REMOVED to prevent race condition/lag
        // fetchData(token, user.role);
      }
    } catch (err) {
      alert('Failed to add contact');
    }
  };

  const handleDeleteContact = async (id) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/contacts/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setContacts(prev => prev.filter(c => c.id !== id));
    } catch (err) {
      alert('Failed to delete contact');
    }
  };

  // Mall Image Upload
  const handleMallImageUpdate = async (mallId, file) => {
    const token = localStorage.getItem('token');
    const formData = new FormData();
    formData.append('image', file);

    try {
      await fetch(`${API_URL}/malls/${mallId}/image`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      fetchData(token, user.role);
    } catch (err) {
      alert('Image upload failed');
    }
  };

  const handleAddMall = async (newMall) => {
    const token = localStorage.getItem('token');

    // Check if newMall is FormData (file upload included) or JSON object
    const isFormData = newMall instanceof FormData;
    const body = isFormData ? newMall : JSON.stringify(newMall);
    const headers = { 'Authorization': `Bearer ${token}` };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    try {
      await fetch(`${API_URL}/malls`, {
        method: 'POST',
        headers,
        body
      });
      fetchData(token, user.role);
    } catch (err) {
      alert('Failed to add property');
    }
  };

  const handleEditMall = async (id, updatedMall) => {
    const token = localStorage.getItem('token');

    const isFormData = updatedMall instanceof FormData;
    const body = isFormData ? updatedMall : JSON.stringify(updatedMall);
    const headers = { 'Authorization': `Bearer ${token}` };
    if (!isFormData) headers['Content-Type'] = 'application/json';

    try {
      await fetch(`${API_URL}/malls/${id}`, {
        method: 'PUT',
        headers,
        body
      });
      fetchData(token, user.role);
    } catch (err) {
      alert('Failed to update property');
    }
  };

  const handleDeleteMall = async (mallId) => {
    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/malls/${mallId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      fetchData(token, user.role);
    } catch (err) {
      alert('Failed to delete property');
    }
  };

  // User Management Actions
  const handleAddUser = async (newUser) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newUser)
      });
      if (res.ok) fetchData(token, user.role);
      else alert('Failed to add user');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteUser = async (userId) => {
    const token = localStorage.getItem('token');
    if (window.confirm('Delete this user?')) {
      try {
        await fetch(`${API_URL}/users/${userId}`, {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${token}` }
        });
        setUsers(prev => prev.filter(u => u.id !== userId));
      } catch (err) {
        alert('Failed to delete user');
      }
    }
  };

  // New Password Change Action
  const handleChangePassword = async (userId, newPassword) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`${API_URL}/users/${userId}/password`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      if (res.ok) {
        alert('Password updated successfully');
      } else {
        alert('Failed to update password');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating password');
    }
  };

  const handleUpdateAvatar = async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch(`${API_URL}/users/profile/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      if (res.ok) {
        const data = await res.json();
        const updatedUser = { ...user, avatarUrl: data.avatarUrl };
        setUser(updatedUser);
        localStorage.setItem('user', JSON.stringify(updatedUser));
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, avatarUrl: data.avatarUrl } : u));
        return { success: true };
      }
      return { success: false };
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  };

  if (view === 'login') return (
    <>
      <GlobalStyles />
      <div className="animated-bg"></div>
      <LoginScreen onLogin={handleLogin} setupRequired={setupRequired} />
    </>
  );

  return (
    <div className="min-h-screen">
      <GlobalStyles />
      <div className="animated-bg"></div>
      <Navbar
        user={user}
        onLogout={handleLogout}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        notificationsCount={announcements.length}
        onToggleNotifications={() => setShowNotifications(true)}
        isMobile={isMobile}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grow">
        {loading && <div className="text-center py-4 text-slate-500">Syncing data...</div>}

        {activeTab === 'dashboard' && (
          <Dashboard
            user={user}
            malls={malls}
            units={units}
          />
        )}
        {activeTab === 'malls' && (
          <MallDashboard
            user={user}
            malls={malls}
            units={units}
            onSaveUnit={handleSaveUnit}
            onDeleteUnit={handleDeleteUnit}
            onUpdateImage={handleMallImageUpdate}
            onAddMall={handleAddMall}
            onEditMall={handleEditMall}
            onDeleteMall={handleDeleteMall}
          />
        )}
        {activeTab === 'documents' && (
          <DocumentPanel
            user={user}
            docs={documents}
            malls={malls}
            onAddDoc={handleAddDocument}
            onDeleteDoc={handleDeleteDocument}
          />
        )}
        {activeTab === 'contacts' && ['admin', 'director', 'staff'].includes(user.role) && (
          <ContactsPanel
            user={user}
            contacts={contacts}
            onAdd={handleAddContact}
            onDelete={handleDeleteContact}
          />
        )}
        {activeTab === 'users' && (
          <UserManagement
            currentUser={user}
            users={users}
            onAddUser={handleAddUser}
            onDeleteUser={handleDeleteUser}
            onChangePassword={handleChangePassword}
            onUpdateAvatar={handleUpdateAvatar}
          />
        )}
      </main>

      <EvaChatbot user={user} malls={malls} units={units} />

      {user && (
        <NotificationPanel
          isOpen={showNotifications}
          onClose={() => setShowNotifications(false)}
          user={user}
          malls={malls}
          isMobile={isMobile}
          announcements={announcements}
          loading={notifLoading}
          onCreate={createAnnouncement}
          onDelete={deleteAnnouncement}
        />
      )}

      <PWAReloadPrompt />
    </div>
  );
}



// --- LOGIN SCREEN ---
function LoginScreen({ onLogin, setupRequired }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await onLogin(email, password, setupRequired, firstName, lastName);
    if (!result.success) {
      setError(result.message || 'Error occurred.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="neu-panel w-full max-w-md p-10 relative z-10 flex flex-col items-center">
        <div className="w-24 h-24 rounded-full neu-panel flex items-center justify-center mb-6 overflow-hidden">
          <div className="text-2xl font-black text-indigo-600 tracking-tighter">EW</div>
        </div>

        <h2 className="text-3xl font-bold text-slate-700 tracking-tight mb-2 text-center">
          {setupRequired ? 'First Time Setup' : 'Engwah Leasing Portal'}
        </h2>
        <p className="text-slate-500 text-sm mb-8 text-center">
          {setupRequired ? 'Create your Administrator account' : 'Property Management System'}
        </p>

        <form onSubmit={handleSubmit} className="w-full space-y-6">
          {error && (
            <div className="p-4 bg-red-100 border border-red-200 text-red-600 text-sm rounded-xl flex items-center shadow-inner">
              <AlertTriangle size={16} className="mr-2" />{error}
            </div>
          )}
          <div className="space-y-4">
            {setupRequired && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">First Name</label>
                  <input type="text" className="w-full neu-input"
                    value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jane" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Last Name</label>
                  <input type="text" className="w-full neu-input"
                    value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Doe" />
                </div>
              </div>
            )}
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Email</label>
              <input type="email" className="w-full neu-input"
                value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter email address" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">Password</label>
              <input type="password" className="w-full neu-input"
                value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••" />
            </div>
          </div>
          <button type="submit" className="w-full neu-btn neu-btn-primary py-4 mt-4 text-lg font-bold">
            {setupRequired ? 'Sign Up' : 'Secure Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

// --- UI COMPONENTS ---
function Avatar({ user, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-24 h-24 text-2xl'
  };

  if (user?.avatarUrl) {
    return (
      <img
        src={user.avatarUrl}
        alt={user.firstName || user.email}
        className={`${sizeClasses[size]} rounded-full object-cover shadow-sm`}
      />
    );
  }

  // Fallback Logic
  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.firstName) return user.firstName[0].toUpperCase();
    if (user?.email) return user.email[0].toUpperCase();
    return 'U';
  };

  const getColor = () => {
    const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-yellow-500', 'bg-purple-500', 'bg-pink-500', 'bg-indigo-500', 'bg-teal-500'];
    const nameStr = user?.email || user?.firstName || 'user';
    let hash = 0;
    for (let i = 0; i < nameStr.length; i++) {
      hash = nameStr.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <div className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white shadow-sm font-bold tracking-wider ${getColor()}`}>
      {getInitials()}
    </div>
  );
}

// --- NAVBAR ---
function Navbar({ user, onLogout, activeTab, setActiveTab, notificationsCount, onToggleNotifications, isMobile }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutGrid },
    { id: 'malls', label: 'Properties', icon: Building },
    { id: 'documents', label: 'Documents', icon: FolderOpen },
  ];

  if (['admin', 'director', 'staff'].includes(user.role)) {
    tabs.push({ id: 'contacts', label: 'Contacts', icon: Users });
  }

  if (user.role !== 'agent') {
    tabs.push({ id: 'users', label: 'Users', icon: User });
  }

  return (
    <nav className="bg-white/50 backdrop-blur-xl border-b border-white/20 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 relative">

          {/* Logo Section */}
          <div className="flex items-center">
            <div className="shrink-0 flex items-center justify-center w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 mr-3">
              <span className="font-bold text-lg">EW</span>
            </div>
            <span className="font-bold text-xl text-slate-700 tracking-tight hidden md:block">Engwah Leasing</span>
          </div>

          {/* Desktop Tabs */}
          <div className="hidden md:flex space-x-1 overflow-x-auto no-scrollbar items-center justify-center absolute left-1/2 transform -translate-x-1/2 h-full">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 border-b-2 border-transparent
                  ${activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                    : 'text-slate-500 hover:text-indigo-500 hover:bg-slate-50'}
                `}
              >
                <tab.icon size={16} className={`mr-2 ${activeTab === tab.id ? 'animate-pulse' : ''}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Desktop User & Logout */}
          <div className="hidden md:flex items-center">
            <NotificationBell count={notificationsCount} onClick={onToggleNotifications} />
            <div className="flex items-center mx-4 gap-3 bg-white/50 px-3 py-1.5 rounded-full border border-white shadow-sm">
              <Avatar user={user} size="sm" />
              <div className="text-left pr-2">
                <p className="font-bold text-slate-800 leading-tight" style={{ fontSize: '14px' }}>{user.firstName || (user.email ? user.email.split('@')[0] : 'User')}</p>
                <p className="text-slate-500 uppercase tracking-widest font-semibold" style={{ fontSize: '10px' }}>{user.role}</p>
              </div>
            </div>
            <button onClick={onLogout} className="neu-btn px-3 py-2 text-slate-400 hover:text-red-500 rounded-full" title="Logout">
              <LogOut size={18} />
            </button>
          </div>

          {/* Mobile Menu Button */}
          <div className="flex md:hidden items-center">
            <NotificationBell count={notificationsCount} onClick={onToggleNotifications} isMobile={true} />
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className={`neu-btn px-3 py-2 hover:text-indigo-500 ${isMenuOpen ? 'text-indigo-500' : 'text-slate-400'}`}
            >
              {isMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {isMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white/95 backdrop-blur-xl border-b border-slate-100 shadow-xl p-4 animate-in slide-in-from-top-5 z-40">
          <div className="space-y-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); setIsMenuOpen(false); }}
                className={`w-full flex items-center px-4 py-3 rounded-xl font-medium transition-all ${activeTab === tab.id
                  ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:bg-slate-50'
                  }`}
              >
                <tab.icon size={18} className="mr-3" />
                {tab.label}
              </button>
            ))}
            <div className="pt-4 border-t border-slate-200 mt-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar user={user} size="md" />
                <div>
                  <p className="font-bold text-slate-800 text-sm">{user.firstName || (user.email ? user.email.split('@')[0] : 'User')}</p>
                  <p className="text-slate-500 uppercase font-semibold text-[10px] tracking-widest">{user.role}</p>
                </div>
              </div>
              <button onClick={onLogout} className="neu-btn px-3 py-2 text-red-400 hover:text-red-500 bg-red-50">
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}

function NavTab({ label, active, onClick, icon }) {
  return (
    <button onClick={onClick} className={`neu-btn px-6 py-3 space-x-2 ${active ? 'active' : ''}`}>
      {icon} <span>{label}</span>
    </button>
  );
}

// --- MALL DASHBOARD ---
function MallDashboard({ user, malls, units, onSaveUnit, onDeleteUnit, onUpdateImage, onAddMall, onEditMall, onDeleteMall }) {
  const [selectedMall, setSelectedMall] = useState(null);
  const [isManaging, setIsManaging] = useState(false);

  if (selectedMall) {
    return (
      <MallDetail
        user={user}
        mall={selectedMall}
        units={units.filter(u => u.mall_id === selectedMall.id)}
        onBack={() => setSelectedMall(null)}
        onSaveUnit={onSaveUnit}
        onDeleteUnit={onDeleteUnit}
      />
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10 flex flex-col md:flex-row justify-between items-center text-center md:text-left">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-700 mb-2 tracking-tight">Property Portfolio</h1>
          <p className="text-slate-500 font-medium">Select a property to manage units and specifications.</p>
        </div>
        {['admin', 'director'].includes(user.role) && (
          <button onClick={() => setIsManaging(!isManaging)} className="mt-4 md:mt-0 neu-btn neu-btn-primary px-6 py-3">
            <Settings size={18} className="mr-2" /> Manage Properties
          </button>
        )}
      </div>

      {isManaging && ['admin', 'director'].includes(user.role) && (
        <ManagePropertiesPanel
          malls={malls}
          onClose={() => setIsManaging(false)}
          onAdd={onAddMall}
          onEdit={onEditMall}
          onDelete={onDeleteMall}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {malls.map(mall => {
          const mallUnits = units.filter(u => u.mall_id === mall.id);
          const totalUnits = mallUnits.length;
          const vacantUnits = mallUnits.filter(u => u.status === 'vacant').length;

          return (
            <MallCard
              key={mall.id}
              mall={mall}
              totalUnits={totalUnits}
              vacantUnits={vacantUnits}
              onClick={() => setSelectedMall(mall)}
              isAdmin={['admin', 'director'].includes(user.role)}
              onUpdateImage={onUpdateImage}
            />
          );
        })}
      </div>
    </div>
  );
}

function ManagePropertiesPanel({ malls, onClose, onAdd, onDelete, onEdit }) {
  const [mode, setMode] = useState('add'); // 'add' or 'edit'
  const [editId, setEditId] = useState(null);

  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [image, setImage] = useState(null);
  const [deletingMallId, setDeletingMallId] = useState(null);
  const [confirmationInput, setConfirmationInput] = useState('');

  const fileInputRef = useRef(null);

  const resetForm = () => {
    setName('');
    setLocation('');
    setImage(null);
    setEditId(null);
    setMode('add');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const startEdit = (mall) => {
    setMode('edit');
    setEditId(mall.id);
    setName(mall.name);
    setLocation(mall.location || '');
    setImage(null); // optional to update
  };

  const handleSubmit = () => {
    if (!name || !location) return;

    const formData = new FormData();
    formData.append('name', name);
    formData.append('location', location);
    formData.append('slug', name.toLowerCase().replace(/\s+/g, '-'));
    if (image) formData.append('image', image);

    if (mode === 'add') {
      onAdd(formData);
    } else {
      onEdit(editId, formData);
    }

    resetForm();
  };

  const confirmDelete = (id) => {
    onDelete(id);
    setDeletingMallId(null);
    setConfirmationInput('');
  };

  return (
    <div className="neu-panel p-6 mb-10 animate-in slide-in-from-top-4 border-2 border-indigo-500/20">
      <div className="flex justify-between items-center mb-6">
        <h3 className="font-bold text-slate-700">{mode === 'add' ? 'Add New Property' : 'Edit Property'}</h3>
        <button onClick={onClose} className="neu-btn w-8 h-8"><X size={16} /></button>
      </div>

      {/* Form Area */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 items-end">
        <div className="md:col-span-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-1 block">Property Name</label>
          <input className="neu-input w-full" placeholder="e.g. West Mall" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-1 block">Location</label>
          <input className="neu-input w-full" placeholder="e.g. Jurong East" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
        <div className="md:col-span-1">
          <label className="text-xs font-bold text-slate-500 uppercase tracking-wide ml-1 mb-1 block">Image <span className="text-[10px] normal-case opacity-70">(Max 800px width rec.)</span></label>
          <input
            type="file"
            ref={fileInputRef}
            className="neu-input w-full text-sm text-slate-500 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
            accept="image/*"
            onChange={e => setImage(e.target.files[0])}
          />
        </div>
        <div className="flex space-x-2">
          <button onClick={handleSubmit} className="neu-btn neu-btn-primary flex-1">
            {mode === 'add' ? <Plus size={18} className="mr-2" /> : <Check size={18} className="mr-2" />}
            {mode === 'add' ? 'Add Property' : 'Save Changes'}
          </button>
          {mode === 'edit' && (
            <button onClick={resetForm} className="neu-btn text-slate-500">
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* List Existing */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-widest mb-2">Existing Properties</h4>
        {malls.map(mall => (
          <div key={mall.id} className="neu-card p-3">
            {deletingMallId === mall.id ? (
              <div className="bg-red-50/50 p-4 rounded-xl border border-red-200 animate-in fade-in zoom-in-95">
                <div className="flex items-start mb-3">
                  <AlertTriangle className="text-red-500 mr-2 shrink-0" size={18} />
                  <div>
                    <h5 className="font-bold text-red-600 text-sm">Permanently Delete Property?</h5>
                    <p className="text-xs text-red-500 mt-1">This will remove "{mall.name}" and ALL associated units/docs.</p>
                    <p className="text-xs text-slate-500 mt-2 font-medium">Type <span className="font-mono bg-slate-200 px-1 rounded select-all">{mall.name}</span> to confirm.</p>
                  </div>
                </div>
                <input
                  className="neu-input w-full mb-3 border border-red-200 focus:ring-red-500 text-red-600 placeholder-red-200"
                  value={confirmationInput}
                  onChange={(e) => setConfirmationInput(e.target.value)}
                  placeholder={`Type "${mall.name}" here`}
                  autoFocus
                />
                <div className="flex justify-end space-x-2">
                  <button onClick={() => { setDeletingMallId(null); setConfirmationInput(''); }} className="neu-btn px-4 py-2 text-xs">Cancel</button>
                  <button
                    onClick={() => confirmDelete(mall.id)}
                    disabled={confirmationInput !== mall.name}
                    className={`neu-btn px-4 py-2 text-xs transition-all ${confirmationInput === mall.name
                      ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                      : 'opacity-50 cursor-not-allowed bg-slate-100 text-slate-400'
                      }`}
                  >
                    Confirm Delete
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div className="flex items-center">
                  {mall.image_url && <img src={`${API_URL}${mall.image_url}`} className="w-10 h-10 rounded-lg object-cover mr-3 border border-slate-200" />}
                  <div>
                    <span className="font-bold text-slate-700 block">{mall.name}</span>
                    <span className="text-slate-500 text-xs">{mall.location}</span>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button onClick={() => startEdit(mall)} className="neu-btn text-slate-500 px-3 py-1 text-sm"><Edit3 size={14} className="mr-1" /> Edit</button>
                  <button onClick={() => { setDeletingMallId(mall.id); setConfirmationInput(''); }} className="neu-btn text-red-500 px-3 py-1 text-sm"><Trash2 size={14} className="mr-1" /> Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// --- MALL CARD ---
function MallCard({ mall, onClick, isAdmin, onUpdateImage, totalUnits, vacantUnits }) {
  // Removed local image upload button logic as requested (now handled in settings)

  return (
    <div
      onClick={onClick}
      className="neu-card cursor-pointer overflow-hidden group relative flex flex-col h-80"
    >
      {/* Image Section - Neumorphic inset frame */}
      <div className="flex-1 m-4 mb-0 rounded-t-xl overflow-hidden relative shadow-inner bg-slate-200">
        {mall.image_url ? (
          <img src={`${API_URL}${mall.image_url}`} alt={mall.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
            <Building size={48} className="opacity-20" />
          </div>
        )}
      </div>

      <div className="px-5 py-4 bg-white/50 backdrop-blur-sm flex justify-between items-center relative z-10">
        <div>
          <h3 className="text-xl font-bold text-slate-700 leading-tight group-hover:text-indigo-600 transition-colors">{mall.name}</h3>
          <p className="text-sm text-slate-500 flex items-center mt-1">
            <MapPin size={12} className="mr-1" /> {mall.location}
          </p>
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-300 text-slate-500">
              Total: {totalUnits}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-300 text-emerald-600">
              Vacant: {vacantUnits}
            </span>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 group-hover:bg-indigo-500 group-hover:text-white transition-all">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M12 5l7 7-7 7" /></svg>
        </div>
      </div>
    </div>
  );
}

// --- MALL DETAIL & UNITS ---
function MallDetail({ user, mall, units, onBack, onSaveUnit, onDeleteUnit }) {
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [isManagingLevels, setIsManagingLevels] = useState(false);

  // Group units by level
  // Also determine the "order" of each level.
  // We can assume units in the same level share the same order (as enforced by backend).
  const levelsData = useMemo(() => {
    const grouped = {};
    const levelOrders = {};

    units.forEach(u => {
      if (!grouped[u.level]) grouped[u.level] = [];
      grouped[u.level].push(u);

      // Keep track of order for this level
      if (u.level_order !== undefined) {
        levelOrders[u.level] = u.level_order;
      }
    });

    // Create an array of level objects { name: '1', order: 1, units: [] }
    const levelList = Object.keys(grouped).map(lvl => ({
      name: lvl,
      order: levelOrders[lvl] !== undefined ? levelOrders[lvl] : 999, // default to end if unknown
      units: grouped[lvl]
    }));

    // Sort by order
    levelList.sort((a, b) => a.order - b.order);

    return levelList;
  }, [units]);

  const handleAddNewUnit = (levelName, levelOrder) => {
    setSelectedUnit({
      isNew: true,
      mall_id: mall.id,
      level: levelName,
      level_order: levelOrder,
      unit_no: '',
      status: 'vacant',
      area_sqm: '',
      tenant_name: '',
      water_point: false, water_pipe_diameter: '',
      ac_power_kw: '', fcu_units: 0,
      electric_isolator_tpn_val: '',
      emergency_lights: 0, exit_signage: 0, pa_speaker: 0,
      fibre_port: 0, data_ports: 0,
      floor_traps: 0, gas_pipe: false,
      kitchen_ea: false, kitchen_ea_val: '',
      kitchen_fa: false, kitchen_fa_val: '',
      sprinkler: 0
    });
  };

  const handleAddLevel = () => {
    // Find next order
    const maxOrder = levelsData.length > 0 ? Math.max(...levelsData.map(l => l.order)) : 0;
    const nextOrder = maxOrder + 1;

    // Prompt for name
    const levelName = prompt("Enter Level Name (e.g. '2', 'B1', 'Mezzanine'):");
    if (levelName) {
      // Check if exists
      if (levelsData.find(l => l.name === levelName)) {
        alert('Level name already exists!');
        return;
      }
      handleAddNewUnit(levelName, nextOrder);
    }
  };

  return (
    <div className="animate-in slide-in-from-right-4 duration-300">
      <div className="flex justify-between items-start mb-6">
        <button onClick={onBack} className="neu-btn px-4 py-2 text-slate-500 hover:text-indigo-600">
          <span className="mr-2">←</span> Back
        </button>
        {['admin', 'director'].includes(user.role) && (
          <button onClick={() => setIsManagingLevels(true)} className="neu-btn px-4 py-2 text-slate-600">
            <Settings size={16} className="mr-2" /> Manage Levels
          </button>
        )}
      </div>

      <div className="neu-panel p-8 mb-10 flex flex-col md:flex-row md:items-end justify-between">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight mb-2">{mall.name}</h1>
          <p className="text-slate-500 font-medium flex items-center"><MapPin size={16} className="mr-2 text-indigo-500" />{mall.location}</p>
        </div>
        {['admin', 'director'].includes(user.role) && (
          <button onClick={handleAddLevel} className="mt-6 md:mt-0 neu-btn neu-btn-primary px-6 py-3">
            <Plus size={18} className="mr-2" /> Add Level
          </button>
        )}
      </div>

      {isManagingLevels && (
        <ManageLevelsModal
          mall={mall}
          levels={levelsData.map(l => ({ name: l.name, order: l.order }))}
          onClose={() => setIsManagingLevels(false)}
        />
      )}

      <div className="space-y-12">
        {levelsData.map(level => (
          <div key={level.name}>
            <div className="flex items-center mb-6 pl-2">
              <div className="neu-icon-box mr-4 text-indigo-500 font-bold text-sm">{level.name}</div>
              <h2 className="text-xl font-bold text-slate-600">Level {level.name}</h2>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
              {level.units.map(unit => (
                <div key={unit.id} onClick={() => setSelectedUnit(unit)}
                  className={`neu-card p-5 cursor-pointer relative overflow-hidden group flex flex-col justify-between min-h-[140px]
                    ${unit.status === 'occupied' ? 'border-l-4 border-l-blue-400' :
                      unit.status === 'reserved' ? 'border-l-4 border-l-amber-400' :
                        'border-l-4 border-l-emerald-400'}
                  `}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className="font-bold text-lg text-slate-700 tracking-tight">{unit.unit_no}</span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-slate-400 truncate mb-1">
                      {unit.tenant_name || <span className="text-slate-400 italic">Available</span>}
                    </div>
                    <StatusBadge status={unit.status} />
                  </div>
                </div>
              ))}

              {/* Add Unit Card */}
              {['admin', 'director'].includes(user.role) && (
                <div onClick={() => handleAddNewUnit(level.name, level.order)} className="neu-card p-4 cursor-pointer flex flex-col items-center justify-center text-slate-400 hover:text-indigo-500 group min-h-[140px] shadow-inner">
                  <div className="neu-icon-box mb-2 group-hover:text-indigo-500">
                    <Plus size={20} />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">Add Unit</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {levelsData.length === 0 && (
          <div className="neu-panel p-12 text-center">
            <p className="text-slate-500 mb-4">No levels initialized.</p>
            {['admin', 'director'].includes(user.role) && (
              <button onClick={handleAddLevel} className="neu-btn inline-flex px-6 py-3">Create First Level</button>
            )}
          </div>
        )}
      </div>

      {selectedUnit && (
        <UnitModal
          unit={selectedUnit}
          mall={mall} // Pass mall data for copy text
          user={user}
          onClose={() => setSelectedUnit(null)}
          onSave={onSaveUnit}
          onDelete={onDeleteUnit}
        />
      )}
    </div>
  );
}

function ManageLevelsModal({ mall, levels, onClose }) {
  // Local state for editing
  const [levelList, setLevelList] = useState(levels);

  // Simple reorder: move up/down
  const move = (idx, dir) => {
    const newList = [...levelList];
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= newList.length) return;

    // Swap
    [newList[idx], newList[targetIdx]] = [newList[targetIdx], newList[idx]];

    // Re-assign orders based on new index
    // We do this to normalize orders (0, 1, 2...)
    newList.forEach((l, i) => l.order = i + 1);
    setLevelList(newList);
  };

  const handleNameChange = (idx, newName) => {
    const newList = [...levelList];
    newList[idx].name = newName;
    setLevelList(newList);
  };

  const handleSave = async () => {
    // Construct payload: map current levels to original levels to identify changes?
    // Actually, the API expects a list of changes or just the new state.
    // My previous API design for `PUT /api/malls/:id/levels` expected: 
    // { levels: [{ oldName: '1', newName: 'Ground', order: 1 }, ...] }
    // But here we might have renamed them.
    // To keep it simple, we pass both oldName (from props) and newName (from state).
    // Wait, if I swap order, I just update order.
    // If I rename, I update NAME.
    // But how do I know which one is which if I swapped?
    // I need to track original names.

    // Let's assume the user doesn't ADD/DELETE levels here (that's done via Add Unit).
    // So `levels` (prop) and `levelList` (state) should match in length and initial content.
    // EXCEPT: `levels` is sorted by order. `levelList` is sorted by user manipulation.
    // But wait, if I rename "Level 1" to "Level A", I need to tell the backend: "Update units where level='Level 1' to level='Level A'".
    // So I need to keep the original name reference.

    const payload = levelList.map((l, i) => {
      // Find original level that corresponds to this one? 
      // Actually, I should have stored `originalName` in state.
      return {
        oldName: l.originalName || l.name, // Fallback if not set (but should be set on init)
        newName: l.name,
        order: i + 1
      };
    });

    const token = localStorage.getItem('token');
    try {
      await fetch(`${API_URL}/malls/${mall.id}/levels`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ levels: payload })
      });
      window.location.reload(); // Quick way to refresh EVERYTHING (or call fetchData if passed)
    } catch (e) {
      alert('Failed to save levels');
    }
  };

  // Initialize state with originalName
  useEffect(() => {
    setLevelList(levels.map(l => ({ ...l, originalName: l.name })));
  }, [levels]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="neu-panel w-full max-w-lg relative z-10 p-6">
        <h3 className="font-bold text-slate-700 mb-4">Manage Levels</h3>
        <p className="text-xs text-slate-500 mb-4">Rename or reorder levels. Dragging not supported, use arrows.</p>

        <div className="space-y-2 mb-6 max-h-[60vh] overflow-y-auto">
          {levelList.map((l, idx) => (
            <div key={idx} className="flex items-center space-x-2">
              <div className="flex flex-col space-y-1">
                <button onClick={() => move(idx, -1)} disabled={idx === 0} className="w-6 h-6 neu-btn flex items-center justify-center text-xs disabled:opacity-30">▲</button>
                <button onClick={() => move(idx, 1)} disabled={idx === levelList.length - 1} className="w-6 h-6 neu-btn flex items-center justify-center text-xs disabled:opacity-30">▼</button>
              </div>
              <input
                className="neu-input flex-1"
                value={l.name}
                onChange={e => handleNameChange(idx, e.target.value)}
              />
              <span className="text-xs font-mono text-slate-400 w-6 text-center">#{idx + 1}</span>
            </div>
          ))}
        </div>

        <div className="flex justify-end space-x-2">
          <button onClick={onClose} className="neu-btn px-4 py-2">Cancel</button>
          <button onClick={handleSave} className="neu-btn neu-btn-primary px-4 py-2">Save Changes</button>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const configs = {
    vacant: { color: 'text-emerald-500', Icon: Check },
    occupied: { color: 'text-blue-500', Icon: Lock },
    reserved: { color: 'text-amber-500', Icon: Clock }
  };
  const { color, Icon } = configs[status] || { color: 'text-slate-500', Icon: Check };
  return (
    <span className={`inline-flex items-center text-[10px] font-black uppercase tracking-widest ${color}`}>
      <Icon size={12} className="mr-1" />
      {status}
    </span>
  );
}

// --- UNIT MODAL ---
function UnitModal({ unit, mall, user, onClose, onSave, onDelete }) {
  const [isEditing, setIsEditing] = useState(unit.isNew || false);
  const [formData, setFormData] = useState({ ...unit });
  const [activeTab, setActiveTab] = useState('overview');

  const handleChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const txtContent = `PROPERTY UNIT INFO
------------------
PROPERTY:  ${mall ? mall.name : 'Unknown Property'}
UNIT NO:   ${formData.unit_no}
AREA:      ${formData.area_sqm} sqm
STATUS:    ${formData.status?.toUpperCase() || ''}

TENANT
------------------
NAME:      ${formData.tenant_name || 'N/A'}
PIC:       ${formData.person_in_charge || 'N/A'}
PHONE:     ${formData.contact_phone || 'N/A'}
EMAIL:     ${formData.contact_email || 'N/A'}

SPECIFICATIONS
------------------
Water Pt:  ${formData.water_point ? 'Yes' : 'No'} (${formData.water_pipe_diameter || '-'})
AC Power:  ${formData.ac_power_kw} kW
FCU Units: ${formData.fcu_units}
Isolator:  ${formData.electric_isolator_tpn_val || 'No'}
Floor Trap:${formData.floor_traps}
Gas Pipe:  ${formData.gas_pipe ? 'Yes' : 'No'}

SAFETY & COMMS
------------------
Lights:    ${formData.emergency_lights}
Signage:   ${formData.exit_signage}
Sprinklers:${formData.sprinkler}
Fibre:     ${formData.fibre_port}
Data:      ${formData.data_ports}
Kit. Exh:  ${formData.kitchen_ea ? `Yes (${formData.kitchen_ea_val})` : 'No'}
Kit. Fresh:${formData.kitchen_fa ? `Yes (${formData.kitchen_fa_val})` : 'No'}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-200/60 backdrop-blur-sm" onClick={onClose}></div>
      <div className="neu-panel w-full max-w-5xl max-h-[90vh] flex flex-col relative z-10 overflow-hidden animate-in zoom-in-95 duration-200 shadow-2xl">

        {/* Header */}
        <div className="p-6 border-b border-slate-300/50 flex justify-between items-center bg-white/30">
          <div>
            <h2 className="text-2xl font-bold text-slate-700">{unit.isNew ? 'New Unit' : `Unit ${unit.unit_no}`}</h2>
            <p className="text-sm text-slate-500 font-mono">L{unit.level} • {formData.area_sqm || 0} sqm</p>
          </div>
          <div className="flex items-center space-x-3">
            {!isEditing && ['admin', 'director'].includes(user.role) && (
              <button onClick={() => setIsEditing(true)} className="neu-btn neu-btn-primary px-4 py-2 text-sm">
                <Edit3 size={16} className="mr-2" /> Edit
              </button>
            )}
            <button onClick={onClose} className="neu-btn w-10 h-10 text-red-400"><X size={20} /></button>
          </div>
        </div>

        {/* Tabs Desktop & Mobile Scrollable */}
        <div className="flex border-b border-slate-300/50 bg-white/40 overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', label: 'Overview', icon: Building },
            { id: 'specs', label: 'M&E / Specs', icon: Droplet },
            { id: 'electricity', label: 'Electrical', icon: Zap },
            { id: 'safety', label: 'Safety & Comms', icon: Shield },
            { id: 'kitchen', label: 'Kitchen', icon: Wind },
            { id: 'export', label: 'Export', icon: FileText }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center px-6 py-4 text-sm font-bold transition-colors whitespace-nowrap border-b-2
                ${activeTab === tab.id ? 'border-indigo-600 text-indigo-700 bg-white/60' : 'border-transparent text-slate-500 hover:bg-white/40 hover:text-slate-700'}`}
            >
              <tab.icon size={16} className="mr-2" /> {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-4 md:p-8 flex-1 bg-slate-50/30">
          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Section title="Identity" icon={<Building size={18} />}>
                  <Input label="Unit No" value={formData.unit_no} onChange={v => handleChange('unit_no', v)} />
                  <Input label="Area (sqm)" type="number" value={formData.area_sqm} onChange={v => handleChange('area_sqm', v)} />
                  <Input label="Status" type="select" options={['vacant', 'occupied', 'reserved']} value={formData.status} onChange={v => handleChange('status', v)} />
                </Section>
                <Section title="Tenant Details" icon={<User size={18} />}>
                  <Input label="Shop Name" value={formData.tenant_name} onChange={v => handleChange('tenant_name', v)} />
                  <Input label="PIC" value={formData.person_in_charge} onChange={v => handleChange('person_in_charge', v)} />
                  <Input label="Email" value={formData.contact_email} onChange={v => handleChange('contact_email', v)} />
                  <Input label="Phone" value={formData.contact_phone} onChange={v => handleChange('contact_phone', v)} />
                </Section>
              </div>
            ) : (
              <div className="space-y-8">
                <div className="neu-card p-6 grid grid-cols-2 md:grid-cols-4 gap-6">
                  <DetailItem label="Status" value={<StatusBadge status={unit.status} />} />
                  <DetailItem label="Tenant" value={unit.tenant_name || '-'} />
                  <DetailItem label="PIC" value={unit.person_in_charge || '-'} />
                  <DetailItem label="Contact" value={unit.contact_phone || '-'} />
                </div>
                <div className="neu-card p-6">
                  <h3 className="font-bold text-indigo-500 mb-4 flex items-center text-sm uppercase tracking-wider"><Building size={16} className="mr-2" /> Property Info</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <SpecRow label="Property" value={mall?.name || 'Unknown'} />
                    <SpecRow label="Level" value={`L${unit.level}`} />
                    <SpecRow label="Unit No" value={unit.unit_no} />
                    <SpecRow label="Area (sqm)" value={unit.area_sqm} />
                  </div>
                </div>
              </div>
            )
          )}

          {/* SPECS & M&E TAB */}
          {activeTab === 'specs' && (
            isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Section title="Water & Plumbing" icon={<Droplet size={18} />}>
                  <Toggle label="Water Point" value={formData.water_point} onChange={v => handleChange('water_point', v)} />
                  {formData.water_point && <Input label="Pipe Diameter" value={formData.water_pipe_diameter} onChange={v => handleChange('water_pipe_diameter', v)} />}
                  <Input label="Floor Traps" type="number" value={formData.floor_traps} onChange={v => handleChange('floor_traps', v)} />
                </Section>
                <Section title="Gas Distribution" icon={<Activity size={18} />}>
                  <Toggle label="Gas Pipe" value={formData.gas_pipe} onChange={v => handleChange('gas_pipe', v)} />
                </Section>
              </div>
            ) : (
              <div className="neu-card p-6">
                <h3 className="font-bold text-indigo-500 mb-4 flex items-center text-sm uppercase tracking-wider"><Droplet size={16} className="mr-2" /> Mechanical & Plumbing</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SpecRow label="Water Point" value={unit.water_point ? 'Yes' : 'No'} sub={unit.water_point ? unit.water_pipe_diameter : null} />
                  <SpecRow label="Floor Traps" value={unit.floor_traps || '0'} />
                  <SpecRow label="Gas Pipe" value={unit.gas_pipe ? 'Yes' : 'No'} />
                </div>
              </div>
            )
          )}

          {/* ELECTRICAL TAB */}
          {activeTab === 'electricity' && (
            isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Section title="Power Supply" icon={<Zap size={18} />}>
                  <Input label="AC Power (kW)" type="number" value={formData.ac_power_kw} onChange={v => handleChange('ac_power_kw', v)} />
                  <Input label="Isolator (TPN)" value={formData.electric_isolator_tpn_val} onChange={v => handleChange('electric_isolator_tpn_val', v)} />
                </Section>
                <Section title="Cooling" icon={<Wind size={18} />}>
                  <Input label="FCU Units" type="number" value={formData.fcu_units} onChange={v => handleChange('fcu_units', v)} />
                </Section>
              </div>
            ) : (
              <div className="neu-card p-6">
                <h3 className="font-bold text-indigo-500 mb-4 flex items-center text-sm uppercase tracking-wider"><Zap size={16} className="mr-2" /> Electrical & Cooling</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SpecRow label="AC Power Limit" value={`${unit.ac_power_kw || 0} kW`} />
                  <SpecRow label="TPN Isolator" value={unit.electric_isolator_tpn_val || 'None'} />
                  <SpecRow label="FCU Units" value={unit.fcu_units || '0'} />
                </div>
              </div>
            )
          )}

          {/* SAFETY & COMMS TAB */}
          {activeTab === 'safety' && (
            isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Section title="Safety Systems" icon={<Shield size={18} />}>
                  <Input label="Emerg. Lights" type="number" value={formData.emergency_lights} onChange={v => handleChange('emergency_lights', v)} />
                  <Input label="Sprinklers" type="number" value={formData.sprinkler} onChange={v => handleChange('sprinkler', v)} />
                  <Input label="PA Speakers" type="number" value={formData.pa_speaker} onChange={v => handleChange('pa_speaker', v)} />
                </Section>
                <Section title="Communications" icon={<Wifi size={18} />}>
                  <Input label="Fibre Ports" type="number" value={formData.fibre_port} onChange={v => handleChange('fibre_port', v)} />
                  <Input label="Data Ports" type="number" value={formData.data_ports} onChange={v => handleChange('data_ports', v)} />
                </Section>
              </div>
            ) : (
              <div className="neu-card p-6">
                <h3 className="font-bold text-indigo-500 mb-4 flex items-center text-sm uppercase tracking-wider"><Shield size={16} className="mr-2" /> Safety & Communications</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SpecRow label="Emergency Lights" value={unit.emergency_lights || '0'} />
                  <SpecRow label="Exit Signage" value={unit.exit_signage || '0'} />
                  <SpecRow label="Sprinklers" value={unit.sprinkler || '0'} />
                  <SpecRow label="PA Speakers" value={unit.pa_speaker || '0'} />
                  <SpecRow label="Fibre Ports" value={unit.fibre_port || '0'} />
                  <SpecRow label="Data Ports" value={unit.data_ports || '0'} />
                </div>
              </div>
            )
          )}

          {/* KITCHEN TAB */}
          {activeTab === 'kitchen' && (
            isEditing ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Section title="Exhaust & Fresh Air" icon={<Wind size={18} />}>
                  <Toggle label="Kitchen Exhaust (EA)" value={formData.kitchen_ea} onChange={v => handleChange('kitchen_ea', v)} />
                  {formData.kitchen_ea && <Input label="EA Value/Capacity" value={formData.kitchen_ea_val} onChange={v => handleChange('kitchen_ea_val', v)} />}
                  <div className="mt-4"></div>
                  <Toggle label="Kitchen Fresh Air (FA)" value={formData.kitchen_fa} onChange={v => handleChange('kitchen_fa', v)} />
                  {formData.kitchen_fa && <Input label="FA Value/Capacity" value={formData.kitchen_fa_val} onChange={v => handleChange('kitchen_fa_val', v)} />}
                </Section>
              </div>
            ) : (
              <div className="neu-card p-6">
                <h3 className="font-bold text-indigo-500 mb-4 flex items-center text-sm uppercase tracking-wider"><Wind size={16} className="mr-2" /> Kitchen Ventilation</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <SpecRow label="Kitchen Exhaust (EA)" value={unit.kitchen_ea ? 'Available' : 'No'} sub={unit.kitchen_ea ? unit.kitchen_ea_val : null} />
                  <SpecRow label="Kitchen Fresh Air (FA)" value={unit.kitchen_fa ? 'Available' : 'No'} sub={unit.kitchen_fa ? unit.kitchen_fa_val : null} />
                </div>
              </div>
            )
          )}

          {/* EXPORT TAB */}
          {activeTab === 'export' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="flex justify-between items-center mb-2">
                <h4 className="text-sm font-bold uppercase text-slate-500 tracking-wider">Plain Text Export</h4>
                <button
                  onClick={() => {
                    if (navigator.clipboard && window.isSecureContext) {
                      navigator.clipboard.writeText(txtContent).then(() => alert("Copied!"));
                    } else {
                      const textArea = document.createElement("textarea");
                      textArea.value = txtContent;
                      textArea.style.position = "fixed";
                      textArea.style.left = "-9999px";
                      document.body.appendChild(textArea);
                      textArea.focus();
                      textArea.select();
                      try {
                        document.execCommand('copy');
                        alert("Copied!");
                      } catch (err) {
                        alert("Failed to copy. Please select text manually.");
                      }
                      document.body.removeChild(textArea);
                    }
                  }}
                  className="neu-btn neu-btn-primary px-4 py-2 text-sm"
                >
                  Copy to Clipboard
                </button>
              </div>
              <div className="neu-input w-full font-mono text-xs whitespace-pre p-6 h-[400px] overflow-y-auto select-all text-slate-600 bg-white shadow-inner border border-slate-200 rounded-xl">
                {txtContent}
              </div>
            </div>
          )}
        </div>

        {isEditing && (
          <div className="p-6 border-t border-slate-300/50 flex justify-between bg-white/30">
            <div>
              {!unit.isNew && ['admin', 'director'].includes(user.role) && (
                <button onClick={() => { if (window.confirm('Delete?')) { onDelete(unit.id); onClose(); } }} className="neu-btn px-4 py-2 text-red-500">
                  <Trash2 size={16} className="mr-2" /> Delete
                </button>
              )}
            </div>
            <div className="flex space-x-4">
              <button onClick={() => { setIsEditing(false); if (unit.isNew) onClose(); }} className="neu-btn px-6 py-2">Cancel</button>
              <button onClick={() => { onSave(formData); onClose(); }} className="neu-btn neu-btn-primary px-8 py-2">Save</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// --- DOCUMENT PANEL ---
function DocumentPanel({ user, docs, malls, onAddDoc, onDeleteDoc }) {
  const [isAdding, setIsAdding] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState('sales');
  const [newDocMall, setNewDocMall] = useState('');
  const [newDocFile, setNewDocFile] = useState(null);

  const handleAdd = (e) => {
    e.preventDefault();
    if (!newDocFile) return;

    const formData = new FormData();
    // IMPORTANT: Append text fields BEFORE the file so multer diskStorage can access them in req.body
    formData.append('title', newDocTitle);
    formData.append('type', newDocType);
    formData.append('mall_id', newDocMall || (malls[0]?.id || 0));
    formData.append('file', newDocFile);

    onAddDoc(formData);
    setIsAdding(false);
    setNewDocTitle('');
    setNewDocFile(null);
  };

  const categories = [
    { id: 'sales', label: 'Sales Kit' },
    { id: 'ads', label: 'Ads Kit' },
    { id: 'floorplan', label: 'Floor Plans' },
    { id: 'others', label: 'Legal/Others' }
  ];

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Documents</h1>
          <p className="text-slate-500 font-medium mt-2">Manage and share marketing collateral.</p>
        </div>
        {user.role !== 'agent' && (
          <button onClick={() => setIsAdding(!isAdding)} className="neu-btn neu-btn-primary px-6 py-3 w-full md:w-auto">
            {isAdding ? <X size={20} className="mr-2" /> : <Upload size={20} className="mr-2" />}
            {isAdding ? 'Cancel' : 'Upload Document'}
          </button>
        )}
      </div>

      {isAdding && (
        <div className="neu-panel p-6 mb-8 relative overflow-hidden">
          <h3 className="text-xl font-bold text-slate-700 mb-6 flex items-center"><FilePlus className="mr-3 text-indigo-500" /> New Upload</h3>
          <form onSubmit={handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Title</label>
                <input type="text" className="w-full neu-input" value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} required placeholder="e.g. Q1 Marketing Deck" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Property</label>
                <select className="w-full neu-input" value={newDocMall} onChange={e => setNewDocMall(e.target.value)}>
                  {malls.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">Category</label>
                <select className="w-full neu-input" value={newDocType} onChange={e => setNewDocType(e.target.value)}>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 ml-1">File</label>
                <input type="file" className="w-full bg-slate-100 p-2 rounded-lg text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  onChange={e => setNewDocFile(e.target.files[0])} required />
              </div>
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="submit" className="neu-btn neu-btn-primary px-8 py-3">Upload Now</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-12">
        {malls.map(mall => {
          const mallDocs = docs.filter(d => d.mall_id === mall.id);
          if (mallDocs.length === 0) return null;

          return (
            <div key={mall.id} className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="flex items-center mb-6">
                <div className="w-10 h-10 rounded-xl bg-linear-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30 mr-4">
                  <Building size={20} />
                </div>
                <h2 className="text-2xl font-bold text-slate-700">{mall.name}</h2>
              </div>

              <div className="space-y-6">
                {categories.map(cat => {
                  const catDocs = mallDocs.filter(d => d.type === cat.id);
                  if (catDocs.length === 0) return null;

                  return (
                    <div key={cat.id}>
                      <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-3 ml-1 flex items-center">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mr-2"></span> {cat.label}
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {catDocs.map(doc => (
                          <div key={doc.id} className="neu-card p-4 flex flex-col justify-between group bg-white/40 hover:bg-white/80 transition-all">
                            <div className="flex items-start justify-between mb-3">
                              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                                {doc.file_url.endsWith('.pdf') ? <FileText size={16} /> : <Image size={16} />}
                              </div>
                              {['admin', 'director'].includes(user.role) && (
                                <button onClick={() => onDeleteDoc(doc.id)} className="text-slate-300 hover:text-red-500 transition-colors"><Trash2 size={14} /></button>
                              )}
                            </div>
                            <div>
                              <a href={`${API_URL}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="font-bold text-slate-700 text-sm hover:text-indigo-600 transition-colors leading-tight block mb-1 truncate" title={doc.title}>{doc.title}</a>
                              <div className="flex justify-between items-center mt-2">
                                <span className="text-[10px] text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</span>
                                <a href={`${API_URL}${doc.file_url}`} target="_blank" rel="noopener noreferrer" className="text-indigo-500 hover:text-indigo-600">
                                  <Download size={14} />
                                </a>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="my-8 border-b border-slate-200/60 w-full"></div>
            </div>
          );
        })}
        {docs.length === 0 && <div className="text-center py-12 text-slate-400">No documents uploaded yet.</div>}
      </div>
    </div>
  );
}

function DocList({ title, type, docs, user, onDelete, color, icon }) {
  const filtered = docs.filter(d => d.type === type);
  return (
    <div className="p-6">
      <h3 className={`text-xs font-bold uppercase tracking-widest mb-6 flex items-center ${color}`}>{icon} <span className="ml-2">{title}</span></h3>
      <div className="space-y-4">
        {filtered.length === 0 && <p className="text-sm text-slate-500 italic">None available.</p>}
        {filtered.map(doc => (
          <div key={doc.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/50 transition-colors cursor-pointer">
            <div className="flex items-center">
              <File size={18} className={`mr-4 text-slate-400 group-hover:${color.replace('text-', 'text-')}`} />
              <div>
                <div className="text-sm font-medium text-slate-600 group-hover:text-slate-800 transition-colors">{doc.title}</div>
                <div className="text-xs text-slate-400">{new Date(doc.uploaded_at).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* Corrected download link: Points to backend static file */}
              <a href={`${API_URL}${doc.file_url}`} target="_blank" rel="noreferrer" className="neu-btn w-8 h-8 flex items-center justify-center">
                <Download size={14} />
              </a>
              {['admin', 'director'].includes(user.role) && (
                <button onClick={() => onDelete(doc.id)} className="neu-btn w-8 h-8 text-red-500">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- USER MANAGEMENT PANEL ---
function UserProfileCard({ user, onUpdateAvatar, isCurrentUser }) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    await onUpdateAvatar(file);
    setUploading(false);
  };

  return (
    <div className="flex flex-col items-center mb-6">
      <div className="relative group mb-4">
        <Avatar user={user} size="xl" />
        {isCurrentUser && (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            <Camera size={16} />
          </button>
        )}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept="image/*"
          className="hidden"
        />
      </div>
      <h3 className="text-xl font-bold text-slate-700">{user.firstName || (user.email ? user.email.split('@')[0] : 'User')} {user.lastName || ''}</h3>
      <p className="text-sm font-semibold text-slate-500 uppercase tracking-widest mt-1">{user.role}</p>
      <p className="text-xs text-slate-400 mt-1">{user.email}</p>
    </div>
  );
}

function UserManagement({ currentUser, users, onAddUser, onDeleteUser, onChangePassword, onUpdateAvatar }) {
  const [newEmail, setNewEmail] = useState('');
  const [newFirstName, setNewFirstName] = useState('');
  const [newLastName, setNewLastName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('staff');
  const [isAdding, setIsAdding] = useState(false);

  // Password change state
  const [changingPwdId, setChangingPwdId] = useState(null);
  const [newPwdVal, setNewPwdVal] = useState('');

  const handleAdd = (e) => {
    e.preventDefault();
    onAddUser({ email: newEmail, firstName: newFirstName, lastName: newLastName, password: newPassword, role: newRole });
    setNewEmail('');
    setNewFirstName('');
    setNewLastName('');
    setNewPassword('');
    setIsAdding(false);
  };

  const handleChangePwdSubmit = (userId) => {
    if (newPwdVal) {
      onChangePassword(userId, newPwdVal);
      setChangingPwdId(null);
      setNewPwdVal('');
    }
  };

  // If user is Staff/Agent, only show themselves (which should be in users list if passed correctly or check currentUser)
  // For Staff/Agent, they just want to change their own password.
  // We can simplify the UI for non-admins.
  const isAdmin = ['admin', 'director'].includes(currentUser.role);

  if (!isAdmin) {
    return (
      <div className="neu-panel p-8 max-w-lg mx-auto">
        <h2 className="text-2xl font-bold text-slate-700 mb-4 text-center">My Account</h2>
        <div className="pt-4">
          <UserProfileCard user={currentUser} onUpdateAvatar={onUpdateAvatar} isCurrentUser={true} />
        </div>
        <div className="pt-6 border-t border-slate-200 mt-6">
          <h3 className="font-bold text-slate-700 mb-4">Change Password</h3>
          <div className="flex space-x-2">
            <input
              type="password"
              placeholder="New Password"
              className="neu-input flex-1"
              value={newPwdVal}
              onChange={e => setNewPwdVal(e.target.value)}
            />
            <button onClick={() => handleChangePwdSubmit(currentUser.id)} className="neu-btn neu-btn-primary px-4">Update</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">User Management</h1>
          <p className="text-slate-500 font-medium mt-2">Control system access and roles.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="neu-btn neu-btn-primary px-6 py-3 w-full md:w-auto">
          {isAdding ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
          {isAdding ? 'Cancel' : 'Add User'}
        </button>
      </div>

      {isAdding && (
        <div className="neu-panel p-6 mb-8">
          <form onSubmit={handleAdd} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Email</label>
                <input type="email" className="neu-input w-full" value={newEmail} onChange={e => setNewEmail(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">First Name</label>
                <input type="text" className="neu-input w-full" value={newFirstName} onChange={e => setNewFirstName(e.target.value)} required />
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Last Name</label>
                <input type="text" className="neu-input w-full" value={newLastName} onChange={e => setNewLastName(e.target.value)} />
              </div>
            </div>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Password</label>
                <input className="neu-input w-full" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <div className="flex-1 w-full">
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1 ml-1">Role</label>
                <select className="neu-input w-full" value={newRole} onChange={e => setNewRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="director">Director</option>
                  <option value="admin">Admin</option>
                  <option value="agent">Agent</option>
                </select>
              </div>
              <button type="submit" className="neu-btn neu-btn-primary px-6 py-3 w-full md:w-auto">Save</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {users.map(u => (
          <div key={u.id} className="neu-card p-6 flex flex-col justify-between">
            <div className="flex justify-between items-start mb-4">
              <Avatar user={u} size="md" />
              {u.email !== 'admin@pancatz.com' && u.id !== currentUser.id && (
                <button onClick={() => onDeleteUser(u.id)} className="text-slate-300 hover:text-red-500">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-700">{u.firstName || (u.email ? u.email.split('@')[0] : 'User')} {u.lastName || ''}</h3>
              <p className="text-xs text-slate-400 truncate">{u.email}</p>
              <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${['admin', 'director'].includes(u.role) ? 'bg-purple-100 text-purple-600' : 'bg-slate-100 text-slate-500'}`}>
                {u.role}
              </span>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              {changingPwdId === u.id ? (
                <div className="flex space-x-2">
                  <input type="password" placeholder="New Pwd" className="neu-input w-full text-xs" value={newPwdVal} onChange={e => setNewPwdVal(e.target.value)} />
                  <button onClick={() => handleChangePwdSubmit(u.id)} className="neu-btn px-2 text-green-500"><Check size={14} /></button>
                  <button onClick={() => setChangingPwdId(null)} className="neu-btn px-2 text-slate-400"><X size={14} /></button>
                </div>
              ) : (
                <button onClick={() => setChangingPwdId(u.id)} className="text-xs text-indigo-500 font-bold hover:underline flex items-center">
                  <Key size={14} className="mr-1" /> Reset Password
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// --- CONTACTS PANEL ---
function ContactsPanel({ user, contacts, onAdd, onDelete }) {
  const [isAdding, setIsAdding] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [company, setCompany] = useState('');
  const [type, setType] = useState('Tenant');
  const [remark, setRemark] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onAdd({ name, email, phone, company, type, remark });
    setIsAdding(false);
    // Reset
    setName(''); setEmail(''); setPhone(''); setCompany(''); setRemark('');
  };

  const types = ['Tenant', 'Agent', 'Vendor'];

  return (
    <div className="animate-in slide-in-from-bottom-8 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Contacts</h1>
          <p className="text-slate-500 font-medium mt-2">Directory of tenants, agents, and vendors.</p>
        </div>
        <button onClick={() => setIsAdding(!isAdding)} className="neu-btn neu-btn-primary px-6 py-3 w-full md:w-auto">
          {isAdding ? <X size={20} className="mr-2" /> : <Plus size={20} className="mr-2" />}
          {isAdding ? 'Cancel' : 'Add Contact'}
        </button>
      </div>

      {isAdding && (
        <div className="neu-panel p-6 mb-8">
          <h3 className="font-bold text-slate-700 mb-4">New Contact</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <input className="neu-input" placeholder="Name" value={name} onChange={e => setName(e.target.value)} required />
            <input className="neu-input" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
            <input className="neu-input" placeholder="Phone" value={phone} onChange={e => setPhone(e.target.value)} />
            <input className="neu-input" placeholder="Company" value={company} onChange={e => setCompany(e.target.value)} />
            <select className="neu-input" value={type} onChange={e => setType(e.target.value)}>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <input className="neu-input md:col-span-2 lg:col-span-3" placeholder="Remark" value={remark} onChange={e => setRemark(e.target.value)} />

            <div className="md:col-span-2 lg:col-span-3 flex justify-end">
              <button type="submit" className="neu-btn neu-btn-primary px-8">Save Contact</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-8">
        {types.map(contactType => {
          const typeContacts = contacts.filter(c => c.type === contactType);
          if (typeContacts.length === 0) return null;

          return (
            <div key={contactType}>
              <h3 className="text-lg font-bold text-slate-600 mb-4 pl-1 border-l-4 border-indigo-500">{contactType}s</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {typeContacts.map(contact => (
                  <div key={contact.id} className="neu-card p-6 relative group">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-bold text-lg text-slate-700">{contact.name}</h4>
                      <button onClick={() => onDelete(contact.id)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 size={16} />
                      </button>
                    </div>
                    <p className="text-indigo-500 text-xs font-bold uppercase tracking-wider mb-3">{contact.company || 'No Company'}</p>

                    <div className="space-y-2 text-sm text-slate-500">
                      {contact.email && <div className="flex items-center"><span className="w-4 mr-2 text-center opacity-50">@</span> {contact.email}</div>}
                      {contact.phone && <div className="flex items-center"><span className="w-4 mr-2 text-center opacity-50">#</span> {contact.phone}</div>}
                      {contact.remark && <div className="mt-3 pt-3 border-t border-slate-100 text-xs italic text-slate-400">"{contact.remark}"</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- HELPER COMPONENTS ---
function Section({ title, icon, children }) {
  return (
    <div className="neu-card p-6">
      <h3 className="font-bold text-slate-500 mb-6 flex items-center gap-3 text-xs uppercase tracking-widest">
        {icon} {title}
      </h3>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, options }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-2 ml-1 tracking-widest">{label}</label>
      {type === 'select' ? (
        <select value={value} onChange={e => onChange(e.target.value)} className="neu-input w-full appearance-none">
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} className="neu-input w-full" />
      )}
    </div>
  );
}

function Toggle({ label, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-2 px-1">
      <label className="text-sm text-slate-500 font-medium">{label}</label>
      <button onClick={() => onChange(!value)} className={`w-12 h-6 rounded-full relative transition-all duration-300 ${value ? 'bg-indigo-500 shadow-inner' : 'bg-slate-300 shadow-inner'}`}>
        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 shadow ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  );
}

function SpecRow({ label, value, sub }) {
  return (
    <div className="flex justify-between py-2 border-b border-slate-300/50 last:border-0">
      <span className="text-slate-500 text-sm">{label}</span>
      <div className="text-right">
        <span className="font-medium text-slate-700 text-sm">{value}</span>
        {sub && <span className="text-xs text-slate-400 ml-1">({sub})</span>}
      </div>
    </div>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <div className="text-[10px] text-slate-400 uppercase font-bold mb-1 tracking-widest">{label}</div>
      <div className="text-sm font-medium text-slate-700 truncate">{value}</div>
    </div>
  );
}