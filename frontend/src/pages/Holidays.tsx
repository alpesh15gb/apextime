import { useEffect, useState } from 'react';
import { Plus, Calendar, Trash2, Edit2, RefreshCw, Repeat, Info, X, Check, Save } from 'lucide-react';
import { holidaysAPI } from '../services/api';

interface Holiday {
  id: string;
  name: string;
  date: string;
  description?: string;
  isRecurring: boolean;
}

export const Holidays = () => {
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    description: '',
    isRecurring: false,
  });

  useEffect(() => {
    fetchHolidays();
  }, [selectedYear]);

  const fetchHolidays = async () => {
    try {
      setLoading(true);
      const response = await holidaysAPI.getAll(selectedYear);
      setHolidays(response.data || []);
    } catch (error) {
      console.error('Failed to fetch holidays:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await holidaysAPI.update(editingId, formData);
      } else {
        await holidaysAPI.create(formData);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: '', date: '', description: '', isRecurring: false });
      fetchHolidays();
    } catch (error) {
      console.error('Failed to save holiday:', error);
    }
  };

  const handleEdit = (holiday: Holiday) => {
    setFormData({
      name: holiday.name,
      date: holiday.date.split('T')[0],
      description: holiday.description || '',
      isRecurring: holiday.isRecurring,
    });
    setEditingId(holiday.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this holiday?')) return;
    try {
      await holidaysAPI.delete(id);
      fetchHolidays();
    } catch (error) {
      console.error('Failed to delete holiday:', error);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getDayName = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Public Holidays</h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">Official off-days and organizational closures</p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="bg-white rounded-2xl border border-gray-100 p-1.5 flex shadow-sm">
            {[2024, 2025, 2026].map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${selectedYear === year ? 'bg-red-600 text-white shadow-lg shadow-red-100' : 'text-gray-400 hover:text-gray-600'}`}
              >
                {year}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setShowForm(true);
              setEditingId(null);
              setFormData({ name: '', date: '', description: '', isRecurring: false });
            }}
            className="btn-app btn-app-primary"
          >
            <Plus className="w-5 h-5" />
            <span>Add Holiday</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          {/* Legend / Info */}
          <div className="app-card p-8 bg-red-50/20 border-red-50 flex items-start gap-4">
            <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white shrink-0">
              <Info className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-red-600 uppercase tracking-widest">Global Policy</h4>
              <p className="text-xs font-bold text-gray-500 leading-relaxed">Sundays are systemically handled as weekly offs. Added holidays will be reflected in Attendance reports and Payroll LOP logic automatically.</p>
            </div>
          </div>

          {/* List */}
          <div className="app-card overflow-hidden">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-red-600 border-opacity-20 border-r-2 border-r-red-600"></div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Scanning Calendar...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50/30">
                      <th className="table-header">Date & Day</th>
                      <th className="table-header">Occasion Name</th>
                      <th className="table-header">Frequency</th>
                      <th className="table-header text-right">Settings</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {holidays.map(holiday => (
                      <tr key={holiday.id} className="table-row group">
                        <td className="px-6 py-5">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex flex-col items-center justify-center shadow-sm">
                              <span className="text-[9px] font-black text-red-600 uppercase leading-none">{new Date(holiday.date).toLocaleString('default', { month: 'short' })}</span>
                              <span className="text-sm font-black text-gray-900 leading-none mt-1">{new Date(holiday.date).getDate()}</span>
                            </div>
                            <div>
                              <p className="text-sm font-extrabold text-gray-800 leading-none">{formatDate(holiday.date)}</p>
                              <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{getDayName(holiday.date)}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-5">
                          <p className="text-sm font-extrabold text-gray-800">{holiday.name}</p>
                          <p className="text-[10px] font-bold text-gray-400 truncate max-w-[200px]">{holiday.description || 'Public Holiday'}</p>
                        </td>
                        <td className="px-6 py-5">
                          {holiday.isRecurring ? (
                            <div className="flex items-center space-x-1.5 bg-blue-50 px-3 py-1 rounded-lg w-fit border border-blue-100">
                              <Repeat className="w-3 h-3 text-blue-600" />
                              <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest leading-none">Annual</span>
                            </div>
                          ) : (
                            <span className="text-[9px] font-black text-gray-300 uppercase tracking-widest px-3">Fixed</span>
                          )}
                        </td>
                        <td className="px-6 py-5 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <button onClick={() => handleEdit(holiday)} className="p-2 text-gray-400 hover:bg-gray-100 hover:text-blue-600 rounded-xl transition-all"><Edit2 className="w-4 h-4" /></button>
                            <button onClick={() => handleDelete(holiday.id)} className="p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Form Panel (Side) */}
        <div className="space-y-8">
          {showForm ? (
            <div className="app-card p-10 space-y-10 animate-in slide-in-from-right-10 duration-500 ring-4 ring-red-50/50">
              <div className="flex justify-between items-center">
                <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">{editingId ? 'Edit Holiday' : 'Add Holiday'}</h3>
                <button onClick={() => setShowForm(false)} className="p-2 text-gray-400 hover:text-red-600"><X className="w-6 h-6" /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-8">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Event Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm"
                    placeholder="e.g. Independence Day"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Calendar Date</label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-black text-red-600 text-sm"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-5 py-4 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm resize-none h-24"
                    placeholder="Brief description..."
                  />
                </div>
                <div className="flex items-center justify-between p-5 bg-blue-50/20 rounded-3xl border border-blue-50">
                  <div className="flex items-center space-x-3">
                    <Repeat className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest leading-none">Recurring</p>
                      <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">Repeat yearly</p>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isRecurring}
                    onChange={(e) => setFormData({ ...formData, isRecurring: e.target.checked })}
                    className="w-6 h-6 rounded-lg text-red-600 border-gray-200 focus:ring-red-500"
                  />
                </div>

                <div className="pt-4 flex flex-col space-y-3">
                  <button type="submit" className="w-full py-5 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-red-700 shadow-2xl shadow-red-200 transition-all flex items-center justify-center space-x-3">
                    <Save className="w-4 h-4" />
                    <span>Commit to Calendar</span>
                  </button>
                  <button type="button" onClick={() => setShowForm(false)} className="w-full py-5 bg-white border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-gray-50 transition-all">Dismiss</button>
                </div>
              </form>
            </div>
          ) : (
            <div className="app-card p-16 text-center space-y-8 bg-gray-50/20 border-dashed border-2">
              <Calendar className="w-16 h-16 text-gray-100 mx-auto" />
              <div>
                <h3 className="text-xl font-extrabold text-gray-400 tracking-tight uppercase">Registry Active</h3>
                <p className="text-[10px] font-bold text-gray-300 max-w-xs mx-auto mt-2 leading-relaxed uppercase tracking-tighter">Select or add a holiday to modify the organizational timeline.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
