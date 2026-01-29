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
  Activity,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Search,
  Filter,
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600 border-opacity-20 border-r-2 border-r-red-600"></div>
        <p className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Loading Dashboard...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Employees',
      value: stats?.counts.totalEmployees || 0,
      icon: Users,
      trend: '13 new employees added',
      trendUp: true,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Active Employees',
      value: stats?.counts.activeEmployees || 0,
      icon: Briefcase,
      trend: '9 new applications received',
      trendUp: true,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Present Today',
      value: stats?.today.present || 0,
      icon: CheckCircle,
      trend: 'Team growing stronger',
      trendUp: true,
      color: 'bg-indigo-50 text-indigo-600',
    },
    {
      title: 'Late Clock-ins',
      value: stats?.today.lateArrivals || 0,
      icon: Clock,
      trend: '10 recent issues recorded',
      trendUp: false,
      color: 'bg-orange-50 text-orange-600',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="app-card p-8 flex flex-col justify-between group hover:border-red-100 transition-all cursor-default">
            <div className="flex justify-between items-start">
              <div className={`p-2.5 rounded-xl ${card.color}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <button className="text-gray-300 hover:text-gray-500">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-8">
              <h3 className="text-4xl font-extrabold text-gray-900 tracking-tight">{card.value}</h3>
              <p className="text-sm font-bold text-gray-400 mt-1">{card.title}</p>
            </div>
            <div className="mt-6 flex items-center space-x-1.5">
              {card.trendUp ? (
                <ArrowUp className="w-3 h-3 text-emerald-500" />
              ) : (
                <ArrowDown className="w-3 h-3 text-red-500" />
              )}
              <span className={`text-[10px] font-bold ${card.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                {card.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Grid: Charts & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Attendance Report Mock-up Chart */}
        <div className="app-card p-8 lg:col-span-1">
          <div className="flex justify-between items-center mb-10">
            <h3 className="font-extrabold text-gray-800 tracking-tight">Attendance Report</h3>
            <MoreVertical className="w-4 h-4 text-gray-300" />
          </div>
          <div className="flex items-end justify-between h-48 space-x-4">
            {[40, 60, 45, 80, 55, 75, 50].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center space-y-3">
                <div className="w-full bg-gray-50 rounded-full h-40 relative group overflow-hidden">
                  <div
                    className={`absolute bottom-0 w-full transition-all duration-500 rounded-full group-hover:brightness-110 ${i === 3 ? 'bg-emerald-500' : 'bg-gray-200'}`}
                    style={{ height: `${h}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-bold text-gray-400">
                  {['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Payroll Summary / Pay Runs */}
        <div className="app-card p-8 lg:col-span-1">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-extrabold text-gray-800 tracking-tight">Pay Runs</h3>
            <MoreVertical className="w-4 h-4 text-gray-300" />
          </div>
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-gray-50/50 p-4 rounded-2xl border border-gray-50">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Payment Period</p>
                <p className="text-sm font-bold text-gray-700 mt-1">1 Oct - 30 Oct</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pay Day</p>
                <p className="text-sm font-bold text-gray-700 mt-1">30 Oct, 2025</p>
              </div>
            </div>

            <div className="flex items-center justify-center py-4">
              <div className="relative w-32 h-32 rounded-full border-[12px] border-emerald-500 flex items-center justify-center">
                <div className="absolute inset-0 rounded-full border-[12px] border-gray-100 border-t-transparent border-l-transparent"></div>
                <div className="text-center">
                  <TrendingUp className="w-6 h-6 text-emerald-500 mx-auto" />
                </div>
              </div>
              <div className="ml-8 space-y-3">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <p className="text-xs font-bold text-gray-600">Total Pay: <span className="text-gray-900">$7.8M</span></p>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 rounded bg-gray-200"></div>
                  <p className="text-xs font-bold text-gray-600">Deduction: <span className="text-gray-900">$68K</span></p>
                </div>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Total Employee</p>
                <p className="text-lg font-extrabold text-gray-800">1,250</p>
              </div>
              <div className="badge badge-success text-[10px] uppercase tracking-widest py-1.5 px-4 font-black">
                Paid
              </div>
            </div>
          </div>
        </div>

        {/* Length of Service Mock Chart */}
        <div className="app-card p-8 lg:col-span-1">
          <div className="flex justify-between items-center mb-8">
            <h3 className="font-extrabold text-gray-800 tracking-tight">Length of Service</h3>
            <MoreVertical className="w-4 h-4 text-gray-300" />
          </div>
          <div className="flex items-end justify-between h-48 space-x-3">
            {[15, 40, 48, 44, 28].map((h, i) => (
              <div key={i} className="flex-1 flex flex-col items-center space-y-3">
                <div
                  className={`w-full rounded-xl transition-all duration-500 hover:brightness-110 ${i === 0 ? 'bg-red-500' :
                      i === 1 ? 'bg-lime-400' :
                        i === 2 ? 'bg-emerald-500' :
                          i === 3 ? 'bg-lime-600' : 'bg-orange-400'
                    }`}
                  style={{ height: `${h}%` }}
                ></div>
                <span className="text-[10px] font-bold text-gray-400">
                  {['<1yr', '1-3', '4-5', '5-8', '10y+'][i]}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Section: Employee Table */}
      <div className="app-card overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h3 className="font-extrabold text-gray-800 tracking-tight">Employee Details & Payroll</h3>
          <div className="flex items-center space-x-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Search employee..." className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-xs focus:ring-2 focus:ring-red-50" />
            </div>
            <button className="p-2 bg-gray-50 text-gray-500 rounded-xl hover:bg-gray-100">
              <Filter className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50/30">
                <th className="table-header w-16">No</th>
                <th className="table-header">Employee Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Position</th>
                <th className="table-header">Status</th>
                <th className="table-header text-right">Transfer Schedule</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(stats?.today.absentEmployees || []).slice(0, 5).map((emp, i) => (
                <tr key={emp.id} className="table-row group">
                  <td className="px-6 py-4 text-xs font-bold text-gray-400">{String(i + 1).padStart(2, '0')}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 text-xs">
                        {emp.firstName[0]}{emp.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{emp.firstName} {emp.lastName}</p>
                        <p className="text-[10px] text-gray-400 font-bold">{emp.employeeCode}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-medium text-gray-500 lowercase">{emp.firstName.toLowerCase()}@apextime.in</td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-600">Senior Associate</td>
                  <td className="px-6 py-4">
                    <div className={`badge ${i % 2 === 0 ? 'badge-success' : 'badge-warning'} text-[10px] font-black uppercase tracking-widest`}>
                      {i % 2 === 0 ? 'Active' : 'On Leave'}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-gray-900 text-right">30 Oct, 2025</td>
                </tr>
              ))}
              {/* Fallback if no data */}
              {(!stats?.today.absentEmployees || stats.today.absentEmployees.length === 0) && (
                [1, 2, 3, 4, 5].map(i => (
                  <tr key={i} className="table-row group">
                    <td className="px-6 py-4 text-xs font-bold text-gray-400">{String(i).padStart(2, '0')}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3 animate-pulse">
                        <div className="w-9 h-9 rounded-xl bg-gray-100"></div>
                        <div className="space-y-1">
                          <div className="h-3 w-24 bg-gray-100 rounded"></div>
                          <div className="h-2 w-12 bg-gray-50 rounded"></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs font-medium text-gray-400">user.email@company.com</td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-300">Department Lead</td>
                    <td className="px-6 py-4">
                      <div className="w-16 h-5 bg-gray-50 rounded-full"></div>
                    </td>
                    <td className="px-6 py-4 text-xs font-bold text-gray-200 text-right">Processing...</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
