import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import {
  Truck, Calendar, Users, TrendingUp, AlertTriangle, ShieldAlert,
  Shield, HelpCircle, PlusCircle, Wrench, Fuel, ArrowRight,
  RefreshCw, Clock, Sparkles, Activity
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Reusable KPI Card ─────────────────────────────────────────────────────────
const KpiCard = ({ name, value, sub, icon: Icon, colorClass, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4, delay }}
    className="glass-card rounded-xl p-5 border border-gray-800/80 hover:border-blue-500/30 hover:scale-[1.02] transition duration-300 relative overflow-hidden"
  >
    <div className="flex items-start justify-between relative z-10">
      <div className={`p-2.5 rounded-xl border ${colorClass}`}>
        <Icon className="h-5 w-5" />
      </div>
      {sub && (
        <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Activity className="h-2.5 w-2.5 animate-pulse" />{sub}
        </span>
      )}
    </div>
    <div className="mt-4 relative z-10">
      <p className="text-3xl font-extrabold text-white tracking-tight">{value}</p>
      <p className="text-2xs font-semibold text-gray-500 uppercase tracking-widest mt-1.5">{name}</p>
    </div>
    {/* Background Glow */}
    <div className="absolute right-[-10%] bottom-[-10%] w-24 h-24 rounded-full bg-blue-500/5 blur-xl pointer-events-none" />
  </motion.div>
);

// ─── Custom Tooltip ────────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-gray-800 bg-[#0d1222]/90 backdrop-blur-md px-4 py-3 shadow-2xl text-xs">
      <p className="text-gray-400 font-semibold mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-bold">
          {p.name}: {p.name.includes('Cost') || p.name.includes('Spend') || p.name.includes('amount') ? `Rs. ${p.value.toLocaleString()}` : p.value}
        </p>
      ))}
    </div>
  );
};

