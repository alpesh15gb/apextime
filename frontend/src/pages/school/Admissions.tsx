import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Save, Building2, Bus } from 'lucide-react';
import { schoolAPI } from '../../services/api';

export const Admissions = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [batches, setBatches] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);

    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        admissionNo: '',
        dateOfAdmission: new Date().toISOString().split('T')[0],
        dob: '',
        gender: 'Male',
        batchId: '',
        transportRouteId: '',
        guardian: {
            firstName: '',
            lastName: '',
            phone: '',
            relation: 'Father'
        }
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const [batchesRes, routesRes] = await Promise.all([
                schoolAPI.getAllBatches(),
                schoolAPI.getTransportRoutes()
            ]);
            setBatches(batchesRes.data.data);
            setRoutes(routesRes.data);
        } catch (error) {
            console.error('Failed to load admission data', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.batchId) {
            alert('Please select a Class / Section');
            return;
        }

        try {
            setLoading(true);
            await schoolAPI.admitStudent(formData);
            alert('Student admitted successfully!');
            navigate('/students');
        } catch (error: any) {
            alert(error.response?.data?.message || 'Admission failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 pb-20">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/students')} className="p-2 hover:bg-white rounded-lg transition-colors">
                    <ChevronLeft className="w-5 h-5 text-gray-500" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">New Admission</h1>
                    <p className="text-gray-500 text-sm">Enroll a new student to the institution</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Academic Details */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-blue-600" />
                        Academic Assignment
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Class & Section *</label>
                            <select
                                required
                                value={formData.batchId}
                                onChange={e => setFormData({ ...formData, batchId: e.target.value })}
                                className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            >
                                <option value="">Select Section</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.course?.name} - {b.name} ({b.session?.name})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Admission Number *</label>
                            <input
                                required
                                type="text"
                                placeholder="e.g. ADM/2024/001"
                                value={formData.admissionNo}
                                onChange={e => setFormData({ ...formData, admissionNo: e.target.value })}
                                className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                            />
                        </div>
                    </div>
                </div>

                {/* Personal Details */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">First Name *</label>
                            <input
                                required
                                type="text"
                                value={formData.firstName}
                                onChange={e => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full rounded-xl border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Last Name *</label>
                            <input
                                required
                                type="text"
                                value={formData.lastName}
                                onChange={e => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full rounded-xl border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Date of Birth</label>
                            <input
                                type="date"
                                value={formData.dob}
                                onChange={e => setFormData({ ...formData, dob: e.target.value })}
                                className="w-full rounded-xl border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Gender</label>
                            <select
                                value={formData.gender}
                                onChange={e => setFormData({ ...formData, gender: e.target.value })}
                                className="w-full rounded-xl border-gray-300"
                            >
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Transport & Services */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <Bus className="w-5 h-5 text-blue-600" />
                        Services
                    </h2>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Transport Route (Optional)</label>
                        <select
                            value={formData.transportRouteId}
                            onChange={e => setFormData({ ...formData, transportRouteId: e.target.value })}
                            className="w-full rounded-xl border-gray-300"
                        >
                            <option value="">No Transport</option>
                            {routes.map(r => (
                                <option key={r.id} value={r.id}>{r.name} - {r.vehicleNo}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Guardian Details */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-lg font-bold text-gray-800 mb-4">Guardian Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Guardian Name</label>
                            <input
                                type="text"
                                value={formData.guardian.firstName}
                                onChange={e => setFormData({ ...formData, guardian: { ...formData.guardian, firstName: e.target.value } })}
                                className="w-full rounded-xl border-gray-300"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Phone Number</label>
                            <input
                                type="tel"
                                value={formData.guardian.phone}
                                onChange={e => setFormData({ ...formData, guardian: { ...formData.guardian, phone: e.target.value } })}
                                className="w-full rounded-xl border-gray-300"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6 border-t">
                    <button
                        type="button"
                        onClick={() => navigate('/students')}
                        className="px-6 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 font-medium transition-all"
                    >
                        Discard
                    </button>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-8 py-2.5 text-white bg-blue-600 rounded-xl hover:bg-blue-700 font-bold flex items-center gap-2 disabled:bg-blue-400 shadow-lg shadow-blue-200"
                    >
                        <Save className="w-5 h-5" />
                        {loading ? 'Processing...' : 'Complete Admission'}
                    </button>
                </div>
            </form>
        </div>
    );
};
