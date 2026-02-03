import { useEffect, useState } from 'react';
import { FileText, Search, Download, Filter, Eye } from 'lucide-react';
import { financeAPI } from '../../../services/api';

export const Invoices = () => {
    const [invoices, setInvoices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInvoices();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const res = await financeAPI.getInvoices();
            setInvoices(res.data.data);
        } catch (error) {
            console.error('Failed to fetch invoices', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <FileText className="w-8 h-8 text-indigo-600" />
                        Fee Invoices
                    </h1>
                    <p className="text-gray-500 text-sm">View and manage all student fee receipts and invoices</p>
                </div>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                <Search className="w-5 h-5 text-gray-400 ml-2" />
                <input
                    type="text"
                    placeholder="Search by student name or invoice number..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 font-medium"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <button className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200 transition-all">
                    <Filter className="w-5 h-5 text-gray-600" />
                </button>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Invoice #</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Student</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Amount</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Date</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Status</th>
                            <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {loading ? (
                            <tr><td colSpan={6} className="px-6 py-10 text-center text-gray-400">Loading invoices...</td></tr>
                        ) : invoices.length > 0 ? invoices.map((invoice) => (
                            <tr key={invoice.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-6 py-4 font-bold text-gray-900">{invoice.invoiceNo || 'INV-001'}</td>
                                <td className="px-6 py-4 text-sm text-gray-600">{invoice.student?.firstName} {invoice.student?.lastName}</td>
                                <td className="px-6 py-4 text-sm font-bold text-gray-900">₹{invoice.amount?.toLocaleString()}</td>
                                <td className="px-6 py-4 text-sm text-gray-500">{new Date(invoice.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase ${invoice.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {invoice.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Eye className="w-4 h-4" /></button>
                                        <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"><Download className="w-4 h-4" /></button>
                                    </div>
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-20 text-center">
                                    <div className="flex flex-col items-center gap-2 text-gray-400">
                                        <FileText className="w-12 h-12 opacity-20" />
                                        <p>No invoices found matching your criteria</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
