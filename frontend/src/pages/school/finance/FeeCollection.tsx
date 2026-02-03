import { useEffect, useState } from 'react';
import { DollarSign, Search, Plus, Filter, Download } from 'lucide-react';
import { financeAPI, schoolAPI } from '../../../services/api';

export const FeeCollection = () => {
    const [students, setStudents] = useState<any[]>([]);
    const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
    const [feeRecords, setFeeRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Payment Modal
    const [showPayModal, setShowPayModal] = useState<string | null>(null);
    const [payAmount, setPayAmount] = useState(0);
    const [payMode, setPayMode] = useState('CASH');

    useEffect(() => {
        if (searchTerm.length > 2) searchStudents();
    }, [searchTerm]);

    const searchStudents = async () => {
        // In real app, build a search API. For now, fetch all student brief
        // Re-using fetchAllStudents might be heavy but okay for < 1000 students
        const res = await schoolAPI.getAllStudents(); // Should filter by search in backend
        // Filter locally for now
        const filtered = res.data.data.filter((s: any) =>
            s.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
            s.admissionNo.includes(searchTerm)
        );
        setStudents(filtered);
    };

    const selectStudent = async (student: any) => {
        setSelectedStudent(student);
        setLoading(true);
        try {
            const res = await financeAPI.getStudentFees(student.id);
            setFeeRecords(res.data.data);
            setStudents([]); // clear search list
            setSearchTerm('');
        } finally {
            setLoading(false);
        }
    };

    const handlePayment = async () => {
        if (!showPayModal) return;
        try {
            await financeAPI.collectFee({
                recordId: showPayModal,
                amount: Number(payAmount),
                mode: payMode,
                transactionId: `TXN-${Date.now()}` // Mock txn
            });
            setShowPayModal(null);
            selectStudent(selectedStudent); // Refresh
        } catch (e) { alert('Payment Failed'); }
    };

    const totalDue = feeRecords.reduce((acc, r) => acc + (r.amount - r.paidAmount), 0);

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-800">
                <DollarSign className="w-8 h-8 text-green-600" /> Fee Collection
            </h1>

            {/* Student Search */}
            <div className="relative">
                <input
                    type="text"
                    placeholder="Search Student by Name or Admission No..."
                    className="w-full pl-12 pr-4 py-3 bg-white border border-gray-200 rounded-xl shadow-sm focus:ring-2 focus:ring-blue-500 text-lg"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />

                {students.length > 0 && (
                    <div className="absolute top-full mt-2 w-full bg-white rounded-xl shadow-xl z-20 overflow-hidden border border-gray-100">
                        {students.map(s => (
                            <div key={s.id} onClick={() => selectStudent(s)} className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-50 flex justify-between items-center px-6">
                                <div>
                                    <div className="font-bold text-gray-800">{s.firstName} {s.lastName}</div>
                                    <div className="text-xs text-gray-500">{s.admissionNo} • {s.batch?.course?.name} {s.batch?.name}</div>
                                </div>
                                <span className={`text-xs px-2 py-1 rounded-full ${s.status === 'ACTIVE' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {selectedStudent && (
                <div className="flex flex-col lg:flex-row gap-6">
                    {/* Student Info Card */}
                    <div className="w-full lg:w-1/3 space-y-4">
                        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-2xl font-bold text-blue-600">
                                    {selectedStudent.firstName[0]}
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold">{selectedStudent.firstName} {selectedStudent.lastName}</h2>
                                    <div className="text-gray-500">{selectedStudent.admissionNo}</div>
                                </div>
                            </div>

                            <div className="space-y-3 text-sm">
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Class</span>
                                    <span className="font-medium">{selectedStudent.batch?.course?.name} {selectedStudent.batch?.name}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Father Name</span>
                                    <span className="font-medium">{selectedStudent.guardian?.firstName}</span>
                                </div>
                                <div className="flex justify-between py-2 border-b border-gray-50">
                                    <span className="text-gray-500">Contact</span>
                                    <span className="font-medium">{selectedStudent.guardian?.phone}</span>
                                </div>
                            </div>

                            <div className="mt-6 p-4 bg-red-50 rounded-xl border border-red-100">
                                <div className="text-sm text-red-600 mb-1">Total Due</div>
                                <div className="text-3xl font-bold text-red-700">₹{totalDue.toLocaleString()}</div>
                            </div>
                        </div>
                    </div>

                    {/* Fee Records List */}
                    <div className="flex-1 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <h3 className="font-bold text-gray-800 mb-4 pb-2 border-b border-gray-100">Pending Invoices</h3>
                        <div className="space-y-4">
                            {feeRecords.map(record => (
                                <div key={record.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-sm transition-shadow">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-gray-800">{record.title}</h4>
                                            <div className="text-xs text-gray-500">Due: {new Date(record.dueDate).toLocaleDateString()}</div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-xs font-bold ${record.status === 'PAID' ? 'bg-green-100 text-green-700' :
                                                record.status === 'PARTIAL' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-50 text-red-600'
                                            }`}>
                                            {record.status}
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-3">
                                        <div className="text-sm">
                                            <span className="text-gray-500">Amount: </span>
                                            <span className="font-medium">₹{record.amount}</span>
                                            {record.paidAmount > 0 && <span className="text-green-600 ml-2">(Paid: ₹{record.paidAmount})</span>}
                                        </div>
                                        {record.status !== 'PAID' && (
                                            <button
                                                onClick={() => { setShowPayModal(record.id); setPayAmount(record.amount - record.paidAmount); }}
                                                className="bg-green-600 text-white px-4 py-1.5 rounded-lg text-sm hover:bg-green-700 transition"
                                            >
                                                Collect
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {feeRecords.length === 0 && <p className="text-center text-gray-400 py-10">No records found</p>}
                        </div>
                    </div>
                </div>
            )}

            {/* Payment Modal */}
            {showPayModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6">
                        <h3 className="text-xl font-bold mb-4">Collect Payment</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Amount</label>
                                <input type="number" className="w-full rounded-lg border-gray-300 text-lg" value={payAmount} onChange={e => setPayAmount(Number(e.target.value))} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Payment Mode</label>
                                <select className="w-full rounded-lg border-gray-300" value={payMode} onChange={e => setPayMode(e.target.value)}>
                                    <option value="CASH">Cash</option>
                                    <option value="ONLINE">Online / UPI</option>
                                    <option value="CHEQUE">Cheque</option>
                                </select>
                            </div>
                            <button onClick={handlePayment} className="w-full bg-green-600 text-white py-3 rounded-xl font-bold text-lg mt-2">
                                Confirm Payment
                            </button>
                            <button onClick={() => setShowPayModal(null)} className="w-full bg-gray-100 text-gray-600 py-2 rounded-xl text-sm font-medium">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
