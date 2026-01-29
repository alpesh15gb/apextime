import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Building2,
  Briefcase,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Sparkles,
  TrendingUp,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  Activity
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { DashboardStats } from '../types';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardAPI.getStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="relative">
          <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-indigo-600 border-opacity-30"></div>
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-indigo-600 absolute top-0 -rotate-90"></div>
        </div>
        <p className="text-indigo-600 font-black animate-pulse uppercase tracking-widest text-xs">Syncing Enterprise Data</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-card text-center p-12 max-w-xl mx-auto my-20">
        <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-6 opacity-80" />
        <h2 className="text-2xl font-black text-slate-800 mb-2">Connection Timeout</h2>
        <p className="text-slate-500 mb-8 font-medium">{error}</p>
        <button onClick={fetchStats} className="btn-primary-premium mx-auto">
          <RefreshCw className="w-5 h-5" />
          Re-establish Connection
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Active Employees',
      value: stats?.counts.activeEmployees || 0,
      icon: Users,
      color: 'from-indigo-600 to-blue-500',
      subtitle: `${stats?.counts.totalEmployees || 0} Registrations`,
      to: '/employees',
    },
    {
      title: 'Current Attendance',
      value: `${stats?.today.attendanceRate || 0}%`,
      icon: CheckCircle,
      color: 'from-emerald-600 to-teal-500',
      subtitle: `${stats?.today.present || 0} checked in today`,
      to: '/attendance',
    },
    {
      title: 'Late Clock-ins',
      value: stats?.today.lateArrivals || 0,
      icon: Clock,
      color: 'from-amber-500 to-orange-500',
      subtitle: 'Requiring review',
      to: '/attendance',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <p className="text-gray-500 text-sm">Welcome back to Apextime HRM System</p>
        </div>
        <div className="flex space-x-3">
          <button onClick={fetchStats} className="p-2 text-gray-400 hover:text-gray-600 transition-colors border border-gray-200 rounded-lg">
            <RefreshCw className="w-5 h-5" />
          </button>
          <button onClick={() => navigate('/payroll')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm">
            Generate Payroll
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {statCards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.to)}
            className="bg-white p-6 rounded-xl border border-gray-200 hover:border-indigo-300 transition-all cursor-pointer shadow-sm group"
          >
            <div className="flex justify-between items-center mb-4">
              <div className="p-3 rounded-lg bg-gray-50 text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                <card.icon className="w-6 h-6" />
              </div>
              <ArrowUpRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 transition-all" />
            </div>
            <p className="text-gray-500 text-sm font-medium">{card.title}</p>
            <h3 className="text-3xl font-bold text-gray-900 mt-1">{card.value}</h3>
            <p className="text-gray-400 text-xs mt-2 flex items-center gap-1">
              <Activity className="w-3 h-3" /> {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-600" />
                Attendance Overview
              </h2>
              <button onClick={() => navigate('/monthly-report')} className="text-indigo-600 text-sm font-semibold hover:underline">
                View Full Logs
              </button>
            </div>

            <div className="p-6">
              {stats?.today.absentEmployees && stats.today.absentEmployees.length > 0 ? (
                <div className="space-y-4">
                  <div className="bg-red-50 border border-red-100 p-4 rounded-lg flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-red-500" />
                    <p className="text-red-700 text-sm font-medium">{stats.today.absent} employees are absent today.</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                    {stats.today.absentEmployees.slice(0, 6).map((emp) => (
                      <div key={emp.id} className="p-3 border border-gray-100 rounded-lg flex items-center gap-3 hover:bg-gray-50 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] text-gray-400 font-medium">Code: {emp.employeeCode}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-3 opacity-20" />
                  <p className="text-gray-500 font-medium">No absences reported for today.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar Cards */}
        <div className="space-y-6">
          {/* Sync Status */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <h3 className="font-bold text-gray-800 text-sm italic">System Integrity</h3>
            </div>
            <p className="text-gray-500 text-xs leading-relaxed mb-4">
              {stats?.lastSync?.status === 'success'
                ? 'Device synchronization is operational. All data is up to date.'
                : 'Synchronization check required. Some nodes may be reporting delays.'}
            </p>
            <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider mb-1">Last Sync</p>
              <p className="text-sm font-bold text-gray-700">
                {stats?.lastSync ? new Date(stats.lastSync.lastSyncTime).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : 'Never'}
              </p>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
            <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500" />
              Quick Actions
            </h3>
            <div className="space-y-2">
              <button
                onClick={() => navigate('/portal')}
                className="w-full p-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
              >
                Employee Portal
                <ArrowUpRight className="w-3.5 h-3.5 opacity-40" />
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="w-full p-2.5 text-left text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg flex items-center justify-between transition-colors border border-transparent hover:border-gray-200"
              >
                Company Settings
                <ArrowUpRight className="w-3.5 h-3.5 opacity-40" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
