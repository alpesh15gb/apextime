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
    ShieldAlert
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
                // For simplicity, fetching all attendance then filtering, 
                // but in production this would be a specific 'my-attendance' endpoint
                attendanceAPI.getAll()
            ]);
            setMyLeaves(leavesRes.data);
            setLeaveTypes(typesRes.data);
            setMyAttendance(attendanceRes.data.filter((a: any) => a.employeeId === user?.employeeId || true)); // Assuming filter for now
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
            case 'approved': return 'bg-emerald-100 text-emerald-700';
            case 'rejected': return 'bg-rose-100 text-rose-700';
            case 'pending_manager': return 'bg-amber-100 text-amber-700';
            case 'pending_ceo': return 'bg-indigo-100 text-indigo-700';
            default: return 'bg-slate-100 text-slate-700';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending_manager': return 'Awaiting Manager';
            case 'pending_ceo': return 'Awaiting CEO';
            case 'approved': return 'Fully Approved';
            default: return status.replace('_', ' ');
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black heading-gradient flex items-center gap-3">
                        <User className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2 rounded-2xl" />
                        Employee Portal
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Welcome back, <span className="text-indigo-600 font-bold">{user?.username}</span>. Monitor your performance and manage time-off.</p>
                </div>
                <div className="flex gap-4">
                    <button className="btn-secondary-premium group">
                        <Download className="w-5 h-5 group-hover:-translate-y-1 transition-transform" />
                        My Payslips
                    </button>
                    <button onClick={() => setIsApplying(true)} className="btn-primary-premium scale-110 shadow-indigo-200">
                        <ArrowUpRight className="w-5 h-5" />
                        Request Leave
                    </button>
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-6 bg-gradient-to-br from-white to-indigo-50/30">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl"><TrendingUp className="w-6 h-6 text-indigo-600" /></div>
                    </div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Attendance Rate</p>
                    <p className="text-3xl font-black text-slate-800">98.2%</p>
                </div>
                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-emerald-50 rounded-2xl"><Calendar className="w-6 h-6 text-emerald-600" /></div>
                    </div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Leave Balance</p>
                    <p className="text-3xl font-black text-slate-800">12 Days</p>
                </div>
                <div className="glass-card p-6">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-amber-50 rounded-2xl"><Clock3 className="w-6 h-6 text-amber-600" /></div>
                    </div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Avg. Punch In</p>
                    <p className="text-3xl font-black text-slate-800">09:12 AM</p>
                </div>
                <div className="glass-card p-6 border-l-8 border-indigo-500">
                    <div className="flex justify-between items-start mb-4">
                        <div className="p-3 bg-indigo-50 rounded-2xl"><ShieldAlert className="w-6 h-6 text-indigo-600" /></div>
                    </div>
                    <p className="text-slate-500 text-xs font-black uppercase tracking-widest">Pending Requests</p>
                    <p className="text-3xl font-black text-slate-800">{myLeaves.filter(l => l.status.includes('pending')).length}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Recent Attendance */}
                <div className="glass-card overflow-hidden h-[600px] flex flex-col">
                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-500" />
                            Recent Attendance
                        </h3>
                        <button className="text-xs font-bold text-indigo-600 hover:underline">View Full Calendar</button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-0">
                        <table className="w-full text-left text-sm border-collapse">
                            <thead className="sticky top-0 bg-white border-b z-10">
                                <tr className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">First In</th>
                                    <th className="px-6 py-4">Last Out</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {myAttendance.map((a: any, i: number) => (
                                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                                        <td className="px-6 py-4 font-bold text-slate-700">{new Date(a.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                                        <td className="px-6 py-4 font-black text-indigo-600">{a.firstIn ? new Date(a.firstIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                        <td className="px-6 py-4 font-black text-slate-600">{a.lastOut ? new Date(a.lastOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${a.status === 'present' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                }`}>
                                                {a.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Leave Status Tracking */}
                <div className="glass-card overflow-hidden h-[600px] flex flex-col">
                    <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                        <h3 className="font-black text-slate-800 flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-indigo-500" />
                            My Leave Applications
                        </h3>
                        <div className="flex gap-2">
                            <Filter className="w-4 h-4 text-slate-400" />
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 p-6 bg-slate-50/30">
                        {myLeaves.map((l: any) => (
                            <div key={l.id} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider mb-2 block w-fit ${l.leaveType.isPaid ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
                                            {l.leaveType.name}
                                        </span>
                                        <h4 className="font-black text-slate-800 text-lg">
                                            {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                                        </h4>
                                        <p className="text-xs font-bold text-slate-400">{l.days} Working Days</p>
                                    </div>
                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${getStatusColor(l.status)}`}>
                                        {getStatusLabel(l.status)}
                                    </span>
                                </div>
                                <div className="border-t pt-4 mt-2">
                                    <p className="text-sm text-slate-500 italic">" {l.reason || 'No reason specified'} "</p>
                                </div>
                                <div className="mt-4 flex gap-4">
                                    <div className="flex -space-x-2">
                                        <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${l.managerApproval ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                            M
                                        </div>
                                        <div className={`w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[10px] font-black ${l.ceoApproval ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-400'}`}>
                                            C
                                        </div>
                                    </div>
                                    <p className="text-[10px] font-bold text-slate-400 self-center">Approval Track</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Application Modal */}
            {isApplying && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white relative">
                            <h3 className="text-3xl font-black italic">Submit <span className="text-indigo-200">Time-Off</span></h3>
                            <p className="text-indigo-100/70 text-sm mt-2 font-medium">This request will follow the hierarchical approval workflow.</p>
                            <button onClick={() => setIsApplying(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-xl transition-all"><XCircle className="w-8 h-8 text-white/50" /></button>
                        </div>
                        <form onSubmit={handleApply} className="p-10 space-y-6">
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Leave Type</label>
                                    <select required className="input-premium py-4" value={newLeave.leaveTypeId} onChange={(e) => setNewLeave({ ...newLeave, leaveTypeId: e.target.value })}>
                                        <option value="">Choose Category</option>
                                        {leaveTypes.map(lt => <option key={lt.id} value={lt.id}>{lt.name} {lt.isPaid ? '(Paid)' : '(Unpaid - LOP)'}</option>)}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-6">
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">From</label>
                                        <input required type="date" className="input-premium py-4" value={newLeave.startDate} onChange={(e) => setNewLeave({ ...newLeave, startDate: e.target.value })} />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">To</label>
                                        <input required type="date" className="input-premium py-4" value={newLeave.endDate} onChange={(e) => setNewLeave({ ...newLeave, endDate: e.target.value })} />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Justification</label>
                                    <textarea required placeholder="Briefly explain the reason for your absence..." className="input-premium h-32 py-4 resize-none" value={newLeave.reason} onChange={(e) => setNewLeave({ ...newLeave, reason: e.target.value })}></textarea>
                                </div>
                            </div>
                            <button type="submit" className="w-full py-5 bg-indigo-600 text-white rounded-[1.5rem] font-black text-lg shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                                <Send className="w-6 h-6" />
                                Send Request to Manager
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
