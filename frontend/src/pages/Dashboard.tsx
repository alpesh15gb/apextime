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
      // ... existing error handling ...
      setError('Failed to load dashboard data');
      setEmployees([]);
      setStats({} as any);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    // ... existing loading component ...
    return (
      <div className="flex flex-col items-center justify-center h-96 space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-red-600 border-opacity-20 border-r-2 border-r-red-600"></div>
        <p className="text-gray-400 font-bold tracking-widest text-[10px] uppercase">Synchronizing Hub...</p>
      </div>
    );
  }
  // ... existing statCards ...
  // ... existing JSX ...
  {
    displayedEmployees.map((emp, i) => (
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
    ))
  }

  {
    displayedEmployees.length === 0 && (
      [1, 2, 3, 4, 5].map(i => (
        <tr key={i} className="table-row group animate-pulse">
          <td className="px-10 py-8 h-20 bg-gray-50/10"></td>
          <td className="px-6 py-8 h-20 bg-gray-50/10"></td>
          <td className="px-6 py-8 h-20 bg-gray-50/10"></td>
          <td className="px-6 py-8 h-20 bg-gray-50/10"></td>
          <td className="px-10 py-8 h-20 bg-gray-50/10"></td>
        </tr>
      ))
    )
  }
            </tbody >
          </table >
        </div >
  <div className="p-10 bg-gray-50/30 flex justify-center">
    <button onClick={() => navigate('/employees')} className="text-[10px] font-black text-red-600 uppercase tracking-[0.3em] hover:underline flex items-center gap-2">
      Explore Full Registry <ArrowUpRight className="w-4 h-4" />
    </button>
  </div>
      </div >
    </div >
  );
};
