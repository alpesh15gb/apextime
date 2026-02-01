import { useState, useEffect } from 'react';
import { devicesAPI } from '../services/api';
import {
    Cpu,
    Plus,
    Search,
    Settings,
    Wifi,
    WifiOff,
    Trash2,
    Activity,
    Edit3,
    Database,
    CloudRain,
    ShieldCheck,
    RefreshCw,
    Hash,
    RotateCcw
} from 'lucide-react';

export default function Devices() {
    const [devices, setDevices] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingDevice, setEditingDevice] = useState<any>(null);

    const [formData, setFormData] = useState({
        name: '',
        deviceId: '',
        serialNumber: '',
        protocol: 'ESSL_ADMS',
        ipAddress: '',
        port: 4370,
        location: '',
        username: '',
        password: '',
        databaseName: '',
    });

    const [recoveryLoading, setRecoveryLoading] = useState<string | null>(null);

    useEffect(() => {
        fetchDevices();
    }, []);

    const fetchDevices = async () => {
        try {
            const response = await devicesAPI.getAll();
            setDevices(response.data);
        } catch (error) {
            console.error('Failed to fetch devices:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingDevice) {
                await devicesAPI.update(editingDevice.id, formData);
            } else {
                await devicesAPI.create(formData);
            }
            setShowModal(false);
            resetForm();
            fetchDevices();
        } catch (error: any) {
            console.error('Operation failed:', error);
            alert(error.response?.data?.error || error.message || 'Operation failed');
        }
    };

    const resetForm = () => {
        setEditingDevice(null);
        setFormData({
            name: '',
            deviceId: '',
            serialNumber: '',
            protocol: 'ESSL_ADMS',
            ipAddress: '',
            port: 4370,
            location: '',
            username: '',
            password: '',
            databaseName: '',
        });
    };

    const handleEdit = (device: any) => {
        setEditingDevice(device);

        // ADMS protocols store Serial Number in the deviceId field
        const isSerialProtocol = ['ESSL_ADMS', 'MATRIX_DIRECT', 'REALTIME_DIRECT', 'HIKVISION_DIRECT'].includes(device.protocol);

        setFormData({
            name: device.name || '',
            deviceId: device.deviceId || '',
            // If it's a serial-based protocol, the deviceId IS the serial number
            serialNumber: device.serialNumber || (isSerialProtocol ? device.deviceId : ''),
            protocol: device.protocol || 'ESSL_ADMS',
            ipAddress: device.ipAddress || '',
            port: device.port || 4370,
            location: device.location || '',
            username: device.username || '',
            password: device.password || '',
            databaseName: device.config ? (JSON.parse(device.config).databaseName || '') : '',
        });
        setShowModal(true);
    };

    // ... (handleDelete and handleRecovery remain same) ...

    {/* Inside the Form Render */ }
    {
        ['ESSL_ADMS', 'MATRIX_DIRECT', 'REALTIME_DIRECT', 'HIKVISION_DIRECT'].includes(formData.protocol) ? (
            <div className="col-span-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block text-blue-600 flex items-center gap-2">
                    <Hash className="w-3 h-3" /> Machine Serial Number (REQUIRED)
                </label>
                <input
                    type="text"
                    required
                    value={formData.serialNumber}
                    onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                    className="app-input border-blue-100 focus:border-blue-500"
                    placeholder="e.g. BZ8G202160012"
                />
                <p className="text-[9px] font-bold text-blue-400 mt-2 italic px-1">Node will push to: http://82.112.236.81/api/iclock using this SN</p>
            </div>
        ) : (
        <>
            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">SQL Host / IP</label>
                <input
                    type="text"
                    value={formData.ipAddress}
                    onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                    className="app-input"
                    placeholder="192.168.1.50"
                />
            </div>
            <div>
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">SQL Port</label>
                <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) })}
                    className="app-input"
                    placeholder="1433"
                />
            </div>
            {(formData.protocol === 'SQL_LOGS' || formData.protocol === 'SQL_MIRROR') && (
                <>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">SQL Username</label>
                        <input
                            type="text"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            className="app-input"
                            placeholder="sa"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">SQL Password</label>
                        <input
                            type="password"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            className="app-input"
                            placeholder="******"
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Database Name</label>
                        <input
                            type="text"
                            value={formData.databaseName}
                            onChange={(e) => setFormData({ ...formData, databaseName: e.target.value })}
                            className="app-input"
                            placeholder="eTimeTrackLite1"
                        />
                    </div>
                </>
            )}
        </>
    )
    }

    <div className="col-span-2">
        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 block">Hardware ID (Machine Index)</label>
        <input
            type="text"
            required
            value={formData.deviceId}
            onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
            className="app-input"
            placeholder="e.g. 1"
        />
    </div>
                            </div >

        <div className="flex justify-end gap-4 mt-10">
            <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-6 py-3 text-gray-400 font-black text-[10px] uppercase tracking-widest hover:text-gray-600 transition-all"
            >
                Terminate
            </button>
            <button
                type="submit"
                className="px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100"
            >
                Confirm Configuration
            </button>
        </div>
                        </form >
                    </div >
                </div >
            )
}
        </div >
    );
}
