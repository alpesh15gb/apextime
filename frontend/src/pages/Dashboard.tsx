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
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600">{error}</p>
        <button onClick={fetchStats} className="btn-primary mt-4">
          Retry
        </button>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Employees',
      value: stats?.counts.totalEmployees || 0,
      icon: Users,
      color: 'bg-blue-500',
      subtitle: `${stats?.counts.activeEmployees || 0} Active`,
      to: '/employees',
    },
    {
      title: 'Present Today',
      value: stats?.today.present || 0,
      icon: CheckCircle,
      color: 'bg-green-500',
      subtitle: `${stats?.today.attendanceRate || 0}% Attendance Rate`,
      to: '/attendance',
    },
    {
      title: 'Absent Today',
      value: stats?.today.absent || 0,
      icon: XCircle,
      color: 'bg-red-500',
      subtitle: 'Need attention',
      to: '/attendance',
    },
    {
      title: 'Late Arrivals',
      value: stats?.today.lateArrivals || 0,
      icon: Clock,
      color: 'bg-yellow-500',
      subtitle: 'Today',
      to: '/attendance',
    },
    {
      title: 'Departments',
      value: stats?.counts.totalDepartments || 0,
      icon: Briefcase,
      color: 'bg-purple-500',
      subtitle: 'Across all branches',
      to: '/departments',
    },
    {
      title: 'Branches',
      value: stats?.counts.totalBranches || 0,
      icon: Building2,
      color: 'bg-indigo-500',
      subtitle: `${stats?.counts.devicesCount || 0} Devices connected`,
      to: '/branches',
    },
  ];

  return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
          <button
              onClick={fetchStats}
              className="flex items-center space-x-2 text-gray-600 hover:text-primary-600"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {statCards.map((card, index) => (
            <div
              key={index}
              onClick={() => navigate(card.to)}
              className="card hover:shadow-lg transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-500 text-sm mb-1">{card.title}</p>
                  <p className="text-3xl font-bold text-gray-800">{card.value}</p>
                  <p className="text-sm text-gray-400 mt-1">{card.subtitle}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <card.icon className="w-6 h-6 text-white" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Last Sync Status */}
        <div
          onClick={() => navigate('/sync-diagnostics')}
          className="card hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">System Status</h2>
          <div className="flex items-center space-x-4">
            <div
                className={`w-3 h-3 rounded-full ${
                    stats?.lastSync?.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'
                }`}
            />
            <div>
              <p className="font-medium">
                {stats?.lastSync?.status === 'success'
                    ? 'System operational'
                    : 'Last sync had issues'}
              </p>
              <p className="text-sm text-gray-500">
                Last sync:{' '}
                {stats?.lastSync
                    ? new Date(stats.lastSync.lastSyncTime).toLocaleString()
                    : 'Never'}
                {stats?.lastSync?.recordsSynced !== undefined &&
                    ` • ${stats.lastSync.recordsSynced} records synced`}
              </p>
            </div>
          </div>
        </div>
      </div>
  );
};
