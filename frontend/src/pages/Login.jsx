import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Key, Mail, Truck, UserCheck, AlertCircle, Eye, EyeOff,
  User, Phone, Calendar, ShieldCheck, ChevronRight
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
}).refine((data) => data.password === data.password_confirm, {
  message: 'Passwords do not match',
  path: ['password_confirm'],
}).refine((data) => {
  if (data.role === 'DRIVER') {
    return !!data.license_number && data.license_number.trim().length > 0;
  }
  return true;
}, {
  message: 'License number is required for drivers',
  path: ['license_number'],
}).refine((data) => {
  if (data.role === 'DRIVER') {
    return !!data.license_class;
  }
  return true;
}, {
  message: 'License class is required for drivers',
  path: ['license_class'],
}).refine((data) => {
  if (data.role === 'DRIVER') {
    return !!data.license_expiry && data.license_expiry.trim().length > 0;
  }
  return true;
}, {
  message: 'License expiry date is required for drivers',
  path: ['license_expiry'],
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  
  // Password Visibility States
  const [showPassword, setShowPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  const { register: regLogin, handleSubmit: handleLoginSubmit, setValue: setLoginVal, formState: { errors: loginErrors } } = useForm({
    resolver: zodResolver(loginSchema),
  });

  const { register: regSignup, handleSubmit: handleSignupSubmit, watch: watchSignup, formState: { errors: signupErrors }, reset: resetSignup, setError: setSignupError } = useForm({
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
    } catch {
      // toast is already fired in AuthContext login
    } finally {
      setLoading(false);
    }
  };

  const onRegisterSubmit = async (data) => {
    setLoading(true);
    try {
      await api.post('/auth/register/', data);
      toast.success('Registration successful! Please sign in with your credentials.');
      setIsLogin(true);
      setLoginVal('email', data.email);
      setLoginVal('password', data.password);
      resetSignup();
    } catch (err) {
      const errData = err.response?.data || {};
      const fields = [
        'email', 'first_name', 'last_name', 'phone', 'role', 
        'password', 'password_confirm', 'license_number', 'license_class', 'license_expiry'
      ];
      let mapped = false;
      fields.forEach((k) => {
        if (errData[k]) {
          setSignupError(k, { message: Array.isArray(errData[k]) ? errData[k][0] : String(errData[k]) });
          mapped = true;
        }
      });
      if (!mapped) {
        toast.error(errData.detail || 'Failed to complete registration');
      }
    } finally {
      setLoading(false);
    }
  };

  const selectDemoRole = (email, pass) => {
    setIsLogin(true);
    setLoginVal('email', email);
    setLoginVal('password', pass);
    toast.success('Credentials filled. Click Sign In to connect!');
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.97 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.45, ease: 'easeOut', staggerChildren: 0.05 }
    }
  };

  const itemVariants = {
    hidden: { y: 12, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.35, ease: 'easeOut' } }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#05070c] px-4 py-12 relative overflow-hidden font-sans">
      {/* Premium Fleet Highway Background Cover */}
      <div 
        className="absolute inset-0 bg-cover bg-center opacity-30 pointer-events-none scale-105 transition-transform duration-[10000ms] ease-out select-none"
        style={{ backgroundImage: `url('/bg-highway.png')` }}
      />
      
      {/* Dark overlay mask for perfect contrast */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#05070c] via-[#05070c]/85 to-[#05070c]/50 pointer-events-none" />

      {/* Decorative Blur Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/10 blur-[150px] pointer-events-none" />

      {/* Main card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-lg bg-[#0d1220]/80 backdrop-blur-lg rounded-2xl border border-gray-800/85 shadow-2xl p-8 space-y-7 relative z-10"
      >
        {/* Brand header */}
        <motion.div variants={itemVariants} className="flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 mb-3 animate-pulse">
            <Truck className="h-6 w-6" />
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight text-white">
            Transit<span className="text-blue-500">Ops</span>
          </h2>
          <p className="mt-1 text-xs text-gray-400 font-medium">
            Smart Transport Operations Platform
          </p>
        </motion.div>

        {/* Tab Selector */}
        <motion.div variants={itemVariants} className="flex p-1 bg-gray-950/60 rounded-lg border border-gray-800/80">
          <button
            onClick={() => { setIsLogin(true); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition duration-200 ${
              isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); }}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition duration-200 ${
              !isLogin ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white'
            }`}
          >
            Register Account
          </button>
        </motion.div>

        {/* Animated Form container */}
        <AnimatePresence mode="wait">
          {isLogin ? (
            <motion.form
              key="login"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
              onSubmit={handleLoginSubmit(onLoginSubmit)}
            >
              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    {...regLogin('email')}
                    type="email"
                    className={`block w-full rounded-lg border bg-gray-900/60 pl-10 pr-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                      loginErrors.email ? 'border-red-500/60' : 'border-gray-800'
                    }`}
                    placeholder="name@transitops.com"
                  />
                </div>
                {loginErrors.email && (
                  <p className="mt-1 flex items-center text-xs text-red-400 font-medium animate-pulse">
                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                    {loginErrors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Key className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    {...regLogin('password')}
                    type={showPassword ? 'text' : 'password'}
                    className={`block w-full rounded-lg border bg-gray-900/60 pl-10 pr-10 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                      loginErrors.password ? 'border-red-500/60' : 'border-gray-800'
                    }`}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition duration-150"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {loginErrors.password && (
                  <p className="mt-1 flex items-center text-xs text-red-400 font-medium animate-pulse">
                    <AlertCircle className="mr-1 h-3.5 w-3.5" />
                    {loginErrors.password.message}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-sm font-semibold text-white focus:outline-none shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition duration-200 disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>Sign In <ChevronRight className="h-4 w-4" /></>
                )}
              </button>
            </motion.form>
          ) : (
            <motion.form
              key="register"
              initial={{ opacity: 0, x: 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-4 max-h-[50vh] overflow-y-auto pr-1"
              onSubmit={handleSignupSubmit(onRegisterSubmit)}
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">First Name</label>
                  <input
                    {...regSignup('first_name')}
                    type="text"
                    className={`block w-full rounded-lg border bg-gray-900/60 px-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                      signupErrors.first_name ? 'border-red-500/60' : 'border-gray-800'
                    }`}
                    placeholder="John"
                  />
                  {signupErrors.first_name && <p className="text-red-400 text-2xs mt-1">{signupErrors.first_name.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Last Name</label>
                  <input
                    {...regSignup('last_name')}
                    type="text"
                    className={`block w-full rounded-lg border bg-gray-900/60 px-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                      signupErrors.last_name ? 'border-red-500/60' : 'border-gray-800'
                    }`}
                    placeholder="Doe"
                  />
                  {signupErrors.last_name && <p className="text-red-400 text-2xs mt-1">{signupErrors.last_name.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-4 w-4 text-gray-500" />
                  </div>
                  <input
                    {...regSignup('email')}
                    type="email"
                    className={`block w-full rounded-lg border bg-gray-900/60 pl-10 pr-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                      signupErrors.email ? 'border-red-500/60' : 'border-gray-800'
                    }`}
                    placeholder="john.doe@transitops.com"
                  />
                </div>
                {signupErrors.email && <p className="text-red-400 text-xs mt-1">{signupErrors.email.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Phone Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Phone className="h-4 w-4 text-gray-500" />
                    </div>
                    <input
                      {...regSignup('phone')}
                      type="text"
                      className={`block w-full rounded-lg border bg-gray-900/60 pl-10 pr-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                        signupErrors.phone ? 'border-red-500/60' : 'border-gray-800'
                      }`}
                      placeholder="9876543210"
                    />
                  </div>
                  {signupErrors.phone && <p className="text-red-400 text-2xs mt-1">{signupErrors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Platform Role</label>
                  <select
                    {...regSignup('role')}
                    className="block w-full rounded-lg border bg-gray-900 px-3 py-2.5 text-white focus:border-blue-500 text-sm border-gray-800"
                  >
                    <option value="DRIVER">Fleet Driver</option>
                    <option value="DISPATCHER">Dispatcher</option>
                    <option value="MAINTENANCE">Maintenance Manager</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
              </div>

              {/* Driver-specific license validation fields */}
              {selectedRole === 'DRIVER' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-4 border-t border-gray-800/80 pt-4"
                >
                  <div className="text-2xs uppercase tracking-wider font-bold text-blue-400">Driver License Profiles</div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">License Number</label>
                      <input
                        {...regSignup('license_number')}
                        type="text"
                        placeholder="DL-2026-X12"
                        className={`block w-full rounded-lg border bg-gray-900/60 px-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                          signupErrors.license_number ? 'border-red-500/60' : 'border-gray-800'
                        }`}
                      />
                      {signupErrors.license_number && <p className="text-red-400 text-2xs mt-1">{signupErrors.license_number.message}</p>}
                    </div>
                    <div>
                      <label className="block text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">License Class</label>
                      <select
                        {...regSignup('license_class')}
                        className="block w-full rounded-lg border bg-gray-900 px-3 py-2.5 text-white focus:border-blue-500 text-sm border-gray-800"
                      >
                        <option value="CLASS_A">Class A (Heavy Duty)</option>
                        <option value="CLASS_B">Class B (Medium Fleet)</option>
                        <option value="CLASS_C">Class C (Light Commercial)</option>
                      </select>
                      {signupErrors.license_class && <p className="text-red-400 text-2xs mt-1">{signupErrors.license_class.message}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-2xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">License Expiry Date</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                        <Calendar className="h-4 w-4 text-gray-500" />
                      </div>
                      <input
                        {...regSignup('license_expiry')}
                        type="date"
                        className={`block w-full rounded-lg border bg-gray-900/60 pl-10 pr-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                          signupErrors.license_expiry ? 'border-red-500/60' : 'border-gray-800'
                        }`}
                      />
                    </div>
                    {signupErrors.license_expiry && <p className="text-red-400 text-2xs mt-1">{signupErrors.license_expiry.message}</p>}
                  </div>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-4 border-t border-gray-800/80 pt-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
                  <div className="relative">
                    <input
                      {...regSignup('password')}
                      type={showRegPassword ? 'text' : 'password'}
                      className={`block w-full rounded-lg border bg-gray-900/60 px-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                        signupErrors.password ? 'border-red-500/60' : 'border-gray-800'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition duration-150"
                    >
                      {showRegPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupErrors.password && <p className="text-red-400 text-2xs mt-1">{signupErrors.password.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Confirm Password</label>
                  <div className="relative">
                    <input
                      {...regSignup('password_confirm')}
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      className={`block w-full rounded-lg border bg-gray-900/60 px-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                        signupErrors.password_confirm ? 'border-red-500/60' : 'border-gray-800'
                      }`}
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300 transition duration-150"
                    >
                      {showRegConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {signupErrors.password_confirm && <p className="text-red-400 text-2xs mt-1">{signupErrors.password_confirm.message}</p>}
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="flex w-full justify-center items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-sm font-semibold text-white focus:outline-none shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition duration-200 disabled:opacity-50 mt-4"
              >
                {loading ? (
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                ) : (
                  <>Register Account <ShieldCheck className="h-4 w-4" /></>
                )}
              </button>
            </motion.form>
          )}
        </AnimatePresence>

        {/* Demo Fast Access Sandbox Accounts */}
        <motion.div variants={itemVariants} className="border-t border-gray-800/80 pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold uppercase tracking-widest text-gray-500 flex items-center gap-1.5">
              <UserCheck className="h-4 w-4 text-blue-500" /> Demo Sandbox Accounts
            </span>
            <span className="text-[10px] text-gray-600 font-mono">Pass: TransitOps@2024</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-2xs">
            <button
              onClick={() => selectDemoRole('admin@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-3 rounded-xl bg-gray-950/40 border border-gray-800/80 hover:border-blue-500/50 hover:bg-blue-600/5 text-left transition group"
            >
              <span className="font-bold text-blue-400 group-hover:text-blue-300">Administrator</span>
              <span className="text-[10px] text-gray-500 mt-0.5 truncate w-full">admin@transitops.com</span>
            </button>
            <button
              onClick={() => selectDemoRole('dispatcher@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-3 rounded-xl bg-gray-950/40 border border-gray-800/80 hover:border-purple-500/50 hover:bg-purple-600/5 text-left transition group"
            >
              <span className="font-bold text-purple-400 group-hover:text-purple-300">Dispatcher</span>
              <span className="text-[10px] text-gray-500 mt-0.5 truncate w-full">dispatcher@transitops.com</span>
            </button>
            <button
              onClick={() => selectDemoRole('maintenance@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-3 rounded-xl bg-gray-950/40 border border-gray-800/80 hover:border-amber-500/50 hover:bg-amber-600/5 text-left transition group"
            >
              <span className="font-bold text-amber-400 group-hover:text-amber-300">Maintenance</span>
              <span className="text-[10px] text-gray-500 mt-0.5 truncate w-full">maintenance@transitops.com</span>
            </button>
            <button
              onClick={() => selectDemoRole('driver@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-3 rounded-xl bg-gray-950/40 border border-gray-800/80 hover:border-emerald-500/50 hover:bg-emerald-600/5 text-left transition group"
            >
              <span className="font-bold text-emerald-400 group-hover:text-emerald-300">Fleet Driver</span>
              <span className="text-[10px] text-gray-500 mt-0.5 truncate w-full">driver@transitops.com</span>
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Login;
