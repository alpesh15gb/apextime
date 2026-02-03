import { useEffect, useState } from 'react';
import {
  Download,
  Calendar,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  MoreVertical,
  Zap,
  Activity,
  Search
} from 'lucide-react';
import { attendanceAPI, employeesAPI, departmentsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { AttendanceLog } from '../types';

export const Attendance = () => {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date().toLocaleDateString('en-CA'),
    endDate: new Date().toLocaleDateString('en-CA'),
    employeeId: user?.role === 'employee' ? user.employeeId : '',
    departmentId: '',
  });
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    fetchAttendance();
    fetchEmployees();
    fetchDepartments();
  }, [page, filters]);

  const fetchAttendance = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {
        page: page.toString(),
        limit: '20',
        startDate: filters.startDate,
        endDate: filters.endDate,
      };
      if (filters.employeeId) params.employeeId = filters.employeeId;
      if (filters.departmentId) params.departmentId = filters.departmentId;

      const response = await attendanceAPI.getAll(params);
      setLogs(response.data.logs);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployees = async () => {
    try {
      const response = await employeesAPI.getAll({ limit: '100' });
      setEmployees(response.data.employees);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    }
  };

  const getStatusBadge = (log: AttendanceLog) => {
    if (log.status === 'absent') {
      return (
        <div className="badge border border-red-100 bg-red-50 text-red-600 uppercase tracking-widest text-[9px] font-black px-3 py-1">
          Absent
        </div>
      );
    }
    if (log.lateArrival > 0) {
      return (
        <div className="badge border border-orange-100 bg-orange-50 text-orange-600 uppercase tracking-widest text-[9px] font-black px-3 py-1">
          Late ({log.lateArrival}m)
        </div>
      );
    }
    if (log.earlyDeparture > 0) {
      return (
        <div className="badge border border-yellow-100 bg-yellow-50 text-yellow-600 uppercase tracking-widest text-[9px] font-black px-3 py-1">
          Left Early ({log.earlyDeparture}m)
        </div>
      );
    }
    return (
      <div className="badge border border-emerald-100 bg-emerald-50 text-emerald-600 uppercase tracking-widest text-[9px] font-black px-3 py-1">
        Present
      </div>
    );
  };

  return (
    <div className="space-y-10 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter italic">Daily <span className="text-blue-600">Attendance</span></h1>
          <p className="text-[10px] font-black text-gray-400 mt-2 uppercase tracking-[0.3em]">Daily attendance logs</p>
        </div>

        <button className="px-6 py-3 bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center gap-2 shadow-sm transition-all hover:scale-105">
          <Download className="w-4 h-4" /> Export
        </button>
      </div>

      {/* Control Deck */}
      <div className="app-card p-10 bg-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gray-50 rounded-full blur-2xl -mr-10 -mt-10"></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
          <div className="space-y-4">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3 text-blue-500" /> Start Date
            </label>
            <input
              type="date"
              value={filters.startDate}
              onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50/50 border border-transparent rounded-2xl text-[11px] font-black text-gray-800 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50 outline-none transition-all uppercase tracking-wider"
            />
          </div>

          <div className="space-y-4">
            <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3 text-blue-500" /> End Date
            </label>
            <input
              type="date"
              value={filters.endDate}
              onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              className="w-full px-5 py-4 bg-gray-50/50 border border-transparent rounded-2xl text-[11px] font-black text-gray-800 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50 outline-none transition-all uppercase tracking-wider"
            />
          </div>

          {user?.role !== 'employee' && (
            <>
              <div className="space-y-4">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee</label>
                <div className="relative">
                  <select
                    value={filters.employeeId}
                    onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50/50 border border-transparent rounded-2xl text-[11px] font-black text-gray-800 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none cursor-pointer uppercase tracking-wider"
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp: any) => (
                      <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
                    ))}
                  </select>
                  <Filter className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                <div className="relative">
                  <select
                    value={filters.departmentId}
                    onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50/50 border border-transparent rounded-2xl text-[11px] font-black text-gray-800 focus:bg-white focus:border-blue-100 focus:ring-4 focus:ring-blue-50 outline-none transition-all appearance-none cursor-pointer uppercase tracking-wider"
                  >
                    <option value="">All Departments</option>
                    {departments.map((dept: any) => (
                      <option key={dept.id} value={dept.id}>{dept.name}</option>
                    ))}
                  </select>
                  <Activity className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Log Matrix */}
      <div className="app-card overflow-hidden shadow-xl shadow-gray-100/50 border-none">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-6">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-gray-100 rounded-full"></div>
              <div className="w-16 h-16 border-4 border-blue-600 rounded-full border-t-transparent animate-spin absolute top-0 left-0"></div>
            </div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] animate-pulse">Loading...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/40 border-b border-gray-50">
                    <th className="table-header px-8 w-1/4">Employee</th>
                    <th className="table-header w-1/6">Date</th>
                    <th className="table-header">Check In</th>
                    <th className="table-header">Check Out</th>
                    <th className="table-header">Duration</th>
                    <th className="table-header text-right px-8">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="table-row group hover:bg-blue-50/5 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center space-x-5">
                          <div className="w-12 h-12 rounded-2xl bg-white border border-gray-100 flex items-center justify-center font-black text-gray-400 text-xs shadow-sm group-hover:scale-110 transition-transform duration-300 group-hover:border-blue-100 group-hover:text-blue-500">
                            {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-black text-gray-900 tracking-tight">{log.employee?.firstName} {log.employee?.lastName}</p>
                            <p className="text-[9px] text-gray-400 font-bold mt-1 uppercase tracking-[0.2em] group-hover:text-blue-400 transition-colors">ID: {log.employee?.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className="text-[11px] font-black text-gray-600 uppercase tracking-wider bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-100">
                          {log.date ? String(log.date).split('T')[0].split('-').reverse().join('/') : '--'}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        {log.firstIn ? (
                          <div className="flex items-center space-x-3 group/time">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center group-hover/time:bg-emerald-500 transition-colors">
                              <Clock className="w-4 h-4 text-emerald-600 group-hover/time:text-white transition-colors" />
                            </div>
                            <span className="text-xs font-black text-gray-700 font-mono tracking-tight">
                              {log.firstIn ? new Date(log.firstIn).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-gray-300 uppercase tracking-widest px-3 py-1 bg-gray-50 rounded-lg">Null</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {log.lastOut ? (
                          <div className="flex items-center space-x-3 group/time">
                            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center group-hover/time:bg-red-500 transition-colors">
                              <Clock className="w-4 h-4 text-red-600 group-hover/time:text-white transition-colors" />
                            </div>
                            <span className="text-xs font-black text-gray-700 font-mono tracking-tight">
                              {log.lastOut ? new Date(log.lastOut).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-black text-orange-300 uppercase tracking-widest px-3 py-1 bg-orange-50/50 rounded-lg">Active</span>
                        )}
                      </td>
                      <td className="px-6 py-5">
                        {log.workingHours ? (
                          <div className="flex items-center space-x-1">
                            <span className="text-lg font-black text-gray-900 tracking-tighter italic">{log.workingHours.toFixed(1)}</span>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-wide mt-1">hrs</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-200 tracking-widest">--.--</span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right">
                        {getStatusBadge(log)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-8 border-t border-gray-50 bg-gray-50/30 flex items-center justify-between">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">
                Subset {logs.length ? (page - 1) * 20 + 1 : 0} - {(page - 1) * 20 + logs.length} (Index {page})
              </p>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all text-gray-500 shadow-sm"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="w-10 h-10 flex items-center justify-center bg-white border border-gray-200 rounded-xl disabled:opacity-30 hover:bg-blue-50 hover:border-blue-100 hover:text-blue-600 transition-all text-gray-500 shadow-sm"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
