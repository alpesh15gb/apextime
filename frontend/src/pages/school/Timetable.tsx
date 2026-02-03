import { useEffect, useState } from 'react';
import { Calendar, Plus, Clock, User, BookOpen, Trash2 } from 'lucide-react';
import { schoolAPI, employeesAPI } from '../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const Timetable = () => {
    const [batches, setBatches] = useState<any[]>([]);
    const [selectedBatch, setSelectedBatch] = useState('');
    const [subjects, setSubjects] = useState<any[]>([]);
    const [teachers, setTeachers] = useState<any[]>([]);
    const [timetable, setTimetable] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        subjectId: '',
        teacherId: '',
        dayOfWeek: 1,
        startTime: '08:00',
        endTime: '09:00'
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    useEffect(() => {
        if (selectedBatch) {
            fetchTimetable();
        }
    }, [selectedBatch]);

    const fetchInitialData = async () => {
        try {
            const [batchesRes, subjectsRes, teachersRes] = await Promise.all([
                schoolAPI.getAllBatches(),
                schoolAPI.getSubjects(),
                employeesAPI.getAll()
            ]);
            setBatches(batchesRes.data.data);
            setSubjects(subjectsRes.data.data);
            setTeachers(teachersRes);
            if (batchesRes.data.data.length > 0) {
                setSelectedBatch(batchesRes.data.data[0].id);
            }
        } catch (error) {
            console.error('Failed to load initial data', error);
        }
    };

    const fetchTimetable = async () => {
        try {
            setLoading(true);
            const res = await schoolAPI.getTimetable(selectedBatch);
            setTimetable(res.data.data);
        } catch (error) {
            console.error('Failed to fetch timetable', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await schoolAPI.createTimetableEntry({
                ...formData,
                batchId: selectedBatch,
                dayOfWeek: Number(formData.dayOfWeek)
            });
            setShowModal(false);
            fetchTimetable();
        } catch (error) {
            alert('Failed to add timetable entry');
        }
    };

    const getEntriesForDay = (dayIndex: number) => {
        return timetable
            .filter(entry => entry.dayOfWeek === dayIndex)
            .sort((a, b) => a.startTime.localeCompare(b.startTime));
    };

    return (
        <div className="space-y-6 pb-20">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        Class Timetable
                    </h1>
                    <p className="text-gray-500 text-sm">Schedule periods and assign teachers</p>
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedBatch}
                        onChange={e => setSelectedBatch(e.target.value)}
                        className="rounded-xl border-gray-300 text-sm font-semibold"
                    >
                        <option value="">Select Class / Section</option>
                        {batches.map(b => (
                            <option key={b.id} value={b.id}>{b.course?.name} - {b.name}</option>
                        ))}
                    </select>
                    <button
                        onClick={() => setShowModal(true)}
                        disabled={!selectedBatch}
                        className="bg-blue-600 text-white px-4 py-2 rounded-xl hover:bg-blue-700 flex items-center gap-2 font-medium disabled:bg-gray-300"
                    >
                        <Plus className="w-4 h-4" /> Add Period
                    </button>
                    <button
                        onClick={() => window.print()}
                        className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl hover:bg-gray-50 transition-all font-medium"
                    >
                        Print Timetable
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DAYS.map((day, index) => {
                    const dayEntries = getEntriesForDay(index + 1);
                    return (
                        <div key={day} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col">
                            <div className="bg-gray-50 px-4 py-3 border-b border-gray-100">
                                <h3 className="font-bold text-gray-700">{day}</h3>
                            </div>
                            <div className="p-4 flex-1 space-y-3">
                                {dayEntries.length > 0 ? dayEntries.map((entry: any) => (
                                    <div key={entry.id} className="p-3 border border-blue-50 bg-blue-50/30 rounded-xl relative group">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="font-bold text-blue-900">{entry.subject?.name}</div>
                                            <div className="text-[10px] font-bold text-blue-600 bg-white px-1.5 py-0.5 rounded shadow-sm border border-blue-50">
                                                {entry.startTime} - {entry.endTime}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500 flex items-center gap-1">
                                            <User className="w-3 h-3" /> {entry.teacher?.firstName} {entry.teacher?.lastName}
                                        </div>
                                    </div>
                                )) : (
                                    <div className="py-8 text-center text-gray-400 text-xs italic">
                                        No classes scheduled
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
                        <h3 className="text-xl font-bold mb-6">Add New Period</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Day of Week</label>
                                <select
                                    className="w-full rounded-xl border-gray-300"
                                    value={formData.dayOfWeek}
                                    onChange={e => setFormData({ ...formData, dayOfWeek: Number(e.target.value) })}
                                >
                                    {DAYS.map((day, idx) => (
                                        <option key={day} value={idx + 1}>{day}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Subject</label>
                                <select
                                    required
                                    className="w-full rounded-xl border-gray-300"
                                    value={formData.subjectId}
                                    onChange={e => setFormData({ ...formData, subjectId: e.target.value })}
                                >
                                    <option value="">Select Subject</option>
                                    {subjects.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} ({s.course?.name || 'All'})</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Teacher (Optional)</label>
                                <select
                                    className="w-full rounded-xl border-gray-300"
                                    value={formData.teacherId}
                                    onChange={e => setFormData({ ...formData, teacherId: e.target.value })}
                                >
                                    <option value="">Select Teacher</option>
                                    {teachers.map(t => (
                                        <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">Start Time</label>
                                    <input
                                        type="time"
                                        className="w-full rounded-xl border-gray-300"
                                        value={formData.startTime}
                                        onChange={e => setFormData({ ...formData, startTime: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">End Time</label>
                                    <input
                                        type="time"
                                        className="w-full rounded-xl border-gray-300"
                                        value={formData.endTime}
                                        onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200">Add Period</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
