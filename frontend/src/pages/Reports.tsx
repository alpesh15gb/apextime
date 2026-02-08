import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Filter,
  FileSpreadsheet,
  File as FilePdf,
  Clock,
  Users,
  TrendingUp,
  BarChart3,
  Download,
  ChevronDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Timer,
  Building2,
  MapPin,
  Search,
  RefreshCw,
  ArrowUpRight,
  ArrowDownRight,
  Printer,
  RotateCcw
} from 'lucide-react';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import { MonthlyPrintView } from '../components/MonthlyPrintView';
import { reportsAPI, departmentsAPI, branchesAPI, locationsAPI, attendanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

type TabType = 'daily' | 'weekly' | 'monthly';

export const Reports = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>('daily');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [recalculating, setRecalculating] = useState(false);
  const [reportData, setReportData] = useState<any>(null);
  const [showPrint, setShowPrint] = useState(false);

  // Filters
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [filters, setFilters] = useState({
    departmentId: '',
    branchId: '',
    locationId: '',
  });

  const getISTToday = () => {
    const IST_OFFSET = 5.5 * 60 * 60 * 1000;
    return new Date(Date.now() + IST_OFFSET).toISOString().split('T')[0];
  };

  const [selectedDate, setSelectedDate] = useState(getISTToday());
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date(getISTToday());
    d.setDate(d.getDate() - d.getDay() + 1);
    return d.toISOString().split('T')[0];
  });
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(() => new Date().getFullYear());

  useEffect(() => {
    const load = async () => {
      try {
        const [d, b, l] = await Promise.all([
          departmentsAPI.getAll(),
          branchesAPI.getAll(),
          locationsAPI.getAll()
        ]);
        setDepartments(d.data || []);
        setBranches(b.data || []);
        setLocations(l.data || []);
      } catch (e) { console.error(e); }
    };
    load();
  }, []);

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const baseParams: any = {};
      if (filters.departmentId) baseParams.departmentId = filters.departmentId;
      if (filters.branchId) baseParams.branchId = filters.branchId;
      if (filters.locationId) baseParams.locationId = filters.locationId;

      let res;
      if (activeTab === 'daily') {
        res = await reportsAPI.getDaily({ ...baseParams, date: selectedDate });
      } else if (activeTab === 'weekly') {
        res = await reportsAPI.getWeekly({ ...baseParams, startDate: weekStart });
      } else {
        res = await reportsAPI.getMonthly({ ...baseParams, month: selectedMonth, year: selectedYear });
      }
      setReportData(res.data);
    } catch (e) {
      console.error('Report fetch error:', e);
      setReportData(null);
    } finally {
      setLoading(false);
    }
  }, [activeTab, selectedDate, weekStart, selectedMonth, selectedYear, filters]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleDownload = async (format: 'excel' | 'pdf') => {
    try {
      setGenerating(true);
      const params: Record<string, string> = {};
      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.locationId) params.locationId = filters.locationId;

      let reportType = 'daily_detailed';
      if (activeTab === 'daily') {
        params.date = selectedDate;
        params.startDate = selectedDate;
        params.endDate = selectedDate;
      } else if (activeTab === 'weekly') {
        params.startDate = weekStart;
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        params.endDate = end.toISOString().split('T')[0];
        reportType = 'monthly_detailed';
      } else {
        params.month = selectedMonth.toString();
        params.year = selectedYear.toString();
        reportType = 'monthly_detailed';
      }

      const response = format === 'excel'
        ? await reportsAPI.downloadExcel(reportType, params)
        : await reportsAPI.downloadPDF(reportType, params);

      const blob = new Blob([response.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Report_${activeTab}_${selectedDate}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      alert('Download failed. Please check filters.');
    } finally {
      setGenerating(false);
    }
  };

  const handleRecalculate = async () => {
    if (!confirm('This will recalculate all attendance data using First In / Last Out logic. Continue?')) return;
    try {
      setRecalculating(true);
      const res = await attendanceAPI.recalculate({});
      alert(`Recalculation complete! ${res.data.updated} records updated out of ${res.data.total}`);
      fetchReport();
    } catch (error) {
      console.error('Recalculate failed:', error);
      alert('Recalculation failed');
    } finally {
      setRecalculating(false);
    }
  };

  // Get summary from report data
  const getSummary = () => {
    if (!reportData) return { present: 0, absent: 0, late: 0, total: 0, avgHours: 0, totalHours: 0, halfDay: 0, incomplete: 0 };
    if (reportData.summary) {
      return {
        present: reportData.summary.totalPresent ?? reportData.summary.present ?? 0,
        absent: reportData.summary.totalAbsent ?? reportData.summary.absent ?? 0,
        late: reportData.summary.totalLate ?? reportData.summary.late ?? 0,
        halfDay: reportData.summary.halfDay ?? reportData.summary.totalHalfDay ?? 0,
        incomplete: reportData.summary.incomplete ?? 0,
        total: reportData.totalRecords ?? 0,
        avgHours: reportData.summary.avgWorkingHours ?? 0,
        totalHours: reportData.summary.totalWorkingHours ?? 0,
      };
    }
    return { present: 0, absent: 0, late: 0, total: reportData.totalRecords ?? 0, avgHours: 0, totalHours: 0, halfDay: 0, incomplete: 0 };
  };

  const summary = getSummary();

  // Chart data
  const statusChartData = {
    labels: ['Present', 'Absent', 'Late', 'Half Day'],
    datasets: [{
      data: [summary.present, summary.absent, summary.late, summary.halfDay],
      backgroundColor: ['#059669', '#dc2626', '#f59e0b', '#8b5cf6'],
      borderWidth: 0,
      cutout: '72%',
    }],
  };

  const trendData = reportData?.dailyTrend || [];
  const trendChartData = {
    labels: trendData.map((d: any) => {
      const dt = new Date(d.date);
      return dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    }),
    datasets: [
      {
        label: 'Present',
        data: trendData.map((d: any) => d.present),
        borderColor: '#059669',
        backgroundColor: 'rgba(5, 150, 105, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
      {
        label: 'Late',
        data: trendData.map((d: any) => d.late),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }
    ],
  };

  const deptData = reportData?.departmentBreakdown || [];
  const deptChartData = {
    labels: deptData.map((d: any) => d.name),
    datasets: [
      {
        label: 'Present',
        data: deptData.map((d: any) => d.present),
        backgroundColor: '#059669',
        borderRadius: 6,
      },
      {
        label: 'Absent',
        data: deptData.map((d: any) => d.absent),
        backgroundColor: '#dc2626',
        borderRadius: 6,
      },
      {
        label: 'Late',
        data: deptData.map((d: any) => d.late),
        backgroundColor: '#f59e0b',
        borderRadius: 6,
      },
    ],
  };

  const logs = reportData?.logs || [];
  const employeeStats = reportData?.employeeStats || [];

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '--:--';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
    });
  };

  const tabs: { key: TabType; label: string; icon: any }[] = [
    { key: 'daily', label: 'Daily', icon: Calendar },
    { key: 'weekly', label: 'Weekly', icon: TrendingUp },
    { key: 'monthly', label: 'Monthly', icon: BarChart3 },
  ];

  return (
    <div data-testid="reports-page" className="min-h-screen pb-20" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
        <div>
          <h1 data-testid="reports-title" className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Reports <span className="text-emerald-600">Center</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">Attendance analytics, insights and data exports</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="refresh-btn"
            onClick={fetchReport}
            disabled={loading}
            className="h-10 w-10 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 transition-colors text-slate-600"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            data-testid="download-pdf-btn"
            onClick={() => handleDownload('pdf')}
            disabled={generating}
            className="h-10 px-4 flex items-center gap-2 rounded-xl bg-red-50 hover:bg-red-100 transition-colors text-red-600 text-sm font-semibold"
          >
            <FilePdf className="w-4 h-4" /> PDF
          </button>
          <button
            data-testid="download-excel-btn"
            onClick={() => handleDownload('excel')}
            disabled={generating}
            className="h-10 px-4 flex items-center gap-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 transition-colors text-emerald-600 text-sm font-semibold"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl w-fit mb-6">
        {tabs.map(tab => (
          <button
            key={tab.key}
            data-testid={`tab-${tab.key}`}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters + Date Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 mb-6">
        <div className="flex flex-wrap items-end gap-4">
          {/* Date Controls */}
          {activeTab === 'daily' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Date</label>
              <input
                data-testid="filter-date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          )}
          {activeTab === 'weekly' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Week Starting</label>
              <input
                data-testid="filter-week"
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          )}
          {activeTab === 'monthly' && (
            <div className="flex gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Month</label>
                <select
                  data-testid="filter-month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(Number(e.target.value))}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none"
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {new Date(2000, i).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Year</label>
                <select
                  data-testid="filter-year"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none"
                >
                  {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="h-8 w-px bg-slate-200 hidden lg:block" />

          {/* Filters */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Department</label>
            <select
              data-testid="filter-department"
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none min-w-[160px]"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Branch</label>
            <select
              data-testid="filter-branch"
              value={filters.branchId}
              onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none min-w-[140px]"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Location</label>
            <select
              data-testid="filter-location"
              value={filters.locationId}
              onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
              className="h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 outline-none min-w-[140px]"
            >
              <option value="">All Locations</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-32">
          <div className="relative">
            <div className="w-14 h-14 border-4 border-slate-100 rounded-full" />
            <div className="w-14 h-14 border-4 border-emerald-500 rounded-full border-t-transparent animate-spin absolute top-0 left-0" />
          </div>
          <p className="text-sm text-slate-400 mt-4 font-medium">Loading report data...</p>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
            <SummaryCard
              testId="summary-total"
              icon={Users}
              label="Total Records"
              value={summary.total}
              color="slate"
            />
            <SummaryCard
              testId="summary-present"
              icon={CheckCircle2}
              label="Present"
              value={summary.present}
              color="emerald"
              percentage={summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0}
            />
            <SummaryCard
              testId="summary-absent"
              icon={XCircle}
              label="Absent"
              value={summary.absent}
              color="red"
            />
            <SummaryCard
              testId="summary-late"
              icon={AlertTriangle}
              label="Late Arrivals"
              value={summary.late}
              color="amber"
            />
            <SummaryCard
              testId="summary-hours"
              icon={Clock}
              label="Avg Hours"
              value={summary.avgHours.toFixed(1)}
              color="blue"
              suffix="hrs"
            />
            <SummaryCard
              testId="summary-total-hours"
              icon={Timer}
              label="Total Hours"
              value={summary.totalHours.toFixed(0)}
              color="violet"
              suffix="hrs"
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Status Doughnut */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6">
              <h3 data-testid="chart-status-title" className="text-sm font-bold text-slate-700 mb-4">Attendance Status</h3>
              <div className="h-52 flex items-center justify-center">
                {summary.total > 0 ? (
                  <Doughnut
                    data={statusChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 11 } } }
                      }
                    }}
                  />
                ) : (
                  <p className="text-sm text-slate-400">No data</p>
                )}
              </div>
            </div>

            {/* Trend Line (weekly/monthly) */}
            {(activeTab === 'weekly' || activeTab === 'monthly') && trendData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-6 lg:col-span-2">
                <h3 data-testid="chart-trend-title" className="text-sm font-bold text-slate-700 mb-4">Attendance Trend</h3>
                <div className="h-52">
                  <Line
                    data={trendChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 11 } } } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                        x: { grid: { display: false } }
                      }
                    }}
                  />
                </div>
              </div>
            )}

            {/* Department Bar (daily/monthly) */}
            {deptData.length > 0 && (activeTab === 'daily' || activeTab === 'monthly') && (
              <div className={`bg-white rounded-2xl border border-slate-200 p-6 ${activeTab === 'daily' ? 'lg:col-span-2' : ''}`}>
                <h3 data-testid="chart-dept-title" className="text-sm font-bold text-slate-700 mb-4">Department Breakdown</h3>
                <div className="h-52">
                  <Bar
                    data={deptChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: 11 } } } },
                      scales: {
                        y: { beginAtZero: true, grid: { color: '#f1f5f9' } },
                        x: { grid: { display: false } }
                      }
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Data Table */}
          <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 data-testid="table-title" className="text-sm font-bold text-slate-700">
                {activeTab === 'daily' ? 'Employee Attendance Details' : 'Employee Summary'}
              </h3>
              <span className="text-xs text-slate-400 font-medium">
                {activeTab === 'daily' ? logs.length : employeeStats.length} records
              </span>
            </div>

            <div className="overflow-x-auto">
              {activeTab === 'daily' ? (
                <table data-testid="daily-table" className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">First In</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Last Out</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Hours</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Punches</th>
                      <th className="text-right px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {logs.map((log: any) => (
                      <tr key={log.id} data-testid={`row-${log.id}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                              {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{log.employee?.firstName} {log.employee?.lastName}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{log.employee?.employeeCode} {log.employee?.department?.name ? `| ${log.employee.department.name}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-mono font-semibold ${log.firstIn ? 'text-emerald-700' : 'text-slate-300'}`}>
                            {formatTime(log.firstIn)}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className={`text-sm font-mono font-semibold ${log.lastOut ? 'text-red-600' : 'text-orange-400'}`}>
                            {log.lastOut ? formatTime(log.lastOut) : 'No Out'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="text-sm font-bold text-slate-800">
                            {log.workingHours ? log.workingHours.toFixed(1) : '--'}
                            <span className="text-[10px] text-slate-400 ml-0.5">hrs</span>
                          </span>
                        </td>
                        <td className="px-4 py-3.5">
                          {log.lateArrival > 0 ? (
                            <span className="text-xs font-semibold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                              {Math.round(log.lateArrival * 60)}m
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300">--</span>
                          )}
                        </td>
                        <td className="px-4 py-3.5">
                          {log.logs ? (() => {
                            try {
                              const punches = JSON.parse(log.logs);
                              return (
                                <div className="flex flex-wrap gap-1">
                                  {punches.slice(0, 4).map((t: string, i: number) => (
                                    <span key={i} className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                                      {formatTime(t)}
                                    </span>
                                  ))}
                                  {punches.length > 4 && <span className="text-[10px] text-slate-400">+{punches.length - 4}</span>}
                                </div>
                              );
                            } catch { return <span className="text-xs text-slate-300">--</span>; }
                          })() : <span className="text-xs text-slate-300">--</span>}
                        </td>
                        <td className="px-6 py-3.5 text-right">
                          <StatusBadge status={log.status} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table data-testid="summary-table" className="w-full">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="text-left px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Present</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Absent</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Late</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Half Day</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Hrs</th>
                      <th className="text-center px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Avg Hrs/Day</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {employeeStats.map((stat: any, idx: number) => (
                      <tr key={idx} data-testid={`stat-row-${idx}`} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                              {stat.employee?.firstName?.[0]}{stat.employee?.lastName?.[0]}
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-800">{stat.employee?.firstName} {stat.employee?.lastName}</p>
                              <p className="text-[10px] text-slate-400 font-medium">{stat.employee?.employeeCode} {stat.employee?.department?.name ? `| ${stat.employee.department.name}` : ''}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-bold text-emerald-600">{stat.present}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-bold text-red-500">{stat.absent || 0}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-bold text-amber-600">{stat.late}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-bold text-violet-600">{stat.halfDay || 0}</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-sm font-bold text-slate-800">{(stat.totalWorkingHours || 0).toFixed(1)}</span>
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="text-sm font-bold text-blue-600">
                            {stat.present > 0 ? ((stat.totalWorkingHours || 0) / stat.present).toFixed(1) : '0.0'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {((activeTab === 'daily' && logs.length === 0) || (activeTab !== 'daily' && employeeStats.length === 0)) && (
              <div className="py-16 text-center">
                <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="text-sm text-slate-400 font-medium">No attendance data found for the selected period</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Font import */}
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
    </div>
  );
};

function SummaryCard({ testId, icon: Icon, label, value, color, percentage, suffix }: any) {
  const colorMap: Record<string, string> = {
    slate: 'bg-slate-100 text-slate-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    violet: 'bg-violet-50 text-violet-600',
  };

  return (
    <div data-testid={testId} className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${colorMap[color]}`}>
          <Icon className="w-4 h-4" />
        </div>
        {percentage !== undefined && (
          <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
            {percentage}%
          </span>
        )}
      </div>
      <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
        {value}
        {suffix && <span className="text-xs font-medium text-slate-400 ml-1">{suffix}</span>}
      </p>
      <p className="text-[11px] text-slate-400 font-medium mt-0.5">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const s = (status || 'absent').toLowerCase();
  const config: Record<string, { bg: string; text: string; label: string }> = {
    present: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700', label: 'Present' },
    absent: { bg: 'bg-red-50 border-red-200', text: 'text-red-700', label: 'Absent' },
    'half day': { bg: 'bg-violet-50 border-violet-200', text: 'text-violet-700', label: 'Half Day' },
    'shift incomplete': { bg: 'bg-orange-50 border-orange-200', text: 'text-orange-700', label: 'No Out Punch' },
    late: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-700', label: 'Late' },
  };
  const c = config[s] || config['absent'];
  return (
    <span data-testid={`status-${s.replace(/\s+/g, '-')}`} className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wide border ${c.bg} ${c.text}`}>
      {c.label}
    </span>
  );
}
