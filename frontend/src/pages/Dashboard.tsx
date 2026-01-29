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
  DollarSign
} from 'lucide-react';
import { dashboardAPI, employeesAPI } from '../services/api';
import { DashboardStats } from '../types';

export const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statsRes, employeesRes] = await Promise.all([
        dashboardAPI.getStats(),
        employeesAPI.getAll()
      ]);

      setStats(statsRes.data || {});

      let empData = employeesRes.data;
      if (empData && typeof empData === 'object' && 'employees' in empData) {
        empData = empData.employees;
      }

      if (Array.isArray(empData)) {
        // Filter out invalid employee objects
        setEmployees(empData.filter((e: any) => e && typeof e === 'object' && (typeof e.id === 'string' || typeof e.id === 'number')));
      } else {
        setEmployees([]);
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
      setError('Failed to load dashboard data');
      setEmployees([]);
      setStats({} as any);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600 border-opacity-20 border-r-2 border-r-red-600"></div>
        <p className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Synchronizing Hub...</p>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Personnel',
      value: stats?.counts?.totalEmployees || 0,
      icon: Users,
      trend: `${stats?.counts?.activeEmployees || 0} Active Nodes`,
      trendUp: true,
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Presence Matrix',
      value: stats?.today?.present || 0,
      icon: CheckCircle,
      trend: stats?.today?.present ? 'Stable Signal' : 'No Data yet',
      trendUp: true,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Precision Lag',
      value: stats?.today?.lateArrivals || 0,
      icon: Clock,
      trend: 'Late Clock-ins',
      trendUp: false,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Signal Gaps (Absent)',
      value: stats?.today?.absent || 0,
      icon: XCircle,
      trend: 'Unaccounted for',
      trendUp: false,
      color: 'bg-red-50 text-red-600',
    },
  ];

  const displayedEmployees = Array.isArray(employees) ? employees.slice(0, 10) : [];

  return (
    <div className="space-y-8">
      {/* Top Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card, idx) => (
          <div key={idx} className="app-card p-8 flex flex-col justify-between group hover:border-red-100 transition-all cursor-default relative overflow-hidden">
            <div className="absolute top-0 right-0 w-20 h-20 bg-gray-50/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
            <div className="flex justify-between items-start relative z-10">
              <div className={`p-3 rounded-2xl ${card.color} shadow-sm`}>
                <card.icon className="w-5 h-5" />
              </div>
              <button className="text-gray-300 hover:text-gray-500">
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-8 relative z-10">
              <h3 className="text-4xl font-black text-gray-900 tracking-tighter">{card.value}</h3>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">{card.title}</p>
            </div>
            <div className="mt-6 flex items-center space-x-1.5 relative z-10">
              {card.trendUp ? (
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              ) : (
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              )}
              <span className={`text-[10px] font-black tracking-widest uppercase ${card.trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
                {card.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Middle Grid: Charts & Summary */}
      {/* Attendance Report Chart */}
      <div className="app-card p-10 lg:col-span-1 border-none shadow-xl shadow-gray-100">
        <div className="flex justify-between items-center mb-10">
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-600" /> Weekly Frequency
          </h3>
          <MoreVertical className="w-4 h-4 text-gray-300" />
        </div>
        <div className="flex items-end justify-center h-48">
          <p className="text-xs font-bold text-gray-400">No chart data available</p>
        </div>
      </div>

      {/* Payroll Summary / Pay Runs */}
      <div className="app-card p-10 lg:col-span-1 bg-gray-900 text-white border-none shadow-2xl">
        <div className="flex justify-between items-center mb-10">
          <h3 className="font-black text-red-500 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Payroll Status
          </h3>
          <div className="badge border border-white/10 text-white/40 text-[8px] font-black uppercase">Inactive</div>
        </div>
        <div className="space-y-10">
          <div className="p-6 bg-white/5 rounded-3xl border border-white/10">
            <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-1 font-mono">Current Liabilities</p>
            <h4 className="text-3xl font-black tracking-tighter italic">---</h4>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Tax Nodes</p>
              <p className="text-xl font-black text-emerald-500">--/--</p>
            </div>
            <div>
              <p className="text-[9px] font-black text-gray-500 uppercase mb-1">Cycle Node</p>
              <p className="text-xl font-black text-red-500">---</p>
            </div>
          </div>

          <button disabled className="w-full py-4 bg-gray-800 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all cursor-not-allowed">
            Batch Processing Unavailable
          </button>
        </div>
      </div>

      {/* Quick Insights List */}
      <div className="app-card p-10 lg:col-span-1">
        <div className="flex justify-between items-center mb-10">
          <h3 className="font-black text-gray-900 uppercase tracking-widest text-[10px] flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-orange-500" /> Matrix Signals
          </h3>
        </div>
        <div className="space-y-6">
          {[
            { label: 'Unmapped IDs', value: (stats as any)?.today?.unmappedLogs || 0, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Shift Overlaps', value: '04', color: 'text-orange-600', bg: 'bg-orange-50' },
            { label: 'Statutory Marks', value: '98%', color: 'text-emerald-600', bg: 'bg-emerald-50' }
          ].map((sig, i) => (
            <div key={i} className="flex justify-between items-center p-4 hover:bg-gray-50 rounded-2xl transition-all group">
              <div className="flex items-center space-x-4">
                <div className={`w-2 h-10 rounded-full ${sig.bg}`}></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{sig.label}</p>
              </div>
              <p className={`text-xl font-black ${sig.color}`}>{sig.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>

      {/* Bottom Section: Employee Table */ }
  <div className="app-card overflow-hidden">
    <div className="p-10 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
      <div>
        <h3 className="font-black text-gray-900 uppercase tracking-widest text-xs">Employee Registry & Financial Status</h3>
        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase italic tracking-tighter">Real-time mapping of localized personnel</p>
      </div>
      <div className="flex items-center space-x-3 w-full sm:w-auto">
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input type="text" placeholder="Scan identification matrix..." className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl text-[10px] font-black uppercase tracking-widest focus:ring-4 focus:ring-red-50 transition-all" />
        </div>
        <button className="p-4 bg-gray-50 text-gray-400 rounded-2xl hover:bg-gray-100 transition-all">
          <Filter className="w-5 h-5" />
        </button>
      </div>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="bg-gray-50/20">
            <th className="table-header w-20 px-10">Hash</th>
            <th className="table-header">Identity Matrix</th>
            <th className="table-header">Routing Path</th>
            <th className="table-header">Status Signal</th>
            <th className="table-header text-right px-10">Verification Date</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {displayedEmployees.map((emp, i) => (
            <tr key={String(emp.id)} className="table-row group">
              <td className="px-10 py-6 text-[10px] font-black text-gray-300 uppercase tracking-widest font-mono">#{String(i + 1).padStart(3, '0')}</td>
              <td className="px-6 py-6 font-bold">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center font-black text-gray-400 text-xs shadow-inner">
                    {String(emp.firstName || '').charAt(0)}{String(emp.lastName || '').charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-black text-gray-800 tracking-tight">{String(emp.firstName || '')} {String(emp.lastName || '')}</p>
                    <p className="text-[9px] text-red-600 font-black uppercase tracking-[0.2em] mt-0.5">{String(emp.employeeCode || '')}</p>
                  </div>
                </div>
              </td>
              <td className="px-6 py-6">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Personnel Hub</p>
                <p className="text-xs font-bold text-gray-700">{String(emp.department?.name || 'Departmental Node')}</p>
              </td>
              <td className="px-6 py-6">
                <div className={`badge ${emp.isActive ? 'badge-success' : 'badge-warning'} text-[8px] font-black uppercase tracking-[0.2em] px-4 py-1.5`}>
                  {emp.isActive ? 'Active' : 'Dormant'}
                </div>
              </td>
              <td className="px-10 py-6 text-xs font-black text-gray-900 text-right opacity-40 group-hover:opacity-100 transition-opacity">
                30 OCT, 2025
              </td>
            </tr>
          ))}

          {displayedEmployees.length === 0 && (
            [1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="table-row group animate-pulse">
                <td className="px-10 py-8 h-20 bg-gray-50/10"></td>
                <td className="px-6 py-8 h-20 bg-gray-50/10"></td>
                <td className="px-6 py-8 h-20 bg-gray-50/10"></td>
                <td className="px-6 py-8 h-20 bg-gray-50/10"></td>
                <td className="px-10 py-8 h-20 bg-gray-50/10"></td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
    <div className="p-10 bg-gray-50/30 flex justify-center">
      <button onClick={() => navigate('/employees')} className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] hover:underline flex items-center gap-2">
        Explore Full Registry <ArrowUpRight className="w-4 h-4" />
      </button>
    </div>
  </div>
    </div >
  );
};
