import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Edit2, Trash2, X, Truck, LayoutGrid, List,
  ChevronDown, RefreshCw, Zap,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  make: z.string().min(2, 'Make must be at least 2 characters'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().min(1990, 'Year must be ≥ 1990').max(new Date().getFullYear() + 1, 'Invalid year'),
  license_plate: z.string().min(4, 'License plate is required'),
  vin: z
    .string()
    .refine((v) => v === '' || v.length === 17, { message: 'VIN must be exactly 17 characters' })
    .optional()
    .or(z.literal('')),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'OUT_OF_SERVICE']),
  payload_capacity_kg: z.coerce.number().positive('Payload capacity must be positive'),
  fuel_type: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'CNG']),
  odometer: z.coerce.number().nonnegative('Odometer cannot be negative'),
});

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  AVAILABLE:      { label: 'Available',      cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
  ON_TRIP:        { label: 'On Trip',        cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20' },
  MAINTENANCE:    { label: 'Maintenance',    cls: 'bg-amber-500/10 text-amber-400 border-amber-500/20' },
  OUT_OF_SERVICE: { label: 'Out of Service', cls: 'bg-red-500/10 text-red-400 border-red-500/20' },
};

const FUEL_ICONS = { DIESEL: '⛽', PETROL: '⛽', ELECTRIC: '⚡', CNG: '🌀' };

// ─── Reusable form field ────────────────────────────────────────────────────────
const Field = ({ label, error, children }) => (
  <div>
    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</label>
    {children}
    {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
  </div>
);

const inputCls = (hasErr) =>
  `block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600
   focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm transition
   ${hasErr ? 'border-red-500' : 'border-gray-800'}`;

// ─── Main Component ─────────────────────────────────────────────────────────────
const Vehicles = () => {
  const { hasRole } = useAuth();
  const [vehicles, setVehicles]     = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fuelFilter, setFuelFilter]     = useState('');
  const [ordering, setOrdering]         = useState('-created_at');
  const [viewMode, setViewMode]         = useState('grid'); // 'grid' | 'table'
  const [isModalOpen, setIsModalOpen]   = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { status: 'AVAILABLE', fuel_type: 'DIESEL', odometer: 0 } });

  // ─── Fetch ───────────────────────────────────────────────────────────────────
  const fetchVehicles = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, ordering });
      if (statusFilter) params.set('status', statusFilter);
      if (fuelFilter) params.set('fuel_type', fuelFilter);
      const res = await api.get(`/vehicles/?${params}`);
      const payload = res.data;
      setVehicles(payload.results ?? payload);
      setTotalCount(payload.count ?? (payload.results ?? payload).length);
    } catch {
      toast.error('Failed to load fleet registry');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, fuelFilter, ordering]);

  useEffect(() => { fetchVehicles(); }, [fetchVehicles]);

  // ─── Modal helpers ───────────────────────────────────────────────────────────
  const openAddModal = () => {
    setEditingVehicle(null);
    reset({ make: '', model: '', year: new Date().getFullYear(), license_plate: '',
            vin: '', status: 'AVAILABLE', payload_capacity_kg: '', fuel_type: 'DIESEL', odometer: 0 });
    setIsModalOpen(true);
  };

  const openEditModal = (v) => {
    setEditingVehicle(v);
    reset({ make: v.make, model: v.model, year: v.year, license_plate: v.license_plate,
            vin: v.vin ?? '', status: v.status, payload_capacity_kg: v.payload_capacity_kg,
            fuel_type: v.fuel_type, odometer: v.odometer });
    setIsModalOpen(true);
  };

  // ─── Submit (maps backend field errors onto form) ────────────────────────────
  const onSubmit = async (data) => {
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}/`, data);
        toast.success('Vehicle records updated');
      } else {
        await api.post('/vehicles/', data);
        toast.success('Vehicle registered successfully');
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err) {
      const errData = err.response?.data ?? {};
      // Map field-level errors back to form
      const fieldKeys = ['make', 'model', 'year', 'license_plate', 'vin',
                         'status', 'payload_capacity_kg', 'fuel_type', 'odometer'];
      let hasFieldError = false;
      fieldKeys.forEach((key) => {
        if (errData[key]) {
          setError(key, { message: Array.isArray(errData[key]) ? errData[key][0] : errData[key] });
          hasFieldError = true;
        }
      });
      if (!hasFieldError) {
        toast.error(errData.detail ?? 'An error occurred while saving');
      }
    }
  };

  // ─── Delete (soft) ───────────────────────────────────────────────────────────
  const handleDelete = async (id, plate) => {
    if (!window.confirm(`Archive vehicle ${plate}? Historical records are preserved.`)) return;
    try {
      await api.delete(`/vehicles/${id}/`);
      toast.success(`${plate} archived`);
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Cannot archive this vehicle');
    }
  };

  // ─── Quick status change ─────────────────────────────────────────────────────
  const handleQuickStatus = async (id, newStatus) => {
    try {
      await api.patch(`/vehicles/${id}/set-status/`, { status: newStatus });
      toast.success('Status updated');
      fetchVehicles();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Status update failed');
    }
  };

  // ─── Fleet summary counts ────────────────────────────────────────────────────
  const counts = vehicles.reduce((acc, v) => {
    acc[v.status] = (acc[v.status] ?? 0) + 1;
    return acc;
  }, {});

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Fleet Registry</h1>
          <p className="mt-1 text-sm text-gray-400">
            Manage vehicle assets, payload limits, and operational statuses.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchVehicles} className="p-2.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <button
              onClick={openAddModal}
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg"
            >
              <Plus className="h-4 w-4" />
              Register Vehicle
            </button>
          )}
        </div>
      </div>

      {/* Fleet Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_META).map(([key, { label, cls }]) => (
          <button
            key={key}
            onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition cursor-pointer ${
              statusFilter === key ? cls : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'
            }`}
          >
            <span className="text-xs font-semibold text-gray-400">{label}</span>
            <span className="text-xl font-extrabold text-white">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search + Filters + Sort + View Toggle */}
      <div className="glass rounded-xl border border-gray-800/80 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by make, model, plate or VIN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>

          {/* Fuel filter */}
          <div className="relative">
            <select
              value={fuelFilter}
              onChange={(e) => setFuelFilter(e.target.value)}
              className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8"
            >
              <option value="">All Fuel Types</option>
              <option value="DIESEL">Diesel</option>
              <option value="PETROL">Petrol</option>
              <option value="ELECTRIC">Electric</option>
              <option value="CNG">CNG</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>

          {/* Sort + View */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <select
                value={ordering}
                onChange={(e) => setOrdering(e.target.value)}
                className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8"
              >
                <option value="-created_at">Newest First</option>
                <option value="created_at">Oldest First</option>
                <option value="make">Make A–Z</option>
                <option value="-odometer">Highest Odometer</option>
                <option value="year">Year ↑</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
            </div>
            <div className="flex rounded-lg border border-gray-800 overflow-hidden">
              <button onClick={() => setViewMode('grid')} className={`p-2 transition ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}><LayoutGrid className="h-4 w-4" /></button>
              <button onClick={() => setViewMode('table')} className={`p-2 transition ${viewMode === 'table' ? 'bg-blue-600 text-white' : 'bg-gray-900 text-gray-400 hover:text-white'}`}><List className="h-4 w-4" /></button>
            </div>
          </div>
        </div>

        {/* Result count */}
        {!loading && (
          <p className="mt-3 text-xs text-gray-500">
            Showing <span className="text-white font-semibold">{vehicles.length}</span> of{' '}
            <span className="text-white font-semibold">{totalCount}</span> vehicles
          </p>
        )}
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>

      /* ── Grid View ── */
      ) : viewMode === 'grid' ? (
        vehicles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {vehicles.map((v) => {
              const sm = STATUS_META[v.status] ?? STATUS_META.AVAILABLE;
              return (
                <motion.div
                  key={v.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="glass rounded-xl border border-gray-800/80 hover:border-gray-700 transition flex flex-col"
                >
                  {/* Card Header */}
                  <div className="p-5 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${sm.cls}`}>
                        {sm.label}
                      </span>
                      <span className="text-sm" title={v.fuel_type}>{FUEL_ICONS[v.fuel_type]} {v.fuel_type}</span>
                    </div>

                    <h3 className="text-lg font-bold text-white">{v.year} {v.make} {v.model}</h3>
                    <span className="mt-1.5 inline-block font-mono text-xs font-semibold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded">
                      {v.license_plate}
                    </span>

                    <div className="mt-4 grid grid-cols-2 gap-3 text-xs border-t border-gray-800 pt-4">
                      <div>
                        <span className="text-gray-500 block mb-0.5">Payload</span>
                        <span className="font-semibold text-gray-200">{Number(v.payload_capacity_kg).toLocaleString()} kg</span>
                      </div>
                      <div>
                        <span className="text-gray-500 block mb-0.5">Odometer</span>
                        <span className="font-semibold text-gray-200">{Number(v.odometer).toLocaleString()} km</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-gray-500 block mb-0.5">VIN</span>
                        <span className="font-mono text-gray-300 truncate block">{v.vin || '—'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions */}
                  {hasRole(['ADMIN', 'DISPATCHER']) && (
                    <div className="px-5 pb-5 pt-0 flex items-center gap-2 border-t border-gray-800 mt-4 pt-4">
                      {/* Quick Status Menu */}
                      <div className="relative flex-1 group">
                        <button className="w-full inline-flex items-center justify-center gap-1.5 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition text-xs font-semibold">
                          <Zap className="h-3.5 w-3.5" /> Status <ChevronDown className="h-3 w-3" />
                        </button>
                        <div className="absolute bottom-full left-0 mb-1 hidden group-hover:block z-20 w-44 rounded-xl border border-gray-700 bg-[#0d1117] shadow-2xl py-1">
                          {Object.entries(STATUS_META)
                            .filter(([k]) => k !== 'ON_TRIP')
                            .map(([k, { label, cls }]) => (
                              <button
                                key={k}
                                onClick={() => handleQuickStatus(v.id, k)}
                                disabled={v.status === k}
                                className={`w-full text-left px-3 py-2 text-xs font-semibold transition ${v.status === k ? 'text-gray-600 cursor-default' : 'hover:bg-gray-800 text-gray-300'}`}
                              >
                                <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 border ${cls}`}>{label}</span>
                              </button>
                            ))}
                        </div>
                      </div>

                      <button
                        onClick={() => openEditModal(v)}
                        className="flex items-center gap-1.5 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition text-xs font-semibold"
                      >
                        <Edit2 className="h-3.5 w-3.5" /> Edit
                      </button>
                      <button
                        onClick={() => handleDelete(v.id, v.license_plate)}
                        disabled={v.status === 'ON_TRIP'}
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
            <Truck className="h-12 w-12 text-gray-700 mb-3" />
            <h3 className="text-lg font-semibold text-white">No vehicles found</h3>
            <p className="text-sm text-gray-500 mt-1">Adjust your filters or register a new vehicle.</p>
          </div>
        )

      /* ── Table View ── */
      ) : (
        <div className="glass rounded-xl border border-gray-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  {['Vehicle', 'Plate / VIN', 'Status', 'Fuel', 'Payload', 'Odometer', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60">
                {vehicles.length === 0 ? (
                  <tr><td colSpan={7} className="py-16 text-center text-gray-500 text-sm">No vehicles match your filters.</td></tr>
                ) : vehicles.map((v) => {
                  const sm = STATUS_META[v.status] ?? STATUS_META.AVAILABLE;
                  return (
                    <tr key={v.id} className="hover:bg-gray-900/30 transition">
                      <td className="px-4 py-3 font-semibold text-white">{v.year} {v.make} {v.model}</td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-blue-400 text-xs">{v.license_plate}</span>
                        <span className="block font-mono text-gray-600 text-[10px] mt-0.5">{v.vin || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${sm.cls}`}>{sm.label}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-400">{FUEL_ICONS[v.fuel_type]} {v.fuel_type}</td>
                      <td className="px-4 py-3 text-gray-300">{Number(v.payload_capacity_kg).toLocaleString()} kg</td>
                      <td className="px-4 py-3 text-gray-300">{Number(v.odometer).toLocaleString()} km</td>
                      <td className="px-4 py-3">
                        {hasRole(['ADMIN', 'DISPATCHER']) && (
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEditModal(v)} className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white transition"><Edit2 className="h-3.5 w-3.5" /></button>
                            <button onClick={() => handleDelete(v.id, v.license_plate)} disabled={v.status === 'ON_TRIP'} className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 disabled:opacity-30 transition"><Trash2 className="h-3.5 w-3.5" /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
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
              className="w-full max-w-xl rounded-2xl border border-gray-800 bg-[#0c0f17] shadow-2xl"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <h3 className="text-lg font-bold text-white">
                  {editingVehicle ? `Edit — ${editingVehicle.license_plate}` : 'Register New Vehicle'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Make" error={errors.make?.message}>
                    <input {...register('make')} placeholder="Tata, Volvo, Ashok Leyland" className={inputCls(errors.make)} />
                  </Field>
                  <Field label="Model" error={errors.model?.message}>
                    <input {...register('model')} placeholder="Prima 4025, Blazo X 28" className={inputCls(errors.model)} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Year" error={errors.year?.message}>
                    <input type="number" {...register('year')} className={inputCls(errors.year)} />
                  </Field>
                  <Field label="License Plate" error={errors.license_plate?.message}>
                    <input {...register('license_plate')} placeholder="MH-12-AB-1234" className={`${inputCls(errors.license_plate)} uppercase`} />
                  </Field>
                </div>

                <Field label="VIN (17 chars — optional)" error={errors.vin?.message}>
                  <input
                    {...register('vin')}
                    maxLength={17}
                    placeholder="e.g. 1HGCM82633A123456"
                    className={`${inputCls(errors.vin)} font-mono tracking-widest`}
                  />
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Payload Limit (kg)" error={errors.payload_capacity_kg?.message}>
                    <input type="number" step="0.01" {...register('payload_capacity_kg')} className={inputCls(errors.payload_capacity_kg)} />
                  </Field>
                  <Field label="Odometer (km)" error={errors.odometer?.message}>
                    <input type="number" step="0.1" {...register('odometer')} className={inputCls(errors.odometer)} />
                  </Field>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Fuel Type">
                    <select {...register('fuel_type')} className={inputCls(false)}>
                      <option value="DIESEL">Diesel</option>
                      <option value="PETROL">Petrol</option>
                      <option value="CNG">CNG</option>
                      <option value="ELECTRIC">Electric</option>
                    </select>
                  </Field>
                  <Field label="Operational Status">
                    <select {...register('status')} className={inputCls(false)}>
                      <option value="AVAILABLE">Available</option>
                      <option value="MAINTENANCE">Under Maintenance</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                      {editingVehicle && <option value="ON_TRIP" disabled>On Trip (auto-managed)</option>}
                    </select>
                  </Field>
                </div>

                {/* Actions */}
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
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    {editingVehicle ? 'Save Changes' : 'Register Vehicle'}
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

export default Vehicles;
