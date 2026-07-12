import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Mail, Truck, UserCheck, AlertCircle, Eye, EyeOff,
  Phone, Calendar, ShieldCheck, ChevronRight, Activity,
  Shield, Users, Wrench
} from 'lucide-react';
import api from '../api/axiosInstance';
import toast from 'react-hot-toast';

// ─── Zod Validation Schemas ──────────────────────────────────────────────────
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  first_name: z.string().min(1, 'First name is required'),
  last_name: z.string().min(1, 'Last name is required'),
  phone: z.string().min(10, 'Phone number must be at least 10 digits'),
  role: z.enum(['ADMIN', 'DISPATCHER', 'MAINTENANCE', 'DRIVER']),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  password_confirm: z.string().min(6, 'Password confirmation is required'),
  license_number: z.string().optional(),
  license_class: z.enum(['CLASS_A', 'CLASS_B', 'CLASS_C']).optional(),
  license_expiry: z.string().optional(),
}).refine((d) => d.password === d.password_confirm, {
  message: 'Passwords do not match', path: ['password_confirm'],
}).refine((d) => d.role !== 'DRIVER' || (!!d.license_number && d.license_number.trim().length > 0), {
  message: 'License number is required for drivers', path: ['license_number'],
}).refine((d) => d.role !== 'DRIVER' || !!d.license_class, {
  message: 'License class is required for drivers', path: ['license_class'],
}).refine((d) => d.role !== 'DRIVER' || (!!d.license_expiry && d.license_expiry.trim().length > 0), {
  message: 'License expiry date is required for drivers', path: ['license_expiry'],
});

