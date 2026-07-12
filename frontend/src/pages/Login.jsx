import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Key, Mail, Truck, UserCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
  });

  const from = location.state?.from?.pathname || '/';

  const onSubmit = async (data) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate(from, { replace: true });
    } catch (err) {
      // toast is already fired in AuthContext login
    } finally {
      setLoading(false);
    }
  };

  // Helper for fast hackathon testing
  const selectDemoRole = (email, pass) => {
    setValue('email', email);
    setValue('password', pass);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full bg-blue-600/10 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 rounded-full bg-emerald-600/10 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 glass-card p-8 rounded-2xl shadow-2xl relative z-10">
        <div className="flex flex-col items-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-600 glow-blue text-white mb-4">
            <Truck className="h-8 w-8" />
          </div>
          <h2 className="mt-2 text-center text-3xl font-extrabold tracking-tight text-white">
            Transit<span className="text-blue-500">Ops</span>
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Smart Transport Operations Platform
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  {...register('email')}
                  type="email"
                  className={`block w-full rounded-lg border bg-gray-900/50 pl-10 pr-3 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.email ? 'border-red-500' : 'border-gray-800'}`}
                  placeholder="name@transitops.com"
                />
              </div>
              {errors.email && (
                <p className="mt-1 flex items-center text-xs text-red-500">
                  <AlertCircle className="mr-1 h-3.5 w-3.5" />
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Password</label>
              <div className="relative">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Key className="h-5 w-5 text-gray-500" />
                </div>
                <input
                  {...register('password')}
                  type="password"
                  className={`block w-full rounded-lg border bg-gray-900/50 pl-10 pr-3 py-2.5 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.password ? 'border-red-500' : 'border-gray-800'}`}
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 flex items-center text-xs text-red-500">
                  <AlertCircle className="mr-1 h-3.5 w-3.5" />
                  {errors.password.message}
                </p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative flex w-full justify-center rounded-lg border border-transparent bg-blue-600 py-3 px-4 text-sm font-semibold text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition duration-200 disabled:opacity-50"
            >
              {loading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                'Sign In'
              )}
            </button>
          </div>
        </form>

        {/* Demo Fast Access Credentials */}
        <div className="mt-8 border-t border-gray-800/80 pt-6">
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 flex items-center">
              <UserCheck className="mr-1.5 h-3.5 w-3.5" /> Demo Accounts
            </span>
            <span className="text-[10px] text-gray-500">Pass: TransitOps@2024</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              onClick={() => selectDemoRole('admin@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-2 rounded-lg bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800/20 text-left transition"
            >
              <span className="font-semibold text-blue-400">Admin</span>
              <span className="text-[10px] text-gray-500 truncate w-full">admin@transitops.com</span>
            </button>
            <button
              onClick={() => selectDemoRole('dispatcher@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-2 rounded-lg bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800/20 text-left transition"
            >
              <span className="font-semibold text-purple-400">Dispatcher</span>
              <span className="text-[10px] text-gray-500 truncate w-full">dispatcher@transitops.com</span>
            </button>
            <button
              onClick={() => selectDemoRole('maintenance@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-2 rounded-lg bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800/20 text-left transition"
            >
              <span className="font-semibold text-amber-400">Maintenance</span>
              <span className="text-[10px] text-gray-500 truncate w-full">maintenance@transitops.com</span>
            </button>
            <button
              onClick={() => selectDemoRole('driver@transitops.com', 'TransitOps@2024')}
              className="flex flex-col items-start p-2 rounded-lg bg-gray-900/40 border border-gray-800 hover:border-blue-500/50 hover:bg-gray-800/20 text-left transition"
            >
              <span className="font-semibold text-emerald-400">Driver</span>
              <span className="text-[10px] text-gray-500 truncate w-full">driver@transitops.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
