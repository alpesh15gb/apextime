import { useState, useEffect } from 'react';
import {
    CheckCircle2,
    XCircle,
    MapPin,
    Camera,
    User,
    Clock,
    Filter,
    Image as ImageIcon,
    MoreVertical,
    ThumbsUp,
    ThumbsDown
} from 'lucide-react';
import { fieldLogsAPI } from '../services/api';
import { format } from 'date-fns';

export const FieldLogs = () => {
    const [logs, setLogs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<string | null>(null);
    const [filterStatus, setFilterStatus] = useState('pending');
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, [filterStatus]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const res = await fieldLogsAPI.getPending();
            setLogs(res.data);
        } catch (err) {
            console.error('Failed to fetch logs', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (logId: string, status: 'approved' | 'rejected') => {
        try {
            setProcessing(logId);
            await fieldLogsAPI.approve({ logId, status });
            setLogs(prev => prev.filter(l => l.id !== logId));
        } catch (err) {
            console.error(`Failed to ${status} log`, err);
        } finally {
            setProcessing(null);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Field Logs Acceptance</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1">Review and approve remote/field punches</p>
                </div>

                <div className="flex items-center gap-3">
                    <button className="btn-app bg-white border border-gray-100 text-gray-600">
                        <Filter className="w-4 h-4" />
                        <span>Filter</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
                        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary border-opacity-20 border-r-2 border-r-primary"></div>
                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mt-4">Loading Logs...</p>
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-gray-100">
                        <CheckCircle2 className="w-16 h-16 text-emerald-100 mb-4" />
                        <p className="text-lg font-bold text-gray-900">All clear!</p>
                        <p className="text-sm text-gray-400 font-medium">No pending field logs to process.</p>
                    </div>
                ) : (
                    logs.map((log) => (
                        <div key={log.id} className="app-card overflow-hidden border-l-4 border-l-primary group">
                            <div className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                                {/* Employee Info */}
                                <div className="flex items-center gap-4">
                                    <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-primary relative">
                                        <User className="w-6 h-6" />
                                        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-white text-[10px] font-black ${log.type === 'IN' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'}`}>
                                            {log.type}
                                        </div>
                                    </div>
                                    <div>
                                        <h3 className="font-extrabold text-gray-900 text-lg">
                                            {log.employee.firstName} {log.employee.lastName}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-xs font-black text-primary uppercase tracking-wider">{log.employee.employeeCode}</span>
                                            <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                                            <div className="flex items-center gap-1 text-gray-400 font-bold text-xs">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Evidence (Location & Image) */}
                                <div className="flex-1 flex flex-col md:flex-row gap-6 md:items-center px-6 border-l border-gray-50">
                                    <div
                                        className="flex items-center gap-3 group/loc cursor-pointer"
                                        title="Click to view on Map"
                                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(log.location || '')}`, '_blank')}
                                    >
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover/loc:bg-blue-600 group-hover/loc:text-white transition-colors">
                                            <MapPin className="w-5 h-5" />
                                        </div>
                                        <div className="max-w-[200px]">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Location</p>
                                            <p className="text-xs font-bold text-gray-700 truncate group-hover/loc:text-blue-600 transition-colors">
                                                {log.location || 'Unknown Location'}
                                            </p>
                                        </div>
                                    </div>

                                    <div
                                        className="flex items-center gap-3 group/img cursor-pointer"
                                        onClick={() => log.image && setSelectedImage(log.image)}
                                    >
                                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center text-gray-400 group-hover/img:bg-blue-50 group-hover/img:text-primary transition-colors relative overflow-hidden">
                                            {log.image ? (
                                                <img src={log.image} alt="Evidence" className="w-full h-full object-cover" />
                                            ) : (
                                                <Camera className="w-5 h-5" />
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Selfie Log</p>
                                            <p className="text-xs font-bold text-primary group-hover/img:underline">View Image</p>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleAction(log.id, 'rejected')}
                                        disabled={!!processing}
                                        className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all disabled:opacity-50"
                                    >
                                        <ThumbsDown className="w-4 h-4" />
                                        Reject
                                    </button>
                                    <button
                                        onClick={() => handleAction(log.id, 'approved')}
                                        disabled={!!processing}
                                        className="flex items-center gap-2 px-8 py-3 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-600 shadow-[0_10px_20px_-10px_rgba(16,185,129,0.5)] transition-all disabled:opacity-50"
                                    >
                                        {processing === log.id ? (
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <ThumbsUp className="w-4 h-4" />
                                        )}
                                        Approve
                                    </button>
                                    <button className="p-3 text-gray-300 hover:text-gray-600 rounded-xl hover:bg-gray-50">
                                        <MoreVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Image Modal */}
            {selectedImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8"
                    onClick={() => setSelectedImage(null)}
                >
                    <div className="max-w-3xl w-full bg-white rounded-3xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="relative aspect-square md:aspect-video">
                            <img src={selectedImage} alt="Large Evidence" className="w-full h-full object-contain bg-gray-900" />
                            <button
                                className="absolute top-6 right-6 w-10 h-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-white hover:bg-white hover:text-gray-900 transition-all font-bold"
                                onClick={() => setSelectedImage(null)}
                            >
                                X
                            </button>
                        </div>
                        <div className="p-6 text-center">
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Biometric Photo Verification</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
