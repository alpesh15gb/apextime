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
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
    });
  };

  const rawDates: any[] = data?.dates || [];
  const dates = rawDates.map((d: any) => ({
    ...d,
    dateKey: `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`,
  }));
  const groups: any[] = data?.groups || [];
  const totalDays = dates.length;

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
              <input type="checkbox" checked={onlyTillToday} onChange={e => setOnlyTillToday(e.target.checked)} className="rounded border-slate-500" />
              Till Today
            </label>
            <button data-testid="generate-btn" onClick={fetchData}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 rounded text-xs font-bold transition-colors">Generate</button>
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
            <div key={gIdx} className="print-page">
              {/* ALL days in ONE table — no pagination */}
              <table className="reg-table">
                <thead>
                  {/* Department header + day numbers */}
                  <tr className="dept-row">
                    <td className="dept-cell" colSpan={2}>
                      <strong>Dep : {group.name}</strong>
                    </td>
                    {dates.map((d: any, i: number) => (
                      <td key={i} className={`day-hdr ${d.dayName === 'Sun' ? 'sun' : ''}`}>{d.day}</td>
                    ))}
                    <td className="sum-hdr">P</td>
                    <td className="sum-hdr">A</td>
                    <td className="sum-hdr">Hrs</td>
                  </tr>
                </thead>
                <tbody>
                  {group.employees.map((emp: any, eIdx: number) => (
                    <>
                      {/* IN row */}
                      <tr key={`in-${eIdx}`} className="in-row" data-testid={`emp-in-${eIdx}`}>
                        <td className="info-cell" rowSpan={2}>
                          <div className="emp-name">{emp.employee.name}</div>
                          <div className="emp-code">{emp.employee.employeeCode}</div>
                        </td>
                        <td className="io-label">IN</td>
                        {dates.map((d: any, dIdx: number) => {
                          const dd = emp.dailyData.find((x: any) => x.dateKey === d.dateKey);
                          const isOff = d.dayName === 'Sun' || dd?.isHoliday;
                          return (
                            <td key={dIdx} className={`tc ${isOff ? 'sun' : ''}`}>
                              {dd?.firstIn ? formatTime(dd.firstIn) : ''}
                            </td>
                          );
                        })}
                        <td className="sv sp" rowSpan={2}>{emp.summary.presentDays}</td>
                        <td className="sv sa" rowSpan={2}>{emp.summary.absentDays}</td>
                        <td className="sv sh" rowSpan={2}>{emp.summary.totalWorkingHours.toFixed(1)}</td>
                      </tr>
                      {/* OUT row */}
                      <tr key={`out-${eIdx}`} className="out-row" data-testid={`emp-out-${eIdx}`}>
                        <td className="io-label">OUT</td>
                        {dates.map((d: any, dIdx: number) => {
                          const dd = emp.dailyData.find((x: any) => x.dateKey === d.dateKey);
                          const isOff = d.dayName === 'Sun' || dd?.isHoliday;
                          const noOut = dd?.firstIn && !dd?.lastOut;
                          return (
                            <td key={dIdx} className={`tc ${isOff ? 'sun' : ''} ${noOut ? 'no-out' : ''}`}>
                              {dd?.lastOut ? formatTime(dd.lastOut) : ''}
                            </td>
                          );
                        })}
                      </tr>
                    </>
                  ))}
                </tbody>
              </table>
              <div className="page-ftr">
                <span>Period: {data.startDate} to {data.endDate}</span>
                <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @page { size: A4 landscape; margin: 4mm 3mm; }
          .print-page { page-break-after: always; }
          .print-page:last-child { page-break-after: auto; }
        }
        @media screen {
          .print-page { margin: 10px auto; padding: 10px; border: 1px solid #bbb; background: #fff; overflow-x: auto; }
        }

        .reg-table {
          width: 100%;
          border-collapse: collapse;
          font-family: Arial, Helvetica, sans-serif;
          table-layout: fixed;
        }
        .reg-table td { border: 1px solid #555; text-align: center; vertical-align: middle; overflow: hidden; }

        /* Department + day header */
        .dept-cell {
          text-align: left !important;
          padding: 3px 4px !important;
          font-size: 9px;
          font-weight: 800;
          width: 90px;
          min-width: 90px;
        }
        .day-hdr {
          font-size: ${totalDays > 20 ? '7px' : '9px'};
          font-weight: 900;
          padding: 3px 0;
          color: #111;
          width: ${totalDays > 20 ? '20px' : '28px'};
        }
        .day-hdr.sun { background: #777 !important; color: #fff !important; }
        .sum-hdr { font-size: 6px; font-weight: 900; width: 22px; min-width: 22px; background: #eee; padding: 2px; }

        /* Employee info */
        .info-cell {
          text-align: left !important;
          padding: 2px 3px !important;
          width: 75px;
          min-width: 75px;
          max-width: 75px;
        }
        .emp-name { font-size: ${totalDays > 20 ? '6px' : '8px'}; font-weight: 800; color: #111; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .emp-code { font-size: ${totalDays > 20 ? '5.5px' : '7px'}; font-weight: 600; color: #555; }

        .io-label {
          width: 18px; min-width: 18px;
          font-size: ${totalDays > 20 ? '6px' : '8px'};
          font-weight: 900;
          padding: 1px;
        }

        /* Time cells */
        .tc {
          font-size: ${totalDays > 20 ? '5.5px' : '7px'};
          font-weight: 500;
          color: #222;
          padding: 1px 0;
          white-space: nowrap;
          letter-spacing: -0.3px;
        }
        .tc.sun { background: #777 !important; color: #fff !important; }
        .tc.no-out { color: #c00; font-weight: 700; }

        .in-row td { border-bottom: 0.5px solid #aaa; }
        .out-row td { border-top: 0.5px solid #aaa; }

        /* Summary */
        .sv { font-weight: 900; padding: 1px; background: #f5f5f5; vertical-align: middle; width: 22px; min-width: 22px; }
        .sp { color: #166534; font-size: 7px; }
        .sa { color: #991b1b; font-size: 7px; }
        .sh { color: #1e40af; font-size: 6px; }

        .page-ftr { display: flex; justify-content: space-between; font-size: 6px; color: #999; margin-top: 3px; }
      `}</style>
    </div>
  );
};
