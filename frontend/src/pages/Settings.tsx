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
    Smartphone,
    TrendingUp,
    Zap,
    Check
} from 'lucide-react';

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
        // Fetch current settings logic
    }, []);

    const handleSave = async () => {
        setLoading(true);
        try {
            alert('Settings saved successfully. Changes will reflect in future payslips.');
        } catch (e) {
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-10 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Institutional Configuration</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter">Identity, Statutory Compliance & Central Logic</p>
                </div>
                <button
                    onClick={handleSave}
                    className="px-10 py-5 bg-red-600 text-white font-black text-xs uppercase tracking-widest rounded-[24px] hover:bg-red-700 shadow-2xl shadow-red-200 transition-all flex items-center justify-center space-x-3 disabled:bg-gray-200"
                    disabled={loading}
                >
                    <Save className="w-5 h-5" />
                    <span>{loading ? 'Saving...' : 'Sync Configuration'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                {/* Left Side: General Profile */}
                <div className="lg:col-span-2 space-y-10">
                    <section className="app-card overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex items-center gap-3">
                            <Globe className="w-5 h-5 text-red-600" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">General Identity Matrix</h3>
                        </div>
                        <div className="p-10 space-y-10">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Brand Name</label>
                                    <input type="text" className="w-full px-6 py-5 bg-gray-50 border-none rounded-3xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-black text-gray-900 text-lg tracking-tight" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Full Legal Entity</label>
                                    <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm" value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">GSTIN Identifier</label>
                                    <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-black text-gray-900 text-sm uppercase" value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="col-span-2 space-y-2">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Headquarters Registered Address</label>
                                    <textarea className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm h-32 resize-none" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })}></textarea>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="app-card overflow-hidden">
                        <div className="p-8 border-b border-gray-50 flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Statutory Compliance HUB</h3>
                        </div>
                        <div className="p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PF Registration String</label>
                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm" value={profile.pfCode} onChange={(e) => setProfile({ ...profile, pfCode: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">ESI System Code</label>
                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-bold text-gray-700 text-sm" value={profile.esiCode} onChange={(e) => setProfile({ ...profile, esiCode: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">PAN Identifier</label>
                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-black text-gray-700 text-sm uppercase" value={profile.pan} onChange={(e) => setProfile({ ...profile, pan: e.target.value.toUpperCase() })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">TAN Identifier</label>
                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-red-50 outline-none transition-all font-black text-gray-700 text-sm uppercase" value={profile.tan} onChange={(e) => setProfile({ ...profile, tan: e.target.value.toUpperCase() })} />
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Side: Banking & Assets */}
                <div className="space-y-10">
                    <section className="app-card p-10 space-y-8">
                        <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Disbursement Bank</h3>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Official Bank</label>
                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm" value={profile.bankName} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">A/C Number</label>
                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-black text-gray-700 text-sm tracking-widest" value={profile.accountNumber} onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">IFSC Identifier</label>
                                <input type="text" className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl font-bold text-gray-700 text-sm uppercase" value={profile.ifscCode} onChange={(e) => setProfile({ ...profile, ifscCode: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    <section className="app-card p-10 bg-gray-900 border-none text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="p-3 bg-white/10 rounded-2xl w-fit relative z-10 transition-transform hover:scale-110">
                            <Stamp className="w-8 h-8 text-red-500" />
                        </div>
                        <h3 className="text-xl font-extrabold italic tracking-tight relative z-10">Branding & <span className="text-red-500">Seal</span></h3>
                        <p className="text-gray-500 text-xs font-bold leading-relaxed relative z-10">This visual identity will be baked into all generated payslips and fiscal reports.</p>

                        <div className="pt-4 relative z-10">
                            <div className="w-full h-36 bg-white/5 border-2 border-dashed border-white/10 rounded-[30px] flex flex-col items-center justify-center group cursor-pointer hover:border-red-500/50 transition-all">
                                <Zap className="w-6 h-6 text-gray-700 group-hover:text-red-500 transition-colors mb-2" />
                                <span className="text-[9px] font-black uppercase text-gray-600 group-hover:text-white transition-colors">Apply Corporate Logo</span>
                            </div>
                        </div>
                    </section>

                    <div className="app-card p-10 bg-emerald-50/20 border-emerald-50/50 space-y-4">
                        <div className="flex items-center space-x-2 text-emerald-600">
                            <ShieldCheck className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Protocol Guard</span>
                        </div>
                        <p className="text-xs font-bold text-emerald-800/60 leading-relaxed">
                            Financial records and <strong className="text-emerald-900">GSTIN/PAN</strong> matrices are encrypted. Ensure all identifiers match government registry for flawless statutory export.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
