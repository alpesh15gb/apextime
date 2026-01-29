import { useEffect, useState } from 'react';
import {
    TrendingUp,
    ArrowUpRight,
    Zap,
    History,
    ShieldAlert,
    Wallet,
    LayoutDashboard,
    PieChart,
    Users,
    Activity,
    Lock
} from 'lucide-react';
import axios from 'axios';

export const CEOAnalytics = () => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCEOData();
    }, []);

    const fetchCEOData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('http://localhost:5000/api/ceo/ceo-vault', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setData(response.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-indigo-600"></div>
            <p className="text-xs font-black text-indigo-600 uppercase tracking-widest">Unlocking CEO Vault</p>
        </div>
    );

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-4xl font-black heading-gradient flex items-center gap-3 italic">
                        <Lock className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2 rounded-2xl" />
                        Executive <span className="text-indigo-400">Vault</span>
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Critical financial intelligence and compliance oversight.</p>
                </div>
                <div className="flex items-center gap-4 bg-slate-900 text-white px-6 py-3 rounded-2xl shadow-xl">
                    <History className="w-5 h-5 text-indigo-400" />
                    <div className="text-left">
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Last Updated</p>
                        <p className="text-xs font-bold">{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </div>

            {/* Financial Intelligence Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="glass-card p-8 bg-gradient-to-br from-slate-900 to-slate-800 text-white border-0 shadow-2xl">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Salary Liability</p>
                    <h3 className="text-4xl font-black italic tracking-tighter">₹{data?.finance.currentLiability.toLocaleString()}</h3>
                    <p className="text-[10px] text-slate-400 mt-4 flex items-center gap-1 font-bold">
                        <TrendingUp className="w-3 h-3 text-emerald-400" />
                        Vs Last Month: ₹{data?.finance.lastMonthPayout.toLocaleString()}
                    </p>
                </div>

                <div className="glass-card p-8 bg-white border-slate-100">
                    <div className="p-3 bg-emerald-50 w-fit rounded-xl mb-6">
                        <Wallet className="w-6 h-6 text-emerald-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gross Earnings</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">₹{data?.finance.currentGross.toLocaleString()}</h3>
                    <p className="text-[10px] text-emerald-500 mt-2 font-bold italic">Before statutory deductions</p>
                </div>

                <div className="glass-card p-8 bg-white border-slate-100">
                    <div className="p-3 bg-indigo-50 w-fit rounded-xl mb-6">
                        <Users className="w-6 h-6 text-indigo-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Processed Headcount</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">{data?.finance.processedCount}</h3>
                    <p className="text-[10px] text-indigo-500 mt-2 font-bold italic">Employees in current cycle</p>
                </div>

                <div className="glass-card p-8 bg-white border-slate-100">
                    <div className="p-3 bg-rose-50 w-fit rounded-xl mb-6">
                        <ShieldAlert className="w-6 h-6 text-rose-600" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Deductions</p>
                    <h3 className="text-3xl font-black text-slate-800 tracking-tighter">₹{data?.finance.currentDeductions.toLocaleString()}</h3>
                    <p className="text-[10px] text-rose-500 mt-2 font-bold italic">PF, ESI, and Professional Tax</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Departmental Spend */}
                <div className="glass-card p-10">
                    <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                        <PieChart className="w-6 h-6 text-indigo-500" />
                        Cost Center <span className="text-indigo-600">Optimization</span>
                    </h3>
                    <div className="space-y-6">
                        {data?.deptSpend.map((dept: any, i: number) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-end">
                                    <p className="font-black text-slate-800 text-sm uppercase italic">{dept.name}</p>
                                    <p className="font-black text-indigo-600 text-lg tracking-tighter">₹{dept.total.toLocaleString()}</p>
                                </div>
                                <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${(dept.total / (data?.finance.currentLiability || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit History (Security Oversight) */}
                <div className="glass-card p-10 bg-slate-50 border-slate-200">
                    <h3 className="text-xl font-black text-slate-800 mb-8 flex items-center gap-2">
                        <Activity className="w-6 h-6 text-rose-500" />
                        Governance <span className="text-rose-600">Audit Trail</span>
                    </h3>
                    <div className="space-y-4">
                        {data?.criticalLogs.map((log: any) => (
                            <div key={log.id} className="p-4 bg-white rounded-2xl border border-slate-100 flex gap-4 hover:shadow-md transition-all group">
                                <div className="p-3 bg-slate-50 rounded-xl group-hover:bg-indigo-50 transition-colors">
                                    <Zap className="w-5 h-5 text-slate-400 group-hover:text-indigo-600" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-black uppercase text-indigo-600 leading-none">{log.action.replace('_', ' ')}</p>
                                        <span className="text-slate-300">•</span>
                                        <p className="text-[10px] font-black uppercase text-slate-400 leading-none">{new Date(log.time).toLocaleTimeString()}</p>
                                    </div>
                                    <p className="text-slate-800 font-bold text-sm leading-tight">{log.description}</p>
                                    <p className="text-[10px] text-slate-400 mt-1 font-bold">Executed by <span className="text-indigo-500">{log.user}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                    <button className="w-full py-4 mt-8 bg-white border border-slate-200 rounded-[1.5rem] font-black text-xs text-slate-400 uppercase tracking-[0.2em] hover:text-indigo-600 hover:border-indigo-200 transition-all">
                        Access Full Forensic Logs
                    </button>
                </div>
            </div>
        </div>
    );
};
