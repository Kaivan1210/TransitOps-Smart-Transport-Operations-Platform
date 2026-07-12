import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Calendar, Users, LogOut, Wrench, Fuel, BarChart3,
  CreditCard, User, Menu, X, Bot, Send, Sparkles, ChevronDown,
  Shield, Activity, Settings, Bell, Search, Home, TrendingUp, Package, Navigation
} from 'lucide-react';
import api from '../api/axiosInstance';

// ─── Role Theme System ──────────────────────────────────────────────────────
const THEMES = {
  ADMIN: {
    label: 'Administrator', shortLabel: 'Admin',
    icon: Shield,
    gradient: 'from-violet-600 to-purple-700',
    gradientLight: 'from-violet-500/10 to-purple-500/10',
    accent: 'violet',
    accentHex: '#8b5cf6',
    accentDim: 'rgba(139,92,246,0.12)',
    activeBg: 'bg-gradient-to-r from-violet-600 to-purple-600',
    activeGlow: 'shadow-violet-500/30',
    badgeBg: 'bg-violet-500/10', badgeText: 'text-violet-300', badgeBorder: 'border-violet-500/25',
    avatarRing: 'ring-violet-500/30', avatarText: 'text-violet-400',
    copilotActive: 'bg-violet-600 border-violet-500',
    copilotIdle: 'border-violet-500/25 text-violet-400 bg-violet-500/8 hover:bg-violet-500/15',
    chatBubble: 'from-violet-600 to-purple-600',
    drawerHeader: 'from-violet-950/80 to-purple-950/60 border-violet-800/50',
    glow1: 'bg-violet-600/5',
    glow2: 'bg-purple-700/5',
    ping: 'bg-violet-300', dot: 'bg-violet-400',
    searchBorder: 'focus:border-violet-500/40',
    quickBg: 'bg-violet-500/6 hover:bg-violet-500/12 border-violet-500/15',
    quickText: 'text-violet-400',
  },
  DISPATCHER: {
    label: 'Dispatcher', shortLabel: 'Dispatch',
    icon: Activity,
    gradient: 'from-blue-600 to-cyan-600',
    gradientLight: 'from-blue-500/10 to-cyan-500/10',
    accent: 'blue',
    accentHex: '#3b82f6',
    accentDim: 'rgba(59,130,246,0.12)',
    activeBg: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    activeGlow: 'shadow-blue-500/30',
    badgeBg: 'bg-blue-500/10', badgeText: 'text-blue-300', badgeBorder: 'border-blue-500/25',
    avatarRing: 'ring-blue-500/30', avatarText: 'text-blue-400',
    copilotActive: 'bg-blue-600 border-blue-500',
    copilotIdle: 'border-blue-500/25 text-blue-400 bg-blue-500/8 hover:bg-blue-500/15',
    chatBubble: 'from-blue-600 to-cyan-600',
    drawerHeader: 'from-blue-950/80 to-cyan-950/60 border-blue-800/50',
    glow1: 'bg-blue-600/5', glow2: 'bg-cyan-600/5',
    ping: 'bg-blue-300', dot: 'bg-blue-400',
    searchBorder: 'focus:border-blue-500/40',
    quickBg: 'bg-blue-500/6 hover:bg-blue-500/12 border-blue-500/15',
    quickText: 'text-blue-400',
  },
  MAINTENANCE: {
    label: 'Maintenance Mgr', shortLabel: 'Maintenance',
    icon: Wrench,
    gradient: 'from-amber-600 to-orange-600',
    gradientLight: 'from-amber-500/10 to-orange-500/10',
    accent: 'amber',
    accentHex: '#f59e0b',
    accentDim: 'rgba(245,158,11,0.12)',
    activeBg: 'bg-gradient-to-r from-amber-600 to-orange-600',
    activeGlow: 'shadow-amber-500/30',
    badgeBg: 'bg-amber-500/10', badgeText: 'text-amber-300', badgeBorder: 'border-amber-500/25',
    avatarRing: 'ring-amber-500/30', avatarText: 'text-amber-400',
    copilotActive: 'bg-amber-600 border-amber-500',
    copilotIdle: 'border-amber-500/25 text-amber-400 bg-amber-500/8 hover:bg-amber-500/15',
    chatBubble: 'from-amber-600 to-orange-600',
    drawerHeader: 'from-amber-950/80 to-orange-950/60 border-amber-800/50',
    glow1: 'bg-amber-600/5', glow2: 'bg-orange-600/5',
    ping: 'bg-amber-300', dot: 'bg-amber-400',
    searchBorder: 'focus:border-amber-500/40',
    quickBg: 'bg-amber-500/6 hover:bg-amber-500/12 border-amber-500/15',
    quickText: 'text-amber-400',
  },
  DRIVER: {
    label: 'Fleet Driver', shortLabel: 'Driver',
    icon: Truck,
    gradient: 'from-emerald-600 to-teal-600',
    gradientLight: 'from-emerald-500/10 to-teal-500/10',
    accent: 'emerald',
    accentHex: '#10b981',
    accentDim: 'rgba(16,185,129,0.12)',
    activeBg: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    activeGlow: 'shadow-emerald-500/30',
    badgeBg: 'bg-emerald-500/10', badgeText: 'text-emerald-300', badgeBorder: 'border-emerald-500/25',
    avatarRing: 'ring-emerald-500/30', avatarText: 'text-emerald-400',
    copilotActive: 'bg-emerald-600 border-emerald-500',
    copilotIdle: 'border-emerald-500/25 text-emerald-400 bg-emerald-500/8 hover:bg-emerald-500/15',
    chatBubble: 'from-emerald-600 to-teal-600',
    drawerHeader: 'from-emerald-950/80 to-teal-950/60 border-emerald-800/50',
    glow1: 'bg-emerald-600/5', glow2: 'bg-teal-600/5',
    ping: 'bg-emerald-300', dot: 'bg-emerald-400',
    searchBorder: 'focus:border-emerald-500/40',
    quickBg: 'bg-emerald-500/6 hover:bg-emerald-500/12 border-emerald-500/15',
    quickText: 'text-emerald-400',
  },
};

