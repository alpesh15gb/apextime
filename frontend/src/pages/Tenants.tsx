import { useState, useEffect } from 'react';
import { tenantsAPI } from '../services/api';
import { Plus, Search, Building2, CheckCircle2, XCircle, MoreVertical, Edit2, Shield, Globe } from 'lucide-react';

export default function Tenants() {
    const [tenants, setTenants] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingTenant, setEditingTenant] = useState<any>(null);
    const [formData, setFormData] = useState({
        name: '',
        slug: '',
        domain: '',
        isActive: true,
        modules: ['employees', 'attendance', 'leaves'], // Defaults
    });

    useEffect(() => {
        fetchTenants();
    }, []);

    const fetchTenants = async () => {
        try {
            const response = await tenantsAPI.getAll();
            setTenants(response.data);
        } catch (error) {
            console.error('Failed to fetch tenants:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingTenant) {
                await tenantsAPI.update(editingTenant.id, formData);
            } else {
                await tenantsAPI.create(formData);
            }
            setShowModal(false);
            setEditingTenant(null);
            setFormData({ name: '', slug: '', domain: '', isActive: true });
            fetchTenants();
        } catch (error) {
            alert('Operation failed');
        }
    };

    const handleEdit = (tenant: any) => {
        setEditingTenant(tenant);
        setFormData({
            name: tenant.name,
            slug: tenant.slug,
            domain: tenant.domain || '',
            isActive: tenant.isActive,
            modules: tenant.modules || [],
        });
        setShowModal(true);
    };

    const handleResetAdmin = async (tenant: any) => {
        if (confirm(`Are you sure you want to reset the admin password for ${tenant.name}? It will be set to 'admin'.`)) {
            try {
                await tenantsAPI.resetPassword(tenant.id, 'admin');
                alert('Admin password reset to "admin" successfully.');
            } catch (error) {
                alert('Failed to reset password.');
            }
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Tenant Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage businesses and platform access</p>
                </div>
                <button
                    onClick={() => {
                        setEditingTenant(null);
                        setFormData({ name: '', slug: '', domain: '', isActive: true });
                        setShowModal(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-blue-700 transition"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Add New Business
                </button>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-4 border-b border-gray-200 bg-gray-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative w-full max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <input
                            type="text"
                            placeholder="Search companies..."
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs font-semibold uppercase tracking-wider">
                                <th className="px-6 py-4">Business Info</th>
                                <th className="px-6 py-4">Slug / Domain</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4">Created At</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">Loading businesses...</td>
                                </tr>
                            ) : tenants.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-12 text-center text-gray-400">No tenants found.</td>
                                </tr>
                            ) : (
                                tenants.map((tenant) => (
                                    <tr key={tenant.id} className="hover:bg-gray-50 transition peer">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center">
                                                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100 mr-3">
                                                    <Building2 className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-semibold text-gray-900">{tenant.name}</p>
                                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">{tenant.id}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800 self-start">
                                                    <Shield className="w-3 h-3 mr-1" /> {tenant.slug}
                                                </span>
                                                {tenant.domain && (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 self-start">
                                                        <Globe className="w-3 h-3 mr-1" /> {tenant.domain}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {tenant.isActive ? (
                                                <span className="inline-flex items-center text-green-600 text-sm font-medium">
                                                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-gray-400 text-sm font-medium">
                                                    <XCircle className="w-4 h-4 mr-1.5" />
                                                    Disabled
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            {new Date(tenant.createdAt).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleResetAdmin(tenant)}
                                                className="p-2 text-gray-400 hover:text-red-600 transition"
                                                title="Reset Admin Password"
                                            >
                                                <Shield className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(tenant)}
                                                className="p-2 text-gray-400 hover:text-blue-600 transition"
                                                title="Edit Tenant"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-6 border-b border-gray-100">
                            <h3 className="text-xl font-bold">{editingTenant ? 'Edit Business' : 'Configure New Business'}</h3>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Name</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Company Code / Slug</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.slug}
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s/g, '-') })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. acme-inc"
                                />
                                <p className="text-[10px] text-gray-400 mt-1">This will be used for logins</p>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Custom Domain (Optional)</label>
                                <input
                                    type="text"
                                    value={formData.domain}
                                    onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                                    placeholder="e.g. hr.acme.com"
                                />
                            </div>
                            <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Business is active</label>
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Enabled Modules</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'attendance', label: 'Attendance' },
                                { id: 'leaves', label: 'Leaves' },
                                { id: 'payroll', label: 'Payroll' },
                                { id: 'reports', label: 'Reports' },
                                { id: 'field_logs', label: 'Field Logs' },
                                { id: 'projects', label: 'Projects' },
                                { id: 'devices', label: 'Biometric Devices' },
                                { id: 'employees', label: 'Employees (Core)' },
                            ].map(module => (
                                <div key={module.id} className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id={`module_${module.id}`}
                                        checked={formData.modules?.includes(module.id)}
                                        onChange={(e) => {
                                            const currentModules = formData.modules || [];
                                            if (e.target.checked) {
                                                setFormData({ ...formData, modules: [...currentModules, module.id] });
                                            } else {
                                                setFormData({ ...formData, modules: currentModules.filter(m => m !== module.id) });
                                            }
                                        }}
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                    />
                                    <label htmlFor={`module_${module.id}`} className="ml-2 text-sm text-gray-600 cursor-pointer select-none">
                                        {module.label}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8">
                        <button
                            type="button"
                            onClick={() => setShowModal(false)}
                            className="px-4 py-2 text-gray-600 hover:bg-gray-50 rounded-lg transition"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
                        >
                            {editingTenant ? 'Save Changes' : 'Initialize Business'}
                        </button>
                    </div>
                </form>
                    </div>
                </div >
            )
}
        </div >
    );
}
