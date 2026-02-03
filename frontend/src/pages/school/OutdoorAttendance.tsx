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
    Search,
    Filter
} from 'lucide-react';
import { studentFieldLogAPI, schoolAPI } from '../../services/api';

export const OutdoorAttendance = () => {
    const [pendingLogs, setPendingLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('ALL');

    useEffect(() => {
        fetchPending();
    }, []);

    const fetchPending = async () => {
        try {
            setLoading(true);
            const res = await studentFieldLogAPI.getPending();
            const { students, employees } = res.data.data;

            // Merge both for the dashboard view
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
            // Use different API depending on log type
            if (log.isStaff) {
                // Mapping Corporate status names to what the component uses
                const backendStatus = status === 'APPROVED' ? 'approved' : 'rejected';
                // Need to import fieldLogAPI or use a generic call
                // For now assuming existing structure
                await studentFieldLogAPI.approve({ logId: log.id, status, isEmployee: true });
            } else {
                await studentFieldLogAPI.approve({ logId: log.id, status });
            }

            setPendingLogs(prev => prev.filter(l => l.id !== log.id));
            alert(`Log ${status.toLowerCase()} successfully`);
        } catch (error) {
            alert('Action failed');
        }
    };

    const filteredLogs = pendingLogs.filter(log => {
        const matchesSearch = log.isStaff
            ? (log.employee.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.employee.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.employee.employeeCode.toLowerCase().includes(searchTerm.toLowerCase()))
            : (log.student.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.student.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                log.student.admissionNumber?.toLowerCase().includes(searchTerm.toLowerCase()));

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
                    <p className="text-gray-500 text-sm">Approve student pickups, drops, and field trip check-ins</p>
                </div>

                <div className="flex bg-indigo-50 px-4 py-2 rounded-lg border border-indigo-100">
                    <div className="text-indigo-700 font-bold text-lg">{pendingLogs.length}</div>
                    <div className="text-indigo-600 text-xs ml-2 self-center font-medium">PENDING APPROVALS</div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="relative md:col-span-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <input
                        type="text"
                        placeholder="Search student or admission no..."
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
                    onClick={fetchPending}
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
                            {/* Card Header: Student Info */}
                            <div className="p-4 border-b border-gray-50 bg-gray-50/50 flex items-center gap-3">
                                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg ${log.isStaff ? 'bg-purple-600' : 'bg-indigo-600'}`}>
                                    {log.isStaff ? log.employee.firstName[0] : log.student.firstName[0]}
                                </div>
                                <div className="flex-1 overflow-hidden">
                                    <h3 className="font-bold text-gray-900 truncate">
                                        {log.isStaff
                                            ? `Staff: ${log.employee.firstName} ${log.employee.lastName}`
                                            : `${log.student.firstName} ${log.student.lastName}`
                                        }
                                    </h3>
                                    <p className="text-xs text-indigo-600 font-medium truncate">
                                        {log.isStaff
                                            ? `Employee Code: ${log.employee.employeeCode}`
                                            : `${log.student.batch?.course?.name} - ${log.student.batch?.name}`
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
                                        {/* IST Time Display (+5.5h) */}
                                        {new Date(new Date(log.timestamp).getTime()).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                            </div>

                            {/* Card Body: Evidence */}
                            <div className="flex-1 p-4 space-y-4">
                                {log.image && (
                                    <div className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100">
                                        <img
                                            src={log.image}
                                            alt="Attendance Identity"
                                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                        />
                                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-3">
                                            <div className="flex items-center text-white text-[10px] gap-1">
                                                <Camera className="w-3 h-3" /> Identity Verification Photo
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <div className="flex items-start gap-2 text-sm">
                                        <MapPin className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        <span className="text-gray-600 leading-tight">
                                            {log.location ? JSON.parse(log.location).address : 'Coordinates Unavailable'}
                                        </span>
                                    </div>
                                    {log.route && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Bus className="w-4 h-4 text-amber-500" />
                                            <span>Route: {log.route.name} ({log.route.vehicleNo})</span>
                                        </div>
                                    )}
                                    {log.remarks && (
                                        <div className="bg-amber-50 p-2 rounded-lg text-xs text-amber-800 italic border border-amber-100">
                                            "{log.remarks}"
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Card Footer: Actions */}
                            <div className="p-4 bg-gray-50 grid grid-cols-2 gap-3">
                                <button
                                    onClick={() => handleAction(log, 'REJECTED')}
                                    className="flex items-center justify-center gap-2 py-2 rounded-lg border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-sm transition-colors"
                                >
                                    <XCircle className="w-4 h-4" /> Reject
                                </button>
                                <button
                                    onClick={() => handleAction(log, 'APPROVED')}
                                    className="flex items-center justify-center gap-2 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-sm transition-colors"
                                >
                                    <CheckCircle className="w-4 h-4" /> Approve
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-20 bg-white rounded-3xl border border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400">
                        <User className="w-16 h-16 opacity-10 mb-4" />
                        <p className="text-lg">No pending outdoor attendance logs found</p>
                        <p className="text-sm">New check-ins from the mobile app will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};
