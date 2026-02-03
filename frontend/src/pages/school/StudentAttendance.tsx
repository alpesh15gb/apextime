import { useEffect, useState } from 'react';
import { Calendar, RefreshCw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { studentAttendanceAPI, schoolAPI } from '../../services/api';

export const StudentAttendance = () => {
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState({ present: 0, absent: 0, total: 0 });

    // For Biometric Linking
    const [biometricMap, setBiometricMap] = useState<Record<string, string>>({});
    const [editingBio, setEditingBio] = useState<string | null>(null);

    useEffect(() => {
        fetchAttendance();
    }, [date]);

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const res = await studentAttendanceAPI.getDailyStats(date);
            setRecords(res.data.data);

            // Calculate Stats
            const p = res.data.data.filter((r: any) => r.status === 'PRESENT').length;
            const a = res.data.data.filter((r: any) => r.status === 'ABSENT').length;
            setStats({ present: p, absent: a, total: res.data.data.length });
        } finally {
            setLoading(false);
        }
    };

    const runSync = async () => {
        if (!confirm('This will scan device logs and update attendance for ' + date + '. Continue?')) return;
        setLoading(true);
        try {
            await studentAttendanceAPI.processDaily(date);
            fetchAttendance(); // Reload
        } catch (e) { alert('Sync Failed'); }
    };

    const toggleStatus = async (record: any) => {
        const newStatus = record.status === 'PRESENT' ? 'ABSENT' : 'PRESENT';
        try {
            // Optimistic Update
            setRecords(prev => p.map(r => r.id === record.id ? { ...r, status: newStatus } : r));
            await studentAttendanceAPI.updateRecord(record.id, { status: newStatus });
            // Update stats locally
            setStats(prev => ({
                ...prev,
                present: newStatus === 'PRESENT' ? prev.present + 1 : prev.present - 1,
                absent: newStatus === 'ABSENT' ? prev.absent + 1 : prev.absent - 1
            }));
        } catch (e) { fetchAttendance(); } // Revert on fail
    };

    const saveBiometric = async (studentId: string) => {
        const id = biometricMap[studentId];
        if (!id) return;
        try {
            await studentAttendanceAPI.linkBiometric(studentId, id);
            setEditingBio(null);
            fetchAttendance();
        } catch (e) { alert('Failed to link'); }
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Clock className="w-8 h-8 text-blue-600" />
                        Student Attendance
                    </h1>
                    <p className="text-gray-500 text-sm">View and sync biometric attendance</p>
                </div>
                <div className="flex items-center gap-3">
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                        onClick={runSync}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700 font-medium text-sm"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Sync from Devices
                    </button>
                </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="text-gray-500 text-sm">Total Students</div>
                    <div className="text-2xl font-bold text-gray-800">{stats.total}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <div className="text-green-600 text-sm">Present</div>
                    <div className="text-2xl font-bold text-green-700">{stats.present}</div>
                </div>
                <div className="bg-red-50 p-4 rounded-xl border border-red-100">
                    <div className="text-red-600 text-sm">Absent</div>
                    <div className="text-2xl font-bold text-red-700">{stats.absent}</div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 text-gray-500 font-bold border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4">Student</th>
                            <th className="px-6 py-4">Class</th>
                            <th className="px-6 py-4">Biometric ID</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Time Logs</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && records.length === 0 ? (
                            <tr><td colSpan={5} className="text-center py-8 text-gray-500">Loading...</td></tr>
                        ) : records.map(record => (
                            <tr key={record.id} className="hover:bg-gray-50">
                                <td className="px-6 py-4">
                                    <div className="font-bold text-gray-900">{record.student.firstName} {record.student.lastName}</div>
                                    <div className="text-xs text-gray-500">{record.student.admissionNo}</div>
                                </td>
                                <td className="px-6 py-4">
                                    {record.student.batch?.course?.name} {record.student.batch?.name}
                                </td>
                                <td className="px-6 py-4">
                                    {editingBio === record.studentId ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                className="w-20 border rounded px-1 py-0.5"
                                                value={biometricMap[record.studentId] || record.student.biometricId || ''}
                                                onChange={e => setBiometricMap({ ...biometricMap, [record.studentId]: e.target.value })}
                                            />
                                            <button onClick={() => saveBiometric(record.studentId)} className="text-green-600 text-xs">Save</button>
                                        </div>
                                    ) : (
                                        <div onClick={() => setEditingBio(record.studentId)} className="cursor-pointer hover:bg-gray-100 px-2 py-1 rounded inline-block border border-transparent hover:border-gray-200">
                                            {record.student.biometricId || <span className="text-gray-400 italic">Set ID</span>}
                                        </div>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <button
                                        onClick={() => toggleStatus(record)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${record.status === 'PRESENT' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                        {record.status === 'PRESENT' ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                        {record.status}
                                    </button>
                                </td>
                                <td className="px-6 py-4 text-gray-500 font-mono text-xs">
                                    {record.remarks || '-'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {records.length === 0 && !loading && (
                    <div className="text-center py-10 text-gray-500">
                        No records found for this date.
                        <br />
                        <button onClick={runSync} className="text-blue-600 underline mt-2">Try Syncing</button> or ensure students are admitted.
                    </div>
                )}
            </div>
        </div>
    );
};
