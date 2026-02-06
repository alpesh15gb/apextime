import { useState, useEffect, useRef } from 'react';
import { MapPin, Calendar, ChevronLeft, ChevronRight, Printer, Share2, Filter, MoreVertical, LayoutGrid, Briefcase, RefreshCw, FileSpreadsheet, File as FilePdf } from 'lucide-react';
import { attendanceAPI, departmentsAPI, branchesAPI, reportsAPI } from '../services/api';

interface DailyData {
  day: number;
  firstIn: string | null;
  lastOut: string | null;
  workingHours: number | null;
  lateArrival: number;
  earlyDeparture: number;
  status: string;
  isSunday: boolean;
  isHoliday: boolean;
  isOffDay: boolean;
  holidayName?: string;
}

interface EmployeeReport {
  employee: {
    id: string;
    name: string;
    employeeCode: string;
    department: string;
    branch: string;
    location: string;
  };
  dailyData: DailyData[];
  summary: {
    presentDays: number;
    absentDays: number;
    lateDays: number;
    workedOnOffDay: number;
    totalWorkingHours: number;
  };
}

interface Holiday {
  day: number;
  name: string;
  isRecurring: boolean;
}

interface ReportData {
  month: number;
  year: number;
  daysInMonth: number;
  holidays: Holiday[];
  reportData: EmployeeReport[];
}

