import React, { useState, useEffect } from 'react';
import {
    ShieldCheck,
    Download,
    Link,
    Key,
    CheckCircle2,
    AlertCircle,
    Globe,
    CreditCard,
    Save,
    RefreshCw,
    Building2
} from 'lucide-react';
import { payrollAPI } from '../services/api';

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
    const [activeTab, setActiveTab] = useState<'sandbox' | 'challans'>('sandbox');
    const [challans, setChallans] = useState<ChallengRecord[]>([]);
    const [savingChallan, setSavingChallan] = useState(false);
    const [credentials, setCredentials] = useState({
        username: '',
        password: '',
        tan: ''
    });

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
            loadChallans();
        }
    }, [financialYear]);

    const loadChallans = async () => {
        try {
            const res = await payrollAPI.getTDSChallans(financialYear);
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

    const [syncing, setSyncing] = useState(false);
    const [activeJobId, setActiveJobId] = useState<string | null>(null);
    const [jobStatus, setJobStatus] = useState<any>(null);

    useEffect(() => {
        let interval: any;
        if (activeJobId) {
            interval = setInterval(async () => {
                try {
                    const res = await payrollAPI.getJobStatus(activeJobId);
                    setJobStatus(res.data);

                    if (res.data.status === 'SUCCESS' || res.data.status === 'FAILED') {
                        clearInterval(interval);
                        setActiveJobId(null);
                        if (res.data.status === 'SUCCESS') {
                            alert('TRACES sync completed successfully!');
                        }
                    }
                } catch (error) {
                    console.error('Job status polling error:', error);
                }
            }, 5000);
        }
        return () => clearInterval(interval);
    }, [activeJobId]);

    const handleSyncTraces = async () => {
        if (!credentials.username || !credentials.password || !credentials.tan) {
            alert('Please fill in all TRACES credentials');
            return;
        }

        setSyncing(true);
        try {
            const res = await payrollAPI.syncTraces({
                ...credentials,
                financialYear,
                quarter: 'Q4' // Defaulting to Q4 for Form 16 Part A
            });

            if (res.data.job_id) {
                setActiveJobId(res.data.job_id);
                setJobStatus({ status: 'PENDING', message: 'Connecting to TRACES...' });
            }
        } catch (error: any) {
            alert(error.response?.data?.error || 'Failed to connect to TRACES. Please check credentials or Sandbox credits.');
        } finally {
            setSyncing(false);
        }
    };

    const handleChallanChange = (index: number, field: string, value: any) => {
        const updated = [...challans];
        updated[index] = { ...updated[index], [field]: value };
        setChallans(updated);
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Official TDS Compliance</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-widest">TRACES Portal & Sandbox Integration</p>
                </div>

                <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
                    <button
                        onClick={() => setActiveTab('sandbox')}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'sandbox' ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'text-gray-400 hover:text-gray-600'}`}
                    >
                        Official Download (Sandbox)
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
            <div className="app-card p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 border-blue-100 bg-blue-50/30">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-600 rounded-2xl shadow-lg shadow-blue-100">
                        <Building2 className="w-6 h-6 text-white" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Status: Sandbox Ready</p>
                        <select
                            value={financialYear}
                            onChange={(e) => setFinancialYear(e.target.value)}
                            className="bg-transparent text-xl font-black text-gray-900 outline-none cursor-pointer mt-1"
                        >
                            {fyOptions.map(fy => (
                                <option key={fy} value={fy}>FY {fy}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {activeTab === 'sandbox' && (
                    <div className="flex items-center gap-3">
                        <div className="px-4 py-2 bg-emerald-100 border border-emerald-200 rounded-xl flex items-center gap-2">
                            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
                            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Bridge Active</span>
                        </div>
                    </div>
                )}
            </div>

            {activeTab === 'sandbox' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Credentials Card */}
                    <div className="lg:col-span-2 space-y-8">
                        <section className="app-card p-8">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="p-3 bg-gray-900 rounded-2xl text-white">
                                    <Key className="w-6 h-6" />
                                </div>
                                <h3 className="text-lg font-black text-gray-900 uppercase tracking-widest">TRACES Credentials</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">User ID</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-900"
                                        placeholder="TRACES Username"
                                        value={credentials.username}
                                        onChange={(e) => setCredentials({ ...credentials, username: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Password</label>
                                    <input
                                        type="password"
                                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-bold text-gray-900"
                                        placeholder="TRACES Password"
                                        value={credentials.password}
                                        onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Deductor TAN</label>
                                    <input
                                        type="text"
                                        className="w-full px-5 py-3 bg-gray-50 border border-gray-100 rounded-2xl font-black text-blue-600 tracking-widest uppercase"
                                        placeholder="BKLP00XXXA"
                                        value={credentials.tan}
                                        onChange={(e) => setCredentials({ ...credentials, tan: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end">
                                <button
                                    onClick={handleSyncTraces}
                                    disabled={syncing}
                                    className="px-8 py-3 bg-gray-900 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center gap-2 disabled:opacity-50"
                                >
                                    {syncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                    <span>{syncing ? 'Syncing...' : 'Sync TRACES Library'}</span>
                                </button>
                            </div>
                        </section>

                        {jobStatus && (
                            <div className="bg-white border-2 border-blue-600 rounded-3xl p-8 animate-in zoom-in-95 duration-300 shadow-xl shadow-blue-50">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className="p-3 bg-blue-600 rounded-2xl text-white">
                                            <RefreshCw className={`w-6 h-6 ${jobStatus.status !== 'SUCCESS' && jobStatus.status !== 'FAILED' ? 'animate-spin' : ''}`} />
                                        </div>
                                        <div>
                                            <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest">Job Status: {jobStatus.status}</h4>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">ID: {activeJobId || 'COMPLETED'}</p>
                                        </div>
                                    </div>
                                    {jobStatus.status === 'SUCCESS' && <CheckCircle2 className="w-8 h-8 text-emerald-500" />}
                                    {jobStatus.status === 'FAILED' && <AlertCircle className="w-8 h-8 text-rose-500" />}
                                </div>

                                <div className="space-y-4">
                                    <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-1000 ${jobStatus.status === 'SUCCESS' ? 'bg-emerald-500 w-full' : jobStatus.status === 'FAILED' ? 'bg-rose-500 w-full' : 'bg-blue-600 w-1/2 animate-pulse'}`}
                                        ></div>
                                    </div>
                                    <p className="text-xs font-bold text-gray-600 text-center italic">
                                        {jobStatus.message || (jobStatus.status === 'PENDING' ? 'Decrypting government portal...' : 'Processing...')}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="bg-emerald-50 border border-emerald-100 rounded-3xl p-8 flex items-center justify-between">
                            <div className="flex items-center gap-6">
                                <div className="p-4 bg-emerald-500 rounded-2xl text-white shadow-lg shadow-emerald-100">
                                    <ShieldCheck className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-lg font-black text-emerald-900 uppercase tracking-tight">Official Certificate Download</h4>
                                    <p className="text-sm text-emerald-700/80 font-medium">Auto-fetch Part A from Government Servers via Sandbox.</p>
                                </div>
                            </div>
                            <button className="px-8 py-4 bg-white text-emerald-600 font-black text-xs uppercase tracking-widest rounded-2xl shadow-sm hover:shadow-md transition-all border border-emerald-100 flex items-center gap-2">
                                <Download className="w-4 h-4" />
                                <span>Bulk Request</span>
                            </button>
                        </div>
                    </div>

                    {/* How it works Side Column */}
                    <div className="space-y-8">
                        <div className="app-card p-8 bg-gray-900 text-white">
                            <h3 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-6 flex items-center gap-2">
                                <Globe className="w-4 h-4" />
                                How Sandbox Works
                            </h3>
                            <div className="space-y-6">
                                {[
                                    { step: "01", text: "Sandbox connects to TRACES using your credentials." },
                                    { step: "02", text: "It solves government captchas automatically." },
                                    { step: "03", text: "Downloads the Official Part-A digitally signed PDF." },
                                    { step: "04", text: "Files are stored directly in Employee Document Library." }
                                ].map((step, i) => (
                                    <div key={i} className="flex gap-4">
                                        <span className="text-blue-500 font-black text-xs">{step.step}</span>
                                        <p className="text-[12px] font-bold text-gray-300 leading-relaxed">{step.text}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
                            <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <ShieldCheck className="w-4 h-4 text-blue-500" />
                                Quick PAN Verify
                            </h4>
                            <div className="flex gap-2">
                                <input
                                    id="quick-pan"
                                    type="text"
                                    placeholder="Enter PAN"
                                    className="flex-1 px-3 py-2 bg-white border border-blue-100 rounded-xl text-xs font-bold uppercase"
                                />
                                <button
                                    onClick={async () => {
                                        const pan = (document.getElementById('quick-pan') as HTMLInputElement).value;
                                        if (!pan) return;
                                        try {
                                            const res = await payrollAPI.verifyPAN(pan);
                                            alert(`PAN Verified: ${res.data.full_name || 'Valid Record Found'}`);
                                        } catch (e) {
                                            alert('Invalid PAN or Verification Failed');
                                        }
                                    }}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase"
                                >
                                    Verify
                                </button>
                            </div>
                        </div>

                        <div className="bg-blue-50 border border-blue-100 rounded-3xl p-6">
                            <h4 className="text-xs font-black text-blue-900 uppercase tracking-widest mb-3 flex items-center gap-2">
                                <AlertCircle className="w-4 h-4 text-blue-500" />
                                Digital Signature
                            </h4>
                            <p className="text-[11px] text-blue-800/70 font-bold leading-relaxed">
                                Form 16 Part-A must be signed using the TRACES Digital Signature tool before distribution to employees for compliance.
                            </p>
                        </div>
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
                            <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest">Challan Verification Required</h4>
                            <p className="text-xs text-amber-800/80 font-medium mt-1 leading-relaxed">
                                These details are used to match against TRACES records. Accurate BSR Code (7 digits) and Challan Serial No are essential for Sandbox automated downloads.
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
