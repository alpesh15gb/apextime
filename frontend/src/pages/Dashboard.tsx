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
    <div className="space-y-10 animate-in fade-in duration-700">
      {/* Welcome Banner */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-10 md:p-14 text-white shadow-2xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] -mr-48 -mt-48"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -ml-32 -mb-32"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-8 text-center md:text-left">
          <div className="space-y-4 max-w-2xl">
            <div className="inline-flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10 text-xs font-black tracking-widest text-indigo-300">
              <Sparkles className="w-3 h-3" /> ENTERPRISE CLOUD SYNC ACTIVE
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tighter leading-[0.9]">
              Welcome back to <span className="text-indigo-400">APEXTIME</span>
            </h1>
            <p className="text-slate-400 font-medium text-lg leading-relaxed">
              Your real-time headquarters for employee intelligence, payroll, and
              statutory compliance. Everything is running smoothly.
            </p>
            <div className="flex flex-wrap gap-4 pt-4 justify-center md:justify-start">
              <button onClick={() => navigate('/payroll')} className="btn-primary-premium scale-110">
                Manage Payroll <ArrowUpRight className="w-5 h-5" />
              </button>
              <button onClick={fetchStats} className="btn-secondary-premium bg-white/5 border-white/10 text-white hover:bg-white/10 px-8">
                Refresh Stats
              </button>
            </div>
          </div>
          <div className="flex gap-4">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] text-center w-40 hover:bg-white/10 transition-all">
              <p className="text-3xl font-black text-indigo-400">{stats?.counts.totalBranches || 0}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Branches</p>
            </div>
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 p-8 rounded-[2rem] text-center w-40 hover:bg-white/10 transition-all">
              <p className="text-3xl font-black text-emerald-400">{stats?.counts.devicesCount || 0}</p>
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-2">Active Bio</p>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {statCards.map((card, index) => (
          <div
            key={index}
            onClick={() => navigate(card.to)}
            className="glass-card p-10 group hover:scale-[1.03] active:scale-[0.98] transition-all duration-300 cursor-pointer relative overflow-hidden"
          >
            <div className={`absolute top-0 right-0 w-32 h-32 bg-gradient-to-br ${card.color} opacity-0 group-hover:opacity-5 rounded-bl-full transition-opacity duration-500`}></div>
            <div className="flex justify-between items-start mb-6">
              <div className={`p-4 rounded-2xl bg-gradient-to-br ${card.color} shadow-lg shadow-indigo-500/20`}>
                <card.icon className="w-8 h-8 text-white" />
              </div>
              <ArrowUpRight className="w-6 h-6 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-all" />
            </div>
            <p className="text-slate-500 text-sm font-black uppercase tracking-[0.2em] mb-1">{card.title}</p>
            <h3 className="text-5xl font-black text-slate-800 tracking-tighter">{card.value}</h3>
            <p className="text-slate-400 text-xs mt-3 font-bold flex items-center gap-1 italic">
              <Zap className="w-3 h-3 text-amber-500 animate-pulse" /> {card.subtitle}
            </p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Analytics */}
        <div className="lg:col-span-2 space-y-8">
          {/* Today's Live Feed Section */}
          <div className="glass-card p-10">
            <div className="flex items-center justify-between mb-10">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 italic">
                  <Activity className="w-7 h-7 text-rose-500" />
                  Operational <span className="text-indigo-600">Heartbeat</span>
                </h2>
                <p className="text-slate-400 text-sm font-medium mt-1">Live visibility of current workforce activity</p>
              </div>
              <button className="text-indigo-600 font-black text-xs uppercase tracking-widest hover:underline decoration-2 underline-offset-8">View Master Log</button>
            </div>

            {stats?.today.absentEmployees && stats.today.absentEmployees.length > 0 ? (
              <div className="space-y-4">
                <div className="bg-rose-50/50 border border-rose-100 p-4 rounded-2xl flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-rose-500" />
                    <p className="text-rose-700 font-bold text-sm">{stats.today.absent} employees missing from bio-logs today</p>
                  </div>
                  <span className="bg-rose-500 text-white text-[10px] font-black px-3 py-1 rounded-full uppercase">Action Required</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stats.today.absentEmployees.slice(0, 4).map((emp) => (
                    <div key={emp.id} className="p-4 bg-white border border-slate-100 rounded-2xl flex items-center justify-between hover:shadow-md transition-all group">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-300 group-hover:text-rose-500 transition-colors">
                          {emp.firstName[0]}{emp.lastName[0]}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 text-sm italic">{emp.firstName} {emp.lastName}</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">ID: {emp.employeeCode}</p>
                        </div>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-emerald-50/30 rounded-[2rem] border border-dashed border-emerald-200">
                <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
                <p className="text-emerald-700 font-black italic">Perfect Attendance Flow</p>
                <p className="text-[10px] text-emerald-500 uppercase font-bold tracking-widest mt-1">All registrations accounted for</p>
              </div>
            )}
          </div>
        </div>

        {/* Side Info Cards */}
        <div className="space-y-8">
          {/* System Diagnostics */}
          <div onClick={() => navigate('/sync-diagnostics')} className="glass-card p-10 bg-indigo-600 text-white border-0 shadow-indigo-500/20 hover:scale-[1.02] active:scale-98 cursor-pointer transition-all">
            <ShieldCheck className="w-10 h-10 mb-6 text-indigo-200" />
            <h3 className="text-2xl font-black italic mb-2 tracking-tight">Sync Integrity</h3>
            <p className="text-indigo-200 text-sm font-medium leading-relaxed mb-10">
              {stats?.lastSync?.status === 'success'
                ? 'Your biometric infrastructure is synchronized and reporting healthy data flows.'
                : 'Bio-bridge connection requires re-validation. High packet loss detected.'}
            </p>

            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-center justify-between border border-white/10">
              <div>
                <p className="text-[10px] font-black text-indigo-300 tracking-widest mb-1 uppercase">Last Communication</p>
                <p className="text-sm font-bold truncate">
                  {stats?.lastSync ? new Date(stats.lastSync.lastSyncTime).toLocaleTimeString() : '---'}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-400" />
              </div>
            </div>
          </div>

          {/* Quick Shortcuts */}
          <div className="glass-card p-10">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Quick Actions
            </h3>
            <div className="space-y-4">
              <button onClick={() => navigate('/payroll')} className="w-full p-4 bg-slate-50 hover:bg-white border border-slate-100 rounded-2xl text-left font-bold text-slate-600 transition-all flex justify-between items-center group">
                Run Payroll Run
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </button>
              <button onClick={() => navigate('/monthly-report')} className="w-full p-4 bg-slate-50 hover:bg-white border border-slate-100 rounded-2xl text-left font-bold text-slate-600 transition-all flex justify-between items-center group">
                Audit Attendance
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
