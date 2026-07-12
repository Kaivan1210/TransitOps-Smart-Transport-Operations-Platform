import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Calendar, Users, LogOut, Wrench, Fuel, BarChart3,
  CreditCard, User, Menu, X, Bot, Send, Sparkles
} from 'lucide-react';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';

// ─── Role Theme Definitions ────────────────────────────────────────────────────
const ROLE_THEMES = {
  ADMIN: {
    label: 'Administrator',
    accent: 'violet',
    gradient: 'from-violet-600 to-purple-600',
    gradientHover: 'from-violet-700 to-purple-700',
    activeBg: 'bg-violet-600',
    activeGlow: 'shadow-violet-500/20',
    badgeBg: 'bg-violet-500/10',
    badgeText: 'text-violet-400',
    badgeBorder: 'ring-violet-500/20',
    avatarBg: 'bg-violet-600/10 border-violet-500/20 text-violet-400',
    highlightBorder: 'border-violet-500/30',
    highlightBg: 'bg-violet-500/5',
    copilotBtn: 'border-violet-500/30 text-violet-400 hover:border-violet-500/80 hover:bg-violet-950/40 bg-violet-950/20',
    copilotBtnActive: 'bg-violet-600 border-violet-500 text-white shadow-violet-500/25',
    copilotHeader: 'from-violet-900/60 to-purple-900/30 border-violet-800/60',
    sidebarActiveBg: 'bg-gradient-to-r from-violet-600 to-purple-600',
    sidebarBrand: 'text-violet-400',
    dotColor: 'bg-violet-400',
    pingColor: 'bg-violet-300',
  },
  DISPATCHER: {
    label: 'Dispatcher',
    accent: 'blue',
    gradient: 'from-blue-600 to-cyan-600',
    gradientHover: 'from-blue-700 to-cyan-700',
    activeBg: 'bg-blue-600',
    activeGlow: 'shadow-blue-500/20',
    badgeBg: 'bg-blue-500/10',
    badgeText: 'text-blue-400',
    badgeBorder: 'ring-blue-500/20',
    avatarBg: 'bg-blue-600/10 border-blue-500/20 text-blue-400',
    highlightBorder: 'border-blue-500/30',
    highlightBg: 'bg-blue-500/5',
    copilotBtn: 'border-blue-500/30 text-blue-400 hover:border-blue-500/80 hover:bg-blue-950/40 bg-blue-950/20',
    copilotBtnActive: 'bg-blue-600 border-blue-500 text-white shadow-blue-500/25',
    copilotHeader: 'from-blue-900/60 to-cyan-900/30 border-blue-800/60',
    sidebarActiveBg: 'bg-gradient-to-r from-blue-600 to-cyan-600',
    sidebarBrand: 'text-blue-400',
    dotColor: 'bg-blue-400',
    pingColor: 'bg-blue-300',
  },
  MAINTENANCE: {
    label: 'Maintenance',
    accent: 'amber',
    gradient: 'from-amber-600 to-orange-600',
    gradientHover: 'from-amber-700 to-orange-700',
    activeBg: 'bg-amber-600',
    activeGlow: 'shadow-amber-500/20',
    badgeBg: 'bg-amber-500/10',
    badgeText: 'text-amber-400',
    badgeBorder: 'ring-amber-500/20',
    avatarBg: 'bg-amber-600/10 border-amber-500/20 text-amber-400',
    highlightBorder: 'border-amber-500/30',
    highlightBg: 'bg-amber-500/5',
    copilotBtn: 'border-amber-500/30 text-amber-400 hover:border-amber-500/80 hover:bg-amber-950/40 bg-amber-950/20',
    copilotBtnActive: 'bg-amber-600 border-amber-500 text-white shadow-amber-500/25',
    copilotHeader: 'from-amber-900/60 to-orange-900/30 border-amber-800/60',
    sidebarActiveBg: 'bg-gradient-to-r from-amber-600 to-orange-600',
    sidebarBrand: 'text-amber-400',
    dotColor: 'bg-amber-400',
    pingColor: 'bg-amber-300',
  },
  DRIVER: {
    label: 'Fleet Driver',
    accent: 'emerald',
    gradient: 'from-emerald-600 to-teal-600',
    gradientHover: 'from-emerald-700 to-teal-700',
    activeBg: 'bg-emerald-600',
    activeGlow: 'shadow-emerald-500/20',
    badgeBg: 'bg-emerald-500/10',
    badgeText: 'text-emerald-400',
    badgeBorder: 'ring-emerald-500/20',
    avatarBg: 'bg-emerald-600/10 border-emerald-500/20 text-emerald-400',
    highlightBorder: 'border-emerald-500/30',
    highlightBg: 'bg-emerald-500/5',
    copilotBtn: 'border-emerald-500/30 text-emerald-400 hover:border-emerald-500/80 hover:bg-emerald-950/40 bg-emerald-950/20',
    copilotBtnActive: 'bg-emerald-600 border-emerald-500 text-white shadow-emerald-500/25',
    copilotHeader: 'from-emerald-900/60 to-teal-900/30 border-emerald-800/60',
    sidebarActiveBg: 'bg-gradient-to-r from-emerald-600 to-teal-600',
    sidebarBrand: 'text-emerald-400',
    dotColor: 'bg-emerald-400',
    pingColor: 'bg-emerald-300',
  },
};

