import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Calendar,
  Filter,
  FileSpreadsheet,
  File as FilePdf,
  Clock,
  CheckCircle,
  Briefcase,
  Building2,
  ChevronRight,
  Download,
  Users,
  AlertCircle,
  PieChart,
  DollarSign,
  LayoutGrid
} from 'lucide-react';
import { reportsAPI, departmentsAPI, branchesAPI, shiftsAPI } from '../services/api';
import { Department, Branch, Shift } from '../types';

export const Reports = () => {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(false);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);

  // Filter States
  const [dateRange, setDateRange] = useState({
    start: new Date().toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    departmentId: '',
    branchId: '',
    shiftId: '',
    status: '',
  });

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [deptRes, branchRes, shiftRes] = await Promise.all([
          departmentsAPI.getAll(),
          branchesAPI.getAll(),
          shiftsAPI.getAll()
        ]);
        setDepartments(deptRes.data);
        setBranches(branchRes.data);
        setShifts(shiftRes.data);
      } catch (err) {
        console.error("Error loading filters", err);
      }
    };
    fetchFilters();
  }, []);

  const handleDownload = async (format: 'excel' | 'pdf', reportType: string = 'daily') => {
    try {
      setGenerating(true);
      const params: Record<string, string> = {};

      // Use date range logic (simplified to daily/monthly mapping for existing API)
      // If ranges match, use daily. If start/end diff > 1 day, maybe warn or defaulted to daily for Start Date?
      // For now, we map 'start' to the date parameter.
      params.date = dateRange.start;

      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.branchId) params.branchId = filters.branchId;

      let response;
      if (format === 'excel') {
        response = await reportsAPI.downloadExcel(reportType, params);
      } else {
        response = await reportsAPI.downloadPDF(reportType, params);
      }

      const blob = new Blob([response.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `report_${reportType}_${dateRange.start}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
      alert('Failed to download report. Please check criteria.');
    } finally {
      setGenerating(false);
    }
  };

  const ReportCard = ({ icon: Icon, title, colorClass, bgClass, onClick }: any) => (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all flex items-center justify-between group cursor-pointer" onClick={onClick}>
      <div className="flex items-center gap-4">
        <div className={`p-3 rounded-full ${bgClass} ${colorClass}`}>
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
          <span className="text-xs text-blue-600 font-medium flex items-center gap-1 mt-1 group-hover:underline">
            View Report <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-4 text-sm">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">

          {/* Date Range */}
          <div className="lg:col-span-1">
            <label className="block text-xs font-semibold text-gray-500 mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm p-2.5 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-400">-</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm p-2.5 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          {/* Department */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Department</label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">All</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          {/* Branch / Employer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Employer</label>
            <select
              value={filters.branchId}
              onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">All</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Status</label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">All Employees</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          </div>

          {/* Shift */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Shift</label>
            <select
              value={filters.shiftId}
              onChange={(e) => setFilters({ ...filters, shiftId: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-lg text-sm p-2.5 focus:ring-blue-500 focus:border-blue-500 appearance-none"
            >
              <option value="">All</option>
              {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
          <button
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition-colors"
            onClick={() => console.log('Apply Filters')}
          >
            Apply
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FilePdf className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={() => handleDownload('excel')}
            disabled={generating}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <FileSpreadsheet className="w-4 h-4" /> Excel
          </button>
        </div>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 ml-0 gap-6">
        <ReportCard
          icon={LayoutGrid}
          title="Monthly Matrix"
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
          onClick={() => navigate('/monthly-report')}
        />
        <ReportCard
          icon={Calendar}
          title="Daily Attendance"
          colorClass="text-cyan-600"
          bgClass="bg-cyan-50"
          onClick={() => handleDownload('excel', 'daily')}
        />
        <ReportCard
          icon={Briefcase}
          title="Leave Report"
          colorClass="text-purple-600"
          bgClass="bg-purple-50"
          onClick={() => handleDownload('excel', 'daily')}
        />
        <ReportCard
          icon={DollarSign}
          title="Payroll Report"
          colorClass="text-amber-500"
          bgClass="bg-amber-50"
          onClick={() => handleDownload('excel', 'monthly')}
        />
        <ReportCard
          icon={Clock}
          title="Overtime Report"
          colorClass="text-red-500"
          bgClass="bg-red-50"
          onClick={() => handleDownload('excel', 'daily')}
        />
        <ReportCard
          icon={Users}
          title="Employee Turnover"
          colorClass="text-emerald-500"
          bgClass="bg-emerald-50"
          onClick={() => handleDownload('excel', 'monthly')}
        />
        <ReportCard
          icon={CheckCircle}
          title="Compliance Report"
          colorClass="text-indigo-500"
          bgClass="bg-indigo-50"
          onClick={() => handleDownload('excel', 'daily')}
        />
      </div>
    </div>
  );
};