// ─── Hierarchical Nav Per Role ──────────────────────────────────────────────
// ADMIN: full expanded sidebar with sections
// DISPATCHER: medium sidebar focused on operations
// MAINTENANCE: medium sidebar focused on fleet health
// DRIVER: compact minimal sidebar
const buildMenu = (role) => {
  const all = [
    { name: 'Dashboard',    path: '/',            icon: Home,      roles: null,      section: 'Overview' },
    { name: 'Vehicles',     path: '/vehicles',    icon: Truck,     roles: null,      section: 'Fleet' },
    { name: 'Drivers',      path: '/drivers',     icon: Users,     roles: ['ADMIN','DISPATCHER'], section: 'Fleet' },
    { name: 'Trips',        path: '/trips',       icon: Calendar,  roles: null,      section: 'Operations' },
    { name: 'Live Tracking',path: '/tracking',    icon: Navigation,roles: null,      section: 'Operations' },
    { name: 'Maintenance',  path: '/maintenance', icon: Wrench,    roles: ['ADMIN','MAINTENANCE'], section: 'Fleet Health' },
    { name: 'Fuel Logs',    path: '/fuel-logs',   icon: Fuel,      roles: null,      section: 'Finance' },
    { name: 'Expenses',     path: '/expenses',    icon: CreditCard,roles: null,      section: 'Finance' },
    { name: 'Reports',      path: '/reports',     icon: BarChart3, roles: ['ADMIN','DISPATCHER'], section: 'Insights' },
  ];
  return all.filter(i => !i.roles || i.roles.includes(role));
};

