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
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center bg-white p-6 rounded-xl border border-gray-200">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        <Lock className="w-8 h-8 text-indigo-600" />
                        Executive Overview
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Strategic financial and compliance intelligence.</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Status</p>
                    <p className="text-sm font-semibold text-emerald-600 flex items-center gap-1 justify-end">
                        <Activity className="w-3 h-3" /> Live
                    </p>
                </div>
            </div>

            {/* Financial Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Net Liability</p>
                    <h3 className="text-3xl font-bold text-gray-900">₹{data?.finance.currentLiability.toLocaleString()}</h3>
                    <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
                        <p className="text-[10px] text-gray-400 font-medium">Last Month</p>
                        <p className="text-xs font-semibold text-gray-600">₹{data?.finance.lastMonthPayout.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Gross Earnings</p>
                    <h3 className="text-3xl font-bold text-gray-900">₹{data?.finance.currentGross.toLocaleString()}</h3>
                    <p className="text-[10px] text-emerald-600 mt-2 font-medium">Before deductions</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Active Payroll Count</p>
                    <h3 className="text-3xl font-bold text-gray-900">{data?.finance.processedCount}</h3>
                    <p className="text-[10px] text-indigo-600 mt-2 font-medium">Current cycle</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Deductions</p>
                    <h3 className="text-3xl font-bold text-gray-900">₹{data?.finance.currentDeductions.toLocaleString()}</h3>
                    <p className="text-[10px] text-red-500 mt-2 font-medium">Statutory recovery</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Departmental Spend */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-indigo-600" />
                        Budget Distribution
                    </h3>
                    <div className="space-y-5">
                        {data?.deptSpend.map((dept: any, i: number) => (
                            <div key={i} className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <p className="font-semibold text-gray-700 text-sm">{dept.name}</p>
                                    <p className="font-bold text-gray-900 text-sm">₹{dept.total.toLocaleString()}</p>
                                </div>
                                <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-indigo-500 rounded-full"
                                        style={{ width: `${(dept.total / (data?.finance.currentLiability || 1)) * 100}%` }}
                                    ></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Audit Trail */}
                <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        Recent Administrative Actions
                    </h3>
                    <div className="space-y-3">
                        {data?.criticalLogs.map((log: any) => (
                            <div key={log.id} className="p-4 border border-gray-50 bg-gray-50/50 rounded-lg flex gap-4 transition-all">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-[10px] font-bold uppercase text-indigo-600">{log.action.replace('_', ' ')}</p>
                                    </div>
                                    <p className="text-gray-800 font-medium text-sm">{log.description}</p>
                                    <p className="text-[10px] text-gray-400 mt-1">
                                        By <span className="font-semibold text-gray-600">{log.user}</span> • {new Date(log.time).toLocaleTimeString()}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
