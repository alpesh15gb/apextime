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
    Search,
    MoreVertical,
    Activity,
    Lock
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
                    'rgba(37, 99, 235, 0.8)', // blue-600
                    'rgba(75, 85, 99, 0.8)', // gray-600
                    'rgba(16, 185, 129, 0.8)', // emerald-500
                ],
                borderColor: [
                    '#2563eb',
                    '#4b5563',
                    '#10b981',
                ],
                borderWidth: 1,
            },
        ],
    };

    const prevMonth = () => setCurrentDate(new Date(year, month - 2, 1));
    const nextMonth = () => setCurrentDate(new Date(year, month, 1));

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Payroll Engine</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1">Calculate and manage employee disbursements</p>
                </div>

                <div className="flex flex-wrap items-center gap-4 w-full xl:w-auto">
                    {/* Month Stepper */}
                    <div className="flex items-center bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
                        <button onClick={prevMonth} className="p-2.5 hover:bg-gray-50 transition-colors text-gray-400">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <div className="px-6 py-2.5 font-black text-xs uppercase tracking-widest text-gray-900 min-w-[140px] text-center border-x border-gray-50">
                            {monthName} {year}
                        </div>
                        <button onClick={nextMonth} className="p-2.5 hover:bg-gray-50 transition-colors text-gray-400">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex items-center space-x-2 bg-blue-50 px-5 py-2.5 rounded-2xl border border-blue-100">
                        <div className="w-2 h-2 rounded-full bg-blue-600"></div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Run</span>
                    </div>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-4 border-b border-gray-100 pb-px overflow-x-auto custom-scrollbar">
                {(['overview', 'payruns', 'employees', 'settings'] as Tab[]).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`pb-4 px-2 text-[10px] font-black uppercase tracking-widest transition-all relative ${activeTab === tab
                            ? 'text-blue-600'
                            : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {tab === 'payruns' ? 'Pay Runs' : tab}
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-600 rounded-t-full"></div>
                        )}
                    </button>
                ))}
            </div>

            {activeTab === 'overview' && (
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
                    <div className="xl:col-span-2 space-y-8">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                            <div className="app-card p-8">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Net Disbursement</p>
                                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">₹{stats.totalNet.toLocaleString()}</h3>
                                <div className="mt-8 flex items-center justify-between">
                                    <div className="badge badge-success text-[10px] uppercase font-black tracking-widest px-3 py-1">Calculated</div>
                                </div>
                            </div>
                            <div className="app-card p-8">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Total Deductions</p>
                                <h3 className="text-3xl font-extrabold text-red-600 tracking-tight">₹{stats.totalDeductions.toLocaleString()}</h3>
                                <div className="mt-8 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-gray-400">Compliance Verified</span>
                                </div>
                            </div>
                            <div className="app-card p-8">
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-6">Overtime Pay</p>
                                <h3 className="text-3xl font-extrabold text-emerald-600 tracking-tight">₹{stats.totalOT.toLocaleString()}</h3>
                                <div className="mt-8 flex items-center justify-between">
                                    <span className="text-[10px] font-bold text-emerald-500">+{stats.totalOT > 0 ? 'Verified' : '0.0'}</span>
                                </div>
                            </div>
                        </div>

                        {/* Chart and Status */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="app-card p-10">
                                <h3 className="font-extrabold text-gray-800 tracking-tight mb-8">Allocation Matrix</h3>
                                <div className="aspect-square max-w-[240px] mx-auto grayscale group-hover:grayscale-0 transition-all">
                                    <Pie data={chartData} options={{ plugins: { legend: { display: false } } }} />
                                    <div className="mt-8 grid grid-cols-2 gap-4">
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded bg-blue-500"></div>
                                            <span className="text-[10px] font-bold text-gray-500">Net Basic</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <div className="w-3 h-3 rounded bg-gray-600"></div>
                                            <span className="text-[10px] font-bold text-gray-500">Compliance</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="app-card p-10 space-y-8">
                                <h3 className="font-extrabold text-gray-800 tracking-tight mb-2">Cycle Progression</h3>
                                <div className="space-y-6 pt-4">
                                    <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-2xl border border-gray-50">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-gray-100 flex items-center justify-center font-black text-gray-900 shadow-sm">{stats.totalCount}</div>
                                            <div>
                                                <p className="text-xs font-extrabold text-gray-800 uppercase">Total Members</p>
                                                <p className="text-[10px] font-bold text-gray-400">Enrolled in system</p>
                                            </div>
                                        </div>
                                        <ArrowRightCircle className="w-5 h-5 text-gray-300" />
                                    </div>
                                    <div className="flex items-center justify-between p-5 bg-emerald-50/20 rounded-2xl border border-emerald-50">
                                        <div className="flex items-center space-x-4">
                                            <div className="w-10 h-10 rounded-xl bg-white border border-emerald-100 flex items-center justify-center font-black text-emerald-600 shadow-sm">{stats.paidCount}</div>
                                            <div>
                                                <p className="text-xs font-extrabold text-emerald-700 uppercase">Paid Out</p>
                                                <p className="text-[10px] font-bold text-emerald-400">Complete disbursement</p>
                                            </div>
                                        </div>
                                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="app-card p-10 bg-blue-600 text-white border-none shadow-xl shadow-blue-100">
                            <h3 className="text-2xl font-extrabold tracking-tight mb-2">Initiate Run</h3>
                            <p className="text-blue-100 text-sm font-bold opacity-80 mb-10">Trigger deep calculation linking attendance and structural logs.</p>
                            <button
                                onClick={handleGenerate}
                                disabled={generating}
                                className="w-full py-4 bg-white text-blue-600 rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-gray-50 transition-all flex items-center justify-center space-x-3 shadow-lg shadow-blue-900/20"
                            >
                                {generating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                <span>{generating ? 'Processing Grid...' : 'Execute Calculation'}</span>
                            </button>
                        </div>

                        <div className="app-card p-10 bg-white border-dashed border-2 border-emerald-100">
                            <h3 className="text-xl font-extrabold text-emerald-800 mb-2">Batch Approval</h3>
                            <p className="text-gray-400 text-xs font-bold mb-10">Mark entire calculated grid as paid and lock the ledger.</p>
                            <button
                                onClick={handleProcessPay}
                                disabled={processing || stats.totalCount === 0 || stats.paidCount === stats.totalCount}
                                className="w-full py-4 bg-emerald-600 text-white rounded-[20px] font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100 flex items-center justify-center space-x-3 disabled:bg-gray-100 disabled:text-gray-300 disabled:shadow-none"
                            >
                                {processing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                <span>Finalize Batch</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'payruns' && (
                <div className="space-y-6">
                    <div className="app-card p-6 flex flex-wrap gap-6 items-center">
                        <div className="flex items-center space-x-2 text-gray-400 px-2 lg:border-r border-gray-100 mr-2">
                            <Filter className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Filters</span>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <select
                                value={selectedBranch}
                                onChange={(e) => setSelectedBranch(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold text-gray-600 appearance-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">All Locations</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>
                        <div className="flex-1 min-w-[200px]">
                            <select
                                value={selectedDepartment}
                                onChange={(e) => setSelectedDepartment(e.target.value)}
                                className="w-full px-4 py-2.5 bg-gray-50 border-none rounded-xl text-xs font-bold text-gray-600 appearance-none focus:ring-2 focus:ring-blue-100"
                            >
                                <option value="">All Departments</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="app-card overflow-hidden">
                        {loading ? (
                            <div className="py-20 flex flex-col items-center space-y-4">
                                <RefreshCw className="w-10 h-10 animate-spin text-blue-600 opacity-20" />
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Parsing Ledger Records...</p>
                            </div>
                        ) : payrolls.length === 0 ? (
                            <div className="py-32 flex flex-col items-center text-center space-y-6">
                                <AlertCircle className="w-16 h-16 text-gray-100" />
                                <div>
                                    <p className="text-sm font-extrabold text-gray-400">Zero Records Found</p>
                                    <button onClick={() => setActiveTab('overview')} className="mt-4 text-[10px] font-black text-blue-600 uppercase tracking-widest hover:underline">Execute calculation first</button>
                                </div>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gray-50/30">
                                            <th className="table-header">Enrolled Member</th>
                                            <th className="table-header">Attendance Link</th>
                                            <th className="table-header text-right">Fixed Gross</th>
                                            <th className="table-header text-right">Deductions</th>
                                            <th className="table-header text-right">Net Payout</th>
                                            <th className="table-header text-center">Lifecycle</th>
                                            <th className="table-header text-right">Export</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-50">
                                        {payrolls.map((p) => (
                                            <tr key={p.id} className="table-row group">
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center space-x-3">
                                                        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center font-black text-gray-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-all">{p.employee.firstName[0]}</div>
                                                        <div>
                                                            <p className="text-sm font-extrabold text-gray-900 leading-none">{p.employee.firstName} {p.employee.lastName}</p>
                                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{p.employee.employeeCode}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5">
                                                    <div className="flex items-center space-x-2">
                                                        <Activity className="w-3.5 h-3.5 text-gray-300" />
                                                        <span className="text-xs font-bold text-gray-700">{p.paidDays} / {p.totalWorkingDays} <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">Days</span></span>
                                                    </div>
                                                    {p.lopDays > 0 && <span className="text-[10px] text-red-500 font-black uppercase tracking-tighter mt-0.5">-{p.lopDays} LOP Applied</span>}
                                                </td>
                                                <td className="px-6 py-5 text-right font-bold text-gray-700 text-sm">₹{p.grossSalary.toLocaleString()}</td>
                                                <td className="px-6 py-5 text-right font-bold text-red-500 text-sm italic">₹{p.totalDeductions.toLocaleString()}</td>
                                                <td className="px-6 py-5 text-right font-black text-gray-900 text-base">₹{p.netSalary.toLocaleString()}</td>
                                                <td className="px-6 py-5 text-center">
                                                    <div className={`badge ${p.status === 'paid' ? 'badge-success' : 'badge-warning'} uppercase tracking-widest text-[10px] font-black`}>
                                                        {p.status}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-5 text-right">
                                                    <button onClick={() => setSelectedPayroll(p)} className="p-2.5 bg-gray-50 text-gray-400 hover:bg-black hover:text-white rounded-xl transition-all">
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
                    {/* List Panel */}
                    <div className="lg:col-span-1 app-card overflow-hidden flex flex-col h-[700px]">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                            <h3 className="font-extrabold text-gray-800 tracking-tight mb-6">Salary Assignments</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Filter team member..."
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-600 focus:ring-4 focus:ring-blue-50"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                            {employees.filter(emp =>
                                `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setEditingEmployee(emp)}
                                    className={`w-full p-6 text-left transition-all flex justify-between items-center group ${editingEmployee?.id === emp.id ? 'bg-blue-50/40 border-r-4 border-blue-600' : 'hover:bg-gray-50'}`}
                                >
                                    <div>
                                        <p className="font-extrabold text-gray-900 group-hover:text-blue-600 transition-colors capitalize">{emp.firstName} {emp.lastName}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{emp.employeeCode}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-sm font-black text-gray-800">₹{(emp.basicSalary + emp.hra + emp.conveyance + emp.medicalAllowance + emp.specialAllowance + emp.otherAllowances).toLocaleString()}</p>
                                        <p className="text-[9px] text-gray-400 font-bold uppercase">Fixed Config</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Edit Form */}
                    <div className="lg:col-span-2 space-y-6">
                        {editingEmployee ? (
                            <form onSubmit={handleUpdateSalary} className="app-card p-10 space-y-10 animate-in slide-in-from-bottom-10 duration-500">
                                <div className="flex justify-between items-center pb-10 border-b border-gray-50">
                                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Financial Config</h3>
                                    <div className="flex items-center space-x-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
                                        <div className="w-12 h-12 rounded-2xl bg-white border border-gray-200 flex items-center justify-center font-black text-blue-600 shadow-sm">{editingEmployee.firstName[0]}</div>
                                        <div>
                                            <p className="font-black text-gray-800 leading-tight">{editingEmployee.firstName} {editingEmployee.lastName}</p>
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{editingEmployee.employeeCode}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 inline-block px-3 py-1 rounded-lg">Fixed Earnings Matrix</h4>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Basic Base</label>
                                                <input type="number" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700" value={editingEmployee.basicSalary} onChange={(e) => setEditingEmployee({ ...editingEmployee, basicSalary: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">HRA Allocation</label>
                                                <input type="number" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700" value={editingEmployee.hra} onChange={(e) => setEditingEmployee({ ...editingEmployee, hra: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Conveyance</label>
                                                    <input type="number" className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700" value={editingEmployee.conveyance} onChange={(e) => setEditingEmployee({ ...editingEmployee, conveyance: parseFloat(e.target.value) })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Medical</label>
                                                    <input type="number" className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700" value={editingEmployee.medicalAllowance} onChange={(e) => setEditingEmployee({ ...editingEmployee, medicalAllowance: parseFloat(e.target.value) })} />
                                                </div>
                                            </div>
                                        </div>

                                        <h4 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 inline-block px-3 py-1 rounded-lg">Bank Distribution</h4>
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Financial Institution</label>
                                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700" placeholder="e.g. ICICI Corporate" value={editingEmployee.bankName || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, bankName: e.target.value })} />
                                            </div>
                                            <div className="grid grid-cols-2 gap-6">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Acc Number</label>
                                                    <input type="text" className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700" value={editingEmployee.accountNumber || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, accountNumber: e.target.value })} />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">IFSC Code</label>
                                                    <input type="text" className="w-full px-5 py-3 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-bold text-gray-700" value={editingEmployee.ifscCode || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, ifscCode: e.target.value })} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-8">
                                        <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest bg-gray-100 inline-block px-3 py-1 rounded-lg">Statutory Identity</h4>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PAN Legal</label>
                                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-black text-gray-700 uppercase" value={editingEmployee.panNumber || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, panNumber: e.target.value.toUpperCase() })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Aadhaar UID</label>
                                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-50 outline-none transition-all font-black text-gray-700" value={editingEmployee.aadhaarNumber || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, aadhaarNumber: e.target.value })} />
                                            </div>
                                        </div>

                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 inline-block px-3 py-1 rounded-lg">Regulated Compliance</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-3xl border border-gray-50">
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 uppercase">Provident Fund (PF)</p>
                                                    <p className="text-[10px] font-bold text-gray-400">12% Contribution Active</p>
                                                </div>
                                                <input type="checkbox" className="w-6 h-6 rounded-lg text-blue-600 border-gray-200 focus:ring-blue-500" checked={editingEmployee.isPFEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isPFEnabled: e.target.checked })} />
                                            </div>
                                            <div className="flex items-center justify-between p-5 bg-gray-50/50 rounded-3xl border border-gray-50">
                                                <div>
                                                    <p className="text-xs font-black text-gray-900 uppercase">ESI Eligibility</p>
                                                    <p className="text-[10px] font-bold text-gray-400">Gross Threshold Check</p>
                                                </div>
                                                <input type="checkbox" className="w-6 h-6 rounded-lg text-blue-600 border-gray-200 focus:ring-blue-500" checked={editingEmployee.isESIEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isESIEnabled: e.target.checked })} />
                                            </div>
                                            <div className="p-6 border-t border-gray-50 mt-4 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="text-xs font-black text-gray-900 uppercase">Overtime (OT)</p>
                                                        <p className="text-[10px] font-bold text-gray-400">Hour-linked bonus</p>
                                                    </div>
                                                    <input type="checkbox" className="w-6 h-6 rounded-lg text-blue-600 border-gray-200 focus:ring-blue-500" checked={editingEmployee.isOTEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isOTEnabled: e.target.checked })} />
                                                </div>
                                                {editingEmployee.isOTEnabled && (
                                                    <div className="pt-2 animate-in fade-in duration-300">
                                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Rate Multiplier</label>
                                                        <input type="number" step="0.1" className="w-full px-5 py-3 bg-blue-50/30 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 outline-none transition-all font-black text-blue-600" value={editingEmployee.otRateMultiplier} onChange={(e) => setEditingEmployee({ ...editingEmployee, otRateMultiplier: parseFloat(e.target.value) })} />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-10 flex justify-end space-x-4 border-t border-gray-50">
                                    <button type="button" onClick={() => setEditingEmployee(null)} className="px-8 py-4 bg-white border border-gray-100 text-gray-400 font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-gray-50 transition-all">Dismiss</button>
                                    <button type="submit" disabled={loading} className="px-10 py-4 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-[20px] hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center space-x-3">
                                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                        <span>Commit Structure</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="app-card p-32 flex flex-col items-center justify-center text-center space-y-8 border-dashed border-2 border-gray-100 bg-gray-50/10">
                                <Users className="w-16 h-16 text-gray-200" />
                                <div>
                                    <h3 className="text-xl font-extrabold text-gray-400">Neutral State</h3>
                                    <p className="text-xs font-bold text-gray-300 max-w-xs mx-auto mt-2 leading-relaxed uppercase tracking-tighter">Choose a member from the registry to manage their private financial ledger.</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'settings' && (
                <div className="app-card max-w-4xl mx-auto p-16 text-center space-y-12">
                    <div className="w-24 h-24 bg-blue-50 rounded-[32px] flex items-center justify-center mx-auto ring-8 ring-blue-50/30 animate-pulse">
                        <Settings className="w-10 h-10 text-blue-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Global Parameters</h2>
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Compliance engines & statutory rule-sets</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left pt-6">
                        <div className="app-card p-10 space-y-6 border-r-8 border-r-blue-600">
                            <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                <Lock className="w-3 h-3" />
                                PF Engine Rules
                            </h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Wage Ceiling</span><span className="text-sm font-black text-gray-900">₹15,000</span></div>
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Employee Share</span><span className="text-sm font-black text-gray-900">12%</span></div>
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Employer Share</span><span className="text-sm font-black text-gray-900">12%</span></div>
                            </div>
                        </div>
                        <div className="app-card p-10 space-y-6 border-l-8 border-l-gray-900">
                            <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" />
                                ESI Shield Policy
                            </h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Gross Trigger</span><span className="text-sm font-black text-gray-900">₹21,000</span></div>
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Employee Share</span><span className="text-sm font-black text-gray-900">0.75%</span></div>
                                <div className="flex justify-between items-center"><span className="text-xs font-bold text-gray-500">Employer Share</span><span className="text-sm font-black text-gray-900">3.25%</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal remains largely same but color updated */}
            {selectedPayroll && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Statement</h3>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => window.print()} className="p-3 bg-gray-50 text-gray-400 hover:text-gray-900 rounded-2xl transition-all"><Printer className="w-5 h-5" /></button>
                                <button onClick={() => setSelectedPayroll(null)} className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="p-12 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            {/* Payslip simplified for brevity but matching new design */}
                            <div className="bg-gray-50/50 p-10 rounded-[32px] border border-gray-50 space-y-8">
                                <div className="flex justify-between border-b-4 border-blue-600 pb-6">
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Apextime Enterprise</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Official Payroll Statement</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-black text-blue-600 uppercase italic leading-none">{monthName}</p>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{year}</span>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-12 text-sm pt-4">
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">Employee</span><span className="font-extrabold text-gray-800">{selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}</span></div>
                                        <div className="flex justify-between items-center border-b border-gray-100 pb-2"><span className="font-bold text-gray-400 uppercase text-[10px] tracking-widest">ID Code</span><span className="font-extrabold text-gray-800">{selectedPayroll.employee.employeeCode}</span></div>
                                    </div>
                                    <div className="space-y-4 font-black">
                                        <div className="flex justify-between items-center text-blue-500"><span className="uppercase text-[10px] tracking-widest">Net Disbursed</span><span className="text-2xl tracking-tighter">₹{selectedPayroll.netSalary.toLocaleString()}</span></div>
                                        <div className="flex justify-between items-center text-gray-400 text-[10px] uppercase tracking-widest"><span>Status</span><span>{selectedPayroll.status}</span></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
