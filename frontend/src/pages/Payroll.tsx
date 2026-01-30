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
    Plus,
    Users,
    Settings,
    ArrowRightCircle,
    Save,
    Search,
    Activity,
    Lock,
    Calendar,
    FileText
} from 'lucide-react';
import { payrollAPI, branchesAPI, departmentsAPI, employeesAPI } from '../services/api';

type Tab = 'runs' | 'employee-config' | 'settings';

export const Payroll = () => {
    const [activeTab, setActiveTab] = useState<Tab>('runs');
    const [runs, setRuns] = useState<any[]>([]);
    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showNewRunModal, setShowNewRunModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const [newRunData, setNewRunData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        batchName: `Salary Batch - ${new Date().toLocaleString('default', { month: 'long' })} ${new Date().getFullYear()}`,
        periodStart: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0],
        periodEnd: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString().split('T')[0]
    });

    useEffect(() => {
        fetchRuns();
        fetchEmployees();
    }, []);

    const fetchRuns = async () => {
        try {
            setLoading(true);
            const res = await payrollAPI.getRuns();
            setRuns(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const fetchEmployees = async () => {
        try {
            const res = await employeesAPI.getAll({ limit: '1000' });
            setEmployees(res.data.employees || []);
        } catch (e) { console.error(e); }
    };

    const handleCreateRun = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await payrollAPI.createRun(newRunData);
            setShowNewRunModal(false);
            fetchRuns();
        } catch (error) {
            alert('Failed to create payroll run');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessRun = async (id: string) => {
        try {
            setProcessing(true);
            await payrollAPI.processRun(id);
            fetchRuns();
            if (selectedRun?.id === id) {
                const details = await payrollAPI.getRunDetails(id);
                setSelectedRun(details.data);
            }
        } catch (error) {
            alert('Processing failed. Please check logs.');
        } finally {
            setProcessing(false);
        }
    };

    const handleViewRun = async (run: any) => {
        try {
            setLoading(true);
            const res = await payrollAPI.getRunDetails(run.id);
            setSelectedRun(res.data);
        } catch (e) {
            alert('Could not load run details');
        } finally {
            setLoading(false);
        }
    };

    const handleFinalize = async (id: string) => {
        if (!confirm('Are you sure? This will LOCK the payroll and prevent any further changes for this month.')) return;
        try {
            setLoading(true);
            await payrollAPI.finalizeRun(id);
            fetchRuns();
            setSelectedRun(null);
        } catch (e) {
            alert('Failed to finalize');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateSalary = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setLoading(true);
            await employeesAPI.update(editingEmployee.id, editingEmployee);
            alert('Salary Config Updated');
            setEditingEmployee(null);
            fetchEmployees();
        } catch (error) {
            alert('Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Financial disbursements</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">Professional payroll batch administration</p>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() => setShowNewRunModal(true)}
                        className="px-6 py-3.5 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 transition-all flex items-center space-x-2"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Create New Run</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('employee-config')}
                        className={`p-3.5 rounded-2xl border transition-all ${activeTab === 'employee-config' ? 'bg-gray-900 border-gray-900 text-white shadow-lg' : 'bg-white border-gray-100 text-gray-400 hover:text-gray-600'}`}
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Main Content */}
            {activeTab === 'runs' && !selectedRun && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {runs.map(run => (
                        <div key={run.id} className="app-card group hover:scale-[1.02] transition-all duration-300">
                            <div className="p-8 space-y-6">
                                <div className="flex justify-between items-start">
                                    <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                                        <Calendar className="w-7 h-7" />
                                    </div>
                                    <div className={`badge ${run.status === 'locked' || run.status === 'finalized' ? 'badge-success' : run.status === 'review' ? 'badge-warning' : 'bg-gray-100 text-gray-400'} uppercase text-[9px] font-black tracking-widest`}>
                                        {run.status}
                                    </div>
                                </div>

                                <div>
                                    <h3 className="text-xl font-black text-gray-900 tracking-tight">{run.batchName}</h3>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">
                                        {new Date(run.periodStart).toLocaleDateString()} — {new Date(run.periodEnd).toLocaleDateString()}
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-50">
                                    <div className="space-y-1">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Employees</p>
                                        <p className="text-lg font-black text-gray-900 tracking-tight">{run.totalEmployees}</p>
                                    </div>
                                    <div className="space-y-1 text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest leading-none">Net Payout</p>
                                        <p className="text-lg font-black text-blue-600 tracking-tight">₹{run.totalNet.toLocaleString()}</p>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    {run.status === 'draft' || run.status === 'review' ? (
                                        <button
                                            onClick={() => handleProcessRun(run.id)}
                                            disabled={processing}
                                            className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all"
                                        >
                                            {processing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                                            {run.status === 'review' ? 'Recalculate' : 'Process Run'}
                                        </button>
                                    ) : null}
                                    <button
                                        onClick={() => handleViewRun(run)}
                                        className="flex-1 py-3 bg-gray-50 text-gray-400 rounded-xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-blue-600 hover:text-white transition-all"
                                    >
                                        <Search className="w-3.5 h-3.5" />
                                        View Details
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}

                    {runs.length === 0 && !loading && (
                        <div className="col-span-full py-40 bg-gray-50/30 rounded-[40px] border-4 border-dashed border-gray-100 flex flex-col items-center justify-center text-center">
                            <RefreshCw className="w-16 h-16 text-gray-100 mb-6" />
                            <h3 className="text-2xl font-black text-gray-300 tracking-tight">Zero Payruns Found</h3>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">Initialize your first batch to start disbursements</p>
                        </div>
                    )}
                </div>
            )}

            {/* Detailed Run View */}
            {selectedRun && (
                <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-300">
                    <div className="flex items-center justify-between bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm">
                        <div className="flex items-center space-x-6">
                            <button onClick={() => setSelectedRun(null)} className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-2xl"><X className="w-6 h-6" /></button>
                            <div>
                                <h3 className="text-2xl font-black text-gray-900 tracking-tight">{selectedRun.batchName}</h3>
                                <div className="flex items-center gap-3 mt-1">
                                    <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Snapshot View</span>
                                    <div className="w-1.5 h-1.5 rounded-full bg-gray-200"></div>
                                    <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">{selectedRun.status}</span>
                                </div>
                            </div>
                        </div>

                        {selectedRun.status !== 'locked' && selectedRun.status !== 'finalized' && (
                            <button
                                onClick={() => handleFinalize(selectedRun.id)}
                                className="px-8 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-3xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 flex items-center space-x-3"
                            >
                                <Lock className="w-4 h-4" />
                                <span>Finalize & Lock Ledger</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
                        <div className="xl:col-span-3">
                            <div className="app-card overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50/30">
                                                <th className="table-header">Emp Record</th>
                                                <th className="table-header">Attendance Link</th>
                                                <th className="table-header text-right">Gross</th>
                                                <th className="table-header text-right">Deductions</th>
                                                <th className="table-header text-right">Net Disbursement</th>
                                                <th className="table-header text-center">Export</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {selectedRun.payrolls.map((p: any) => (
                                                <tr key={p.id} className="table-row group">
                                                    <td className="px-6 py-5">
                                                        <p className="text-sm font-extrabold text-gray-900 leading-none capitalize">{p.employee.firstName} {p.employee.lastName}</p>
                                                        <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-tighter">{p.employee.employeeCode}</p>
                                                    </td>
                                                    <td className="px-6 py-5">
                                                        <div className="flex items-center space-x-2">
                                                            <Activity className="w-3.5 h-3.5 text-gray-300" />
                                                            <span className="text-xs font-bold text-gray-700">{p.paidDays} / {p.totalWorkingDays} <span className="text-[10px] text-gray-400 font-bold uppercase ml-1">Days</span></span>
                                                        </div>
                                                        {p.lopDays > 0 && <span className="text-[9px] text-red-500 font-black uppercase tracking-tighter mt-0.5">-{p.lopDays} Days LOP</span>}
                                                    </td>
                                                    <td className="px-6 py-5 text-right font-bold text-gray-700 text-sm">₹{p.grossSalary.toLocaleString()}</td>
                                                    <td className="px-6 py-5 text-right font-bold text-red-500 text-sm italic">₹{p.totalDeductions.toLocaleString()}</td>
                                                    <td className="px-6 py-5 text-right font-black text-gray-900 text-base">₹{p.netSalary.toLocaleString()}</td>
                                                    <td className="px-6 py-5 text-center">
                                                        <button className="p-2.5 bg-gray-50 text-gray-300 hover:bg-black hover:text-white rounded-xl transition-all">
                                                            <Printer className="w-4 h-4" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-8">
                            <div className="app-card p-10 bg-gray-900 text-white relative overflow-hidden">
                                <div className="absolute right-[-10%] top-[-10%] w-32 h-32 bg-blue-600/20 rounded-full blur-3xl"></div>
                                <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-10">Run Metrics</h4>
                                <div className="space-y-8">
                                    <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Total Gross</span>
                                        <span className="text-2xl font-black text-white tracking-tighter">₹{selectedRun.totalGross.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-end border-b border-gray-800 pb-4">
                                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Net Outflow</span>
                                        <span className="text-2xl font-black text-blue-400 tracking-tighter">₹{selectedRun.totalNet.toLocaleString()}</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <span className="text-gray-500 text-[10px] font-black uppercase tracking-widest">Statutory Lock</span>
                                        <span className="text-2xl font-black text-emerald-400 tracking-tighter">₹{(selectedRun.totalGross - selectedRun.totalNet).toLocaleString()}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Configuration View */}
            {activeTab === 'employee-config' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 app-card overflow-hidden flex flex-col h-[700px]">
                        <div className="p-8 border-b border-gray-50 bg-gray-50/20">
                            <h3 className="font-extrabold text-gray-800 tracking-tight mb-6">Financial Matrix</h3>
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Verify team member..."
                                    className="w-full pl-11 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-xs font-bold text-gray-600 focus:ring-4 focus:ring-blue-50 outline-none"
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
                                    <ArrowRightCircle className={`w-5 h-5 transition-all ${editingEmployee?.id === emp.id ? 'text-blue-600' : 'text-gray-100 group-hover:text-gray-300'}`} />
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="lg:col-span-2">
                        {editingEmployee ? (
                            <form onSubmit={handleUpdateSalary} className="app-card p-12 space-y-10 animate-in slide-in-from-right duration-500">
                                <div className="pb-8 border-b border-gray-50">
                                    <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Structured Salary</h3>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-1">Configuration for {editingEmployee.firstName} {editingEmployee.lastName}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Fixed Earnings</h4>
                                        <div className="space-y-4">
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Basic Salary</label>
                                                <input type="number" className="input-app w-full font-bold" value={editingEmployee.basicSalary} onChange={(e) => setEditingEmployee({ ...editingEmployee, basicSalary: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">HRA</label>
                                                <input type="number" className="input-app w-full font-bold" value={editingEmployee.hra} onChange={(e) => setEditingEmployee({ ...editingEmployee, hra: parseFloat(e.target.value) })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Special Allowance</label>
                                                <input type="number" className="input-app w-full font-bold" value={editingEmployee.specialAllowance || 0} onChange={(e) => setEditingEmployee({ ...editingEmployee, specialAllowance: parseFloat(e.target.value) })} />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">Statutory Rules</h4>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                                                <span className="text-[10px] font-black text-gray-900 uppercase">Enable PF</span>
                                                <input type="checkbox" className="w-5 h-5 rounded-lg text-blue-600 border-gray-200" checked={editingEmployee.isPFEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isPFEnabled: e.target.checked })} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                                                <span className="text-[10px] font-black text-gray-900 uppercase">Enable ESI</span>
                                                <input type="checkbox" className="w-5 h-5 rounded-lg text-blue-600 border-gray-200" checked={editingEmployee.isESIEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isESIEnabled: e.target.checked })} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50/50 rounded-2xl border border-gray-50">
                                                <span className="text-[10px] font-black text-gray-900 uppercase">Prof. Tax (PT)</span>
                                                <input type="checkbox" className="w-5 h-5 rounded-lg text-blue-600 border-gray-200" checked={editingEmployee.isPTEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isPTEnabled: e.target.checked })} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-8 flex justify-end gap-3 border-t border-gray-50">
                                    <button type="button" onClick={() => setEditingEmployee(null)} className="px-6 py-3 bg-white border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-50">Cancel</button>
                                    <button type="submit" disabled={loading} className="px-8 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        <span>Commit Structural Logic</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="app-card h-full flex flex-col items-center justify-center text-center p-20 border-dashed border-2 border-gray-100">
                                <FileText className="w-16 h-16 text-gray-100 mb-6" />
                                <h3 className="text-xl font-black text-gray-300 tracking-tight">Financial Ledger Neutral</h3>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Select a member to audit or update their payroll profile</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New Run Modal */}
            {showNewRunModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Initialize Batch</h3>
                            <button onClick={() => setShowNewRunModal(false)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-2xl"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreateRun} className="p-10 space-y-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Batch Identifier</label>
                                <input
                                    type="text"
                                    className="input-app w-full font-bold"
                                    value={newRunData.batchName}
                                    onChange={(e) => setNewRunData({ ...newRunData, batchName: e.target.value })}
                                    required
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Month</label>
                                    <select className="input-app w-full font-bold" value={newRunData.month} onChange={(e) => setNewRunData({ ...newRunData, month: parseInt(e.target.value) })}>
                                        {Array.from({ length: 12 }).map((_, i) => (
                                            <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Fiscal Year</label>
                                    <input type="number" className="input-app w-full font-bold" value={newRunData.year} onChange={(e) => setNewRunData({ ...newRunData, year: parseInt(e.target.value) })} />
                                </div>
                            </div>
                            <div className="pt-6">
                                <button type="submit" disabled={loading} className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center gap-2">
                                    <Plus className="w-4 h-4" />
                                    <span>Create Ledger Batch</span>
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
