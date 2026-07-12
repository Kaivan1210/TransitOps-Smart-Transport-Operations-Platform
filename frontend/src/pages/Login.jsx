import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Key, Mail, Truck, UserCheck, AlertCircle, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
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

  const selectDemoRole = (email, pass) => {
    setValue('email', email);
    setValue('password', pass);
    toast.success('Credentials filled. Click Sign In to connect!');
  };

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { duration: 0.5, ease: 'easeOut', when: 'beforeChildren', staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { y: 15, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { duration: 0.4, ease: 'easeOut' } }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#070b11] px-4 py-12 relative overflow-hidden font-sans">
      {/* Visual background ambient glow blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[60%] h-[60%] rounded-full bg-indigo-600/10 blur-[180px] pointer-events-none" />
      <div className="absolute top-[40%] right-[-20%] w-[35%] h-[35%] rounded-full bg-emerald-600/5 blur-[120px] pointer-events-none" />

      {/* Main card */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="w-full max-w-md bg-[#0d1220]/80 backdrop-blur-md rounded-2xl border border-gray-800/80 shadow-2xl p-8 space-y-7 relative z-10"
      >
        {/* Brand header */}
        <motion.div variants={itemVariants} className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/20 mb-4">
            <Truck className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">
            Transit<span className="text-blue-500">Ops</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400 font-medium">
            Smart Transport Operations Platform
          </p>
        </motion.div>

        {/* Input form */}
        <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
          <motion.div variants={itemVariants} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Email Address</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  className={`block w-full rounded-lg border bg-gray-900/50 pl-10 pr-3 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                    errors.email ? 'border-red-500/60' : 'border-gray-800'
                  }`}
                  placeholder="name@transitops.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 flex items-center text-xs text-red-400 font-medium">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Password</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                  <Key className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  className={`block w-full rounded-lg border bg-gray-900/50 pl-10 pr-10 py-2.5 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition ${
                    errors.password ? 'border-red-500/60' : 'border-gray-800'
                  }`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 flex items-center text-xs text-red-400 font-medium">
                  <AlertCircle className="mr-1 h-4 w-4" />
                  {errors.password.message}
                </p>
              )}
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 py-3 text-sm font-semibold text-white focus:outline-none shadow-lg shadow-blue-500/10 hover:shadow-blue-500/25 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Sign In'
              )}
            </button>
          </motion.div>
        </form>

        {/* Demo Fast Access Credentials */}
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
