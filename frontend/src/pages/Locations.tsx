import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  MapPin,
  Globe,
  Navigation,
  Check,
} from 'lucide-react';
import { locationsAPI } from '../services/api';

export const Locations = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    city: '',
    state: '',
    country: '',
    zipCode: '',
  });

  useEffect(() => {
    fetchLocations();
  }, []);

  const fetchLocations = async () => {
    try {
      setLoading(true);
      const response = await locationsAPI.getAll();
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await locationsAPI.update(editingId, formData);
      } else {
        await locationsAPI.create(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({ name: '', address: '', city: '', state: '', country: '', zipCode: '' });
      fetchLocations();
    } catch (error) {
      console.error('Failed to save location:', error);
    }
  };

  const handleEdit = (location: any) => {
    setFormData({
      name: location.name,
      address: location.address || '',
      city: location.city || '',
      state: location.state || '',
      country: location.country || '',
      zipCode: location.zipCode || '',
    });
    setEditingId(location.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await locationsAPI.delete(id);
      fetchLocations();
    } catch (error) {
      console.error('Failed to delete location:', error);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Geospatial Registry</h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">Coordinate headquarters and regional nodes</p>
        </div>

        <button
          onClick={() => {
            setEditingId(null);
            setFormData({ name: '', address: '', city: '', state: '', country: '', zipCode: '' });
            setShowModal(true);
          }}
          className="btn-app btn-app-primary"
        >
          <Plus className="w-5 h-5" />
          <span>Map New Node</span>
        </button>
      </div>

      {/* List / Table */}
      <div className="app-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-blue-600 border-opacity-20 border-r-2 border-r-blue-600"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Triangulating Nodes...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="table-header">Location Name</th>
                  <th className="table-header">Physical Address</th>
                  <th className="table-header">Region/State</th>
                  <th className="table-header">Nation</th>
                  <th className="table-header">Operational</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {locations.map((loc: any) => (
                  <tr key={loc.id} className="table-row group">
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all shadow-sm">
                          <MapPin className="w-5 h-5" />
                        </div>
                        <span className="text-sm font-extrabold text-gray-800">{loc.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <span className="text-xs font-bold text-gray-500 max-w-[200px] block truncate">{loc.address || 'Address unspecified'}</span>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2 text-xs font-black text-gray-700 uppercase tracking-tighter">
                        <Navigation className="w-3.5 h-3.5 text-gray-300" />
                        <span>{loc.city || 'TBA'}{loc.state ? `, ${loc.state}` : ''}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
                        <Globe className="w-3.5 h-3.5" />
                        <span>{loc.country || 'Global'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`badge ${loc.isActive ? 'badge-success' : 'badge-warning'} uppercase text-[9px] font-black tracking-widest`}>
                        {loc.isActive ? 'Verified' : 'Standby'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleEdit(loc)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-xl transition-all"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(loc.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
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
                {editingId ? 'Edit Node' : 'New Node'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-500 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="e.g. Haryana Corporate Hub"
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Physical Address</label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="Enter full street address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">City</label>
                  <input type="text" value={formData.city} onChange={(e) => setFormData({ ...formData, city: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">State</label>
                  <input type="text" value={formData.state} onChange={(e) => setFormData({ ...formData, state: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Country</label>
                  <input type="text" value={formData.country} onChange={(e) => setFormData({ ...formData, country: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Zip Code</label>
                  <input type="text" value={formData.zipCode} onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })} className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm" />
                </div>
              </div>

              <div className="pt-6 flex flex-col space-y-3">
                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Modify Matrix' : 'Initialize Node'}</span>
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