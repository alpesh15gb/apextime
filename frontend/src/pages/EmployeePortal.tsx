import { useState, useEffect, useRef } from 'react';
import {
    Calendar,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    Send,
    Download,
    Filter,
    ArrowUpRight,
    TrendingUp,
    ShieldAlert,
    ChevronRight,
    X,
    FileText,
    Zap,
    MapPin,
    Camera,
    RefreshCw,
    Fingerprint,
    Info
} from 'lucide-react';
import { leavesAPI, attendanceAPI, fieldLogsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

export const EmployeePortal = () => {
    const { user } = useAuth();
    const [myLeaves, setMyLeaves] = useState<any[]>([]);
    const [myAttendance, setMyAttendance] = useState<any[]>([]);
    const [myFieldLogs, setMyFieldLogs] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isPunching, setIsPunching] = useState<null | 'IN' | 'OUT'>(null);
    const [punchData, setPunchData] = useState({
        location: '',
        image: '',
        remarks: ''
    });

    const [newLeave, setNewLeave] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [leavesRes, typesRes, attendanceRes, logsRes] = await Promise.all([
                leavesAPI.getAll({ view: 'employee' }),
                leavesAPI.getTypes(),
                attendanceAPI.getAll({ employeeId: user?.employeeId }),
                fieldLogsAPI.getMyPunches()
            ]);
            setMyLeaves(leavesRes.data);
            setLeaveTypes(typesRes.data);
            setMyAttendance(attendanceRes.data.logs || []);
            setMyFieldLogs(logsRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({ video: true });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
            console.error("Camera access denied", err);
            alert("Please allow camera access for biometric verification.");
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    };

    const captureImage = () => {
        if (videoRef.current && canvasRef.current) {
            const canvas = canvasRef.current;
            const video = videoRef.current;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(video, 0, 0);
            const dataUrl = canvas.toDataURL('image/jpeg');
            setPunchData(prev => ({ ...prev, image: dataUrl }));
            stopCamera();
        }
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const loc = `${position.coords.latitude},${position.coords.longitude}`;
                    setPunchData(prev => ({ ...prev, location: loc }));
                },
                (err) => {
                    alert("Unable to retrieve location. Please check GPS settings.");
                }
            );
        }
    };

    const handlePunchSubmit = async () => {
        if (!punchData.image || !isPunching) {
            alert("Image verification is mandatory.");
            return;
        }
        try {
            setLoading(true);
            await fieldLogsAPI.punch({
                type: isPunching,
                ...punchData
            });
            setIsPunching(null);
            setPunchData({ location: '', image: '', remarks: '' });
            fetchData();
            alert(`Field ${isPunching} punch submitted for verification.`);
        } catch (e) {
            alert('Punch submission failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleApply = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await leavesAPI.create(newLeave);
            setIsApplying(false);
            setNewLeave({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
            fetchData();
            alert('Leave request submitted to your manager.');
        } catch (e) {
            alert('Failed to submit request');
        }
    };

    return (
        <div className="space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Employee Portal</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tight">
                        Identity: <span className="text-blue-600 font-black">{user?.username}</span>
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-4">
                    <div className="bg-white p-2 rounded-2xl border border-gray-100 flex items-center gap-2 shadow-sm">
                        <button
                            onClick={() => { setIsPunching('IN'); startCamera(); getLocation(); }}
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-emerald-100 flex items-center gap-2"
                        >
                            <Zap className="w-4 h-4 fill-white" /> Check In
                        </button>
                        <button
                            onClick={() => { setIsPunching('OUT'); startCamera(); getLocation(); }}
                            className="bg-red-500 hover:bg-red-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all shadow-lg shadow-red-100 flex items-center gap-2"
                        >
                            <Clock className="w-4 h-4" /> Check Out
                        </button>
                    </div>

                    <button onClick={() => setIsApplying(true)} className="px-8 py-3.5 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center space-x-2">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Leave Request</span>
                    </button>
                </div>
            </div>

            {/* Attendance & Field Logs Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Attendance Timeline */}
                <div className="app-card overflow-hidden h-[500px] flex flex-col">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-4 h-4 text-primary" /> Verified Attendance History
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white border-b z-10">
                                <tr className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                                    <th className="px-8 py-4">Date</th>
                                    <th className="px-8 py-4">Punches</th>
                                    <th className="px-8 py-4 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {myAttendance.map((a: any, i: number) => (
                                    <tr key={i} className="hover:bg-gray-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-extrabold text-gray-800">{format(new Date(a.date), 'dd MMM, yyyy')}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-2 text-xs font-bold text-gray-600">
                                                <span className="text-emerald-600">{a.firstIn ? format(new Date(a.firstIn), 'HH:mm') : '—'}</span>
                                                <span className="text-gray-300">→</span>
                                                <span className="text-red-600">{a.lastOut ? format(new Date(a.lastOut), 'HH:mm') : '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${a.status === 'present' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                {a.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Field Logs History */}
                <div className="app-card overflow-hidden h-[500px] flex flex-col">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/20 flex justify-between">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-red-500" /> Pending Approval Logs
                        </h3>
                        <div className="flex items-center gap-1 text-[8px] font-black text-gray-300 uppercase italic">
                            <Info className="w-3 h-3" /> Subject to HR Verification
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto p-4 space-y-4">
                        {myFieldLogs.length === 0 && (
                            <div className="h-full flex flex-col items-center justify-center opacity-50">
                                <Fingerprint className="w-10 h-10 mb-2" />
                                <p className="text-xs font-bold">No field log data available</p>
                            </div>
                        )}
                        {myFieldLogs.map((l: any) => (
                            <div key={l.id} className="bg-white p-5 rounded-3xl border border-gray-50 flex items-center justify-between shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black ${l.type === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                        {l.type}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-gray-900">{format(new Date(l.timestamp), 'dd MMM | hh:mm a')}</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-1 flex items-center gap-1">
                                            <MapPin className="w-3 h-3" /> {l.location ? 'GPS Locked' : 'No Location'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest ${l.status === 'pending' ? 'bg-amber-50 text-amber-600' : l.status === 'approved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                    {l.status}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Punch Modal (Camera) */}
            {isPunching && (
                <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-xl flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-8 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                                <ShieldAlert className={`w-6 h-6 ${isPunching === 'IN' ? 'text-emerald-500' : 'text-red-500'}`} />
                                Field Punch: <span className={isPunching === 'IN' ? 'text-emerald-600' : 'text-red-600'}>{isPunching}</span>
                            </h3>
                            <button onClick={() => { setIsPunching(null); stopCamera(); }} className="p-2 box-content bg-gray-50 text-gray-400 rounded-xl hover:text-red-500 transition-all">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 space-y-6">
                            {/* Camera View */}
                            <div className="relative aspect-square rounded-[32px] overflow-hidden bg-gray-900 shadow-inner group">
                                {!punchData.image ? (
                                    <>
                                        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                                        <div className="absolute inset-0 border-2 border-white/20 border-dashed m-10 rounded-full animate-pulse pointer-events-none"></div>
                                        <button
                                            onClick={captureImage}
                                            className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all border-4 border-primary/20"
                                        >
                                            <div className="w-6 h-6 bg-primary rounded-full"></div>
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <img src={punchData.image} alt="Captured" className="w-full h-full object-cover" />
                                        <button
                                            onClick={() => { setPunchData(p => ({ ...p, image: '' })); startCamera(); }}
                                            className="absolute top-4 right-4 bg-white/20 backdrop-blur-md p-3 rounded-xl text-white hover:bg-white hover:text-gray-900 transition-all"
                                        >
                                            <RefreshCw className="w-5 h-5" />
                                        </button>
                                    </>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center gap-3 bg-gray-50 p-4 rounded-2xl group border border-transparent hover:border-primary/20 transition-all">
                                    <MapPin className="w-5 h-5 text-gray-400 group-hover:text-primary" />
                                    <div className="flex-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Geolocation Matrix</p>
                                        <p className="text-xs font-bold text-gray-700">{punchData.location || 'Obtaining GPS coordinates...'}</p>
                                    </div>
                                    <CheckCircle2 className={`w-5 h-5 ${punchData.location ? 'text-emerald-500' : 'text-gray-200'}`} />
                                </div>

                                <textarea
                                    placeholder="Add optional notes for HR..."
                                    className="w-full bg-gray-50 border-none rounded-2xl p-5 text-sm font-bold resize-none h-24 focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300"
                                    value={punchData.remarks}
                                    onChange={(e) => setPunchData(p => ({ ...p, remarks: e.target.value }))}
                                />
                            </div>

                            <button
                                onClick={handlePunchSubmit}
                                disabled={!punchData.image || !punchData.location || loading}
                                className="w-full py-5 bg-primary text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-blue-700 shadow-2xl shadow-blue-200 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Fingerprint className="w-5 h-5" />
                                        <span>Transmit Verified Punch</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
            )}

            {/* Leave Modal */}
            {isApplying && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                            <h3 className="text-2xl font-extrabold text-gray-900 tracking-tight">
                                Absence <span className="text-blue-600">Request</span>
                            </h3>
                            <button onClick={() => setIsApplying(false)} className="p-2.5 bg-white text-gray-400 hover:text-blue-500 rounded-2xl transition-all shadow-sm">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleApply} className="p-10 space-y-8">
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type of Absence</label>
                                <select required className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm appearance-none cursor-pointer" value={newLeave.leaveTypeId} onChange={(e) => setNewLeave({ ...newLeave, leaveTypeId: e.target.value })}>
                                    <option value="">Select Category</option>
                                    {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} {lt.isPaid ? '(Paid)' : '(Unpaid)'}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">From</label>
                                    <input required type="date" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-blue-600 text-xs" value={newLeave.startDate} onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} />
                                </div>
                                <div className="space-y-3">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Until</label>
                                    <input required type="date" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-blue-600 text-xs" value={newLeave.endDate} onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} />
                                </div>
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Justification</label>
                                <textarea required placeholder="Detailed reason..." className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm h-32 resize-none" value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}></textarea>
                            </div>

                            <div className="pt-4 flex flex-col space-y-3">
                                <button type="submit" className="w-full py-5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center justify-center space-x-3">
                                    <Send className="w-4 h-4" />
                                    <span>Broadcast Signal</span>
                                </button>
                                <button type="button" onClick={() => setIsApplying(false)} className="w-full py-5 text-gray-400 font-black text-[10px] uppercase tracking-widest">Dismiss</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .mirror { transform: scaleX(-1); }
            `}</style>
        </div>
    );
};
