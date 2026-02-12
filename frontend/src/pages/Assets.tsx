import { useState, useEffect } from 'react';
import { assetsAPI, employeesAPI } from '../services/api';
import {
    Package,
    Plus,
    Tag,
    Laptop,
    Smartphone,
    Monitor,
    QrCode,
    Users,
    Wrench,
    Clock,
    CheckCircle2,
    XCircle,
    Search,
    Filter,
    ArrowRight,
    Calendar,
    ChevronRight,
    History,
    MoreVertical,
    Download,
    Shield,
    CreditCard,
    Building2,
    ExternalLink
} from 'lucide-react';

type TabType = 'inventory' | 'requests' | 'maintenance' | 'categories';

export default function Assets() {
    const [activeTab, setActiveTab] = useState<TabType>('inventory');
    const [assets, setAssets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [employees, setEmployees] = useState<any[]>([]);
    const [requests, setRequests] = useState<any[]>([]);
    const [summary, setSummary] = useState({ total: 0, available: 0, assigned: 0, repair: 0, pendingRequests: 0 });
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Modals
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [showAssignModal, setShowAssignModal] = useState(false);
    const [showMaintenanceModal, setShowMaintenanceModal] = useState(false);
    const [selectedAsset, setSelectedAsset] = useState<any>(null);

    // Forms
    const [assetForm, setAssetForm] = useState({
        name: '',
        code: '',
        categoryId: '',
        serialNumber: '',
        brand: '',
        model: '',
        purchaseDate: '',
        purchaseCost: '',
        status: 'AVAILABLE'
    });
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });
    const [assignForm, setAssignForm] = useState({ employeeId: '', remarks: '' });
    const [maintenanceForm, setMaintenanceForm] = useState({
        type: 'SERVICE',
        description: '',
        cost: '',
        startDate: new Date().toISOString().split('T')[0],
        status: 'COMPLETED'
    });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [aRes, cRes, sRes, eRes, rRes] = await Promise.all([
                assetsAPI.getAll(),
                assetsAPI.getCategories(),
                assetsAPI.getSummary(),
                employeesAPI.getAll(),
                assetsAPI.getRequests()
            ]);
            setAssets(aRes.data);
            setCategories(cRes.data);
            setSummary(sRes.data);
            setEmployees(eRes.data);
            setRequests(rRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAsset = async (e: any) => {
        e.preventDefault();
        try {
            await assetsAPI.create({
                ...assetForm,
                purchaseCost: assetForm.purchaseCost ? parseFloat(assetForm.purchaseCost) : undefined,
                purchaseDate: assetForm.purchaseDate ? new Date(assetForm.purchaseDate).toISOString() : undefined
            });
            setShowAssetModal(false);
            setAssetForm({ name: '', code: '', categoryId: '', serialNumber: '', brand: '', model: '', purchaseDate: '', purchaseCost: '', status: 'AVAILABLE' });
            fetchData();
        } catch (e: any) {
            alert('Failed to create asset: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleAssignAsset = async (e: any) => {
        e.preventDefault();
        try {
            await assetsAPI.assign(selectedAsset.id, assignForm);
            setShowAssignModal(false);
            setAssignForm({ employeeId: '', remarks: '' });
            fetchData();
        } catch (e: any) {
            alert('Failed to assign asset: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleReturnAsset = async (assignmentId: string) => {
        if (!confirm('Mark this asset as returned?')) return;
        try {
            await assetsAPI.return(assignmentId, { returnCondition: 'GOOD' });
            fetchData();
        } catch (e: any) {
            alert('Failed to return asset: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleAddMaintenance = async (e: any) => {
        e.preventDefault();
        try {
            await assetsAPI.addMaintenance(selectedAsset.id, {
                ...maintenanceForm,
                cost: parseFloat(maintenanceForm.cost || '0')
            });
            setShowMaintenanceModal(false);
            setMaintenanceForm({ type: 'SERVICE', description: '', cost: '', startDate: new Date().toISOString().split('T')[0], status: 'COMPLETED' });
            fetchData();
        } catch (e: any) {
            alert('Failed to add maintenance log: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleUpdateRequestStatus = async (id: string, status: string) => {
        try {
            await assetsAPI.updateRequestStatus(id, { status });
            fetchData();
        } catch (e: any) {
            alert('Failed to update request: ' + (e.response?.data?.error || e.message));
        }
    };

    const printLabel = (asset: any) => {
        const w = window.open('', '_blank');
        if (w) {
            w.document.write(`
                <html>
                <body style="font-family: sans-serif; text-align: center; padding: 20px;">
                    <div style="border: 2px solid black; padding: 20px; width: 300px; display: inline-block;">
                        <h2 style="margin: 0; font-size: 18px;">${asset.name}</h2>
                        <p style="margin: 5px; font-weight: bold;">${asset.code}</p>
                        <div style="margin: 10px auto; border: 1px solid #eee; padding: 5px; width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: #f9f9f9;">
                            <span style="font-size: 10px; color: #999;">QR CODE<br/>${asset.code}</span>
                        </div>
                        <p style="font-size: 10px;">Property of ${window.location.hostname}</p>
                    </div>
                    <script>window.print();</script>
                </body>
                </html>
            `);
            w.document.close();
        }
    };

    const filteredAssets = assets.filter(a => {
        const matchesSearch = a.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.serialNumber?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'ALL' || a.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const getIcon = (catName: string) => {
        const n = catName?.toLowerCase() || '';
        if (n.includes('laptop')) return <Laptop className="w-5 h-5 text-blue-600" />;
        if (n.includes('mobile') || n.includes('phone')) return <Smartphone className="w-5 h-5 text-purple-600" />;
        if (n.includes('monitor')) return <Monitor className="w-5 h-5 text-indigo-600" />;
        return <Package className="w-5 h-5 text-gray-500" />;
    };

    return (
        <div className="space-y-8 font-sans pb-20">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
                        <div className="p-3 bg-indigo-600 rounded-2xl shadow-lg shadow-indigo-100">
                            <Package className="w-8 h-8 text-white" />
                        </div>
                        Inventory & Assets
                    </h1>
                    <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-widest">Enterprise Lifecycle Management</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="bg-white text-slate-600 border border-slate-200 px-6 py-3 rounded-2xl flex items-center hover:bg-slate-50 transition-all font-black text-xs uppercase tracking-widest shadow-sm"
                    >
                        <Tag className="w-4 h-4 mr-2" /> Categories
                    </button>
                    <button
                        onClick={() => setShowAssetModal(true)}
                        className="bg-indigo-600 text-white px-8 py-3 rounded-2xl flex items-center shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all font-black text-xs uppercase tracking-widest"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Register Asset
                    </button>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                <StatCard label="Total Assets" value={summary.total} icon={Package} color="indigo" />
                <StatCard label="Available" value={summary.available} icon={CheckCircle2} color="emerald" />
                <StatCard label="In Use" value={summary.assigned} icon={Users} color="blue" />
                <StatCard label="In Repair" value={summary.repair} icon={Wrench} color="amber" />
                <StatCard label="Requests" value={summary.pendingRequests} icon={Clock} color="rose" isAlert={summary.pendingRequests > 0} />
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-1 p-1 bg-white border border-slate-100 rounded-2xl w-fit">
                {(['inventory', 'requests', 'maintenance', 'categories'] as TabType[]).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            {activeTab === 'inventory' && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                    {/* Filters */}
                    <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full md:max-w-md">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search by name, code or serial..."
                                className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500/20 text-sm font-medium outline-none"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                            <Filter className="w-4 h-4 text-slate-400" />
                            <select
                                className="bg-slate-50 border-none rounded-2xl px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={statusFilter}
                                onChange={e => setStatusFilter(e.target.value)}
                            >
                                <option value="ALL">All Status</option>
                                <option value="AVAILABLE">Available</option>
                                <option value="ASSIGNED">Assigned</option>
                                <option value="REPAIR">In Repair</option>
                                <option value="RETIRED">Retired</option>
                            </select>
                        </div>
                    </div>

                    {/* Asset Table */}
                    <div className="bg-white border border-slate-100 rounded-[32px] overflow-hidden shadow-sm">
                        <table className="w-full">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-100">
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Asset Detail</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Identifiers</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Status</th>
                                    <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Custodian</th>
                                    <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    <tr><td colSpan={5} className="p-20 text-center animate-pulse text-slate-400 font-bold uppercase tracking-widest">Synchronizing Inventory...</td></tr>
                                ) : filteredAssets.length === 0 ? (
                                    <tr><td colSpan={5} className="p-20 text-center text-slate-400 font-bold">No assets found matching your criteria</td></tr>
                                ) : filteredAssets.map(asset => (
                                    <tr key={asset.id} className="hover:bg-slate-50/50 transition-all group">
                                        <td className="px-8 py-6">
                                            <div className="flex items-center gap-4">
                                                <div className="p-3 bg-slate-50 rounded-2xl group-hover:bg-indigo-50 transition-colors">
                                                    {getIcon(asset.category?.name)}
                                                </div>
                                                <div>
                                                    <p className="font-black text-slate-900 group-hover:text-indigo-600 transition-colors">{asset.name}</p>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase mt-0.5">{asset.category?.name || 'Uncategorized'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <div className="space-y-1">
                                                <p className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded w-fit">{asset.code}</p>
                                                {asset.serialNumber && <p className="text-[10px] font-medium text-slate-400">SN: {asset.serialNumber}</p>}
                                            </div>
                                        </td>
                                        <td className="px-8 py-6">
                                            <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${asset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' :
                                                    asset.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-600' :
                                                        asset.status === 'REPAIR' ? 'bg-amber-50 text-amber-600' : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {asset.status}
                                            </span>
                                        </td>
                                        <td className="px-8 py-6">
                                            {asset.assignments?.length > 0 ? (
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">
                                                        {asset.assignments[0].employee?.firstName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-bold text-slate-900">{asset.assignments[0].employee?.firstName} {asset.assignments[0].employee?.lastName}</p>
                                                        <p className="text-[10px] text-slate-400 font-bold">Since {new Date(asset.assignments[0].assignedDate).toLocaleDateString()}</p>
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">In Warehouse</span>
                                            )}
                                        </td>
                                        <td className="px-8 py-6 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => printLabel(asset)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                                    title="Print Label"
                                                >
                                                    <QrCode className="w-4 h-4" />
                                                </button>
                                                {asset.status === 'AVAILABLE' ? (
                                                    <button
                                                        onClick={() => { setSelectedAsset(asset); setShowAssignModal(true); }}
                                                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-sm"
                                                    >
                                                        Assign
                                                    </button>
                                                ) : asset.status === 'ASSIGNED' ? (
                                                    <button
                                                        onClick={() => handleReturnAsset(asset.assignments[0].id)}
                                                        className="px-4 py-2 bg-white border border-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 transition-all shadow-sm"
                                                    >
                                                        Return
                                                    </button>
                                                ) : null}
                                                <button
                                                    onClick={() => { setSelectedAsset(asset); setShowMaintenanceModal(true); }}
                                                    className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                                                    title="Maintenance"
                                                >
                                                    <Wrench className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Asset Requests View */}
            {activeTab === 'requests' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in slide-in-from-bottom-4 duration-500">
                    {requests.length === 0 ? (
                        <div className="col-span-full py-20 text-center bg-white rounded-[32px] border-2 border-dashed border-slate-100">
                            <Clock className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No pending requests</p>
                        </div>
                    ) : requests.map(req => (
                        <div key={req.id} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-6">
                                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${req.priority === 'URGENT' ? 'bg-rose-50 text-rose-600' :
                                        req.priority === 'HIGH' ? 'bg-amber-50 text-amber-600' : 'bg-slate-50 text-slate-400'
                                    }`}>
                                    {req.priority}
                                </span>
                            </div>
                            <div className="flex items-center gap-4 mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center font-black text-slate-400">
                                    {req.employee?.firstName?.[0]}
                                </div>
                                <div>
                                    <h3 className="font-black text-slate-900">{req.employee?.firstName} {req.employee?.lastName}</h3>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{req.employee?.employeeCode}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-slate-50 p-4 rounded-2xl">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Requested Category</p>
                                    <p className="font-bold text-slate-700">{req.category?.name}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Reason / Notes</p>
                                    <p className="text-sm text-slate-600">{req.description || 'No additional details provided'}</p>
                                </div>
                            </div>
                            <div className="mt-8 pt-6 border-t border-slate-50 flex gap-2">
                                <button
                                    onClick={() => handleUpdateRequestStatus(req.id, 'APPROVED')}
                                    className="flex-1 py-3 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                                >
                                    Approve
                                </button>
                                <button
                                    onClick={() => handleUpdateRequestStatus(req.id, 'REJECTED')}
                                    className="flex-1 py-3 bg-white border border-slate-200 text-slate-400 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:text-rose-600 hover:border-rose-100 hover:bg-rose-50 transition-all"
                                >
                                    Reject
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Asset Modal */}
            {showAssetModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-md p-4 animate-in fade-in duration-300">
                    <form onSubmit={handleCreateAsset} className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="p-10 pb-6 flex justify-between items-center bg-slate-50">
                            <div>
                                <h2 className="text-2xl font-black text-slate-900">Register New Asset</h2>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Add to company warehouse</p>
                            </div>
                            <button type="button" onClick={() => setShowAssetModal(false)} className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100 transition-all">✕</button>
                        </div>
                        <div className="p-10 space-y-8 overflow-y-auto">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Name / Model</label>
                                    <input
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                                        placeholder="e.g. MacBook Pro M3 Max"
                                        value={assetForm.name}
                                        onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Category</label>
                                    <select
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold appearance-none"
                                        value={assetForm.categoryId}
                                        onChange={e => setAssetForm({ ...assetForm, categoryId: e.target.value })}
                                        required
                                    >
                                        <option value="">Select Category</option>
                                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Internal Asset Code</label>
                                    <input
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                                        placeholder="e.g. IT-LAP-042"
                                        value={assetForm.code}
                                        onChange={e => setAssetForm({ ...assetForm, code: e.target.value })}
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Serial Number</label>
                                    <input
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                                        placeholder="Manufacturer Serial"
                                        value={assetForm.serialNumber}
                                        onChange={e => setAssetForm({ ...assetForm, serialNumber: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Purchase Date</label>
                                    <input
                                        type="date"
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold"
                                        value={assetForm.purchaseDate}
                                        onChange={e => setAssetForm({ ...assetForm, purchaseDate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Total Cost (INR)</label>
                                    <input
                                        type="number"
                                        className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold placeholder:text-slate-300"
                                        placeholder="0.00"
                                        value={assetForm.purchaseCost}
                                        onChange={e => setAssetForm({ ...assetForm, purchaseCost: e.target.value })}
                                    />
                                </div>
                            </div>
                        </div>
                        <div className="p-10 pt-4 flex justify-end gap-3 bg-slate-50/50">
                            <button type="button" onClick={() => setShowAssetModal(false)} className="px-8 py-4 text-slate-400 font-black text-xs uppercase tracking-widest transition-all">Cancel</button>
                            <button type="submit" className="px-10 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all">Complete Registration</button>
                        </div>
                    </form>
                </div>
            )}

            {/* Asset Assignment Modal */}
            {showAssignModal && (selectedAsset && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-md p-4">
                    <form onSubmit={handleAssignAsset} className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Assign Asset</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Checkout {selectedAsset.name}</p>
                        </div>
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Target Employee</label>
                                <select
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold appearance-none"
                                    value={assignForm.employeeId}
                                    onChange={e => setAssignForm({ ...assignForm, employeeId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Employee</option>
                                    {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.firstName} {emp.lastName} ({emp.employeeCode})</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Handover Notes</label>
                                <textarea
                                    className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold min-h-[100px]"
                                    placeholder="Enter physical condition, expected return date etc..."
                                    value={assignForm.remarks}
                                    onChange={e => setAssignForm({ ...assignForm, remarks: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowAssignModal(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
                            <button type="submit" className="flex-1 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-slate-100">Confirm Assignment</button>
                        </div>
                    </form>
                </div>
            ))}

            {/* Maintenance Log Modal */}
            {showMaintenanceModal && selectedAsset && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-md p-4">
                    <form onSubmit={handleAddMaintenance} className="bg-white rounded-[40px] w-full max-w-md shadow-2xl p-10 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">Maintenance Record</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Log activity for {selectedAsset.name}</p>
                        </div>
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Activity Type</label>
                                    <select
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        value={maintenanceForm.type}
                                        onChange={e => setMaintenanceForm({ ...maintenanceForm, type: e.target.value })}
                                    >
                                        <option value="SERVICE">Service</option>
                                        <option value="REPAIR">Repair</option>
                                        <option value="UPGRADE">Upgrade</option>
                                        <option value="INSPECTION">Inspection</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cost (INR)</label>
                                    <input
                                        type="number"
                                        className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold"
                                        value={maintenanceForm.cost}
                                        onChange={e => setMaintenanceForm({ ...maintenanceForm, cost: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Activity Description</label>
                                <textarea
                                    className="w-full px-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-bold min-h-[80px]"
                                    required
                                    value={maintenanceForm.description}
                                    onChange={e => setMaintenanceForm({ ...maintenanceForm, description: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowMaintenanceModal(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
                            <button type="submit" className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-amber-100">Save Log</button>
                        </div>
                    </form>
                </div>
            )}

            {showCategoryModal && (
                <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 backdrop-blur-md p-4">
                    <form onSubmit={handleCreateCategory} className="bg-white rounded-[40px] w-full max-w-sm shadow-2xl p-10 space-y-8">
                        <div>
                            <h2 className="text-2xl font-black text-slate-900">New Category</h2>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Group your inventory</p>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Category Name</label>
                            <input
                                className="w-full px-5 py-4 bg-slate-50 border-none rounded-2xl focus:bg-white focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-bold"
                                placeholder="e.g. Mobile Phones, Laptops"
                                value={categoryForm.name}
                                onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                required
                            />
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={() => setShowCategoryModal(false)} className="flex-1 py-4 text-slate-400 font-black text-xs uppercase tracking-widest">Cancel</button>
                            <button type="submit" className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100">Create</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function StatCard({ label, value, icon: Icon, color, isAlert }: any) {
    const colorMap: Record<string, any> = {
        indigo: 'bg-indigo-50 text-indigo-600',
        emerald: 'bg-emerald-50 text-emerald-600',
        blue: 'bg-blue-50 text-blue-600',
        amber: 'bg-amber-50 text-amber-600',
        rose: 'bg-rose-50 text-rose-600',
    };

    return (
        <div className={`bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-all ${isAlert ? 'ring-2 ring-rose-100' : ''}`}>
            <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${colorMap[color]} group-hover:scale-110 transition-transform`}>
                    <Icon className="w-5 h-5" />
                </div>
                {isAlert && <span className="absolute top-4 right-4 w-2 h-2 bg-rose-500 rounded-full animate-ping"></span>}
            </div>
            <p className="text-2xl font-black text-slate-900 leading-none">{value}</p>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">{label}</p>
        </div>
    );
}
