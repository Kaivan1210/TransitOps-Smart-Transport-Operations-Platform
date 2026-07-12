import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0f19] px-4 text-center">
      <div className="max-w-md space-y-6 glass-card p-8 rounded-2xl border border-red-500/20">
        <div className="flex justify-center">
          <div className="p-3 bg-red-500/10 text-red-500 rounded-2xl border border-red-500/20 animate-pulse">
            <ShieldAlert className="h-12 w-12" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">Access Denied</h1>
        <p className="text-gray-400 text-sm">
          Your account role does not have the required permissions to view this secure administrative resource.
        </p>
        <div className="pt-4">
          <Link
            to="/"
            className="inline-flex items-center justify-center space-x-2 bg-gray-900 hover:bg-gray-800 border border-gray-800 text-white rounded-lg px-4 py-2.5 text-sm font-semibold transition"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Dashboard</span>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Unauthorized;
