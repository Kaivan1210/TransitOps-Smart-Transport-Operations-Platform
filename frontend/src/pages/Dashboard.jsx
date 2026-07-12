import React, { useEffect, useState } from 'react';
import api from '../api/axiosInstance';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Truck, Shield, Calendar, Users, BarChart3, TrendingUp, AlertTriangle, HelpCircle } from 'lucide-react';

const Dashboard = () => {
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  const kpiList = [
    { name: 'Active Trips', value: data?.kpis?.active_trips ?? 0, icon: Calendar, color: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
    { name: 'Total Fleet', value: data?.kpis?.total_vehicles ?? 0, icon: Truck, color: 'text-purple-500 bg-purple-500/10 border-purple-500/20' },
    { name: 'Available Drivers', value: `${data?.kpis?.available_drivers ?? 0}/${data?.kpis?.total_drivers ?? 0}`, icon: Users, color: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20' },
    { name: 'Under Maintenance', value: data?.kpis?.under_maintenance ?? 0, icon: AlertTriangle, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  ];

  // Map monthly data for chart
  const chartData = data?.monthly_trips?.map(item => ({
    name: new Date(item.month).toLocaleString('default', { month: 'short' }),
    Trips: item.count,
  })) || [
    { name: 'Jan', Trips: 4 },
    { name: 'Feb', Trips: 7 },
    { name: 'Mar', Trips: 12 },
    { name: 'Apr', Trips: 18 },
    { name: 'May', Trips: 24 },
    { name: 'Jun', Trips: 32 },
  ];

  return (
    <div className="space-y-8">
      {/* Top Banner Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Operations Center</h1>
        <p className="mt-2 text-sm text-gray-400">
          Real-time fleet utilization and analytical monitoring
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {kpiList.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div key={kpi.name} className="glass rounded-xl p-6 border border-gray-800/80 hover:border-gray-700/80 transition duration-150">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-400">{kpi.name}</span>
                <div className={`p-2 rounded-lg border ${kpi.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-bold text-white tracking-tight">{kpi.value}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Analytics Chart & Recent Activity Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Chart */}
        <div className="lg:col-span-2 glass rounded-xl p-6 border border-gray-800/80">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-white">Trip Volume Trends</h2>
            <span className="inline-flex items-center text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              <TrendingUp className="mr-1 h-3.5 w-3.5" /> +14.2%
            </span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTrips" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="name" stroke="#64748b" fontSize={12} />
                <YAxis stroke="#64748b" fontSize={12} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                  labelStyle={{ fontWeight: 'bold' }}
                />
                <Area type="monotone" dataKey="Trips" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTrips)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Activity / Live Dispatch Log */}
        <div className="glass rounded-xl p-6 border border-gray-800/80">
          <h2 className="text-lg font-semibold text-white mb-6">Recent Dispatch Logs</h2>
          <div className="space-y-4">
            {data?.recent_trips?.length > 0 ? (
              data.recent_trips.map((trip) => (
                <div key={trip.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-900/40 border border-gray-800">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-white truncate">{trip.trip_number}</p>
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-2xs font-medium ${
                        trip.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        trip.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-400 border border-blue-500/20' :
                        'bg-gray-500/10 text-gray-400 border border-gray-800'
                      }`}>
                        {trip.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400 truncate mt-1">
                      {trip.route_origin} → {trip.route_destination}
                    </p>
                    <span className="text-[10px] text-gray-500 mt-0.5 block">
                      Driver: {trip.driver_detail?.user_name}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-gray-500">
                <HelpCircle className="h-8 w-8 mb-2 text-gray-600" />
                <p className="text-xs">No dispatches found</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
