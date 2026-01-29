import { useState, useEffect } from 'react';
import {
    DollarSign,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Download,
    Filter,
    AlertCircle,
    X,
    Printer,
    CheckCircle2
} from 'lucide-react';
import { payrollAPI, branchesAPI, departmentsAPI } from '../services/api';

export const Payroll = () => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null);

    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    useEffect(() => {
        fetchBranches();
        fetchDepartments();
    }, []);

    useEffect(() => {
        fetchPayroll();
    }, [currentDate, selectedBranch, selectedDepartment]);

    const fetchBranches = async () => {
        const res = await branchesAPI.getAll();
        setBranches(res.data);
    };

    const fetchDepartments = async () => {
        const res = await departmentsAPI.getAll();
        setDepartments(res.data);
    };

    const fetchPayroll = async () => {
        try {
            setLoading(true);
            const res = await payrollAPI.get({ month, year, branchId: selectedBranch, departmentId: selectedDepartment });
            setPayrolls(res.data);
        } catch (error) {
            console.error('Fetch payroll error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleGenerate = async () => {
        if (!confirm(`Generate payroll for ${monthName} ${year}? This will calculate salaries, PF, ESI, and OT.`)) return;
        try {
            setGenerating(true);
            await payrollAPI.generate({ month, year, branchId: selectedBranch, departmentId: selectedDepartment });
            fetchPayroll();
        } catch (error) {
            alert('Failed to generate payroll');
        } finally {
            setGenerating(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('payslip-print');
        const originalContents = document.body.innerHTML;
        if (printContent) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Payslip</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('</head><body >');
                printWindow.document.write(printContent.innerHTML);
                printWindow.document.write('</body></html>');
                printWindow.document.close();
                setTimeout(() => {
                    printWindow.print();
                    printWindow.close();
                }, 500);
            }
        }
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month, 1));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-indigo-600" />
                        Full-Fledged Payroll
                    </h1>
                    <p className="text-gray-500">Attendance-Linked Salary, PF, ESI & OT Management</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white rounded-lg border shadow-sm overflow-hidden">
                        <button onClick={prevMonth} className="p-2 hover:bg-gray-100"><ChevronLeft className="w-5 h-5" /></button>
                        <div className="px-4 py-2 font-bold min-w-[150px] text-center bg-gray-50 border-x">
                            {monthName} {year}
                        </div>
                        <button onClick={nextMonth} className="p-2 hover:bg-gray-100"><ChevronRight className="w-5 h-5" /></button>
                    </div>

                    <button
                        onClick={handleGenerate}
                        disabled={generating}
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all shadow-md ${generating ? 'bg-gray-400' : 'bg-indigo-600 hover:bg-indigo-700 active:scale-95'
                            }`}
                    >
                        {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        {generating ? 'Calculating Statutory Math...' : 'Generate Full Payroll'}
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white p-4 rounded-xl shadow-sm border flex flex-wrap gap-4 items-center">
                <div className="flex items-center gap-2 text-gray-400">
                    <Filter className="w-5 h-5" />
                    <span className="text-sm font-medium">Filters:</span>
                </div>
                <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-gray-500 text-sm font-medium">Monthly Gross</p>
                    <p className="text-2xl font-bold text-gray-800">
                        ₹{payrolls.reduce((sum, p) => sum + p.grossSalary, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                    <p className="text-gray-500 text-sm font-medium">Total Net Payout</p>
                    <p className="text-2xl font-bold text-gray-800 text-green-600">
                        ₹{payrolls.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                    <p className="text-gray-500 text-sm font-medium">Statutory Deductions (PF/ESI)</p>
                    <p className="text-2xl font-bold text-gray-800">
                        ₹{payrolls.reduce((sum, p) => sum + p.pfDeduction + p.esiDeduction, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-indigo-500">
                    <p className="text-gray-500 text-sm font-medium">Total Overtime Pay</p>
                    <p className="text-2xl font-bold text-gray-800">
                        ₹{payrolls.reduce((sum, p) => sum + p.otPay, 0).toLocaleString()}
                    </p>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-gray-400">
                        <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4" />
                        <p>Processing Payroll Data...</p>
                    </div>
                ) : payrolls.length === 0 ? (
                    <div className="p-20 text-center text-gray-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                        <p>No payroll records found. Click "Generate Full Payroll" to run calculations.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b text-gray-600 font-bold">
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4 text-center">P-Days</th>
                                    <th className="px-6 py-4 text-right">Gross</th>
                                    <th className="px-6 py-4 text-right text-indigo-600">OT Pay</th>
                                    <th className="px-6 py-4 text-right text-red-500">PF/ESI</th>
                                    <th className="px-6 py-4 text-right font-black text-green-700">Net Salary</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payrolls.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800">
                                                    {p.employee.firstName} {p.employee.lastName}
                                                </span>
                                                <span className="text-xs text-gray-400">
                                                    {p.employee.employeeCode} • {p.employee.department.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center font-bold">
                                            {p.presentDays}
                                        </td>
                                        <td className="px-6 py-4 text-right font-medium">₹{p.grossSalary.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-right text-indigo-600 font-medium">
                                            ₹{p.otPay.toFixed(0)}
                                            <div className="text-[10px] text-gray-400">({p.otHours.toFixed(1)} hrs)</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-red-500 font-medium">
                                            -₹{(p.pfDeduction + p.esiDeduction).toFixed(0)}
                                            <div className="text-[10px] text-gray-400">PF: {p.pfDeduction.toFixed(0)} | ESI: {p.esiDeduction.toFixed(0)}</div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-green-700 font-black text-base">₹{p.netSalary.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                onClick={() => setSelectedPayroll(p)}
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="View / Download Payslip"
                                            >
                                                <Download className="w-5 h-5" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Payslip Modal */}
            {selectedPayroll && (
                <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 flex items-center gap-2 text-xl">
                                <DollarSign className="w-6 h-6 text-indigo-600" />
                                Review Payslip
                            </h3>
                            <button onClick={() => setSelectedPayroll(null)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div id="payslip-print" className="p-10 bg-white">
                            {/* Company Header */}
                            <div className="border-b-2 border-indigo-600 pb-6 mb-8 text-center">
                                <h2 className="text-3xl font-black text-indigo-900 tracking-tight">APEXTIME HRM</h2>
                                <p className="text-gray-500 uppercase text-xs font-bold tracking-widest mt-1">Salary Slip: {monthName} {year}</p>
                            </div>

                            {/* Employee Info */}
                            <div className="grid grid-cols-2 gap-8 mb-10 text-sm">
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Employee Name:</span>
                                        <span className="font-bold text-gray-800">{selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Employee ID:</span>
                                        <span className="font-bold text-gray-800">{selectedPayroll.employee.employeeCode}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Department:</span>
                                        <span className="font-bold text-gray-800">{selectedPayroll.employee.department.name}</span>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Days Present:</span>
                                        <span className="font-bold text-gray-800">{selectedPayroll.presentDays} / {selectedPayroll.totalWorkingDays}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">OT Hours:</span>
                                        <span className="font-bold text-gray-800">{selectedPayroll.otHours.toFixed(1)}</span>
                                    </div>
                                    <div className="flex justify-between border-b pb-1">
                                        <span className="text-gray-500">Branch:</span>
                                        <span className="font-bold text-gray-800">{selectedPayroll.employee.branch.name}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Earnings & Deductions */}
                            <div className="grid grid-cols-2 gap-0 border-2 border-gray-100 rounded-xl overflow-hidden mb-10">
                                <div className="bg-gray-50 p-6 border-r-2 border-gray-100">
                                    <h4 className="font-black text-indigo-900 text-sm uppercase mb-4 border-b-2 border-indigo-200 pb-1">Earnings</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between font-medium"><span>Basic Pay</span><span>₹{selectedPayroll.basicPaid.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-medium"><span>HRA</span><span>₹{selectedPayroll.hraPaid.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-medium"><span>Allowances</span><span>₹{selectedPayroll.allowancesPaid.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-bold text-indigo-600"><span>Overtime Pay</span><span>₹{selectedPayroll.otPay.toFixed(2)}</span></div>
                                        <div className="mt-4 pt-4 border-t-2 border-indigo-100 flex justify-between font-black text-gray-900 text-base">
                                            <span>Gross Salary</span>
                                            <span>₹{selectedPayroll.grossSalary.toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-6">
                                    <h4 className="font-black text-red-900 text-sm uppercase mb-4 border-b-2 border-red-100 pb-1">Deductions</h4>
                                    <div className="space-y-3 text-sm">
                                        <div className="flex justify-between font-medium"><span>Provident Fund (PF)</span><span>₹{selectedPayroll.pfDeduction.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-medium"><span>ESI</span><span>₹{selectedPayroll.esiDeduction.toFixed(2)}</span></div>
                                        <div className="flex justify-between font-medium"><span>Other Deductions</span><span>₹{(selectedPayroll.netSalary - selectedPayroll.grossSalary + selectedPayroll.pfDeduction + selectedPayroll.esiDeduction).toFixed(2)}</span></div>
                                        <div className="mt-4 pt-16 border-t-2 border-red-50 flex justify-between font-black text-red-600 text-base">
                                            <span>Total Deductions</span>
                                            <span>₹{(selectedPayroll.grossSalary - selectedPayroll.netSalary).toFixed(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Salary Footer */}
                            <div className="bg-indigo-900 rounded-xl p-6 text-white flex justify-between items-center shadow-lg transform scale-105">
                                <div>
                                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">Net Payable Salary</p>
                                    <p className="text-3xl font-black">₹{selectedPayroll.netSalary.toLocaleString()}</p>
                                </div>
                                <div className="text-right hidden sm:block">
                                    <p className="text-indigo-200 text-[10px]">Computed dynamically from attendance logs</p>
                                    <p className="text-[10px]">Verified By Finance Dept</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 bg-gray-50 border-t flex justify-end gap-3">
                            <button
                                onClick={() => setSelectedPayroll(null)}
                                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 font-bold hover:bg-white transition-all shadow-sm"
                            >
                                Close
                            </button>
                            <button
                                onClick={handlePrint}
                                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                <Printer className="w-5 h-5" />
                                Download as PDF
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
