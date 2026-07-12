import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wrench, Plus, Edit2, Trash2, X, Search, ChevronDown,
  RefreshCw, Calendar, CheckCircle2, PlayCircle, ShieldAlert,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Validation Schema ────────────────────────────────────────────────────────
const schema = z.object({
  vehicle: z.string().uuid('Select a valid vehicle'),
  description: z.string().min(5, 'Description must be at least 5 characters'),
  cost: z.coerce.number().nonnegative('Cost cannot be negative'),
  start_date: z.string().min(1, 'Start date is required'),
  end_date: z.string().optional().or(z.literal('')),
  status: z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']),
});

const STATUS_META = {
  SCHEDULED:   { label: 'Scheduled',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Calendar },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20',    icon: PlayCircle },
  COMPLETED:   { label: 'Completed',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20', icon: CheckCircle2 },
};

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

const Maintenance = () => {
  const { hasRole } = useAuth();
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLog, setEditingLog] = useState(null);

  const {
    register, handleSubmit, reset, setError, watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'SCHEDULED', cost: 0, start_date: new Date().toISOString().split('T')[0] }
  });

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, ordering: '-created_at' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/maintenance/?${params}`);
      setLogs(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load maintenance logs');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await api.get('/vehicles/?page_size=100');
      setVehicles(res.data.results ?? res.data);
    } catch (err) {
      console.error('Failed to fetch vehicles list', err);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const openAddModal = () => {
    setEditingLog(null);
    reset({
      vehicle: '',
      description: '',
      cost: 0,
      start_date: new Date().toISOString().split('T')[0],
      end_date: '',
      status: 'SCHEDULED',
    });
    fetchVehicles();
    setIsModalOpen(true);
  };

  const openEditModal = (log) => {
    setEditingLog(log);
    reset({
      vehicle: log.vehicle,
      description: log.description,
      cost: log.cost,
      start_date: log.start_date,
      end_date: log.end_date ?? '',
      status: log.status,
    });
    fetchVehicles();
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    if (!data.end_date) delete data.end_date;
    try {
      if (editingLog) {
        await api.put(`/maintenance/${editingLog.id}/`, data);
        toast.success('Maintenance records updated');
      } else {
        await api.post('/maintenance/', data);
        toast.success('Maintenance log created');
      }
      setIsModalOpen(false);
      fetchLogs();
    } catch (err) {
      const errData = err.response?.data ?? {};
      const fields = ['vehicle', 'description', 'cost', 'start_date', 'end_date', 'status'];
      let mapped = false;
      fields.forEach((k) => {
        if (errData[k]) {
          setError(k, { message: Array.isArray(errData[k]) ? errData[k][0] : String(errData[k]) });
          mapped = true;
        }
      });
      if (!mapped) toast.error(errData.detail ?? 'Failed to save maintenance log');
    }
  };

  const handleDelete = async (id, desc) => {
    if (!window.confirm(`Archive maintenance log: "${desc.substring(0, 30)}..."?`)) return;
    try {
      await api.delete(`/maintenance/${id}/`);
      toast.success('Maintenance record deleted');
      fetchLogs();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Failed to delete record');
    }
  };

  const totalMaintenanceCost = logs.reduce((sum, item) => sum + parseFloat(item.cost || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Maintenance Logs</h1>
          <p className="mt-1 text-sm text-gray-400">
            Track repairs, parts service schedules, maintenance costs, and automatic vehicle status transitions.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchLogs} className="p-2.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          {hasRole(['ADMIN', 'MAINTENANCE']) && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg"
            >
              <Plus className="h-4 w-4" /> Log Maintenance
            </button>
          )}
        </div>
      </div>

      {/* Summary Cost Card */}
      <div className="glass rounded-xl p-5 border border-gray-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Active logs Maintenance Cost</span>
          <h2 className="text-3xl font-extrabold text-white mt-1">Rs. {totalMaintenanceCost.toLocaleString()}</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
          <Wrench className="h-4 w-4" />
          {logs.length} Maintenance entries logged
        </span>
      </div>

      {/* Search & Filter Bar */}
      <div className="glass rounded-xl border border-gray-800/80 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by description or vehicle license plate..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 text-sm"
            />
          </div>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, { label }]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Grid List */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : logs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {logs.map((log) => {
            const sm = STATUS_META[log.status] ?? STATUS_META.SCHEDULED;
            const StatusIcon = sm.icon;
            return (
              <motion.div
                key={log.id}
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl border border-gray-800/80 hover:border-gray-700 transition flex flex-col justify-between"
              >
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${sm.cls}`}>
                      <StatusIcon className="h-3.5 w-3.5" />
                      {sm.label}
                    </span>
                    <span className="text-sm font-extrabold text-white">Rs. {Number(log.cost).toLocaleString()}</span>
                  </div>

                  <div>
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded">
                      {log.vehicle_detail?.license_plate ?? 'Unknown vehicle'}
                    </span>
                    <h3 className="text-sm font-semibold text-gray-200 mt-2 line-clamp-3 leading-relaxed">
                      {log.description}
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-800/60 pt-3 text-gray-400">
                    <div>
                      <span className="text-gray-500 block">Start Date</span>
                      <span className="font-semibold text-gray-300">{log.start_date}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Completed Date</span>
                      <span className="font-semibold text-gray-300">{log.end_date ?? '—'}</span>
                    </div>
                  </div>
                </div>

                {hasRole(['ADMIN', 'MAINTENANCE']) && (
                  <div className="px-5 pb-5 pt-0 flex items-center gap-2 border-t border-gray-800/60 mt-2 pt-3">
                    <button
                      onClick={() => openEditModal(log)}
                      className="flex-1 inline-flex items-center justify-center gap-1.5 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition text-xs font-semibold"
                    >
                      <Edit2 className="h-3.5 w-3.5" /> Edit Log
                    </button>
                    <button
                      onClick={() => handleDelete(log.id, log.description)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition"
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
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 border border-dashed border-gray-800 rounded-2xl">
          <Wrench className="h-12 w-12 text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-white">No maintenance history</h3>
          <p className="text-sm text-gray-400 mt-1">Register repair logs to track service operations.</p>
        </div>
      )}

      {/* Add / Edit Modal */}
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
                  {editingLog ? 'Edit Maintenance Log' : 'Create Maintenance Log'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
                <Field label="Vehicle" error={errors.vehicle?.message}>
                  <select {...register('vehicle')} disabled={!!editingLog} className={inputCls(errors.vehicle)}>
                    <option value="">— Select vehicle —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} · {v.license_plate} ({v.status})
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Description" error={errors.description?.message}>
                  <textarea
                    {...register('description')}
                    rows={3}
                    placeholder="Describe maintenance work (e.g. Engine oil change, brake caliper replacement)"
                    className={inputCls(errors.description)}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Cost (Rs.)" error={errors.cost?.message}>
                    <input type="number" step="0.01" {...register('cost')} className={inputCls(errors.cost)} />
                  </Field>
                  <Field label="Status" error={errors.status?.message}>
                    <select {...register('status')} className={inputCls(errors.status)}>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="IN_PROGRESS">In Progress (updates vehicle to MAINTENANCE)</option>
                      <option value="COMPLETED">Completed (releases vehicle to AVAILABLE)</option>
                    </select>
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Start Date" error={errors.start_date?.message}>
                    <input type="date" {...register('start_date')} className={inputCls(errors.start_date)} />
                  </Field>
                  <Field label="End Date (optional)" error={errors.end_date?.message}>
                    <input type="date" {...register('end_date')} className={inputCls(errors.end_date)} />
                  </Field>
                </div>

                <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                  <ShieldAlert className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  Transitioning status to "In Progress" marks vehicle status as "Under Maintenance". Transitioning status to "Completed" automatically releases vehicle back to "Available".
                </div>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg disabled:opacity-60"
                  >
                    {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Save Log
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

export default Maintenance;
