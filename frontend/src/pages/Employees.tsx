import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  Building2,
  Briefcase,
  Clock,
  XCircle,
  CheckCircle,
  AlertCircle,
  MoreVertical,
  Mail,
  User,
} from 'lucide-react';
import { employeesAPI, departmentsAPI, branchesAPI, shiftsAPI } from '../services/api';
import { Employee, Department, Branch, Shift } from '../types';

export const Employees = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [bulkData, setBulkData] = useState({
    branchId: '',
    departmentId: '',
    shiftId: '',
    isActive: '',
  });
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
    fetchBranches();
    fetchShifts();
  }, [page, searchTerm, selectedDepartment]);

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: page.toString(), limit: '20' };
      if (searchTerm) params.search = searchTerm;
      if (selectedDepartment) params.departmentId = selectedDepartment;

      const response = await employeesAPI.getAll(params);
      setEmployees(response.data.employees);
      setTotalPages(response.data.pagination.totalPages);
    } catch (error) {
      console.error('Failed to fetch employees:', error);
    } finally {
      setLoading(false);
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

  const fetchBranches = async () => {
    try {
      const response = await branchesAPI.getAll();
      setBranches(response.data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    }
  };

  const fetchShifts = async () => {
    try {
      const response = await shiftsAPI.getAll();
      setShifts(response.data);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === employees.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(employees.map(e => e.id));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async () => {
    try {
      setIsBulkUpdating(true);
      const data: any = {};
      if (bulkData.branchId) data.branchId = bulkData.branchId;
      if (bulkData.departmentId) data.departmentId = bulkData.departmentId;
      if (bulkData.shiftId) data.shiftId = bulkData.shiftId;
      if (bulkData.isActive) data.isActive = bulkData.isActive === 'true';

      await employeesAPI.bulkUpdate(selectedIds, data);
      setShowBulkModal(false);
      setSelectedIds([]);
      fetchEmployees();
    } catch (error) {
      console.error('Bulk update failed:', error);
      alert('Bulk update failed');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await employeesAPI.delete(id);
      setShowDeleteConfirm(null);
      fetchEmployees();
    } catch (error) {
      console.error('Failed to delete employee:', error);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Team Management</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Manage all your employees and their departments</p>
        </div>
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="btn-app bg-white border border-gray-100 text-gray-600 hover:bg-gray-50 flex-1 sm:flex-none"
            >
              <Edit className="w-4 h-4" />
              <span>Bulk Edit ({selectedIds.length})</span>
            </button>
          )}
          <button
            onClick={() => navigate('/employees/new')}
            className="btn-app btn-app-primary flex-1 sm:flex-none"
          >
            <Plus className="w-5 h-5" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Modern Filter Bar */}
      <div className="app-card p-6 flex flex-col lg:flex-row gap-6 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, ID or email..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-red-100"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-4 w-full lg:w-auto">
          <div className="relative flex-1 lg:w-64">
            <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-sm appearance-none focus:ring-2 focus:ring-red-100 text-gray-600 font-medium"
            >
              <option value="">All Departments</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>{dept.name}</option>
              ))}
            </select>
          </div>
          <button className="p-3 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors">
            <Filter className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Employee List Table */}
      <div className="app-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-600 border-opacity-20 border-r-2 border-r-red-600"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Retrieving Team Data...</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50/30">
                    <th className="px-6 py-4 text-left w-12">
                      <input
                        type="checkbox"
                        checked={employees.length > 0 && selectedIds.length === employees.length}
                        onChange={toggleSelectAll}
                        className="rounded-lg border-gray-200 text-red-600 focus:ring-red-500 w-5 h-5 transition-all"
                      />
                    </th>
                    <th className="table-header">Personnel</th>
                    <th className="table-header">ID/Code</th>
                    <th className="table-header">Work Location</th>
                    <th className="table-header">Department</th>
                    <th className="table-header">Status</th>
                    <th className="table-header text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {employees.map((employee) => (
                    <tr key={employee.id} className={`table-row group ${selectedIds.includes(employee.id) ? 'bg-red-50/30' : ''}`}>
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.id)}
                          onChange={() => toggleSelect(employee.id)}
                          className="rounded-lg border-gray-200 text-red-600 focus:ring-red-500 w-5 h-5 transition-all"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 ring-2 ring-gray-50 group-hover:ring-red-100 transition-all">
                            {employee.firstName[0]}{employee.lastName[0]}
                          </div>
                          <div>
                            <p className="text-sm font-extrabold text-gray-900 leading-none">{employee.firstName} {employee.lastName}</p>
                            <div className="flex items-center text-[10px] text-gray-400 font-bold mt-1 uppercase">
                              <Mail className="w-2.5 h-2.5 mr-1" />
                              {employee.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-black text-gray-400 tracking-tighter bg-gray-50 px-2 py-1 rounded-lg">
                          {employee.employeeCode}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <p className="text-xs font-bold text-gray-700">{employee.branch?.name || 'Headquarters'}</p>
                        <p className="text-[10px] text-gray-400 font-bold italic">Region A</p>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center text-xs font-bold text-gray-600">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mr-2"></div>
                          {employee.department?.name || 'Unassigned'}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className={`badge ${employee.isActive ? 'badge-success' : 'badge-warning'} uppercase tracking-widest text-[10px] font-black`}>
                          {employee.isActive ? 'Active' : 'On Leave'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <button
                            onClick={() => navigate(`/employees/edit/${employee.id}`)}
                            className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-xl transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setShowDeleteConfirm(employee.id)}
                            className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-8 border-t border-gray-50 bg-gray-50/20 flex items-center justify-between">
              <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                Viewing Page {page} of {totalPages}
              </p>
              <div className="flex items-center space-x-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-3 bg-white border border-gray-100 rounded-2xl disabled:opacity-30 hover:bg-gray-50 transition-all text-gray-600"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <div className="flex space-x-1.5">
                  {[...Array(Math.min(5, totalPages))].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${page === i + 1 ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-white text-gray-400 border border-gray-100 hover:bg-gray-50'}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
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

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] p-10 max-w-sm w-full shadow-2xl animate-in zoom-in duration-300">
            <div className="w-20 h-20 bg-red-50 rounded-[24px] flex items-center justify-center mx-auto mb-8">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-2xl font-extrabold text-gray-900 mb-4 text-center tracking-tight">Remove Member?</h3>
            <p className="text-sm font-bold text-gray-400 mb-10 text-center leading-relaxed">
              Are you sure you want to delete this employee? This action is permanent and will wipe all associated logs.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setShowDeleteConfirm(null)} className="py-4 bg-gray-50 text-gray-600 font-black text-xs uppercase tracking-widest rounded-3xl hover:bg-gray-100 transition-all">Cancel</button>
              <button onClick={() => handleDelete(showDeleteConfirm)} className="py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-3xl hover:bg-red-700 shadow-xl shadow-red-200 transition-all">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal (Simplified modern version) */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center">
              <div>
                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Bulk Edit</h3>
                <p className="text-sm font-bold text-gray-400 mt-1">Updating {selectedIds.length} members at once</p>
              </div>
              <button onClick={() => setShowBulkModal(false)} className="p-3 bg-gray-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all">
                <XCircle className="w-8 h-8" />
              </button>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Branch</label>
                  <select
                    value={bulkData.branchId}
                    onChange={(e) => setBulkData({ ...bulkData, branchId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  >
                    <option value="">No Change</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                  <select
                    value={bulkData.departmentId}
                    onChange={(e) => setBulkData({ ...bulkData, departmentId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  >
                    <option value="">No Change</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Working Shift</label>
                  <select
                    value={bulkData.shiftId}
                    onChange={(e) => setBulkData({ ...bulkData, shiftId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  >
                    <option value="">No Change</option>
                    {shifts.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employment Status</label>
                  <select
                    value={bulkData.isActive}
                    onChange={(e) => setBulkData({ ...bulkData, isActive: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  >
                    <option value="">No Change</option>
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="p-10 bg-gray-50 flex justify-end space-x-4">
              <button
                onClick={() => setShowBulkModal(false)}
                className="px-8 py-4 bg-white border border-gray-200 text-gray-600 font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-gray-50 transition-all"
                disabled={isBulkUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={isBulkUpdating || (!bulkData.branchId && !bulkData.departmentId && !bulkData.shiftId && !bulkData.isActive)}
                className="px-10 py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-red-700 shadow-xl shadow-red-200 transition-all disabled:bg-gray-300 disabled:shadow-none"
              >
                {isBulkUpdating ? 'Saving...' : 'Confirm Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
