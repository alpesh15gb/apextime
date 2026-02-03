import { useState, useEffect } from 'react';
import { Bus, Plus, Search, User, MapPin, Phone } from 'lucide-react';
import { schoolAPI } from '../../services/api';

export const Transport = () => {
    const [routes, setRoutes] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        // Mock data for now until API implemented
        setRoutes([
            { id: '1', name: 'North Route', vehicleNo: 'DL-1PC-1234', driverName: 'Rajesh Kumar', driverPhone: '9876543210', studentsCount: 15 },
            { id: '2', name: 'South Route', vehicleNo: 'DL-1PC-5678', driverName: 'Amit Singh', driverPhone: '8765432109', studentsCount: 22 },
        ]);
        setLoading(false);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Transport Management</h2>
                    <p className="text-gray-500 text-sm">Manage school bus routes and vehicle assignments</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Add Route
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {routes.map((route) => (
                    <div key={route.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                                <Bus className="w-6 h-6" />
                            </div>
                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-lg text-xs font-bold uppercase tracking-wider">
                                Active
                            </span>
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 mb-1">{route.name}</h3>
                        <p className="text-gray-500 text-sm flex items-center gap-1 mb-4">
                            <MapPin className="w-4 h-4" /> {route.vehicleNo}
                        </p>

                        <div className="space-y-2 border-t pt-4">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 flex items-center gap-2"><User className="w-4 h-4" /> Driver</span>
                                <span className="font-semibold text-gray-800">{route.driverName}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500 flex items-center gap-2"><Phone className="w-4 h-4" /> Phone</span>
                                <span className="font-semibold text-gray-800">{route.driverPhone}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-gray-500">Students</span>
                                <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-bold">
                                    {route.studentsCount} Students
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
