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
  LayoutGrid,
  GraduationCap,
  Bus,
  Library
} from 'lucide-react';
import { reportsAPI, departmentsAPI, branchesAPI, shiftsAPI } from '../services/api';
import { Department, Branch, Shift } from '../types';
import { useAuth } from '../contexts/AuthContext';

export const Reports = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSchool = user?.modules?.includes('school');

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
    locationId: '',
    shiftId: '',
    status: '',
  });

  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        const [deptRes, branchRes, shiftRes, locRes] = await Promise.all([
          departmentsAPI.getAll(),
          branchesAPI.getAll(),
          shiftsAPI.getAll(),
          locationsAPI.getAll()
        ]);
        setDepartments(deptRes.data);
        setBranches(branchRes.data);
        setShifts(shiftRes.data);
        setLocations(locRes.data);
      } catch (err) {
        console.error("Error loading filters", err);
      }
    };
    fetchFilters();
  }, []);

  const handleDownload = async (format: 'excel' | 'pdf', reportType: string = 'daily') => {
    try {
      setGenerating(true);
      const params: Record<string, string> = {
        startDate: dateRange.start,
        endDate: dateRange.end,
        date: dateRange.start
      };

      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.locationId) params.locationId = filters.locationId;

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
      link.download = `report_${brandingName}_${reportType}_${dateRange.start}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
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

  const brandingName = user?.tenant?.name || 'Apextime';

  const ReportCard = ({ icon: Icon, title, description, colorClass, bgClass, type }: any) => (
    <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-4 rounded-xl ${bgClass} ${colorClass} group-hover:scale-110 transition-transform`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => handleDownload('pdf', type)}
            title="Download PDF"
            className="p-2 hover:bg-gray-100 rounded-lg text-red-500 transition-colors"
          >
            <FilePdf className="w-5 h-5" />
          </button>
          <button
            onClick={() => handleDownload('excel', type)}
            title="Download Excel"
            className="p-2 hover:bg-gray-100 rounded-lg text-green-600 transition-colors"
          >
            <FileSpreadsheet className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div>
        <h3 className="font-bold text-gray-800">{title}</h3>
        <p className="text-xs text-gray-400 mt-1">{description || 'Generate detailed report'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-8 pb-20">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Report Center</h1>
          <p className="text-gray-500 text-sm mt-1">Analytics and data exports for your institution</p>
        </div>
      </div>

      {/* Filter Card */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Filter className="w-5 h-5 text-blue-600" /> General Filters
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-1">
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Date Range</label>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sm p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
              <span className="text-gray-300">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sm p-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Location</label>
            <select
              value={filters.locationId}
              onChange={(e) => setFilters({ ...filters, locationId: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sm p-2.5"
            >
              <option value="">All Locations</option>
              {locations.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Department</label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sm p-2.5"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Branch</label>
            <select
              value={filters.branchId}
              onChange={(e) => setFilters({ ...filters, branchId: e.target.value })}
              className="w-full bg-gray-50 border border-gray-200 rounded-xl text-sm p-2.5"
            >
              <option value="">All Branches</option>
              {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {isSchool && (
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-1">
            <GraduationCap className="w-6 h-6 text-blue-600" /> School Management Reports
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ReportCard
              icon={Calendar}
              title="Student Attendance"
              description="Daily and monthly student attendance records"
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
              type="student_attendance"
            />
            <ReportCard
              icon={DollarSign}
              title="Fee Collection"
              description="Fee receipts, dues, and payment history"
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
              type="fee_report"
            />
            <ReportCard
              icon={Bus}
              title="Transport Usage"
              description="Student counts per route and vehicle info"
              colorClass="text-orange-600"
              bgClass="bg-orange-50"
              type="transport_report"
            />
          </div>
        </section>
      )}

      <section className="space-y-4">
        <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2 px-1">
          <Briefcase className="w-6 h-6 text-indigo-600" /> HR & Attendance Reports
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <ReportCard
            icon={Calendar}
            title="Daily Attendance"
            description="Detailed punch logs (SNo, Time, OT, Status)"
            colorClass="text-cyan-600"
            bgClass="bg-cyan-50"
            type="daily_detailed"
          />
          <ReportCard
            icon={LayoutGrid}
            title="Monthly Status"
            description="Work duration and matrix status report"
            colorClass="text-blue-600"
            bgClass="bg-blue-50"
            type="monthly_detailed"
          />
          <ReportCard
            icon={FileText}
            title="Leave Summary"
            description="Allowed, Taken, and Balance for all"
            colorClass="text-purple-600"
            bgClass="bg-purple-50"
            type="leave_summary"
          />
          <ReportCard
            icon={Users}
            title="Dept Summary"
            description="Daily counts (P/A/H/WO) by department"
            colorClass="text-emerald-600"
            bgClass="bg-emerald-50"
            type="department_summary"
          />
          <ReportCard
            icon={PieChart}
            title="Payroll Summary"
            description="Earnings and deductions overview"
            colorClass="text-amber-500"
            bgClass="bg-amber-50"
            type="payroll"
          />
        </div>
      </section>
    </div>
  );
};
