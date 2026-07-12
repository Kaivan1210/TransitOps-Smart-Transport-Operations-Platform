import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Mail, Truck, AlertCircle, Eye, EyeOff,
  Phone, Calendar, ShieldCheck, ChevronRight,
  Shield, Activity, Wrench, Users, Zap, MapPin, BarChart3
} from 'lucide-react';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';

// ─── Schemas ──────────────────────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'At least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  first_name: z.string().min(1, 'Required'),
  last_name: z.string().min(1, 'Required'),
  phone: z.string().min(10, 'Min 10 digits'),
  role: z.enum(['ADMIN', 'DISPATCHER', 'MAINTENANCE', 'DRIVER']),
  password: z.string()
    .min(8, 'At least 8 characters')
    .refine(v => !/^\d+$/.test(v), 'Cannot be entirely numeric'),
  password_confirm: z.string().min(8, 'Required'),
  license_number: z.string().optional(),
  license_class: z.enum(['CLASS_A', 'CLASS_B', 'CLASS_C']).optional(),
  license_expiry: z.string().optional(),
}).refine(d => d.password === d.password_confirm, {
  message: 'Passwords do not match', path: ['password_confirm'],
}).refine(d => d.role !== 'DRIVER' || !!d.license_number?.trim(), {
  message: 'Required for drivers', path: ['license_number'],
}).refine(d => d.role !== 'DRIVER' || !!d.license_class, {
  message: 'Required for drivers', path: ['license_class'],
}).refine(d => d.role !== 'DRIVER' || !!d.license_expiry?.trim(), {
  message: 'Required for drivers', path: ['license_expiry'],
});

// ─── Role Definitions ─────────────────────────────────────────────────────────
const ROLES = [
  {
    role: 'ADMIN',
    icon: Shield,
    label: 'Administrator',
    tagline: 'Full platform command',
    color: 'from-violet-500 to-purple-600',
    glow: 'shadow-violet-500/40',
    text: 'text-violet-400',
    border: 'border-violet-500/30',
    bg: 'bg-violet-500/10',
    dot: 'bg-violet-400',
    perks: ['Full CRUD access', 'User management', 'System analytics'],
  },
  {
    role: 'DISPATCHER',
    icon: Activity,
    label: 'Dispatcher',
    tagline: 'Live route control',
    color: 'from-blue-500 to-cyan-600',
    glow: 'shadow-blue-500/40',
    text: 'text-blue-400',
    border: 'border-blue-500/30',
    bg: 'bg-blue-500/10',
    dot: 'bg-blue-400',
    perks: ['Trip dispatch', 'Driver assignment', 'Route monitoring'],
  },
  {
    role: 'MAINTENANCE',
    icon: Wrench,
    label: 'Maintenance Mgr',
    tagline: 'Fleet health control',
    color: 'from-amber-500 to-orange-600',
    glow: 'shadow-amber-500/40',
    text: 'text-amber-400',
    border: 'border-amber-500/30',
    bg: 'bg-amber-500/10',
    dot: 'bg-amber-400',
    perks: ['Repair logs', 'Vehicle inspections', 'Parts tracking'],
  },
  {
    role: 'DRIVER',
    icon: Truck,
    label: 'Fleet Driver',
    tagline: 'On-road operations',
    color: 'from-emerald-500 to-teal-600',
    glow: 'shadow-emerald-500/40',
    text: 'text-emerald-400',
    border: 'border-emerald-500/30',
    bg: 'bg-emerald-500/10',
    dot: 'bg-emerald-400',
    perks: ['My trips', 'Fuel log entry', 'Expense claims'],
  },
];

const DEMO_USERS = [
  { role: 'ADMIN',       email: 'admin@transitops.com',       pass: 'TransitOps@2024' },
  { role: 'DISPATCHER',  email: 'dispatcher@transitops.com',  pass: 'TransitOps@2024' },
  { role: 'MAINTENANCE', email: 'maintenance@transitops.com', pass: 'TransitOps@2024' },
  { role: 'DRIVER',      email: 'driver@transitops.com',      pass: 'TransitOps@2024' },
];

