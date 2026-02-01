
import { useState, useEffect } from 'react';
import { Plus, Trash2, CreditCard, Calendar, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Loan {
    id: string;
    amount: number;
    interestRate: number;
    tenureMonths: number;
    monthlyDeduction: number;
    startDate: string;
    status: string;
    balanceAmount: number;
    repaidAmount: number;
}

interface EmployeeLoansProps {
    employeeId: string;
}

export const EmployeeLoans = ({ employeeId }: EmployeeLoansProps) => {
    const [loans, setLoans] = useState<Loan[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [amount, setAmount] = useState('');
    const [tenure, setTenure] = useState('');
    const [date, setDate] = useState('');
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchLoans();
    }, [employeeId]);

    const fetchLoans = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/loans?employeeId=${employeeId}`);
            setLoans(res.data);
        } catch (error) {
            console.error('Failed to load loans:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            await api.post('/loans', {
                employeeId,
                amount: Number(amount),
                tenureMonths: Number(tenure),
                startDate: date,
                // optional: interestRate, monthlyDeduction (auto-calc)
            });
            setShowForm(false);
            setAmount('');
            setTenure('');
            setDate('');
            fetchLoans();
        } catch (error) {
            alert('Failed to create loan');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="app-card overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-purple-600" />
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Loans & Advances</h3>
                </div>
                {!showForm && (
                    <button
                        onClick={() => setShowForm(true)}
                        className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
                    >
                        <Plus className="w-3 h-3" /> Add Loan
                    </button>
                )}
            </div>

            <div className="p-8">
                {showForm && (
                    <form onSubmit={handleCreate} className="mb-8 bg-gray-50 p-6 rounded-xl border border-gray-100 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Amount</label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={e => setAmount(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Tenure (Months)</label>
                                <input
                                    type="number"
                                    value={tenure}
                                    onChange={e => setTenure(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                                <input
                                    type="date"
                                    value={date}
                                    onChange={e => setDate(e.target.value)}
                                    className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-xs font-bold"
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <button
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-xs font-bold text-gray-500 hover:bg-gray-200 rounded-lg"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                disabled={submitting}
                                className="px-6 py-2 bg-purple-600 text-white text-xs font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50"
                            >
                                {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Loan'}
                            </button>
                        </div>
                    </form>
                )}

                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-gray-300" /></div>
                    ) : loans.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs">No active loans.</p>
                    ) : (
                        loans.map(loan => (
                            <div key={loan.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl relative overflow-hidden">
                                {loan.status === 'COMPLETED' && <div className="absolute top-0 right-0 bg-green-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg">PAID</div>}

                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <p className="text-sm font-black text-gray-800">₹{loan.amount.toLocaleString()}</p>
                                        <span className="text-[10px] bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full font-bold">
                                            ₹{Math.round(loan.monthlyDeduction)} / mo
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-gray-400">
                                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(loan.startDate).toLocaleDateString()}</span>
                                        <span>{loan.tenureMonths} Months</span>
                                    </div>
                                </div>

                                <div className="text-right">
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Balance</p>
                                    <p className="text-sm font-bold text-gray-700">₹{Math.round(loan.balanceAmount).toLocaleString()}</p>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
