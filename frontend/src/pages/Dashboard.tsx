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
  MoreVertical,
  Activity,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import { DashboardStats } from '../types';
import { Line, Doughnut } from 'react-chartjs-2';
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
  const [stats, setStats] = useState<DashboardStats | null>(null);
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

  // Chart Data
  const lineChartData = {
    labels: ['0 Mon', '7 Tue', '2 Wed', '3 Thu', '4 Fri', '5 Sat', '4 Sun'],
    datasets: [
      {
        label: 'Attendance',
        data: [12, 19, 15, 25, 22, 30, 28], // Mock data or stats.history
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: false },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: '#f3f4f6' },
        ticks: { font: { size: 10 } }
      },
      x: {
        grid: { display: false },
        ticks: { font: { size: 10 } }
      }
    }
  };

  const donutData = {
    labels: ['Completed', 'Pending', 'Issues'],
    datasets: [
      {
        data: [300, 50, 100],
        backgroundColor: [
          'rgb(59, 130, 246)',
          'rgb(243, 244, 246)',
          'rgb(16, 185, 129)',
        ],
        borderWidth: 0,
      },
    ],
  };

  const donutOptions = {
    cutout: '70%',
    plugins: {
      legend: { display: false }
    }
  };

  const CircularProgress = ({ value, label, subLabel, color }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center h-48 border border-gray-100">
      <div className="relative w-24 h-24 flex items-center justify-center mb-3">
        <svg className="w-full h-full transform -rotate-90">
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            className="text-gray-100"
          />
          <circle
            cx="48"
            cy="48"
            r="40"
            stroke="currentColor"
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={251.2}
            strokeDashoffset={251.2 - (251.2 * value) / 100}
            className={color}
          />
        </svg>
        <span className="absolute text-2xl font-bold text-gray-800">{value}%</span>
      </div>
      <h4 className="font-bold text-gray-800">{label}</h4>
      <p className="text-xs text-gray-400 mt-1">{subLabel}</p>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Total Employees */}
        <div className="bg-blue-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
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
        <div className="bg-[#111827] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-medium text-gray-400 mb-1">Today Attendance</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{stats?.today?.present || 0}</span>
              <span className="text-sm bg-gray-700 px-2 py-0.5 rounded text-gray-300 mb-1">-</span>
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
        <div className="bg-amber-400 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10">
            <h3 className="font-medium text-amber-100 mb-1">Pending Leaves</h3>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold">{stats?.counts?.pendingLeaves || 12}</span>
              <span className="text-sm bg-amber-500/50 px-2 py-0.5 rounded text-white mb-1">Requests</span>
            </div>
            <p className="text-amber-100 text-sm mt-4">Requires Approval</p>
          </div>
          <div className="absolute right-0 bottom-0 opacity-20 transform translate-y-1/4 translate-x-1/4">
            <FileText className="w-40 h-40" />
          </div>
        </div>
      </div>

      {/* Circular Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <CircularProgress value={28} label="Late Arrivals" subLabel="Yesterday" color="text-blue-500" />
        <CircularProgress value={49} label="Processed" subLabel="Payroll" color="text-emerald-500" />
        <CircularProgress value={8} label="Pending Review" subLabel="Tasks" color="text-red-500" />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Line Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-bold text-gray-800">Attendance Overview</h3>
              <p className="text-xs text-gray-400">Weekly Headcount</p>
            </div>
            <select className="bg-gray-50 border-none text-xs rounded-lg px-2 py-1 text-gray-500 outline-none cursor-pointer">
              <option>This Week</option>
              <option>Last Week</option>
            </select>
          </div>
          <div className="h-64 w-full">
            <Line data={lineChartData} options={lineChartOptions} />
          </div>
        </div>

        {/* Donut Chart */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-6">
            <h3 className="font-bold text-gray-800">Daily Tasks</h3>
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </div>
          <div className="h-48 flex justify-center relative">
            <Doughnut data={donutData} options={donutOptions} />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Center icon or text if needed */}
            </div>
          </div>

          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-500">Complete</span>
              </div>
              <span className="font-bold text-gray-700">65%</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-gray-500">Pending</span>
              </div>
              <span className="font-bold text-gray-700">25%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="font-bold text-gray-800 mb-6">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-4">
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

        {/* Activity Feed */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <h3 className="font-bold text-gray-800 mb-6">Activity Feed</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Rahul applied for leave.</p>
                <p className="text-xs text-gray-400 mt-1">Today at 10:30 AM</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                <CheckSquare className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Salary processed for January.</p>
                <p className="text-xs text-gray-400 mt-1">Yesterday</p>
              </div>
            </div>
            <div className="flex items-start gap-4 p-3 hover:bg-gray-50 rounded-xl transition-colors">
              <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shrink-0">
                <UserPlus className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">New employee onboarded.</p>
                <p className="text-xs text-gray-400 mt-1">2 days ago</p>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
