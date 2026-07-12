import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Truck, Shield, Calendar, Users, LogOut, Wrench, Fuel, BarChart3,
  CreditCard, User, Menu, X, Bot, Send, Sparkles, AlertCircle, RefreshCw
} from 'lucide-react';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';

const DashboardLayout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Layout States
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // AI Copilot States
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      sender: 'ai',
      text: `Hello ${user?.full_name?.split(' ')[0] || 'User'}, I am your TransitOps AI Copilot. How can I help optimize fleet operations today?`
    }
  ]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

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

  const filteredMenuItems = menuItems.filter(
    item => !item.roles || hasRole(item.roles)
  );

  const scrollChatToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (copilotOpen) {
      scrollChatToBottom();
    }
  }, [messages, copilotOpen]);

  const handleSendMessage = async (textToSend) => {
    const text = textToSend || inputMessage;
    if (!text.trim()) return;

    if (!textToSend) setInputMessage('');
    
    // Add user message
    setMessages(prev => [...prev, { sender: 'user', text }]);
    setLoading(true);

    try {
      const res = await api.post('/ai/chat/', { message: text });
      setMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
    } catch (err) {
      toast.error('Copilot failed to respond. Please try again.');
      setMessages(prev => [...prev, { sender: 'ai', text: 'Sorry, I encountered an issue connecting to the operational control server. Please verify settings.' }]);
    } finally {
      setLoading(false);
    }
  };

  const suggestions = [
    "Give me a summary of current fleet operations.",
    "Recommend maintenance prioritization for active trucks.",
    "Draft a standard dispatcher notice for route delays.",
    "Draft a cargo weight safety checklist for drivers."
  ];

  return (
    <div className="flex h-screen bg-[#080b11] text-gray-100 overflow-hidden relative">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800/80 bg-[#0c0f17] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800/80">
          <Link to="/" className="flex items-center space-x-2">
            <Truck className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-white">
              Transit<span className="text-blue-500">Ops</span>
            </span>
          </Link>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-gray-800/80 bg-gray-900/10">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 font-bold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20 mt-0.5">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white glow-blue'
                    : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-gray-800/80">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-800/80 bg-[#0c0f17] px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-auto flex items-center space-x-4">
            {/* Pulsing AI Copilot Button */}
            <button
              onClick={() => setCopilotOpen(!copilotOpen)}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-bold transition duration-200 relative overflow-hidden group ${
                copilotOpen 
                  ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/25'
                  : 'bg-blue-950/20 border-blue-500/30 text-blue-400 hover:border-blue-500/80 hover:bg-blue-950/40'
              }`}
            >
              <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000 ease-out" />
              <Bot className={`h-4 w-4 ${!copilotOpen ? 'animate-bounce' : ''}`} />
              <span>AI Copilot</span>
              {!copilotOpen && (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                </span>
              )}
            </button>
            
            <div className="h-4 w-[1px] bg-gray-800"></div>
            <div className="hidden sm:flex items-center space-x-2 text-xs text-gray-400">
              <User className="h-3.5 w-3.5 text-gray-500" />
              <span>{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Content Box */}
        <main className="flex-1 overflow-y-auto bg-[#080b11] p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Floating AI Copilot Slide Drawer */}
      <AnimatePresence>
        {copilotOpen && (
          <>
            {/* Backdrop for closing */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.3 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 bg-black pointer-events-auto"
              onClick={() => setCopilotOpen(false)}
            />
            
            {/* Drawer panel */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="absolute top-0 right-0 h-full w-full sm:w-[420px] bg-[#090d16] border-l border-gray-800/90 z-50 flex flex-col shadow-2xl"
            >
              {/* Header */}
              <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800/80 bg-[#0c0f17]">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-blue-600/10 border border-blue-500/20 text-blue-400">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">TransitOps Copilot</h3>
                    <span className="text-[10px] text-gray-400">Powered by Gemini 2.5 Flash</span>
                  </div>
                </div>
                <button
                  onClick={() => setCopilotOpen(false)}
                  className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-800/50 transition"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Chat Messages */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed ${
                        msg.sender === 'user'
                          ? 'bg-blue-600 text-white rounded-tr-none'
                          : 'bg-gray-900 border border-gray-800/80 text-gray-200 rounded-tl-none'
                      }`}
                    >
                      {msg.text.split('\n').map((line, idx) => (
                        <p key={idx} className={idx > 0 ? 'mt-1' : ''}>{line}</p>
                      ))}
                    </div>
                  </div>
                ))}
                
                {/* Typing Loader */}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-gray-900 border border-gray-800/80 rounded-2xl rounded-tl-none px-4 py-3 flex items-center space-x-1.5">
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="h-1.5 w-1.5 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                )}
                
                <div ref={chatEndRef} />
              </div>

              {/* Suggestions */}
              {messages.length === 1 && (
                <div className="px-6 pb-2 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider font-bold text-gray-500">Quick suggestions</p>
                  <div className="grid grid-cols-1 gap-1.5">
                    {suggestions.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(s)}
                        className="text-left text-2xs px-3 py-2 rounded-lg bg-gray-950/40 border border-gray-800/80 text-gray-400 hover:text-white hover:border-blue-500/50 hover:bg-blue-600/5 transition duration-150"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Input Form */}
              <div className="p-4 border-t border-gray-800/80 bg-[#0c0f17]">
                <form
                  onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Ask Copilot about vehicle diagnostics, routes, delay notices..."
                    className="flex-1 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2.5 text-xs text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition"
                  />
                  <button
                    type="submit"
                    disabled={loading || !inputMessage.trim()}
                    className="p-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition disabled:opacity-50 disabled:hover:bg-blue-600 shadow-md"
                  >
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
