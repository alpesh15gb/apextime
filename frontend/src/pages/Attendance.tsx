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

  const getStatusIcon = (status: string, lateArrival: number, earlyDeparture: number) => {
    if (status === 'absent') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    }
    if (lateArrival > 0 || earlyDeparture > 0) {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
    return <CheckCircle className="w-5 h-5 text-green-500" />;
  };

  const getStatusText = (log: AttendanceLog) => {
    if (log.status === 'absent') return 'Absent';
    if (log.lateArrival > 0) return `Late (${log.lateArrival}m)`;
    if (log.earlyDeparture > 0) return `Early (${log.earlyDeparture}m)`;
    return 'Present';
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Attendance Logs</h1>
        <button className="btn-secondary flex items-center space-x-2">
          <Download className="w-4 h-4" />
          <span>Export</span>
        </button>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="form-label">Start Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="form-label">End Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="form-input pl-10"
              />
            </div>
          </div>
          <div>
            <label className="form-label">Employee</label>
            <select
              value={filters.employeeId}
              onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
              className="form-input"
            >
              <option value="">All Employees</option>
              {employees.map((emp: any) => (
                <option key={emp.id} value={emp.id}>
                  {emp.firstName} {emp.lastName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="form-label">Department</label>
            <select
              value={filters.departmentId}
              onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
              className="form-input"
            >
              <option value="">All Departments</option>
              {departments.map((dept: any) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Attendance Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Employee</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Date</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">First IN</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Last OUT</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Working Hours</th>
                    <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <p className="font-medium">
                            {log.employee?.firstName} {log.employee?.lastName}
                          </p>
                          <p className="text-sm text-gray-500">{log.employee?.employeeCode}</p>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        {log.date.split('T')[0]}
                      </td>
                      <td className="py-3 px-4">
                        {log.firstIn ? (
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-green-600" />
                            {log.firstIn.match(/T(\d{2}:\d{2})/)?.[1] || '-'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.lastOut ? (
                          <span className="flex items-center">
                            <Clock className="w-4 h-4 mr-1 text-blue-600" />
                            {log.lastOut.match(/T(\d{2}:\d{2})/)?.[1] || '-'}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {log.workingHours ? (
                          <span className="font-mono">{log.workingHours.toFixed(2)}h</span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(log.status, log.lateArrival, log.earlyDeparture)}
                          <span
                            className={`text-sm font-medium ${
                              log.status === 'absent'
                                ? 'text-red-600'
                                : log.lateArrival > 0 || log.earlyDeparture > 0
                                ? 'text-yellow-600'
                                : 'text-green-600'
                            }`}
                          >
                            {getStatusText(log)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-2 border border-gray-300 rounded-md disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
