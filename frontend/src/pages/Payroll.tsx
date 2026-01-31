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
    FileText,
    DownloadCloud
} from 'lucide-react';
import { payrollAPI, branchesAPI, departmentsAPI, employeesAPI, settingsAPI } from '../services/api';

type Tab = 'runs' | 'employee-config';

export const Payroll = () => {
    const [activeTab, setActiveTab] = useState<Tab>('runs');
    const [runs, setRuns] = useState<any[]>([]);
    const [selectedRun, setSelectedRun] = useState<any>(null);
    const [selectedPayroll, setSelectedPayroll] = useState<any>(null);
    const [employees, setEmployees] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [showNewRunModal, setShowNewRunModal] = useState(false);
    const [editingEmployee, setEditingEmployee] = useState<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [companySettings, setCompanySettings] = useState<any>(null);

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
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.get();
            setCompanySettings(res.data);
        } catch (e) {
            console.error('Failed to fetch settings', e);
        }
    };

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

            const start = new Date(newRunData.year, newRunData.month - 1, 1);
            const end = new Date(newRunData.year, newRunData.month, 0); // Last day of month

            // Format locally to avoid UTC shifts
            const formatDate = (d: Date) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };

            const payload = {
                ...newRunData,
                periodStart: formatDate(start),
                periodEnd: formatDate(end)
            };

            console.log('Creating Run with payload:', payload);

            await payrollAPI.createRun(payload);
            setShowNewRunModal(false);
            fetchRuns();
        } catch (error: any) {
            console.error('Create run failed:', error.response?.data || error.message);
            alert(`Failed to create payroll run: ${error.response?.data?.error || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessRun = async (id: string) => {
        try {
            setProcessing(true);
            await payrollAPI.processRun(id);
            if (selectedRun?.id === id) {
                const details = await payrollAPI.getRunDetails(id);
                setSelectedRun(details.data);
            }
            fetchRuns();
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

    const handleExportBank = async (id: string) => {
        try {
            const res = await payrollAPI.exportBank(id);
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `bank_disbursement_${id}.csv`);
            document.body.appendChild(link);
            link.click();
        } catch (e) {
            alert('Export failed');
        }
    };

    const handleDeleteRun = async (id: string) => {
        if (!window.confirm('Delete this payroll run and all its records? This cannot be undone.')) return;
        try {
            setLoading(true);
            await payrollAPI.deleteRun(id);
            setSelectedRun(null);
            fetchRuns();
        } catch (error) {
            alert('Deletion failed');
        } finally {
            setLoading(false);
        }
    };

    const handleProcessSingle = async (runId: string, employeeId: string) => {
        try {
            setProcessing(true);
            await payrollAPI.processSingle(runId, employeeId);
            const details = await payrollAPI.getRunDetails(runId);
            setSelectedRun(details.data);
            fetchRuns();
        } catch (error) {
            alert('Individual processing failed');
        } finally {
            setProcessing(false);
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
                        onClick={() => setActiveTab(activeTab === 'runs' ? 'employee-config' : 'runs')}
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
                                    {(run.status === 'draft' || run.status === 'review') && (
                                        <button
                                            onClick={() => handleDeleteRun(run.id)}
                                            className="p-3 bg-red-50 text-red-300 rounded-xl hover:bg-red-500 hover:text-white transition-all"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
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

                        <div className="flex items-center gap-4">
                            {selectedRun.status !== 'locked' && selectedRun.status !== 'finalized' && (
                                <button
                                    onClick={() => handleFinalize(selectedRun.id)}
                                    className="px-8 py-4 bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest rounded-3xl hover:bg-emerald-700 shadow-xl shadow-emerald-100 flex items-center space-x-3"
                                >
                                    <Lock className="w-4 h-4" />
                                    <span>Finalize & Lock Ledger</span>
                                </button>
                            )}
                            <button
                                onClick={() => handleExportBank(selectedRun.id)}
                                className="px-8 py-4 bg-gray-900 text-white font-black text-[10px] uppercase tracking-widest rounded-3xl hover:bg-black shadow-xl shadow-gray-100 flex items-center space-x-3"
                            >
                                <DownloadCloud className="w-4 h-4" />
                                <span>Bank Bulk Export</span>
                            </button>
                        </div>
                    </div>

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
                                                <div className="flex items-center justify-center gap-2">
                                                    {(selectedRun.status === 'draft' || selectedRun.status === 'review') && (
                                                        <button
                                                            onClick={() => handleProcessSingle(selectedRun.id, p.employeeId)}
                                                            disabled={processing}
                                                            title="Recalculate Single"
                                                            className="p-2.5 bg-blue-50 text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl transition-all"
                                                        >
                                                            <RefreshCw className={`w-4 h-4 ${processing ? 'animate-spin' : ''}`} />
                                                        </button>
                                                    )}
                                                    <button onClick={() => setSelectedPayroll(p)} className="p-2.5 bg-gray-50 text-gray-300 hover:bg-black hover:text-white rounded-xl transition-all">
                                                        <Printer className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Payslip Modal */}
            {selectedPayroll && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4 print:p-0">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in duration-300 print:shadow-none print:rounded-none">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center print:hidden">
                            <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Statement</h3>
                            <div className="flex items-center space-x-3">
                                <button onClick={() => window.print()} className="px-6 py-3 bg-blue-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-lg shadow-blue-100 flex items-center gap-2 hover:bg-blue-700 transition-all"><Printer className="w-5 h-5" /> Print Statement</button>
                                <button onClick={() => setSelectedPayroll(null)} className="p-3 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-2xl transition-all"><X className="w-6 h-6" /></button>
                            </div>
                        </div>
                        <div className="p-12 overflow-y-auto max-h-[70vh] custom-scrollbar print:max-h-none print:p-0">
                            <div className="bg-white p-8 lg:p-16 space-y-12 print:p-0">
                                <div className="flex justify-between items-start border-b-8 border-gray-900 pb-12">
                                    <div className="space-y-4">
                                        {companySettings?.logo && (
                                            <img src={companySettings.logo} alt="Company Logo" className="h-20 mb-4 object-contain" />
                                        )}
                                        <h2 className="text-4xl font-black text-gray-900 tracking-tighter uppercase italic">{companySettings?.name || 'Apextime Enterprise'}</h2>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Salary Disbursement Statement</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-5xl font-black text-blue-600 tracking-tighter italic leading-none">{new Date(selectedPayroll.year, selectedPayroll.month - 1).toLocaleString('default', { month: 'long' })}</p>
                                        <p className="text-sm font-black text-gray-900 mt-2 uppercase tracking-widest">{selectedPayroll.year}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 py-8 border-b border-gray-100">
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Team Member</p>
                                        <p className="text-sm font-extrabold text-gray-900 uppercase">{selectedPayroll.employee.firstName} {selectedPayroll.employee.lastName}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{selectedPayroll.employee.designation?.name || 'Associate'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Internal Unit</p>
                                        <p className="text-sm font-extrabold text-gray-900 uppercase">{selectedPayroll.employee.department?.name || 'General'}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{selectedPayroll.employee.branch?.name || 'Headquarters'}</p>
                                    </div>
                                    <div>
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Days Payable</p>
                                        <p className="text-sm font-extrabold text-gray-900">{selectedPayroll.paidDays} / {selectedPayroll.totalWorkingDays}</p>
                                        {selectedPayroll.otHours > 0 && <p className="text-[10px] font-bold text-blue-600 uppercase">+{selectedPayroll.otHours} OT Hours</p>}
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Bank Reference</p>
                                        <p className="text-sm font-extrabold text-gray-900">****{selectedPayroll.employee.accountNumber?.slice(-4) || 'N/A'}</p>
                                        <p className="text-[10px] font-bold text-gray-500 uppercase">{selectedPayroll.employee.bankName || 'Direct Transfer'}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Earnings Breakdown</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-2">
                                                <span className="text-gray-500">Basic Wage</span>
                                                <span className="text-gray-900">₹{selectedPayroll.basicPaid?.toLocaleString() || 0}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-2">
                                                <span className="text-gray-500">HRA</span>
                                                <span className="text-gray-900">₹{selectedPayroll.hraPaid?.toLocaleString() || 0}</span>
                                            </div>
                                            {selectedPayroll.otPay > 0 && (
                                                <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-2">
                                                    <span className="text-gray-500">Overtime (OT)</span>
                                                    <span className="text-gray-900">₹{selectedPayroll.otPay.toLocaleString()}</span>
                                                </div>
                                            )}
                                            {selectedPayroll.allowancesPaid > 0 && (
                                                <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-2">
                                                    <span className="text-gray-500">Other Allowances</span>
                                                    <span className="text-gray-900">₹{selectedPayroll.allowancesPaid.toLocaleString()}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between items-center text-base font-black pt-4">
                                                <span className="text-gray-900 uppercase">Gross Earnings</span>
                                                <span className="text-gray-900">₹{selectedPayroll.grossSalary.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <h4 className="text-[10px] font-black text-red-600 uppercase tracking-widest">Statutory Deductions</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-2">
                                                <span className="text-gray-500">Provident Fund (PF)</span>
                                                <span className="text-red-500">₹{selectedPayroll.pfDeduction.toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-sm font-bold border-b border-gray-50 pb-2">
                                                <span className="text-gray-500">ESI & Prof. Tax</span>
                                                <span className="text-red-500">₹{(selectedPayroll.esiDeduction + selectedPayroll.ptDeduction).toLocaleString()}</span>
                                            </div>
                                            <div className="flex justify-between items-center text-base font-black pt-4">
                                                <span className="text-gray-900 uppercase">Total Deductions</span>
                                                <span className="text-red-600">₹{selectedPayroll.totalDeductions.toLocaleString()}</span>
                                            </div>

                                            {/* Compliance Note */}
                                            {(selectedPayroll.employerPF > 0 || selectedPayroll.employerESI > 0) && (
                                                <div className="mt-8 p-4 bg-gray-50 rounded-2xl border border-gray-100">
                                                    <p className="text-[8px] font-black text-gray-400 uppercase mb-2 tracking-widest text-center">Employer Statutory Contributions</p>
                                                    <div className="flex justify-around items-center">
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-extrabold text-gray-900">₹{selectedPayroll.employerPF.toLocaleString()}</p>
                                                            <p className="text-[7px] font-black text-gray-400 uppercase">PF Share</p>
                                                        </div>
                                                        <div className="w-px h-6 bg-gray-200" />
                                                        <div className="text-center">
                                                            <p className="text-[10px] font-extrabold text-gray-900">₹{selectedPayroll.employerESI.toLocaleString()}</p>
                                                            <p className="text-[7px] font-black text-gray-400 uppercase">ESI Share</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-12 bg-gray-900 p-16 rounded-[40px] text-white flex flex-col lg:flex-row justify-between items-center gap-8 print:rounded-none">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest mb-4">Total Net Disbursement</p>
                                        <h1 className="text-6xl font-black tracking-tighter italic">₹{selectedPayroll.netSalary.toLocaleString()}</h1>
                                    </div>
                                    <div className="text-center lg:text-right">
                                        <div className="badge badge-success px-4 py-1.5 font-black text-[10px] uppercase">State: {selectedPayroll.status}</div>
                                        <p className="text-[9px] font-bold text-gray-500 uppercase mt-2">Verified Digital Ledger</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Employee Config Tab */}
            {activeTab === 'employee-config' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 app-card overflow-hidden flex flex-col h-[600px]">
                        <div className="p-8 border-b border-gray-50">
                            <input
                                type="text"
                                placeholder="Search employees..."
                                className="w-full pl-4 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-4 focus:ring-blue-50 outline-none"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex-1 overflow-y-auto divide-y divide-gray-50 custom-scrollbar">
                            {employees.filter(emp =>
                                `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchQuery.toLowerCase())
                            ).map(emp => (
                                <button
                                    key={emp.id}
                                    onClick={() => setEditingEmployee(emp)}
                                    className={`w-full p-6 text-left transition-all flex justify-between items-center ${editingEmployee?.id === emp.id ? 'bg-blue-50/40 border-r-4 border-blue-600' : 'hover:bg-gray-50'}`}
                                >
                                    <div>
                                        <p className="font-extrabold text-gray-900 capitalize">{emp.firstName} {emp.lastName}</p>
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{emp.employeeCode}</p>
                                    </div>
                                    <ArrowRightCircle className="w-5 h-5 text-gray-100" />
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="lg:col-span-2">
                        {editingEmployee ? (
                            <form onSubmit={handleUpdateSalary} className="app-card p-12 space-y-10">
                                <h3 className="text-3xl font-extrabold text-gray-900 tracking-tight">Structured Salary</h3>
                                <div className="grid grid-cols-2 gap-10">
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Fixed Monthly Earnings</p>
                                        <div className="space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Basic Salary</label>
                                                <input type="number" className="input-app w-full font-bold" value={editingEmployee.basicSalary} onChange={(e) => setEditingEmployee({ ...editingEmployee, basicSalary: parseFloat(e.target.value) })} placeholder="Basic" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">HRA</label>
                                                <input type="number" className="input-app w-full font-bold" value={editingEmployee.hra} onChange={(e) => setEditingEmployee({ ...editingEmployee, hra: parseFloat(e.target.value) })} placeholder="HRA" />
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Other Fixed Allowances</label>
                                                <input type="number" className="input-app w-full font-bold" value={editingEmployee.otherAllowances} onChange={(e) => setEditingEmployee({ ...editingEmployee, otherAllowances: parseFloat(e.target.value) })} placeholder="Conveyance/Spcl" />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-6">
                                        <p className="text-[10px] font-black text-red-600 uppercase tracking-widest">Statutory & OT</p>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                                <span className="text-[10px] font-black uppercase">Enable PF (12%)</span>
                                                <input type="checkbox" className="w-5 h-5 rounded-md text-blue-600" checked={editingEmployee.isPFEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isPFEnabled: e.target.checked })} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                                <span className="text-[10px] font-black uppercase">Enable ESI (0.75%)</span>
                                                <input type="checkbox" className="w-5 h-5 rounded-md text-blue-600" checked={editingEmployee.isESIEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isESIEnabled: e.target.checked })} />
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl">
                                                <span className="text-[10px] font-black uppercase">Enable Prof. Tax</span>
                                                <input type="checkbox" className="w-5 h-5 rounded-md text-blue-600" checked={editingEmployee.isPTEnabled} onChange={(e) => setEditingEmployee({ ...editingEmployee, isPTEnabled: e.target.checked })} />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-[9px] font-black text-gray-400 uppercase ml-2">OT Rate Multiplier (e.g. 1.5)</label>
                                                <input type="number" step="0.1" className="input-app w-full font-bold" value={editingEmployee.otRateMultiplier} onChange={(e) => setEditingEmployee({ ...editingEmployee, otRateMultiplier: parseFloat(e.target.value) })} placeholder="OT Rate (e.g. 1.5)" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Disbursement Channel (Banking)</p>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Bank Name</label>
                                            <input type="text" className="input-app w-full font-bold" value={editingEmployee.bankName || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, bankName: e.target.value })} placeholder="e.g. HDFC Bank" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">Account Number</label>
                                            <input type="text" className="input-app w-full font-bold" value={editingEmployee.accountNumber || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, accountNumber: e.target.value })} placeholder="A/C Number" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black text-gray-400 uppercase ml-2">IFSC Code</label>
                                            <input type="text" className="input-app w-full font-bold" value={editingEmployee.ifscCode || ''} onChange={(e) => setEditingEmployee({ ...editingEmployee, ifscCode: e.target.value })} placeholder="IFSC" />
                                        </div>
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 pt-8 border-t border-gray-50">
                                    <button onClick={() => setEditingEmployee(null)} className="px-6 py-3 bg-white border border-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-50">Cancel</button>
                                    <button type="submit" className="px-8 py-3 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-100 flex items-center gap-2">
                                        <Save className="w-4 h-4" />
                                        <span>Save Structure</span>
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="app-card h-full flex flex-col items-center justify-center text-center p-20 border-dashed border-2 border-gray-100">
                                <FileText className="w-16 h-16 text-gray-100 mb-6" />
                                <h3 className="text-xl font-black text-gray-300 tracking-tight">Financial Ledger Neutral</h3>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* New Run Modal */}
            {showNewRunModal && (
                <div className="fixed inset-0 bg-gray-900/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden">
                        <div className="p-10 border-b border-gray-50 flex justify-between items-center">
                            <h3 className="text-2xl font-black text-gray-900 tracking-tight">Initialize Batch</h3>
                            <button onClick={() => setShowNewRunModal(false)} className="p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 rounded-2xl"><X className="w-6 h-6" /></button>
                        </div>
                        <form onSubmit={handleCreateRun} className="p-10 space-y-6">
                            <input type="text" className="input-app w-full font-bold" value={newRunData.batchName} onChange={(e) => setNewRunData({ ...newRunData, batchName: e.target.value })} placeholder="Batch Name" required />
                            <div className="grid grid-cols-2 gap-4">
                                <select className="input-app w-full font-bold" value={newRunData.month} onChange={(e) => setNewRunData({ ...newRunData, month: parseInt(e.target.value) })}>
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <option key={i + 1} value={i + 1}>{new Date(0, i).toLocaleString('default', { month: 'long' })}</option>
                                    ))}
                                </select>
                                <input type="number" className="input-app w-full font-bold" value={newRunData.year} onChange={(e) => setNewRunData({ ...newRunData, year: parseInt(e.target.value) })} />
                            </div>
                            <button type="submit" className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-200 flex items-center justify-center gap-2">
                                <Plus className="w-4 h-4" />
                                <span>Create Ledger Batch</span>
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
