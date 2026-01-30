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
    AlertCircle,
    FileText,
    History,
    Check
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
            const params: any = { view: activeView };
            if (user?.role === 'employee') {
                params.view = 'employee';
            }
            const res = await leavesAPI.getAll(params);
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
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
                        {user?.role === 'employee' ? 'My Leaves' : 'Leave Administration'}
                    </h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">
                        {user?.role === 'employee' ? 'View and track your leave history' : 'Review and process employee leave requests'}
                    </p>
                </div>

                {user?.role !== 'employee' ? (
                    <div className="flex bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
                        {user?.role === 'manager' && (
                            <button
                                onClick={() => setActiveView('manager')}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'manager' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                Manager Approval
                            </button>
                        )}
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => setActiveView('ceo')}
                                className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'ceo' ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                            >
                                CEO Approval
                            </button>
                        )}
                        <button
                            onClick={() => setActiveView('admin')}
                            className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeView === 'admin' ? 'bg-gray-900 text-white shadow-lg' : 'text-gray-400 hover:text-gray-600'}`}
                        >
                            Archive
                        </button>
                    </div>
                ) : (
                    <button onClick={() => window.location.href = '/portal'} className="px-6 py-3 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-100 transition-all hover:scale-105">
                        Apply New Leave
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                <div className="xl:col-span-2 space-y-6">
                    {/* Search bar */}
                    <div className="flex gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
                            <input
                                type="text"
                                placeholder="Filter by employee name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-6 py-4 bg-white border border-gray-100 rounded-[20px] focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700 text-sm shadow-sm"
                            />
                        </div>
                        <button onClick={fetchLeaves} className="p-4 bg-white border border-gray-100 rounded-[20px] text-gray-400 hover:text-blue-600 transition-all shadow-sm">
                            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                        </button>
                    </div>

                    {/* List */}
                    <div className="app-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-gray-50/30">
                                        <th className="table-header">Employee</th>
                                        <th className="table-header">Schedule</th>
                                        <th className="table-header">Type & Quantum</th>
                                        <th className="table-header text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filteredLeaves.map((l) => (
                                        <tr key={l.id} className="table-row group">
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-all">
                                                        {l.employee.firstName[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-extrabold text-gray-800 leading-none">{l.employee.firstName} {l.employee.lastName}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter line-clamp-1">"{l.reason || 'No description'}"</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center space-x-2 text-xs font-black text-gray-700">
                                                    <span>{new Date(l.startDate).toLocaleDateString('en-GB')}</span>
                                                    <ChevronRight className="w-3 h-3 text-gray-300" />
                                                    <span>{new Date(l.endDate).toLocaleDateString('en-GB')}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex flex-col space-y-1">
                                                    <span className={`badge ${l.leaveType.isPaid ? 'badge-success' : 'badge-warning'} uppercase text-[9px] font-black tracking-widest block w-fit`}>
                                                        {l.leaveType.name} {l.leaveType.isPaid ? 'PAID' : 'LOP'}
                                                    </span>
                                                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{l.days} Days Total</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-5 text-right">
                                                {l.status.includes('pending') ? (
                                                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all translate-x-2 group-hover:translate-x-0">
                                                        <button onClick={() => handleReject(l.id)} className="p-2.5 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all"><XCircle className="w-4 h-4" /></button>
                                                        <button onClick={() => handleApprove(l.id)} className="p-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl shadow-lg shadow-blue-100 transition-all flex items-center gap-2">
                                                            <Check className="w-4 h-4" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest px-1">{activeView === 'manager' ? 'Approve' : 'Authorize'}</span>
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className={`badge ${l.status === 'approved' ? 'badge-success' : 'badge-warning'} uppercase text-[9px] font-black tracking-widest`}>
                                                        {l.status}
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredLeaves.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-24 text-center">
                                                <AlertCircle className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                                                <p className="text-sm font-black text-gray-300 uppercase tracking-widest">No pending requests</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="space-y-8">
                    <div className="app-card p-10 space-y-6">
                        <div className="flex items-center space-x-3 text-blue-600">
                            <FileText className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Leave Policy</span>
                        </div>
                        <p className="text-xs font-bold text-gray-500 leading-relaxed">
                            Leaves approved by the <strong className="text-gray-900">CEO Approval</strong> level are final and will be reflected in the payroll. Loss of Pay (LOP) calculations are based on these final approvals.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
