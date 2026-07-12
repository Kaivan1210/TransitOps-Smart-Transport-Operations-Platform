import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, X, Calendar, ChevronDown, RefreshCw,
  Truck, Users, MapPin, Package, PlayCircle, CheckCircle2,
  XCircle, AlertTriangle, ArrowRight, ClipboardList,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  vehicle: z.string().uuid('Select a vehicle'),
  driver: z.string().uuid('Select a driver'),
  route_origin: z.string().min(3, 'Origin is required'),
  route_destination: z.string().min(3, 'Destination is required'),
  estimated_distance_km: z.coerce.number().positive('Distance must be positive'),
  cargo_type: z.string().min(2, 'Cargo type is required'),
  cargo_weight_kg: z.coerce.number().positive('Cargo weight must be positive'),
  notes: z.string().optional(),
});

// ─── Constants ─────────────────────────────────────────────────────────────────
const STATUS_META = {
  SCHEDULED:   { label: 'Scheduled',   cls: 'bg-amber-500/10 text-amber-400 border-amber-500/25',    icon: Calendar },
  IN_PROGRESS: { label: 'In Progress', cls: 'bg-blue-500/10 text-blue-400 border-blue-500/25',       icon: PlayCircle },
  COMPLETED:   { label: 'Completed',   cls: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25', icon: CheckCircle2 },
  CANCELLED:   { label: 'Cancelled',   cls: 'bg-red-500/10 text-red-400 border-red-500/25',          icon: XCircle },
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

// ─── Complete Trip Modal ────────────────────────────────────────────────────────
const CompleteModal = ({ trip, onClose, onComplete }) => {
  const [distance, setDistance] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    const km = parseFloat(distance);
    if (!km || km <= 0) { toast.error('Enter a valid actual distance'); return; }
    setLoading(true);
    try {
      await onComplete(trip.id, km);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-sm rounded-2xl border border-gray-800 bg-[#0c0f17] shadow-2xl p-6 space-y-5">
        <div className="flex items-center gap-3">
          <CheckCircle2 className="h-6 w-6 text-emerald-400" />
          <h3 className="text-lg font-bold text-white">Complete Trip</h3>
        </div>
        <p className="text-sm text-gray-400">
          <span className="font-semibold text-white">{trip.trip_number}</span> — Enter the actual distance driven to close this trip.
          Vehicle odometer will be updated automatically.
        </p>
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Actual Distance (km)</label>
          <input
            type="number" step="0.1" min="1"
            value={distance}
            onChange={(e) => setDistance(e.target.value)}
            placeholder={`Est. ${trip.estimated_distance_km} km`}
            className="block w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
          />
        </div>
        <div className="flex items-center gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 transition">Cancel</button>
          <button onClick={submit} disabled={loading}
            className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition disabled:opacity-60">
            {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
            Confirm Completion
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Main Component ─────────────────────────────────────────────────────────────
const Trips = () => {
  const { hasRole } = useAuth();
  const [trips, setTrips]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setFilter]   = useState('');
  const [isModalOpen, setModal]     = useState(false);
  const [completeTrip, setComplete] = useState(null);
  const [vehicles, setVehicles]     = useState([]);
  const [drivers, setDrivers]       = useState([]);

  const {
    register, handleSubmit, reset, setError, watch,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  // Watch selected vehicle to show payload constraint
  const selectedVehicleId = watch('vehicle');
  const selectedVehicle = vehicles.find((v) => v.id === selectedVehicleId);

  // ─── Fetch trips ───────────────────────────────────────────────────────────────
  const fetchTrips = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, ordering: '-created_at' });
      if (statusFilter) params.set('status', statusFilter);
      const res = await api.get(`/trips/?${params}`);
      setTrips(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load trip dispatches');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => { fetchTrips(); }, [fetchTrips]);

  // ─── Fetch available vehicles and drivers for dispatch form ────────────────────
  const fetchFormOptions = useCallback(async () => {
    const [vRes, dRes] = await Promise.all([
      api.get('/vehicles/?status=AVAILABLE&page_size=100').catch(() => ({ data: [] })),
      api.get('/drivers/?status=AVAILABLE&page_size=100').catch(() => ({ data: [] })),
    ]);
    setVehicles(vRes.data.results ?? vRes.data);
    setDrivers(dRes.data.results ?? dRes.data);
  }, []);

  const openDispatch = () => {
    reset({ route_origin: '', route_destination: '', estimated_distance_km: '', cargo_type: '', cargo_weight_kg: '', notes: '' });
    fetchFormOptions();
    setModal(true);
  };

  // ─── Create trip ───────────────────────────────────────────────────────────────
  const onSubmit = async (data) => {
    try {
      await api.post('/trips/', data);
      toast.success('Trip dispatched successfully');
      setModal(false);
      fetchTrips();
    } catch (err) {
      const errData = err.response?.data ?? {};
      const fields = ['vehicle', 'driver', 'route_origin', 'route_destination',
                      'estimated_distance_km', 'cargo_type', 'cargo_weight_kg'];
      let mapped = false;
      fields.forEach((k) => {
        if (errData[k]) {
          setError(k, { message: Array.isArray(errData[k]) ? errData[k][0] : String(errData[k]) });
          mapped = true;
        }
      });
      if (!mapped) toast.error(errData.detail ?? 'Failed to dispatch trip');
    }
  };

  // ─── Trip lifecycle ────────────────────────────────────────────────────────────
  const updateStatus = async (id, newStatus, extra = {}) => {
    try {
      await api.patch(`/trips/${id}/status/`, { status: newStatus, ...extra });
      const labels = { IN_PROGRESS: 'Trip dispatched', COMPLETED: 'Trip completed', CANCELLED: 'Trip cancelled' };
      toast.success(labels[newStatus] ?? 'Status updated');
      fetchTrips();
    } catch (err) {
      toast.error(err.response?.data?.detail ?? 'Status transition failed');
    }
  };

  const handleComplete = async (id, actual_distance_km) => {
    await updateStatus(id, 'COMPLETED', { actual_distance_km });
    fetchTrips();
  };

  // ─── Counts ───────────────────────────────────────────────────────────────────
  const counts = trips.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc; }, {});

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Trip Dispatch</h1>
          <p className="mt-1 text-sm text-gray-400">
            Create, dispatch, and manage fleet trip lifecycle with full cargo and license validation.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchTrips} className="p-2.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <button onClick={openDispatch} className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg">
              <Plus className="h-4 w-4" /> New Trip
            </button>
          )}
        </div>
      </div>

      {/* Status Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {Object.entries(STATUS_META).map(([key, { label, cls }]) => (
          <button key={key}
            onClick={() => setFilter(statusFilter === key ? '' : key)}
            className={`flex items-center justify-between p-3.5 rounded-xl border transition ${statusFilter === key ? cls : 'bg-gray-900/40 border-gray-800 hover:border-gray-700'}`}>
            <span className="text-xs font-semibold text-gray-400">{label}</span>
            <span className="text-xl font-extrabold text-white">{counts[key] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="glass rounded-xl border border-gray-800/80 p-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input type="text" placeholder="Search by trip number, route, or cargo…"
              value={search} onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 text-sm" />
          </div>
          <div className="relative">
            <select value={statusFilter} onChange={(e) => setFilter(e.target.value)}
              className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8">
              <option value="">All Statuses</option>
              {Object.entries(STATUS_META).map(([k, { label }]) => <option key={k} value={k}>{label}</option>)}
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>
        {!loading && (
          <p className="mt-3 text-xs text-gray-500">
            Showing <span className="text-white font-semibold">{trips.length}</span> trips
          </p>
        )}
      </div>

      {/* Trip Cards */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : trips.length > 0 ? (
        <div className="space-y-4">
          {trips.map((trip) => {
            const sm = STATUS_META[trip.status] ?? STATUS_META.SCHEDULED;
            const Icon = sm.icon;
            return (
              <motion.div key={trip.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="glass rounded-xl border border-gray-800/80 hover:border-gray-700 transition p-5">
                <div className="flex flex-col md:flex-row md:items-center gap-4">

                  {/* Left: trip info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold border ${sm.cls}`}>
                        <Icon className="h-3.5 w-3.5" /> {sm.label}
                      </span>
                      <span className="font-mono font-bold text-white text-sm">{trip.trip_number}</span>
                      <span className="text-[10px] text-gray-500 uppercase tracking-widest border border-gray-800 px-2 py-0.5 rounded">
                        {trip.cargo_type}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="flex items-center gap-2 text-sm font-semibold text-gray-200 mb-3">
                      <MapPin className="h-4 w-4 text-blue-400 flex-shrink-0" />
                      <span className="truncate">{trip.route_origin}</span>
                      <ArrowRight className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      <span className="truncate">{trip.route_destination}</span>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Truck className="h-3.5 w-3.5" />
                        {trip.vehicle_detail?.license_plate ?? '—'}
                        <span className="text-gray-700">·</span>
                        {trip.vehicle_detail?.make} {trip.vehicle_detail?.model}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Users className="h-3.5 w-3.5" />
                        {trip.driver_detail?.user_name ?? '—'}
                        {trip.driver_detail?.license_expired && (
                          <span className="text-red-400 flex items-center gap-0.5"><AlertTriangle className="h-3 w-3" /> License Expired</span>
                        )}
                      </span>
                      <span className="flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5" />
                        {Number(trip.cargo_weight_kg).toLocaleString()} kg
                      </span>
                      <span>Est. {Number(trip.estimated_distance_km).toLocaleString()} km</span>
                      {trip.actual_distance_km && (
                        <span className="text-emerald-400">Actual: {Number(trip.actual_distance_km).toLocaleString()} km</span>
                      )}
                    </div>

                    {trip.notes && (
                      <p className="mt-2 text-xs text-gray-500 italic border-t border-gray-800 pt-2">{trip.notes}</p>
                    )}
                  </div>

                  {/* Right: lifecycle actions (Admin/Dispatcher only) */}
                  {hasRole(['ADMIN', 'DISPATCHER']) && (
                    <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                      {trip.status === 'SCHEDULED' && (
                        <>
                          <button
                            onClick={() => updateStatus(trip.id, 'IN_PROGRESS')}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 text-blue-400 text-xs font-semibold transition"
                          >
                            <PlayCircle className="h-4 w-4" /> Dispatch
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Cancel this trip?')) updateStatus(trip.id, 'CANCELLED'); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition"
                          >
                            <XCircle className="h-4 w-4" /> Cancel
                          </button>
                        </>
                      )}
                      {trip.status === 'IN_PROGRESS' && (
                        <>
                          <button
                            onClick={() => setComplete(trip)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 text-emerald-400 text-xs font-semibold transition"
                          >
                            <CheckCircle2 className="h-4 w-4" /> Complete
                          </button>
                          <button
                            onClick={() => { if (window.confirm('Cancel this in-progress trip? Vehicle and driver will be freed.')) updateStatus(trip.id, 'CANCELLED'); }}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 text-xs font-semibold transition"
                          >
                            <XCircle className="h-4 w-4" /> Cancel
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap gap-4 mt-3 pt-3 border-t border-gray-800/80 text-[10px] text-gray-600">
                  <span>Created: {new Date(trip.created_at).toLocaleString()}</span>
                  {trip.dispatched_at && <span className="text-blue-500">Dispatched: {new Date(trip.dispatched_at).toLocaleString()}</span>}
                  {trip.completed_at && <span className="text-emerald-500">Completed: {new Date(trip.completed_at).toLocaleString()}</span>}
                  {trip.created_by_name && <span>By: {trip.created_by_name}</span>}
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-gray-800 rounded-2xl">
          <ClipboardList className="h-12 w-12 text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-white">No trips found</h3>
          <p className="text-sm text-gray-500 mt-1">Dispatch your first trip using the button above.</p>
        </div>
      )}

      {/* ── Dispatch Create Modal ── */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }}
              className="w-full max-w-xl rounded-2xl border border-gray-800 bg-[#0c0f17] shadow-2xl">
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <h3 className="text-lg font-bold text-white">New Trip Dispatch</h3>
                <button onClick={() => setModal(false)} className="text-gray-500 hover:text-white transition"><X className="h-5 w-5" /></button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">

                {/* Vehicle */}
                <Field label="Vehicle (Available Only)" error={errors.vehicle?.message}>
                  <select {...register('vehicle')} className={inputCls(errors.vehicle)}>
                    <option value="">— Select available vehicle —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} · {v.license_plate} · Payload: {v.payload_capacity_kg} kg
                      </option>
                    ))}
                  </select>
                  {selectedVehicle && (
                    <p className="mt-1 text-xs text-blue-400">
                      Max payload: <span className="font-bold">{Number(selectedVehicle.payload_capacity_kg).toLocaleString()} kg</span>
                    </p>
                  )}
                </Field>

                {/* Driver */}
                <Field label="Driver (Available Only)" error={errors.driver?.message}>
                  <select {...register('driver')} className={inputCls(errors.driver)}>
                    <option value="">— Select available driver —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user_name} · {d.license_number} · {d.license_class} {d.license_expired ? '⚠️ EXPIRED' : ''}
                      </option>
                    ))}
                  </select>
                </Field>

                {/* Route */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Origin" error={errors.route_origin?.message}>
                    <input {...register('route_origin')} placeholder="City / Depot Name" className={inputCls(errors.route_origin)} />
                  </Field>
                  <Field label="Destination" error={errors.route_destination?.message}>
                    <input {...register('route_destination')} placeholder="City / Warehouse" className={inputCls(errors.route_destination)} />
                  </Field>
                </div>

                <Field label="Estimated Distance (km)" error={errors.estimated_distance_km?.message}>
                  <input type="number" step="0.1" {...register('estimated_distance_km')} className={inputCls(errors.estimated_distance_km)} />
                </Field>

                {/* Cargo */}
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Cargo Type" error={errors.cargo_type?.message}>
                    <input {...register('cargo_type')} placeholder="Electronics, Perishable…" className={inputCls(errors.cargo_type)} />
                  </Field>
                  <Field label="Cargo Weight (kg)" error={errors.cargo_weight_kg?.message}>
                    <input type="number" step="0.01" {...register('cargo_weight_kg')} className={inputCls(errors.cargo_weight_kg)} />
                  </Field>
                </div>

                {/* Business rule hint */}
                {selectedVehicle && (
                  <div className="flex items-start gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg p-3">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    Cargo weight must not exceed vehicle payload capacity of{' '}
                    <span className="font-bold">{Number(selectedVehicle.payload_capacity_kg).toLocaleString()} kg</span>.
                    Exceeding this will be rejected by the server.
                  </div>
                )}

                <Field label="Notes (optional)">
                  <textarea {...register('notes')} rows={3} placeholder="Special instructions, hazmat info…"
                    className={`${inputCls(false)} resize-none`} />
                </Field>

                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-800">
                  <button type="button" onClick={() => setModal(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition">
                    Cancel
                  </button>
                  <button type="submit" disabled={isSubmitting}
                    className="inline-flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg disabled:opacity-60 disabled:cursor-not-allowed">
                    {isSubmitting && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Dispatch Trip
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Complete Trip Modal ── */}
      <AnimatePresence>
        {completeTrip && (
          <CompleteModal
            trip={completeTrip}
            onClose={() => setComplete(null)}
            onComplete={handleComplete}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

export default Trips;
