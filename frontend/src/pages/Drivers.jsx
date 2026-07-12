import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Edit2, Trash2, X, Users, AlertTriangle,
  Shield, ChevronDown, RefreshCw, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Schema ────────────────────────────────────────────────────────────────────
const schema = z.object({
  user: z.string().uuid('Select a valid user account'),
  license_number: z.string().min(4, 'License number is required'),
  license_class: z.enum(['CLASS_A', 'CLASS_B', 'CLASS_C']),
  license_expiry: z.string().min(1, 'Expiry date is required'),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'SUSPENDED']),
});

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  AVAILABLE: { label: 'Available', cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  ON_TRIP:   { label: 'On Trip',   cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  SUSPENDED: { label: 'Suspended', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const LC_LABELS = { CLASS_A: 'Class A', CLASS_B: 'Class B', CLASS_C: 'Class C' };

// ─── Reusable Field ────────────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);
const inputCls = (err) =>
  `block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600
   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition
   ${err ? 'border-red-500' : 'border-gray-800'}`;

// ─── Main Component ─────────────────────────────────────────────────────────────
const Drivers = () => {
  const { hasRole } = useAuth();
  const [drivers, setDrivers]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('');
  const [classFilter, setClass]     = useState('');
  const [isModalOpen, setModal]     = useState(false);
  const [editingDriver, setEditing] = useState(null);
  const [driverUsers, setDriverUsers] = useState([]);

  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'AVAILABLE', license_class: 'CLASS_B' },
  });

  // ─── Fetch drivers ────────────────────────────────────────────────────────────
  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search });
      if (statusFilter) params.set('status', statusFilter);
      if (classFilter)  params.set('license_class', classFilter);
      const res = await api.get(`/drivers/?${params}`);
      setDrivers(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load driver roster');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, classFilter]);

  useEffect(() => { fetchDrivers(); }, [fetchDrivers]);

  // ─── Fetch users with DRIVER role (admin-only endpoint; graceful fallback) ────
  const fetchDriverUsers = useCallback(async () => {
    try {
      const res = await api.get('/users/?role=DRIVER&page_size=100');
      setDriverUsers(res.data.results ?? res.data);
    } catch {
      setDriverUsers([]); // Non-admins can't access user list — handled gracefully
    }
  }, []);

  // ─── Modal helpers ────────────────────────────────────────────────────────────
  const openAdd = () => {
    setEditing(null);
    reset({ status: 'AVAILABLE', license_class: 'CLASS_B', license_number: '', license_expiry: '', user: '' });
    fetchDriverUsers();
    setModal(true);
  };

  const openEdit = (d) => {
    setEditing(d);
    reset({
      user: d.user,
      license_number: d.license_number,
      license_class: d.license_class,
      license_expiry: d.license_expiry,
      status: d.status,
    });
    fetchDriverUsers();
    setModal(true);
  };

  // ─── Submit ───────────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    try {
      if (editingDriver) {
        await api.put(`/drivers/${editingDriver.id}/`, data);
        toast.success('Driver profile updated');
      } else {
        await api.post('/drivers/', data);
        toast.success('Driver registered successfully');
      }
      setModal(false);
      fetchDrivers();
    } catch (err) {
      const errData = err.response?.data ?? {};
      const fieldKeys = ['user', 'license_number', 'license_class', 'license_expiry', 'status'];
      let mapped = false;
      fieldKeys.forEach((k) => {
        if (errData[k]) {
          setError(k, { message: Array.isArray(errData[k]) ? errData[k][0] : errData[k] });
          mapped = true;
        }
      });
      if (!mapped) toast.error(errData.detail ?? 'Failed to save driver');
    }
  };

  // ─── Delete ───────────────────────────────────────────────────────────────────
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Archive driver ${name}? Historical trip records are preserved.`)) return;
    try {
      await api.delete(`/drivers/${id}/`);
      toast.success(`${name} archived`);
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Cannot archive this driver');
    }
  };

  // ─── Quick status ─────────────────────────────────────────────────────────────
  const handleQuickStatus = async (id, newStatus) => {
    try {
      await api.patch(`/drivers/${id}/set-status/`, { status: newStatus });
      toast.success('Driver status updated');
      fetchDrivers();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Status update failed');
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────────
  const isExpired     = (d) => new Date(d) < new Date();
  const isExpiringSoon = (d) => {
    const diff = (new Date(d) - new Date()) / 86400000;
    return diff >= 0 && diff <= 30;
  };

  const counts = drivers.reduce((acc, d) => { acc[d.status] = (acc[d.status] ?? 0) + 1; return acc; }, {});

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Driver Roster</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage driver profiles, license classifications, and operational statuses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchDrivers} className="p-2.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <button onClick={openAdd} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg">
              <Plus className="h-4 w-4" /> Register Driver
            </button>
          )}
        </div>
      </div>

      {/* Status Summary Strip */}
      <div className="grid grid-cols-3 gap-3">
        {Object.entries(STATUS_META).map(([key, { label, cls }]) => (
          <button
            key={key}
            onClick={() => setStatus(statusFilter === key ? '' : key)}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition ${statusFilter === key ? cls : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'}`}
          >
            <span className="text-xs font-semibold text-gray-400">{label}</span>
            <span className="text-xl font-extrabold text-white">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="glass rounded-xl border border-gray-800/80 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name, email or license number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setStatus(e.target.value)}
              className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>
          <div className="relative">
            <select value={classFilter} onChange={(e) => setClass(e.target.value)}
              className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8">
              <option value="">All Classes</option>
              <option value="CLASS_A">Class A</option>
              <option value="CLASS_B">Class B</option>
              <option value="CLASS_C">Class C</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>
        {!loading && (
          <p className="mt-3 text-xs text-gray-500">
            Showing <span className="text-white font-semibold">{drivers.length}</span> drivers
          </p>
        )}
      </div>

      {/* Driver Cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : drivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {drivers.map((d) => {
            const sm = STATUS_META[d.status] ?? STATUS_META.AVAILABLE;
            const expired     = isExpired(d.license_expiry);
            const expiringSoon = !expired && isExpiringSoon(d.license_expiry);
            return (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className={`glass rounded-xl border flex flex-col transition ${
                  expired ? 'border-red-500/30' : expiringSoon ? 'border-amber-500/30' : 'border-gray-800/80 hover:border-gray-700'
                }`}
              >
                <div className="p-5 flex-1">
                  {/* Status + license badge */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${sm.cls}`}>
                      {sm.label}
                    </span>
                    {expired && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                        <AlertTriangle className="h-3 w-3" /> Expired
                      </span>
                    )}
                    {expiringSoon && (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                        <AlertTriangle className="h-3 w-3" /> Expires Soon
                      </span>
                    )}
                  </div>

                  {/* Avatar + Name */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base">
                      {d.user_name?.charAt(0).toUpperCase() ?? '?'}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white leading-tight">{d.user_name ?? '—'}</h3>
                      <p className="text-xs text-gray-500">{d.user_email ?? ''}</p>
                    </div>
                  </div>

                  {/* License details */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-800 pt-4">
                    <div>
                      <span className="text-gray-500 block mb-0.5">License No.</span>
                      <span className="font-mono font-semibold text-gray-200">{d.license_number}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block mb-0.5">Class</span>
                      <span className="font-semibold text-gray-200">{LC_LABELS[d.license_class] ?? d.license_class}</span>
                    </div>
                    <div className="col-span-2">
                      <span className="text-gray-500 block mb-0.5">Expiry Date</span>
                      <span className={`font-semibold ${expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-gray-200'}`}>
                        {d.license_expiry}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {hasRole(['ADMIN', 'DISPATCHER']) && (
                  <div className="px-5 pb-5 pt-0 flex items-center gap-2 border-t border-gray-800 mt-4 pt-4">
                    {/* Quick Status */}
                    <div className="relative group flex-1">
                      <button className="w-full inline-flex items-center justify-center gap-1.5 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition text-xs font-semibold">
                        <Zap className="h-3.5 w-3.5" /> Status <ChevronDown className="h-3 w-3" />
                      </button>
                      <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-20 w-40 rounded-xl border border-gray-700 bg-[#0d1117] shadow-2xl py-1">
                        {[['AVAILABLE', 'Available'], ['SUSPENDED', 'Suspended']]
                          .map(([k, label]) => (
                            <button key={k} onClick={() => handleQuickStatus(d.id, k)}
                              disabled={d.status === k}
                              className={`w-full text-left px-3 py-2 text-xs font-semibold transition ${d.status === k ? 'text-gray-600 cursor-default' : 'hover:bg-gray-800 text-gray-300'}`}>
                              <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border ${STATUS_META[k].cls}`}>{label}</span>
                            </button>
                          ))}
                      </div>
                    </div>
                    <button onClick={() => openEdit(d)} className="flex items-center gap-1.5 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition text-xs font-semibold">
                      <Edit2 className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      onClick={() => handleDelete(d.id, d.user_name)}
                      disabled={d.status === 'ON_TRIP'}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-800 rounded-2xl">
          <Users className="h-12 w-12 text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-white">No drivers found</h3>
          <p className="text-sm text-gray-500 mt-1">Register a driver or adjust your filters.</p>
        </div>
      )}

      {/* ── Add / Edit Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#0c0f17] shadow-2xl"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <h3 className="text-lg font-bold text-white">
                  {editingDriver ? `Edit — ${editingDriver.user_name}` : 'Register New Driver'}
                </h3>
                <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
                {/* User select — only on create */}
                {!editingDriver && (
                  <Field label="Driver User Account" error={errors.user?.message}>
                    {driverUsers.length > 0 ? (
                      <select {...register('user')} className={inputCls(errors.user)}>
                        <option value="">— Select a user with Driver role —</option>
                        {driverUsers.map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                        ))}
                      </select>
                    ) : (
                      <div className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                        Enter the User UUID manually (Admin access required to list driver users).
                        <input {...register('user')} placeholder="User UUID" className={`${inputCls(errors.user)} mt-2 font-mono`} />
                      </div>
                    )}
                  </Field>
                )}

                <Field label="License Number" error={errors.license_number?.message}>
                  <input {...register('license_number')} placeholder="DL-2024-MH-001" className={`${inputCls(errors.license_number)} uppercase font-mono tracking-wide`} />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="License Class">
                    <select {...register('license_class')} className={inputCls(false)}>
                      <option value="CLASS_A">Class A — Heavy</option>
                      <option value="CLASS_B">Class B — Medium</option>
                      <option value="CLASS_C">Class C — Light</option>
                    </select>
                  </Field>
                  <Field label="License Expiry" error={errors.license_expiry?.message}>
                    <input type="date" {...register('license_expiry')} className={inputCls(errors.license_expiry)} />
                  </Field>
                </div>

                <Field label="Operational Status">
                  <select {...register('status')} className={inputCls(false)}>
                    <option value="AVAILABLE">Available</option>
                    <option value="SUSPENDED">Suspended</option>
                    {editingDriver && <option value="ON_TRIP" disabled>On Trip (auto-managed)</option>}
                  </select>
                </Field>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                  <button type="button" onClick={() => setModal(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {editingDriver ? 'Save Changes' : 'Register Driver'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Drivers;
