import React, { useState, useEffect } from 'react';
import { Plus, Check, X, Download, DollarSign, Gift, FileText, Building2, ChevronDown } from 'lucide-react';
import { payrollAdjustmentsAPI, employeesAPI, payrollAPI } from '../services/api';

type TabType = 'reimbursements' | 'arrears' | 'incentives' | 'bank-export';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
}

interface Reimbursement {
    id: string;
    employeeId: string;
    employee: { firstName: string; lastName: string; employeeCode: string };
    type: string;
    amount: number;
    billDate: string;
    billNumber?: string;
    description?: string;
    status: string;
    approvedBy?: string;
    approvedAt?: string;
    rejectedReason?: string;
}

interface BankFormat {
    id: string;
    name: string;
    description: string;
}

const REIMBURSEMENT_TYPES = [
    'TRAVEL',
    'MEDICAL',
    'FOOD',
    'INTERNET',
    'MOBILE',
    'FUEL',
    'DRIVER',
    'RELOCATION',
    'BOOKS',
    'OTHER'
];

const PayrollAdjustments = () => {
    const [activeTab, setActiveTab] = useState<TabType>('reimbursements');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);

    // Reimbursements state
    const [reimbursements, setReimbursements] = useState<Reimbursement[]>([]);
    const [showReimbursementModal, setShowReimbursementModal] = useState(false);
    const [reimbursementForm, setReimbursementForm] = useState({
        employeeId: '',
        type: 'TRAVEL',
        amount: '',
        billDate: '',
        billNumber: '',
        description: ''
    });

    // Arrears state
    const [showArrearsModal, setShowArrearsModal] = useState(false);
    const [arrearsForm, setArrearsForm] = useState({
        employeeId: '',
        amount: '',
        reason: '',
        forMonth: new Date().getMonth(),
        forYear: new Date().getFullYear()
    });

    // Incentives state
    const [showIncentiveModal, setShowIncentiveModal] = useState(false);
    const [incentiveForm, setIncentiveForm] = useState({
        employeeId: '',
        amount: '',
        reason: ''
    });

    // Bank export state
    const [bankFormats, setBankFormats] = useState<BankFormat[]>([]);
    const [payrollRuns, setPayrollRuns] = useState<any[]>([]);
    const [selectedRun, setSelectedRun] = useState('');
    const [selectedFormat, setSelectedFormat] = useState('');

    useEffect(() => {
        loadEmployees();
        loadReimbursements();
        loadBankFormats();
        loadPayrollRuns();
    }, []);

    const loadEmployees = async () => {
        try {
            const res = await employeesAPI.getAll();
            setEmployees(res.data);
        } catch (error) {
            console.error('Error loading employees:', error);
        }
    };

    const loadReimbursements = async () => {
        setLoading(true);
        try {
            const res = await payrollAdjustmentsAPI.getReimbursements();
            setReimbursements(res.data);
        } catch (error) {
            console.error('Error loading reimbursements:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadBankFormats = async () => {
        try {
            const res = await payrollAPI.getBankFormats();
            setBankFormats(res.data);
        } catch (error) {
            console.error('Error loading bank formats:', error);
        }
    };

    const loadPayrollRuns = async () => {
        try {
            const res = await payrollAPI.getRuns();
            setPayrollRuns(res.data.filter((r: any) => r.status === 'FINALIZED' || r.status === 'PAID'));
        } catch (error) {
            console.error('Error loading payroll runs:', error);
        }
    };

    const handleCreateReimbursement = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await payrollAdjustmentsAPI.createReimbursement({
                ...reimbursementForm,
                amount: parseFloat(reimbursementForm.amount)
            });
            setShowReimbursementModal(false);
            setReimbursementForm({ employeeId: '', type: 'TRAVEL', amount: '', billDate: '', billNumber: '', description: '' });
            loadReimbursements();
        } catch (error) {
            console.error('Error creating reimbursement:', error);
            alert('Failed to create reimbursement');
        }
    };

    const handleApproveReject = async (id: string, status: string, reason?: string) => {
        try {
            await payrollAdjustmentsAPI.updateReimbursementStatus(id, status, reason);
            loadReimbursements();
        } catch (error) {
            console.error('Error updating status:', error);
        }
    };

    const handleAddArrears = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await payrollAdjustmentsAPI.addArrears({
                ...arrearsForm,
                amount: parseFloat(arrearsForm.amount)
            });
            setShowArrearsModal(false);
            setArrearsForm({ employeeId: '', amount: '', reason: '', forMonth: new Date().getMonth(), forYear: new Date().getFullYear() });
            alert('Arrears added successfully! Will be processed in next payroll.');
        } catch (error) {
            console.error('Error adding arrears:', error);
            alert('Failed to add arrears');
        }
    };

    const handleAddIncentive = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await payrollAdjustmentsAPI.addIncentive({
                ...incentiveForm,
                amount: parseFloat(incentiveForm.amount)
            });
            setShowIncentiveModal(false);
            setIncentiveForm({ employeeId: '', amount: '', reason: '' });
            alert('Incentive added successfully! Will be processed in next payroll.');
        } catch (error) {
            console.error('Error adding incentive:', error);
            alert('Failed to add incentive');
        }
    };

    const handleBankExport = async () => {
        if (!selectedRun || !selectedFormat) {
            alert('Please select both a payroll run and bank format');
            return;
        }
        try {
            const res = await payrollAPI.exportBankFormat(selectedRun, selectedFormat);
            const blob = new Blob([res.data], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Bank_Export_${selectedFormat}_${Date.now()}.csv`;
            a.click();
        } catch (error) {
            console.error('Error exporting:', error);
            alert('Failed to export');
        }
    };

    const tabs = [
        { id: 'reimbursements' as TabType, label: 'Reimbursements', icon: FileText },
        { id: 'arrears' as TabType, label: 'Arrears', icon: DollarSign },
        { id: 'incentives' as TabType, label: 'Incentives', icon: Gift },
        { id: 'bank-export' as TabType, label: 'Bank Export', icon: Building2 }
    ];

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'PENDING':
                return <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">Pending</span>;
            case 'APPROVED':
                return <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">Approved</span>;
            case 'REJECTED':
                return <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">Rejected</span>;
            case 'PAID':
                return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">Paid</span>;
            default:
                return <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 rounded-full">{status}</span>;
        }
    };

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800">Payroll Adjustments</h1>
            </div>

            {/* Tabs */}
            <div className="flex space-x-1 mb-6 border-b border-gray-200">
                {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            data-testid={`tab-${tab.id}`}
                            className={`flex items-center px-4 py-2 font-medium text-sm transition-colors border-b-2 ${
                                activeTab === tab.id
                                    ? 'border-blue-600 text-blue-600 bg-blue-50'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                            }`}
                        >
                            <Icon size={16} className="mr-2" />
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            <div className="bg-white rounded-lg shadow p-6">
                {/* Reimbursements Tab */}
                {activeTab === 'reimbursements' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Reimbursement Claims</h2>
                                <p className="text-sm text-gray-500">Manage employee reimbursement requests</p>
                            </div>
                            <button
                                onClick={() => setShowReimbursementModal(true)}
                                data-testid="add-reimbursement-btn"
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
                            >
                                <Plus size={16} className="mr-2" />
                                Add Claim
                            </button>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Amount</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bill Date</th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Status</th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {loading ? (
                                        <tr><td colSpan={6} className="text-center py-4">Loading...</td></tr>
                                    ) : reimbursements.length === 0 ? (
                                        <tr><td colSpan={6} className="text-center py-4 text-gray-500">No reimbursement claims yet</td></tr>
                                    ) : reimbursements.map((r) => (
                                        <tr key={r.id} className="hover:bg-gray-50">
                                            <td className="px-4 py-3 text-sm">
                                                <div className="font-medium text-gray-900">{r.employee.firstName} {r.employee.lastName}</div>
                                                <div className="text-gray-500 text-xs">{r.employee.employeeCode}</div>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-gray-600">{r.type}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium">₹{r.amount.toLocaleString()}</td>
                                            <td className="px-4 py-3 text-sm text-gray-600">
                                                {new Date(r.billDate).toLocaleDateString()}
                                            </td>
                                            <td className="px-4 py-3 text-center">{getStatusBadge(r.status)}</td>
                                            <td className="px-4 py-3 text-right">
                                                {r.status === 'PENDING' && (
                                                    <div className="flex justify-end space-x-2">
                                                        <button
                                                            onClick={() => handleApproveReject(r.id, 'APPROVED')}
                                                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                                                            title="Approve"
                                                        >
                                                            <Check size={18} />
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                const reason = prompt('Rejection reason:');
                                                                if (reason) handleApproveReject(r.id, 'REJECTED', reason);
                                                            }}
                                                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                                                            title="Reject"
                                                        >
                                                            <X size={18} />
                                                        </button>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* Arrears Tab */}
                {activeTab === 'arrears' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Salary Arrears</h2>
                                <p className="text-sm text-gray-500">Add salary adjustments for previous months</p>
                            </div>
                            <button
                                onClick={() => setShowArrearsModal(true)}
                                data-testid="add-arrears-btn"
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
                            >
                                <Plus size={16} className="mr-2" />
                                Add Arrears
                            </button>
                        </div>

                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                            <h3 className="font-medium text-blue-800 mb-2">What are Arrears?</h3>
                            <p className="text-sm text-blue-700">
                                Arrears are salary adjustments for previous months due to:
                            </p>
                            <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                                <li>Salary revision with retrospective effect</li>
                                <li>Correction of salary calculation errors</li>
                                <li>DA (Dearness Allowance) revision</li>
                                <li>Increments or promotions backdated</li>
                            </ul>
                        </div>

                        <div className="text-center py-8 text-gray-500">
                            <DollarSign size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>Click "Add Arrears" to add salary adjustments</p>
                            <p className="text-sm mt-2">Arrears will be automatically added to the next payroll run</p>
                        </div>
                    </div>
                )}

                {/* Incentives Tab */}
                {activeTab === 'incentives' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <div>
                                <h2 className="text-lg font-semibold text-gray-800">Performance Incentives</h2>
                                <p className="text-sm text-gray-500">Add one-time incentives or bonuses</p>
                            </div>
                            <button
                                onClick={() => setShowIncentiveModal(true)}
                                data-testid="add-incentive-btn"
                                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center text-sm font-medium"
                            >
                                <Plus size={16} className="mr-2" />
                                Add Incentive
                            </button>
                        </div>

                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                            <h3 className="font-medium text-green-800 mb-2">Types of Incentives</h3>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                <div className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm">Performance Bonus</div>
                                    <div className="text-xs text-gray-500">Target achievement</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm">Spot Award</div>
                                    <div className="text-xs text-gray-500">Instant recognition</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm">Referral Bonus</div>
                                    <div className="text-xs text-gray-500">Employee referral</div>
                                </div>
                                <div className="bg-white p-3 rounded border">
                                    <div className="font-medium text-sm">Project Bonus</div>
                                    <div className="text-xs text-gray-500">Project completion</div>
                                </div>
                            </div>
                        </div>

                        <div className="text-center py-8 text-gray-500">
                            <Gift size={48} className="mx-auto mb-4 text-gray-300" />
                            <p>Click "Add Incentive" to reward employees</p>
                            <p className="text-sm mt-2">Incentives will be automatically added to the next payroll run</p>
                        </div>
                    </div>
                )}

                {/* Bank Export Tab */}
                {activeTab === 'bank-export' && (
                    <div>
                        <div className="mb-4">
                            <h2 className="text-lg font-semibold text-gray-800">Bank File Export</h2>
                            <p className="text-sm text-gray-500">Export salary data in your bank's specific format</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                            {/* Select Payroll Run */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Payroll Run
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedRun}
                                        onChange={(e) => setSelectedRun(e.target.value)}
                                        data-testid="select-payroll-run"
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                    >
                                        <option value="">-- Select Run --</option>
                                        {payrollRuns.map((run) => (
                                            <option key={run.id} value={run.id}>
                                                {run.name} - {run.month}/{run.year} ({run.status})
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                                </div>
                            </div>

                            {/* Select Bank Format */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Select Bank Format
                                </label>
                                <div className="relative">
                                    <select
                                        value={selectedFormat}
                                        onChange={(e) => setSelectedFormat(e.target.value)}
                                        data-testid="select-bank-format"
                                        className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-white focus:outline-none focus:ring-blue-500 focus:border-blue-500 appearance-none"
                                    >
                                        <option value="">-- Select Format --</option>
                                        {bankFormats.map((format) => (
                                            <option key={format.id} value={format.id}>
                                                {format.name}
                                            </option>
                                        ))}
                                    </select>
                                    <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleBankExport}
                            disabled={!selectedRun || !selectedFormat}
                            data-testid="export-bank-btn"
                            className={`px-6 py-2 rounded-md font-medium flex items-center ${
                                selectedRun && selectedFormat
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Download size={16} className="mr-2" />
                            Download Bank File
                        </button>

                        {/* Bank Formats Info */}
                        <div className="mt-8">
                            <h3 className="font-medium text-gray-800 mb-4">Supported Bank Formats</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {bankFormats.map((format) => (
                                    <div key={format.id} className="bg-gray-50 p-4 rounded-lg border">
                                        <div className="font-medium text-gray-800">{format.name}</div>
                                        <div className="text-xs text-gray-500 mt-1">{format.description}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Reimbursement Modal */}
            {showReimbursementModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">Add Reimbursement Claim</h3>
                        </div>
                        <form onSubmit={handleCreateReimbursement}>
                            <div className="px-6 py-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                                    <select
                                        value={reimbursementForm.employeeId}
                                        onChange={(e) => setReimbursementForm({ ...reimbursementForm, employeeId: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        required
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.employeeCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                                        <select
                                            value={reimbursementForm.type}
                                            onChange={(e) => setReimbursementForm({ ...reimbursementForm, type: e.target.value })}
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        >
                                            {REIMBURSEMENT_TYPES.map((type) => (
                                                <option key={type} value={type}>{type}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                                        <input
                                            type="number"
                                            value={reimbursementForm.amount}
                                            onChange={(e) => setReimbursementForm({ ...reimbursementForm, amount: e.target.value })}
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bill Date *</label>
                                        <input
                                            type="date"
                                            value={reimbursementForm.billDate}
                                            onChange={(e) => setReimbursementForm({ ...reimbursementForm, billDate: e.target.value })}
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Bill Number</label>
                                        <input
                                            type="text"
                                            value={reimbursementForm.billNumber}
                                            onChange={(e) => setReimbursementForm({ ...reimbursementForm, billNumber: e.target.value })}
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        value={reimbursementForm.description}
                                        onChange={(e) => setReimbursementForm({ ...reimbursementForm, description: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                                <button type="button" onClick={() => setShowReimbursementModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    Submit Claim
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Arrears Modal */}
            {showArrearsModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">Add Arrears</h3>
                        </div>
                        <form onSubmit={handleAddArrears}>
                            <div className="px-6 py-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                                    <select
                                        value={arrearsForm.employeeId}
                                        onChange={(e) => setArrearsForm({ ...arrearsForm, employeeId: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        required
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.employeeCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                                    <input
                                        type="number"
                                        value={arrearsForm.amount}
                                        onChange={(e) => setArrearsForm({ ...arrearsForm, amount: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">For Month</label>
                                        <select
                                            value={arrearsForm.forMonth}
                                            onChange={(e) => setArrearsForm({ ...arrearsForm, forMonth: parseInt(e.target.value) })}
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        >
                                            {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, i) => (
                                                <option key={i} value={i}>{m}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                                        <input
                                            type="number"
                                            value={arrearsForm.forYear}
                                            onChange={(e) => setArrearsForm({ ...arrearsForm, forYear: parseInt(e.target.value) })}
                                            className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                                    <textarea
                                        value={arrearsForm.reason}
                                        onChange={(e) => setArrearsForm({ ...arrearsForm, reason: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        rows={2}
                                        placeholder="e.g., Salary revision with effect from Jan 2026"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                                <button type="button" onClick={() => setShowArrearsModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    Add Arrears
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Incentive Modal */}
            {showIncentiveModal && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-lg shadow-xl max-w-lg w-full">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold text-gray-800">Add Incentive</h3>
                        </div>
                        <form onSubmit={handleAddIncentive}>
                            <div className="px-6 py-4 space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Employee *</label>
                                    <select
                                        value={incentiveForm.employeeId}
                                        onChange={(e) => setIncentiveForm({ ...incentiveForm, employeeId: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        required
                                    >
                                        <option value="">Select Employee</option>
                                        {employees.map((emp) => (
                                            <option key={emp.id} value={emp.id}>
                                                {emp.firstName} {emp.lastName} ({emp.employeeCode})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹) *</label>
                                    <input
                                        type="number"
                                        value={incentiveForm.amount}
                                        onChange={(e) => setIncentiveForm({ ...incentiveForm, amount: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Reason *</label>
                                    <textarea
                                        value={incentiveForm.reason}
                                        onChange={(e) => setIncentiveForm({ ...incentiveForm, reason: e.target.value })}
                                        className="block w-full border border-gray-300 rounded-md py-2 px-3"
                                        rows={2}
                                        placeholder="e.g., Q4 Performance Bonus, Project Completion Award"
                                        required
                                    />
                                </div>
                            </div>
                            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
                                <button type="button" onClick={() => setShowIncentiveModal(false)} className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-100">
                                    Cancel
                                </button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                                    Add Incentive
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayrollAdjustments;
