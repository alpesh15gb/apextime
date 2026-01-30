import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Building2,
  Briefcase,
  Users,
} from 'lucide-react';
import { departmentsAPI, branchesAPI, employeesAPI } from '../services/api';

export const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [adminSearch, setAdminSearch] = useState('');
  const [formData, setFormData] = useState({ name: '', code: '', branchId: '', managerIds: [] as string[] });

  useEffect(() => {
    fetchDepartments();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const branchesRes = await branchesAPI.getAll();
      setBranches(branchesRes.data || []);
    } catch (e) { console.error('Fetch branches error', e); setBranches([]); }

    try {
      const employeesRes = await employeesAPI.getAll({ limit: '1000' });
      setEmployees(employeesRes.data.employees || employeesRes.data || []);
    } catch (e) { console.error('Fetch employees error', e); setEmployees([]); }
  };

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await departmentsAPI.getAll();
      setDepartments(response.data);
    } catch (error) {
      console.error('Failed to fetch departments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await departmentsAPI.update(editingId, formData);
      } else {
        await departmentsAPI.create(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', code: '', branchId: '', managerIds: [] });
      fetchDepartments();
    } catch (error) {
      console.error('Failed to save department:', error);
    }
  };

  const handleEdit = (dept: any) => {
    setFormData({
      name: dept.name,
      code: dept.code,
      branchId: dept.branchId || '',
      managerIds: dept.managers ? dept.managers.map((m: any) => m.id) : []
    });
    setEditingId(dept.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this department?')) return;
    try {
      await departmentsAPI.delete(id);
      fetchDepartments();
    } catch (error) {
      console.error('Failed to delete department:', error);
    }
  };

  // Helper to add manager
  const addManager = (id: string) => {
    if (!id) return;
    if (!formData.managerIds.includes(id)) {
      setFormData({ ...formData, managerIds: [...formData.managerIds, id] });
    }
  };

  // Helper to remove manager
  const removeManager = (id: string) => {
    setFormData({ ...formData, managerIds: formData.managerIds.filter(mid => mid !== id) });
  };

  const getEmployeeName = (id: string) => {
    const emp: any = employees.find((e: any) => e.id === id);
    return emp ? `${emp.firstName} ${emp.lastName}` : 'Unknown';
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Departments</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Manage and organize your company departments</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', code: '', branchId: '', managerIds: [] });
            setShowModal(true);
          }}
          className="px-6 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>New Department</span>
        </button>
      </div>

      {/* Grid List */}
      <div className="app-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600 border-opacity-20 border-r-2 border-r-blue-600"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Departments...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="table-header w-24">Code</th>
                  <th className="table-header">Department Name</th>
                  <th className="table-header">Managers</th>
                  <th className="table-header">Parent Branch</th>
                  <th className="table-header">Status</th>
                  <th className="table-header text-right">Settings</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {departments.map((dept: any) => (
                  <tr key={dept.id} className="table-row group">
                    <td className="px-6 py-5">
                      <span className="text-xs font-black text-gray-400 tracking-widest bg-gray-50 px-2 py-1 rounded-lg">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center font-bold text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">
                          <Briefcase className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-extrabold text-gray-800">{dept.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      {dept.managers && dept.managers.length > 0 ? (
                        <div className="flex -space-x-2 overflow-hidden">
                          {dept.managers.map((m: any) => (
                            <div key={m.id} title={`${m.firstName} ${m.lastName}`} className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600 cursor-help">
                              {m.firstName[0]}{m.lastName[0]}
                            </div>
                          ))}
                        </div>
                      ) : <span className="text-xs text-gray-400 font-bold">Unassigned</span>}
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2 text-xs font-bold text-gray-500">
                        <Building2 className="w-3.5 h-3.5 text-gray-300" />
                        <span>{dept.branch?.name || 'Main Office'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`badge ${dept.isActive ? 'badge-success' : 'badge-warning'} uppercase text-[10px] font-black tracking-widest`}>
                        {dept.isActive ? 'Operation' : 'Standby'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleEdit(dept)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-xl transition-all"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(dept.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {editingId ? 'Edit Department' : 'Create Department'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-500 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="e.g. Finance & Accounts"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">System Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="e.g. FIN-01"
                  required
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parent Branch</label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none"
                >
                  <option value="">Select Branch</option>
                  {Array.isArray(branches) && branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Admins</label>

                {/* Selected Managers List */}
                <div className="flex flex-wrap gap-2 mb-2">
                  {formData.managerIds.map(mid => (
                    <div key={mid} className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in zoom-in duration-200">
                      <span>{getEmployeeName(mid)}</span>
                      <button type="button" onClick={() => removeManager(mid)} className="hover:text-blue-900 transition-colors">
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Search Box */}
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Users className="h-4 w-4 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    placeholder="Search and add administrators..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full pl-11 pr-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  />

                  {/* Search Results Dropdown */}
                  {adminSearch && (
                    <div className="absolute z-10 w-full mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200">
                      {employees
                        .filter((e: any) =>
                          !formData.managerIds.includes(e.id) &&
                          (e.firstName + ' ' + e.lastName + ' ' + e.employeeCode).toLowerCase().includes(adminSearch.toLowerCase())
                        )
                        .map((e: any) => (
                          <button
                            key={e.id}
                            type="button"
                            onClick={() => { addManager(e.id); setAdminSearch(''); }}
                            className="w-full text-left px-5 py-3 hover:bg-blue-50 transition-colors flex items-center space-x-3"
                          >
                            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">
                              {e.firstName[0]}{e.lastName[0]}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-800">{e.firstName} {e.lastName}</p>
                              <p className="text-[10px] text-gray-400 font-medium tracking-tight">#{e.employeeCode}</p>
                            </div>
                          </button>
                        ))
                      }
                      {employees.filter((e: any) =>
                        !formData.managerIds.includes(e.id) &&
                        (e.firstName + ' ' + e.lastName + ' ' + e.employeeCode).toLowerCase().includes(adminSearch.toLowerCase())
                      ).length === 0 && (
                          <div className="p-5 text-center text-[10px] text-gray-400 font-black uppercase tracking-widest">
                            No matching employees found
                          </div>
                        )}
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-6 flex flex-col space-y-3">
                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Save Changes' : 'Add Department'}</span>
                </button>
                <button type="button" onClick={() => setShowModal(false)} className="w-full py-4 bg-white border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-gray-50 transition-all">
                  Dismiss
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};