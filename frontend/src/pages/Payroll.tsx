import { useState, useEffect } from 'react';
import {
    DollarSign,
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Download,
    Filter,
    CheckCircle2,
    AlertCircle
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
        if (!confirm(`Generate payroll for ${monthName} ${year}? This will calculate salaries based on attendance.`)) return;
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

    const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month, 1));

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <DollarSign className="w-8 h-8 text-green-600" />
                        Payroll Management
                    </h1>
                    <p className="text-gray-500">Generate and manage monthly employee salaries</p>
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
                        className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white transition-all shadow-md ${generating ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700 active:scale-95'
                            }`}
                    >
                        {generating ? <RefreshCw className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                        {generating ? 'Calculating...' : 'Generate Payroll'}
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
                    className="px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                >
                    <option value="">All Branches</option>
                    {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
                <select
                    value={selectedDepartment}
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                    className="px-4 py-2 bg-gray-50 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 outline-none"
                >
                    <option value="">All Departments</option>
                    {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-blue-500">
                    <p className="text-gray-500 text-sm font-medium">Total Employees</p>
                    <p className="text-2xl font-bold text-gray-800">{payrolls.length}</p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-green-500">
                    <p className="text-gray-500 text-sm font-medium">Total Net Salary</p>
                    <p className="text-2xl font-bold text-gray-800">
                        ₹{payrolls.reduce((sum, p) => sum + p.netSalary, 0).toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-yellow-500">
                    <p className="text-gray-500 text-sm font-medium">Avg Present Days</p>
                    <p className="text-2xl font-bold text-gray-800">
                        {(payrolls.reduce((sum, p) => sum + p.presentDays, 0) / (payrolls.length || 1)).toFixed(1)}
                    </p>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
                    <p className="text-gray-500 text-sm font-medium">Draft Slips</p>
                    <p className="text-2xl font-bold text-gray-800">
                        {payrolls.filter(p => p.status === 'generated').length}
                    </p>
                </div>
            </div>

            {/* Payroll Table */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                {loading ? (
                    <div className="p-20 text-center text-gray-400">
                        <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4" />
                        <p>Loading payroll data...</p>
                    </div>
                ) : payrolls.length === 0 ? (
                    <div className="p-20 text-center text-gray-400">
                        <AlertCircle className="w-12 h-12 mx-auto mb-4" />
                        <p>No payroll records found. Click "Generate Payroll" to calculate values.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead>
                                <tr className="bg-gray-50 border-b text-gray-600 font-bold">
                                    <th className="px-6 py-4">Employee</th>
                                    <th className="px-6 py-4 text-center">Days (P/W)</th>
                                    <th className="px-6 py-4 text-right">Basic</th>
                                    <th className="px-6 py-4 text-right">HRA</th>
                                    <th className="px-6 py-4 text-right">Allowances</th>
                                    <th className="px-6 py-4 text-right">Deductions</th>
                                    <th className="px-6 py-4 text-right text-green-700 font-black">Net Salary</th>
                                    <th className="px-6 py-4 text-center">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y">
                                {payrolls.map((p) => (
                                    <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-800">{p.employee.firstName} {p.employee.lastName}</span>
                                                <span className="text-xs text-gray-400">{p.employee.employeeCode} • {p.employee.department.name}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-full font-bold text-xs">
                                                {p.presentDays}/{p.totalWorkingDays}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">₹{p.basicPaid.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-right">₹{p.hraPaid.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-right">₹{p.allowancesPaid.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-right text-red-500">-₹{p.deductions.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-right text-green-700 font-bold">₹{p.netSalary.toFixed(0)}</td>
                                        <td className="px-6 py-4 text-center">
                                            <button
                                                className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                title="Download Payslip"
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
        </div>
    );
};
