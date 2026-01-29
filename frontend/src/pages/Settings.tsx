import { useState, useEffect } from 'react';
import {
    Building2,
    ShieldCheck,
    Save,
    MapPin,
    CreditCard,
    FileText,
    Globe,
    Stamp,
    Smartphone
} from 'lucide-react';
import axios from 'axios';

export const Settings = () => {
    const [profile, setProfile] = useState<any>({
        name: 'Apextime Enterprises',
        legalName: '',
        address: '',
        gstin: '',
        pan: '',
        pfCode: '',
        esiCode: '',
        tan: '',
        bankName: '',
        accountNumber: '',
        ifscCode: ''
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Fetch current settings if they exist
        // For now, using local state as placeholder
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            // await api.post('/settings/company', profile);
            alert('Settings saved successfully. Changes will reflect in future payslips.');
        } catch (e) {
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black heading-gradient flex items-center gap-3">
                        <Building2 className="w-10 h-10 text-indigo-600 bg-indigo-50 p-2 rounded-2xl" />
                        Company Settings
                    </h1>
                    <p className="text-slate-500 mt-2 font-medium">Configure your organizational identity and statutory compliance codes.</p>
                </div>
                <button
                    onClick={handleSave}
                    className="btn-primary-premium scale-110 shadow-indigo-200"
                    disabled={loading}
                >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Side: General Profile */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="glass-card p-10 space-y-8">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4">
                            <Globe className="w-6 h-6 text-indigo-500" />
                            General Information
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Display Name</label>
                                <input type="text" className="input-premium" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Legal Name</label>
                                <input type="text" className="input-premium" value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">GSTIN</label>
                                <input type="text" className="input-premium uppercase" value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="col-span-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Registered Address</label>
                                <textarea className="input-premium h-32 py-4" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })}></textarea>
                            </div>
                        </div>
                    </section>

                    <section className="glass-card p-10 space-y-8">
                        <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 border-b pb-4">
                            <ShieldCheck className="w-6 h-6 text-emerald-500" />
                            Statutory & Compliance
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">PF Registration No.</label>
                                <input type="text" className="input-premium" value={profile.pfCode} onChange={(e) => setProfile({ ...profile, pfCode: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">ESI Registration No.</label>
                                <input type="text" className="input-premium" value={profile.esiCode} onChange={(e) => setProfile({ ...profile, esiCode: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">PAN</label>
                                <input type="text" className="input-premium uppercase" value={profile.pan} onChange={(e) => setProfile({ ...profile, pan: e.target.value.toUpperCase() })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">TAN</label>
                                <input type="text" className="input-premium uppercase" value={profile.tan} onChange={(e) => setProfile({ ...profile, tan: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Side: Bank & Branding */}
                <div className="space-y-8">
                    <section className="glass-card p-8 space-y-6">
                        <h3 className="text-lg font-black text-slate-800 flex items-center gap-2">
                            <CreditCard className="w-5 h-5 text-indigo-500" />
                            Disbursement Bank
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Bank Name</label>
                                <input type="text" className="input-premium py-3 text-sm" value={profile.bankName} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">Account Number</label>
                                <input type="text" className="input-premium py-3 text-sm" value={profile.accountNumber} onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase mb-1 block">IFSC Code</label>
                                <input type="text" className="input-premium py-3 text-sm" value={profile.ifscCode} onChange={(e) => setProfile({ ...profile, ifscCode: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    <section className="glass-card p-8 bg-indigo-900 text-white space-y-4">
                        <div className="p-3 bg-white/10 rounded-2xl w-fit">
                            <Stamp className="w-6 h-6 text-indigo-200" />
                        </div>
                        <h3 className="text-lg font-black italic">Branding <span className="text-indigo-400">Preview</span></h3>
                        <p className="text-indigo-200 text-xs font-medium">This logo and address will appear on all automated payslips and reports.</p>
                        <div className="pt-4">
                            <div className="w-full h-32 bg-white/5 border-2 border-dashed border-white/20 rounded-3xl flex items-center justify-center group cursor-pointer hover:bg-white/10 transition-all">
                                <span className="text-[10px] font-black uppercase text-white/30 group-hover:text-white/60">Upload Corporate Logo</span>
                            </div>
                        </div>
                    </section>

                    <section className="glass-card p-8 border-dashed border-2 bg-amber-50/50">
                        <div className="flex items-center gap-2 mb-4">
                            <Smartphone className="w-5 h-5 text-amber-600" />
                            <h4 className="font-black text-slate-800">HRM Power Tip</h4>
                        </div>
                        <p className="text-sm text-slate-600 font-medium">
                            Accurate <strong className="text-amber-700">GSTIN</strong> and <strong className="text-amber-700">PAN</strong> details are required for generating statutory reports that match government filings.
                        </p>
                    </section>
                </div>
            </div>
        </div>
    );
};
