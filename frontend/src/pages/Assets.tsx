import { useState, useEffect } from 'react';
import { assetsAPI } from '../services/api';
import {
    Package,
    Plus,
    Tag,
    Laptop,
    Smartphone,
    Monitor,
    QrCode

} from 'lucide-react';

export default function Assets() {
    const [assets, setAssets] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAssetModal, setShowAssetModal] = useState(false);
    const [showCategoryModal, setShowCategoryModal] = useState(false);

    const [assetForm, setAssetForm] = useState({ name: '', code: '', categoryId: '', status: 'AVAILABLE' });
    const [categoryForm, setCategoryForm] = useState({ name: '', description: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [aRes, cRes] = await Promise.all([
                assetsAPI.getAll(),
                assetsAPI.getCategories()
            ]);
            setAssets(aRes.data);
            setCategories(cRes.data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateAsset = async (e: any) => {
        e.preventDefault();
        try {
            await assetsAPI.create(assetForm);
            setShowAssetModal(false);
            setAssetForm({ name: '', code: '', categoryId: '', status: 'AVAILABLE' });
            fetchData();
        } catch (e: any) {
            alert('Failed to create asset: ' + (e.response?.data?.error || e.message));
        }
    };

    const handleCreateCategory = async (e: any) => {
        e.preventDefault();
        try {
            await assetsAPI.createCategory(categoryForm);
            setShowCategoryModal(false);
            setCategoryForm({ name: '', description: '' });
            fetchData();
        } catch (e: any) {
            alert('Failed to create category: ' + (e.response?.data?.error || e.message));
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
                        <div style="background: repeating-linear-gradient(90deg, black 0, black 2px, white 2px, white 4px); height: 40px; width: 80%; margin: 10px auto;"></div>
                        <p style="font-size: 10px;">Property of ${window.location.hostname}</p>
                    </div>
                    <script>window.print();</script>
                </body>
                </html>
            `);
            w.document.close();
        }
    };

    const getIcon = (catName: string) => {
        const n = catName?.toLowerCase() || '';
        if (n.includes('laptop')) return <Laptop className="w-5 h-5" />;
        if (n.includes('mobile') || n.includes('phone')) return <Smartphone className="w-5 h-5" />;
        if (n.includes('monitor')) return <Monitor className="w-5 h-5" />;
        return <Package className="w-5 h-5" />;
    };

    return (
        <div className="space-y-6 font-sans">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Package className="w-8 h-8 text-indigo-600" />
                        Asset Management
                    </h1>
                    <p className="text-gray-400 text-xs font-bold mt-1">Track company inventory and assignments</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowCategoryModal(true)}
                        className="bg-white text-gray-600 border border-gray-200 px-4 py-2 rounded-xl flex items-center hover:bg-gray-50 transition-all font-bold text-sm"
                    >
                        <Tag className="w-4 h-4 mr-2" /> Categories
                    </button>
                    <button
                        onClick={() => setShowAssetModal(true)}
                        className="bg-indigo-600 text-white px-5 py-2 rounded-xl flex items-center shadow-sm hover:bg-indigo-700 transition-all font-bold text-sm"
                    >
                        <Plus className="w-5 h-5 mr-2" /> Add Asset
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-10 text-gray-400">Loading inventory...</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {assets.length === 0 && (
                        <div className="col-span-full py-20 text-center bg-white rounded-3xl border border-dashed border-gray-200">
                            <Package className="w-12 h-12 text-gray-200 mx-auto mb-4" />
                            <p className="text-gray-400 font-medium">No assets tracked yet.</p>
                        </div>
                    )}
                    {assets.map(asset => (
                        <div key={asset.id} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm relative group hover:border-indigo-100 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-50 rounded-xl text-gray-500 group-hover:bg-indigo-50 group-hover:text-indigo-600 transition-colors">
                                    {getIcon(asset.category?.name)}
                                </div>
                                <span className={`px-2 py-1 rounded-lg text-xs font-bold ${asset.status === 'AVAILABLE' ? 'bg-emerald-50 text-emerald-600' :
                                    asset.status === 'ASSIGNED' ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'
                                    }`}>
                                    {asset.status}
                                </span>
                            </div>

                            <h3 className="font-bold text-gray-900">{asset.name}</h3>
                            <p className="text-xs text-gray-400 font-medium mb-4 uppercase tracking-wider">{asset.code}</p>

                            {asset.assignments && asset.assignments.length > 0 ? (
                                <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-50">
                                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 select-none">
                                        {asset.assignments[0].employee?.firstName?.[0] || 'U'}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-gray-700">{asset.assignments[0].employee?.firstName} {asset.assignments[0].employee?.lastName}</p>
                                        <p className="text-[10px] text-gray-400">Since {new Date(asset.assignments[0].assignedDate).toLocaleDateString()}</p>
                                    </div>
                                    <button onClick={() => printLabel(asset)} className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-indigo-600 transition-colors">
                                        <QrCode className="w-3 h-3" />
                                    </button>
                                </div>
                            ) : (
                                <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center text-xs text-gray-400">
                                    <span className="italic">Ideally stored in Inventory</span>
                                    <button onClick={() => printLabel(asset)} className="flex items-center gap-1 hover:text-indigo-600 transition-colors">
                                        <QrCode className="w-3 h-3" /> Print Tag
                                    </button>
                                </div>

                            )}
                        </div>
                    ))}
                </div>
            )}

            {showCategoryModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <form onSubmit={handleCreateCategory} className="bg-white p-8 rounded-[32px] w-96 space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">New Category</h2>
                            <button type="button" onClick={() => setShowCategoryModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Category Name</label>
                                <input
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium"
                                    placeholder="e.g. Laptops"
                                    value={categoryForm.name}
                                    onChange={e => setCategoryForm({ ...categoryForm, name: e.target.value })}
                                    required
                                />
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowCategoryModal(false)} className="px-5 py-2.5 text-gray-500 font-bold text-xs uppercase tracking-wide">Cancel</button>
                            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Create</button>
                        </div>
                    </form>
                </div>
            )}

            {showAssetModal && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm animate-in fade-in duration-200">
                    <form onSubmit={handleCreateAsset} className="bg-white p-8 rounded-[32px] w-full max-w-md space-y-6 shadow-2xl">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-bold text-gray-900">New Asset</h2>
                            <button type="button" onClick={() => setShowAssetModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Asset Name / Model</label>
                                <input
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium"
                                    placeholder="e.g. MacBook Pro M3"
                                    value={assetForm.name}
                                    onChange={e => setAssetForm({ ...assetForm, name: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Unique Code / Serial</label>
                                <input
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium"
                                    placeholder="e.g. IT-2024-001"
                                    value={assetForm.code}
                                    onChange={e => setAssetForm({ ...assetForm, code: e.target.value })}
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2">Category</label>
                                <select
                                    className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium appearance-none"
                                    value={assetForm.categoryId}
                                    onChange={e => setAssetForm({ ...assetForm, categoryId: e.target.value })}
                                    required
                                >
                                    <option value="">Select Category</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button type="button" onClick={() => setShowAssetModal(false)} className="px-5 py-2.5 text-gray-500 font-bold text-xs uppercase tracking-wide">Cancel</button>
                            <button type="submit" className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs uppercase tracking-wide shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all">Create Asset</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}
