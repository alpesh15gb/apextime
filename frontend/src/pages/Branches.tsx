import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Building2,
  MapPin,
  Globe,
  Check,
  Building,
} from 'lucide-react';
import { branchesAPI, locationsAPI } from '../services/api';

export const Branches = () => {
  const [branches, setBranches] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', locationId: '' });

  useEffect(() => {
    fetchBranches();
    fetchLocations();
  }, []);

  const fetchBranches = async () => {
    try {
      setLoading(true);
      const response = await branchesAPI.getAll();
      setBranches(response.data);
    } catch (error) {
      console.error('Failed to fetch branches:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await locationsAPI.getAll();
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await branchesAPI.update(editingId, formData);
      } else {
        await branchesAPI.create(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', code: '', locationId: '' });
      fetchBranches();
    } catch (error) {
      console.error('Failed to save branch:', error);
    }
  };

  const handleEdit = (branch: any) => {
    setFormData({
      name: branch.name,
      code: branch.code,
      locationId: branch.locationId || '',
    });
    setEditingId(branch.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this branch?')) return;
    try {
      await branchesAPI.delete(id);
      fetchBranches();
    } catch (error) {
      console.error('Failed to delete branch:', error);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Branches & Locations</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Manage physical business presence and offices</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', code: '', locationId: '' });
            setShowModal(true);
          }}
          className="btn-app btn-app-primary"
        >
          <Plus className="w-5 h-5" />
          <span>Register Branch</span>
        </button>
      </div>

      {/* Main Grid View */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="app-card p-10 animate-pulse space-y-6">
              <div className="w-12 h-12 bg-gray-100 rounded-2xl"></div>
              <div className="h-6 bg-gray-100 rounded-lg w-3/4"></div>
              <div className="h-4 bg-gray-100 rounded-lg w-1/2"></div>
            </div>
          ))
        ) : branches.map((branch: any) => (
          <div key={branch.id} className="app-card p-10 group hover:border-blue-100 transition-all relative overflow-hidden">
            <div className="flex justify-between items-start mb-10">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all shadow-sm">
                <Building className="w-6 h-6" />
              </div>
              <div className="badge badge-success text-[10px] font-black uppercase tracking-widest">{branch.isActive ? 'Live' : 'Closed'}</div>
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 mb-2 truncate">{branch.name}</h3>
            <div className="flex flex-col space-y-3">
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                <MapPin className="w-3.5 h-3.5" />
                <span>{branch.location?.name || 'International'}</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-gray-400">
                <Globe className="w-3.5 h-3.5" />
                <span className="bg-gray-50 px-2 py-0.5 rounded text-[10px] uppercase font-black tracking-widest leading-none">{branch.code}</span>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-50 flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <button onClick={() => handleEdit(branch)} className="p-3 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-2xl transition-all shadow-sm">
                <Edit className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(branch.id)} className="p-3 bg-gray-50 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-2xl transition-all shadow-sm">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modern Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-10 border-b border-gray-50 flex justify-between items-center">
              <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                {editingId ? 'Edit Branch' : 'New Branch'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-500 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="e.g. Gurugram Tech Hub"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Branch Code</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="e.g. GGN-01"
                  required
                />
              </div>
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Region / Location</label>
                <select
                  value={formData.locationId}
                  onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm appearance-none cursor-pointer"
                >
                  <option value="">Select Region</option>
                  {locations.map((location: any) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-6 flex flex-col space-y-3">
                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Modify Record' : 'Add Register'}</span>
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
