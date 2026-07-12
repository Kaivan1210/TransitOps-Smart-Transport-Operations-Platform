import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, Legend, Cell, PieChart, Pie
} from 'recharts';
import {
  Truck, Shield, Calendar, Users, BarChart3, TrendingUp, AlertTriangle,
  HelpCircle, ShieldAlert, PlusCircle, Wrench, Fuel, DollarSign, ArrowRight
} from 'lucide-react';

const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const res = await api.get('/analytics/dashboard/');
        setData(res.data);
      } catch (err) {
        console.error('Failed to load dashboard analytics', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#080b11]">
        <div className="flex flex-col items-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          <p className="text-gray-400 font-medium">Loading Analytics...</p>
        </div>
      </div>
    );
  }

  // Cost breakdown format
  const costBreakdownData = [
    { name: 'Fuel Costs', value: data?.cost_breakdown?.fuel ?? 0, color: '#3b82f6' },
    { name: 'Maintenance', value: data?.cost_breakdown?.maintenance ?? 0, color: '#f59e0b' },
    { name: 'Driver Expenses', value: data?.cost_breakdown?.expenses ?? 0, color: '#10b981' },
  ].filter(item => item.value > 0);

  // Fallback cost data if DB has no entries yet
  const costChartData = costBreakdownData.length > 0 ? costBreakdownData : [
    { name: 'Fuel Costs', value: 3420, color: '#3b82f6' },
    { name: 'Maintenance', value: 1850, color: '#f59e0b' },
    { name: 'Driver Expenses', value: 450, color: '#10b981' },
  ];

  const totalCosts = data?.cost_breakdown?.total ?? costChartData.reduce((acc, curr) => acc + curr.value, 0);

  const kpiList = [
    { name: 'Active Trips', value: data?.kpis?.active_trips ?? 0, icon: Calendar, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { name: 'Total Vehicles', value: data?.kpis?.total_vehicles ?? 0, icon: Truck, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
    { name: 'Available Drivers', value: `${data?.kpis?.available_drivers ?? 0}/${data?.kpis?.total_drivers ?? 0}`, icon: Users, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { name: 'Fleet Utilization', value: `${data?.kpis?.fleet_utilization_pct ?? 0}%`, icon: TrendingUp, color: 'text-sky-500 bg-sky-500/10 border-sky-500/20' },
  ];

  const chartData = data?.monthly_trips?.map(item => ({
    name: new Date(item.month).toLocaleString('default', { month: 'short' }),
    Trips: item.count,
  })) || [
    { name: 'Jan', Trips: 5 },
    { name: 'Feb', Trips: 9 },
    { name: 'Mar', Trips: 14 },
    { name: 'Apr', Trips: 18 },
    { name: 'May', Trips: 22 },
    { name: 'Jun', Trips: 35 },
  ];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Operations Center</h1>
          <p className="mt-2 text-sm text-gray-400">
            Real-time fleet utilization, dynamic routing checks, and analytical monitoring.
          </p>
        </div>
        <div className="flex items-center space-x-2 text-xs font-semibold text-gray-400 bg-gray-900/50 border border-gray-800/80 px-3 py-1.5 rounded-lg">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse mr-2"></span>
          Live Sync Active
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiList.map((kpi, idx) => {
          const Icon = kpi.icon;
          return (
            <motion.div
              key={kpi.name}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.05 }}
              className="glass rounded-xl p-6 border border-gray-800/85 hover:border-gray-700/80 hover:scale-[1.01] transition duration-200"
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">{kpi.name}</span>
                <div className={`p-2.5 rounded-xl border ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white tracking-tight">{kpi.value}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Quick Actions Panel */}
      <div className="glass rounded-xl p-6 border border-gray-800/85">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Quick Dispatch Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <>
              <Link
                to="/trips"
                className="flex items-center justify-between p-4 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 text-blue-400 transition"
              >
                <div className="flex items-center space-x-3">
                  <PlusCircle className="h-5 w-5" />
                  <span className="text-sm font-semibold text-white">Create Trip Request</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>

              <Link
                to="/vehicles"
                className="flex items-center justify-between p-4 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 text-purple-400 transition"
              >
                <div className="flex items-center space-x-3">
                  <Truck className="h-5 w-5" />
                  <span className="text-sm font-semibold text-white">Register Vehicle</span>
                </div>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </>
          )}

          {hasRole(['ADMIN', 'MAINTENANCE']) && (
            <Link
              to="/maintenance"
              className="flex items-center justify-between p-4 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 transition"
            >
              <div className="flex items-center space-x-3">
                <Wrench className="h-5 w-5" />
                <span className="text-sm font-semibold text-white">Log Maintenance</span>
              </div>
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}

          <Link
            to="/fuel-logs"
            className="flex items-center justify-between p-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/40 text-emerald-400 transition"
          >
            <div className="flex items-center space-x-3">
              <Fuel className="h-5 w-5" />
              <span className="text-sm font-semibold text-white">Log Fuel Receipt</span>
            </div>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Main Charts & Notifications Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Trip Analytics Area Chart */}
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-gray-800/85 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Monthly Dispatch Activity</h2>
              <p className="text-xs text-gray-500 mt-1">Number of scheduled trips tracked monthly</p>
            </div>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <TrendingUp className="mr-1 h-3.5 w-3.5" /> +14.2% MoM
            </span>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                <YAxis stroke="#64748b" fontSize={11} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="Trips" stroke="#3b82f6" strokeWidth={2.5} fillOpacity={1} fill="url(#colorTrips)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cost Breakdowns Chart Widget */}
        <div className="glass rounded-xl p-6 border border-gray-800/85 flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Fleet Expenses</h2>
            <p className="text-xs text-gray-500 mt-1">Breakdown of operational spend</p>
          </div>

          <div className="h-44 w-full relative flex items-center justify-center my-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={costChartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {costChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `Rs. ${value}`} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute text-center">
              <span className="text-2xs text-gray-500 uppercase tracking-widest block">Total Cost</span>
              <span className="text-xl font-bold text-white">Rs. {totalCosts}</span>
            </div>
          </div>

          <div className="space-y-2.5">
            {costChartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-gray-400">{item.name}</span>
                </div>
                <span className="font-semibold text-white">Rs. {item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Warning Alerts & Recent Trips Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {/* System Warnings Panel */}
        <div className="glass rounded-xl p-6 border border-gray-800/85">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Active System Alerts</h2>
            <span className="text-xs text-gray-500 font-semibold bg-gray-900 border border-gray-800 px-2 py-0.5 rounded">
              {data?.active_alerts?.length ?? 0} Warnings
            </span>
          </div>

          <div className="space-y-4">
            {data?.active_alerts && data.active_alerts.length > 0 ? (
              data.active_alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-start space-x-3.5 p-4 rounded-xl border ${
                    alert.severity === 'DANGER'
                      ? 'bg-red-500/5 border-red-500/20 text-red-400'
                      : 'bg-amber-500/5 border-amber-500/20 text-amber-400'
                  }`}
                >
                  {alert.severity === 'DANGER' ? (
                    <ShieldAlert className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="text-sm font-bold text-white">{alert.title}</h4>
                    <p className="text-xs text-gray-400 mt-1 leading-relaxed">{alert.message}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <Shield className="h-8 w-8 text-emerald-500/35 mb-2" />
                <p className="text-xs text-gray-400 font-medium">All systems green. No active alerts.</p>
              </div>
            )}
          </div>
        </div>

        {/* Live Dispatch Records */}
        <div className="glass rounded-xl p-6 border border-gray-800/85">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Live Dispatches</h2>
            <Link to="/trips" className="text-xs font-semibold text-blue-500 hover:text-blue-400 flex items-center">
              View all trips <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="space-y-3.5">
            {data?.recent_trips && data.recent_trips.length > 0 ? (
              data.recent_trips.map((trip) => (
                <div
                  key={trip.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-gray-900/30 border border-gray-800/80 hover:border-gray-700/80 transition duration-150"
                >
                  <div className="min-w-0 flex-1 pr-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-bold text-white tracking-wide">{trip.trip_number}</span>
                      <span className="text-[10px] text-gray-500">•</span>
                      <span className="text-2xs font-semibold text-gray-400 uppercase tracking-widest">{trip.cargo_type}</span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-1">
                      Origin: <span className="text-gray-300 font-medium">{trip.route_origin}</span> → Destination: <span className="text-gray-300 font-medium">{trip.route_destination}</span>
                    </p>
                    <div className="flex items-center space-x-3 text-[10px] text-gray-500 mt-2">
                      <span>Vehicle: {trip.vehicle_detail?.license_plate}</span>
                      <span>•</span>
                      <span>Driver: {trip.driver_detail?.user_name}</span>
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-2xs font-semibold uppercase tracking-wider ${
                    trip.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                    trip.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/25' :
                    trip.status === 'CANCELLED' ? 'bg-red-500/10 text-red-400 border border-red-500/25' :
                    'bg-amber-500/10 text-amber-400 border border-amber-500/25'
                  }`}>
                    {trip.status.replace('_', ' ')}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                <HelpCircle className="h-8 w-8 mb-2 text-gray-600" />
                <p className="text-xs">No dispatches logged in this workspace.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
