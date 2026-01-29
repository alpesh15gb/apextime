import { useState } from 'react';
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
  Check
} from 'lucide-react';
import { reportsAPI } from '../services/api';

export const Reports = () => {
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
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Intelligence Hub</h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">Export organizational attendance and performance datasets</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-8">
          <div className="app-card p-10 space-y-10">
            <div className="flex flex-col space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Target className="w-4 h-4 text-red-600" /> Resolution Logic
              </h3>
              <div className="flex bg-gray-50 p-1.5 rounded-[24px] w-fit shadow-inner">
                {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setReportType(type)}
                    className={`px-8 py-3 rounded-[18px] text-[10px] font-black uppercase tracking-widest transition-all ${reportType === type ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Filter className="w-4 h-4 text-red-600" /> Refined Filters
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {reportType === 'daily' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Date</label>
                    <div className="relative">
                      <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                      <input
                        type="date"
                        value={filters.date}
                        onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                        className="w-full pl-12 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-xs"
                      />
                    </div>
                  </div>
                )}

                {reportType === 'monthly' && (
                  <>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Month Period</label>
                      <select
                        value={filters.month}
                        onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-xs appearance-none cursor-pointer"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                          <option key={month} value={month}>
                            {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fiscal Year</label>
                      <select
                        value={filters.year}
                        onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                        className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-xs appearance-none cursor-pointer"
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

            <div className="pt-8 border-t border-gray-50 flex items-center justify-between">
              <div>
                <p className="text-sm font-extrabold text-gray-800">Operational Export</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Instant generation of local and cloud identifiers</p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={() => handleDownload('excel')}
                  disabled={generating}
                  className="px-6 py-4 bg-white border border-gray-100 text-emerald-600 font-black text-[10px] uppercase tracking-widest rounded-[20px] hover:bg-emerald-50 transition-all shadow-sm flex items-center space-x-2 disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>{generating ? 'Processing...' : 'Excel Matrix'}</span>
                </button>
                <button
                  onClick={() => handleDownload('pdf')}
                  disabled={generating}
                  className="px-6 py-4 bg-red-600 text-white font-black text-[10px] uppercase tracking-widest rounded-[20px] hover:bg-red-700 shadow-xl shadow-red-100 transition-all flex items-center space-x-2 disabled:opacity-50"
                >
                  <FilePdf className="w-4 h-4" />
                  <span>{generating ? 'Processing...' : 'Official PDF'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Contents Guide */}
          <div className="app-card p-10 bg-gray-900 border-none text-white overflow-hidden relative">
            <div className="absolute top-0 right-0 w-40 h-40 bg-red-600/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
            <h3 className="text-xl font-extrabold italic mb-8 relative z-10">Dataset <span className="text-red-500">Inclusions</span></h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 relative z-10">
              {[
                { icon: User, text: 'Personnel Identifiers' },
                { icon: Building2, text: 'Departmental Routing' },
                { icon: Clock, text: 'Time Window Sequences' },
                { icon: FileText, text: 'Shift Roster Audit' },
                { icon: Target, text: 'Late Arrival Signals' },
                { icon: CheckCircle2, text: 'Final Verification' }
              ].map((item, i) => (
                <div key={i} className="flex items-center space-x-3 group">
                  <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center text-gray-500 group-hover:bg-red-600 group-hover:text-white transition-all">
                    <item.icon className="w-4 h-4" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Panel */}
        <div className="space-y-8">
          <div className="app-card p-10 space-y-8 bg-red-50/20 border-red-50">
            <div className="flex items-center space-x-3 text-red-600">
              <Target className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Precision Tip</span>
            </div>
            <p className="text-xs font-bold text-gray-500 leading-relaxed">
              Generating <strong className="text-gray-900">Monthly Reports</strong> after the <strong className="text-gray-900">25th</strong> ensures all late-cycle attendance corrections are captured for payroll finalization.
            </p>
            <div className="flex items-center space-x-2 text-[10px] font-black text-red-600 uppercase tracking-widest">
              <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
              <span>System Ready</span>
            </div>
          </div>

          <div className="app-card p-10 space-y-6">
            <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-300">
              <FileText className="w-6 h-6" />
            </div>
            <h4 className="text-sm font-extrabold text-gray-900">Archive Compliance</h4>
            <p className="text-xs font-bold text-gray-400 italic">All exports are logged with administrative timestamps for internal audit compliance.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
import { User } from 'lucide-react';
