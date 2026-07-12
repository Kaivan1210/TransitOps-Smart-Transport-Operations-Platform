import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip,
  CartesianGrid, Legend, Cell, LineChart, Line
} from 'recharts';
import {
  FileSpreadsheet, Search, RefreshCw, ChevronDown, DollarSign,
  TrendingUp, Wrench, Fuel, BarChart3, HelpCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-700 bg-[#0d1117] px-4 py-3 shadow-2xl text-sm">
      <p className="text-gray-400 font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.name.includes('Cost') || p.name.includes('Spend') ? `Rs. ${p.value.toLocaleString()}` : `${p.value} km/L`}
        </p>
      ))}
    </div>
  );
};

const Reports = () => {
  const { hasRole } = useAuth();
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('total_cost');

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/reports/');
      setReportData(res.data.fleet_roi_reports ?? res.data);
    } catch {
      toast.error('Failed to load performance audit reports');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Client side search and sort
  const filteredData = reportData
    .filter((item) =>
      item.vehicle_name.toLowerCase().includes(search.toLowerCase()) ||
      item.license_plate.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      if (sortField === 'vehicle_name') {
        return a.vehicle_name.localeCompare(b.vehicle_name);
      }
      return b[sortField] - a[sortField];
    });

  // Aggregates
  const totals = filteredData.reduce((acc, curr) => {
    acc.fuel_cost += curr.fuel_cost;
    acc.maintenance_cost += curr.maintenance_cost;
    acc.expenses_cost += curr.expenses_cost;
    acc.total_cost += curr.total_cost;
    acc.distance += curr.distance_km;
    return acc;
  }, { fuel_cost: 0, maintenance_cost: 0, expenses_cost: 0, total_cost: 0, distance: 0 });

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredData.length === 0) {
      toast.error('No report records to export');
      return;
    }

    const headers = [
      'Vehicle', 'License Plate', 'Fuel Type', 'Distance Driven (km)',
      'Fuel Liters (L)', 'Fuel Efficiency (km/L)', 'Fuel Cost (Rs.)',
      'Maintenance Cost (Rs.)', 'Expenses Cost (Rs.)', 'Total Cost (Rs.)', 'Cost/km (Rs./km)'
    ];

    const rows = filteredData.map((item) => [
      item.vehicle_name,
      item.license_plate,
      item.fuel_type,
      item.distance_km,
      item.fuel_liters,
      item.fuel_efficiency,
      item.fuel_cost,
      item.maintenance_cost,
      item.expenses_cost,
      item.total_cost,
      item.cost_per_km
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((val) => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Fleet_Performance_Audit_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Performance audit CSV exported');
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-400 font-medium animate-pulse">Running Performance Audits…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Performance Reports</h1>
          <p className="mt-1 text-sm text-gray-400">
            Monitor asset return-on-investment, analyze fuel efficiency anomalies, and run audit data exports.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={fetchReports} className="p-2.5 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 text-gray-400 hover:text-white transition">
            <RefreshCw className="h-4 w-4" />
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition shadow-lg"
          >
            <FileSpreadsheet className="h-4 w-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Aggregate Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass rounded-xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Operating cost</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">Rs. {totals.total_cost.toLocaleString()}</h2>
          </div>
          <div className="p-2.5 rounded-xl border border-gray-800 text-gray-400">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Fuel Spend</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">Rs. {totals.fuel_cost.toLocaleString()}</h2>
          </div>
          <div className="p-2.5 rounded-xl border border-emerald-500/20 text-emerald-400 bg-emerald-500/10">
            <Fuel className="h-5 w-5" />
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Maintenance Spend</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">Rs. {totals.maintenance_cost.toLocaleString()}</h2>
          </div>
          <div className="p-2.5 rounded-xl border border-amber-500/20 text-amber-400 bg-amber-500/10">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

        <div className="glass rounded-xl p-5 border border-gray-800/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total distance</span>
            <h2 className="text-2xl font-extrabold text-white mt-1">{totals.distance.toLocaleString()} km</h2>
          </div>
          <div className="p-2.5 rounded-xl border border-blue-500/20 text-blue-400 bg-blue-500/10">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Visual Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Cost vs Distance Bar Chart */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">ROI — Operational Cost per Asset</h2>
            <p className="text-xs text-gray-500 mt-0.5">Operating Cost (Rs.) relative to distance driven (km)</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="license_plate" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Bar dataKey="total_cost" name="Operating Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="distance_km" name="Distance (km)" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fuel Efficiency Comparison Line Chart */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Fuel Efficiency Anomalies</h2>
            <p className="text-xs text-gray-500 mt-0.5">Average kilometers traveled per liter of fuel consumed</p>
          </div>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={filteredData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="license_plate" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="fuel_efficiency" name="Fuel Efficiency" stroke="#f59e0b" strokeWidth={3} dot={{ r: 4 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filter and Table Section */}
      <div className="space-y-4">
        {/* Filter controls */}
        <div className="glass rounded-xl border border-gray-800/80 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search reports by vehicle name or license plate…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full rounded-lg border border-gray-800 bg-gray-900/50 pl-9 pr-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 text-sm"
            />
          </div>

          <div className="relative min-w-[200px]">
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value)}
              className="block w-full appearance-none rounded-lg border border-gray-800 bg-gray-900/50 px-3 py-2 text-white focus:border-blue-500 text-sm pr-8"
            >
              <option value="total_cost">Sort by Operating Cost</option>
              <option value="distance_km">Sort by Distance</option>
              <option value="fuel_efficiency">Sort by Fuel Efficiency</option>
              <option value="cost_per_km">Sort by Cost per km</option>
              <option value="vehicle_name">Sort by Vehicle Name</option>
            </select>
            <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500 pointer-events-none" />
          </div>
        </div>

        {/* Detailed Grid Table */}
        <div className="glass rounded-xl border border-gray-800/80 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800 text-xs text-gray-500 uppercase tracking-wider">
                  {['Vehicle', 'Plate', 'Distance', 'Fuel efficiency', 'Fuel Cost', 'Maintenance', 'Expenses', 'Total Cost', 'Cost/km'].map((h) => (
                    <th key={h} className="px-5 py-4 text-left font-semibold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/60 text-gray-300">
                {filteredData.length > 0 ? (
                  filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-900/25 transition">
                      <td className="px-5 py-4 font-semibold text-white">{item.vehicle_name}</td>
                      <td className="px-5 py-4 font-mono text-blue-400 text-xs">{item.license_plate}</td>
                      <td className="px-5 py-4">{Number(item.distance_km).toLocaleString()} km</td>
                      <td className="px-5 py-4 font-semibold text-amber-400">{item.fuel_efficiency} km/L</td>
                      <td className="px-5 py-4">Rs. {Number(item.fuel_cost).toLocaleString()}</td>
                      <td className="px-5 py-4">Rs. {Number(item.maintenance_cost).toLocaleString()}</td>
                      <td className="px-5 py-4">Rs. {Number(item.expenses_cost).toLocaleString()}</td>
                      <td className="px-5 py-4 font-bold text-white">Rs. {Number(item.total_cost).toLocaleString()}</td>
                      <td className="px-5 py-4">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold border ${
                          item.cost_per_km > 30 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        }`}>
                          Rs. {item.cost_per_km}/km
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-gray-500 text-sm">
                      No matching performance audits found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
