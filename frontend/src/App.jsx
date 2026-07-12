import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DashboardLayout from './components/DashboardLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import Vehicles from './pages/Vehicles';
import Drivers from './pages/Drivers';
import Trips from './pages/Trips';
import Maintenance from './pages/Maintenance';
import FuelLogs from './pages/FuelLogs';
import Expenses from './pages/Expenses';

// Placeholder views for modules that will be developed in future milestones
const PlaceholderView = ({ title }) => (
  <div className="glass rounded-xl p-8 border border-gray-800/80">
    <h2 className="text-xl font-semibold text-white mb-2">{title}</h2>
    <p className="text-sm text-gray-400">This module is part of the upcoming platform execution milestones.</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

          {/* Secure Dashboard Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/vehicles"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Vehicles />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/drivers"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'DISPATCHER']}>
                <DashboardLayout>
                  <Drivers />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/trips"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Trips />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/maintenance"
            element={
              <ProtectedRoute allowedRoles={['ADMIN', 'MAINTENANCE']}>
                <DashboardLayout>
                  <Maintenance />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/fuel-logs"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <FuelLogs />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          <Route
            path="/expenses"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Expenses />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* Catch-all redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#0f172a',
            color: '#fff',
            border: '1px solid rgba(255, 255, 255, 0.08)',
          },
        }}
      />
    </AuthProvider>
  );
}

export default App;
