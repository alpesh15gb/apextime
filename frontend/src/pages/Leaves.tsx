import { useState, useEffect } from 'react';
import {
    Calendar,
    CheckCircle2,
    XCircle,
    Clock,
    Filter,
    Search,
    RefreshCw,
    X,
    ShieldCheck,
    UserCheck,
    ChevronRight,
    SearchIcon,
    AlertCircle
} from 'lucide-react';
import { leavesAPI, employeesAPI } from '../services/api';
import { useAuth } from '../contexts/AuthContext';

type ApprovalView = 'manager' | 'ceo' | 'admin';

export const Leaves = () => {
    const { user } = useAuth();
    const [leaves, setLeaves] = useState<any[]>([]);
    const [leaveTypes, setLeaveTypes] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeView, setActiveView] = useState<ApprovalView>(user?.role === 'admin' ? 'ceo' : 'manager');

    useEffect(() => {
        fetchLeaves();
        fetchLeaveTypes();
        fetchEmployees();
    }, [activeView]);

    const fetchLeaves = async () => {
        try {
            setLoading(true);
            // activeView maps to 'manager' or 'ceo' backend logic
            const res = await leavesAPI.getAll({ view: activeView });
            setLeaves(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchLeaveTypes = async () => {
        try {
            const res = await leavesAPI.getTypes();
            setLeaveTypes(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await employeesAPI.getAll();
            setEmployees(res.data);
        } catch (e) { console.error(e); }
    };

    const handleApprove = async (id: string) => {
        try {
            if (activeView === 'manager') {
                await leavesAPI.approveManager(id);
            } else {
                await leavesAPI.approveCEO(id);
            }
            fetchLeaves();
        } catch (e) { alert('Approval failed'); }
    };

    const handleReject = async (id: string) => {
        const reason = prompt('Reason for rejection:');
        if (reason === null) return;
        try {
            await leavesAPI.reject(id, reason);
            fetchLeaves();
        } catch (e) { alert('Rejection failed'); }
    };

    const filteredLeaves = leaves.filter(l =>
        `${l.employee.firstName} ${l.employee.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.employee.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black heading-gradient flex items-center gap-3">
                        <ShieldCheck className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2 rounded-2xl" />
                        Approval Control Center
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium italic">Multi-level hierarchical governance for organizational absence.</p>
                </div>
            </div>

            {/* View Switching Tabs */}
            <div className="flex gap-4 p-1.5 bg-slate-100 rounded-[2rem] w-fit shadow-inner">
                {user?.role === 'manager' && (
                    <button
                        onClick={() => setActiveView('manager')}
                        className={`px-8 py-3 rounded-[1.5rem] font-black text-sm transition-all ${activeView === 'manager' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}
                    >
                        Level 1: Department Review
                    </button>
                )}
                {user?.role === 'admin' && (
                    <button
                        onClick={() => setActiveView('ceo')}
                        className={`px-8 py-3 rounded-[1.5rem] font-black text-sm transition-all ${activeView === 'ceo' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}
                    >
                        Level 2: CEO Final Sign-off
                    </button>
                )}
                <button
                    onClick={() => setActiveView('admin')}
                    className={`px-8 py-3 rounded-[1.5rem] font-black text-sm transition-all ${activeView === 'admin' ? 'bg-white text-indigo-600 shadow-lg' : 'text-slate-500'}`}
                >
                    Historical Audit Logs
                </button>
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                {/* List of Requests */}
                <div className="xl:col-span-2 space-y-6">
                    <div className="glass-card overflow-hidden">
                        <div className="p-6 border-b bg-slate-50/50 flex justify-between items-center">
                            <div className="relative w-80">
                                <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder={`Search ${activeView} approvals...`}
                                    className="input-premium pl-12 py-3 text-sm rounded-2xl"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                            <button onClick={fetchLeaves} className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 hover:text-indigo-600 shadow-sm transition-all">
                                <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase text-slate-400 tracking-widest border-b">
                                        <th className="px-8 py-6">Employee & Reason</th>
                                        <th className="px-6 py-6 font-center">Period</th>
                                        <th className="px-6 py-6">Details</th>
                                        <th className="px-8 py-6 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y border-t-0">
                                    {filteredLeaves.map((l) => (
                                        <tr key={l.id} className="hover:bg-indigo-50/20 transition-all group">
                                            <td className="px-8 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-white flex items-center justify-center font-black">
                                                        {l.employee.firstName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="font-black text-slate-800 uppercase tracking-tight">{l.employee.firstName} {l.employee.lastName}</p>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">{l.employee.department?.name}</p>
                                                        <p className="text-xs text-indigo-500 italic mt-1 font-medium line-clamp-1 max-w-[200px]">"{l.reason}"</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex flex-col">
                                                    <span className="font-black text-slate-700">{new Date(l.startDate).toLocaleDateString('en-GB')}</span>
                                                    <div className="flex items-center gap-2">
                                                        <ChevronRight className="w-3 h-3 text-slate-300" />
                                                        <span className="font-black text-slate-700">{new Date(l.endDate).toLocaleDateString('en-GB')}</span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider block w-fit mb-2 ${l.leaveType.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                                                    {l.leaveType.name} {l.leaveType.isPaid ? 'PAID' : 'LOP'}
                                                </span>
                                                <span className="text-xs font-bold text-slate-500">{l.days} Days Total</span>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {l.status.includes('pending') ? (
                                                    <div className="flex justify-end gap-3 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                                        <button
                                                            onClick={() => handleReject(l.id)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-xs hover:bg-rose-600 hover:text-white transition-all border border-rose-100 shadow-sm"
                                                        >
                                                            <XCircle className="w-4 h-4" />
                                                            Decline
                                                        </button>
                                                        <button
                                                            onClick={() => handleApprove(l.id)}
                                                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl font-black text-xs hover:bg-emerald-700 hover:scale-[1.05] transition-all shadow-lg shadow-emerald-200"
                                                        >
                                                            <CheckCircle2 className="w-4 h-4" />
                                                            {activeView === 'manager' ? 'Move to CEO' : 'Approve Pay'}
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${l.status === 'approved' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                                                        }`}>
                                                        {l.status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLeaves.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-24 text-center">
                                                <AlertCircle className="w-16 h-16 text-slate-100 mx-auto mb-4" />
                                                <p className="text-xl font-black text-slate-300">Queue is Clear</p>
                                                <p className="text-sm font-medium text-slate-400">All pending approvals at this level have been resolved.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Performance & Summary Panel */}
                <div className="space-y-8">
                    <div className="glass-card p-10 bg-slate-900 border-0 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/20 rounded-full blur-[80px] -mr-20 -mt-20"></div>
                        <h3 className="text-2xl font-black italic relative z-10">Governance <span className="text-indigo-400">Audit</span></h3>
                        <p className="text-slate-400 text-xs font-medium mt-2 relative z-10 uppercase tracking-widest">Efficiency Insight</p>

                        <div className="mt-10 space-y-6 relative z-10">
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-400 text-xs font-bold uppercase">Avg Approval Time</span>
                                <span className="text-2xl font-black text-indigo-400">4.2 Hrs</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-400 text-xs font-bold uppercase">Rejection Rate</span>
                                <span className="text-2xl font-black text-rose-400">8%</span>
                            </div>
                            <div className="flex justify-between items-end border-b border-white/5 pb-4">
                                <span className="text-slate-400 text-xs font-bold uppercase">Policy Adherence</span>
                                <span className="text-2xl font-black text-emerald-400">92%</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card p-8 border-dashed border-2 bg-slate-50/50">
                        <h4 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-indigo-600" />
                            Workflow Tip
                        </h4>
                        <p className="text-sm text-slate-600 font-medium leading-relaxed">
                            Leaves approved at the <strong className="text-indigo-600">CEO Level</strong> are immediately indexed by the <strong className="text-indigo-600">Payroll Engine</strong>. Unpaid leaves (LOP) will automatically pro-rate basic pay for the current cycle.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
