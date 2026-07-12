import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import {
  CreditCard, Plus, X, Search, RefreshCw, ClipboardList,
  ChevronDown, DollarSign,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Zod Schema ────────────────────────────────────────────────────────────────
const schema = z.object({
  trip: z.string().uuid('Select a valid trip record'),
  category: z.enum(['TOLL', 'FOOD', 'LODGING', 'MAINTENANCE', 'FUEL', 'MISCELLANEOUS']),
  amount: z.coerce.number().positive('Expense amount must be positive'),
  date: z.string().min(1, 'Date is required'),
  notes: z.string().optional().or(z.literal('')),
});

const CATEGORIES = {
  TOLL: 'Toll',
  FOOD: 'Food',
  LODGING: 'Lodging',
  MAINTENANCE: 'Maintenance',
  FUEL: 'Fuel',
  MISCELLANEOUS: 'Miscellaneous',
};

const CATEGORY_COLORS = {
  TOLL: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  FOOD: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  LODGING: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  MAINTENANCE: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  FUEL: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  MISCELLANEOUS: 'bg-gray-500/10 text-gray-400 border-gray-800',
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

const Expenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const {
    register, handleSubmit, reset, setError,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: { amount: '', date: new Date().toISOString().split('T')[0], notes: '' }
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ ordering: '-date' });
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await api.get(`/expenses/?${params}`);
      setExpenses(res.data.results ?? res.data);
    } catch {
      toast.error('Failed to load expense records');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter]);

  const fetchTripsList = useCallback(async () => {
    try {
      // Fetch recent trips to link expense log
      const res = await api.get('/trips/?page_size=100');
      setTrips(res.data.results ?? res.data);
    } catch (err) {
      console.error('Failed to fetch trips for linking expense', err);
    }
  }, []);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  const openAddModal = () => {
    reset({ trip: '', category: 'TOLL', amount: '', date: new Date().toISOString().split('T')[0], notes: '' });
    fetchTripsList();
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    try {
      await api.post('/expenses/', data);
      toast.success('Expense receipt logged');
      setIsModalOpen(false);
      fetchExpenses();
    } catch (err) {
      const errData = err.response?.data ?? {};
      const fields = ['trip', 'category', 'amount', 'date', 'notes'];
      let mapped = false;
      fields.forEach((k) => {
        if (errData[k]) {
          setError(k, { message: Array.isArray(errData[k]) ? errData[k][0] : String(errData[k]) });
          mapped = true;
        }
      });
      if (!mapped) {
        toast.error(errData.detail ?? 'Failed to log expense');
      }
    }
  };

  const totalExpenseAmount = expenses.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Expense Reimbursements</h1>
          <p className="mt-1 text-sm text-gray-400">
            Submit driver travel receipts, categorize operational expenses, and audit logistics reimbursements.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchExpenses} className="p-2.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg"
          >
            <Plus className="h-4 w-4" /> File Expense
          </button>
        </div>
      </div>

      {/* Aggregate Spend Card */}
      <div className="glass rounded-xl p-5 border border-gray-800/80 flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Operations Expense</span>
          <h2 className="text-3xl font-extrabold text-white mt-1">Rs. {totalExpenseAmount.toLocaleString()}</h2>
        </div>
        <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-xl text-blue-400">
          <CreditCard className="h-6 w-6" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass rounded-xl border border-gray-800/80 p-4">
        <div className="relative">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8"
          >
            <option value="">All Categories</option>
            {Object.entries(CATEGORIES).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
        </div>
      </div>

      {/* Grid Roster */}
      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      ) : expenses.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {expenses.map((exp) => (
            <motion.div
              key={exp.id}
              layout
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-xl border border-gray-800/80 hover:border-gray-700 transition flex flex-col justify-between"
            >
              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${CATEGORY_COLORS[exp.category] ?? 'border-gray-800 text-gray-400 bg-gray-900'}`}>
                    {CATEGORIES[exp.category] ?? exp.category}
                  </span>
                  <span className="text-lg font-extrabold text-white">Rs. {Number(exp.amount).toLocaleString()}</span>
                </div>

                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-widest block">Trip Link</span>
                    <span className="font-mono text-xs font-bold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-0.5 rounded">
                      {exp.trip_number ?? 'General'}
                    </span>
                  </div>
                  {exp.notes && (
                    <p className="text-xs text-gray-400 mt-3 line-clamp-3 leading-relaxed">
                      {exp.notes}
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs border-t border-gray-800/60 pt-3 text-gray-400">
                  <div>
                    <span className="text-gray-500 block">Date Filed</span>
                    <span className="font-semibold text-gray-300">{exp.date}</span>
                  </div>
                  <div>
                    <span className="text-gray-500 block">Submitted By</span>
                    <span className="font-semibold text-gray-300 truncate block">{exp.created_by_name ?? '—'}</span>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-gray-800 rounded-2xl">
          <CreditCard className="h-12 w-12 text-gray-700 mb-3" />
          <h3 className="text-lg font-semibold text-white">No expenses recorded</h3>
          <p className="text-sm text-gray-400 mt-1">Submit travel receipts and log trip expenses.</p>
        </div>
      )}

      {/* File Expense Modal */}
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
                <h3 className="text-lg font-bold text-white">File Expense Receipt</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-500 hover:text-white transition">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[76vh] overflow-y-auto">
                <Field label="Trip Dispatch Link" error={errors.trip?.message}>
                  <select {...register('trip')} className={inputCls(errors.trip)}>
                    <option value="">— Select trip —</option>
                    {trips.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.trip_number} · {t.route_origin} → {t.route_destination} ({t.cargo_type})
                      </option>
                    ))}
                  </select>
                </Field>

                <div className="grid grid-cols-2 gap-4">
                  <Field label="Category" error={errors.category?.message}>
                    <select {...register('category')} className={inputCls(errors.category)}>
                      {Object.entries(CATEGORIES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Amount (Rs.)" error={errors.amount?.message}>
                    <input type="number" step="0.01" {...register('amount')} className={inputCls(errors.amount)} />
                  </Field>
                </div>

                <Field label="Expense Date" error={errors.date?.message}>
                  <input type="date" {...register('date')} className={inputCls(errors.date)} />
                </Field>

                <Field label="Notes / Details" error={errors.notes?.message}>
                  <textarea
                    {...register('notes')}
                    rows={3}
                    placeholder="Enter notes (toll receipt description, hotel booking name, fuel log reference, etc.)"
                    className={inputCls(errors.notes)}
                  />
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
                    File Expense
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

export default Expenses;
