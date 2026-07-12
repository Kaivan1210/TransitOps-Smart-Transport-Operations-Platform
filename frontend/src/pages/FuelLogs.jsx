import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Fuel, Plus, X, Search, RefreshCw, ClipboardList,
  ChevronDown, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  vehicle: z.string().uuid('Select a valid vehicle'),
  driver: z.string().uuid('Select a valid driver'),
  liters: z.coerce.number().positive('Liters must be positive'),
  cost_per_liter: z.coerce.number().positive('Cost per liter must be positive'),
  odometer_reading: z.coerce.number().positive('Odometer reading must be positive'),
});

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

const FuelLogs = () => {
  const [logs, setLogs] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register, handleSubmit, reset, setError, watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { liters: '', cost_per_liter: '', odometer_reading: '' }
  });

  const selectedVehicleId = watch('vehicle');
  const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, ordering: '-logged_at' });
      const res = await api.get(`/fuel-logs/?${params}`);
      setLogs(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load fuel logs');
    } finally {
      setLoading(false);
    }
  }, [search]);

  const fetchFormOptions = useCallback(async () => {
    try {
      const [vRes, dRes] = await Promise.all([
        api.get('/vehicles/?page_size=100'),
        api.get('/drivers/?page_size=100'),
      ]);
      setVehicles(vRes.data.results ?? vRes.data);
      setDrivers(dRes.data.results ?? dRes.data);
    } catch (err) {
      console.error('Failed to fetch logging dropdown options', err);
    }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const openAddModal = () => {
    reset({ vehicle: '', driver: '', liters: '', cost_per_liter: '', odometer_reading: '' });
    fetchFormOptions();
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/fuel-logs/', data);
      toast.success('Fuel log submitted successfully');
      setIsModalOpen(false);
      fetchLogs();
    } catch (err) {
      const errData = err.response?.data ?? {};
      const fields = ['vehicle', 'driver', 'liters', 'cost_per_liter', 'odometer_reading'];
      let mapped = false;
      fields.forEach((k) => {
        if (errData[k]) {
          setError(k, { message: Array.isArray(errData[k]) ? errData[k][0] : String(errData[k]) });
          mapped = true;
        }
      });
      if (!mapped) {
        toast.error(errData.detail ?? 'Failed to submit fuel log');
      }
    }
  };

  const totalFuelSpend = logs.reduce((sum, item) => sum + parseFloat(item.total_cost || 0), 0);
  const totalFuelLiters = logs.reduce((sum, item) => sum + parseFloat(item.liters || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Fuel Purchase Logs</h1>
          <p className="mt-1 text-sm text-gray-400">
            Log fuel entries per vehicle, manage odometer updates, and monitor total operational fuel spend.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchLogs} className="p-2.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg"
          >
            <Plus className="h-4 w-4" /> Log Fuel Receipt
          </button>
        </div>
      </div>

      {/* Aggregate Spend Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="glass rounded-xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Fuel Spend</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">Rs. {totalFuelSpend.toLocaleString()}</h2>
          </div>
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl text-emerald-400">
            <DollarSign className="h-6 w-6" />
          </div>
        </div>
        <div className="glass rounded-xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Liters Logged</span>
            <h2 className="text-3xl font-extrabold text-white mt-1">{totalFuelLiters.toLocaleString()} L</h2>
          </div>
          <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-xl text-blue-400">
            <Fuel className="h-6 w-6" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="glass rounded-xl border border-gray-800/80 p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search logs by vehicle license plate..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 text-sm"
          />
        </div>
      </div>

      {/* Table view */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : logs.length > 0 ? (
        <div className="glass rounded-xl border border-gray-800/85 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  {['Vehicle', 'Driver', 'Liters', 'Cost / Liter', 'Total Cost', 'Odometer Reading', 'Date'].map((h) => (
                    <th key={h} className="px-5 py-4.5 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-900/25 transition">
                    <td className="px-5 py-4 font-mono font-bold text-blue-400">{log.vehicle_license}</td>
                    <td className="px-5 py-4 font-semibold text-white">{log.driver_name}</td>
                    <td className="px-5 py-4">{Number(log.liters).toLocaleString()} L</td>
                    <td className="px-5 py-4">Rs. {Number(log.cost_per_liter).toLocaleString()}</td>
                    <td className="px-5 py-4 font-bold text-emerald-400">Rs. {Number(log.total_cost).toLocaleString()}</td>
                    <td className="px-5 py-4 font-mono">{Number(log.odometer_reading).toLocaleString()} km</td>
                    <td className="px-5 py-4 text-xs text-gray-500">{new Date(log.logged_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl">
          <ClipboardList className="h-12 w-12 text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-white">No fuel receipts logged</h3>
          <p className="text-sm text-gray-400 mt-1">Register a fuel receipt using the button above.</p>
        </div>
      )}

      {/* Log Fuel Modal */}
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
                <h3 className="text-lg font-bold text-white">Log Fuel Receipt</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
                <Field label="Vehicle" error={errors.vehicle?.message}>
                  <select {...register('vehicle')} className={inputCls(errors.vehicle)}>
                    <option value="">— Select vehicle —</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.year} {v.make} {v.model} · {v.license_plate} (Odo: {v.odometer} km)
                      </option>
                    ))}
                  </select>
                </Field>

                <Field label="Driver" error={errors.driver?.message}>
                  <select {...register('driver')} className={inputCls(errors.driver)}>
                    <option value="">— Select driver —</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.user_name} ({d.license_number})
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Liters Logged" error={errors.liters?.message}>
                    <input type="number" step="0.01" {...register('liters')} className={inputCls(errors.liters)} />
                  </Field>
                  <Field label="Cost Per Liter (Rs.)" error={errors.cost_per_liter?.message}>
                    <input type="number" step="0.01" {...register('cost_per_liter')} className={inputCls(errors.cost_per_liter)} />
                  </Field>
                </div>

                <Field label="Odometer Reading (km)" error={errors.odometer_reading?.message}>
                  <input type="number" step="0.1" {...register('odometer_reading')} className={inputCls(errors.odometer_reading)} />
                  {selectedVehicle && (
                    <p className="mt-1 text-xs text-blue-400">
                      Must be strictly greater than current vehicle odometer:{' '}
                      <span className="font-bold">{Number(selectedVehicle.odometer).toLocaleString()} km</span>.
                    </p>
                  )}
                </Field>

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
                    Log Receipt
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

export default FuelLogs;
