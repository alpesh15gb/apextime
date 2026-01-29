import { useState, useEffect, useMemo } from 'react';
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
    CheckCircle2,
    PieChart as PieChartIcon,
    Users,
    Settings,
    TrendingUp,
    ShieldCheck,
    CreditCard,
    ArrowRightCircle,
    DownloadCloud,
    Edit2,
    Save,
    Search
} from 'lucide-react';
import { payrollAPI, branchesAPI, departmentsAPI, employeesAPI } from '../services/api';
import {
    Chart as ChartJS,
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement,
} from 'chart.js';
import { Pie } from 'react-chartjs-2';

ChartJS.register(
    ArcElement,
    Tooltip,
    Legend,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    PointElement,
    LineElement
);

type Tab = 'overview' | 'payruns' | 'employees' | 'settings';

export const Payroll = () => {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [currentDate, setCurrentDate] = useState(new Date());
    const [payrolls, setPayrolls] = useState<any[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('');
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const month = currentDate.getMonth() + 1;
    const year = currentDate.getFullYear();
    const monthName = currentDate.toLocaleString('default', { month: 'long' });

    useEffect(() => {
        fetchBranches();
        fetchDepartments();
        fetchEmployees();
    }, []);

    useEffect(() => {
        if (activeTab === 'payruns' || activeTab === 'overview') {
            fetchPayroll();
        }
    }, [currentDate, selectedBranch, selectedDepartment, activeTab]);

    const fetchBranches = async () => {
        try {
            const res = await branchesAPI.getAll();
            setBranches(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchDepartments = async () => {
        try {
            const res = await departmentsAPI.getAll();
            setDepartments(res.data);
        } catch (e) { console.error(e); }
    };

    const fetchEmployees = async () => {
        try {
            const res = await employeesAPI.getAll();
            setEmployees(res.data);
        } catch (e) { console.error(e); }
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
        try {
            setGenerating(true);
            await payrollAPI.generate({ month, year, branchId: selectedBranch, departmentId: selectedDepartment });
            await fetchPayroll();
            setActiveTab('payruns');
        } catch (error) {
            alert('Failed to generate payroll');
        } finally {
            setGenerating(false);
        }
    };

    const handleProcessPay = async () => {
        if (!confirm(`Mark payroll for ${monthName} ${year} as PAID? This will update the status for all records.`)) return;
        try {
            setProcessing(true);
            await payrollAPI.processPay({ month, year, branchId: selectedBranch, departmentId: selectedDepartment });
            await fetchPayroll();
        } catch (error) {
            alert('Failed to process payment');
        } finally {
            setProcessing(false);
        }
    };

    const handleUpdateSalary = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await payrollAPI.updateSalary(editingEmployee.id, editingEmployee);
            alert('Salary structure updated successfully');
            setEditingEmployee(null);
            fetchEmployees();
        } catch (error) {
            alert('Failed to update salary');
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        const printContent = document.getElementById('payslip-print');
        if (printContent) {
            const printWindow = window.open('', '_blank');
            if (printWindow) {
                printWindow.document.write('<html><head><title>Payslip</title>');
                printWindow.document.write('<script src="https://cdn.tailwindcss.com"></script>');
                printWindow.document.write('<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">');
                printWindow.document.write('<style>body { font-family: "Inter", sans-serif; }</style>');
                printWindow.document.write('</head><body>');
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

    const stats = useMemo(() => {
        const totalGross = payrolls.reduce((sum, p) => sum + (p.grossSalary || 0), 0);
        const totalNet = payrolls.reduce((sum, p) => sum + (p.netSalary || 0), 0);
        const totalDeductions = payrolls.reduce((sum, p) => sum + (p.totalDeductions || 0), 0);
        const totalOT = payrolls.reduce((sum, p) => sum + (p.otPay || 0), 0);
        const paidCount = payrolls.filter(p => p.status === 'paid').length;
        const totalCount = payrolls.length;

        return { totalGross, totalNet, totalDeductions, totalOT, paidCount, totalCount };
    }, [payrolls]);

    const chartData = {
        labels: ['Net Pay', 'Deductions', 'Overtime Pay'],
        datasets: [
            {
                data: [stats.totalNet, stats.totalDeductions, stats.totalOT],
                backgroundColor: [
                    'rgba(99, 102, 241, 0.8)',
                    'rgba(244, 63, 94, 0.8)',
                    'rgba(16, 185, 129, 0.8)',
                ],
                borderColor: [
                    'rgb(99, 102, 241)',
                    'rgb(244, 63, 94)',
                    'rgb(16, 185, 129)',
                ],
                borderWidth: 1,
            },
        ],
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month, 1));

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-10">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black heading-gradient flex items-center gap-3">
                        <DollarSign className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2 rounded-2xl" />
                        Payroll Center
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        Enterprise-Grade Calculation & Compliance
                    </p>
                </div>

                <div className="flex items-center gap-4 bg-white/50 p-2 rounded-2xl border border-slate-100 backdrop-blur-sm shadow-sm">
                    <button onClick={prevMonth} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all"><ChevronLeft className="w-5 h-5 text-slate-400" /></button>
                    <div className="px-6 py-2 font-black text-slate-700 min-w-[160px] text-center">
                        {monthName} <span className="text-indigo-600">{year}</span>
                    </div>
                    <button onClick={nextMonth} className="p-2 hover:bg-white hover:shadow-md rounded-xl transition-all"><ChevronRight className="w-5 h-5 text-slate-400" /></button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 p-1 bg-slate-100/50 rounded-2xl w-fit border border-slate-200/50">
                {(['overview', 'payruns', 'employees', 'settings'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl font-bold capitalize transition-all duration-300 ${activeTab === tab
                            ? 'bg-white text-indigo-600 shadow-md transform scale-105'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                            }`}
                    >
                        {tab === 'payruns' ? 'Pay Runs' : tab}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    {/* Stats Column */}
                    <div className="xl:col-span-2 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            <div className="glass-card p-6 border-l-8 border-indigo-500 hover:scale-[1.02] transition-transform cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-indigo-50 rounded-2xl"><TrendingUp className="w-6 h-6 text-indigo-600" /></div>
                                    <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg">Month Total</span>
                                </div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Net Payout</p>
                                <p className="text-3xl font-black text-slate-800">₹{stats.totalNet.toLocaleString()}</p>
                            </div>

                            <div className="glass-card p-6 border-l-8 border-rose-500 hover:scale-[1.02] transition-transform cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-rose-50 rounded-2xl"><ShieldCheck className="w-6 h-6 text-rose-600" /></div>
                                    <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-1 rounded-lg">Compliance</span>
                                </div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total Deductions</p>
                                <p className="text-3xl font-black text-slate-800">₹{stats.totalDeductions.toLocaleString()}</p>
                            </div>

                            <div className="glass-card p-6 border-l-8 border-emerald-500 hover:scale-[1.02] transition-transform cursor-pointer">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-emerald-50 rounded-2xl"><DollarSign className="w-6 h-6 text-emerald-600" /></div>
                                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">Overtime</span>
                                </div>
                                <p className="text-slate-500 text-sm font-bold uppercase tracking-wider">Total OT Pay</p>
                                <p className="text-3xl font-black text-slate-800">₹{stats.totalOT.toLocaleString()}</p>
                            </div>
                        </div>

                        {/* Chart and Details */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="glass-card p-8">
                                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <PieChartIcon className="w-5 h-5 text-indigo-500" />
                                    Salary Allocation
                                </h3>
                                <div className="aspect-square max-w-[250px] mx-auto">
                                    <Pie data={chartData} options={{ plugins: { legend: { position: 'bottom' } } }} />
                                </div>
                            </div>

                            <div className="glass-card p-8 flex flex-col justify-center">
                                <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                                    <CreditCard className="w-5 h-5 text-indigo-500" />
                                    Pay Run Status
                                </h3>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-indigo-600">
                                                {stats.totalCount}
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-700">Total Employees</p>
                                                <p className="text-xs text-slate-400">Processed for {monthName}</p>
                                            </div>
                                        </div>
                                        <ArrowRightCircle className="w-6 h-6 text-slate-300" />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-emerald-600">
                                                {stats.paidCount}
                                            </div>
                                            <div>
                                                <p className="font-bold text-emerald-700">Paid Members</p>
                                                <p className="text-xs text-emerald-500">Payout disbursement complete</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-amber-50 rounded-2xl">
                                        <div className="flex items-center gap-3">
                                            <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center font-black text-amber-600">
                                                {stats.totalCount - stats.paidCount}
                                            </div>
                                            <div>
                                                <p className="font-bold text-amber-700">Pending Approval</p>
                                                <p className="text-xs text-amber-500">Awaiting final batch execution</p>
                                            </div>
                                        </div>
                                        <AlertCircle className="w-6 h-6 text-amber-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Action Panel Column */}
                    <div className="space-y-6">
                        <div className="glass-card p-8 bg-gradient-to-br from-indigo-600 to-blue-700 text-white border-0">
                            <h3 className="text-xl font-black mb-2">Process Pay Run</h3>
                            <p className="text-indigo-100 text-sm mb-8">Execute precise attendance-linked calculations for {monthName}.</p>

                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full py-4 bg-white text-indigo-600 rounded-2xl font-black shadow-xl shadow-indigo-900/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                {generating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <RefreshCw className="w-6 h-6" />}
                                {generating ? 'Re-Calculating...' : 'Execute Calculation Engine'}
                            </button>
                        </div>

                        <div className="glass-card p-8 border-emerald-100 bg-emerald-50/30">
                            <h3 className="text-xl font-black text-slate-800 mb-2">Final Batch Payout</h3>
                            <p className="text-slate-500 text-sm mb-8">Commit the runs to history and mark records as Disbursed.</p>

                            <button
                                onClick={handleProcessPay}
                                disabled={processing || stats.totalCount === 0 || stats.paidCount === stats.totalCount}
                                className={`w-full py-4 rounded-2xl font-black transition-all flex items-center justify-center gap-3 shadow-lg ${processing || stats.totalCount === 0 || stats.paidCount === stats.totalCount
                                        ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                        : 'bg-emerald-600 text-white shadow-emerald-200 hover:bg-emerald-700 active:scale-95'
                                    }`}
                            >
                                {processing ? <RefreshCw className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
                                {processing ? 'Finalizing...' : 'Approve Batch & Pay'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'payruns' && (
                <div className="space-y-6">
                    {/* Filters */}
                    <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2 text-slate-400">
                            <Filter className="w-5 h-5" />
                            <span className="text-sm font-bold">Filters:</span>
                        </div>
                        <select
                            value={selectedBranch}
                            onChange={(e) => setSelectedBranch(e.target.value)}
                            className="input-premium py-2 text-sm w-48"
                        >
                            <option value="">All Branches</option>
                            {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                        </select>
                        <select
                            value={selectedDepartment}
                            onChange={(e) => setSelectedDepartment(e.target.value)}
                            className="input-premium py-2 text-sm w-48"
                        >
                            <option value="">All Departments</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    </div>

                    <div className="glass-card overflow-hidden">
                        {loading ? (
                            <div className="p-20 text-center text-slate-400">
                                <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-indigo-500" />
                                <p className="font-bold">Accessing Secure Records...</p>
                            </div>
                        ) : payrolls.length === 0 ? (
                            <div className="p-20 text-center text-slate-400">
                                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-slate-200" />
                                <p className="text-xl font-bold text-slate-300">No active pay runs detected.</p>
                                <button onClick={() => setActiveTab('overview')} className="mt-4 text-indigo-600 font-black hover:underline underline-offset-4">Run the calculation engine</button>
                            </div>
                        ) : (
                            <div className="overflow-x-auto text-sm">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-slate-50/50 border-b text-slate-500 uppercase text-[10px] font-black tracking-widest">
                                            <th className="px-8 py-5">Employee</th>
                                            <th className="px-6 py-5">Attendance Structure</th>
                                            <th className="px-6 py-5 text-right">Fixed Gross</th>
                                            <th className="px-6 py-5 text-right">Total Deductions</th>
                                            <th className="px-6 py-5 text-right">Net Disbursement</th>
                                            <th className="px-6 py-5 text-center">Lifecycle</th>
                                            <th className="px-8 py-5 text-right">Statement</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y border-t-0">
                                        {payrolls.map((p) => (
                                            <tr key={p.id} className="hover:bg-indigo-50/30 transition-all group">
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="font-black text-slate-800 text-base group-hover:text-indigo-600 transition-colors">
                                                            {p.employee.firstName} {p.employee.lastName}
                                                        </span>
                                                        <span className="text-xs font-bold text-slate-400">
                                                            {p.employee.employeeCode} • {p.employee.department.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                                                        <Users className="w-4 h-4 text-slate-300" />
                                                        {p.paidDays} <span className="text-slate-300 font-normal">/ {p.totalWorkingDays} Paid Days</span>
                                                    </div>
                                                    <div className="text-[10px] text-rose-500 font-black">{p.lopDays > 0 ? `-${p.lopDays} LOP Applied` : 'Full Attendance'}</div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <span className="font-bold text-slate-800">₹{p.grossSalary.toLocaleString()}</span>
                                                </td>
                                                <td className="px-6 py-5 text-right font-bold text-rose-500">
                                                    -₹{p.totalDeductions.toLocaleString()}
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <div className="font-black text-lg text-emerald-600">₹{p.netSalary.toLocaleString()}</div>
                                                    {p.status === 'paid' && <div className="text-[10px] text-emerald-400 font-bold flex items-center justify-end gap-1"><CheckCircle2 className="w-3 h-3" /> Bank Disbursed</div>}
                                                </td>
                                                <td className="px-6 py-5 text-center">
                                                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm ${p.status === 'paid'
                                                            ? 'bg-emerald-100 text-emerald-700'
                                                            : 'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {p.status}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <button
                                                        onClick={() => setSelectedPayroll(p)}
                                                        className="p-3 bg-white border border-slate-100 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all shadow-sm"
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
            )}

            {activeTab === 'employees' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Employee List */}
                    <div className="lg:col-span-1 glass-card overflow-hidden flex flex-col h-[700px]">
                        <div className="p-6 border-b bg-slate-50/50">
                            <h3 className="font-black text-slate-800 mb-4">Salary Allocation List</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    placeholder="Search employee..."
                                    className="input-premium pl-10 py-2 text-sm"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y">
                            {employees.filter(emp =>
                                `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setEditingEmployee(emp)}
                                    className={`w-full p-6 text-left hover:bg-indigo-50 transition-all flex justify-between items-center group ${editingEmployee?.id === emp.id ? 'bg-indigo-50 border-r-4 border-indigo-600' : ''}`}
                                >
                                    <div>
                                        <p className="font-black text-slate-800 uppercase tracking-tight">{emp.firstName} {emp.lastName}</p>
                                        <p className="text-xs font-bold text-slate-400">{emp.employeeCode}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-indigo-600">₹{(emp.basicSalary + emp.hra + emp.conveyance + emp.medicalAllowance + emp.specialAllowance + emp.otherAllowances).toLocaleString()}</p>
                                        <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">Fixed Gross</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Salary Assignment Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {editingEmployee ? (
                            <form onSubmit={handleUpdateSalary} className="glass-card p-10 space-y-8 animate-in slide-in-from-right-10 duration-500">
                                <div className="flex justify-between items-center pb-6 border-b border-slate-100">
                                    <h3 className="text-2xl font-black text-indigo-900 italic">Configure Salary Structure</h3>
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black">
                                            {editingEmployee.firstName[0]}
                                        </div>
                                        <div>
                                            <p className="font-black text-slate-800">{editingEmployee.firstName} {editingEmployee.lastName}</p>
                                            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{editingEmployee.employeeCode}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <h4 className="font-black text-xs text-indigo-500 uppercase tracking-widest border-b pb-2">Fixed Earnings</h4>
                                        <div className="space-y-4">
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Basic Salary</label>
                                                <input type="number" className="input-premium" value={editingEmployee.basicSalary} onChange={(e) => setEditingEmployee({ ...editingEmployee, basicSalary: parseFloat(e.target.value) })} />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">HRA (House Rent Allowance)</label>
                                                <input type="number" className="input-premium" value={editingEmployee.hra} onChange={(e) => setEditingEmployee({ ...editingEmployee, hra: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Conveyance</label>
                                                    <input type="number" className="input-premium" value={editingEmployee.conveyance} onChange={(e) => setEditingEmployee({ ...editingEmployee, conveyance: parseFloat(e.target.value) })} />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Medical</label>
                                                    <input type="number" className="input-premium" value={editingEmployee.medicalAllowance} onChange={(e) => setEditingEmployee({ ...editingEmployee, medicalAllowance: parseFloat(e.target.value) })} />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Special Allowance</label>
                                                <input type="number" className="input-premium" value={editingEmployee.specialAllowance} onChange={(e) => setEditingEmployee({ ...editingEmployee, specialAllowance: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="font-black text-xs text-rose-500 uppercase tracking-widest border-b pb-2">Statutory & Overtime</h4>
                                        <div className="space-y-6 pt-2">
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                <div>
                                                    <p className="font-black text-slate-700 text-xs">Provident Fund (PF)</p>
                                                    <p className="text-[10px] text-slate-400">12% Employee Contribution</p>
                                                </div>
                                                <input type="checkbox" className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300" checked={editingEmployee.isPFEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isPFEnabled: e.target.checked })} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                <div>
                                                    <p className="font-black text-slate-700 text-xs">ESI Eligibility</p>
                                                    <p className="text-[10px] text-slate-400">0.75% Deducted if Gross &lt; 21k</p>
                                                </div>
                                                <input type="checkbox" className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300" checked={editingEmployee.isESIEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isESIEnabled: e.target.checked })} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                                                <div>
                                                    <p className="font-black text-slate-700 text-xs">Professional Tax (PT)</p>
                                                    <p className="text-[10px] text-slate-400">State Statutory Deduction</p>
                                                </div>
                                                <input type="checkbox" className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300" checked={editingEmployee.isPTEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isPTEnabled: e.target.checked })} />
                                            </div>
                                            <div className="border-t pt-4">
                                                <div className="flex items-center justify-between mb-4">
                                                    <div>
                                                        <p className="font-black text-slate-700 text-xs">Overtime Enabled</p>
                                                        <p className="text-[10px] text-slate-400">Calculate extra hours pay</p>
                                                    </div>
                                                    <input type="checkbox" className="w-6 h-6 rounded-lg text-indigo-600 focus:ring-indigo-500 border-slate-300" checked={editingEmployee.isOTEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isOTEnabled: e.target.checked })} />
                                                </div>
                                                {editingEmployee.isOTEnabled && (
                                                    <div>
                                                        <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">OT Multiplier (e.g. 1.5x)</label>
                                                        <input type="number" step="0.1" className="input-premium py-2 bg-indigo-50" value={editingEmployee.otRateMultiplier} onChange={(e) => setEditingEmployee({ ...editingEmployee, otRateMultiplier: parseFloat(e.target.value) })} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-end gap-4 border-t border-slate-100">
                                    <button type="button" onClick={() => setEditingEmployee(null)} className="btn-secondary-premium">Cancel</button>
                                    <button type="submit" disabled={loading} className="btn-primary-premium px-12">
                                        {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                        Initialize Structure
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="glass-card p-20 text-center space-y-6 bg-slate-50/30 border-dashed border-2">
                                <Users className="w-20 h-20 text-slate-200 mx-auto" />
                                <div>
                                    <h3 className="text-2xl font-black text-slate-400">Select an Employee</h3>
                                    <p className="text-slate-400 font-medium max-w-sm mx-auto mt-2">Pick an employee from the left panel to configure their salary components and statutory rules.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="glass-card p-12 max-w-4xl mx-auto text-center space-y-8">
                    <div className="p-6 bg-indigo-50 rounded-full w-24 h-24 mx-auto flex items-center justify-center">
                        <Settings className="w-12 h-12 text-indigo-600 animate-spin-slow" />
                    </div>
                    <h2 className="text-3xl font-black text-slate-800">Global Payroll Rules</h2>
                    <p className="text-slate-500 font-medium italic">These settings apply universally across the organization to maintain absolute compliance.</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left mt-8">
                        <div className="glass-card bg-slate-50 border-0 p-8 space-y-4">
                            <h4 className="font-black text-indigo-600 uppercase tracking-widest text-xs">PF Rule Engine</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm"><span>Wage Ceiling</span><span className="font-black text-slate-800">₹15,000</span></div>
                                <div className="flex justify-between text-sm"><span>Employee Share</span><span className="font-black text-slate-800">12%</span></div>
                                <div className="flex justify-between text-sm"><span>Employer Share</span><span className="font-black text-slate-800">12%</span></div>
                            </div>
                        </div>
                        <div className="glass-card bg-slate-50 border-0 p-8 space-y-4">
                            <h4 className="font-black text-rose-600 uppercase tracking-widest text-xs">ESI Policy</h4>
                            <div className="space-y-3">
                                <div className="flex justify-between text-sm"><span>Eligibility Gross</span><span className="font-black text-slate-800">₹21,000</span></div>
                                <div className="flex justify-between text-sm"><span>Employee Share</span><span className="font-black text-slate-800">0.75%</span></div>
                                <div className="flex justify-between text-sm"><span>Employer Share</span><span className="font-black text-slate-800">3.25%</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Payslip Modal */}
            {selectedPayroll && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
                    <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-6 bg-slate-50/50 border-b flex justify-between items-center">
                            <h3 className="font-black text-slate-800 flex items-center gap-2 text-xl italic">
                                <DollarSign className="w-8 h-8 text-indigo-600 bg-white p-1.5 rounded-xl shadow-sm" />
                                Secure <span className="text-indigo-500">Earnings Statement</span>
                            </h3>
                            <button onClick={() => setSelectedPayroll(null)} className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-xl transition-all">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div id="payslip-print" className="p-12 bg-white flex flex-col h-[700px] overflow-y-auto">
                            {/* Company Header */}
                            <div className="border-b-[3px] border-indigo-600 pb-8 mb-10 flex justify-between items-end">
                                <div>
                                    <h2 className="text-4xl font-black text-slate-900 tracking-tighter leading-none">APEX<span className="text-indigo-600">TIME</span></h2>
                                    <p className="text-slate-400 uppercase text-[10px] font-black tracking-[0.3em] mt-2">Enterprise Resource Planning</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-3xl font-black text-slate-800 leading-none uppercase">{monthName}</p>
                                    <p className="text-indigo-500 font-black text-sm uppercase tracking-widest mt-1">Salary Slip • {year}</p>
                                </div>
                            </div>

                            {/* Employee Info Grid */}
                            <div className="grid grid-cols-3 gap-8 mb-12 bg-slate-50 rounded-3xl p-8 border border-slate-100">
                                <div className="space-y-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Legal Name</span>
                                        <span className="font-black text-slate-800 uppercase">{selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Designation/ID</span>
                                        <span className="font-bold text-slate-700">{selectedPayroll.employee.employeeCode}</span>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Department</span>
                                        <span className="font-bold text-slate-700">{selectedPayroll.employee.department.name}</span>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Bank/Branch</span>
                                        <span className="font-bold text-slate-700">{selectedPayroll.employee.branch.name}</span>
                                    </div>
                                </div>
                                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-center">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Days</span>
                                        <span className="font-black text-slate-800">{selectedPayroll.totalWorkingDays}</span>
                                    </div>
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-emerald-500">Paid Days</span>
                                        <span className="font-black text-emerald-600">{selectedPayroll.paidDays}</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-rose-500">LOP Days</span>
                                        <span className="font-black text-rose-600">{selectedPayroll.lopDays}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Earnings & Deductions Tables */}
                            <div className="grid grid-cols-2 gap-0 border-[3px] border-slate-100 rounded-[2rem] overflow-hidden mb-12">
                                <div className="bg-slate-50/50 p-8 border-r-[3px] border-slate-100">
                                    <h4 className="font-black text-indigo-900 text-xs uppercase mb-6 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                                        Earnings Components
                                    </h4>
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between font-bold text-slate-600"><span>Basic Salary</span><span>₹{selectedPayroll.basicPaid.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-slate-600"><span>HRA</span><span>₹{selectedPayroll.hraPaid.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-slate-600"><span>Conveyance</span><span>₹{selectedPayroll.conveyancePaid.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-slate-600"><span>Medical Allowance</span><span>₹{selectedPayroll.medicalPaid.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-slate-600"><span>Special Allowance</span><span>₹{selectedPayroll.specialPaid.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-black text-indigo-600"><span>Overtime Pay ({selectedPayroll.otHours.toFixed(1)} hrs)</span><span>₹{selectedPayroll.otPay.toLocaleString()}</span></div>

                                        <div className="mt-8 pt-6 border-t-2 border-slate-200 flex justify-between font-black text-slate-900 text-xl italic uppercase">
                                            <span>Component Gross</span>
                                            <span>₹{selectedPayroll.grossSalary.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-white p-8">
                                    <h4 className="font-black text-rose-900 text-xs uppercase mb-6 flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-rose-500"></div>
                                        Deductions & Statutory
                                    </h4>
                                    <div className="space-y-4 text-sm">
                                        <div className="flex justify-between font-bold text-slate-600"><span>Employee PF (12%)</span><span>₹{selectedPayroll.pfDeduction.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-slate-600"><span>Employee ESI (0.75%)</span><span>₹{selectedPayroll.esiDeduction.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-slate-600"><span>Professional Tax (PT)</span><span>₹{selectedPayroll.ptDeduction.toLocaleString()}</span></div>
                                        <div className="flex justify-between font-bold text-slate-600"><span>Standard Deductions</span><span>-</span></div>

                                        <div className="mt-auto pt-24 border-t-2 border-slate-100 flex justify-between font-black text-rose-600 text-xl italic uppercase">
                                            <span>Total Deductions</span>
                                            <span>₹{selectedPayroll.totalDeductions.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Salary Footer */}
                            <div className="bg-slate-900 rounded-[2rem] p-10 text-white flex justify-between items-center shadow-2xl relative overflow-hidden mt-auto">
                                <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-[100px] -mr-40 -mt-40"></div>
                                <div className="relative z-10">
                                    <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Net Payable Remuneration</p>
                                    <p className="text-6xl font-black mt-2 tracking-tighter">₹{selectedPayroll.netSalary.toLocaleString()}</p>
                                </div>
                                <div className="text-right relative z-10">
                                    <div className="bg-indigo-600 px-6 py-2 rounded-2xl shadow-lg shadow-indigo-500/20 mb-3 border border-indigo-400">
                                        <p className="text-xs font-black tracking-widest">DISBURSED</p>
                                    </div>
                                    <p className="text-slate-500 text-[8px] uppercase font-black tracking-widest">{selectedPayroll.status === 'paid' ? `TXN ID: APX-${selectedPayroll.id.slice(0, 8).toUpperCase()}` : 'Payment Batch Processing'}</p>
                                </div>
                            </div>
                        </div>

                        <div className="p-8 bg-slate-50/80 border-t flex justify-between gap-4">
                            <div className="flex gap-4">
                                <button
                                    onClick={() => setSelectedPayroll(null)}
                                    className="px-8 py-3 bg-white border border-slate-200 rounded-2xl text-slate-700 font-black hover:bg-slate-50 transition-all shadow-sm"
                                >
                                    Dismiss
                                </button>
                            </div>
                            <button
                                onClick={handlePrint}
                                className="px-10 py-3 bg-indigo-600 text-white rounded-2xl font-black hover:bg-indigo-700 transition-all flex items-center gap-3 shadow-xl shadow-indigo-200 hover:scale-[1.02] active:scale-95"
                            >
                                <Printer className="w-5 h-5" />
                                Export Earnings Statement
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                @keyframes spin-slow {
                    from { transform: rotate(0deg); }
                    to { transform: rotate(360deg); }
                }
                .animate-spin-slow {
                    animation: spin-slow 12s linear infinite;
                }
                ::-webkit-scrollbar {
                    width: 6px;
                }
                ::-webkit-scrollbar-thumb {
                    background: #e2e8f0;
                    border-radius: 10px;
                }
            `}</style>
        </div>
    );
};
