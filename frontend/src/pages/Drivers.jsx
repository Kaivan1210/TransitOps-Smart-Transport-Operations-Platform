import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Plus, Edit2, Trash2, X, Users, AlertTriangle, ShieldCheck
} from 'lucide-react';
import toast from 'react-hot-toast';

const schema = z.object({
  user: z.string().uuid('Select a valid user account'),
  license_number: z.string().min(4, 'License number is required'),
  license_class: z.enum(['CLASS_A', 'CLASS_B', 'CLASS_C']),
  license_expiry: z.string().min(1, 'Expiry date is required'),
  status: z.enum(['AVAILABLE', 'ON_TRIP', 'SUSPENDED']),
});

const Drivers = () => {
  const { hasRole } = useAuth();
  const [drivers, setDrivers] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);

  const { register, handleSubmit, reset, formState: { errors } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { status: 'AVAILABLE', license_class: 'CLASS_B' },
  });

  const fetchDrivers = async () => {
    setLoading(true);
    try {
      let query = `/drivers/?search=${search}`;
      if (statusFilter) query += `&status=${statusFilter}`;
      const res = await api.get(query);
      setDrivers(res.data.results || res.data);
    } catch (err) {
      toast.error('Failed to load driver roster');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserOptions = async () => {
    try {
      const res = await api.get('/users/?role=DRIVER');
      setUserOptions(res.data.results || res.data);
    } catch (err) {
      console.error('Failed to fetch user list', err);
    }
  };

  useEffect(() => { fetchDrivers(); }, [search, statusFilter]);

  const openAddModal = () => {
    setEditingDriver(null);
    reset({ status: 'AVAILABLE', license_class: 'CLASS_B', license_number: '', license_expiry: '', user: '' });
    fetchUserOptions();
    setIsModalOpen(true);
  };

  const openEditModal = (driver) => {
    setEditingDriver(driver);
    reset({
      user: driver.user,
      license_number: driver.license_number,
      license_class: driver.license_class,
      license_expiry: driver.license_expiry,
      status: driver.status,
    });
    fetchUserOptions();
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      if (editingDriver) {
        await api.put(`/drivers/${editingDriver.id}/`, data);
        toast.success('Driver profile updated');
      } else {
        await api.post('/drivers/', data);
        toast.success('Driver registered successfully');
      }
      setIsModalOpen(false);
      fetchDrivers();
    } catch (err) {
      const errData = err.response?.data;
      const msg = errData?.detail || Object.values(errData || {})[0]?.[0] || 'Failed to save driver';
      toast.error(msg);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Archive this driver? Historical trip data will be retained.')) {
      try {
        await api.delete(`/drivers/${id}/`);
        toast.success('Driver archived successfully');
        fetchDrivers();
      } catch (err) {
        toast.error(err.response?.data?.detail || 'Cannot delete driver on active trip');
      }
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'AVAILABLE': return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'ON_TRIP': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
      case 'SUSPENDED': return 'bg-red-500/10 text-red-400 border-red-500/20';
      default: return 'bg-gray-500/10 text-gray-400 border-gray-800';
    }
  };

  const isExpired = (expiryDate) => new Date(expiryDate) < new Date();
  const isExpiringSoon = (expiryDate) => {
    const diff = (new Date(expiryDate) - new Date()) / (1000 * 60 * 60 * 24);
    return diff >= 0 && diff <= 30;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Driver Roster</h1>
          <p className="mt-2 text-sm text-gray-400">
            Manage driver profiles, license classifications, and operational statuses.
          </p>
        </div>
        {hasRole(['ADMIN', 'DISPATCHER']) && (
          <button
            onClick={openAddModal}
            className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg glow-blue"
          >
            <Plus className="h-4 w-4" />
            <span>Register Driver</span>
          </button>
        )}
      </div>

      {/* Search + Filter Bar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-xl glass border border-gray-800/80">
        <div className="relative md:col-span-2">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Search className="h-5 w-5 text-gray-500" />
          </div>
          <input
            type="text"
            placeholder="Search by name, email or license number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-10 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
        >
          <option value="">All Statuses</option>
          <option value="AVAILABLE">Available</option>
          <option value="ON_TRIP">On Trip</option>
          <option value="SUSPENDED">Suspended</option>
        </select>
      </div>

      {/* Driver Cards Grid */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
        </div>
      ) : drivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {drivers.map((d) => {
            const expired = isExpired(d.license_expiry);
            const expiringSoon = !expired && isExpiringSoon(d.license_expiry);
            return (
              <motion.div
                key={d.id}
                layout
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`glass rounded-xl p-5 border flex flex-col justify-between transition ${expired ? 'border-red-500/30' : expiringSoon ? 'border-amber-500/30' : 'border-gray-800/80 hover:border-gray-700/80'}`}
              >
                <div>
                  {/* Status + License warning badges */}
                  <div className="flex items-center justify-between mb-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold border ${getStatusClass(d.status)}`}>
                      {d.status.replace('_', ' ')}
                    </span>
                    {expired && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-red-400 bg-red-500/10 border border-red-500/20 rounded-full px-2 py-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Expired License</span>
                      </span>
                    )}
                    {expiringSoon && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-full px-2 py-0.5">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Expiring Soon</span>
                      </span>
                    )}
                  </div>

                  {/* Driver Name + Avatar */}
                  <div className="flex items-center space-x-3 mb-4">
                    <div className="h-10 w-10 flex-shrink-0 rounded-full bg-blue-600/10 border border-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-base">
                      {d.user_name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-white">{d.user_name}</h3>
                      <p className="text-xs text-gray-500 font-mono">{d.license_number}</p>
                    </div>
                  </div>

                  {/* License details */}
                  <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-800/80 pt-4">
                    <div>
                      <span className="text-gray-500 block">License Class</span>
                      <span className="font-semibold text-gray-300">{d.license_class.replace('_', ' ')}</span>
                    </div>
                    <div>
                      <span className="text-gray-500 block">Expiry Date</span>
                      <span className={`font-semibold ${expired ? 'text-red-400' : expiringSoon ? 'text-amber-400' : 'text-gray-300'}`}>
                        {d.license_expiry}
                      </span>
                    </div>
                  </div>
                </div>

                {hasRole(['ADMIN', 'DISPATCHER']) && (
                  <div className="flex items-center space-x-2 mt-5 pt-4 border-t border-gray-800/80">
                    <button
                      onClick={() => openEditModal(d)}
                      className="flex-1 inline-flex items-center justify-center space-x-1.5 p-2 rounded-lg bg-gray-900 hover:bg-gray-800 border border-gray-800 text-gray-300 hover:text-white transition text-xs font-semibold"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                      <span>Edit Profile</span>
                    </button>
                    <button
                      onClick={() => handleDelete(d.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 hover:text-red-300 transition"
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
        <div className="flex flex-col items-center justify-center py-20 text-gray-500 bg-gray-900/10 border border-gray-800 border-dashed rounded-2xl">
          <Users className="h-12 w-12 text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-white">No drivers found</h3>
          <p className="text-sm text-gray-400 mt-1">Register a driver by clicking the button above.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
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
                  {editingDriver ? 'Edit Driver Profile' : 'Register New Driver'}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
                {!editingDriver && (
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      User Account (Driver Role)
                    </label>
                    <select
                      {...register('user')}
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.user ? 'border-red-500' : 'border-gray-800'}`}
                    >
                      <option value="">-- Select driver user account --</option>
                      {userOptions
                        .filter(u => u.role === 'DRIVER')
                        .map(u => (
                          <option key={u.id} value={u.id}>{u.full_name} ({u.email})</option>
                        ))
                      }
                    </select>
                    {errors.user && <p className="text-red-500 text-xs mt-1">{errors.user.message}</p>}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">License Number</label>
                  <input
                    {...register('license_number')}
                    placeholder="DL-2024-001"
                    className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm font-mono ${errors.license_number ? 'border-red-500' : 'border-gray-800'}`}
                  />
                  {errors.license_number && <p className="text-red-500 text-xs mt-1">{errors.license_number.message}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">License Class</label>
                    <select
                      {...register('license_class')}
                      className="block w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                    >
                      <option value="CLASS_A">Class A</option>
                      <option value="CLASS_B">Class B</option>
                      <option value="CLASS_C">Class C</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">License Expiry Date</label>
                    <input
                      type="date"
                      {...register('license_expiry')}
                      className={`block w-full rounded-lg border bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm ${errors.license_expiry ? 'border-red-500' : 'border-gray-800'}`}
                    />
                    {errors.license_expiry && <p className="text-red-500 text-xs mt-1">{errors.license_expiry.message}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Driver Status</label>
                  <select
                    {...register('status')}
                    className="block w-full rounded-lg border border-gray-800 bg-gray-900 px-3 py-2 text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm"
                  >
                    <option value="AVAILABLE">Available</option>
                    <option value="ON_TRIP">On Trip</option>
                    <option value="SUSPENDED">Suspended</option>
                  </select>
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
                    Save Driver
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
