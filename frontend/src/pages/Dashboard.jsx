import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axiosInstance';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
  CartesianGrid, PieChart, Pie, Cell, BarChart, Bar, Legend,
} from 'recharts';
import {
  Truck, Calendar, Users, TrendingUp, AlertTriangle, ShieldAlert,
  Shield, HelpCircle, PlusCircle, Wrench, Fuel, ArrowRight,
  RefreshCw, Clock, Sparkles, Activity, CreditCard, ArrowUpRight,
  CheckCircle2, XCircle, Timer, Package, Gauge, Zap, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';

// ─── Constants ────────────────────────────────────────────────────────────────
const STATUS_COLORS = {
  AVAILABLE: '#10b981', ON_TRIP: '#3b82f6',
  MAINTENANCE: '#f59e0b', OUT_OF_SERVICE: '#ef4444',
};
const STATUS_LABELS = {
  AVAILABLE: 'Available', ON_TRIP: 'On Trip',
  MAINTENANCE: 'Maintenance', OUT_OF_SERVICE: 'Out of Service',
};
const TRIP_STATUS_STYLES = {
  COMPLETED:   { text: 'text-emerald-400', bg: 'bg-emerald-500/8',  border: 'border-emerald-500/20', icon: CheckCircle2 },
  IN_PROGRESS: { text: 'text-blue-400',    bg: 'bg-blue-500/8',     border: 'border-blue-500/20',    icon: Timer },
  CANCELLED:   { text: 'text-red-400',     bg: 'bg-red-500/8',      border: 'border-red-500/20',     icon: XCircle },
  SCHEDULED:   { text: 'text-amber-400',   bg: 'bg-amber-500/8',    border: 'border-amber-500/20',   icon: Clock },
};

// ─── Custom Chart Tooltip ─────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#080e1f]/95 backdrop-blur-xl px-4 py-3 shadow-2xl">
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-[11px] text-gray-300">{p.name}:</span>
          <span className="text-[11px] font-extrabold text-white">
            {p.name.toLowerCase().includes('amount') || p.name.toLowerCase().includes('cost')
              ? `₹${Number(p.value).toLocaleString()}`
              : p.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── KPI Card ─────────────────────────────────────────────────────────────────
const KpiCard = ({ name, value, sub, icon: Icon, gradient, accentColor, delay = 0, utilPct }) => (
  <motion.div
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    whileHover={{ y: -3, transition: { duration: 0.18 } }}
    className="relative flex flex-col justify-between p-5 rounded-2xl border border-white/[0.06] overflow-hidden cursor-default"
    style={{ background: 'rgba(8,14,31,0.7)', backdropFilter: 'blur(20px)' }}
  >
    {/* Gradient corner accent */}
    <div className={`absolute top-0 right-0 w-24 h-24 rounded-bl-[80px] opacity-10 bg-gradient-to-br ${gradient}`} />
    <div className={`absolute top-0 right-0 w-12 h-12 rounded-bl-[40px] opacity-20 bg-gradient-to-br ${gradient}`} />

    {/* Icon */}
    <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${gradient} w-fit shadow-lg`}
      style={{ boxShadow: `0 4px 16px ${accentColor}35` }}>
      <Icon className="h-4 w-4 text-white" />
    </div>

    {/* Utilization ring (only for utilization card) */}
    {utilPct !== undefined && (
      <div className="absolute right-5 top-1/2 -translate-y-1/2">
        <svg width="44" height="44" viewBox="0 0 44 44">
          <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" />
          <circle cx="22" cy="22" r="18" fill="none" stroke={accentColor} strokeWidth="4"
            strokeDasharray={`${2 * Math.PI * 18}`}
            strokeDashoffset={`${2 * Math.PI * 18 * (1 - utilPct / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 22 22)"
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          <text x="22" y="26" textAnchor="middle" fontSize="9" fontWeight="800" fill="white">{utilPct}%</text>
        </svg>
      </div>
    )}

    <div className="mt-4">
      <p className="text-2xl font-black text-white tracking-tight">{value}</p>
      <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">{name}</p>
      {sub && (
        <span className="inline-flex items-center gap-1 mt-2 text-[10px] font-bold text-emerald-400 bg-emerald-500/8 border border-emerald-500/15 px-2 py-0.5 rounded-full">
          <Activity className="h-2.5 w-2.5" />{sub}
        </span>
      )}
    </div>
  </motion.div>
);

// ─── Section Header ───────────────────────────────────────────────────────────
const SectionHeader = ({ title, subtitle, badge, action }) => (
  <div className="flex items-start justify-between mb-5">
    <div>
      <h2 className="text-sm font-extrabold text-white tracking-tight">{title}</h2>
      {subtitle && <p className="text-[11px] text-gray-500 mt-0.5">{subtitle}</p>}
    </div>
    <div className="flex items-center gap-2">
      {badge && <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border bg-white/[0.03] border-white/[0.06] text-gray-400">{badge}</span>}
      {action}
    </div>
  </div>
);

// ─── Card Shell ───────────────────────────────────────────────────────────────
const Card = ({ children, className = '', noPad = false }) => (
  <div className={`rounded-2xl border border-white/[0.06] ${noPad ? '' : 'p-6'} ${className}`}
    style={{ background: 'rgba(8,14,31,0.7)', backdropFilter: 'blur(20px)' }}>
    {children}
  </div>
);

// ─── Quick Action Button ──────────────────────────────────────────────────────
const QuickAction = ({ to, icon: Icon, label, color, bg, border }) => (
  <Link to={to}
    className={`group relative flex items-center gap-3 px-4 py-3.5 rounded-xl border transition-all duration-200 overflow-hidden ${bg} ${border}`}>
    <div className={`p-2 rounded-lg ${color} bg-white/[0.06] flex-shrink-0 group-hover:scale-110 transition-transform`}>
      <Icon className="h-3.5 w-3.5" />
    </div>
    <span className="text-[12px] font-bold text-white/80 group-hover:text-white transition">{label}</span>
    <ArrowUpRight className={`ml-auto h-3.5 w-3.5 ${color} opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0`} />
  </Link>
);

// ─── Alert Row ────────────────────────────────────────────────────────────────
const AlertRow = ({ alert }) => {
  const isDanger = alert.severity === 'DANGER';
  return (
    <div className={`flex items-start gap-3 p-3 rounded-xl border transition ${
      isDanger ? 'bg-red-500/5 border-red-500/12 hover:border-red-500/25' : 'bg-amber-500/5 border-amber-500/12 hover:border-amber-500/25'
    }`}>
      {isDanger
        ? <ShieldAlert className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-red-400" />
        : <AlertTriangle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-amber-400" />
      }
      <div className="min-w-0">
        <p className="text-[12px] font-bold text-white leading-tight">{alert.title}</p>
        <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">{alert.message}</p>
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
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const res = await api.get('/analytics/dashboard/');
      setData(res.data);
      setLastUpdated(new Date());
      if (silent) toast.success('Dashboard refreshed', { icon: '⚡' });
    } catch { toast.error('Failed to load metrics'); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5">
      <div className="relative">
        <div className="h-14 w-14 rounded-full border-2 border-blue-500/20" />
        <div className="absolute inset-0 h-14 w-14 animate-spin rounded-full border-2 border-transparent border-t-blue-500" />
        <Truck className="absolute inset-0 m-auto h-5 w-5 text-blue-400" />
      </div>
      <div className="text-center">
        <p className="text-sm font-bold text-white">Loading Operations Center</p>
        <p className="text-xs text-gray-500 mt-1 animate-pulse">Syncing fleet metrics…</p>
      </div>
    </div>
  );

  const kpis = data?.kpis ?? {};
  const utilPct = kpis.fleet_utilization_pct ?? 0;

  const kpiCards = [
    { name: 'Active Trips', value: kpis.active_trips ?? 0, icon: Calendar,
      gradient: 'from-blue-600 to-cyan-600', accentColor: '#3b82f6', sub: 'Live now', delay: 0 },
    { name: 'Total Vehicles', value: kpis.total_vehicles ?? 0, icon: Truck,
      gradient: 'from-indigo-600 to-violet-600', accentColor: '#6366f1',
      sub: `${kpis.available_vehicles ?? 0} available`, delay: 0.05 },
    { name: 'Available Drivers', value: `${kpis.available_drivers ?? 0}/${kpis.total_drivers ?? 0}`, icon: Users,
      gradient: 'from-emerald-600 to-teal-600', accentColor: '#10b981', delay: 0.1 },
    { name: 'Fleet Utilization', value: `${utilPct}%`, icon: Gauge,
      gradient: 'from-sky-600 to-blue-600', accentColor: '#0ea5e9',
      utilPct, delay: 0.15 },
    { name: 'Under Maintenance', value: kpis.under_maintenance ?? 0, icon: Wrench,
      gradient: 'from-amber-600 to-orange-600', accentColor: '#f59e0b', delay: 0.2 },
    { name: 'Expiring Licenses', value: kpis.expiring_licenses_30d ?? 0, icon: AlertTriangle,
      gradient: (kpis.expiring_licenses_30d ?? 0) > 0 ? 'from-red-600 to-rose-600' : 'from-gray-700 to-gray-600',
      accentColor: (kpis.expiring_licenses_30d ?? 0) > 0 ? '#ef4444' : '#6b7280',
      sub: (kpis.expiring_licenses_30d ?? 0) > 0 ? '30-day window' : null, delay: 0.25 },
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
    <div className="space-y-6 max-w-[1400px] mx-auto">

      {/* ── Hero Header ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-600 to-indigo-600">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <h1 className="text-xl font-black text-white tracking-tight">Operations Center</h1>
            <span className="flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
          </div>
          <p className="text-[12px] text-gray-500">
            Welcome back, <span className="text-white font-bold">{user?.first_name}</span> ·&nbsp;
            {lastUpdated && <span className="font-mono text-gray-600">Last sync {lastUpdated.toLocaleTimeString()}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={() => fetchAnalytics(true)} disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04] text-xs font-bold text-gray-400 hover:text-white transition disabled:opacity-50">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <span className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest">
            <Activity className="h-3 w-3 animate-pulse" /> Live
          </span>
        </div>
      </motion.div>

      {/* ── 6 KPI Cards ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((card, i) => <KpiCard key={card.name} {...card} delay={i * 0.05} />)}
      </div>

      {/* ── Quick Actions ── */}
      <Card>
        <SectionHeader title="Quick Operations" subtitle="Fast access to core dispatch actions" />
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-2">
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <>
              <QuickAction to="/trips" icon={PlusCircle} label="Dispatch Trip"
                color="text-blue-400" bg="hover:bg-blue-600/8" border="border-white/[0.05] hover:border-blue-500/25" />
              <QuickAction to="/vehicles" icon={Truck} label="Add Vehicle"
                color="text-indigo-400" bg="hover:bg-indigo-600/8" border="border-white/[0.05] hover:border-indigo-500/25" />
            </>
          )}
          {hasRole(['ADMIN', 'MAINTENANCE']) && (
            <QuickAction to="/maintenance" icon={Wrench} label="Log Repair"
              color="text-amber-400" bg="hover:bg-amber-600/8" border="border-white/[0.05] hover:border-amber-500/25" />
          )}
          <QuickAction to="/fuel-logs" icon={Fuel} label="Log Fuel"
            color="text-emerald-400" bg="hover:bg-emerald-600/8" border="border-white/[0.05] hover:border-emerald-500/25" />
          <QuickAction to="/expenses" icon={CreditCard} label="Add Expense"
            color="text-rose-400" bg="hover:bg-rose-600/8" border="border-white/[0.05] hover:border-rose-500/25" />
          {hasRole(['ADMIN', 'DISPATCHER']) && (
            <QuickAction to="/reports" icon={TrendingUp} label="View Reports"
              color="text-violet-400" bg="hover:bg-violet-600/8" border="border-white/[0.05] hover:border-violet-500/25" />
          )}
        </div>
      </Card>

      {/* ── Charts Row 1: Area + Donut ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">

        {/* Dispatch Trend Area Chart */}
        <Card className="lg:col-span-8">
          <SectionHeader
            title="Dispatch Trend"
            subtitle="Monthly trip volume over the last 6 months"
            badge="6-month window"
            action={
              <span className="flex items-center gap-1 text-[10px] font-bold text-blue-400">
                <TrendingUp className="h-3 w-3" /> Growth Monitor
              </span>
            }
          />
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={tripChartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="tripGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Area type="monotone" dataKey="Trips" stroke="#3b82f6" strokeWidth={2.5}
                  fill="url(#tripGrad)"
                  dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, fill: '#60a5fa', strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Fleet Status Donut */}
        <Card className="lg:col-span-4">
          <SectionHeader title="Fleet Roster" subtitle="Vehicle availability" />
          <div className="relative flex items-center justify-center" style={{ height: 160 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={fleetDonutData} cx="50%" cy="50%"
                  innerRadius={52} outerRadius={70}
                  paddingAngle={3} dataKey="value"
                  startAngle={90} endAngle={-270}>
                  {fleetDonutData.map((e, i) => (
                    <Cell key={i} fill={e.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip formatter={(v, n) => [v, n]}
                  contentStyle={{ background: '#080e1f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] text-gray-500 uppercase tracking-widest font-bold">Fleet</span>
              <span className="text-2xl font-black text-white">{kpis.total_vehicles ?? 0}</span>
              <span className="text-[9px] text-gray-600">vehicles</span>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {fleetDonutData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ background: item.color }} />
                  <span className="text-[11px] text-gray-400">{item.name}</span>
                </div>
                <span className="text-[11px] font-extrabold text-white">{item.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* ── Charts Row 2: Cost + Alerts + Trips ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

        {/* Cost Breakdown */}
        <Card>
          <SectionHeader
            title="Financial Audit"
            subtitle={`Total: ₹${totalCost.toLocaleString()}`}
          />
          <div className="h-44">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={costData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                <CartesianGrid strokeDasharray="2 4" stroke="rgba(255,255,255,0.03)" />
                <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="amount" radius={[6, 6, 0, 0]} maxBarSize={48}>
                  {costData.map((_, i) => (
                    <Cell key={i} fill={['#3b82f6', '#f59e0b', '#10b981'][i]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          {/* Breakdown pills */}
          <div className="mt-4 grid grid-cols-3 gap-2 border-t border-white/[0.05] pt-4">
            {costData.map((c, i) => (
              <div key={c.name} className="text-center">
                <p className="text-[10px] text-gray-500">{c.name}</p>
                <p className="text-xs font-extrabold text-white mt-0.5">₹{Number(c.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Alert Center */}
        <Card>
          <SectionHeader
            title="Alert Center"
            subtitle="System flags and compliance issues"
            badge={
              alerts.length > 0
                ? `${alerts.length} Active`
                : 'All Clear'
            }
          />
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {alerts.length > 0
              ? alerts.map((a) => <AlertRow key={a.id} alert={a} />)
              : (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/[0.05] rounded-xl">
                  <div className="p-3 rounded-full bg-emerald-500/8 mb-3">
                    <Shield className="h-5 w-5 text-emerald-500/60" />
                  </div>
                  <p className="text-[11px] font-bold text-emerald-500/50 uppercase tracking-widest">All Systems Clear</p>
                  <p className="text-[10px] text-gray-700 mt-1">No alerts detected</p>
                </div>
              )
            }
          </div>
        </Card>

        {/* Live Dispatches */}
        <Card>
          <SectionHeader
            title="Live Dispatches"
            subtitle="Most recent trip activity"
            action={
              <Link to="/trips" className="flex items-center gap-1 text-[11px] font-bold text-blue-400 hover:text-blue-300 transition">
                View all <ArrowRight className="h-3 w-3" />
              </Link>
            }
          />
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {recentTrips.length > 0
              ? recentTrips.map((trip) => {
                  const style = TRIP_STATUS_STYLES[trip.status] ?? TRIP_STATUS_STYLES.SCHEDULED;
                  const StatusIcon = style.icon;
                  return (
                    <motion.div key={trip.id}
                      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-white/[0.04] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.07] transition group">
                      <div className={`p-1.5 rounded-lg flex-shrink-0 ${style.bg} border ${style.border}`}>
                        <StatusIcon className={`h-3 w-3 ${style.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[12px] font-extrabold text-white font-mono">{trip.trip_number}</span>
                          {trip.cargo_type && (
                            <span className="text-[9px] font-bold text-gray-600 uppercase px-1.5 py-0.5 bg-white/[0.03] rounded-md">{trip.cargo_type}</span>
                          )}
                        </div>
                        <p className="text-[11px] text-gray-500 truncate mt-0.5">
                          <MapPin className="inline h-2.5 w-2.5 mr-1" />{trip.route_origin} → {trip.route_destination}
                        </p>
                      </div>
                      <span className={`text-[9px] font-extrabold uppercase px-2 py-1 rounded-lg border ${style.bg} ${style.border} ${style.text} flex-shrink-0`}>
                        {trip.status.replace('_', ' ')}
                      </span>
                    </motion.div>
                  );
                })
              : (
                <div className="flex flex-col items-center justify-center py-10 border border-dashed border-white/[0.05] rounded-xl">
                  <div className="p-3 rounded-full bg-white/[0.03] mb-3">
                    <Package className="h-5 w-5 text-gray-700" />
                  </div>
                  <p className="text-[11px] font-bold text-gray-600 uppercase tracking-widest">No Active Dispatches</p>
                </div>
              )
            }
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
