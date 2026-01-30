import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  Building2,
  Briefcase,
  Layers,
  Search,
  Filter,
  MoreVertical,
  ChevronRight,
} from 'lucide-react';
import { departmentsAPI, branchesAPI, employeesAPI } from '../services/api';

export const Departments = () => {
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [branches, setBranches] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [formData, setFormData] = useState({ name: '', code: '', branchId: '', managerId: '' });

  useEffect(() => {
    fetchDepartments();
    fetchMetadata();
  }, []);

  const fetchMetadata = async () => {
    try {
      const [branchesRes, employeesRes] = await Promise.all([
        branchesAPI.getAll(),
        employeesAPI.getAll()
      ]);
      setBranches(branchesRes.data || []);
      setEmployees(employeesRes.data || []);
    } catch (e) { console.error('Meta error', e); }
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
      setFormData({ name: '', code: '', branchId: '', managerId: '' });
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
      managerId: dept.managerId || ''
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

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Departmental Matrix</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Organize your personnel into functional units</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', code: '', branchId: '', managerId: '' });
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
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Compiling Units...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="table-header w-24">Code</th>
                  <th className="table-header">Unit Name</th>
                  <th className="table-header">Manager</th>
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
                      {dept.manager ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-black text-blue-600">
                            {dept.manager.firstName[0]}{dept.manager.lastName[0]}
                          </div>
                          <span className="text-xs font-bold text-gray-700">{dept.manager.firstName} {dept.manager.lastName}</span>
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
                {editingId ? 'Edit Unit' : 'Create Unit'}
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

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Parent Branch</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none"
                  >
                    <option value="">Select Branch</option>
                    {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Dept. Manager</label>
                  <select
                    value={formData.managerId}
                    onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none"
                  >
                    <option value="">Assign Admin</option>
                    {employees.map((e: any) => (
                      <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeCode})</option>
                    ))}
                  </select>
                </div>
              </div>

          </div>

          <div className="pt-6 flex flex-col space-y-3">
            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center space-x-2">
              <Check className="w-4 h-4" />
              <span>{editingId ? 'Update Matrix' : 'Initialize Unit'}</span>
            </button>
            <button type="button" onClick={() => setShowModal(false)} className="w-full py-4 bg-white border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-gray-50 transition-all">
              Dismiss
            </button>
          </div>
        </form>
          </div >
        </div >
      )}
    </div >
  );
};