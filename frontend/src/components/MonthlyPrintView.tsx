import { useState, useEffect } from 'react';
import { Printer, X, Loader2, Calendar } from 'lucide-react';
import { attendanceAPI } from '../services/api';

interface PrintProps {
  onClose: () => void;
  defaultMonth?: number;
  defaultYear?: number;
  departmentId?: string;
  branchId?: string;
  locationId?: string;
}

export const MonthlyPrintView = ({ onClose, defaultMonth, defaultYear, departmentId, branchId, locationId }: PrintProps) => {
  const now = new Date();
  const defMonth = defaultMonth || now.getMonth() + 1;
  const defYear = defaultYear || now.getFullYear();
  const defDays = new Date(defYear, defMonth, 0).getDate();

  const [startDate, setStartDate] = useState(`${defYear}-${String(defMonth).padStart(2, '0')}-01`);
  const [endDate, setEndDate] = useState(`${defYear}-${String(defMonth).padStart(2, '0')}-${String(defDays).padStart(2, '0')}`);
  const [groupBy, setGroupBy] = useState<'department' | 'branch'>('department');
  const [onlyTillToday, setOnlyTillToday] = useState(true);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      // If "only till today" is on, clamp endDate to today
      let effectiveEnd = endDate;
      if (onlyTillToday) {
        const todayStr = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
        if (endDate > todayStr) effectiveEnd = todayStr;
      }
      const params: any = { startDate, endDate: effectiveEnd, groupBy };
      if (departmentId) params.departmentId = departmentId;
      if (branchId) params.branchId = branchId;
      if (locationId) params.locationId = locationId;
      const res = await attendanceAPI.getDateRangeReport(params);
      setData(res.data);
    } catch (e) {
      console.error('Failed to load data:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const h = d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata' });
    return h;
  };

  const dates: any[] = (data?.dates || []).map((d: any) => ({
    ...d,
    dateKey: `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`,
  }));
  const groups: any[] = data?.groups || [];

  // Split dates into chunks for A4 landscape pages (max 16 days per page)
  const DAYS_PER_PAGE = 16;
  const dateChunks: any[][] = [];
  for (let i = 0; i < dates.length; i += DAYS_PER_PAGE) {
    dateChunks.push(dates.slice(i, i + DAYS_PER_PAGE));
  }
  if (dateChunks.length === 0) dateChunks.push([]);

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto" data-testid="monthly-print-view">
      {/* Toolbar */}
      <div className="print-hide sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <span className="font-bold text-sm">Attendance Register</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">From</label>
            <input data-testid="print-start-date" type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="h-8 px-2 bg-slate-800 border border-slate-600 rounded text-xs text-white outline-none" />
            <label className="text-xs text-slate-400">To</label>
            <input data-testid="print-end-date" type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="h-8 px-2 bg-slate-800 border border-slate-600 rounded text-xs text-white outline-none" />
            <select data-testid="print-group-by" value={groupBy} onChange={e => setGroupBy(e.target.value as any)}
              className="h-8 px-2 bg-slate-800 border border-slate-600 rounded text-xs text-white outline-none">
              <option value="department">Department Wise</option>
              <option value="branch">Branch Wise</option>
            </select>
            <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer">
              <input type="checkbox" checked={onlyTillToday} onChange={e => setOnlyTillToday(e.target.checked)}
                className="rounded border-slate-500" />
              Till Today Only
            </label>
            <button data-testid="generate-btn" onClick={fetchData}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-bold transition-colors">
              Generate
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button data-testid="print-btn" onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded text-sm font-semibold transition-colors">
            <Printer className="w-4 h-4" /> Print / Save PDF
          </button>
          <button data-testid="close-print-btn" onClick={onClose}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded text-sm font-semibold transition-colors">
            <X className="w-4 h-4" /> Close
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
          <span className="ml-3 text-slate-500">Generating report...</span>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-96 flex-col gap-3">
          <Calendar className="w-10 h-10 text-slate-300" />
          <span className="text-slate-400 text-sm">Select date range and click Generate</span>
        </div>
      ) : (
        <div className="print-content">
          {groups.map((group: any, gIdx: number) => (
            dateChunks.map((chunk, cIdx) => {
              const isLastChunk = cIdx === dateChunks.length - 1;
              return (
                <div key={`${gIdx}-${cIdx}`} className="print-page">
                  <table className="reg-table">
                    {/* Department header row */}
                    <thead>
                      <tr className="dept-row">
                        <td className="dept-cell" colSpan={2}>
                          <strong>Dep : {group.name}</strong>
                        </td>
                        <td className="io-label-cell"></td>
                        {chunk.map((d: any, i: number) => (
                          <td key={i} className={`day-hdr ${d.dayName === 'Sun' ? 'sun' : ''}`}>
                            <div className="day-num">{d.day}</div>
                          </td>
                        ))}
                        {isLastChunk && (
                          <>
                            <td className="sum-hdr">P</td>
                            <td className="sum-hdr">A</td>
                            <td className="sum-hdr">Hrs</td>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {group.employees.map((emp: any, eIdx: number) => {
                        return (
                          <>
                            {/* IN Row - Employee Name */}
                            <tr key={`in-${eIdx}`} className="in-row" data-testid={`emp-in-${eIdx}`}>
                              <td className="info-cell name-cell" rowSpan={2}>
                                <div className="emp-name">Name : {emp.employee.name}</div>
                                <div className="emp-code">E.Code : {emp.employee.employeeCode}</div>
                              </td>
                              <td className="io-label in-label">IN</td>
                              {chunk.map((d: any, dIdx: number) => {
                                const dd = emp.dailyData.find((x: any) => x.dateKey === d.dateKey);
                                const isOff = d.dayName === 'Sun' || dd?.isHoliday;
                                return (
                                  <td key={dIdx} className={`time-cell ${isOff ? 'sun' : ''}`}>
                                    {dd?.firstIn ? formatTime(dd.firstIn) : ''}
                                  </td>
                                );
                              })}
                              {isLastChunk && (
                                <>
                                  <td className="sum-val sum-p" rowSpan={2}>{emp.summary.presentDays}</td>
                                  <td className="sum-val sum-a" rowSpan={2}>{emp.summary.absentDays}</td>
                                  <td className="sum-val sum-h" rowSpan={2}>{emp.summary.totalWorkingHours.toFixed(1)}</td>
                                </>
                              )}
                            </tr>
                            {/* OUT Row - Employee Code */}
                            <tr key={`out-${eIdx}`} className="out-row" data-testid={`emp-out-${eIdx}`}>
                              <td className="io-label out-label">OUT</td>
                              {chunk.map((d: any, dIdx: number) => {
                                const dd = emp.dailyData.find((x: any) => x.dateKey === d.dateKey);
                                const isOff = d.dayName === 'Sun' || dd?.isHoliday;
                                const noOut = dd?.firstIn && !dd?.lastOut;
                                return (
                                  <td key={dIdx} className={`time-cell ${isOff ? 'sun' : ''} ${noOut ? 'no-out' : ''}`}>
                                    {dd?.lastOut ? formatTime(dd.lastOut) : ''}
                                  </td>
                                );
                              })}
                            </tr>
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                  <div className="page-ftr">
                    <span>Period: {data.startDate} to {data.endDate}</span>
                    {dateChunks.length > 1 && <span>Page {cIdx + 1} of {dateChunks.length}</span>}
                    <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
                  </div>
                </div>
              );
            })
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 landscape; margin: 5mm 4mm; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
        @media screen {
          .print-page { max-width: 1140px; margin: 12px auto; padding: 12px; border: 1px solid #bbb; background: #fff; }
        }

        .reg-table {
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, Helvetica, sans-serif;
          font-size: 9px;
        }
        .reg-table td {
          border: 1.5px solid #333;
          text-align: center;
          vertical-align: middle;
        }

        /* Department header */
        .dept-row td {
          background: #fff;
          padding: 6px 4px;
          font-size: 11px;
        }
        .dept-cell {
          text-align: left !important;
          font-size: 12px;
          padding: 8px 8px !important;
        }
        .day-hdr {
          font-size: 14px;
          font-weight: 900;
          padding: 6px 2px;
          min-width: 34px;
          color: #111;
        }
        .day-hdr.sun {
          background: #888 !important;
          color: #fff !important;
        }
        .sum-hdr {
          font-size: 8px;
          font-weight: 800;
          padding: 4px 2px;
          min-width: 28px;
          background: #eee;
        }

        /* Employee rows */
        .info-cell {
          text-align: left !important;
          padding: 4px 6px !important;
          width: 140px;
          min-width: 140px;
          max-width: 140px;
          vertical-align: middle;
        }
        .emp-name {
          font-size: 10px;
          font-weight: 700;
          color: #111;
          margin-bottom: 4px;
        }
        .emp-code {
          font-size: 9px;
          font-weight: 600;
          color: #444;
        }

        .io-label {
          width: 28px;
          min-width: 28px;
          font-size: 10px;
          font-weight: 900;
          padding: 4px 2px;
        }
        .in-label {
          color: #111;
        }
        .out-label {
          color: #111;
        }

        .time-cell {
          font-size: 8.5px;
          font-weight: 500;
          color: #222;
          padding: 3px 1px;
          white-space: nowrap;
          min-width: 34px;
        }
        .time-cell.sun {
          background: #888 !important;
          color: #fff !important;
        }
        .time-cell.no-out {
          color: #cc0000;
          font-weight: 700;
        }

        .in-row td {
          border-bottom: 0.5px solid #999;
        }
        .out-row td {
          border-top: 0.5px solid #999;
        }

        /* Summary */
        .sum-val {
          font-size: 9px;
          font-weight: 800;
          padding: 2px;
          background: #f5f5f5;
          vertical-align: middle;
        }
        .sum-p { color: #166534; }
        .sum-a { color: #991b1b; }
        .sum-h { color: #1e40af; }

        .page-ftr {
          display: flex;
          justify-content: space-between;
          font-size: 7px;
          color: #999;
          margin-top: 4px;
          padding-top: 2px;
        }
      `}</style>
    </div>
  );
};
