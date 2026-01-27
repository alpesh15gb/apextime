import { useEffect, useState, useRef } from 'react';
import { Calendar, Download, Printer, ChevronLeft, ChevronRight } from 'lucide-react';
import { attendanceAPI, departmentsAPI } from '../services/api';

interface DailyData {
  day: number;
  firstIn: string | null;
  lastOut: string | null;
  workingHours: number | null;
  lateArrival: number;
  earlyDeparture: number;
  status: string;
  isWeekend: boolean;
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
    totalWorkingHours: number;
  };
}

interface ReportData {
  month: number;
  year: number;
  daysInMonth: number;
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
    // Extract time directly from ISO string without timezone conversion
    // Format: "2025-01-15T08:30:00.000Z" or "2025-01-15T08:30:00"
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
    if (data.isWeekend) {
      return <span className="text-gray-400">-</span>;
    }
    if (data.status === 'absent') {
      return <span className="text-red-500 font-bold">A</span>;
    }
    return (
      <div className="text-xs leading-tight">
        <div>{formatTime(data.firstIn)}</div>
        <div>{formatTime(data.lastOut)}</div>
        {data.lateArrival > 0 && <span className="text-red-500 text-[10px]">L</span>}
      </div>
    );
  };

  const getCellClass = (data: DailyData) => {
    if (data.isWeekend) return 'bg-gray-100';
    if (data.status === 'absent') return 'bg-red-50';
    if (data.lateArrival > 0) return 'bg-yellow-50';
    return 'bg-white';
  };

  // Generate array of days 1-31
  const days = Array.from({ length: report?.daysInMonth || 31 }, (_, i) => i + 1);

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6 gap-4">
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

      {/* Report Content */}
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
        <div ref={printRef} className="bg-white rounded-lg shadow overflow-hidden">
          {/* Report Header */}
          <div className="p-6 border-b print:p-4">
            <div className="text-center">
              <h2 className="text-xl font-bold">Monthly Attendance Register</h2>
              <p className="text-gray-600 mt-1">
                {monthName} {year} | {selectedDepartment ? departments.find(d => d.id === selectedDepartment)?.name || 'Department' : 'All Departments'}
              </p>
            </div>
          </div>

          {/* Report Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-2 py-3 text-left font-semibold sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                    Employee
                  </th>
                  <th className="px-2 py-3 text-center font-semibold min-w-[60px]">Code</th>
                  {days.map((day) => (
                    <th key={day} className="px-1 py-3 text-center font-semibold min-w-[36px]">
                      <div>{day}</div>
                      <div className="text-[10px] text-gray-500 font-normal">
                        {getDayShortName(day)}
                      </div>
                    </th>
                  ))}
                  <th className="px-2 py-3 text-center font-semibold min-w-[60px]">Present</th>
                  <th className="px-2 py-3 text-center font-semibold min-w-[50px]">Absent</th>
                  <th className="px-2 py-3 text-center font-semibold min-w-[50px]">Late</th>
                  <th className="px-2 py-3 text-center font-semibold min-w-[70px]">Hours</th>
                </tr>
              </thead>
              <tbody>
                {report?.reportData.map((row, index) => (
                  <tr key={row.employee.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-2 py-2 sticky left-0 bg-inherit z-10 border-r">
                      <div className="font-medium text-sm">{row.employee.name}</div>
                      <div className="text-[10px] text-gray-500">{row.employee.department}</div>
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-xs">
                      {row.employee.employeeCode}
                    </td>
                    {row.dailyData.map((data) => (
                      <td
                        key={data.day}
                        className={`px-1 py-2 text-center border-r border-gray-100 ${getCellClass(data)}`}
                      >
                        {getCellContent(data)}
                      </td>
                    ))}
                    <td className="px-2 py-2 text-center font-medium text-green-600">
                      {row.summary.presentDays}
                    </td>
                    <td className="px-2 py-2 text-center font-medium text-red-600">
                      {row.summary.absentDays}
                    </td>
                    <td className="px-2 py-2 text-center font-medium text-yellow-600">
                      {row.summary.lateDays}
                    </td>
                    <td className="px-2 py-2 text-center font-mono text-xs">
                      {row.summary.totalWorkingHours.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="p-4 border-t bg-gray-50 text-xs">
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <span className="font-bold text-red-500">A</span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-red-500 font-bold">L</span>
                <span>Late</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-yellow-50 border block"></span>
                <span>Late Arrival</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-red-50 border block"></span>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-4 h-4 bg-gray-100 border block"></span>
                <span>Weekend</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { landscape; }
          body * {
            visibility: hidden;
          }
          [ref="printRef"], [ref="printRef"] * {
            visibility: visible;
          }
          [ref="printRef"] {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};
