import { useState, useRef, useEffect } from 'react';
import { settingsAPI } from '../services/api';
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
    Check,
    Upload,
    UserCheck,
    Map
} from 'lucide-react';

export const Settings = () => {
    const [profile, setProfile] = useState<any>({
        name: 'Apextime Enterprises',
        legalName: '',
        address: '',
        city: '',
        state: '',
        pincode: '',
        gstin: '',
        pan: '',
        pfCode: '',
        esiCode: '',
        tan: '',
        citAddress: '',
        signatoryName: '',
        signatoryFatherName: '',
        signatoryDesignation: '',
        signatoryPlace: '',
        bankName: '',
        accountNumber: '',
        ifscCode: '',
        logo: null
    });
    const [loading, setLoading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const res = await settingsAPI.get();
            if (res.data) {
                setProfile(prev => ({ ...prev, ...res.data }));
            }
        } catch (error) {
            console.error('Failed to fetch settings', error);
        }
    };

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setProfile({ ...profile, logo: reader.result });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await settingsAPI.update(profile);
            alert('Settings saved successfully.');
        } catch (e) {
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-32">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Company Settings</h1>
                    <p className="text-sm font-bold text-gray-400 mt-1">Manage your company profile and compliance info</p>
                </div>
                <button
                    onClick={handleSave}
                    className="px-8 py-4 bg-blue-600 text-white font-bold text-sm rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:bg-gray-200"
                    disabled={loading}
                >
                    <Save className="w-5 h-5" />
                    <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Side: General Profile & Statutory */}
                <div className="lg:col-span-2 space-y-8">
                    {/* General Details */}
                    <section className="app-card overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                            <Globe className="w-5 h-5 text-blue-600" />
                            <h3 className="text-sm font-bold text-gray-900">Company Details</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Company Name</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-bold text-gray-900" value={profile.name} onChange={(e) => setProfile({ ...profile, name: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Legal Name</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-gray-700" value={profile.legalName} onChange={(e) => setProfile({ ...profile, legalName: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">GSTIN</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-bold text-gray-900 uppercase" value={profile.gstin} onChange={(e) => setProfile({ ...profile, gstin: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Registered Address</label>
                                    <textarea className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none font-medium text-gray-700 h-20 resize-none" value={profile.address} onChange={(e) => setProfile({ ...profile, address: e.target.value })}></textarea>
                                </div>
                                <div className="grid grid-cols-3 col-span-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">City</label>
                                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.city} onChange={(e) => setProfile({ ...profile, city: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">State</label>
                                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.state} onChange={(e) => setProfile({ ...profile, state: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Pincode</label>
                                        <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.pincode} onChange={(e) => setProfile({ ...profile, pincode: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Authorized Signatory Section */}
                    <section className="app-card overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                            <UserCheck className="w-5 h-5 text-indigo-600" />
                            <h3 className="text-sm font-bold text-gray-900">Authorized Signatory (Form 16)</h3>
                        </div>
                        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signatory Name</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.signatoryName} onChange={(e) => setProfile({ ...profile, signatoryName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Father's Name</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.signatoryFatherName} onChange={(e) => setProfile({ ...profile, signatoryFatherName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Designation</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.signatoryDesignation || profile.signatoryPlace} onChange={(e) => setProfile({ ...profile, signatoryDesignation: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Signed At (Place)</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.signatoryPlace} onChange={(e) => setProfile({ ...profile, signatoryPlace: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    {/* Statutory Info */}
                    <section className="app-card overflow-hidden">
                        <div className="p-6 border-b border-gray-50 flex items-center gap-3">
                            <ShieldCheck className="w-5 h-5 text-emerald-600" />
                            <h3 className="text-sm font-bold text-gray-900">Statutory & TDS Info</h3>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PAN Number</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-gray-700 uppercase" value={profile.pan} onChange={(e) => setProfile({ ...profile, pan: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">TAN Number</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-gray-700 uppercase" value={profile.tan} onChange={(e) => setProfile({ ...profile, tan: e.target.value.toUpperCase() })} />
                                </div>
                                <div className="col-span-2 space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">CIT (TDS) Address</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" placeholder="e.g. Income Tax Office, TDS Section, Bangalore" value={profile.citAddress} onChange={(e) => setProfile({ ...profile, citAddress: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">PF Code</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.pfCode} onChange={(e) => setProfile({ ...profile, pfCode: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">ESI Code</label>
                                    <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.esiCode} onChange={(e) => setProfile({ ...profile, esiCode: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Right Side: Banking \u0026 Logo */}
                <div className="space-y-8">
                    <section className="app-card p-8 space-y-6">
                        <div className="flex items-center gap-3">
                            <CreditCard className="w-5 h-5 text-blue-600" />
                            <h3 className="text-sm font-bold text-gray-900">Bank Details</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Bank Name</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700" value={profile.bankName} onChange={(e) => setProfile({ ...profile, bankName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter">Account Number</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-black text-gray-700 tracking-wider" value={profile.accountNumber} onChange={(e) => setProfile({ ...profile, accountNumber: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-tighter">IFSC Code</label>
                                <input type="text" className="w-full px-4 py-3 bg-gray-50 border border-gray-100 rounded-xl font-bold text-gray-700 uppercase" value={profile.ifscCode} onChange={(e) => setProfile({ ...profile, ifscCode: e.target.value })} />
                            </div>
                        </div>
                    </section>

                    <section className="app-card p-8 bg-gray-900 border-none text-white space-y-6 relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-600/30 rounded-full blur-3xl -mr-16 -mt-16"></div>
                        <div className="flex items-center gap-3 relative z-10">
                            <Stamp className="w-6 h-6 text-blue-400" />
                            <h3 className="text-lg font-bold">Company Logo</h3>
                        </div>
                        <p className="text-gray-400 text-xs font-medium relative z-10">Appears on payslips and Form 16.</p>

                        <div className="pt-2 relative z-10">
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoUpload}
                            />
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="w-full h-40 bg-white/5 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center group cursor-pointer hover:border-blue-500/50 hover:bg-white/10 transition-all overflow-hidden relative"
                            >
                                {profile.logo ? (
                                    <img src={profile.logo} alt="Logo" className="w-full h-full object-contain p-4" />
                                ) : (
                                    <>
                                        <Upload className="w-8 h-8 text-gray-600 group-hover:text-blue-400 transition-colors mb-3" />
                                        <span className="text-xs font-bold text-gray-500 group-hover:text-white transition-colors">Click to Upload Logo</span>
                                    </>
                                )}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};
