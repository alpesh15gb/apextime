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

      {/* Today's Absentees */}
      {stats?.today.absentEmployees && stats.today.absentEmployees.length > 0 && (
        <div className="card bg-white shadow rounded-lg p-6 mb-8 border-l-4 border-red-500">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800 flex items-center">
              <XCircle className="w-5 h-5 mr-2 text-red-500" />
              Today's Absentees
            </h2>
            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">
              {stats.today.absent} Employees
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-4">Code</th>
                  <th className="text-left py-2 px-4">Employee Name</th>
                  <th className="text-right py-2 px-4">Action</th>
                </tr>
              </thead>
              <tbody>
                {stats.today.absentEmployees.map((emp) => (
                  <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono">{emp.employeeCode}</td>
                    <td className="py-2 px-4 font-medium">
                      {emp.firstName} {emp.lastName}
                    </td>
                    <td className="py-2 px-4 text-right">
                      <button
                        onClick={() => navigate(`/attendance?search=${emp.employeeCode}`)}
                        className="text-primary-600 hover:text-primary-800 font-medium"
                      >
                        View History
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {stats.today.absent > 20 && (
              <p className="text-xs text-gray-500 mt-4 italic">
                Showing first 20 absent employees. Go to reports for full list.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Last Sync Status */}
      <div
        onClick={() => navigate('/sync-diagnostics')}
        className="card hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01] active:scale-[0.99]"
      >
        <h2 className="text-lg font-semibold text-gray-800 mb-4">System Status</h2>
        <div className="flex items-center space-x-4">
          <div
            className={`w-3 h-3 rounded-full ${stats?.lastSync?.status === 'success' ? 'bg-green-500' : 'bg-yellow-500'
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
    </div >
  );
};
