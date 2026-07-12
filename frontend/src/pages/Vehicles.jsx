import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Filter, Plus, Edit2, Trash2, X, AlertTriangle, Truck, Info, CheckCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  make: z.string().min(2, 'Make must be at least 2 characters'),
  model: z.string().min(1, 'Model is required'),
  year: z.coerce.number().min(1900).max(new Date().getFullYear() + 1, 'Invalid year'),
  license_plate: z.string().min(4, 'License plate is required'),
  vin: z.string().length(17, 'VIN must be exactly 17 characters').optional().or(z.literal('')),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'MAINTENANCE', 'OUT_OF_SERVICE']),
  payload_capacity_kg: z.coerce.number().positive('Capacity must be positive'),
  fuel_type: z.enum(['DIESEL', 'PETROL', 'ELECTRIC', 'CNG']),
  odometer: z.coerce.number().nonnegative('Odometer must be positive'),
});

const Vehicles = () => {
  const { hasRole } = useAuth();
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [fuelFilter, setFuelFilter] = useState('');
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);

  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      status: 'AVAILABLE',
      fuel_type: 'DIESEL',
      odometer: 0,
    }
  });

  const fetchVehicles = async () => {
    setLoading(true);
    try {
      // Build queries
      let query = `/vehicles/?search=${search}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      if (fuelFilter) query += `&fuel_type=${fuelFilter}`;
      
      const res = await api.get(query);
      // Backend returns paginated list under 'results'
      setVehicles(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load fleet registry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVehicles();
  }, [search, statusFilter, fuelFilter]);

  const openAddModal = () => {
    setEditingVehicle(null);
    reset({
      make: '',
      model: '',
      year: new Date().getFullYear(),
      license_plate: '',
      vin: '',
      status: 'AVAILABLE',
      payload_capacity_kg: 0,
      fuel_type: 'DIESEL',
      odometer: 0,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (vehicle) => {
    setEditingVehicle(vehicle);
    reset({
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      license_plate: vehicle.license_plate,
      vin: vehicle.vin || '',
      status: vehicle.status,
      payload_capacity_kg: vehicle.payload_capacity_kg,
      fuel_type: vehicle.fuel_type,
      odometer: vehicle.odometer,
    });
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingVehicle) {
        await api.put(`/vehicles/${editingVehicle.id}/`, data);
        toast.success('Vehicle records updated successfully');
      } else {
        await api.post('/vehicles/', data);
        toast.success('Vehicle registered successfully');
      }
      setIsModalOpen(false);
      fetchVehicles();
    } catch (err) {
      const msg = err.response?.data?.detail || 'An error occurred while saving';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this vehicle? This is a soft-delete and historical records will remain.')) {
      try {
        await api.delete(`/vehicles/${id}/`);
        toast.success('Vehicle marked inactive');
        fetchVehicles();
      } catch (err) {
        const msg = err.response?.data?.detail || 'Failed to delete vehicle';
        toast.error(msg);
      }
    }
  };

  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'AVAILABLE':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ON_TRIP':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'MAINTENANCE':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'OUT_OF_SERVICE':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-gray-500/10 text-gray-400 border-gray-500/20';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Vehicles Registry</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage your transport fleet records, payload capacities and real-time operational states.
          </p>
        </div>
        {hasRole(['ADMIN', 'DISPATCHER']) && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg glow-blue"
          >
            <Plus className="h-4 w-4" />
            <span>Register Vehicle</span>
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 rounded-xl glass border border-gray-800/80">
        <div className="relative md:col-span-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search by license plate, make, model or VIN..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>

        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          >
            <option value="">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="ON_TRIP">On Trip</option>
            <option value="MAINTENANCE">Maintenance</option>
            <option value="OUT_OF_SERVICE">Out of Service</option>
          </select>
        </div>

        <div>
          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          >
            <option value="">All Fuel Types</option>
            <option value="DIESEL">Diesel</option>
            <option value="PETROL">Petrol</option>
            <option value="ELECTRIC">Electric</option>
            <option value="CNG">CNG</option>
          </select>
        </div>
      </div>

      {/* Fleet Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : vehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vehicles.map((v) => (
            <motion.div
              key={v.id}
              layout
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass rounded-xl p-5 border border-gray-800/80 hover:border-gray-700/80 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusBadgeClass(v.status)}`}>
                    {v.status.replace('_', ' ')}
                  </span>
                  <div className="text-gray-500 text-2xs uppercase font-mono">{v.fuel_type}</div>
                </div>

                <div className="mt-4">
                  <h3 className="text-lg font-bold text-white">{v.year} {v.make} {v.model}</h3>
                  <p className="text-xs font-semibold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded inline-block mt-2 font-mono">
                    {v.license_plate}
                  </p>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 text-xs border-t border-gray-800/80 pt-4">
                  <div>
                    <span className="text-gray-500 block">Payload Limit</span>
                    <span className="font-semibold text-gray-300">{v.payload_capacity_kg} kg</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Odometer</span>
                    <span className="font-semibold text-gray-300">{v.odometer} km</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-500 block">VIN</span>
                    <span className="font-semibold text-gray-300 font-mono truncate block">{v.vin || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {hasRole(['ADMIN', 'DISPATCHER']) && (
                <div className="flex items-center space-x-2 mt-5 pt-4 border-t border-gray-800/80">
                  <button
                    onClick={() => openEditModal(v)}
                    className="flex-1 inline-flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition text-xs font-semibold"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Edit Assets</span>
                  </button>
                  <button
                    onClick={() => handleDelete(v.id)}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-gray-900/10 border border-gray-800 border-dashed rounded-2xl">
          <Truck className="h-12 w-12 text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-white">No vehicles found</h3>
          <p className="text-sm text-gray-400 mt-1">Try resetting your search filters or register a new fleet asset.</p>
        </div>
      )}

      {/* Edit/Add Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg rounded-2xl border border-gray-800 bg-[#0c0f17] shadow-2xl overflow-hidden"
            >
              <div className="flex items-center justify-between border-b border-gray-800 px-6 py-4">
                <h3 className="text-lg font-bold text-white">
                  {editingVehicle ? 'Edit Vehicle Profile' : 'Register New Vehicle'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Make</label>
                    <input
                      {...register('make')}
                      placeholder="Tata, Mahindra, Volvo"
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.make ? 'border-red-500' : 'border-gray-800'}`}
                    />
                    {errors.make && <p className="text-red-500 text-xs mt-1">{errors.make.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Model</label>
                    <input
                      {...register('model')}
                      placeholder="Prima 4025, Blazo X"
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.model ? 'border-red-500' : 'border-gray-800'}`}
                    />
                    {errors.model && <p className="text-red-500 text-xs mt-1">{errors.model.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Manufacture Year</label>
                    <input
                      type="number"
                      {...register('year')}
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.year ? 'border-red-500' : 'border-gray-800'}`}
                    />
                    {errors.year && <p className="text-red-500 text-xs mt-1">{errors.year.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">License Plate</label>
                    <input
                      {...register('license_plate')}
                      placeholder="MH-12-QW-1234"
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.license_plate ? 'border-red-500' : 'border-gray-800'}`}
                    />
                    {errors.license_plate && <p className="text-red-500 text-xs mt-1">{errors.license_plate.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">VIN (17-Character Identifier)</label>
                  <input
                    {...register('vin')}
                    maxLength={17}
                    placeholder="17 character alphanumeric VIN"
                    className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono ${errors.vin ? 'border-red-500' : 'border-gray-800'}`}
                  />
                  {errors.vin && <p className="text-red-500 text-xs mt-1">{errors.vin.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Payload Limit (kg)</label>
                    <input
                      type="number"
                      {...register('payload_capacity_kg')}
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.payload_capacity_kg ? 'border-red-500' : 'border-gray-800'}`}
                    />
                    {errors.payload_capacity_kg && <p className="text-red-500 text-xs mt-1">{errors.payload_capacity_kg.message}</p>}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Initial Odometer (km)</label>
                    <input
                      type="number"
                      {...register('odometer')}
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.odometer ? 'border-red-500' : 'border-gray-800'}`}
                    />
                    {errors.odometer && <p className="text-red-500 text-xs mt-1">{errors.odometer.message}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Fuel Type</label>
                    <select
                      {...register('fuel_type')}
                      className="block w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    >
                      <option value="DIESEL">Diesel</option>
                      <option value="PETROL">Petrol</option>
                      <option value="CNG">CNG</option>
                      <option value="ELECTRIC">Electric</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Operational State</label>
                    <select
                      {...register('status')}
                      className="block w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="ON_TRIP">On Trip</option>
                      <option value="MAINTENANCE">Maintenance</option>
                      <option value="OUT_OF_SERVICE">Out of Service</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center space-x-2.5 pt-4 border-t border-gray-800 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition shadow-lg glow-blue"
                  >
                    Save Records
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