// ─── Role Info Cards ─────────────────────────────────────────────────────────
const ROLES_INFO = [
  { role: 'ADMIN', icon: Shield, label: 'Administrator', color: 'text-violet-400', border: 'border-violet-500/20', bg: 'bg-violet-500/5', desc: 'Full platform control' },
  { role: 'DISPATCHER', icon: Activity, label: 'Dispatcher', color: 'text-blue-400', border: 'border-blue-500/20', bg: 'bg-blue-500/5', desc: 'Trip & route management' },
  { role: 'MAINTENANCE', icon: Wrench, label: 'Maintenance', color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5', desc: 'Fleet servicing & repairs' },
  { role: 'DRIVER', icon: Users, label: 'Fleet Driver', color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5', desc: 'Route & cargo operations' },
];

// ─── Error Field ─────────────────────────────────────────────────────────────
const FieldError = ({ error }) => error ? (
  <p className="mt-1 flex items-center gap-1 text-xs text-red-400 font-medium">
    <AlertCircle className="h-3 w-3 flex-shrink-0" />{error.message}
  </p>
) : null;

// ─── Input ───────────────────────────────────────────────────────────────────
const Input = React.forwardRef(({ error, className = '', ...props }, ref) => (
  <input
    ref={ref}
    {...props}
    className={`block w-full rounded-xl border bg-white/[0.03] px-3.5 py-2.5 text-white placeholder-gray-600 focus:border-white/20 focus:ring-1 focus:ring-white/10 text-sm transition outline-none ${
      error ? 'border-red-500/40' : 'border-white/[0.07]'
    } ${className}`}
  />
));
Input.displayName = 'Input';


const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirm, setShowRegConfirm] = useState(false);

  const { register: regLogin, handleSubmit: handleLoginSubmit, setValue: setLoginVal, formState: { errors: le } } = useForm({ resolver: zodResolver(loginSchema) });

  const { register: regSignup, handleSubmit: handleSignupSubmit, watch: watchSignup, formState: { errors: se }, reset: resetSignup, setError: setSignupError } = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'DRIVER' }
  });

  const selectedRole = watchSignup('role');
  const from = location.state?.from?.pathname || '/';

  const onLoginSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch { /* toast fired in AuthContext */ } finally { setLoading(false); }
  };

  const onRegisterSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/register/', data);
      toast.success('Account created! Sign in with your credentials.');
      setIsLogin(true);
      setLoginVal('email', data.email);
      setLoginVal('password', data.password);
      resetSignup();
    } catch (err) {
      const errData = err.response?.data || {};
      const fields = ['email', 'first_name', 'last_name', 'phone', 'role', 'password', 'password_confirm', 'license_number', 'license_class', 'license_expiry'];
      let mapped = false;
      fields.forEach((k) => { if (errData[k]) { setSignupError(k, { message: Array.isArray(errData[k]) ? errData[k][0] : String(errData[k]) }); mapped = true; } });
      if (!mapped) toast.error(errData.detail || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const selectDemoRole = (email, pass) => {
    setIsLogin(true);
    setLoginVal('email', email);
    setLoginVal('password', pass);
    toast.success('Credentials filled — click Sign In!');
  };

  return (
    <div className="flex min-h-screen bg-[#040609] relative overflow-hidden font-sans">
      {/* Ambient background blobs */}
      <div className="absolute top-[-15%] left-[-15%] w-[55%] h-[55%] rounded-full bg-blue-600/5 blur-[180px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[55%] h-[55%] rounded-full bg-violet-600/5 blur-[180px] pointer-events-none" />
      <div className="absolute top-[40%] right-[30%] w-[30%] h-[30%] rounded-full bg-emerald-600/3 blur-[120px] pointer-events-none" />

      {/* Left Hero Panel — Hidden on mobile */}
      <div className="hidden lg:flex lg:w-[44%] xl:w-[48%] relative flex-col justify-between p-12 overflow-hidden border-r border-white/[0.04]">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{ backgroundImage: `url('/bg-highway.png')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-[#040609]/90 via-[#040609]/70 to-transparent" />

        {/* Brand */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-12">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-extrabold text-white tracking-tight">
              Transit<span className="text-blue-400">Ops</span>
            </span>
          </div>

          <div className="space-y-4">
            <h1 className="text-4xl xl:text-5xl font-extrabold text-white leading-tight tracking-tight">
              Smart Fleet
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-violet-400">Operations</span>
            </h1>
            <p className="text-gray-400 text-base leading-relaxed max-w-sm">
              Real-time dispatch management, AI-powered fleet insights, and full compliance tracking — all in one platform.
            </p>
          </div>

          {/* Feature Grid */}
          <div className="mt-10 grid grid-cols-2 gap-3">
            {ROLES_INFO.map(({ icon: Icon, label, color, border, bg, desc }) => (
              <div key={label} className={`flex items-start gap-3 p-3.5 rounded-xl border ${border} ${bg}`}>
                <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${color}`} />
                <div>
                  <p className={`text-xs font-bold ${color}`}>{label}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom tag */}
        <div className="relative z-10">
          <div className="flex items-center gap-2 text-xs text-gray-600">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>All systems operational · Powered by Gemini AI</span>
          </div>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-12 overflow-y-auto">
        {/* Mobile brand */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="p-2 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <span className="text-xl font-extrabold text-white">Transit<span className="text-blue-400">Ops</span></span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          {/* Form Card */}
          <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl backdrop-blur-lg shadow-2xl overflow-hidden">
            {/* Header */}
            <div className="p-6 pb-0">
              <h2 className="text-xl font-extrabold text-white">
                {isLogin ? 'Sign in to your account' : 'Create a new account'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {isLogin
                  ? 'Access the TransitOps operations dashboard'
                  : 'Join TransitOps and start managing your fleet'}
              </p>
            </div>

            {/* Tab Toggle */}
            <div className="p-6 pb-4">
              <div className="flex p-1 bg-white/[0.02] rounded-xl border border-white/[0.04]">
                <button onClick={() => setIsLogin(true)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-200 ${isLogin ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}>
                  Sign In
                </button>
                <button onClick={() => setIsLogin(false)} className={`flex-1 py-2 text-xs font-bold rounded-lg transition duration-200 ${!isLogin ? 'bg-blue-600 text-white shadow' : 'text-gray-500 hover:text-white'}`}>
                  Register Account
                </button>
              </div>
            </div>

            {/* Forms */}
            <AnimatePresence mode="wait">
              {isLogin ? (
                <motion.form key="login" initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}
                  onSubmit={handleLoginSubmit(onLoginSubmit)} className="px-6 pb-6 space-y-4">
                  
                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
                      <Input {...regLogin('email')} type="email" placeholder="name@transitops.com" className="pl-10" error={le.email} />
                    </div>
                    <FieldError error={le.email} />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Password</label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
                      <Input {...regLogin('password')} type={showPassword ? 'text' : 'password'} placeholder="••••••••" className="pl-10 pr-10" error={le.password} />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <FieldError error={le.password} />
                  </div>

                  <button type="submit" disabled={loading} className="flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/15 hover:shadow-blue-500/30 transition duration-200 disabled:opacity-50 mt-2">
                    {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (<>Sign In <ChevronRight className="h-4 w-4" /></>)}
                  </button>
                </motion.form>
              ) : (
                <motion.form key="register" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} transition={{ duration: 0.2 }}
                  onSubmit={handleSignupSubmit(onRegisterSubmit)} className="px-6 pb-6 space-y-4 max-h-[420px] overflow-y-auto pr-4">

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">First Name</label>
                      <Input {...regSignup('first_name')} type="text" placeholder="John" error={se.first_name} />
                      <FieldError error={se.first_name} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Last Name</label>
                      <Input {...regSignup('last_name')} type="text" placeholder="Doe" error={se.last_name} />
                      <FieldError error={se.last_name} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
                      <Input {...regSignup('email')} type="email" placeholder="john@transitops.com" className="pl-10" error={se.email} />
                    </div>
                    <FieldError error={se.email} />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Phone</label>
                      <div className="relative">
                        <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
                        <Input {...regSignup('phone')} type="text" placeholder="9876543210" className="pl-10" error={se.phone} />
                      </div>
                      <FieldError error={se.phone} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Role</label>
                      <select {...regSignup('role')} className="block w-full rounded-xl border bg-white/[0.03] border-white/[0.07] px-3.5 py-2.5 text-white focus:border-white/20 text-sm outline-none">
                        <option value="DRIVER">Fleet Driver</option>
                        <option value="DISPATCHER">Dispatcher</option>
                        <option value="MAINTENANCE">Maintenance</option>
                        <option value="ADMIN">Administrator</option>
                      </select>
                    </div>
                  </div>

                  {/* Driver License Fields */}
                  <AnimatePresence>
                    {selectedRole === 'DRIVER' && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
                        className="space-y-3 border-t border-white/[0.05] pt-4">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">Driver License Information</p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">License No.</label>
                            <Input {...regSignup('license_number')} type="text" placeholder="DL-2026-001" error={se.license_number} />
                            <FieldError error={se.license_number} />
                          </div>
                          <div>
                            <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Class</label>
                            <select {...regSignup('license_class')} className="block w-full rounded-xl border bg-white/[0.03] border-white/[0.07] px-3.5 py-2.5 text-white focus:border-white/20 text-sm outline-none">
                              <option value="CLASS_A">Class A — Heavy</option>
                              <option value="CLASS_B">Class B — Medium</option>
                              <option value="CLASS_C">Class C — Light</option>
                            </select>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">License Expiry</label>
                          <div className="relative">
                            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" />
                            <Input {...regSignup('license_expiry')} type="date" className="pl-10" error={se.license_expiry} />
                          </div>
                          <FieldError error={se.license_expiry} />
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="grid grid-cols-2 gap-3 border-t border-white/[0.05] pt-4">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Password</label>
                      <div className="relative">
                        <Input {...regSignup('password')} type={showRegPassword ? 'text' : 'password'} placeholder="••••••••" className="pr-10" error={se.password} />
                        <button type="button" onClick={() => setShowRegPassword(!showRegPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                          {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FieldError error={se.password} />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Confirm</label>
                      <div className="relative">
                        <Input {...regSignup('password_confirm')} type={showRegConfirm ? 'text' : 'password'} placeholder="••••••••" className="pr-10" error={se.password_confirm} />
                        <button type="button" onClick={() => setShowRegConfirm(!showRegConfirm)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition">
                          {showRegConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                      <FieldError error={se.password_confirm} />
                    </div>
                  </div>

                  <button type="submit" disabled={loading} className="flex w-full justify-center items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/15 transition duration-200 disabled:opacity-50 mt-2">
                    {loading ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" /> : (<>Create Account <ShieldCheck className="h-4 w-4" /></>)}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>

            {/* Demo Accounts */}
            <div className="px-6 pb-6 border-t border-white/[0.04] pt-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-gray-700" /> Demo Sandbox Accounts
                </p>
                <span className="text-[10px] text-gray-700 font-mono">TransitOps@2024</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { role: 'Administrator', email: 'admin@transitops.com', color: 'text-violet-400', border: 'hover:border-violet-500/40 hover:bg-violet-600/5' },
                  { role: 'Dispatcher', email: 'dispatcher@transitops.com', color: 'text-blue-400', border: 'hover:border-blue-500/40 hover:bg-blue-600/5' },
                  { role: 'Maintenance', email: 'maintenance@transitops.com', color: 'text-amber-400', border: 'hover:border-amber-500/40 hover:bg-amber-600/5' },
                  { role: 'Fleet Driver', email: 'driver@transitops.com', color: 'text-emerald-400', border: 'hover:border-emerald-500/40 hover:bg-emerald-600/5' },
                ].map((d) => (
                  <button key={d.role} onClick={() => selectDemoRole(d.email, 'TransitOps@2024')}
                    className={`flex flex-col items-start p-3 rounded-xl bg-white/[0.02] border border-white/[0.04] ${d.border} text-left transition group`}>
                    <span className={`text-xs font-bold ${d.color}`}>{d.role}</span>
                    <span className="text-[10px] text-gray-600 mt-0.5 truncate w-full">{d.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
