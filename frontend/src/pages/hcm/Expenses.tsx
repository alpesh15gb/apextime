import React, { useState, useEffect } from 'react';
import {
    Plus,
    Search,
    Filter,
    MoreVertical,
    Calendar,
    DollarSign,
    Receipt,
    CheckCircle2,
    XCircle,
    Clock,
    Download,
    Eye,
    Trash2,
    FileText,
    MapPin,
    Image as ImageIcon
} from 'lucide-react';
import { payrollAdjustmentsAPI, employeesAPI } from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';

interface Expense {
    id: string;
    employeeId: string;
    type: string;
    amount: number;
    billDate: string;
    billNumber?: string;
    description?: string;
    attachment?: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PAID';
    createdAt: string;
    employee?: {
        firstName: string;
        lastName: string;
        employeeCode: string;
    };
}

const ExpenseModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    employees: any[];
}> = ({ isOpen, onClose, onSuccess, employees }) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        employeeId: user?.employeeId || '',
        type: 'TRAVEL',
        amount: '',
        billDate: new Date().toISOString().split('T')[0],
        billNumber: '',
        description: ''
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await payrollAdjustmentsAPI.createReimbursement(formData);
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error creating expense:', error);
            alert('Failed to create expense request');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                    <h3 className="text-xl font-bold text-gray-900">Add New Expense</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <XCircle size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {user?.role !== 'employee' && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Employee</label>
                            <select
                                required
                                value={formData.employeeId}
                                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="">Select Employee</option>
                                {employees.map(emp => (
                                    <option key={emp.id} value={emp.id}>
                                        {emp.firstName} {emp.lastName} ({emp.employeeCode})
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expense Type</label>
                            <select
                                value={formData.type}
                                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                                <option value="TRAVEL">Travel</option>
                                <option value="FOOD">Food & Meals</option>
                                <option value="MEDICAL">Medical</option>
                                <option value="INTERNET">Internet/Broadband</option>
                                <option value="MOBILE">Mobile/Telephone</option>
                                <option value="OFFICE">Office Supplies</option>
                                <option value="OTHER">Other</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={formData.amount}
                                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="0.00"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date</label>
                            <input
                                required
                                type="date"
                                value={formData.billDate}
                                onChange={(e) => setFormData({ ...formData, billDate: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                            <input
                                type="text"
                                value={formData.billNumber}
                                onChange={(e) => setFormData({ ...formData, billNumber: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                placeholder="Optional"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                            placeholder="What was this expense for?"
                        ></textarea>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:bg-blue-300 transition-colors font-bold shadow-lg shadow-blue-200"
                        >
                            {loading ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const Expenses = () => {
    const { user } = useAuth();
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [employees, setEmployees] = useState([]);
    const [filter, setFilter] = useState({ status: '', type: '' });

    useEffect(() => {
        loadExpenses();
        if (user?.role !== 'employee') {
            loadEmployees();
        }
    }, [filter]);

    const loadExpenses = async () => {
        setLoading(true);
        try {
            const res = await payrollAdjustmentsAPI.getReimbursements(filter);
            setExpenses(res.data);
        } catch (error) {
            console.error('Error loading expenses:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadEmployees = async () => {
        try {
            const res = await employeesAPI.getAll();
            setEmployees(res.data);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const handleUpdateStatus = async (id: string, status: string) => {
        if (!confirm(`Are you sure you want to mark this as ${status}?`)) return;
        try {
            await payrollAdjustmentsAPI.updateReimbursementStatus(id, status);
            loadExpenses();
        } catch (error) {
            console.error('Error updating status:', error);
            alert('Failed to update status');
        }
    };

    const stats = {
        total: expenses.reduce((sum, e) => sum + e.amount, 0),
        pending: expenses.filter(e => e.status === 'PENDING').reduce((sum, e) => sum + e.amount, 0),
        approved: expenses.filter(e => e.status === 'APPROVED').reduce((sum, e) => sum + e.amount, 0),
        count: expenses.length
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Expenses & Reimbursements</h1>
                    <p className="text-gray-500 mt-1">
                        {user?.role === 'employee' ? 'Track your expense claims' : 'Manage employee expense requests'}
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 active:scale-95 font-bold"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    New Claim
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <Receipt size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Claims</p>
                        <p className="text-xl font-bold text-gray-900">₹{stats.total.toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Pending Approval</p>
                        <p className="text-xl font-bold text-gray-900">₹{stats.pending.toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-green-50 text-green-600 rounded-xl">
                        <CheckCircle2 size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Approved Amount</p>
                        <p className="text-xl font-bold text-gray-900">₹{stats.approved.toLocaleString('en-IN')}</p>
                    </div>
                </div>
                <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex items-center space-x-4">
                    <div className="p-3 bg-purple-50 text-purple-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Count</p>
                        <p className="text-xl font-bold text-gray-900">{stats.count} Requests</p>
                    </div>
                </div>
            </div>

            {/* List and Filters */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 flex flex-wrap gap-4 items-center justify-between bg-gray-50/30">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative max-w-sm flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search bills or employees..."
                                className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                        </div>
                        <select
                            value={filter.status}
                            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                            className="px-3 py-2 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="">All Status</option>
                            <option value="PENDING">Pending</option>
                            <option value="APPROVED">Approved</option>
                            <option value="REJECTED">Rejected</option>
                            <option value="PAID">Paid</option>
                        </select>
                    </div>
                    <button className="flex items-center px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 font-medium transition-colors">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50/50">
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Expense Details</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Employee</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Bill Date</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                Array(5).fill(0).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-4 h-16 bg-gray-50/20"></td>
                                    </tr>
                                ))
                            ) : expenses.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-20 text-center text-gray-500">
                                        <div className="flex flex-col items-center">
                                            <Receipt size={48} className="text-gray-200 mb-3" />
                                            <p className="font-medium text-lg">No expense claims found</p>
                                            <p className="text-sm">New claims will appear here for approval</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                expenses.map((expense) => (
                                    <tr key={expense.id} className="hover:bg-gray-50/80 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-3">
                                                <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                                    {expense.type === 'TRAVEL' ? <MapPin size={18} /> : <Receipt size={18} />}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 text-sm">{expense.type}</div>
                                                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{expense.description || 'No description'}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center space-x-2">
                                                <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold text-[10px]">
                                                    {expense.employee?.firstName[0]}
                                                </div>
                                                <div className="text-sm font-medium text-gray-700">
                                                    {expense.employee?.firstName} {expense.employee?.lastName}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 font-bold text-gray-900 text-sm">
                                            ₹{expense.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 font-medium">
                                            {new Date(expense.billDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase ${expense.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                expense.status === 'REJECTED' ? 'bg-red-100 text-red-700' :
                                                    expense.status === 'PAID' ? 'bg-blue-100 text-blue-700' :
                                                        'bg-amber-100 text-amber-700'
                                                }`}>
                                                {expense.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end items-center space-x-1">
                                                {user?.role !== 'employee' && expense.status === 'PENDING' && (
                                                    <>
                                                        <button
                                                            onClick={() => handleUpdateStatus(expense.id, 'APPROVED')}
                                                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                            title="Approve"
                                                        >
                                                            <CheckCircle2 size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(expense.id, 'REJECTED')}
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                            title="Reject"
                                                        >
                                                            <XCircle size={18} />
                                                        </button>
                                                    </>
                                                )}
                                                <button className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg transition-colors">
                                                    <MoreVertical size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Modal */}
            <ExpenseModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={loadExpenses}
                employees={employees}
            />
        </div>
    );
};

export default Expenses;