const DashboardLayout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const role = user?.role || 'DISPATCHER';
  const theme = ROLE_THEMES[role] || ROLE_THEMES.DISPATCHER;

  useEffect(() => {
    setMessages([{
      sender: 'ai',
      text: `Hello ${user?.first_name || 'Team Member'} 👋 I'm your TransitOps AI Copilot. I have real-time access to your fleet's operational data. How can I help you today?`
    }]);
  }, [user]);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: BarChart3, roles: null },
    { name: 'Vehicles', path: '/vehicles', icon: Truck, roles: null },
    { name: 'Drivers', path: '/drivers', icon: Users, roles: ['ADMIN', 'DISPATCHER'] },
    { name: 'Trips', path: '/trips', icon: Calendar, roles: null },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['ADMIN', 'MAINTENANCE'] },
    { name: 'Fuel Logs', path: '/fuel-logs', icon: Fuel, roles: null },
    { name: 'Expenses', path: '/expenses', icon: CreditCard, roles: null },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'DISPATCHER'] },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredMenuItems = menuItems.filter(item => !item.roles || hasRole(item.roles));

  const scrollToBottom = () => chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { if (copilotOpen) scrollToBottom(); }, [messages, copilotOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = (textToSend || inputMessage).trim();
    if (!text) return;
    if (!textToSend) setInputMessage('');
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setLoading(true);
    try {
      const res = await api.post('/ai/chat/', { message: text });
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
    } catch {
      setMessages(prev => [...prev, { sender: 'ai', text: 'I encountered an issue connecting to the AI server. Please try again in a moment.' }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "What is the current fleet status?",
    "Which drivers have expiring licenses?",
    "Summarize active maintenance jobs.",
    "Draft a route delay advisory notice.",
  ];

  return (
    <div className="flex h-screen overflow-hidden relative" style={{ background: '#040609' }}>
      {/* Ambient role-colored background glow */}
      <div className={`absolute inset-0 pointer-events-none`}>
        <div className={`absolute top-0 left-0 w-72 h-72 rounded-full blur-[140px] opacity-[0.03]
          ${role === 'ADMIN' ? 'bg-violet-500' : role === 'MAINTENANCE' ? 'bg-amber-500' : role === 'DRIVER' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
        <div className={`absolute bottom-0 right-0 w-96 h-96 rounded-full blur-[180px] opacity-[0.03]
          ${role === 'ADMIN' ? 'bg-purple-600' : role === 'MAINTENANCE' ? 'bg-orange-500' : role === 'DRIVER' ? 'bg-teal-500' : 'bg-cyan-500'}`} />
      </div>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.04] bg-[#070b12]/95 backdrop-blur-xl transition-transform duration-300 lg:static lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        
        {/* Brand */}
        <div className="flex h-16 items-center justify-between px-5 border-b border-white/[0.04]">
          <Link to="/" className="flex items-center gap-2">
            <div className={`p-1.5 rounded-lg bg-gradient-to-br ${theme.gradient}`}>
              <Truck className="h-4 w-4 text-white" />
            </div>
            <span className="text-lg font-extrabold tracking-tight text-white">
              Transit<span className={theme.sidebarBrand}>Ops</span>
            </span>
          </Link>
          <button className="lg:hidden text-gray-500 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl border font-extrabold text-sm ${theme.avatarBg}`}>
              {user?.full_name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-white truncate">{user?.full_name}</p>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider mt-0.5 ${theme.badgeBg} ${theme.badgeText} ring-1 ring-inset ${theme.badgeBorder}`}>
                {theme.label}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-0.5 px-3 py-4 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`group flex items-center px-3 py-2.5 text-sm font-semibold rounded-xl transition-all duration-150 ${
                  isActive
                    ? `${theme.sidebarActiveBg} text-white shadow-lg ${theme.activeGlow}`
                    : 'text-gray-500 hover:bg-white/[0.03] hover:text-white'
                }`}
              >
                <Icon className={`mr-3 h-4.5 w-4.5 ${isActive ? 'text-white' : 'text-gray-600 group-hover:text-gray-300'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-white/[0.04]">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2.5 text-sm font-semibold text-gray-500 hover:bg-red-500/[0.08] hover:text-red-400 rounded-xl transition-all duration-150"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-white/[0.04] bg-[#070b12]/80 backdrop-blur-xl px-5 lg:px-8 flex-shrink-0">
          <button onClick={() => setSidebarOpen(true)} className="text-gray-500 hover:text-white lg:hidden">
            <Menu className="h-5 w-5" />
          </button>

          <div className="ml-auto flex items-center gap-3">
            {/* AI Copilot button with role-color */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border text-xs font-bold transition duration-200 relative overflow-hidden ${
                copilotOpen
                  ? `${theme.copilotBtnActive} shadow-lg`
                  : theme.copilotBtn
              }`}
            >
              <Bot className={`h-3.5 w-3.5 ${!copilotOpen ? 'animate-pulse' : ''}`} />
              <span>AI Copilot</span>
              {!copilotOpen && (
                <span className="flex h-2 w-2">
                  <span className={`animate-ping absolute inline-flex h-2 w-2 rounded-full ${theme.pingColor} opacity-75`} />
                  <span className={`relative inline-flex rounded-full h-2 w-2 ${theme.dotColor}`} />
                </span>
              )}
            </motion.button>

            <div className="h-4 w-[1px] bg-white/[0.06]" />
            <div className="hidden sm:flex items-center gap-2 text-xs text-gray-500">
              <User className="h-3.5 w-3.5" />
              <span className="truncate max-w-[160px]">{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-5 lg:p-8" style={{ background: '#040609' }}>
          {children}
        </main>
      </div>

      {/* AI Copilot Drawer */}
      <AnimatePresence>
        {copilotOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.4 }} exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black pointer-events-auto"
              onClick={() => setCopilotOpen(false)}
            />
            <motion.div
              initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 240 }}
              className="absolute top-0 right-0 h-full w-full sm:w-[420px] z-50 flex flex-col border-l border-white/[0.05] shadow-2xl"
              style={{ background: '#070b12' }}
            >
              {/* Copilot Header */}
              <div className={`flex h-16 items-center justify-between px-5 border-b border-white/[0.05] bg-gradient-to-r ${theme.copilotHeader}`}>
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl bg-gradient-to-br ${theme.gradient}`}>
                    <Sparkles className="h-3.5 w-3.5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-white">TransitOps Copilot</h3>
                    <span className={`text-[10px] font-bold ${theme.badgeText}`}>Gemini 2.5 Flash • {theme.label} Mode</span>
                  </div>
                </div>
                <button onClick={() => setCopilotOpen(false)} className="p-2 rounded-xl text-gray-500 hover:text-white hover:bg-white/[0.06] transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-5 space-y-4">
                {messages.map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.sender === 'user'
                        ? `bg-gradient-to-br ${theme.gradient} text-white rounded-tr-sm`
                        : 'bg-[#0d1222] border border-white/[0.05] text-gray-200 rounded-tl-sm'
                    }`}>
                      {msg.text.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-1.5' : ''}>{line}</p>
                      ))}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-[#0d1222] border border-white/[0.05] rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1.5">
                      {[0, 1, 2].map(d => (
                        <div key={d} className={`h-1.5 w-1.5 rounded-full ${theme.dotColor} animate-bounce`} style={{ animationDelay: `${d * 150}ms` }} />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length === 1 && (
                <div className="px-5 pb-3 space-y-2">
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${theme.badgeText}`}>Suggested queries</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {suggestions.map((s, idx) => (
                      <button key={idx} onClick={() => handleSendMessage(s)}
                        className={`text-left text-[11px] px-3 py-2.5 rounded-xl border transition duration-150 text-gray-400 hover:text-white ${theme.highlightBg} ${theme.highlightBorder} hover:border-opacity-70`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input */}
              <div className="p-4 border-t border-white/[0.04] bg-[#070b12]">
                <form onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask about fleet status, routes, maintenance..."
                    className="flex-1 bg-[#0d1222] border border-white/[0.06] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:border-white/20 outline-none transition"
                  />
                  <button type="submit" disabled={loading || !inputMessage.trim()}
                    className={`p-2.5 rounded-xl bg-gradient-to-br ${theme.gradient} text-white transition disabled:opacity-40 shadow-lg`}>
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
