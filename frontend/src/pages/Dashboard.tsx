import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Clock,
  Calendar,
  UserPlus,
  CheckSquare,
  FileText,
  ClipboardCheck,
  Building2,
  Database,
  GraduationCap,
  BookOpen,
  Book
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { DashboardStats } from '../types';
import { useAuth } from '../contexts/AuthContext';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const statsRes = await dashboardAPI.getStats();
      setStats(statsRes.data || {});
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  // --------------------------------------------------------
  // SUPER ADMIN VIEW
  // --------------------------------------------------------
  if (user?.role === 'superadmin') {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Super Admin Overview</h2>

        {/* Top Global Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Businesses</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats?.counts?.totalTenants || 0}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-50 rounded-lg text-green-600">
                <CheckSquare className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Active Tenants</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats?.counts?.activeTenants || 0}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-lg text-indigo-600">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total System Users</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats?.counts?.totalUsers || 0}</h3>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-50 rounded-lg text-purple-600">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm text-gray-500 font-medium">Total Employees</p>
                <h3 className="text-2xl font-bold text-gray-900">{stats?.counts?.totalEmployees || 0}</h3>
              </div>
            </div>
          </div>
        </div>

        {/* Global Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-br from-[#111827] to-gray-800 rounded-2xl p-8 text-white relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2">Manage Tenants</h3>
              <p className="text-gray-400 mb-6 max-w-sm">Create, suspend, or configure new business accounts and their subscriptions.</p>
              <button
                onClick={() => navigate('/tenants')}
                className="bg-blue-600 hover:bg-blue-700 px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Go to Tenants
              </button>
            </div>
            <Building2 className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-gray-700 opacity-20 group-hover:scale-110 transition-transform" />
          </div>

          <div className="bg-white rounded-2xl p-8 border border-gray-200 relative overflow-hidden group">
            <div className="relative z-10">
              <h3 className="text-xl font-bold mb-2 text-gray-900">System Settings</h3>
              <p className="text-gray-500 mb-6 max-w-sm">Configure global variables, database connections, and system-wide policies.</p>
              <button
                onClick={() => navigate('/settings')}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 px-6 py-2 rounded-lg font-medium transition-colors border border-gray-200"
              >
                Go to Settings
              </button>
            </div>
            <Database className="absolute right-[-20px] bottom-[-20px] w-48 h-48 text-gray-100 group-hover:scale-110 transition-transform" />
          </div>
        </div>

        {/* Recent Activity Table (Tenants) */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h3 className="font-bold text-gray-800">Recently Added Businesses</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                  <th className="px-6 py-4">Business Name</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Users Count</th>
                  <th className="px-6 py-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats?.recentTenants?.map((tenant: any) => (
                  <tr key={tenant.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{tenant.name}</td>
                    <td className="px-6 py-4 text-gray-500">{tenant.slug}</td>
                    <td className="px-6 py-4">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-medium">
                        {tenant._count?.users || 0} users
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">{new Date(tenant.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(!stats?.recentTenants || stats.recentTenants.length === 0) && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-gray-400">No data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    );
  }

  // --------------------------------------------------------
  // SCHOOL DASHBOARD VIEW
  // --------------------------------------------------------
  if (user?.tenantType === 'SCHOOL' || stats?.tenantType === 'SCHOOL') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold text-gray-800">School Dashboard</h2>
          <div className="flex items-center gap-2 bg-blue-50 text-blue-700 px-4 py-2 rounded-xl text-sm font-bold">
            <GraduationCap className="w-4 h-4" /> Academic Session 2024-25
          </div>
        </div>

        {/* School Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div onClick={() => navigate('/students')} className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="relative z-10">
              <h3 className="font-medium text-blue-100 mb-1">Total Students</h3>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{stats?.schoolStats?.totalStudents || 0}</span>
                <span className="text-sm bg-blue-500/50 px-2 py-0.5 rounded text-blue-100 mb-1">Session</span>
              </div>
              <p className="text-blue-200 text-sm mt-4">Active Enrollment</p>
            </div>
            <GraduationCap className="absolute right-0 bottom-0 opacity-10 w-32 h-32 transform translate-y-1/4 translate-x-1/4" />
          </div>

          <div onClick={() => navigate('/student-attendance')} className="bg-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="relative z-10">
              <h3 className="font-medium text-emerald-100 mb-1">Students Present</h3>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{stats?.schoolStats?.attendance?.present || 0}</span>
                <span className="text-sm bg-emerald-500/50 px-2 py-0.5 rounded text-emerald-100 mb-1">Today</span>
              </div>
              <p className="text-emerald-200 text-sm mt-4">Absent: {stats?.schoolStats?.attendance?.absent || 0}</p>
            </div>
            <ClipboardCheck className="absolute right-0 bottom-0 opacity-10 w-32 h-32 transform translate-y-1/4 translate-x-1/4" />
          </div>

          <div onClick={() => navigate('/attendance')} className="bg-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="relative z-10">
              <h3 className="font-medium text-indigo-100 mb-1">Teachers Present</h3>
              <div className="flex items-end gap-2">
                <span className="text-4xl font-bold">{stats?.today?.present || 0}</span>
                <span className="text-sm bg-indigo-500/50 px-2 py-0.5 rounded text-indigo-100 mb-1">Total {stats?.counts?.totalEmployees || 0}</span>
              </div>
              <p className="text-indigo-200 text-sm mt-4">Staff Attendance</p>
            </div>
            <Users className="absolute right-0 bottom-0 opacity-10 w-32 h-32 transform translate-y-1/4 translate-x-1/4" />
          </div>

          <div onClick={() => navigate('/student-attendance')} className="bg-[#111827] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform">
            <div className="relative z-10">
              <h3 className="font-medium text-gray-400 mb-1">Attendance Rate</h3>
              <span className="text-4xl font-bold">
                {stats?.schoolStats?.totalStudents > 0
                  ? Math.round((stats?.schoolStats?.attendance?.present / stats?.schoolStats?.totalStudents) * 100)
                  : 0}%
              </span>
              <p className="text-gray-400 text-sm mt-4">Average today</p>
            </div>
            <CheckSquare className="absolute right-0 bottom-0 opacity-10 w-32 h-32 transform translate-y-1/4 translate-x-1/4" />
          </div>
        </div>

        {/* Quick Actions Table */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Quick Academic Actions</h3>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => navigate('/admissions')} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <UserPlus className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">New Admission</span>
              </button>
              <button onClick={() => navigate('/timetable')} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Calendar className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">Timetable</span>
              </button>
              <button onClick={() => navigate('/student-attendance')} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ClipboardCheck className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">Daily Attendance</span>
              </button>
              <button onClick={() => navigate('/fees')} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group">
                <div className="p-2 bg-amber-100 text-amber-600 rounded-lg group-hover:bg-amber-600 group-hover:text-white transition-colors">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="font-medium text-gray-700">Fee Collection</span>
              </button>
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4">Upcoming Schedule</h3>
            <div className="space-y-4">
              {[
                { time: '09:00 AM', event: 'Morning Assembly', type: 'General' },
                { time: '10:30 AM', event: 'Staff Meeting', type: 'Administrative' },
                { time: '12:00 PM', event: 'Lunch Break', type: 'General' },
              ].map((item, i) => (
                <div key={i} className="flex items-center justify-between p-3 border-l-4 border-blue-500 bg-blue-50/30 rounded-r-lg">
                  <div>
                    <p className="text-sm font-bold text-gray-900">{item.event}</p>
                    <p className="text-xs text-gray-500">{item.type}</p>
                  </div>
                  <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">{item.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------
  // CORPORATE ADMIN/MANAGER VIEW
  // --------------------------------------------------------
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Employees */}
        <div
          onClick={() => navigate('/employees')}
          className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
        >
          <div className="relative z-10">
            <h3 className="font-medium text-blue-100 mb-1">Total Employees</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{stats?.counts?.totalEmployees || 0}</span>
              <span className="text-sm bg-blue-500/50 px-2 py-0.5 rounded text-blue-100 mb-1">Active {stats?.counts?.activeEmployees || 0}</span>
            </div>
            <p className="text-blue-200 text-sm mt-4">Inactive {stats?.counts?.totalEmployees ? stats.counts.totalEmployees - (stats.counts.activeEmployees || 0) : 0}</p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
            <Users className="w-40 h-40" />
          </div>
        </div>

        {/* Today Attendance */}
        <div
          onClick={() => navigate('/attendance')}
          className="bg-[#111827] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
        >
          <div className="relative z-10">
            <h3 className="font-medium text-gray-400 mb-1">Attendance (Today)</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{stats?.today?.present || 0}</span>
              <span className="text-sm bg-blue-600/30 px-2 py-0.5 rounded text-blue-400 mb-1">In Office: {stats?.today?.currentlyIn || 0}</span>
            </div>
            <p className="text-gray-400 text-sm mt-4">
              Absent <span className="text-white font-bold ml-1">{stats?.today?.absent || 0}</span>
            </p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-10 transform translate-y-1/4 translate-x-1/4">
            <Clock className="w-40 h-40" />
          </div>
        </div>

        {/* Pending Leaves */}
        <div
          onClick={() => navigate('/leaves')}
          className="bg-amber-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform active:scale-95"
        >
          <div className="relative z-10">
            <h3 className="font-medium text-amber-100 mb-1">Pending Leaves</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{stats?.counts?.pendingLeaves || 0}</span>
              <span className="text-sm bg-amber-500/50 px-2 py-0.5 rounded text-white mb-1">Requests</span>
            </div>
            <p className="text-amber-100 text-sm mt-4">Requires Approval</p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-20 transform translate-y-1/4 translate-x-1/4">
            <FileText className="w-40 h-40" />
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 gap-6">
        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button onClick={() => navigate('/employees/new')} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <UserPlus className="w-4 h-4" /> Add Employee
            </button>
            <button onClick={() => navigate('/leaves')} className="bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <CheckSquare className="w-4 h-4" /> Approve Leave
            </button>
            <button onClick={() => navigate('/reports')} className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <FileText className="w-4 h-4" /> Generate Report
            </button>
            <button onClick={() => navigate('/attendance')} className="bg-[#111827] hover:bg-gray-800 text-white p-3 rounded-xl flex items-center justify-center gap-2 text-sm font-medium transition-colors">
              <ClipboardCheck className="w-4 h-4" /> Mark Attendance
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
