import { useState, useEffect, useRef } from 'react';
import { Printer, X, Download, Loader2 } from 'lucide-react';
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
  const printRef = useRef<HTMLDivElement>(null);

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
  const daysInMonth = data?.daysInMonth || new Date(year, month, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  // Split days into chunks for readable A4 (max 16 days per page to fit properly)
  const DAYS_PER_PAGE = 16;
  const dayChunks: number[][] = [];
  for (let i = 0; i < days.length; i += DAYS_PER_PAGE) {
    dayChunks.push(days.slice(i, i + DAYS_PER_PAGE));
  }

  const getDayLabel = (day: number) => {
    const dt = new Date(year, month - 1, day);
    const names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return names[dt.getDay()];
  };

  const isSunday = (day: number) => {
    return new Date(year, month - 1, day).getDay() === 0;
  };

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto" data-testid="monthly-print-view">
      {/* Toolbar - hidden during print */}
      <div className="print-hide sticky top-0 z-50 bg-slate-900 text-white px-6 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-3">
          <Printer className="w-5 h-5" />
          <span className="font-bold text-sm">Monthly Attendance Report - {monthName} {year}</span>
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
      ) : !data ? (
        <div className="flex items-center justify-center h-96">
          <span className="text-red-500">Failed to load data</span>
        </div>
      ) : (
        <div ref={printRef} className="print-content">
          {dayChunks.map((chunk, chunkIdx) => (
            <div key={chunkIdx} className="print-page">
              {/* Header */}
              <div className="report-header">
                <h1 className="report-title">Monthly Attendance Register</h1>
                <div className="report-subtitle">
                  <span>{monthName} {year}</span>
                  <span>Days {chunk[0]} - {chunk[chunk.length - 1]}</span>
                  {dayChunks.length > 1 && <span>Page {chunkIdx + 1} of {dayChunks.length}</span>}
                </div>
              </div>

              {/* Table */}
              <table className="muster-table">
                <thead>
                  <tr>
                    <th className="col-sno" rowSpan={2}>S.No</th>
                    <th className="col-emp" rowSpan={2}>Employee</th>
                    <th className="col-code" rowSpan={2}>Code</th>
                    {chunk.map(day => (
                      <th
                        key={day}
                        className={`col-day ${isSunday(day) ? 'sunday' : ''}`}
                        colSpan={2}
                      >
                        <div className="day-num">{day}</div>
                        <div className="day-label">{getDayLabel(day)}</div>
                      </th>
                    ))}
                    {chunkIdx === dayChunks.length - 1 && (
                      <>
                        <th className="col-summary" rowSpan={2}>Present</th>
                        <th className="col-summary" rowSpan={2}>Absent</th>
                        <th className="col-summary" rowSpan={2}>Late</th>
                        <th className="col-summary" rowSpan={2}>Total Hrs</th>
                      </>
                    )}
                  </tr>
                  <tr>
                    {chunk.map(day => (
                      <th key={`io-${day}`} className={`col-inout ${isSunday(day) ? 'sunday' : ''}`} colSpan={1}>
                        <span className="in-label">In</span>
                      </th>
                    ))}
                    {chunk.map(day => (
                      <></>
                    ))}
                  </tr>
                  {/* Separate In/Out subheader */}
                  <tr className="subheader-row">
                    <td colSpan={3}></td>
                    {chunk.map(day => (
                      <>
                        <td key={`in-h-${day}`} className={`sub-in ${isSunday(day) ? 'sunday' : ''}`}>In</td>
                        <td key={`out-h-${day}`} className={`sub-out ${isSunday(day) ? 'sunday' : ''}`}>Out</td>
                      </>
                    ))}
                    {chunkIdx === dayChunks.length - 1 && <td colSpan={4}></td>}
                  </tr>
                </thead>
                <tbody>
                  {data.reportData?.map((emp: any, idx: number) => (
                    <tr key={idx} data-testid={`print-row-${idx}`}>
                      <td className="col-sno">{idx + 1}</td>
                      <td className="col-emp">{emp.employee?.name}</td>
                      <td className="col-code">{emp.employee?.employeeCode}</td>
                      {chunk.map(day => {
                        const dayData = emp.dailyData?.find((d: any) => d.day === day);
                        const isOff = dayData?.isSunday || dayData?.isHoliday;
                        return (
                          <>
                            <td key={`in-${day}`} className={`time-cell ${isOff ? 'off-day' : ''} ${dayData?.status === 'absent' ? 'absent-cell' : ''}`}>
                              {isOff ? '' : dayData?.firstIn ? formatTime(dayData.firstIn) : dayData?.status === 'absent' ? 'A' : '-'}
                            </td>
                            <td key={`out-${day}`} className={`time-cell ${isOff ? 'off-day' : ''} ${dayData?.status === 'absent' ? 'absent-cell' : ''} ${!dayData?.lastOut && dayData?.firstIn ? 'no-out' : ''}`}>
                              {isOff ? '' : dayData?.lastOut ? formatTime(dayData.lastOut) : dayData?.firstIn ? 'X' : dayData?.status === 'absent' ? 'A' : '-'}
                            </td>
                          </>
                        );
                      })}
                      {chunkIdx === dayChunks.length - 1 && (
                        <>
                          <td className="summary-cell present">{emp.summary?.presentDays ?? 0}</td>
                          <td className="summary-cell absent">{emp.summary?.absentDays ?? 0}</td>
                          <td className="summary-cell late">{emp.summary?.lateDays ?? 0}</td>
                          <td className="summary-cell hours">{(emp.summary?.totalWorkingHours ?? 0).toFixed(1)}</td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Footer */}
              <div className="report-footer">
                <div className="legend">
                  <span className="legend-item"><span className="legend-box off-day"></span> Off Day / Holiday</span>
                  <span className="legend-item"><span className="legend-box absent-legend"></span> A = Absent</span>
                  <span className="legend-item"><span className="legend-box no-out-legend"></span> X = No Out Punch</span>
                </div>
                <div className="print-date">Generated: {new Date().toLocaleDateString('en-IN')} | ApexTime Payroll</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { margin: 0; padding: 0; }
          @page {
            size: A4 landscape;
            margin: 8mm 6mm;
          }
          .print-page {
            page-break-after: always;
            page-break-inside: avoid;
          }
          .print-page:last-child {
            page-break-after: auto;
          }
        }

        @media screen {
          .print-page {
            max-width: 1200px;
            margin: 20px auto;
            padding: 20px;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            background: white;
          }
        }

        .report-header {
          text-align: center;
          margin-bottom: 8px;
          padding-bottom: 6px;
          border-bottom: 2px solid #1e293b;
        }
        .report-title {
          font-size: 14px;
          font-weight: 800;
          color: #0f172a;
          margin: 0;
          letter-spacing: 0.5px;
        }
        .report-subtitle {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
          color: #64748b;
          margin-top: 3px;
          font-weight: 600;
        }

        .muster-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 7px;
          font-family: 'Courier New', monospace;
        }
        .muster-table th, .muster-table td {
          border: 1px solid #cbd5e1;
          padding: 2px 1px;
          text-align: center;
          vertical-align: middle;
        }
        .muster-table thead th {
          background: #1e293b;
          color: white;
          font-weight: 700;
          font-size: 6.5px;
          white-space: nowrap;
        }
        .subheader-row td {
          background: #f1f5f9;
          font-weight: 700;
          font-size: 6px;
          color: #475569;
          padding: 1px;
        }
        .sub-in { color: #059669 !important; }
        .sub-out { color: #dc2626 !important; }

        .col-sno { width: 22px; min-width: 22px; }
        .col-emp {
          width: 80px;
          min-width: 80px;
          max-width: 80px;
          text-align: left !important;
          padding-left: 3px !important;
          font-weight: 600;
          font-size: 6.5px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .col-code { width: 38px; font-size: 6px; }
        .col-day {
          min-width: 42px;
          padding: 1px 0;
        }
        .day-num { font-size: 7px; font-weight: 800; }
        .day-label { font-size: 5px; opacity: 0.8; }
        .col-inout { font-size: 5.5px; }
        .col-summary {
          width: 30px;
          min-width: 30px;
          background: #f8fafc !important;
          color: #0f172a !important;
          font-size: 6.5px;
        }

        .time-cell {
          font-size: 6.5px;
          font-weight: 500;
          color: #334155;
          white-space: nowrap;
          letter-spacing: -0.3px;
        }
        .off-day {
          background: #f1f5f9 !important;
          color: #94a3b8 !important;
        }
        .absent-cell {
          color: #dc2626 !important;
          font-weight: 700;
        }
        .no-out {
          color: #f59e0b !important;
          font-weight: 700;
        }
        .sunday {
          background: #fef2f2 !important;
        }
        .summary-cell {
          font-weight: 700;
          font-size: 7px;
          background: #f8fafc;
        }
        .summary-cell.present { color: #059669; }
        .summary-cell.absent { color: #dc2626; }
        .summary-cell.late { color: #f59e0b; }
        .summary-cell.hours { color: #1e40af; }

        tbody tr:nth-child(even) {
          background: #fafbfc;
        }
        tbody tr:hover {
          background: #f0fdf4;
        }

        .report-footer {
          margin-top: 8px;
          padding-top: 4px;
          border-top: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 7px;
          color: #94a3b8;
        }
        .legend {
          display: flex;
          gap: 12px;
        }
        .legend-item {
          display: flex;
          align-items: center;
          gap: 3px;
        }
        .legend-box {
          display: inline-block;
          width: 8px;
          height: 8px;
          border: 1px solid #cbd5e1;
          border-radius: 1px;
        }
        .off-day-legend { background: #f1f5f9; }
        .absent-legend { background: #fecaca; }
        .no-out-legend { background: #fef3c7; }
      `}</style>
    </div>
  );
};