// ─── Small helpers ────────────────────────────────────────────────────────────
const FieldError = ({ error }) => error ? (
  <p className="mt-1 flex items-center gap-1 text-[11px] text-red-400">
    <AlertCircle className="h-3 w-3 flex-shrink-0" />{error.message}
  </p>
) : null;

const Input = React.forwardRef(({ error, prefix, suffix, className = '', ...props }, ref) => (
  <div className="relative">
    {prefix && <span className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">{prefix}</span>}
    <input
      ref={ref}
      {...props}
      className={`block w-full rounded-xl border bg-white/[0.04] px-3.5 py-2.5 text-[13px] text-white placeholder-gray-600
        focus:outline-none focus:border-white/25 focus:ring-1 focus:ring-white/10 transition-all duration-200
        ${error ? 'border-red-500/40 bg-red-500/5' : 'border-white/[0.08]'}
        ${prefix ? 'pl-10' : ''} ${suffix ? 'pr-10' : ''} ${className}`}
    />
    {suffix && <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</span>}
  </div>
));
Input.displayName = 'Input';

// ─── Animated metric pill ──────────────────────────────────────────────────────
const MetricPill = ({ icon: Icon, value, label, color, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20, scale: 0.9 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    transition={{ delay, duration: 0.5, ease: 'easeOut' }}
    className="flex items-center gap-2.5 bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl px-4 py-3 shadow-xl"
  >
    <div className={`p-2 rounded-xl bg-gradient-to-br ${color}`}>
      <Icon className="h-3.5 w-3.5 text-white" />
    </div>
    <div>
      <p className="text-base font-extrabold text-white leading-none">{value}</p>
      <p className="text-[10px] text-gray-500 mt-0.5">{label}</p>
    </div>
  </motion.div>
);

// ─── Main Component ────────────────────────────────────────────────────────────
const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);
  const [showPwd3, setShowPwd3] = useState(false);
  const [activeRole, setActiveRole] = useState(0);

  // Auto-cycle role highlight on hero panel
  useEffect(() => {
    const t = setInterval(() => setActiveRole(r => (r + 1) % 4), 3000);
    return () => clearInterval(t);
  }, []);

  const { register: regL, handleSubmit: submitL, setValue: setLVal, formState: { errors: le } } = useForm({ resolver: zodResolver(loginSchema) });
  const { register: regR, handleSubmit: submitR, watch: watchR, formState: { errors: re }, reset: resetR, setError: setRErr } = useForm({
    resolver: zodResolver(registerSchema), defaultValues: { role: 'DRIVER' },
  });

  const selectedRole = watchR('role');
  const from = location.state?.from?.pathname || '/';

  const onLogin = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch { /* handled in AuthContext */ } finally { setLoading(false); }
  };

  const onRegister = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/register/', data);
      toast.success('Account created! Sign in below.');
      setIsLogin(true);
      setLVal('email', data.email);
      resetR();
    } catch (err) {
      const d = err.response?.data || {};
      const fields = ['email','first_name','last_name','phone','role','password','password_confirm','license_number','license_class','license_expiry'];
      let mapped = false;
      fields.forEach(k => { if (d[k]) { setRErr(k, { message: Array.isArray(d[k]) ? d[k][0] : String(d[k]) }); mapped = true; } });
      if (!mapped) toast.error(d.detail || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const fillDemo = (email, pass) => {
    setIsLogin(true);
    setLVal('email', email);
    setLVal('password', pass);
    toast.success('Demo credentials filled — click Sign In!', { icon: '⚡' });
  };

  const activeRoleData = ROLES[activeRole];

  return (
    <div className="flex min-h-screen overflow-hidden" style={{ background: '#020408', fontFamily: "'Outfit', sans-serif" }}>
      {/* ── LEFT HERO PANEL ── */}
      <div className="hidden lg:flex lg:w-[52%] xl:w-[55%] relative flex-col overflow-hidden">
        {/* Background image */}
        <div className="absolute inset-0">
          <img src="/transit-hero.png" alt="Fleet Operations" className="w-full h-full object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#020408] via-[#020408]/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#020408] via-transparent to-transparent" />
        </div>

        {/* Animated grid overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{ backgroundImage: 'linear-gradient(rgba(99,179,237,1) 1px, transparent 1px), linear-gradient(90deg, rgba(99,179,237,1) 1px, transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Floating orbs */}
        <motion.div animate={{ y: [-8, 8, -8] }} transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-[20%] right-[15%] w-40 h-40 rounded-full bg-blue-600/10 blur-[60px]" />
        <motion.div animate={{ y: [8, -8, 8] }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[25%] left-[10%] w-56 h-56 rounded-full bg-violet-600/8 blur-[80px]" />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between h-full p-10 xl:p-14">
          {/* Brand */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
            className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 shadow-lg shadow-blue-600/30">
              <Truck className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight text-white">Transit<span className="text-blue-400">Ops</span></h1>
              <p className="text-[10px] text-gray-500 font-medium tracking-widest uppercase">Smart Fleet Platform</p>
            </div>
          </motion.div>

          {/* Main headline */}
          <div className="space-y-8">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2, duration: 0.7 }}>
              <h2 className="text-4xl xl:text-5xl font-black text-white leading-[1.1] tracking-tight">
                Intelligent Fleet<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-cyan-400 to-indigo-400">
                  Operations Hub
                </span>
              </h2>
              <p className="mt-4 text-gray-400 text-sm leading-relaxed max-w-sm">
                AI-powered dispatch, real-time tracking, and predictive maintenance — unified for every role in your organization.
              </p>
            </motion.div>

            {/* Live metrics */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4, duration: 0.6 }}
              className="grid grid-cols-2 gap-3">
              <MetricPill icon={Truck} value="24/7" label="Fleet Monitoring" color="from-blue-600 to-cyan-600" delay={0.5} />
              <MetricPill icon={Zap} value="AI" label="Gemini Copilot" color="from-violet-600 to-purple-600" delay={0.6} />
              <MetricPill icon={MapPin} value="GPS" label="Live Tracking" color="from-emerald-600 to-teal-600" delay={0.7} />
              <MetricPill icon={BarChart3} value="ROI" label="Fleet Analytics" color="from-amber-600 to-orange-600" delay={0.8} />
            </motion.div>

            {/* Cycling role cards */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600">Platform Roles</p>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((r, idx) => {
                  const Icon = r.icon;
                  const isActive = idx === activeRole;
                  return (
                    <motion.div key={r.role} animate={{ scale: isActive ? 1.02 : 1 }} transition={{ duration: 0.3 }}
                      className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all duration-500 cursor-pointer
                        ${isActive ? `${r.bg} ${r.border} shadow-lg ${r.glow}` : 'border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04]'}`}
                      onClick={() => setActiveRole(idx)}>
                      <div className={`p-2 rounded-lg bg-gradient-to-br ${r.color} flex-shrink-0`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-xs font-extrabold truncate ${isActive ? r.text : 'text-gray-400'}`}>{r.label}</p>
                        <p className="text-[10px] text-gray-600 truncate">{r.tagline}</p>
                      </div>
                      {isActive && (
                        <motion.span layoutId="activeRoleDot"
                          className={`absolute right-3 top-3 h-1.5 w-1.5 rounded-full ${r.dot}`} />
                      )}
                    </motion.div>
                  );
                })}
              </div>
              {/* Role perks */}
              <AnimatePresence mode="wait">
                <motion.div key={activeRole} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.25 }}
                  className={`flex flex-wrap gap-1.5 pt-1`}>
                  {activeRoleData.perks.map(p => (
                    <span key={p} className={`text-[10px] px-2 py-1 rounded-lg font-semibold ${activeRoleData.bg} ${activeRoleData.text} border ${activeRoleData.border}`}>{p}</span>
                  ))}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Bottom status bar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1, duration: 0.6 }}
            className="flex items-center gap-2 text-xs text-gray-600">
            <span className="flex gap-1 items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              All systems operational
            </span>
            <span className="text-gray-700">·</span>
            <span>Gemini 2.5 Flash powered</span>
          </motion.div>
        </div>
      </div>

      {/* ── RIGHT FORM PANEL ── */}
      <div className="flex flex-1 flex-col items-center justify-center px-5 py-12 lg:px-10 xl:px-16 overflow-y-auto relative">
        {/* Panel ambient */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-600/5 blur-[120px]" />
          <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full bg-violet-600/5 blur-[100px]" />
        </div>

        {/* Mobile brand */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="lg:hidden flex items-center gap-2.5 mb-8 relative z-10">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-black text-white">Transit<span className="text-blue-400">Ops</span></span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
          className="w-full max-w-[400px] relative z-10">

          {/* Card */}
          <div className="rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: 'rgba(8,12,24,0.85)', border: '1px solid rgba(255,255,255,0.07)', backdropFilter: 'blur(24px)' }}>

            {/* Header bar */}
            <div className="px-7 pt-7 pb-5">
              <AnimatePresence mode="wait">
                <motion.div key={isLogin ? 'signin-title' : 'register-title'}
                  initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }} transition={{ duration: 0.2 }}>
                  <h2 className="text-xl font-black text-white tracking-tight">
                    {isLogin ? 'Welcome back' : 'Create account'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {isLogin ? 'Sign in to your TransitOps workspace' : 'Join the TransitOps platform'}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Tab switcher */}
              <div className="mt-5 flex p-1 rounded-xl gap-1" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                {['Sign In', 'Register'].map((t, i) => (
                  <button key={t} onClick={() => setIsLogin(i === 0)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all duration-200 ${
                      (i === 0) === isLogin
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/20'
                        : 'text-gray-500 hover:text-gray-300'
                    }`}>{t}</button>
                ))}
              </div>
            </div>

            {/* Form body */}
            <div className="px-7 pb-7">
              <AnimatePresence mode="wait">

                {/* ── LOGIN FORM ── */}
                {isLogin ? (
                  <motion.form key="login-form" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
                    transition={{ duration: 0.22 }} onSubmit={submitL(onLogin)} className="space-y-4">

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Email Address</label>
                      <Input {...regL('email')} type="email" placeholder="you@transitops.com" error={le.email}
                        prefix={<Mail className="h-4 w-4 text-gray-600" />} />
                      <FieldError error={le.email} />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-2">Password</label>
                      <Input {...regL('password')} type={showPwd ? 'text' : 'password'} placeholder="••••••••" error={le.password}
                        prefix={<Key className="h-4 w-4 text-gray-600" />}
                        suffix={
                          <button type="button" onClick={() => setShowPwd(!showPwd)} className="text-gray-500 hover:text-gray-300 transition">
                            {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        } />
                      <FieldError error={le.password} />
                    </div>

                    <button type="submit" disabled={loading}
                      className="mt-2 flex w-full justify-center items-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white
                        bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                        shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 transition-all duration-200 disabled:opacity-50">
                      {loading ? <div className="h-4.5 w-4.5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (
                        <><span>Sign In</span><ChevronRight className="h-4 w-4" /></>
                      )}
                    </button>
                  </motion.form>

                ) : (
                  /* ── REGISTER FORM ── */
                  <motion.form key="register-form" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    transition={{ duration: 0.22 }} onSubmit={submitR(onRegister)} className="space-y-3.5 max-h-[430px] overflow-y-auto scroll-smooth pr-1"
                    style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.08) transparent' }}>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">First Name</label>
                        <Input {...regR('first_name')} placeholder="John" error={re.first_name} />
                        <FieldError error={re.first_name} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Last Name</label>
                        <Input {...regR('last_name')} placeholder="Doe" error={re.last_name} />
                        <FieldError error={re.last_name} />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Email</label>
                      <Input {...regR('email')} type="email" placeholder="you@transitops.com" error={re.email}
                        prefix={<Mail className="h-4 w-4 text-gray-600" />} />
                      <FieldError error={re.email} />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Phone</label>
                        <Input {...regR('phone')} placeholder="9876543210" error={re.phone}
                          prefix={<Phone className="h-4 w-4 text-gray-600" />} />
                        <FieldError error={re.phone} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Role</label>
                        <select {...regR('role')}
                          className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-white/25 transition cursor-pointer">
                          {ROLES.map(r => <option key={r.role} value={r.role}>{r.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {/* Driver license section */}
                    <AnimatePresence>
                      {selectedRole === 'DRIVER' && (
                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                          className="space-y-3 border-t border-emerald-500/20 pt-3 overflow-hidden">
                          <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                            <Truck className="h-3 w-3" /> Driver License Info
                          </p>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">License No.</label>
                              <Input {...regR('license_number')} placeholder="DL-2026-001" error={re.license_number} />
                              <FieldError error={re.license_number} />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Class</label>
                              <select {...regR('license_class')}
                                className="block w-full rounded-xl border border-white/[0.08] bg-white/[0.04] px-3 py-2.5 text-[13px] text-white focus:outline-none focus:border-white/25 transition cursor-pointer">
                                <option value="CLASS_A">Class A — Heavy</option>
                                <option value="CLASS_B">Class B — Medium</option>
                                <option value="CLASS_C">Class C — Light</option>
                              </select>
                              <FieldError error={re.license_class} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">License Expiry</label>
                            <Input {...regR('license_expiry')} type="date" error={re.license_expiry}
                              prefix={<Calendar className="h-4 w-4 text-gray-600" />} />
                            <FieldError error={re.license_expiry} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-2 gap-3 border-t border-white/[0.05] pt-3.5">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Password</label>
                        <Input {...regR('password')} type={showPwd2 ? 'text' : 'password'} placeholder="••••••••" error={re.password}
                          suffix={
                            <button type="button" onClick={() => setShowPwd2(!showPwd2)} className="text-gray-500 hover:text-gray-300 transition">
                              {showPwd2 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          } />
                        <FieldError error={re.password} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-widest text-gray-500 mb-1.5">Confirm</label>
                        <Input {...regR('password_confirm')} type={showPwd3 ? 'text' : 'password'} placeholder="••••••••" error={re.password_confirm}
                          suffix={
                            <button type="button" onClick={() => setShowPwd3(!showPwd3)} className="text-gray-500 hover:text-gray-300 transition">
                              {showPwd3 ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          } />
                        <FieldError error={re.password_confirm} />
                      </div>
                    </div>
                    <p className="text-[10px] text-gray-500/80 mt-1 pl-1">
                      * Use at least 8 characters. Avoid entirely numeric or common passwords.
                    </p>

                    <button type="submit" disabled={loading}
                      className="flex w-full justify-center items-center gap-2 rounded-xl py-3 text-sm font-extrabold text-white mt-1
                        bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500
                        shadow-lg shadow-blue-600/20 transition-all duration-200 disabled:opacity-50">
                      {loading ? <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (
                        <><ShieldCheck className="h-4 w-4" /><span>Create Account</span></>
                      )}
                    </button>
                  </motion.form>
                )}
              </AnimatePresence>
            </div>

            {/* Demo Accounts */}
            <div className="border-t border-white/[0.04] px-7 pb-7 pt-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-600 mb-3">Quick Demo Access</p>
              <div className="grid grid-cols-2 gap-2">
                {DEMO_USERS.map(d => {
                  const roleInfo = ROLES.find(r => r.role === d.role);
                  const Icon = roleInfo.icon;
                  return (
                    <button key={d.role} onClick={() => fillDemo(d.email, d.pass)}
                      className={`group flex items-center gap-2.5 p-3 rounded-xl border transition-all duration-200
                        bg-white/[0.02] hover:${roleInfo.bg} border-white/[0.04] hover:${roleInfo.border} text-left`}>
                      <div className={`p-1.5 rounded-lg bg-gradient-to-br ${roleInfo.color} flex-shrink-0`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className={`text-[11px] font-extrabold ${roleInfo.text} truncate`}>{roleInfo.label}</p>
                        <p className="text-[9px] text-gray-600 truncate">Click to fill</p>
                      </div>
                    </button>
                  );
                })}
              </div>
              <p className="text-center text-[10px] text-gray-700 mt-3 font-mono">Password: TransitOps@2024</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
