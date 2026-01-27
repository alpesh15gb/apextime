import { useEffect, useState } from 'react';
import {
  Plus,
  Edit,
  Trash2,
  X,
  Moon,
  Sun,
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
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Shifts</h1>
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
          className="btn-primary flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>Add Shift</span>
        </button>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Name</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Time</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Grace Period</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Type</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Status</th>
                <th className="text-left py-3 px-4 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {shifts.map((shift: any) => (
                <tr key={shift.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="py-3 px-4 font-medium">{shift.name}</td>
                  <td className="py-3 px-4">
                    {shift.startTime} - {shift.endTime}
                  </td>
                  <td className="py-3 px-4">
                    In: {shift.gracePeriodIn}m, Out: {shift.gracePeriodOut}m
                  </td>
                  <td className="py-3 px-4">
                    {shift.isNightShift ? (
                      <span className="flex items-center text-purple-600">
                        <Moon className="w-4 h-4 mr-1" /> Night
                      </span>
                    ) : (
                      <span className="flex items-center text-yellow-600">
                        <Sun className="w-4 h-4 mr-1" /> Day
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        shift.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {shift.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(shift)}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(shift.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">
                {editingId ? 'Edit Shift' : 'Add Shift'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="form-label">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Start Time *</label>
                  <input
                    type="time"
                    value={formData.startTime}
                    onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">End Time *</label>
                  <input
                    type="time"
                    value={formData.endTime}
                    onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="form-label">Grace In (min)</label>
                  <input
                    type="number"
                    value={formData.gracePeriodIn}
                    onChange={(e) => setFormData({ ...formData, gracePeriodIn: parseInt(e.target.value) })}
                    className="form-input"
                    min="0"
                  />
                </div>
                <div>
                  <label className="form-label">Grace Out (min)</label>
                  <input
                    type="number"
                    value={formData.gracePeriodOut}
                    onChange={(e) => setFormData({ ...formData, gracePeriodOut: parseInt(e.target.value) })}
                    className="form-input"
                    min="0"
                  />
                </div>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.isNightShift}
                  onChange={(e) => setFormData({ ...formData, isNightShift: e.target.checked })}
                  className="w-4 h-4 text-primary-600 rounded border-gray-300"
                />
                <label className="ml-2 text-sm text-gray-700">Night Shift</label>
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingId ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};