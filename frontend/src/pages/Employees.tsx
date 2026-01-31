import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Filter,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Mail,
  User,
  ChevronDown,
  Building2,
  Briefcase,
  Upload,
  Key,
  Download
} from 'lucide-react';
import { employeesAPI, departmentsAPI, branchesAPI, shiftsAPI } from '../services/api';
import { Employee, Department, Branch, Shift } from '../types';

export const Employees = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Bulk/Delete state
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
  }, [page, searchTerm, selectedDepartment, statusFilter]);

  const downloadBankTemplate = () => {
    const headers = ['EmployeeCode', 'BankName', 'AccountNumber', 'IFSCCode', 'PANNumber'];
    const dummy = ['EMP001', 'HDFC Bank', '1234567890', 'HDFC0001234', 'ABCDE1234F'];
    const csvContent = [headers.join(','), dummy.join(',')].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bank_details_template.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleImportBank = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const rows = text.split('\n').map(r => r.trim()).filter(r => r);
        if (rows.length < 2) { alert('Empty file'); return; }

        const headers = rows[0].split(',').map(h => h.trim().toLowerCase());
        const records: any[] = [];

        for (let i = 1; i < rows.length; i++) {
          const cols = rows[i].split(',').map(c => c.trim());
          if (cols.length < 2) continue;

          const rec: any = {};
          // Simple Map or Fallback
          const getIdx = (key: string) => headers.findIndex(h => h.includes(key));

          rec.employeeCode = cols[headers.includes('employeecode') ? headers.indexOf('employeecode') : 0]; // Default col 0
          rec.bankName = cols[getIdx('bank')] || cols[1];
          rec.accountNumber = cols[getIdx('account')] || cols[2];
          rec.ifscCode = cols[getIdx('ifsc')] || cols[3];
          rec.panNumber = cols[getIdx('pan')] || cols[4];

          if (rec.employeeCode) records.push(rec);
        }

        if (records.length === 0) { alert('No valid records found'); return; }

        if (confirm(`Importing ${records.length} bank records. Ensure CSV format: EmployeeCode, BankName, AccountNo, IFSC, PAN. Continue?`)) {
          await employeesAPI.importBankDetails({ records });
          alert('Import Successful');
          fetchEmployees();
        }
      } catch (error) {
        console.error(error);
        alert('Import Failed');
      }
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  const handleRepairLogins = async () => {
    if (confirm('Create login accounts for employees missing them? Default password = Employee Code.')) {
      try {
        const res = await employeesAPI.repairUserAccounts();
        alert(res.data.message);
      } catch (e) {
        alert('Repair failed');
      }
    }
  };

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = { page: page.toString(), limit: '10' };
      if (searchTerm) params.search = searchTerm;
      if (selectedDepartment) params.departmentId = selectedDepartment;

      const response = await employeesAPI.getAll(params);
      let emps = response.data.employees;

      // Client-side status filtering if API doesn't support it yet
      if (statusFilter !== 'all') {
        const isActive = statusFilter === 'active';
        emps = emps.filter((e: Employee) => e.isActive === isActive);
      }

      setEmployees(emps);
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <h1 className="text-2xl font-bold text-gray-800">Employees</h1>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">

          {/* Departments Dropdown */}
          <div className="relative">
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-40 p-2.5 pr-8 cursor-pointer"
            >
              <option value="">All Departments</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Roles Dropdown (Mock) */}
          <div className="relative">
            <select className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-32 p-2.5 pr-8 cursor-pointer">
              <option>All Roles</option>
              <option>Manager</option>
              <option>Employee</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Status Dropdown */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-36 p-2.5 pr-8 cursor-pointer"
            >
              <option value="all">Status: All</option>
              <option value="active">Status: Active</option>
              <option value="inactive">Status: Inactive</option>
            </select>
            <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-gray-500 pointer-events-none" />
          </div>

          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block pl-10 p-2.5 w-48"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 w-full lg:w-auto">
          {selectedIds.length > 0 && (
            <button
              onClick={() => setShowBulkModal(true)}
              className="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center gap-2 px-3 py-2"
            >
              <Edit className="w-4 h-4" /> Bulk Edit
            </button>
          )}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportBank}
            className="hidden"
            accept=".csv"
          />
          <button
            onClick={downloadBankTemplate}
            className="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200"
            title="Download Template"
          >
            <Download className="w-4 h-4" /> Template
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200"
          >
            <Upload className="w-4 h-4" /> Import Bank Details
          </button>
          <button
            onClick={handleRepairLogins}
            className="text-gray-600 hover:text-blue-600 font-medium text-sm flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-200"
          >
            <Key className="w-4 h-4" /> Fix Logins
          </button>
          <button
            onClick={() => navigate('/employees/new')}
            className="w-full lg:w-auto text-white bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-300 font-medium rounded-lg text-sm px-5 py-2.5 flex items-center justify-center gap-2 transition-all"
          >
            <Plus className="w-4 h-4" /> Add Employee
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-400 uppercase bg-white border-b border-gray-100">
                <tr>
                  <th scope="col" className="p-4 w-4">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={employees.length > 0 && selectedIds.length === employees.length}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                      />
                    </div>
                  </th>
                  <th scope="col" className="px-6 py-3 font-medium">Photo</th>
                  <th scope="col" className="px-6 py-3 font-medium">Name</th>
                  <th scope="col" className="px-6 py-3 font-medium">Employee ID</th>
                  <th scope="col" className="px-6 py-3 font-medium">Department</th>
                  <th scope="col" className="px-6 py-3 font-medium">Role</th>
                  <th scope="col" className="px-6 py-3 font-medium">Status</th>
                  <th scope="col" className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {employees.map((employee) => (
                  <tr key={employee.id} className="bg-white border-b hover:bg-gray-50 transition-colors">
                    <td className="w-4 p-4">
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(employee.id)}
                          onChange={() => toggleSelect(employee.id)}
                          className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                        {employee.firstName?.[0]}{employee.lastName?.[0]}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-gray-900">{employee.firstName} {employee.lastName}</div>
                      <div className="text-xs text-gray-400 flex items-center gap-1 mt-0.5">
                        {employee.email || 'No email'}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-gray-600">
                      {employee.employeeCode}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {employee.department?.name || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4 text-gray-600">
                      {/* Fallback role display */}
                      {employee.designation?.name || 'Employee'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${employee.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                        {employee.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => navigate(`/employees/edit/${employee.id}`)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <Edit className="w-4 h-4" />
                        </button>
                        <button onClick={() => setShowDeleteConfirm(employee.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {employees.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-400 text-sm">
                      No employees found matching your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Showing <span className="font-semibold text-gray-900">{(page - 1) * 10 + 1}</span> to <span className="font-semibold text-gray-900">{Math.min(page * 10, (page - 1) * 10 + employees.length)}</span> of <span className="font-semibold text-gray-900">?</span> entries
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-3 py-1 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              Previous
            </button>
            <button className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm">
              {page}
            </button>
            <button
              onClick={() => setPage(p => p + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50 disabled:opacity-50 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-sm w-full shadow-2xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Employee?</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete this employee? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-4 py-2 text-white bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Update Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-gray-900">Bulk Edit ({selectedIds.length} selected)</h3>
              <button onClick={() => setShowBulkModal(false)} className="text-gray-400 hover:text-gray-600">
                <User className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {/* Branch */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Branch</label>
                <select
                  value={bulkData.branchId}
                  onChange={(e) => setBulkData({ ...bulkData, branchId: e.target.value })}
                  className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">No Change</option>
                  {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              {/* Department */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={bulkData.departmentId}
                  onChange={(e) => setBulkData({ ...bulkData, departmentId: e.target.value })}
                  className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">No Change</option>
                  {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={bulkData.isActive}
                  onChange={(e) => setBulkData({ ...bulkData, isActive: e.target.value })}
                  className="w-full rounded-lg border-gray-300 text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">No Change</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
            </div>
            <div className="p-6 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-gray-600 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg text-sm font-medium">
                Cancel
              </button>
              <button
                onClick={handleBulkUpdate}
                disabled={isBulkUpdating}
                className="px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg text-sm font-medium disabled:bg-blue-400"
              >
                {isBulkUpdating ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