// ─── Fleet Status Donut Constants ─────────────────────────────────────────────
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
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={800}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Alert Row ─────────────────────────────────────────────────────────────────
const AlertRow = ({ alert }) => {
  const isDanger = alert.severity === 'DANGER';
  return (
    <div className={`flex items-start gap-3 p-3.5 rounded-xl border transition-colors duration-200 ${
      isDanger 
        ? 'bg-red-500/5 border-red-500/10 hover:border-red-500/30' 
        : 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/30'
    }`}>
      {isDanger
        ? <ShieldAlert className="h-4 w-4 mt-0.5 flex-shrink-0 text-red-400" />
        : <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-400" />
      }
      <div className="min-w-0 flex-1">
        <p className="text-xs font-bold text-white leading-tight">{alert.title}</p>
        <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">{alert.message}</p>
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
      if (silent) toast.success('Dashboard metrics updated');
    } catch (err) {
      toast.error('Failed to load operations metrics');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
        <p className="text-xs text-gray-400 font-semibold tracking-wider uppercase animate-pulse">Syncing operations logs…</p>
      </div>
    );
  }

  const kpis = data?.kpis ?? {};

  const kpiCards = [
    {
      name: 'Active Trips',
      value: kpis.active_trips ?? 0,
      icon: Calendar,
      colorClass: 'text-blue-400 bg-blue-500/10 border-blue-500/20 glow-blue',
    },
    {
      name: 'Total Vehicles',
      value: kpis.total_vehicles ?? 0,
      sub: `${kpis.available_vehicles ?? 0} free`,
      icon: Truck,
      colorClass: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20 glow-indigo',
    },
    {
      name: 'Available Drivers',
      value: `${kpis.available_drivers ?? 0}/${kpis.total_drivers ?? 0}`,
      icon: Users,
      colorClass: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20 glow-emerald',
    },
    {
      name: 'Fleet Utilization',
      value: `${kpis.fleet_utilization_pct ?? 0}%`,
      icon: TrendingUp,
      colorClass: 'text-sky-400 bg-sky-500/10 border-sky-500/20 glow-blue',
    },
    {
      name: 'Under Maintenance',
      value: kpis.under_maintenance ?? 0,
      icon: Wrench,
      colorClass: 'text-amber-400 bg-amber-500/10 border-amber-500/20 glow-amber',
    },
    {
      name: 'Expiring Licenses',
      value: kpis.expiring_licenses_30d ?? 0,
      icon: AlertTriangle,
      colorClass: (kpis.expiring_licenses_30d ?? 0) > 0
        ? 'text-red-400 bg-red-500/10 border-red-500/20 glow-amber'
        : 'text-gray-400 bg-gray-500/10 border-gray-700',
    },
  ];

  const tripChartData = (data?.monthly_trips ?? []).map((item) => ({
    name: new Date(item.month + '-01').toLocaleString('default', { month: 'short' }),
    Trips: item.count,
  }));

  const fleetDonutData = (data?.fleet_status_breakdown ?? []).map((item) => ({
    name: STATUS_LABELS[item.status] ?? item.status,
    value: item.count,
    color: STATUS_COLORS[item.status] ?? '#6b7280',
  }));

  const costData = [
    { name: 'Fuel', amount: data?.cost_breakdown?.fuel ?? 0 },
    { name: 'Maintenance', amount: data?.cost_breakdown?.maintenance ?? 0 },
    { name: 'Expenses', amount: data?.cost_breakdown?.expenses ?? 0 },
  ];
  const totalCost = data?.cost_breakdown?.total ?? 0;

  const alerts = data?.active_alerts ?? [];
  const recentTrips = data?.recent_trips ?? [];

  return (
    <div className="space-y-8 max-w-7xl mx-auto relative">
      {/* Decorative ambient visual background blur */}
      <div className="absolute top-[-100px] right-[-100px] w-80 h-80 bg-blue-600/5 rounded-full blur-[120px] pointer-events-none" />

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2">
            Operations Center <Sparkles className="h-5 w-5 text-blue-400 animate-pulse" />
          </h1>
          <p className="mt-1 text-sm text-gray-400">
            Real-time fleet analytics, dispatch monitoring, and smart operations insight.
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {lastUpdated && (
            <span className="hidden sm:flex items-center gap-1.5 text-xs text-gray-500 font-mono">
              <Clock className="h-3.5 w-3.5 text-gray-600" />
              Sync: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-800 bg-gray-900/50 hover:bg-gray-800 px-3.5 py-2 text-xs font-bold text-gray-300 transition duration-150"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-2xs font-bold text-emerald-400 uppercase tracking-widest">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            Live Sync
          </span>
        </div>
      </div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpiCards.map((card, i) => (
          <KpiCard key={card.name} {...card} delay={i * 0.05} />
        ))}
      </div>

      {/* ── Quick Actions ── */}
      <div className="glass rounded-xl p-5 border border-gray-800/80">
        <h2 className="text-2xs font-bold text-gray-500 uppercase tracking-widest mb-4">Core Dispatch Operations</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <>
              <Link to="/trips" className="flex items-center justify-between p-4 rounded-xl bg-blue-600/5 hover:bg-blue-600/10 border border-blue-500/10 hover:border-blue-500/30 transition group">
                <div className="flex items-center gap-2.5">
                  <PlusCircle className="h-4.5 w-4.5 text-blue-400" />
                  <span className="text-xs font-bold text-white">Dispatch New Trip</span>
                </div>
                <ArrowRight className="h-4 w-4 text-blue-400 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link to="/vehicles" className="flex items-center justify-between p-4 rounded-xl bg-indigo-600/5 hover:bg-indigo-600/10 border border-indigo-500/10 hover:border-indigo-500/30 transition group">
                <div className="flex items-center gap-2.5">
                  <Truck className="h-4.5 w-4.5 text-indigo-400" />
                  <span className="text-xs font-bold text-white">Register Fleet Vehicle</span>
                </div>
                <ArrowRight className="h-4 w-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
              </Link>
            </>
          )}
          {hasRole(['ADMIN', 'MAINTENANCE']) && (
            <Link to="/maintenance" className="flex items-center justify-between p-4 rounded-xl bg-amber-600/5 hover:bg-amber-600/10 border border-amber-500/10 hover:border-amber-500/30 transition group">
              <div className="flex items-center gap-2.5">
                <Wrench className="h-4.5 w-4.5 text-amber-400" />
                <span className="text-xs font-bold text-white">Log Vehicle Repair</span>
              </div>
              <ArrowRight className="h-4 w-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
            </Link>
          )}
          <Link to="/fuel-logs" className="flex items-center justify-between p-4 rounded-xl bg-emerald-600/5 hover:bg-emerald-600/10 border border-emerald-500/10 hover:border-emerald-500/30 transition group">
            <div className="flex items-center gap-2.5">
              <Fuel className="h-4.5 w-4.5 text-emerald-400" />
              <span className="text-xs font-bold text-white">Log Fuel Receipt</span>
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
              <h2 className="text-sm font-bold text-white uppercase tracking-wider">Dispatch Analytics Trend</h2>
              <p className="text-2xs text-gray-500 mt-0.5">Trips completed and active over the last 6 months</p>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/5 border border-blue-500/15 px-2.5 py-0.5 rounded-full">
              <TrendingUp className="h-3 w-3" /> Growth Monitor
            </span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tripChartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#161b2c" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Trips" stroke="#3b82f6" strokeWidth={2.5} fill="url(#areaGrad)" dot={{ fill: '#3b82f6', r: 3 }} activeDot={{ r: 5 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fleet Status Donut */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Fleet Status Roster</h2>
            <p className="text-2xs text-gray-500 mt-0.5">Vehicle availability ratio</p>
          </div>
          
          <div className="relative flex-1 flex items-center justify-center my-4" style={{ minHeight: 160 }}>
            <ResponsiveContainer width="100%" height={160}>
              <PieChart>
                <Pie
                  data={fleetDonutData}
                  cx="50%" cy="50%"
                  innerRadius={50} outerRadius={68}
                  paddingAngle={3}
                  dataKey="value"
                  labelLine={false}
                  label={renderCustomLabel}
                >
                  {fleetDonutData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: '#0d1222', border: '1px solid #1e293b', borderRadius: 8 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute flex flex-col items-center pointer-events-none">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Fleet Size</span>
              <span className="text-xl font-extrabold text-white mt-0.5">{kpis.total_vehicles ?? 0}</span>
            </div>
          </div>

          <div className="space-y-1.5 border-t border-gray-800/80 pt-4">
            {fleetDonutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between text-2xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-gray-400 font-semibold">{item.name}</span>
                </div>
                <span className="font-bold text-white">{item.value} vehicles</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Cost Breakdown Bar + Alerts + Recent Trips ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cost Bar Chart */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 space-y-4 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Financial Audit</h2>
            <p className="text-2xs text-gray-500 mt-0.5">
              Accumulated Fleet Spend: <span className="text-white font-bold text-xs">Rs. {totalCost.toLocaleString()}</span>
            </p>
          </div>
          <div className="h-44 my-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 0, right: 0, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#161b2c" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                  {costData.map((entry, i) => (
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
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Alert Center</h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${alerts.length > 0 ? 'bg-red-500/10 text-red-400 border-red-500/15' : 'bg-gray-800/50 text-gray-400 border-gray-800'}`}>
              {alerts.length} Issues
            </span>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {alerts.length > 0
              ? alerts.map((a) => <AlertRow key={a.id} alert={a} />)
              : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 border border-dashed border-gray-850 rounded-xl">
                  <Shield className="h-8 w-8 text-emerald-500/20 mb-2" />
                  <p className="text-2xs text-emerald-500/60 font-bold uppercase tracking-wider">System Fully Guarded</p>
                </div>
              )
            }
          </div>
        </div>

        {/* Live Dispatches */}
        <div className="glass rounded-xl p-6 border border-gray-800/80 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Live Dispatches</h2>
            <Link to="/trips" className="text-2xs font-bold uppercase tracking-wider text-blue-400 hover:text-blue-300 flex items-center gap-1 transition">
              Roster <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="space-y-2.5 max-h-48 overflow-y-auto pr-1">
            {recentTrips.length > 0
              ? recentTrips.map((trip) => {
                  const statusColor = {
                    COMPLETED: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/15',
                    IN_PROGRESS: 'text-blue-400 bg-blue-500/5 border-blue-500/15',
                    CANCELLED: 'text-red-400 bg-red-500/5 border-red-500/15',
                  }[trip.status] ?? 'text-amber-400 bg-amber-500/5 border-amber-500/15';
                  return (
                    <div key={trip.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-950/40 border border-gray-900/60 hover:border-gray-800 transition">
                      <div className="min-w-0 flex-1 pr-3">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-white font-mono">{trip.trip_number}</span>
                          <span className="text-[10px] text-gray-600">•</span>
                          <span className="text-[9px] font-bold text-gray-500 uppercase truncate max-w-[80px]">{trip.cargo_type}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {trip.route_origin} → {trip.route_destination}
                        </p>
                      </div>
                      <span className={`flex-shrink-0 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase border ${statusColor}`}>
                        {trip.status.replace('_', ' ')}
                      </span>
                    </div>
                  );
                })
              : (
                <div className="flex flex-col items-center justify-center py-8 text-gray-500 border border-dashed border-gray-850 rounded-xl">
                  <HelpCircle className="h-8 w-8 text-gray-850 mb-2" />
                  <p className="text-2xs text-gray-500 uppercase tracking-widest font-bold">No dispatches logged</p>
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
