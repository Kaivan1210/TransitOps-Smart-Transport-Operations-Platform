import React from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Truck, Shield, Calendar, Users, LogOut, Wrench, Fuel, BarChart3,
  CreditCard, User, Menu, X
} from 'lucide-react';

const DashboardLayout = ({ children }) => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);

  const menuItems = [
    { name: 'Dashboard', path: '/', icon: BarChart3, roles: null },
    { name: 'Vehicles', path: '/vehicles', icon: Truck, roles: null },
    { name: 'Drivers', path: '/drivers', icon: Users, roles: ['ADMIN', 'DISPATCHER'] },
    { name: 'Trips', path: '/trips', icon: Calendar, roles: null },
    { name: 'Maintenance', path: '/maintenance', icon: Wrench, roles: ['ADMIN', 'MAINTENANCE'] },
    { name: 'Fuel Logs', path: '/fuel-logs', icon: Fuel, roles: null },
    { name: 'Expenses', path: '/expenses', icon: CreditCard, roles: null },
    { name: 'Reports', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'DISPATCHER'] },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const filteredMenuItems = menuItems.filter(
    item => !item.roles || hasRole(item.roles)
  );

  return (
    <div className="flex h-screen bg-[#080b11] text-gray-100 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Component */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-gray-800/80 bg-[#0c0f17] transition-transform duration-300 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo */}
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-800/80">
          <Link to="/" className="flex items-center space-x-2">
            <Truck className="h-6 w-6 text-blue-500" />
            <span className="text-xl font-bold tracking-tight text-white">
              Transit<span className="text-blue-500">Ops</span>
            </span>
          </Link>
          <button className="lg:hidden text-gray-400 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 border-b border-gray-800/80 bg-gray-900/10">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600/10 text-blue-400 border border-blue-500/20 font-bold">
              {user?.full_name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate">{user?.full_name}</p>
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-0.5 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20 mt-0.5">
                {user?.role}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {filteredMenuItems.map((item) => {
            const isActive = location.pathname === item.path;
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white glow-blue'
                    : 'text-gray-400 hover:bg-gray-800/40 hover:text-white'
                }`}
              >
                <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-white' : 'text-gray-400 group-hover:text-white'}`} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        {/* Logout Footer */}
        <div className="p-4 border-t border-gray-800/80">
          <button
            onClick={handleLogout}
            className="flex w-full items-center px-3 py-2 text-sm font-medium text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content Pane */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex h-16 items-center justify-between border-b border-gray-800/80 bg-[#0c0f17] px-6 lg:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-gray-400 hover:text-white lg:hidden"
          >
            <Menu className="h-6 w-6" />
          </button>

          <div className="ml-auto flex items-center space-x-4">
            <span className="text-xs text-gray-500">Local time: 10:42 AM</span>
            <div className="h-4 w-[1px] bg-gray-800"></div>
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <User className="h-4 w-4 text-gray-500" />
              <span>{user?.email}</span>
            </div>
          </div>
        </header>

        {/* Content Box */}
        <main className="flex-1 overflow-y-auto bg-[#080b11] p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
