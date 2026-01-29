import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Moon,
  Sun,
  Clock,
  Timer,
  Check,
} from 'lucide-react';
import { shiftsAPI } from '../services/api';

export const Shifts = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    startTime: '09:00',
    endTime: '18:00',
    gracePeriodIn: 15,
    gracePeriodOut: 15,
    isNightShift: false,
  });

  useEffect(() => {
    fetchShifts();
  }, []);

  const fetchShifts = async () => {
    try {
      setLoading(true);
      const response = await shiftsAPI.getAll();
      setShifts(response.data);
    } catch (error) {
      console.error('Failed to fetch shifts:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await shiftsAPI.update(editingId, formData);
      } else {
        await shiftsAPI.create(formData);
      }
      setShowModal(false);
      setEditingId(null);
      setFormData({
        name: '',
        startTime: '09:00',
        endTime: '18:00',
        gracePeriodIn: 15,
        gracePeriodOut: 15,
        isNightShift: false,
      });
      fetchShifts();
    } catch (error) {
      console.error('Failed to save shift:', error);
    }
  };

  const handleEdit = (shift: any) => {
    setFormData({
      name: shift.name,
      startTime: shift.startTime,
      endTime: shift.endTime,
      gracePeriodIn: shift.gracePeriodIn,
      gracePeriodOut: shift.gracePeriodOut,
      isNightShift: shift.isNightShift,
    });
    setEditingId(shift.id);
    setShowModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this shift?')) return;
    try {
      await shiftsAPI.delete(id);
      fetchShifts();
    } catch (error) {
      console.error('Failed to delete shift:', error);
    }
  };

  return (
    <div className="space-y-8 pb-20">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Shift Rosters</h1>
          <p className="text-sm font-bold text-gray-400 mt-1">Configure working hours and grace windows</p>
        </div>
        <button
          onClick={() => {
            setEditingId(null);
            setFormData({
              name: '',
              startTime: '09:00',
              endTime: '18:00',
              gracePeriodIn: 15,
              gracePeriodOut: 15,
              isNightShift: false,
            });
            setShowModal(true);
          }}
          className="btn-app btn-app-primary"
        >
          <Plus className="w-5 h-5" />
          <span>New Roster</span>
        </button>
      </div>

      {/* Shifts Grid */}
      <div className="app-card overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-4">
            <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-600 border-opacity-20 border-r-2 border-r-red-600"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Loading Rosters...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50/30">
                  <th className="table-header">Schedule Name</th>
                  <th className="table-header">Time Window</th>
                  <th className="table-header">Grace Tolerance</th>
                  <th className="table-header">Shift Type</th>
                  <th className="table-header">Lifecycle</th>
                  <th className="table-header text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {shifts.map((shift: any) => (
                  <tr key={shift.id} className="table-row group">
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shadow-sm transition-all ${shift.isNightShift ? 'bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-500 group-hover:text-white'}`}>
                          {shift.isNightShift ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                        </div>
                        <span className="text-sm font-extrabold text-gray-800">{shift.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex items-center space-x-2 text-xs font-black text-gray-700 tracking-tighter">
                        <Clock className="w-3.5 h-3.5 text-gray-300" />
                        <span>{shift.startTime} <span className="text-gray-300 mx-1">—</span> {shift.endTime}</span>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="flex flex-col space-y-1">
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <Timer className="w-3 h-3" />
                          <span>IN: {shift.gracePeriodIn}m</span>
                        </div>
                        <div className="flex items-center space-x-1.5 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                          <Timer className="w-3 h-3" />
                          <span>OUT: {shift.gracePeriodOut}m</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`text-[10px] font-black uppercase tracking-widest ${shift.isNightShift ? 'text-indigo-500' : 'text-orange-500'}`}>
                        {shift.isNightShift ? 'Nocturnal' : 'Diurnal'}
                      </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className={`badge ${shift.isActive ? 'badge-success' : 'badge-warning'} uppercase text-[10px] font-black tracking-widest`}>
                        {shift.isActive ? 'Active' : 'Archived'}
                      </div>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button onClick={() => handleEdit(shift)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-xl transition-all"><Edit className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(shift.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
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
                {editingId ? 'Edit Roster' : 'New Roster'}
              </h3>
              <button onClick={() => setShowModal(false)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all">
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Schedule Identifier</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                  placeholder="e.g. Standard Morning"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Time</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                    required
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Time</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grace In (Min)</label>
                  <input
                    type="number"
                    value={formData.gracePeriodIn}
                    onChange={(e) => setFormData({ ...formData, gracePeriodIn: parseInt(e.target.value) })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                    min="0"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Grace Out (Min)</label>
                  <input
                    type="number"
                    value={formData.gracePeriodOut}
                    onChange={(e) => setFormData({ ...formData, gracePeriodOut: parseInt(e.target.value) })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-3xl border border-gray-100">
                <div className="flex items-center space-x-3">
                  <Moon className="w-5 h-5 text-indigo-500" />
                  <div>
                    <p className="text-xs font-black text-gray-900 uppercase">Night Shift</p>
                    <p className="text-[10px] font-bold text-gray-400">Crosses midnight</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.isNightShift}
                  onChange={(e) => setFormData({ ...formData, isNightShift: e.target.checked })}
                  className="w-6 h-6 rounded-lg text-red-600 border-gray-200 focus:ring-red-500"
                />
              </div>

              <div className="pt-4 flex flex-col space-y-3">
                <button type="submit" className="w-full py-4 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-red-700 shadow-xl shadow-red-200 transition-all flex items-center justify-center space-x-2">
                  <Check className="w-4 h-4" />
                  <span>{editingId ? 'Update Roster' : 'Initialize Roster'}</span>
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