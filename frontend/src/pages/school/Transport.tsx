import { useState, useEffect } from 'react';
import { Bus, Plus, Search, User, MapPin, Phone, X } from 'lucide-react';
import { schoolAPI } from '../../services/api';

export const Transport = () => {
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        vehicleNo: '',
        driverName: '',
        driverPhone: ''
    });

    useEffect(() => {
        fetchRoutes();
    }, []);

    const fetchRoutes = async () => {
        try {
            setLoading(true);
            const res = await schoolAPI.getTransportRoutes();
            setRoutes(res.data);
        } catch (error) {
            console.error('Failed to fetch routes', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await schoolAPI.createTransportRoute(formData);
            setIsModalOpen(false);
            setFormData({ name: '', vehicleNo: '', driverName: '', driverPhone: '' });
            fetchRoutes();
        } catch (error) {
            alert('Failed to create route');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Bus className="w-8 h-8 text-blue-600" />
                        Transport Management
                    </h2>
                    <p className="text-gray-500 text-sm">Manage school bus routes and vehicle assignments</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Add Route
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-gray-500">Loading routes...</div>
                ) : routes.length > 0 ? routes.map((route) => (
                    <div key={route.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Bus className="w-6 h-6" />
                            </div>
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">
                                Active
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{route.name}</h3>
                        <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                            <MapPin className="w-4 h-4" /> {route.vehicleNo || 'No vehicle assigned'}
                        </p>

                        <div className="space-y-2 border-t border-gray-50 pt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 flex items-center gap-2"><User className="w-4 h-4" /> Driver</span>
                                <span className="font-semibold text-gray-800">{route.driverName || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</span>
                                <span className="font-semibold text-gray-800">{route.driverPhone || 'N/A'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm border-t border-gray-50 pt-2 mt-2">
                                <span className="text-gray-500">Assigned Students</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {route._count?.students || 0} Students
                                </span>
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <Bus className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">No transport routes found. Click "Add Route" to begin.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Add New Route</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Route Name</label>
                                <input
                                    required
                                    type="text"
                                    placeholder="e.g., North Star Expressway"
                                    className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Vehicle Number</label>
                                <input
                                    type="text"
                                    placeholder="e.g., DL-1PC-1234"
                                    className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                    value={formData.vehicleNo}
                                    onChange={e => setFormData({ ...formData, vehicleNo: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Name</label>
                                    <input
                                        type="text"
                                        placeholder="Name"
                                        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        value={formData.driverName}
                                        onChange={e => setFormData({ ...formData, driverName: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Driver Phone</label>
                                    <input
                                        type="text"
                                        placeholder="Phone"
                                        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                                        value={formData.driverPhone}
                                        onChange={e => setFormData({ ...formData, driverPhone: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all shadow-md shadow-blue-200"
                                >
                                    Create Route
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
