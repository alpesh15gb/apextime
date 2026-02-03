import { useEffect, useState } from 'react';
import {
    MapPin,
    Camera,
    CheckCircle,
    XCircle,
    Bus,
    Navigation,
    User,
    Clock,
    Search
} from 'lucide-react';
import { studentFieldLogAPI } from '../../services/api';

export const OutdoorAttendance = () => {
    const [pendingLogs, setPendingLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');
    const [statusView, setStatusView] = useState<'PENDING' | 'HISTORY'>('PENDING');

    useEffect(() => {
        fetchLogs();
    }, [statusView]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await studentFieldLogAPI.getLogs(statusView === 'PENDING' ? 'PENDING' : 'APPROVED');
            const { students, employees } = res.data.data;

            const merged = [
                ...students.map((s: any) => ({ ...s, isStudent: true })),
                ...employees.map((e: any) => ({ ...e, isStaff: true }))
            ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

            setPendingLogs(merged);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (log: any, status: 'APPROVED' | 'REJECTED') => {
        try {
            await studentFieldLogAPI.approve({
                logId: log.id,
                status,
                isEmployee: log.isStaff
            });

            if (statusView === 'PENDING') {
                setPendingLogs(prev => prev.filter(l => l.id !== log.id));
            } else {
                fetchLogs();
            }
            alert(`Log ${status.toLowerCase()} successfully`);
        } catch (error) {
            alert('Action failed');
        }
    };

    const filteredLogs = pendingLogs.filter(log => {
        const student = log.isStaff ? log.employee : log.student;
        const matchesSearch =
            (student?.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (student?.lastName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (log.isStaff ? student?.employeeCode || '' : student?.admissionNumber || '').toLowerCase().includes(searchTerm.toLowerCase());

        const matchesType = filterType === 'ALL' || log.type === filterType;

        return matchesSearch && matchesType;
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Navigation className="w-8 h-8 text-indigo-600" />
                        Outdoor Check-ins
                    </h1>
                    <p className="text-gray-500 text-sm">Approve student pickups, drops, and staff field logs</p>
                </div>

                <div className="flex bg-white rounded-xl shadow-sm p-1 border border-gray-100">
                    <button
                        onClick={() => setStatusView('PENDING')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${statusView === 'PENDING' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        Pending
                    </button>
                    <button
                        onClick={() => setStatusView('HISTORY')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${statusView === 'HISTORY' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
                    >
                        History
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search student or staff..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div>
                    <select
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value)}
                    >
                        <option value="ALL">All Event Types</option>
                        <option value="PICKUP">Bus Pickup</option>
                        <option value="DROP">Bus Drop</option>
                        <option value="STAFF_IN">Staff IN</option>
                        <option value="STAFF_OUT">Staff OUT</option>
                        <option value="TRIP_CHECKIN">Field Trip Entry</option>
                        <option value="TRIP_CHECKOUT">Field Trip Exit</option>
                    </select>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                    <Clock className="w-4 h-4" /> Refresh
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    Array(6).fill(0).map((_, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-pulse h-64"></div>
                    ))
                ) : filteredLogs.length > 0 ? (
                    filteredLogs.map(log => (
                        <div key={log.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${log.isStaff ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                                    {log.isStaff ? (log.employee?.firstName?.[0] || 'S') : (log.student?.firstName?.[0] || 'St')}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-bold text-gray-900 truncate">
                                        {log.isStaff
                                            ? `Staff: ${log.employee?.firstName || 'Unknown'} ${log.employee?.lastName || ''}`
                                            : `${log.student?.firstName || 'Unknown'} ${log.student?.lastName || ''}`
                                        }
                                    </h3>
                                    <p className="text-xs text-indigo-600 font-medium truncate">
                                        {log.isStaff
                                            ? `Employee Code: ${log.employee?.employeeCode || 'N/A'}`
                                            : `${log.student?.batch?.course?.name || 'No Course'} - ${log.student?.batch?.name || 'No Batch'}`
                                        }
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${log.type.includes('STAFF_IN') ? 'bg-purple-100 text-purple-700' :
                                        log.type === 'PICKUP' ? 'bg-green-100 text-green-700' :
                                            log.type === 'DROP' ? 'bg-blue-100 text-blue-700' :
                                                'bg-pink-100 text-pink-700'
                                        }`}>
                                        {log.type.replace('_', ' ')}
                                    </div>
                                    <div className="text-[10px] text-gray-400 mt-1">
                                        {new Date(log.timestamp).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 p-4 space-y-4">
                                {log.image && (
                                    <div className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                                        <img
                                            src={log.image}
                                            alt="Identity Verification"
                                            className="w-full h-full object-cover"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                                            <div className="flex items-center text-white text-[10px] gap-1">
                                                <Camera className="w-3 h-3" /> Identity Photo
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 text-sm group/loc">
                                        <MapPin className="w-4 h-4 text-red-500 mt-0.5" />
                                        {(() => {
                                            if (!log.location) return <span className="text-gray-600">No Location</span>;
                                            let lat = '', lng = '', display = log.location;
                                            try {
                                                const loc = JSON.parse(log.location);
                                                lat = loc.lat; lng = loc.lng;
                                                display = loc.address || `${lat}, ${lng}`;
                                            } catch (e) {
                                                const parts = log.location.split(',');
                                                if (parts.length >= 2) { lat = parts[0]; lng = parts[1]; }
                                            }
                                            return lat && lng ? (
                                                <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{display}</a>
                                            ) : <span className="text-gray-600">{display}</span>;
                                        })()}
                                    </div>
                                    {log.remarks && (
                                        <div className="bg-amber-50 p-2 rounded-lg text-xs text-amber-800 italic border border-amber-100">
                                            "{log.remarks}"
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="p-4 bg-gray-50">
                                {statusView === 'PENDING' ? (
                                    <div className="grid grid-cols-2 gap-3">
                                        <button onClick={() => handleAction(log, 'REJECTED')} className="flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 text-gray-700 font-bold text-sm">
                                            <XCircle className="w-4 h-4" /> Reject
                                        </button>
                                        <button onClick={() => handleAction(log, 'APPROVED')} className="flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 text-white font-bold text-sm">
                                            <CheckCircle className="w-4 h-4" /> Approve
                                        </button>
                                    </div>
                                ) : (
                                    <div className={`flex items-center justify-center gap-2 py-2 rounded-lg font-bold text-sm ${log.status === 'APPROVED' || log.status === 'approved' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {log.status}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                        <User className="w-16 h-16 opacity-10 mb-4" />
                        <p className="text-lg uppercase">No {statusView} logs found</p>
                    </div>
                )}
            </div>
        </div>
    );
};
