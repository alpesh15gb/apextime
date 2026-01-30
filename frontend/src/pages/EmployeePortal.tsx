import { useState, useEffect } from 'react';
import {
    Calendar,
    Clock,
    User,
    CheckCircle2,
    XCircle,
    Clock3,
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
    Check
} from 'lucide-react';
import { leavesAPI, attendanceAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export const EmployeePortal = () => {
    const { user } = useAuth();
    const [myLeaves, setMyLeaves] = useState<any[]>([]);
    const [myAttendance, setMyAttendance] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [isApplying, setIsApplying] = useState(false);
    const [newLeave, setNewLeave] = useState({
        leaveTypeId: '',
        startDate: '',
        endDate: '',
        reason: ''
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [leavesRes, typesRes, attendanceRes] = await Promise.all([
                leavesAPI.getAll({ view: 'employee' }),
                leavesAPI.getTypes(),
                attendanceAPI.getAll()
            ]);
            setMyLeaves(leavesRes.data);
            setLeaveTypes(typesRes.data);
            setMyAttendance(attendanceRes.data.filter((a: any) => a.employeeId === user?.employeeId || true));
        } catch (e) {
            console.error(e);
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

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'approved': return 'badge-success';
            case 'rejected': return 'badge-warning';
            default: return 'bg-gray-100 text-gray-500';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending_manager': return 'Awaiting L1';
            case 'pending_ceo': return 'Awaiting L2';
            case 'approved': return 'Authorized';
            default: return status.replace('_', ' ');
        }
    };

    return (
        <div className="space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Personnel Dashboard</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter italic">Personalized performance matrix for <span className="text-blue-600 font-black">{user?.username}</span></p>
                </div>

                <div className="flex items-center space-x-3">
                    <button className="px-6 py-4 bg-white border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all flex items-center space-x-2">
                        <Download className="w-4 h-4" />
                        <span>Payroll Slips</span>
                    </button>
                    <button onClick={() => setIsApplying(true)} className="px-8 py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center space-x-2">
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Request Absence</span>
                    </button>
                </div>
            </div>

            {/* Core Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="app-card p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center"><TrendingUp className="w-5 h-5" /></div>
                        <span className="badge badge-success text-[8px]">+1.2%</span>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Consistency Rate</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">98.2%</p>
                </div>
                <div className="app-card p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center"><Calendar className="w-5 h-5" /></div>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Accrued Credits</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">12 <span className="text-xs font-bold text-gray-400">Days</span></p>
                </div>
                <div className="app-card p-8 border-l-8 border-blue-600">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gray-100 text-gray-900 flex items-center justify-center font-black text-xs">AM</div>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Avg. Check-In</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">09:12</p>
                </div>
                <div className="app-card p-8">
                    <div className="flex justify-between items-start mb-6">
                        <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center"><ShieldAlert className="w-5 h-5" /></div>
                    </div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-2">Signals Pending</p>
                    <p className="text-3xl font-black text-gray-900 tracking-tighter">{myLeaves.filter(l => l.status.includes('pending')).length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Visual Attendance Timeline */}
                <div className="app-card overflow-hidden h-[600px] flex flex-col">
                    <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Clock className="w-4 h-4 text-blue-600" /> Recent Precision Logs
                        </h3>
                        <button className="text-[10px] font-black text-blue-600 uppercase hover:underline">Download Report</button>
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-left">
                            <thead className="sticky top-0 bg-white border-b z-10">
                                <tr className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                                    <th className="px-8 py-4">Timeline Node</th>
                                    <th className="px-8 py-4">In / Out Sequence</th>
                                    <th className="px-8 py-4 text-right">Verification</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {myAttendance.map((a: any, i: number) => (
                                    <tr key={i} className="table-row group">
                                        <td className="px-8 py-5">
                                            <p className="text-sm font-extrabold text-gray-800">{new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                                            <p className="text-[9px] font-black text-gray-300 uppercase leading-none mt-1">Status index: {a.status}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center space-x-2 text-xs font-black text-gray-700 tracking-tighter">
                                                <span className="text-red-500">{a.firstIn ? new Date(a.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                                <span className="text-gray-300">|</span>
                                                <span>{a.lastOut ? new Date(a.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className={`badge ${a.status === 'present' ? 'badge-success' : 'badge-warning'} uppercase text-[8px] font-black tracking-widest`}>
                                                {a.status}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Absense Signals Tracking */}
                <div className="app-card overflow-hidden h-[600px] flex flex-col">
                    <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-blue-600" /> Request Lifecycle
                        </h3>
                    </div>
                    <div className="flex-1 overflow-y-auto p-8 space-y-6 bg-gray-50/20">
                        {myLeaves.map((l: any) => (
                            <div key={l.id} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:border-blue-100 transition-all relative group">
                                <div className="flex justify-between items-start mb-6">
                                    <div>
                                        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase tracking-widest mb-2 block w-fit ${l.leaveType.isPaid ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                            {l.leaveType.name}
                                        </span>
                                        <h4 className="text-lg font-extrabold text-gray-900 tracking-tight">
                                            {new Date(l.startDate).toLocaleDateString('en-GB')} <span className="text-gray-300 mx-1">—</span> {new Date(l.endDate).toLocaleDateString('en-GB')}
                                        </h4>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{l.days} Working Days</p>
                                    </div>
                                    <div className={`badge ${getStatusColor(l.status)} uppercase text-[9px] font-black tracking-widest px-4 py-1.5`}>
                                        {getStatusLabel(l.status)}
                                    </div>
                                </div>
                                <div className="bg-gray-50 rounded-2xl p-4 mb-6">
                                    <p className="text-xs font-bold text-gray-400 italic">"{l.reason || 'Official Request'}"</p>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <div className="flex -space-x-3">
                                        <div className={`w-8 h-8 rounded-xl border-2 border-white flex items-center justify-center text-[8px] font-black shadow-sm ${l.managerApproval ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>L1</div>
                                        <div className={`w-8 h-8 rounded-xl border-2 border-white flex items-center justify-center text-[8px] font-black shadow-sm ${l.ceoApproval ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-400'}`}>L2</div>
                                    </div>
                                    <p className="text-[9px] font-black text-gray-300 uppercase tracking-widest">Protocol Path</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Application Modal */}
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
        </div>
    );
};