const DashboardLayout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const chatEndRef = useRef(null);

  const role = user?.role || 'DISPATCHER';
  const theme = THEMES[role] || THEMES.DISPATCHER;
  const ThemeIcon = theme.icon;
  const menuItems = buildMenu(role);

  // Group menu by section (only ADMIN and DISPATCHER see sections)
  const showSections = ['ADMIN', 'DISPATCHER'].includes(role);
  const sections = showSections
    ? [...new Set(menuItems.map(i => i.section))]
    : null;

  useEffect(() => {
    setMessages([{
      sender: 'ai',
      text: `Hi ${user?.first_name || 'there'} 👋 I'm your TransitOps AI Copilot — powered by Gemini 2.5 Flash.\n\nI have real-time access to your fleet state. How can I assist you today?`,
    }]);
  }, [user]);

  useEffect(() => {
    if (copilotOpen) chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, copilotOpen]);

  const handleLogout = async () => { await logout(); navigate('/login'); };

  const sendMessage = async (text) => {
    const msg = (text || inputMessage).trim();
    if (!msg) return;
    if (!text) setInputMessage('');
    setMessages(p => [...p, { sender: 'user', text: msg }]);
    setAiLoading(true);
    try {
      const res = await api.post('/ai/chat/', { message: msg });
      setMessages(p => [...p, { sender: 'ai', text: res.data.reply }]);
    } catch {
      setMessages(p => [...p, { sender: 'ai', text: 'Unable to reach the AI server. Please try again.' }]);
    } finally { setAiLoading(false); }
  };

  const suggestions = {
    ADMIN: ['Fleet utilization summary', 'Any compliance risks?', 'Top cost drivers this month', 'Draft fleet status report'],
    DISPATCHER: ['Available drivers right now', 'Active trips status', 'Suggest optimal route for next trip', 'Any delayed deliveries?'],
    MAINTENANCE: ['Vehicles needing service soon', 'Current active repairs', 'Overdue maintenance schedule', 'Most fuel-inefficient vehicles'],
    DRIVER: ['My upcoming trips', 'How to log fuel expense?', 'What cargo am I carrying?', 'Nearest service station'],
  }[role] || [];

  const NavItem = ({ item }) => {
    const Icon = item.icon;
    const isActive = location.pathname === item.path;
    return (
      <Link to={item.path} onClick={() => setSidebarOpen(false)}
        className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
          isActive
            ? `${theme.activeBg} text-white shadow-md ${theme.activeGlow}`
            : 'text-gray-500 hover:bg-white/[0.04] hover:text-gray-200'
        }`}>
        <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-300'}`} />
        <span className="truncate">{item.name}</span>
        {isActive && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-white/60 flex-shrink-0" />}
      </Link>
    );
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#030509', fontFamily: "'Outfit', sans-serif" }}>
      {/* Ambient role glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className={`absolute -top-32 -left-32 w-[500px] h-[500px] rounded-full blur-[200px] opacity-[0.025] ${theme.glow1}`} />
        <div className={`absolute -bottom-32 -right-32 w-[600px] h-[600px] rounded-full blur-[200px] opacity-[0.025] ${theme.glow2}`} />
      </div>

      {/* Mobile overlay */}
      {sidebarOpen && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── SIDEBAR ── */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col transition-all duration-300 lg:static
        ${role === 'ADMIN' ? 'w-64' : role === 'DRIVER' ? 'w-56' : 'w-60'}
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        border-r border-white/[0.04]`}
        style={{ background: 'rgba(5,8,18,0.98)', backdropFilter: 'blur(20px)' }}>

        {/* Brand */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-white/[0.04] flex-shrink-0">
          <div className={`p-2 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg`} style={{ boxShadow: `0 0 16px ${theme.accentHex}40` }}>
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <span className="text-base font-black text-white tracking-tight">Transit<span style={{ color: theme.accentHex }}>Ops</span></span>
            {/* Role-specific sub-brand */}
            {role === 'ADMIN' && <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Control Center</p>}
            {role === 'DISPATCHER' && <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Dispatch Console</p>}
            {role === 'MAINTENANCE' && <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Fleet Workshop</p>}
            {role === 'DRIVER' && <p className="text-[9px] text-gray-600 font-bold uppercase tracking-widest">Driver Portal</p>}
          </div>
          <button className="ml-auto lg:hidden text-gray-600 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Profile */}
        <div className="p-4 border-b border-white/[0.04] flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className={`relative h-9 w-9 rounded-xl flex items-center justify-center font-black text-sm
              ring-2 ${theme.avatarRing} ${theme.avatarText}`}
              style={{ background: theme.accentDim }}>
              {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
              <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#050812] bg-emerald-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-bold text-white truncate">{user?.full_name || 'User'}</p>
              <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border
                ${theme.badgeBg} ${theme.badgeText} ${theme.badgeBorder}`}>
                <ThemeIcon className="h-2.5 w-2.5" />
                {theme.shortLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3 px-3 space-y-0.5"
          style={{ scrollbarWidth: 'none' }}>
          {showSections ? (
            sections.map(section => {
              const items = menuItems.filter(i => i.section === section);
              return (
                <div key={section} className="mb-3">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-700 px-3 mb-1.5">{section}</p>
                  {items.map(item => <NavItem key={item.path} item={item} />)}
                </div>
              );
            })
          ) : (
            menuItems.map(item => <NavItem key={item.path} item={item} />)
          )}
        </nav>

        {/* Bottom actions */}
        <div className="p-3 border-t border-white/[0.04] space-y-1 flex-shrink-0">
          {/* Admin-only: Django Admin link */}
          {role === 'ADMIN' && (
            <a href="http://localhost:8000/admin/" target="_blank" rel="noreferrer"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-500 hover:bg-violet-500/8 hover:text-violet-400 transition group">
              <Settings className="h-4 w-4 text-gray-600 group-hover:text-violet-400" />
              Django Admin Panel
            </a>
          )}
          <button onClick={handleLogout}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-semibold text-gray-600 hover:bg-red-500/8 hover:text-red-400 transition group">
            <LogOut className="h-4 w-4 text-gray-700 group-hover:text-red-400" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* ── MAIN AREA ── */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0 relative z-10">

        {/* ── HEADER ── */}
        <header className="h-16 flex items-center justify-between px-5 lg:px-7 border-b border-white/[0.04] flex-shrink-0"
          style={{ background: 'rgba(4,6,12,0.85)', backdropFilter: 'blur(20px)' }}>
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-white lg:hidden">
              <Menu className="h-5 w-5" />
            </button>

            {/* Role-specific context header */}
            <div className="hidden lg:flex flex-col">
              <span className="text-[11px] font-black uppercase tracking-widest text-gray-700">
                {role === 'ADMIN' ? 'System Administration' :
                 role === 'DISPATCHER' ? 'Dispatch Operations' :
                 role === 'MAINTENANCE' ? 'Fleet Workshop' : 'Driver Portal'}
              </span>
              <span className="text-xs text-gray-500 font-medium capitalize">
                {location.pathname === '/' ? 'Overview Dashboard' : location.pathname.replace('/', '').replace('-', ' ')}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* AI Copilot button */}
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`relative flex items-center gap-2 px-3.5 py-2 rounded-xl border text-[12px] font-extrabold transition-all duration-200 ${
                copilotOpen ? `${theme.copilotActive} text-white shadow-lg` : `${theme.copilotIdle}`
              }`}>
              <Bot className={`h-3.5 w-3.5 ${!copilotOpen ? 'animate-pulse' : ''}`} />
              <span>AI Copilot</span>
              {!copilotOpen && (
                <span className="flex h-2 w-2 ml-0.5">
                  <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full ${theme.ping} opacity-75`} />
                  <span className={`relative inline-flex h-2 w-2 rounded-full ${theme.dot}`} />
                </span>
              )}
            </motion.button>

            <div className="hidden sm:flex items-center h-8 px-3 gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] text-xs text-gray-500">
              <User className="h-3.5 w-3.5" />
              <span className="max-w-[140px] truncate">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-7" style={{ background: '#030509' }}>
          {children}
        </main>
      </div>

      {/* ── AI COPILOT DRAWER ── */}
      <AnimatePresence>
        {copilotOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 0.5 }} exit={{ opacity: 0 }}
              className="fixed inset-0 z-40 bg-black pointer-events-auto"
              onClick={() => setCopilotOpen(false)} />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 250 }}
              className="fixed top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col border-l border-white/[0.05] shadow-2xl"
              style={{ background: '#060a18' }}>

              {/* Drawer Header */}
              <div className={`flex h-16 items-center justify-between px-5 border-b border-white/[0.06] bg-gradient-to-r ${theme.drawerHeader}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${theme.gradient} shadow-lg`}
                    style={{ boxShadow: `0 0 12px ${theme.accentHex}50` }}>
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white tracking-tight">TransitOps Copilot</h3>
                    <p className={`text-[10px] font-bold ${theme.badgeText}`}>Gemini 2.5 Flash · {theme.label}</p>
                  </div>
                </div>
                <button onClick={() => setCopilotOpen(false)} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.06) transparent' }}>
                {messages.map((msg, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[88%] px-4 py-3 rounded-2xl text-[12px] leading-relaxed ${
                      msg.sender === 'user'
                        ? `bg-gradient-to-br ${theme.chatBubble} text-white rounded-tr-sm shadow-lg`
                        : 'bg-[#0b1024] border border-white/[0.06] text-gray-200 rounded-tl-sm'
                    }`}>
                      {msg.text.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>{line}</p>
                      ))}
                    </div>
                  </motion.div>
                ))}
                {aiLoading && (
                  <div className="flex justify-start">
                    <div className="bg-[#0b1024] border border-white/[0.06] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      {[0,1,2].map(d => (
                        <div key={d} className={`h-1.5 w-1.5 rounded-full ${theme.dot} animate-bounce`}
                          style={{ animationDelay: `${d * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions (first message only) */}
              {messages.length === 1 && (
                <div className="px-5 pb-3">
                  <p className={`text-[9px] font-extrabold uppercase tracking-widest mb-2 ${theme.badgeText}`}>Suggested for {theme.shortLabel}</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {suggestions.map((s, i) => (
                      <button key={i} onClick={() => sendMessage(s)}
                        className={`text-left text-[11px] px-3 py-2.5 rounded-xl border transition-all duration-150 text-gray-400 hover:text-white ${theme.quickBg}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-white/[0.04]" style={{ background: '#060a18' }}>
                <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex items-center gap-2">
                  <input type="text" value={inputMessage} onChange={e => setInputMessage(e.target.value)}
                    placeholder="Ask about fleet, routes, maintenance..."
                    className="flex-1 bg-white/[0.04] border border-white/[0.07] rounded-xl px-3.5 py-2.5 text-[12px] text-white placeholder-gray-600 focus:border-white/20 outline-none transition" />
                  <button type="submit" disabled={aiLoading || !inputMessage.trim()}
                    className={`p-2.5 rounded-xl text-white bg-gradient-to-br ${theme.gradient} disabled:opacity-40 shadow-lg transition`}
                    style={{ boxShadow: `0 4px 14px ${theme.accentHex}35` }}>
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </form>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DashboardLayout;
