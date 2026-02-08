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
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { startDate, endDate, groupBy };
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

  const handleGenerate = () => { fetchData(); };

  const formatTime = (dateStr: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Kolkata'
    });
  };

  const dates: any[] = data?.dates || [];
  const groups: any[] = data?.groups || [];

  // For horizontal layout: split dates into chunks that fit A4 landscape
  // A4 landscape ~ 297mm wide. With employee col (~100px) + date cols (~38px each for In/Out)
  // Max ~14 date columns per page
  const DATES_PER_PAGE = 16;
  const dateChunks: any[][] = [];
  for (let i = 0; i < dates.length; i += DATES_PER_PAGE) {
    dateChunks.push(dates.slice(i, i + DATES_PER_PAGE));
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-white overflow-auto" data-testid="monthly-print-view">
      {/* Toolbar */}
      <div className="print-hide sticky top-0 z-50 bg-slate-900 text-white px-4 py-3 flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5" />
            <span className="font-bold text-sm">Attendance Register</span>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">From</label>
            <input
              data-testid="print-start-date"
              type="date"
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="h-8 px-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white outline-none"
            />
            <label className="text-xs text-slate-400">To</label>
            <input
              data-testid="print-end-date"
              type="date"
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="h-8 px-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white outline-none"
            />
            <select
              data-testid="print-group-by"
              value={groupBy}
              onChange={e => setGroupBy(e.target.value as any)}
              className="h-8 px-2 bg-slate-800 border border-slate-600 rounded-lg text-xs text-white outline-none"
            >
              <option value="department">Department Wise</option>
              <option value="branch">Branch Wise</option>
            </select>
            <button
              data-testid="generate-btn"
              onClick={handleGenerate}
              className="h-8 px-4 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-xs font-bold transition-colors"
            >
              Generate
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            data-testid="print-btn"
            onClick={() => window.print()}
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
          <span className="ml-3 text-slate-500">Generating report...</span>
        </div>
      ) : !data ? (
        <div className="flex items-center justify-center h-96 flex-col gap-3">
          <Calendar className="w-10 h-10 text-slate-300" />
          <span className="text-slate-400 text-sm">Select date range and click Generate</span>
        </div>
      ) : (
        <div className="print-content">
          {groups.map((group, gIdx) => (
            dateChunks.map((chunk, cIdx) => {
              const pageKey = `${gIdx}-${cIdx}`;
              const isLastChunk = cIdx === dateChunks.length - 1;
              return (
                <div key={pageKey} className="print-page">
                  {/* Page Header */}
                  <div className="page-hdr">
                    <div className="page-title">ATTENDANCE REGISTER</div>
                    <div className="page-meta-row">
                      <span className="meta-label">{groupBy === 'branch' ? 'Branch' : 'Department'}: <strong>{group.name}</strong></span>
                      <span className="meta-label">Period: <strong>{startDate}</strong> to <strong>{endDate}</strong></span>
                      {dateChunks.length > 1 && <span className="meta-label">Days {chunk[0].day}-{chunk[chunk.length - 1].day} | Page {cIdx + 1}/{dateChunks.length}</span>}
                    </div>
                  </div>

                  {/* Table: Employees as rows, Dates as columns */}
                  <table className="reg-table">
                    <thead>
                      {/* Date header row */}
                      <tr className="date-row">
                        <th className="sno-col" rowSpan={3}>S.No</th>
                        <th className="name-col" rowSpan={3}>Employee Name</th>
                        <th className="code-col" rowSpan={3}>Code</th>
                        {chunk.map((d: any, i: number) => (
                          <th
                            key={i}
                            colSpan={2}
                            className={`date-col ${d.dayName === 'Sun' ? 'sun-col' : ''}`}
                          >
                            {d.day}
                          </th>
                        ))}
                        {isLastChunk && (
                          <>
                            <th className="sum-col" rowSpan={3}>P</th>
                            <th className="sum-col" rowSpan={3}>A</th>
                            <th className="sum-col" rowSpan={3}>Hrs</th>
                          </>
                        )}
                      </tr>
                      {/* Day name row */}
                      <tr className="dayname-row">
                        {chunk.map((d: any, i: number) => (
                          <th
                            key={i}
                            colSpan={2}
                            className={`dayname-col ${d.dayName === 'Sun' ? 'sun-col' : ''}`}
                          >
                            {d.dayName}
                          </th>
                        ))}
                      </tr>
                      {/* In/Out row */}
                      <tr className="io-row">
                        {chunk.map((d: any, i: number) => (
                          <>
                            <th key={`in-${i}`} className={`in-h ${d.dayName === 'Sun' ? 'sun-col' : ''}`}>In</th>
                            <th key={`out-${i}`} className={`out-h ${d.dayName === 'Sun' ? 'sun-col' : ''}`}>Out</th>
                          </>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.employees.map((emp: any, eIdx: number) => (
                        <tr key={eIdx} data-testid={`print-emp-${eIdx}`}>
                          <td className="sno-cell">{eIdx + 1}</td>
                          <td className="name-cell">{emp.employee.name}</td>
                          <td className="code-cell">{emp.employee.employeeCode}</td>
                          {chunk.map((d: any, dIdx: number) => {
                            const dd = emp.dailyData.find((x: any) => x.dateKey === d.dateKey || (x.day === d.day && x.dayName === d.dayName));
                            const isOff = dd?.isSunday || dd?.isHoliday || d.dayName === 'Sun';
                            const noOut = dd?.firstIn && !dd?.lastOut;
                            return (
                              <>
                                <td key={`in-${dIdx}`} className={`t-cell ${isOff ? 'off' : ''} ${!dd?.firstIn && !isOff ? 'abs' : ''}`}>
                                  {isOff ? '' : dd?.firstIn ? formatTime(dd.firstIn) : ''}
                                </td>
                                <td key={`out-${dIdx}`} className={`t-cell ${isOff ? 'off' : ''} ${noOut ? 'no-out' : ''} ${!dd?.firstIn && !isOff ? 'abs' : ''}`}>
                                  {isOff ? '' : dd?.lastOut ? formatTime(dd.lastOut) : dd?.firstIn ? '' : ''}
                                </td>
                              </>
                            );
                          })}
                          {isLastChunk && (
                            <>
                              <td className="sum-p">{emp.summary.presentDays}</td>
                              <td className="sum-a">{emp.summary.absentDays}</td>
                              <td className="sum-h">{emp.summary.totalWorkingHours.toFixed(1)}</td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Footer */}
                  <div className="page-ftr">
                    <span>Printed: {new Date().toLocaleDateString('en-IN')}</span>
                    <span>ApexTime Payroll System</span>
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
          .print-page { max-width: 1180px; margin: 14px auto; padding: 14px; border: 1px solid #ccc; background: #fff; }
        }

        .page-hdr { text-align: center; margin-bottom: 5px; border-bottom: 2.5px solid #111; padding-bottom: 3px; }
        .page-title { font-size: 13px; font-weight: 900; color: #111; text-transform: uppercase; letter-spacing: 1.5px; }
        .page-meta-row { display: flex; justify-content: space-between; font-size: 8px; color: #444; margin-top: 2px; }
        .meta-label { font-weight: 500; }
        .meta-label strong { color: #111; }

        .reg-table { width: 100%; border-collapse: collapse; font-family: 'Courier New', monospace; font-size: 6.8px; line-height: 1.05; }
        .reg-table th, .reg-table td { border: 1px solid #888; text-align: center; vertical-align: middle; padding: 1.5px 0.5px; }

        /* Header rows */
        .date-row th { background: #1a1a2e; color: #fff; font-size: 7.5px; font-weight: 800; padding: 2px 0; }
        .dayname-row th { background: #16213e; color: #ccc; font-size: 5.5px; font-weight: 600; padding: 1px 0; }
        .io-row th { background: #eee; color: #444; font-size: 5.5px; font-weight: 800; text-transform: uppercase; padding: 1px 0; }
        .in-h { color: #166534 !important; }
        .out-h { color: #991b1b !important; }
        .sun-col { background: #3b0d0d !important; color: #ffaaaa !important; }

        /* Fixed columns */
        .sno-col, .sno-cell { width: 18px; min-width: 18px; font-size: 6.5px; }
        .name-col, .name-cell { width: 85px; min-width: 85px; max-width: 85px; text-align: left !important; padding-left: 3px !important; font-weight: 700; font-size: 6.5px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .code-col, .code-cell { width: 38px; min-width: 38px; font-size: 6px; font-weight: 600; }
        .date-col { min-width: 40px; }
        .sum-col { width: 24px; min-width: 24px; background: #f0f0f0 !important; color: #111 !important; font-size: 6px; }

        /* Data cells */
        .t-cell { font-size: 6.5px; font-weight: 500; color: #222; white-space: nowrap; min-width: 20px; }
        .off { background: #f0f0f0 !important; color: #bbb !important; }
        .abs { color: #ccc !important; }
        .no-out { color: #dc2626 !important; font-weight: 700; }

        /* Summary cells */
        .sum-p { font-weight: 800; font-size: 7px; color: #166534; background: #f0fdf4; }
        .sum-a { font-weight: 800; font-size: 7px; color: #991b1b; background: #fef2f2; }
        .sum-h { font-weight: 800; font-size: 7px; color: #1e40af; background: #eff6ff; }

        /* Row striping */
        tbody tr:nth-child(even) { background: #fafbfc; }
        tbody tr:hover { background: #f0fdf4; }

        .page-ftr { display: flex; justify-content: space-between; font-size: 7px; color: #999; margin-top: 4px; padding-top: 3px; border-top: 1px solid #ddd; }
      `}</style>
    </div>
  );
};
