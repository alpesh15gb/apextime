import { useEffect, useState, useRef } from 'react';
import { Calendar, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { attendanceAPI, departmentsAPI, holidaysAPI } from '../services/api';

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
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [loading, setLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();
  const monthName = currentDate.toLocaleString('default', { month: 'long' });

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchReport();
  }, [currentDate, selectedDepartment]);

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll();
      setDepartments(response.data || []);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const fetchReport = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        month: month.toString(),
        year: year.toString(),
      };
      if (selectedDepartment) {
        params.departmentId = selectedDepartment;
      }
      const response = await attendanceAPI.getMonthlyReport(params);
      setReport(response.data);
    } catch (error) {
      console.error('Failed to fetch monthly report:', error);
    } finally {
      setLoading(false);
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

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const match = dateStr.match(/T(\d{2}):(\d{2})/);
    if (match) {
      return `${match[1]}:${match[2]}`;
    }
    return '-';
  };

  const getDayShortName = (day: number) => {
    const date = new Date(year, month - 1, day);
    return date.toLocaleString('default', { weekday: 'narrow' });
  };

  const getCellContent = (data: DailyData) => {
    // If off day (Sunday or Holiday)
    if (data.isOffDay) {
      // If employee worked, show timings
      if (data.firstIn || data.lastOut) {
        return (
          <div className="text-[9px] leading-tight">
            <div>{formatTime(data.firstIn)}</div>
            <div>{formatTime(data.lastOut)}</div>
            {data.lateArrival > 0 && <span className="text-red-500 text-[8px]">L</span>}
          </div>
        );
      }
      // Show H for holiday, S for Sunday
      if (data.isHoliday) {
        return <span className="text-blue-500 font-bold text-xs">H</span>;
      }
      return <span className="text-gray-400">-</span>;
    }

    // Regular day
    if (data.status === 'absent') {
      return <span className="text-red-500 font-bold text-xs">A</span>;
    }

    if (!data.firstIn && !data.lastOut) {
      return <span className="text-gray-400">-</span>;
    }

    return (
      <div className="text-[9px] leading-tight">
        <div>{formatTime(data.firstIn)}</div>
        <div>{formatTime(data.lastOut)}</div>
        {data.lateArrival > 0 && <span className="text-red-500 text-[8px]">L</span>}
      </div>
    );
  };

  const getCellClass = (data: DailyData) => {
    if (data.isHoliday) {
      if (data.firstIn || data.lastOut) return 'bg-blue-100'; // Worked on holiday
      return 'bg-blue-50';
    }
    if (data.isSunday) {
      if (data.firstIn || data.lastOut) return 'bg-purple-100'; // Worked on Sunday
      return 'bg-gray-100';
    }
    if (data.status === 'absent') return 'bg-red-50';
    if (data.lateArrival > 0) return 'bg-yellow-50';
    return 'bg-white';
  };

  // Generate array of days 1-31
  const days = Array.from({ length: report?.daysInMonth || 31 }, (_, i) => i + 1);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4 print:hidden">
        <h1 className="text-2xl font-bold text-gray-800">Monthly Attendance Report</h1>

        <div className="flex flex-wrap items-center gap-3">
          {/* Department Filter */}
          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>{dept.name}</option>
            ))}
          </select>

          {/* Month Navigation */}
          <div className="flex items-center bg-white rounded-lg border shadow-sm">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-l-lg">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="px-4 py-2 font-medium min-w-[140px] text-center">
              {monthName} {year}
            </div>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-r-lg">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Actions */}
          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : report?.reportData.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p>No attendance data found for this month</p>
        </div>
      ) : (
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left Panel - Holidays */}
          <div className="w-full lg:w-48 print:hidden">
            <div className="bg-white rounded-lg shadow p-4 sticky top-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Holidays
              </h3>
              {report?.holidays && report.holidays.length > 0 ? (
                <ul className="space-y-2 text-sm">
                  {report.holidays.map((holiday) => (
                    <li key={holiday.day} className="flex items-start gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-blue-100 text-blue-700 rounded text-xs font-medium">
                        {holiday.day}
                      </span>
                      <span className="text-gray-700">{holiday.name}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-500 text-sm">No holidays this month</p>
              )}

              <div className="mt-4 pt-4 border-t">
                <h4 className="font-medium text-gray-700 mb-2 text-sm">Legend</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-blue-50 border block"></span>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-gray-100 border block"></span>
                    <span>Sunday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-red-50 border block"></span>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-4 h-4 bg-yellow-50 border block"></span>
                    <span>Late</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-red-500 text-xs">A</span>
                    <span>Absent</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-blue-500 text-xs">H</span>
                    <span>Holiday</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-purple-500 text-xs">S</span>
                    <span>Worked on Sunday</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Report Table */}
          <div ref={printRef} className="flex-1 bg-white rounded-lg shadow overflow-hidden print:shadow-none">
            {/* Print Header */}
            <div className="p-4 border-b print:p-2">
              <div className="text-center">
                <h2 className="text-xl font-bold print:text-lg">Monthly Attendance Register</h2>
                <p className="text-gray-600 mt-1 print:text-sm">
                  {monthName} {year} | {selectedDepartment ? departments.find(d => d.id === selectedDepartment)?.name || 'Department' : 'All Departments'}
                </p>
              </div>
            </div>

            {/* Report Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-[10px] print:text-[8px]">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    <th className="text-left py-2 px-1 font-semibold sticky left-0 bg-gray-50 z-10 min-w-[120px] print:static">
                      Employee
                    </th>
                    <th className="text-center py-2 px-1 font-semibold min-w-[40px]">Code</th>
                    {days.map((day) => {
                      const date = new Date(year, month - 1, day);
                      const isSunday = date.getDay() === 0;
                      const isHoliday = report?.holidays.some(h => h.day === day);
                      return (
                        <th
                          key={day}
                          className={`text-center py-1 px-[2px] font-semibold min-w-[24px] print:min-w-[20px] ${
                            isSunday ? 'bg-gray-200' : isHoliday ? 'bg-blue-100' : ''
                          }`}
                        >
                          <div>{day}</div>
                          <div className="text-[8px] text-gray-500 font-normal">
                            {getDayShortName(day)}
                          </div>
                        </th>
                      );
                    })}
                    <th className="text-center py-2 px-1 font-semibold min-w-[40px]">P</th>
                    <th className="text-center py-2 px-1 font-semibold min-w-[40px]">A</th>
                    <th className="text-center py-2 px-1 font-semibold min-w-[40px]">L</th>
                    <th className="text-center py-2 px-1 font-semibold min-w-[50px]">WO</th>
                    <th className="text-center py-2 px-1 font-semibold min-w-[50px]">Hrs</th>
                  </tr>
                </thead>
                <tbody>
                  {report?.reportData.map((row, index) => (
                    <tr key={row.employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1 px-1 sticky left-0 bg-inherit z-10 border-r print:static">
                        <div className="font-medium text-xs truncate max-w-[120px]">{row.employee.name}</div>
                        <div className="text-[9px] text-gray-500">{row.employee.department}</div>
                      </td>
                      <td className="py-1 px-1 text-center font-mono text-xs">
                        {row.employee.employeeCode}
                      </td>
                      {row.dailyData.map((data) => (
                        <td
                          key={data.day}
                          className={`py-1 px-[2px] text-center border-r border-gray-100 min-w-[24px] h-8 ${getCellClass(data)}`}
                        >
                          {getCellContent(data)}
                        </td>
                      ))}
                      <td className="py-1 px-1 text-center font-medium text-green-600">
                        {row.summary.presentDays}
                      </td>
                      <td className="py-1 px-1 text-center font-medium text-red-600">
                        {row.summary.absentDays}
                      </td>
                      <td className="py-1 px-1 text-center font-medium text-yellow-600">
                        {row.summary.lateDays}
                      </td>
                      <td className="py-1 px-1 text-center font-medium text-purple-600">
                        {row.summary.workedOnOffDay}
                      </td>
                      <td className="py-1 px-1 text-center font-mono text-xs">
                        {row.summary.totalWorkingHours.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Print Footer - Legend */}
            <div className="hidden print:block p-4 border-t text-xs">
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-red-500">A</span>
                  <span>Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-blue-500">H</span>
                  <span>Holiday</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[8px] text-red-500 font-bold">L</span>
                  <span>Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-purple-100 border block"></span>
                  <span>Worked on Sunday</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-4 h-4 bg-blue-100 border block"></span>
                  <span>Worked on Holiday</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            size: landscape;
            margin: 5mm;
          }
          body {
            print-color-adjust: exact;
            -webkit-print-color-adjust: exact;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:static {
            position: static !important;
          }
          .print\\:block {
            display: block !important;
          }
          .print\\:p-2 {
            padding: 0.5rem !important;
          }
          .print\\:text-lg {
            font-size: 1.125rem !important;
          }
          .print\\:text-sm {
            font-size: 0.875rem !important;
          }
          .print\\:text\\[8px\\] {
            font-size: 8px !important;
          }
          .print\\:min-w\\[20px\\] {
            min-width: 20px !important;
          }
          table {
            width: 100% !important;
            table-layout: fixed;
          }
          th, td {
            padding: 1px 2px !important;
          }
        }
      `}</style>
    </div>
  );
};
