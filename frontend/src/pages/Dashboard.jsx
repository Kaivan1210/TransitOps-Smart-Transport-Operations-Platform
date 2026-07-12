import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  Truck, Calendar, Users, TrendingUp, AlertTriangle, ShieldAlert,
  Shield, HelpCircle, PlusCircle, Wrench, Fuel, ArrowRight,
  RefreshCw, Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Reusable KPI Card ─────────────────────────────────────────────────────────
const KpiCard = ({ name, value, sub, icon: Icon, colorClass, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.35, delay }}
    className="glass rounded-xl p-5 border border-gray-800/80 hover:border-gray-700 hover:scale-[1.015] transition duration-200"
  >
    <div className="flex items-start justify-between">
      <div className={`p-2.5 rounded-xl border ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      {sub && (
        <span className="text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
          <TrendingUp className="h-3 w-3" />{sub}
        </span>
      )}
    </div>
    <div className="mt-4">
      <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-1 font-medium">{name}</p>
    </div>
  </motion.div>
);

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-700 bg-[#0d1117] px-4 py-3 shadow-2xl text-sm">
      <p className="text-gray-400 font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Fleet Status Donut ────────────────────────────────────────────────────────
const STATUS_COLORS = {
  AVAILABLE: '#10b981',
  ON_TRIP: '#3b82f6',
  MAINTENANCE: '#f59e0b',
  OUT_OF_SERVICE: '#ef4444',
};
const STATUS_LABELS = {
  AVAILABLE: 'Available',
  ON_TRIP: 'On Trip',
  MAINTENANCE: 'Maintenance',
  OUT_OF_SERVICE: 'Out of Service',
};

const RADIAN = Math.PI / 180;
const renderCustomLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.06) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Alert Row ─────────────────────────────────────────────────────────────────
const AlertRow = ({ alert }) => {
  const isDanger = alert.severity === 'DANGER';
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${isDanger ? 'bg-red-500/5 border-red-500/20' : 'bg-amber-500/5 border-amber-500/20'}`}>
      {isDanger
        ? <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
        : <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
      }
      <div>
        <p className="text-sm font-bold text-white leading-tight">{alert.title}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{alert.message}</p>
      </div>
    </div>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { user, hasRole } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchAnalytics = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await api.get('/analytics/dashboard/');
      setData(res.data);
      setLastUpdated(new Date());
      if (silent) toast.success('Dashboard refreshed');
    } catch (err) {
      toast.error('Failed to load analytics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  // ── Loading skeleton ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        <p className="text-sm text-gray-400 font-medium animate-pulse">Loading Operations Center…</p>
      </div>
    );
  }

  // ── KPI derivations ────────────────────────────────────────────────────────
  const kpis = data?.kpis ?? {};

  const kpiCards = [
    {
      name: 'Active Trips',
      value: kpis.active_trips ?? 0,
      icon: Calendar,
      colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    },
    {
      name: 'Total Vehicles',
      value: kpis.total_vehicles ?? 0,
      sub: `${kpis.available_vehicles ?? 0} free`,
      icon: Truck,
      colorClass: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    },
    {
      name: 'Available Drivers',
      value: `${kpis.available_drivers ?? 0}/${kpis.total_drivers ?? 0}`,
      icon: Users,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
    },
    {
      name: 'Fleet Utilization',
      value: `${kpis.fleet_utilization_pct ?? 0}%`,
      icon: TrendingUp,
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
    },
    {
      name: 'Under Maintenance',
      value: kpis.under_maintenance ?? 0,
      icon: Wrench,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    },
    {
      name: 'Expiring Licenses (30d)',
      value: kpis.expiring_licenses_30d ?? 0,
      icon: AlertTriangle,
      colorClass: (kpis.expiring_licenses_30d ?? 0) > 0
        ? 'text-red-400 bg-red-500/10 border-red-500/20'
        : 'text-gray-400 bg-gray-500/10 border-gray-700',
    },
  ];

  // ── Trip area chart data ────────────────────────────────────────────────────
  const tripChartData = data?.monthly_trips?.length
    ? data.monthly_trips.map((item) => ({
        name: new Date(item.month + '-01').toLocaleString('default', { month: 'short' }),
        Trips: item.count,
      }))
    : [
        { name: 'Feb', Trips: 4 },
        { name: 'Mar', Trips: 9 },
        { name: 'Apr', Trips: 15 },
        { name: 'May', Trips: 20 },
        { name: 'Jun', Trips: 28 },
        { name: 'Jul', Trips: 35 },
      ];

  // ── Fleet status donut ──────────────────────────────────────────────────────
  const fleetDonutData = data?.fleet_status_breakdown?.length
    ? data.fleet_status_breakdown.map((item) => ({
        name: STATUS_LABELS[item.status] ?? item.status,
        value: item.count,
        color: STATUS_COLORS[item.status] ?? '#64748b',
      }))
    : [
        { name: 'Available', value: 3, color: '#10b981' },
        { name: 'On Trip', value: 1, color: '#3b82f6' },
        { name: 'Maintenance', value: 1, color: '#f59e0b' },
      ];

  // ── Cost breakdown bar chart ────────────────────────────────────────────────
  const costData = [
    { name: 'Fuel', amount: data?.cost_breakdown?.fuel ?? 0 },
    { name: 'Maintenance', amount: data?.cost_breakdown?.maintenance ?? 0 },
    { name: 'Expenses', amount: data?.cost_breakdown?.expenses ?? 0 },
  ];
  const totalCost = data?.cost_breakdown?.total ?? 0;

  const alerts = data?.active_alerts ?? [];
  const recentTrips = data?.recent_trips ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto">

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Operations Center</h1>
          <p className="mt-1 text-sm text-gray-400">
            Real-time fleet analytics, dispatch monitoring, and cost insights.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500">
              <Clock className="h-3.5 w-3.5" />
              {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900 hover:bg-gray-800 px-3.5 py-2 text-sm font-semibold text-gray-300 transition disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/10 px-3.5 py-2 text-xs font-semibold text-emerald-400">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Sync
          </span>
        </div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <KpiCard key={card.name} {...card} delay={i * 0.06} />
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="glass rounded-xl p-5 border border-gray-800/80">
        <h2 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <>
              <Link to="/trips" className="flex items-center justify-between p-4 rounded-xl bg-blue-600/10 hover:bg-blue-600/20 border border-blue-500/20 hover:border-blue-500/40 transition group">
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="h-5 w-5 text-blue-400" />
                  <span className="text-sm font-semibold text-white">Create Trip</span>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/vehicles" className="flex items-center justify-between p-4 rounded-xl bg-purple-600/10 hover:bg-purple-600/20 border border-purple-500/20 hover:border-purple-500/40 transition group">
                <div className="flex items-center gap-2.5">
                  <Truck className="h-5 w-5 text-purple-400" />
                  <span className="text-sm font-semibold text-white">Register Vehicle</span>
                </div>
                <ArrowRight className="h-4 w-4 text-purple-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </>
          )}
          {hasRole(['ADMIN', 'MAINTENANCE']) && (
            <Link to="/maintenance" className="flex items-center justify-between p-4 rounded-xl bg-amber-600/10 hover:bg-amber-600/20 border border-amber-500/20 hover:border-amber-500/40 transition group">
              <div className="flex items-center gap-2.5">
                <Wrench className="h-5 w-5 text-amber-400" />
                <span className="text-sm font-semibold text-white">Log Maintenance</span>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          <Link to="/fuel-logs" className="flex items-center justify-between p-4 rounded-xl bg-emerald-600/10 hover:bg-emerald-600/20 border border-emerald-500/20 hover:border-emerald-500/40 transition group">
            <div className="flex items-center gap-2.5">
              <Fuel className="h-5 w-5 text-emerald-400" />
              <span className="text-sm font-semibold text-white">Log Fuel</span>
            </div>
            <ArrowRight className="h-4 w-4 text-emerald-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Monthly Trip Area Chart */}
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white">Monthly Dispatch Activity</h2>
              <p className="text-xs text-gray-500 mt-0.5">Trips scheduled over the last 6 months</p>
            </div>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> Trend
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tripChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Trips" stroke="#3b82f6" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Status Donut */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 flex flex-col">
          <h2 className="text-base font-bold text-white">Fleet Status</h2>
          <p className="text-xs text-gray-500 mt-0.5 mb-4">Vehicle availability breakdown</p>
          <div className="relative flex-1 flex items-center justify-center" style={{ minHeight: 180 }}>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={fleetDonutData}
                  cx="50%" cy="50%"
                  innerRadius={55} outerRadius={75}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {fleetDonutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#0d1117', border: '1px solid #334155', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-xs text-gray-500 uppercase tracking-widest">Fleet</span>
              <span className="text-2xl font-extrabold text-white">{kpis.total_vehicles ?? 0}</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {fleetDonutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-400">{item.name}</span>
                </div>
                <span className="font-semibold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cost Breakdown Bar + Alerts + Recent Trips ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Cost Bar Chart */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 space-y-4">
          <div>
            <h2 className="text-base font-bold text-white">Operational Costs</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Total: <span className="text-white font-bold">Rs. {totalCost.toLocaleString()}</span>
            </p>
          </div>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                <YAxis stroke="#64748b" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} formatter={(v) => `Rs. ${v}`} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {costData.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#f59e0b', '#10b981'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Alerts */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">System Alerts</h2>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${alerts.length > 0 ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
              {alerts.length} active
            </span>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {alerts.length > 0
              ? alerts.map((a) => <AlertRow key={a.id} alert={a} />)
              : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <Shield className="h-8 w-8 text-emerald-500/30 mb-2" />
                  <p className="text-xs text-gray-400">All systems green.</p>
                </div>
              )
            }
          </div>
        </div>

        {/* Live Dispatches */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white">Live Dispatches</h2>
            <Link to="/trips" className="text-xs font-semibold text-blue-400 hover:text-blue-300 flex items-center gap-1">
              View all <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {recentTrips.length > 0
              ? recentTrips.map((trip) => {
                  const statusColor = {
                    COMPLETED: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/25',
                    IN_PROGRESS: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
                    CANCELLED: 'text-red-400 bg-red-500/10 border-red-500/25',
                  }[trip.status] ?? 'text-amber-400 bg-amber-500/10 border-amber-500/25';
                  return (
                    <div key={trip.id} className="flex items-center justify-between p-3.5 rounded-xl bg-gray-900/40 border border-gray-800/80 hover:border-gray-700 transition">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{trip.trip_number}</span>
                          <span className="text-[10px] text-gray-500">•</span>
                          <span className="text-[10px] text-gray-400 uppercase">{trip.cargo_type}</span>
                        </div>
                        <p className="text-xs text-gray-400 truncate mt-0.5">
                          {trip.route_origin} → {trip.route_destination}
                        </p>
                        <p className="text-[10px] text-gray-600 mt-1">
                          {trip.vehicle_detail?.license_plate} · {trip.driver_detail?.user_name}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase border ${statusColor}`}>
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })
              : (
                <div className="flex flex-col items-center justify-center py-10 text-gray-500">
                  <HelpCircle className="h-8 w-8 text-gray-700 mb-2" />
                  <p className="text-xs">No dispatches logged yet.</p>
                </div>
              )
            }
          </div>
        </div>
      </div>

    </div>
  );
};

export default Dashboard;
