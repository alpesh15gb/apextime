import { useState, useEffect, useRef } from 'react';
import {
    Clock,
    User,
    ArrowUpRight,
    X,
    MapPin,
    Camera,
    RefreshCw,
    Fingerprint,
    Smartphone,
    Download,
    Send,
    LogOut
} from 'lucide-react';
import { leavesAPI, fieldLogsAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

export const EmployeePortal = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [isPunching, setIsPunching] = useState<null | 'IN' | 'OUT'>(null);
    const [showInstallPrompt, setShowInstallPrompt] = useState(false);
    const [showLeaveHistory, setShowLeaveHistory] = useState(false);
    const [myLeaves, setMyLeaves] = useState<any[]>([]);
    const [loadingLeaves, setLoadingLeaves] = useState(false);

    const [punchData, setPunchData] = useState({
        location: '',
        coords: '',
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
        fetchLeaveTypes();
        // Check if on mobile and not standalone
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
        if ((isIOS || /Android/.test(navigator.userAgent)) && !isStandalone) {
            setShowInstallPrompt(true);
        }
    }, []);

    const fetchLeaveTypes = async () => {
        try {
            const typesRes = await leavesAPI.getTypes();
            setLeaveTypes(typesRes.data);
        } catch (e) {
            console.error(e);
        }
    };

    const fetchMyLeaves = async () => {
        try {
            setLoadingLeaves(true);
            const res = await leavesAPI.getAll({ view: 'employee' });
            setMyLeaves(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingLeaves(false);
        }
    };

    const startCamera = async () => {
        try {
            const s = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            setStream(s);
            if (videoRef.current) videoRef.current.srcObject = s;
        } catch (err) {
            alert("Camera access denied. Biometric verification is required to punch.");
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
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            setPunchData(prev => ({ ...prev, image: dataUrl }));
            stopCamera();
        }
    };

    const getLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;
                    const locCoords = `${latitude},${longitude}`;

                    try {
                        // Attempt to get a human-readable address
                        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`, {
                            headers: { 'Accept-Language': 'en' }
                        });
                        const data = await response.json();
                        const address = data.display_name || locCoords;

                        setPunchData(prev => ({
                            ...prev,
                            location: address,
                            coords: locCoords // Keep raw coords for mapping
                        }));
                    } catch (e) {
                        console.error('Reverse geocoding failed', e);
                        setPunchData(prev => ({ ...prev, location: locCoords }));
                    }
                },
                () => alert("GPS access required for field attendance.")
            );
        }
    };

    const handlePunchSubmit = async () => {
        if (!punchData.image || !isPunching) {
            alert("Image verification mandatory!");
            return;
        }
        try {
            setLoading(true);
            // Send Both address and coordinates if available
            const finalLocation = punchData.coords ? `${punchData.location} [${punchData.coords}]` : punchData.location;
            await fieldLogsAPI.punch({ type: isPunching, ...punchData, location: finalLocation });
            setIsPunching(null);
            setPunchData({ location: '', coords: '', image: '', remarks: '' });
            alert("Punch submitted! Please wait for HR approval.");
        } catch (e) {
            alert('Punch failed.');
        } finally {
            setLoading(false);
        }
    };

    const handleLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await leavesAPI.create(newLeave);
            setIsApplying(false);
            setNewLeave({ leaveTypeId: '', startDate: '', endDate: '', reason: '' });
            alert('Leave requested successfully.');
        } catch (e) {
            alert('Leave request failed.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto shadow-2xl relative">
            {/* Minimal Mobile Header */}
            <div className="bg-white p-6 pt-10 border-b border-gray-100 flex justify-between items-center sticky top-0 z-40">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-lg shadow-blue-100">
                        {user?.firstName?.[0] || user?.username?.[0]?.toUpperCase()}
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none">
                            {user?.tenantType === 'SCHOOL' ? 'Teacher Portal' : 'Employee Portal'}
                        </p>
                        <p className="text-sm font-black text-gray-900 mt-1">{user?.fullName || user?.username}</p>
                    </div>
                </div>
                <button
                    onClick={() => { logout(); navigate('/login'); }}
                    className="p-3 bg-gray-50 rounded-xl text-gray-400 hover:text-red-500"
                >
                    <LogOut className="w-5 h-5" />
                </button>
            </div>

            {/* Application Body */}
            <div className="flex-1 p-6 space-y-6">

                {/* Visual Greeting */}
                <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[32px] p-8 text-white relative overflow-hidden shadow-2xl shadow-blue-200">
                    <div className="relative z-10">
                        <h2 className="text-2xl font-black tracking-tight leading-tight">
                            {user?.tenantType === 'SCHOOL' ? 'Ready for \nYour Class?' : 'Ready for \nYour Shift?'}
                        </h2>
                        <p className="text-blue-100 text-xs mt-3 font-bold opacity-80 uppercase tracking-widest leading-relaxed">
                            {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
                        </p>
                    </div>
                    <Fingerprint className="absolute -bottom-4 -right-4 w-32 h-32 text-blue-400 opacity-20 rotate-12" />
                </div>

                {/* Main Action Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <button
                        onClick={() => { setIsPunching('IN'); startCamera(); getLocation(); }}
                        className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 active:scale-95 transition-all text-emerald-600 hover:border-emerald-200"
                    >
                        <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                            <Clock className="w-8 h-8" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Punch In</span>
                    </button>

                    <button
                        onClick={() => { setIsPunching('OUT'); startCamera(); getLocation(); }}
                        className="bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex flex-col items-center justify-center gap-4 active:scale-95 transition-all text-red-600 hover:border-red-200"
                    >
                        <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center">
                            <Clock className="w-8 h-8 rotate-180" />
                        </div>
                        <span className="font-black text-xs uppercase tracking-widest">Punch Out</span>
                    </button>
                </div>

                <button
                    onClick={() => setIsApplying(true)}
                    className="w-full bg-white p-6 rounded-[28px] border border-gray-100 shadow-sm flex items-center justify-between px-8 active:scale-[0.98] transition-all group hover:border-blue-200"
                >
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
                            <ArrowUpRight className="w-8 h-8" />
                        </div>
                        <div className="text-left">
                            <p className="font-black text-xs uppercase tracking-widest text-gray-900 leading-none">Apply for Leave</p>
                            <p className="text-[10px] font-bold text-gray-400 mt-2 uppercase tracking-tighter">Request Absence Approval</p>
                        </div>
                    </div>
                </button>

                {/* Info Card */}
                <div className="bg-emerald-50 rounded-[28px] p-6 border border-emerald-100 flex items-center gap-4">
                    <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600">
                        <Smartphone className="w-5 h-5" />
                    </div>
                    <p className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-loose">
                        Your punches require <br /> GPS & Photo Verification
                    </p>
                </div>

                <div className="pt-4 border-t border-gray-100 text-center">
                    <button
                        onClick={() => { setShowLeaveHistory(true); fetchMyLeaves(); }}
                        className="text-xs font-bold text-gray-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
                    >
                        View Leave History
                    </button>
                </div>
            </div>

            {/* Leave History Modal */}
            {showLeaveHistory && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300">
                    <div className="absolute inset-x-0 bottom-0 top-20 bg-white rounded-t-[48px] p-8 pt-12 animate-in slide-in-from-bottom duration-500 overflow-hidden flex flex-col">
                        <div className="flex justify-between items-start mb-8 flex-shrink-0">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Absence <br />History</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Past Applications & Status</p>
                            </div>
                            <button onClick={() => setShowLeaveHistory(false)} className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto space-y-4 pb-20 no-scrollbar">
                            {loadingLeaves ? (
                                <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase animate-pulse">Loading Records...</div>
                            ) : myLeaves.length === 0 ? (
                                <div className="text-center py-10 text-gray-400 text-xs font-bold uppercase">No leave records found</div>
                            ) : (
                                myLeaves.map((leave: any) => (
                                    <div key={leave.id} className="bg-gray-50 rounded-[24px] p-6 group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white border border-gray-100 text-gray-600">
                                                    {leave.leaveType.name}
                                                </span>
                                                <p className="text-xs font-bold text-gray-900 mt-3">
                                                    {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                                </p>
                                                <p className="text-[10px] text-gray-400 font-bold mt-1">
                                                    {leave.days} Day{leave.days > 1 ? 's' : ''}
                                                </p>
                                            </div>

                                            <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${leave.status === 'approved' ? 'bg-emerald-100 text-emerald-600' :
                                                leave.status === 'rejected' ? 'bg-red-100 text-red-600' :
                                                    'bg-amber-100 text-amber-600'
                                                }`}>
                                                {leave.status.replace('_', ' ')}
                                            </div>
                                        </div>

                                        {leave.reason && (
                                            <div className={`p-4 rounded-xl mt-4 ${leave.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-white text-gray-500'}`}>
                                                <p className="text-[9px] font-black uppercase tracking-widest opacity-50 mb-1">
                                                    {leave.status === 'rejected' ? 'Rejection Reason' : 'Note'}
                                                </p>
                                                <p className="text-xs font-bold leading-relaxed">
                                                    {leave.reason}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Install Prompt Overlay */}
            {showInstallPrompt && (
                <div className="fixed inset-x-0 bottom-6 px-6 z-50 animate-in slide-in-from-bottom duration-500">
                    <div className="bg-gray-900 rounded-[32px] p-6 flex items-center justify-between shadow-2xl shadow-black/40">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white">
                                <Download className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-black text-white leading-none">Install App</p>
                                <p className="text-[10px] text-gray-400 font-bold mt-1 uppercase">Add to Home Screen</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => setShowInstallPrompt(false)}
                                className="px-6 py-3 bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-white/20"
                            >
                                How?
                            </button>
                            <button
                                onClick={() => setShowInstallPrompt(false)}
                                className="p-2 text-gray-500"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Punch Verification Modal */}
            {isPunching && (
                <div className="fixed inset-0 bg-gray-900/90 backdrop-blur-xl z-[100] flex flex-col animate-in fade-in duration-300">
                    <div className="p-10 flex justify-between items-center text-white">
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50">Identity Sync</p>
                            <h3 className="text-2xl font-black">Verify Punch {isPunching}</h3>
                        </div>
                        <button onClick={() => { setIsPunching(null); stopCamera(); }} className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="flex-1 px-8 pb-10 flex flex-col gap-6 justify-center">
                        <div className="aspect-square w-full max-w-sm mx-auto rounded-[40px] overflow-hidden bg-black border-4 border-white/10 shadow-2xl relative">
                            {!punchData.image ? (
                                <>
                                    <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover mirror" />
                                    <button
                                        onClick={captureImage}
                                        className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full p-2"
                                    >
                                        <div className="w-full h-full bg-blue-600 rounded-full flex items-center justify-center border-4 border-white shadow-xl">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </button>
                                </>
                            ) : (
                                <>
                                    <img src={punchData.image} alt="Selfie" className="w-full h-full object-cover" />
                                    <button
                                        onClick={() => { setPunchData(p => ({ ...p, image: '' })); startCamera(); }}
                                        className="absolute top-6 right-6 p-4 bg-white/20 backdrop-blur-xl rounded-2xl text-white"
                                    >
                                        <RefreshCw className="w-6 h-6" />
                                    </button>
                                </>
                            )}
                        </div>

                        <div className="space-y-4">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center gap-4">
                                <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400">
                                    <MapPin className="w-6 h-6" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest">Geolocation Matrix</p>
                                    <p className="text-xs text-blue-200 font-bold mt-1 uppercase tracking-tighter truncate">
                                        {punchData.location || "Locking Coordinates..."}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handlePunchSubmit}
                                disabled={!punchData.image || loading}
                                className="w-full py-6 bg-blue-600 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 disabled:opacity-30 active:scale-95 transition-all"
                            >
                                {loading ? "Locking Signal..." : "Transmit Verification"}
                            </button>
                        </div>
                    </div>
                    <canvas ref={canvasRef} style={{ display: 'none' }} />
                </div>
            )}

            {/* Leave Request Sidebar/Overlay */}
            {isApplying && (
                <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm z-[100] animate-in fade-in duration-300">
                    <div className="absolute inset-x-0 bottom-0 bg-white rounded-t-[48px] p-10 pt-12 animate-in slide-in-from-bottom duration-500">
                        <div className="flex justify-between items-start mb-10">
                            <div>
                                <h3 className="text-3xl font-black text-gray-900 tracking-tight leading-none">Request <br />Absence</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-4">Formal Signal Submission</p>
                            </div>
                            <button onClick={() => setIsApplying(false)} className="w-14 h-14 bg-gray-50 rounded-[20px] flex items-center justify-center text-gray-400">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleLeaveSubmit} className="space-y-6">
                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Absence Class</p>
                                <select required className="w-full p-5 bg-gray-50 rounded-2xl border-none font-bold text-sm text-gray-700 appearance-none" value={newLeave.leaveTypeId} onChange={(e) => setNewLeave({ ...newLeave, leaveTypeId: e.target.value })}>
                                    <option value="">Choose Category</option>
                                    {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name}</option>)}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">From</p>
                                    <input required type="date" className="w-full p-5 bg-gray-50 rounded-2xl border-none font-black text-xs text-blue-600" value={newLeave.startDate} onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Until</p>
                                    <input required type="date" className="w-full p-5 bg-gray-50 rounded-2xl border-none font-black text-xs text-blue-600" value={newLeave.endDate} onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Justification</p>
                                <textarea required placeholder="Detailed reason..." className="w-full p-5 bg-gray-50 rounded-2xl border-none font-bold text-sm text-gray-700 h-32 resize-none" value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}></textarea>
                            </div>

                            <button type="submit" className="w-full py-6 bg-gray-900 text-white rounded-[28px] font-black text-sm uppercase tracking-[0.2em] shadow-2xl transition-all">
                                {loading ? "Sending Signal..." : "Broadcast Signal"}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            <style>{`
                .mirror { transform: scaleX(-1); }
                @media (max-width: 640px) {
                    .min-h-screen { max-width: 100%; border-radius: 0; }
                }
            `}</style>
        </div>
    );
};
