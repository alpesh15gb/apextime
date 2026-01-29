import { useEffect, useState } from 'react';
import {
  Search,
  Calendar,
  Download,
  Filter,
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  MoreVertical,
} from 'lucide-react';
import { attendanceAPI, employeesAPI, departmentsAPI } from '../services/api';
import { AttendanceLog } from '../types';

export const Attendance = () => {
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    employeeId: '',
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
        <div className="badge border border-red-100 bg-red-50 text-red-600 uppercase tracking-widest text-[10px] font-black">
          Absent
        </div>
      );
    }
    if (log.lateArrival > 0) {
      return (
        <div className="badge border border-orange-100 bg-orange-50 text-orange-600 uppercase tracking-widest text-[10px] font-black">
          Late ({log.lateArrival}m)
        </div>
      );
    }
    if (log.earlyDeparture > 0) {
      return (
        <div className="badge border border-yellow-100 bg-yellow-50 text-yellow-600 uppercase tracking-widest text-[10px] font-black">
          Early ({log.earlyDeparture}m)
        </div>
      );
    }
    return (
      <div className="badge border border-emerald-100 bg-emerald-50 text-emerald-600 uppercase tracking-widest text-[10px] font-black">
        Present
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Attendance Logs</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Daily records of check-ins and check-outs</p>
        </div>
        <button className="btn-app bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 flex items-center space-x-2">
          <Download className="w-5 h-5" />
          <span>Export Logs</span>
        </button>
      </div>

      {/* Modern Filter Strip */}
      <div className="app-card p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period From</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-red-100 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Period To</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-red-100 transition-all"
              />
            </div>
          </div>
          <div className="space-y-2 flex flex-col">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee</label>
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-red-100 appearance-none"
            >
              <option value="">All Members</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName}</option>
              ))}
            </select>
          </div>
          <div className="space-y-2 flex flex-col">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="w-full px-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold text-gray-600 focus:ring-2 focus:ring-red-100 appearance-none"
            >
              <option value="">All Departments</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Log Table */}
      <div className="app-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-600 border-opacity-20 border-r-2 border-r-red-600"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Log Database...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="table-header">Employee</th>
                    <th className="table-header">Date</th>
                    <th className="table-header">Clock In</th>
                    <th className="table-header">Clock Out</th>
                    <th className="table-header">Work Hours</th>
                    <th className="table-header text-right">Status Badge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.map((log) => (
                    <tr key={log.id} className="table-row group">
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 ring-2 ring-gray-50 group-hover:ring-red-100 transition-all">
                            {log.employee?.firstName?.[0]}{log.employee?.lastName?.[0]}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-gray-900 leading-none">{log.employee?.firstName} {log.employee?.lastName}</p>
                            <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase tracking-tighter">Code: {log.employee?.employeeCode}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-bold text-gray-600">
                          {new Date(log.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                      </td>
                      <td className="px-6 py-4 transition-all group-hover:pl-8">
                        {log.firstIn ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                            </div>
                            <span className="text-xs font-black text-gray-700">
                              {log.firstIn.match(/T(\d{2}:\d{2})/)?.[1] || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-300">No Record</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.lastOut ? (
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-lg bg-red-50 flex items-center justify-center">
                              <Clock className="w-3.5 h-3.5 text-red-600" />
                            </div>
                            <span className="text-xs font-black text-gray-700">
                              {log.lastOut.match(/T(\d{2}:\d{2})/)?.[1] || '-'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-300">Pending</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {log.workingHours ? (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-sm font-extrabold text-gray-900">{log.workingHours.toFixed(1)}</span>
                            <span className="text-[10px] font-black text-gray-400 uppercase">hrs</span>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-400 tracking-widest opacity-30">---</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {getStatusBadge(log)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-8 border-t border-gray-50 bg-gray-50/20 flex items-center justify-between">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Records {logs.length ? (page - 1) * 20 + 1 : 0} - {(page - 1) * 20 + logs.length} (Page {page})
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-3 bg-white border border-gray-100 rounded-2xl disabled:opacity-30 hover:bg-gray-50 transition-all text-gray-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-3 bg-white border border-gray-100 rounded-2xl disabled:opacity-30 hover:bg-gray-50 transition-all text-gray-600"
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