export const MonthlyReport = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [report, setReport] = useState<ReportData | null>(null);
  const [departments, setDepartments] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  useEffect(() => {
    fetchFilters();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [currentDate, selectedDepartment, selectedBranch, selectedLocation]);

  const fetchFilters = async () => {
    try {
      const [deptRes, branchRes, locRes] = await Promise.all([
        departmentsAPI.getAll(),
        branchesAPI.getAll(),
        locationsAPI.getAll(),
      ]);
      setDepartments(deptRes.data);
      setBranches(branchRes.data);
      setLocations(locRes.data);
    } catch (error) {
      console.error('Failed to fetch filters:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const params: Record<string, string> = {
        month: month.toString(),
        year: year.toString(),
      };
      if (selectedDepartment) {
        params.departmentId = selectedDepartment;
      }
      if (selectedBranch) {
        params.branchId = selectedBranch;
      }
      if (selectedLocation) {
        params.locationId = selectedLocation;
      }
      const response = await attendanceAPI.getMonthlyReport(params);
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch monthly report:', error);
      setError('Failed to load report data. Please check your connection or try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (format: 'pdf' | 'excel') => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        month: month.toString(),
        year: year.toString(),
      };
      if (selectedDepartment) params.departmentId = selectedDepartment;
      if (selectedBranch) params.branchId = selectedBranch;
      if (selectedLocation) params.locationId = selectedLocation;

      let response;
      if (format === 'pdf') {
        response = await reportsAPI.downloadPDF('monthly_matrix', params);
      } else {
        response = await reportsAPI.downloadExcel('monthly_matrix', params);
      }

      const blob = new Blob([response.data], {
        type: format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Monthly_Matrix_${month}_${year}.${format === 'pdf' ? 'pdf' : 'xlsx'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      alert('Download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSyncData = async () => {
    if (confirm('Recalculate all logs for this month? (Fixes "Not Updating" issues)')) {
      try {
        setLoading(true);
        const start = `${year}-${String(month).padStart(2, '0')}-01`;
        const end = `${year}-${String(month).padStart(2, '0')}-${report?.daysInMonth || 31}`;
        await attendanceAPI.reprocess({ startDate: start, endDate: end });
        alert('Sync Complete');
        fetchReport();
      } catch (e) {
        alert('Sync failed');
      } finally {
        setLoading(false);
      }
    }
  };

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 2, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month, 1));
  };

  const handlePrint = () => {
    window.print();
  };

  const formatTime = (dateStr: any) => {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '-';
      return date.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  };

  const getDayShortName = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.toLocaleString('default', { weekday: 'narrow' });
  };

  const getCellContent = (data: DailyData) => {
    if (!data) return <span className="text-gray-300">-</span>;

    if (data.isOffDay) {
      if (data.firstIn || data.lastOut) {
        return (
          <div className="text-[7px] font-black leading-tight text-gray-700">
            <div>{formatTime(data.firstIn)}</div>
            <div>{formatTime(data.lastOut)}</div>
          </div>
        );
      }
      if (data.isHoliday) return <span className="text-blue-500 font-black text-[9px]">H</span>;
      return <span className="text-gray-300 font-black text-[9px]">S</span>;
    }

    if (data.status === 'absent') return <span className="text-red-500 font-black text-[9px]">A</span>;

    if (!data.firstIn && !data.lastOut) return <span className="text-gray-300 font-bold">-</span>;

    return (
      <div className="text-[7px] font-black leading-tight text-gray-900 group-hover:scale-110 transition-transform">
        <div className={(data.lateArrival || 0) > 0 ? 'text-orange-500' : ''}>{formatTime(data.firstIn)}</div>
        <div className={(data.earlyDeparture || 0) > 0 ? 'text-orange-500' : ''}>{formatTime(data.lastOut)}</div>
      </div>
    );
  };

  const getCellClass = (data: DailyData) => {
    if (!data) return 'bg-gray-50';
    if (data.isHoliday) return 'bg-blue-50/50';
    if (data.isSunday) return 'bg-gray-50/50';
    if (data.status === 'absent') return 'bg-red-50/20';
    if ((data.lateArrival || 0) > 0) return 'bg-orange-50/20';
    return 'bg-white';
  };

  const days = Array.from({ length: report?.daysInMonth || 31 }, (_, i) => i + 1);

  return (
    <div className="space-y-8 print:p-0 print:m-0 print:bg-white">
      {/* Premium Header */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6 print:hidden">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Monthly Report</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Department-wise attendance report</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
          {/* Branch & Dept Selects */}
          <div className="flex items-center space-x-3 flex-1 xl:flex-none">
            <div className="relative flex-1 xl:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 appearance-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>{loc.name}</option>
                ))}
              </select>
            </div>
            <div className="relative flex-1 xl:w-48">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 appearance-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Branches</option>
                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
            </div>
            <div className="relative flex-1 xl:w-48">
              <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <select
                value={selectedDepartment}
                onChange={(e) => setSelectedDepartment(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-bold text-gray-600 appearance-none focus:ring-2 focus:ring-blue-100"
              >
                <option value="">All Departments</option>
                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
          </div>

          {/* Month Stepper */}
          <div className="flex items-center bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <button onClick={prevMonth} className="p-2.5 hover:bg-gray-50 transition-colors text-gray-400">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-6 py-2.5 font-black text-xs uppercase tracking-widest text-gray-900 min-w-[140px] text-center border-x border-gray-50">
              {monthName} {year}
            </div>
            <button onClick={nextMonth} className="p-2.5 hover:bg-gray-50 transition-colors text-gray-400">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button onClick={handleSyncData} className="btn-app bg-white border border-gray-100 text-blue-600 hover:bg-blue-50" title="Recalculate Data">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            <span className="text-xs">Sync Data</span>
          </button>

          <button onClick={() => handleDownload('pdf')} className="btn-app bg-white border border-gray-100 text-red-500 hover:bg-red-50">
            <FilePdf className="w-5 h-5" />
            <span className="text-xs">PDF</span>
          </button>

          <button onClick={() => handleDownload('excel')} className="btn-app bg-white border border-gray-100 text-green-600 hover:bg-green-50">
            <FileSpreadsheet className="w-5 h-5" />
            <span className="text-xs">Excel</span>
          </button>

          <button onClick={handlePrint} className="btn-app bg-white border border-gray-100 text-gray-600 hover:bg-gray-50">
            <Printer className="w-5 h-5" />
            <span className="text-xs">Print</span>
          </button>
        </div>
      </div>

      {/* Main Container */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center">
            <Filter className="w-8 h-8 text-red-500" />
          </div>
          <p className="text-sm font-bold text-red-600">{error}</p>
          <button onClick={fetchReport} className="text-xs font-black text-gray-500 underline uppercase tracking-widest hover:text-gray-800">Retry</button>
        </div>
      ) : loading ? (
        <div className="flex flex-col items-center justify-center py-32 space-y-4">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600 border-opacity-20 border-r-2 border-r-blue-600"></div>
          <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Report...</p>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row gap-8 print:block">
          {/* Sidebar Stats & Legend */}
          <div className="xl:w-64 space-y-8 print:hidden">
            <div className="app-card p-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1 flex items-center justify-between">
                Holidays
                <Calendar className="w-3 h-3" />
              </h3>
              <div className="space-y-4 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                {report?.holidays && report.holidays.length > 0 ? (
                  report.holidays.map((h, idx) => {
                    if (!h) return null;
                    return (
                      <div key={h.day || idx} className="flex items-center space-x-3 group">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-[10px] font-black group-hover:bg-blue-600 group-hover:text-white transition-all">
                          {h.day || '-'}
                        </div>
                        <p className="text-xs font-bold text-gray-700 truncate">{h.name || 'Holiday'}</p>
                      </div>
                    );
                  })
                ) : (
                  <p className="text-[10px] font-bold text-gray-300 italic">No public holidays</p>
                )}
              </div>
            </div>

            <div className="app-card p-6">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6 px-1">Legend</h3>
              <div className="space-y-3">
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded bg-red-400/20 border border-red-100"></div>
                  <span className="text-[10px] font-bold text-gray-500">Employee Absent</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded bg-blue-50 border border-blue-100"></div>
                  <span className="text-[10px] font-bold text-gray-500">Official Holiday</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded bg-gray-50 border border-gray-100"></div>
                  <span className="text-[10px] font-bold text-gray-500">Weekly Off (Sun)</span>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="w-4 h-4 rounded bg-orange-400/20 border border-orange-100"></div>
                  <span className="text-[10px] font-bold text-gray-500">Late Arrival</span>
                </div>
              </div>
            </div>
          </div>

          {/* The Big Matrix */}
          <div className="flex-1 min-w-0 app-card overflow-hidden print:border-none print:shadow-none">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center print:p-2 print:border-none">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center">
                  <LayoutGrid className="w-5 h-5 text-gray-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-gray-900 tracking-tight">Attendance Report</h3>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{monthName} {year}</p>
                </div>
              </div>
              <div className="flex items-center space-x-3 print:hidden">
                <Share2 className="w-4 h-4 text-gray-300 pointer-events-none" />
                <MoreVertical className="w-4 h-4 text-gray-300" />
              </div>
            </div>

            <div className="overflow-x-auto w-full pb-4 custom-scrollbar print:overflow-visible">
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr className="bg-gray-50/50">
                    <th className="px-2 py-4 text-left font-black text-gray-400 uppercase tracking-widest border-r border-gray-100 sticky left-0 bg-gray-50 z-20 w-32 shadow-[1px_0_0_rgba(0,0,0,0.05)]">Emp</th>
                    {days.map(day => {
                      const date = new Date(year, month - 1, day);
                      const isSun = date.getDay() === 0;
                      const isHol = report?.holidays?.some(h => h.day === day);
                      return (
                        <th key={day} className={`px-0.5 py-2 text-center border-r border-gray-100 min-w-[26px] ${isSun ? 'bg-gray-100' : isHol ? 'bg-blue-50' : ''}`}>
                          <div className={`text-[9px] font-black ${isSun ? 'text-gray-400' : isHol ? 'text-blue-500' : 'text-gray-800'}`}>{day}</div>
                          <div className="text-[6px] font-black text-gray-400 uppercase">{getDayShortName(day)}</div>
                        </th>
                      );
                    })}
                    <th className="px-1 py-2 text-center font-black text-emerald-600 border-l border-gray-100 bg-emerald-50/30">P</th>
                    <th className="px-1 py-2 text-center font-black text-red-600 border-x border-gray-100 bg-red-50/30">A</th>
                    <th className="px-1 py-2 text-center font-black text-orange-600 border-r border-gray-100 bg-orange-50/30">L</th>
                    <th className="px-1 py-2 text-center font-black text-gray-800 bg-gray-50/50">H</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(
                    (report?.reportData || []).reduce((acc: Record<string, typeof report.reportData>, row) => {
                      const dept = row.employee.department || 'Unassigned';
                      if (!acc[dept]) acc[dept] = [];
                      acc[dept].push(row);
                      return acc;
                    }, {})
                  ).map(([dept, rows]) => (
                    <>
                      <tr key={`dept-${dept}`} className="bg-gray-100/80">
                        <td colSpan={days.length + 5} className="px-3 py-1.5 font-black text-[10px] text-gray-500 uppercase tracking-widest border-b border-gray-200 sticky left-0 z-10 bg-gray-100/80">
                          {dept} ({rows.length})
                        </td>
                      </tr>
                      {rows.map((row, idx) => (
                        <tr key={row?.employee?.id || idx} className="group border-b border-gray-50 hover:bg-blue-50/10 transition-colors">
                          <td className="px-2 py-1.5 sticky left-0 bg-white group-hover:bg-blue-50/10 z-10 border-r border-gray-50 shadow-[1px_0_0_rgba(0,0,0,0.05)]">
                            <div className="font-extrabold text-gray-900 text-[10px] truncate whitespace-nowrap w-28" title={row?.employee?.name}>{row?.employee?.name || 'Unknown'}</div>
                            <div className="text-[8px] font-bold text-gray-400 truncate">{row?.employee?.employeeCode || '-'}</div>
                          </td>
                          {row?.dailyData?.map((dayInfo, i) => (
                            <td key={dayInfo?.day || i} className={`p-0.5 text-center border-r border-gray-50 transition-all ${getCellClass(dayInfo)}`}>
                              {getCellContent(dayInfo)}
                            </td>
                          ))}
                          <td className="text-center font-black text-emerald-600 border-l border-gray-50 bg-emerald-50/10">{row?.summary?.presentDays || 0}</td>
                          <td className="text-center font-black text-red-600 border-x border-gray-50 bg-red-50/10">{row?.summary?.absentDays || 0}</td>
                          <td className="text-center font-black text-orange-600 border-r border-gray-50 bg-orange-50/10">{row?.summary?.lateDays || 0}</td>
                          <td className="text-center font-black text-gray-800 bg-gray-50/20">{(row?.summary?.totalWorkingHours || 0).toFixed(0)}</td>
                        </tr>
                      ))}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          @page { size: landscape; margin: 5mm; }
          body { background: white !important; zoom: 0.65; }
          .print\\:hidden { display: none !important; }
          .min-h-screen, main { margin: 0 !important; padding: 0 !important; }
          .ml-64, .ml-20 { margin-left: 0 !important; }
          header { display: none !important; }
          .app-card { border: none !important; box-shadow: none !important; border-radius: 0 !important; width: 100% !important; }
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 0.5px solid #ccc !important; padding: 1px !important; }
          .sticky { position: static !important; }
          .w-32 { width: auto !important; min-width: 80px; }
          .whitespace-nowrap { white-space: normal !important; }
          .bg-gray-100, .bg-gray-50 { background-color: #f9f9f9 !important; -webkit-print-color-adjust: exact; }
          .bg-emerald-50 { background-color: #ecfdf5 !important; -webkit-print-color-adjust: exact; }
          .bg-red-50 { background-color: #fef2f2 !important; -webkit-print-color-adjust: exact; }
        }
      `}</style>
    </div>
  );
};
