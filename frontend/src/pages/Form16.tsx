import React, { useState, useEffect } from 'react';
import {
    FileText,
    Download,
    Users,
    Search,
    ChevronDown,
    Building2,
    CreditCard,
    Save,
    Plus,
    Clock,
    CheckCircle2,
    AlertCircle
} from 'lucide-react';
import { payrollAPI } from '../services/api';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    panNumber?: string;
    totalTDS: number;
}

interface ChallengRecord {
    id?: string;
    quarter: number;
    financialYear: string;
    receiptNo: string;
    bsrCode: string;
    depositedOn: string;
    challanSerialNo: string;
    totalTaxAmount: number;
}

const Form16 = () => {
    const [financialYear, setFinancialYear] = useState('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloading, setDownloading] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'generation' | 'challans'>('generation');

    // Challan Management State
    const [challans, setChallans] = useState<ChallengRecord[]>([]);
    const [savingChallan, setSavingChallan] = useState(false);

    // Generate financial year options
    const fyOptions = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startFY = currentMonth >= 4 ? currentYear : currentYear - 1;

    for (let i = 0; i < 5; i++) {
        const year = startFY - i;
        fyOptions.push(`${year}-${(year + 1).toString().slice(-2)}`);
    }

    useEffect(() => {
        if (!financialYear && fyOptions.length > 0) {
            setFinancialYear(fyOptions[0]);
        }
    }, []);

    useEffect(() => {
        if (financialYear) {
            loadEligibleEmployees();
            loadChallans();
        }
    }, [financialYear]);

    const loadEligibleEmployees = async () => {
        setLoading(true);
        try {
            const res = await payrollAPI.getForm16Eligible(financialYear);
            setEmployees(res.data.employees || []);
        } catch (error) {
            console.error('Error loading employees:', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const loadChallans = async () => {
        try {
            const res = await payrollAPI.getTDSChallans(financialYear);
            // Ensure all 4 quarters are present
            const existing = res.data || [];
            const fullList: ChallengRecord[] = [1, 2, 3, 4].map(q => {
                const found = existing.find((c: any) => c.quarter === q);
                return found || {
                    quarter: q,
                    financialYear,
                    receiptNo: '',
                    bsrCode: '',
                    depositedOn: '',
                    challanSerialNo: '',
                    totalTaxAmount: 0
                };
            });
            setChallans(fullList);
        } catch (error) {
            console.error('Error loading challans:', error);
        }
    };

    const handleSaveChallan = async (index: number) => {
        setSavingChallan(true);
        try {
            const challan = challans[index];
            await payrollAPI.upsertTDSChallan({
                ...challan,
                financialYear
            });
            alert(`Quarter ${challan.quarter} challan saved successfully!`);
        } catch (error) {
            alert('Failed to save challan record');
        } finally {
            setSavingChallan(false);
        }
    };

    const handleChallanChange = (index: number, field: string, value: any) => {
        const updated = [...challans];
        updated[index] = { ...updated[index], [field]: value };
        setChallans(updated);
    };

    const handleDownloadSingle = async (employeeId: string) => {
        setDownloading(employeeId);
        try {
            const res = await payrollAPI.downloadForm16(employeeId, financialYear);
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const emp = employees.find(e => e.id === employeeId);
            a.download = `Form16_${emp?.employeeCode || employeeId}_${financialYear}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading Form 16:', error);
            alert('Failed to download Form 16. Ensure Company Settings (Signatory/CIT Address) are filled.');
        } finally {
            setDownloading(null);
        }
    };

    const handleBulkDownload = async () => {
        if (selectedEmployees.length === 0) {
            alert('Please select employees to download');
            return;
        }

        setDownloading('bulk');
        try {
            const res = await payrollAPI.downloadForm16Bulk(selectedEmployees, financialYear);
            const blob = new Blob([res.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Form16_Bulk_${financialYear}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error bulk downloading:', error);
            alert('Failed to download Form 16 files');
        } finally {
            setDownloading(null);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName} ${emp.employeeCode}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Form 16 Compliance</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">TDS Certification & Challan Management</p>
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    <button
                        onClick={() => setActiveTab('generation')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'generation' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Generation
                    </button>
                    <button
                        onClick={() => setActiveTab('challans')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'challans' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        TDS Challans
                    </button>
                </div>
            </div>

            {/* Global FY Selector */}
            <div className="app-card p-6 flex items-center justify-between border-blue-100 bg-blue-50/30">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Financial Year</p>
                        <select
                            value={financialYear}
                            onChange={(e) => setFinancialYear(e.target.value)}
                            className="bg-transparent text-xl font-black text-gray-900 outline-none cursor-pointer"
                        >
                            {fyOptions.map(fy => (
                                <option key={fy} value={fy}>FY {fy}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {activeTab === 'generation' && (
                    <button
                        onClick={handleBulkDownload}
                        disabled={selectedEmployees.length === 0 || downloading === 'bulk'}
                        className="px-8 py-3 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black shadow-xl shadow-gray-200 transition-all flex items-center gap-2 disabled:bg-gray-200"
                    >
                        <Download className="w-4 h-4" />
                        <span>Bulk Download ({selectedEmployees.length})</span>
                    </button>
                )}
            </div>

            {activeTab === 'generation' ? (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Search & Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by name, employee code or PAN..."
                                className="w-full pl-14 pr-6 py-4 bg-white border border-gray-100 rounded-2xl shadow-sm focus:ring-2 focus:ring-blue-100 outline-none font-bold text-gray-900"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Total TDS Pooled</p>
                                <p className="text-2xl font-black text-emerald-900 mt-1">₹{filteredEmployees.reduce((sum, e) => sum + e.totalTDS, 0).toLocaleString()}</p>
                            </div>
                            <CheckCircle2 className="w-8 h-8 text-emerald-200" />
                        </div>
                    </div>

                    {/* Table */}
                    <div className="app-card overflow-hidden">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-gray-50/50">
                                    <th className="px-8 py-5 text-left">
                                        <input
                                            type="checkbox"
                                            className="w-5 h-5 rounded-lg border-gray-200 text-blue-600 focus:ring-blue-500"
                                            checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                                            onChange={() => {
                                                if (selectedEmployees.length === filteredEmployees.length) setSelectedEmployees([]);
                                                else setSelectedEmployees(filteredEmployees.map(e => e.id));
                                            }}
                                        />
                                    </th>
                                    <th className="table-header">Employee Details</th>
                                    <th className="table-header">PAN / Identifiers</th>
                                    <th className="table-header text-right">TDS Deducted</th>
                                    <th className="table-header text-center">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                                {loading ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-20 text-center">
                                            <Clock className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
                                            <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Aggregating Compliance Data...</p>
                                        </td>
                                    </tr>
                                ) : filteredEmployees.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-8 py-32 text-center">
                                            <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                                <FileText className="w-10 h-10 text-gray-300" />
                                            </div>
                                            <h3 className="text-lg font-black text-gray-900">No Eligible Records Found</h3>
                                            <p className="text-sm text-gray-400 mt-1">Ensure payroll has been processed with TDS for FY {financialYear}</p>
                                        </td>
                                    </tr>
                                ) : filteredEmployees.map(emp => (
                                    <tr key={emp.id} className="group hover:bg-blue-50/30 transition-all">
                                        <td className="px-8 py-6">
                                            <input
                                                type="checkbox"
                                                className="w-5 h-5 rounded-lg border-gray-200 text-blue-600 focus:ring-blue-500"
                                                checked={selectedEmployees.includes(emp.id)}
                                                onChange={() => {
                                                    if (selectedEmployees.includes(emp.id)) setSelectedEmployees(selectedEmployees.filter(id => id !== emp.id));
                                                    else setSelectedEmployees([...selectedEmployees, emp.id]);
                                                }}
                                            />
                                        </td>
                                        <td className="px-8 py-6">
                                            <p className="text-sm font-black text-gray-900 leading-none">{emp.firstName} {emp.lastName}</p>
                                            <p className="text-[10px] font-bold text-gray-400 mt-1 uppercase tracking-widest">{emp.employeeCode}</p>
                                        </td>
                                        <td className="px-8 py-6 font-mono text-xs font-bold text-blue-600">
                                            {emp.panNumber || <span className="text-red-300 italic">PAN MISSING</span>}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <p className="text-sm font-black text-gray-900">₹{emp.totalTDS.toLocaleString()}</p>
                                        </td>
                                        <td className="px-8 py-6 text-center">
                                            <button
                                                onClick={() => handleDownloadSingle(emp.id)}
                                                disabled={!!downloading}
                                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white border border-gray-100 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 hover:bg-blue-600 hover:text-white hover:border-blue-600 shadow-sm transition-all"
                                            >
                                                {downloading === emp.id ? <Clock className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                                                <span>Download PDF</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Information Alert */}
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-6 flex items-start gap-4">
                        <div className="p-2 bg-amber-100 rounded-xl">
                            <AlertCircle className="w-6 h-6 text-amber-600" />
                        </div>
                        <div>
                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Crucial: TDS Challan Details</h4>
                            <p className="text-xs text-amber-800/80 font-medium mt-1 leading-relaxed">
                                These details are required for Part A of Form 16. Ensure BSR Code (7 digits) and Challan Serial No are accurately captured from your TDS return (TRACES) or bank challan receipts.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {challans.map((challan, index) => (
                            <section key={index} className="app-card overflow-hidden">
                                <div className="p-6 border-b border-gray-50 flex items-center justify-between bg-gray-50/50">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-black">
                                            Q{challan.quarter}
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-black text-gray-900 uppercase tracking-widest">Quarter {challan.quarter} Challan</h3>
                                            <p className="text-[10px] font-bold text-gray-400 leading-none mt-1">FY {financialYear}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => handleSaveChallan(index)}
                                        disabled={savingChallan}
                                        className="p-3 bg-white border border-gray-100 rounded-xl text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    >
                                        <Save className="w-5 h-5" />
                                    </button>
                                </div>
                                <div className="p-8 space-y-6">
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Receipt Number</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900"
                                                value={challan.receiptNo}
                                                onChange={(e) => handleChallanChange(index, 'receiptNo', e.target.value)}
                                                placeholder="RECXXXXXXXX"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">BSR Code</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900"
                                                value={challan.bsrCode}
                                                onChange={(e) => handleChallanChange(index, 'bsrCode', e.target.value)}
                                                placeholder="7 Digit Code"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deposit Date</label>
                                            <input
                                                type="date"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900"
                                                value={challan.depositedOn ? new Date(challan.depositedOn).toISOString().split('T')[0] : ''}
                                                onChange={(e) => handleChallanChange(index, 'depositedOn', e.target.value)}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Serial Number</label>
                                            <input
                                                type="text"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-900"
                                                value={challan.challanSerialNo}
                                                onChange={(e) => handleChallanChange(index, 'challanSerialNo', e.target.value)}
                                                placeholder="5 Digit Serial"
                                            />
                                        </div>
                                        <div className="col-span-2 space-y-1">
                                            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Tax Amount (Rs.)</label>
                                            <input
                                                type="number"
                                                className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-lg text-blue-600"
                                                value={challan.totalTaxAmount}
                                                onChange={(e) => handleChallanChange(index, 'totalTaxAmount', parseFloat(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Form16;
