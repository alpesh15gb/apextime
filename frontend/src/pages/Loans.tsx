
import { useState, useEffect } from 'react';
import { CreditCard, Search, ArrowUpRight, TrendingUp, History, User, Calendar, Loader2 } from 'lucide-react';
import api from '../services/api';

export const Loans = () => {
    const [loans, setLoans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalAmount: 0,
        totalBalance: 0,
        activeCount: 0
    });

    useEffect(() => {
        fetchAllLoans();
    }, []);

    const fetchAllLoans = async () => {
        try {
            setLoading(true);
            const res = await api.get('/loans'); // I need to make sure the backend supports getting all loans
            const data = res.data;
            setLoans(data);

            const s = data.reduce((acc: any, loan: any) => {
                acc.totalAmount += loan.amount;
                acc.totalBalance += loan.balanceAmount;
                if (loan.status === 'ACTIVE') acc.activeCount++;
                return acc;
            }, { totalAmount: 0, totalBalance: 0, activeCount: 0 });
            setStats(s);

        } catch (error) {
            console.error('Failed to load all loans:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Loan Management</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">Centralized employee advances and recovery</p>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <TrendingUp className="w-8 h-8 text-purple-600 mb-4" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Disbursed Capital</p>
                        <h2 className="text-3xl font-black text-gray-900 mt-1">₹{stats.totalAmount.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <ArrowUpRight className="w-8 h-8 text-orange-600 mb-4" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Outstanding Balance</p>
                        <h2 className="text-3xl font-black text-gray-900 mt-1">₹{stats.totalBalance.toLocaleString()}</h2>
                    </div>
                </div>
                <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110"></div>
                    <div className="relative">
                        <History className="w-8 h-8 text-emerald-600 mb-4" />
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Contracts</p>
                        <h2 className="text-3xl font-black text-gray-900 mt-1">{stats.activeCount}</h2>
                    </div>
                </div>
            </div>

            {/* Loans Table */}
            <div className="app-card overflow-hidden">
                <div className="p-8 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                    <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-purple-600" />
                        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Disbursement Journal</h3>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Personnel</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Principal</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">EMI</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Balance</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Start Date</th>
                                <th className="px-8 py-5 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center">
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mb-4" />
                                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Accessing Financial Ledger...</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : loans.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="py-20 text-center text-gray-400 font-bold">No loans found in matrix.</td>
                                </tr>
                            ) : (
                                loans.map((loan) => (
                                    <tr key={loan.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                                    <User className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-gray-900">{loan.employee.firstName} {loan.employee.lastName}</p>
                                                    <p className="text-[10px] font-bold text-gray-400">{loan.employee.employeeCode}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-gray-900">₹{loan.amount.toLocaleString()}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase">{loan.tenureMonths} Months</p>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg inline-block text-[11px] font-black">
                                                ₹{Math.round(loan.monthlyDeduction).toLocaleString()}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-purple-600">₹{Math.round(loan.balanceAmount).toLocaleString()}</p>
                                            <div className="w-24 h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                                                <div
                                                    className="h-full bg-purple-500 rounded-full"
                                                    style={{ width: `${(loan.repaidAmount / loan.amount) * 100}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6 text-xs font-bold text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-3.5 h-3.5" />
                                                {new Date(loan.startDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${loan.status === 'ACTIVE' ? 'bg-blue-50 text-blue-600 border border-blue-100' : 'bg-gray-50 text-gray-400 border border-gray-100'
                                                }`}>
                                                {loan.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
