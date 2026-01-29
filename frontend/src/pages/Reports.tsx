import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  File as FilePdf,
  Target,
  Clock,
  CheckCircle2,
  Building2,
  Check,
  User,
  History,
  Activity,
  ArrowUpRight,
  Zap
} from 'lucide-react';
import { reportsAPI } from '../services/api';

export const Reports = () => {
  const navigate = useNavigate();
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    departmentId: '',
    branchId: '',
    employeeId: '',
  });
  const [generating, setGenerating] = useState(false);

  const handleDownload = async (format: 'excel' | 'pdf') => {
    try {
      setGenerating(true);
      const params: Record<string, string> = {};

      if (reportType === 'daily') {
        params.date = filters.date;
      } else if (reportType === 'monthly') {
        params.month = filters.month;
        params.year = filters.year;
      }

      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.employeeId) params.employeeId = filters.employeeId;

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
      link.download = `attendance_${reportType}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic">Reports</h1>
          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">Generate and export reports</p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/attendance')}
            className="px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all flex items-center gap-2 shadow-sm"
          >
            <Zap className="w-4 h-4" /> Today's Attendance
          </button>
          <button
            onClick={() => navigate('/monthly-report')}
            className="px-6 py-3 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all flex items-center gap-2 shadow-xl"
          >
            <Activity className="w-4 h-4 text-red-500" /> Monthly Matrix
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-10">
          <div className="app-card p-12 space-y-12 bg-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-red-50 rounded-full blur-3xl -mr-32 -mt-32 opacity-50"></div>

            <div className="flex flex-col space-y-8 relative z-10">
              <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] flex items-center gap-3">
                <Target className="w-4 h-4 text-red-600" /> Report Type
              </h3>
              <div className="flex bg-gray-50 p-2 rounded-[32px] w-fit shadow-inner border border-gray-100">
                {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={`px-10 py-4 rounded-[26px] text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${reportType === type ? 'bg-white text-gray-900 shadow-xl border border-gray-100' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-8 relative z-10">
              <h3 className="text-[10px] font-black text-gray-300 uppercase tracking-[0.4em] flex items-center gap-3">
                <Filter className="w-4 h-4 text-red-600" /> Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
                {reportType === 'daily' && (
                  <div className="space-y-3">
                    <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                        className="w-full pl-14 pr-6 py-5 bg-gray-50/50 border border-transparent rounded-[20px] focus:bg-white focus:border-red-100 focus:ring-4 focus:ring-red-50 outline-none transition-all font-black text-gray-800 text-[11px]"
                      />
                    </div>
                  </div>
                )}

                {reportType === 'monthly' && (
                  <>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Month</label>
                      <select
                        value={filters.month}
                        onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        className="w-full px-6 py-5 bg-gray-50/50 border border-transparent rounded-[20px] font-black text-gray-800 text-[11px] appearance-none cursor-pointer focus:bg-white focus:border-red-100"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <option key={month} value={month}>
                            {new Date(2000, month - 1).toLocaleString('default', { month: 'long' }).toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Year</label>
                      <select
                        value={filters.year}
                        onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        className="w-full px-6 py-5 bg-gray-50/50 border border-transparent rounded-[20px] font-black text-gray-800 text-[11px] appearance-none cursor-pointer focus:bg-white focus:border-red-100"
                      >
                        {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                          <option key={year} value={year}>
                            {year}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="pt-12 border-t border-gray-50 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
              <div>
                <p className="text-md font-black text-gray-900 tracking-tight italic">Ready to Export</p>
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.2em] mt-1 italic">Select a format below</p>
              </div>
              <div className="flex space-x-3 w-full md:w-auto">
                <button
                  onClick={() => handleDownload('excel')}
                  disabled={generating}
                  className="flex-1 md:flex-none px-10 py-5 bg-emerald-50 text-emerald-600 font-black text-[10px] uppercase tracking-[0.2em] rounded-[24px] hover:bg-emerald-600 hover:text-white transition-all shadow-sm flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-5 h-5" />
                  <span>{generating ? 'Processing...' : 'Excel'}</span>
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={generating}
                  className="flex-1 md:flex-none px-10 py-5 bg-red-600 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[24px] hover:bg-red-700 shadow-2xl shadow-red-200 transition-all flex items-center justify-center space-x-3 disabled:opacity-50"
                >
                  <FilePdf className="w-5 h-5" />
                  <span>{generating ? 'Processing...' : 'PDF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Contents Guide */}
          <div className="app-card p-12 bg-gray-900 border-none text-white overflow-hidden relative shadow-2xl">
            <div className="absolute top-0 right-0 w-80 h-80 bg-red-600/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
            <h3 className="text-xl font-black italic mb-10 relative z-10">Report <span className="text-red-500">Contents</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
              {[
                { icon: User, text: 'Employee Details' },
                { icon: Building2, text: 'Departments' },
                { icon: Clock, text: 'Timings' },
                { icon: FileText, text: 'Attendance Logs' },
                { icon: Target, text: 'Late Arrivals' },
                { icon: CheckCircle2, text: 'Status' }
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-4 group">
                  <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-center text-gray-500 group-hover:bg-red-600 group-hover:text-white group-hover:scale-110 transition-all">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 group-hover:text-white transition-colors">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Panel */}
        <div className="space-y-8">
          <div className="app-card p-12 space-y-8 bg-red-50/10 border-red-50 border-dashed border-2 relative overflow-hidden">
            <div className="flex items-center space-x-3 text-red-600 relative z-10">
              <Target className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Note</span>
            </div>
            <p className="text-xs font-bold text-gray-500 leading-relaxed relative z-10">
              Data is synced from all branches.
            </p>
            <div className="flex items-center space-x-3 text-[10px] font-black text-red-600 uppercase tracking-[0.2em] relative z-10">
              <div className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></div>
              <span>Extraction Nodes Active</span>
            </div>
          </div>

          <div className="app-card p-12 space-y-8 group hover:bg-gray-50 transition-all border-none shadow-xl shadow-gray-100">
            <div className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-300 group-hover:scale-110 transition-transform group-hover:text-red-600">
              <History className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest mb-2">History</h4>
              <p className="text-xs font-bold text-gray-400 italic leading-relaxed">View past export history.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
