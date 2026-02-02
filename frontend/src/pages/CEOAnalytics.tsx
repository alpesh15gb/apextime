import { useEffect, useState } from 'react';
import {
    TrendingUp,
    Zap,
    History,
    ShieldAlert,
    Wallet,
    LayoutDashboard,
    PieChart,
    Users,
    Activity,
    Lock,
    ArrowUpRight,
    TrendingDown,
    MoreVertical
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
            const response = await axios.get('/api/ceo/ceo-vault', {
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
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-blue-600 border-opacity-20 border-r-2 border-r-blue-600"></div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unlocking Global Financials...</p>
        </div>
    );

    const metrics = [
        { label: 'Total Net Liability', value: `₹${data?.finance.currentLiability.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-white', trend: '+2.4%', up: true },
        { label: 'Gross Monthly Earnings', value: `₹${data?.finance.currentGross.toLocaleString()}`, color: 'text-gray-900', bg: 'bg-white', trend: '+1.2%', up: true },
        { label: 'Active Payroll Cycle', value: data?.finance.processedCount, color: 'text-gray-900', bg: 'bg-white', trend: 'Stable', up: true },
        { label: 'Statutory Deductions', value: `₹${data?.finance.currentDeductions.toLocaleString()}`, color: 'text-red-600', bg: 'bg-white', trend: '-0.4%', up: false },
    ];

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
                        Executive Vault
                    </h1>
                    <p className="text-sm font-bold text-gray-400 mt-1">High-level financial intelligence and audit trails</p>
                </div>
                <div className="flex items-center space-x-3 bg-blue-50 px-5 py-3 rounded-2xl border border-blue-100">
                    <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Live Ledger Control</span>
                </div>
            </div>

            {/* Financial Multi-Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {metrics.map((m, i) => (
                    <div key={i} className="app-card p-10 group relative overflow-hidden">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">{m.label}</p>
                        <h3 className={`text-3xl font-extrabold tracking-tighter ${m.color}`}>{m.value}</h3>
                        <div className="mt-8 flex items-center justify-between">
                            <div className={`px-2 py-1 rounded-lg text-[10px] font-black ${m.up ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                {m.trend}
                            </div>
                            <span className="text-[10px] font-bold text-gray-300">Vs Last Quarter</span>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Budget Utilization Matrix */}
                <div className="app-card p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                            <PieChart className="w-5 h-5 text-gray-400" />
                            Budget Distribution
                        </h3>
                        <MoreVertical className="w-4 h-4 text-gray-300" />
                    </div>
                    <div className="space-y-8">
                        {data?.deptSpend.map((dept: any, i: number) => (
                            <div key={i} className="space-y-3">
                                <div className="flex justify-between items-end">
                                    <div>
                                        <p className="font-extrabold text-gray-800 text-sm leading-none">{dept.name}</p>
                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase">Allocation Active</p>
                                    </div>
                                    <p className="font-black text-gray-900 text-sm tracking-tight">₹{dept.total.toLocaleString()}</p>
                                </div>
                                <div className="w-full h-2.5 bg-gray-50 rounded-full overflow-hidden border border-gray-100">
                                    <div
                                        className="h-full bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.2)]"
                                        style={{ width: `${(dept.total / (data?.finance.currentLiability || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Secure Audit Trail */}
                <div className="app-card p-10">
                    <div className="flex justify-between items-center mb-10">
                        <h3 className="font-extrabold text-gray-800 tracking-tight flex items-center gap-2">
                            <ShieldAlert className="w-5 h-5 text-blue-500" />
                            Security Audit Log
                        </h3>
                        <button className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1.5 rounded-xl hover:bg-blue-100 transition-all">View All</button>
                    </div>
                    <div className="space-y-4">
                        {data?.criticalLogs.map((log: any) => (
                            <div key={log.id} className="p-5 border border-gray-50 bg-gray-50/20 rounded-[20px] transition-all hover:border-blue-100">
                                <div className="flex justify-between items-start mb-2">
                                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{log.action.replace('_', ' ')}</p>
                                    <span className="text-[10px] font-bold text-gray-300">{new Date(log.time).toLocaleTimeString()}</span>
                                </div>
                                <p className="text-gray-900 font-extrabold text-sm mb-1">{log.description}</p>
                                <div className="flex items-center space-x-2 mt-3">
                                    <div className="w-5 h-5 rounded-lg bg-gray-100 flex items-center justify-center text-[8px] font-black text-gray-500">
                                        {log.user[0]}
                                    </div>
                                    <p className="text-[10px] text-gray-400 font-bold">Initiated by <span className="text-gray-700">{log.user}</span></p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
