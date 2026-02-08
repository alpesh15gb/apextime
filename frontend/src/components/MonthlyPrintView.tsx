import { useState, useEffect, useRef } from 'react';
import { Printer, X, Loader2 } from 'lucide-react';
import { attendanceAPI } from '../services/api';

interface MonthlyPrintProps {
  month: number;
  year: number;
  departmentId?: string;
  branchId?: string;
  locationId?: string;
  onClose: () => void;
}

export const MonthlyPrintView = ({ month, year, departmentId, branchId, locationId, onClose }: MonthlyPrintProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const params: any = { month, year };
        if (departmentId) params.departmentId = departmentId;
        if (branchId) params.branchId = branchId;
        if (locationId) params.locationId = locationId;
        const res = await attendanceAPI.getMonthlyReport(params);
        setData(res.data);
      } catch (e) {
        console.error('Failed to load monthly data:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [month, year, departmentId, branchId, locationId]);

  const handlePrint = () => {
    window.print();
  };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
    });
  };

  const monthName = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getDayName = (day: number) => {
    const dt = new Date(year, month - 1, day);
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'][dt.getDay()];
  };

  const isSunday = (day: number) => new Date(year, month - 1, day).getDay() === 0;

  // Get employees from data
  const employees = data?.reportData || [];

  // Split employees into pages (max 4 employees per page for A4 portrait readability)
  const EMPS_PER_PAGE = 4;
  const empChunks: any[][] = [];
  for (let i = 0; i < employees.length; i += EMPS_PER_PAGE) {
    empChunks.push(employees.slice(i, i + EMPS_PER_PAGE));
  }

  // Get day data for an employee
  const getDayData = (emp: any, day: number) => {
    return emp.dailyData?.find((d: any) => d.day === day);
  };

  // Calculate total hours for an employee
  const getTotalHours = (emp: any) => {
    return emp.summary?.totalWorkingHours?.toFixed(1) || '0.0';
  };

  const dateRange = `01/${String(month).padStart(2, '0')}/${year} - ${daysInMonth}/${String(month).padStart(2, '0')}/${year}`;

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto" data-testid="monthly-print-view">
      {/* Toolbar */}
      <div className="print-hide sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Printer className="w-5 h-5" />
          <span className="font-bold text-sm">List of Logs - {monthName} {year}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="print-btn"
            onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-sm font-semibold transition-colors"
          >
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button
            data-testid="close-print-btn"
            onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-lg text-sm font-semibold transition-colors"
          >
            <X className="w-4 h-4" /> Close
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="ml-3 text-slate-500">Loading report data...</span>
        </div>
      ) : !data || employees.length === 0 ? (
        <div className="flex items-center justify-center h-96">
          <span className="text-slate-500">No attendance data found for {monthName} {year}</span>
        </div>
      ) : (
        <div className="print-content">
          {empChunks.map((chunk, pageIdx) => (
            <div key={pageIdx} className="print-page">
              {/* Title */}
              <div className="page-header">
                <div className="page-title">List of Logs</div>
                <div className="page-meta">
                  <span>{dateRange}</span>
                  {empChunks.length > 1 && <span>Page {pageIdx + 1} of {empChunks.length}</span>}
                  <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
                </div>
              </div>

              {/* Main Table - Days as rows, Employees as columns */}
              <table className="log-table">
                <thead>
                  {/* Employee number row */}
                  <tr className="emp-num-row">
                    <th className="day-col" rowSpan={2}></th>
                    <th className="dayname-col" rowSpan={2}></th>
                    {chunk.map((emp: any, idx: number) => (
                      <th key={idx} className="emp-header" colSpan={2}>
                        {emp.employee?.employeeCode || `#${pageIdx * EMPS_PER_PAGE + idx + 1}`}
                      </th>
                    ))}
                    {pageIdx === empChunks.length - 1 && (
                      <th className="dur-header" rowSpan={2}>Duration</th>
                    )}
                  </tr>
                  {/* Employee name row */}
                  <tr className="emp-name-row">
                    {chunk.map((emp: any, idx: number) => (
                      <th key={idx} className="emp-name" colSpan={2}>
                        {emp.employee?.name || 'Unknown'}
                      </th>
                    ))}
                  </tr>
                  {/* In/Out sub-header */}
                  <tr className="inout-header-row">
                    <th className="day-col">Day</th>
                    <th className="dayname-col"></th>
                    {chunk.map((_: any, idx: number) => (
                      <>
                        <th key={`in-${idx}`} className="in-hdr">In</th>
                        <th key={`out-${idx}`} className="out-hdr">Out</th>
                      </>
                    ))}
                    {pageIdx === empChunks.length - 1 && <th className="dur-hdr"></th>}
                  </tr>
                </thead>
                <tbody>
                  {days.map(day => {
                    const sunday = isSunday(day);
                    return (
                      <tr key={day} className={sunday ? 'sunday-row' : ''} data-testid={`print-day-${day}`}>
                        <td className="day-num">{day}</td>
                        <td className="day-name">{getDayName(day)}</td>
                        {chunk.map((emp: any, eIdx: number) => {
                          const dd = getDayData(emp, day);
                          const isOff = dd?.isSunday || dd?.isHoliday || sunday;
                          const noOut = dd?.firstIn && !dd?.lastOut;
                          return (
                            <>
                              <td key={`in-${eIdx}`} className={`time-in ${isOff ? 'off' : ''} ${!dd?.firstIn && !isOff ? 'absent' : ''}`}>
                                {isOff ? '' : dd?.firstIn ? formatTime(dd.firstIn) : ''}
                              </td>
                              <td key={`out-${eIdx}`} className={`time-out ${isOff ? 'off' : ''} ${noOut ? 'no-out' : ''} ${!dd?.firstIn && !isOff ? 'absent' : ''}`}>
                                {isOff ? '' : dd?.lastOut ? formatTime(dd.lastOut) : dd?.firstIn ? '' : ''}
                              </td>
                            </>
                          );
                        })}
                        {pageIdx === empChunks.length - 1 && <td className="dur-cell"></td>}
                      </tr>
                    );
                  })}
                  {/* Summary / Duration Row */}
                  <tr className="summary-row">
                    <td className="summary-label" colSpan={2}>Duration</td>
                    {chunk.map((emp: any, idx: number) => (
                      <td key={idx} className="summary-val" colSpan={2}>
                        {getTotalHours(emp)} hrs
                      </td>
                    ))}
                    {pageIdx === empChunks.length - 1 && <td className="dur-cell"></td>}
                  </tr>
                  {/* Present / Absent Count */}
                  <tr className="count-row">
                    <td className="summary-label" colSpan={2}>Present</td>
                    {chunk.map((emp: any, idx: number) => (
                      <td key={idx} className="count-present" colSpan={2}>
                        {emp.summary?.presentDays ?? 0}
                      </td>
                    ))}
                    {pageIdx === empChunks.length - 1 && <td className="dur-cell"></td>}
                  </tr>
                  <tr className="count-row">
                    <td className="summary-label" colSpan={2}>Absent</td>
                    {chunk.map((emp: any, idx: number) => (
                      <td key={idx} className="count-absent" colSpan={2}>
                        {emp.summary?.absentDays ?? 0}
                      </td>
                    ))}
                    {pageIdx === empChunks.length - 1 && <td className="dur-cell"></td>}
                  </tr>
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { margin: 0; padding: 0; }
          @page {
            size: A4 portrait;
            margin: 6mm 4mm;
          }
          .print-page {
            page-break-after: always;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
        }

        @media screen {
          .print-page {
            max-width: 1100px;
            margin: 16px auto;
            padding: 16px;
            border: 1px solid #d1d5db;
            background: white;
          }
        }

        .page-header {
          text-align: center;
          margin-bottom: 6px;
          border-bottom: 2px solid #111;
          padding-bottom: 4px;
        }
        .page-title {
          font-size: 13px;
          font-weight: 900;
          color: #111;
          letter-spacing: 1px;
          text-transform: uppercase;
        }
        .page-meta {
          display: flex;
          justify-content: space-between;
          font-size: 8px;
          color: #555;
          margin-top: 2px;
          font-weight: 600;
        }

        .log-table {
          width: 100%;
          border-collapse: collapse;
          font-family: 'Courier New', 'Consolas', monospace;
          font-size: 7.5px;
          line-height: 1.1;
        }

        .log-table th,
        .log-table td {
          border: 1px solid #999;
          text-align: center;
          vertical-align: middle;
          padding: 1.5px 1px;
        }

        /* Header styling */
        .emp-num-row th {
          background: #1a1a2e;
          color: #fff;
          font-size: 7px;
          font-weight: 700;
          padding: 2px 1px;
          letter-spacing: 0.3px;
        }
        .emp-name-row th {
          background: #16213e;
          color: #fff;
          font-size: 6.5px;
          font-weight: 600;
          padding: 2px 1px;
          max-width: 70px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .emp-header {
          min-width: 65px;
        }
        .emp-name {
          min-width: 65px;
        }
        .inout-header-row th {
          background: #e8e8e8;
          color: #333;
          font-size: 6px;
          font-weight: 800;
          padding: 1px;
          text-transform: uppercase;
        }
        .in-hdr { color: #166534 !important; min-width: 32px; }
        .out-hdr { color: #991b1b !important; min-width: 32px; }

        /* Day columns */
        .day-col {
          width: 18px;
          min-width: 18px;
          background: #f8f8f8 !important;
          color: #333 !important;
          font-weight: 800;
          font-size: 7px;
        }
        .dayname-col {
          width: 16px;
          min-width: 16px;
          background: #f8f8f8 !important;
          color: #666 !important;
          font-weight: 600;
          font-size: 6px;
        }
        .day-num {
          font-weight: 800;
          font-size: 7.5px;
          color: #222;
          background: #f8f8f8;
          width: 18px;
        }
        .day-name {
          font-weight: 600;
          font-size: 6px;
          color: #666;
          background: #f8f8f8;
          width: 16px;
        }

        /* Time cells */
        .time-in {
          color: #166534;
          font-weight: 500;
          font-size: 7px;
          white-space: nowrap;
        }
        .time-out {
          color: #1e3a5f;
          font-weight: 500;
          font-size: 7px;
          white-space: nowrap;
        }
        .off {
          background: #f1f1f1 !important;
          color: #bbb !important;
        }
        .absent {
          color: #ddd !important;
        }
        .no-out {
          color: #dc2626 !important;
          font-weight: 700;
        }

        /* Sunday row */
        .sunday-row {
          background: #fff5f5 !important;
        }
        .sunday-row .day-num,
        .sunday-row .day-name {
          background: #fee2e2 !important;
          color: #dc2626 !important;
        }

        /* Alternating row colors */
        tbody tr:nth-child(even):not(.sunday-row):not(.summary-row):not(.count-row) {
          background: #fafafa;
        }

        /* Duration/Summary */
        .dur-header, .dur-hdr, .dur-cell {
          width: 30px;
          min-width: 30px;
          background: #f0f0f0 !important;
          font-size: 6px;
        }

        .summary-row {
          border-top: 2px solid #333 !important;
        }
        .summary-row td {
          background: #e8f5e9 !important;
          font-weight: 800;
          font-size: 7.5px;
          color: #1a5276;
          padding: 3px 2px;
        }
        .summary-label {
          text-align: right !important;
          padding-right: 4px !important;
          font-size: 7px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .count-row td {
          background: #f8f9fa !important;
          font-weight: 700;
          font-size: 7px;
          padding: 2px;
        }
        .count-present {
          color: #166534 !important;
        }
        .count-absent {
          color: #991b1b !important;
        }
      `}</style>
    </div>
  );
};
