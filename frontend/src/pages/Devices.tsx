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

    const handleDelete = async (id: string) => {
        if (confirm('Are you sure you want to retire this device signal?')) {
            await devicesAPI.delete(id);
            fetchDevices();
        }
    };

    const handleRecovery = async (device: any) => {
        const startDate = prompt('Enter Start Date for Recovery (YYYY-MM-DD)', new Date().toISOString().split('T')[0]);
        if (!startDate) return;

        try {
            setRecoveryLoading(device.id);
            await devicesAPI.recoveryLogs(device.id, startDate);
            alert('Command Queued! The machine will start re-pushing logs on its next heartbeat (usually within 30 seconds).');
        } catch (e) {
            alert('Failed to queue recovery command');
        } finally {
            setRecoveryLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
                        <Cpu className="w-8 h-8 text-blue-600" />
                        Biometric Nodes
                    </h1>
                    <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1 italic">Managing hardware interfaces and data ingestion protocols</p>
                </div>
                <button
                    onClick={() => { resetForm(); setShowModal(true); }}
                    className="bg-blue-600 text-white px-5 py-2.5 rounded-2xl flex items-center shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all font-bold text-sm tracking-tight"
                >
                    <Plus className="w-5 h-5 mr-2" />
                    Initialize New Node
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-gray-400 animate-pulse">Scanning for active nodes...</div>
                ) : devices.length === 0 ? (
                    <div className="col-span-full py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-100 text-center space-y-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto">
                            <WifiOff className="w-8 h-8 text-gray-200" />
                        </div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No Biometric Nodes Detected in this Sector</p>
                    </div>
                ) : (
                    devices.map((device) => (
                        <div key={device.id} className="app-card group relative p-8 space-y-6 hover:translate-y-[-4px] transition-all overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50/50 rounded-full blur-3xl -mr-10 -mt-10 group-hover:bg-blue-100 transition-colors"></div>

                            <div className="flex justify-between items-start relative z-10">
                                <div className={`p-4 rounded-2xl ${device.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-400'}`}>
                                    {['ESSL_ADMS', 'HIKVISION_DIRECT'].includes(device.protocol) ? <CloudRain className="w-6 h-6" /> : (device.protocol === 'SQL_MIRROR' || device.protocol === 'SQL_LOGS') ? <Database className="w-6 h-6" /> : <Wifi className="w-6 h-6" />}
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => handleEdit(device)} className="p-2 text-gray-300 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit3 className="w-4 h-4" /></button>
                                    <button onClick={() => handleDelete(device.id)} className="p-2 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"><Trash2 className="w-4 h-4" /></button>
                                    {['ESSL_ADMS', 'MATRIX_DIRECT', 'REALTIME_DIRECT'].includes(device.protocol) && (
                                        <button
                                            onClick={() => handleRecovery(device)}
                                            disabled={recoveryLoading === device.id}
                                            className={`p-2 rounded-xl transition-all ${recoveryLoading === device.id ? 'text-blue-200 animate-spin' : 'text-gray-300 hover:text-blue-600 hover:bg-blue-50'}`}
                                            title="Force Historical Log Recovery"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-xl font-bold text-gray-900 tracking-tighter">{device.name}</h3>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 flex items-center gap-2">
                                    {device.location || 'Unassigned Sector'} • <span className={device.status === 'online' ? 'text-emerald-500' : 'text-gray-300'}>{device.status.toUpperCase()}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-50 relative z-10">
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Protocol</p>
                                    <p className="text-xs font-bold text-gray-700">{device.protocol}</p>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-tighter">Identifier</p>
                                    <p className="text-xs font-bold text-gray-700">{device.serialNumber || device.deviceId}</p>
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-4 relative z-10">
                                <div className="flex items-center gap-1.5">
                                    <Activity className="w-3.5 h-3.5 text-blue-500" />
                                    <span className="text-[9px] font-bold text-gray-500 uppercase">Live Stream</span>
                                </div>
                                <div className="px-3 py-1 bg-gray-100 rounded-lg text-[9px] font-bold text-gray-500 italic">
                                    {device.lastConnected ? new Date(device.lastConnected).toLocaleTimeString() : 'Never Linked'}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-md">
                    <div className="bg-white rounded-[40px] shadow-2xl w-full max-w-xl overflow-hidden border border-white/20 animate-in zoom-in-95 duration-200">
                        <div className="p-10 border-b border-gray-50 bg-gray-50/30">
                            <div className="flex items-center gap-4 mb-2">
                                <div className="p-3 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200">
                                    <Settings className="w-6 h-6" />
                                </div>
                                <h3 className="text-2xl font-bold tracking-tight text-gray-900">{editingDevice ? 'Recalibrate Node' : 'Initialize Hardware Node'}</h3>
                            </div>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest italic ml-14">Configure ingestion parameters for biometric interface</p>
                        </div>

                        <form onSubmit={handleSubmit} className="p-10 space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Friendly Node Name</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="app-input"
                                        placeholder="e.g. Main Lobby ESSL"
                                    />
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Protocol Matrix</label>
                                    <select
                                        value={formData.protocol}
                                        onChange={(e) => setFormData({ ...formData, protocol: e.target.value })}
                                        className="app-input appearance-none"
                                    >
                                        <option value="ESSL_ADMS">1. ESSL Direct Machine (ADMS)</option>
                                        <option value="MATRIX_DIRECT">2. Matrix Direct Machine</option>
                                        <option value="REALTIME_DIRECT">3. Realtime Direct Machine</option>
                                        <option value="HIKVISION_DIRECT">4. Hikvision Direct Machine</option>
                                        <option value="SQL_LOGS">5. SQL LOGS (eTimeTrackLite)</option>
                                        <option value="HIKCENTRAL_SQL">6. HikCentral SQL Server</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Sector / Location</label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="app-input"
                                        placeholder="e.g. Gurugram Branch"
                                    />
                                </div>

                                {['ESSL_ADMS', 'MATRIX_DIRECT', 'REALTIME_DIRECT', 'HIKVISION_DIRECT'].includes(formData.protocol) ? (
                                    <div className="col-span-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block text-blue-600 flex items-center gap-2">
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
                                        <p className="text-[9px] font-bold text-blue-400 mt-2 italic px-1">
                                            {formData.protocol === 'HIKVISION_DIRECT'
                                                ? `Machine must push to: ${window.location.origin}/api/hikvision/event`
                                                : `Node will push to: ${window.location.origin}/api/iclock using this SN`
                                            }
                                        </p>
                                    </div>
                                ) : (
                                    <>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">SQL Host / IP</label>
                                            <input
                                                type="text"
                                                value={formData.ipAddress}
                                                onChange={(e) => setFormData({ ...formData, ipAddress: e.target.value })}
                                                className="app-input"
                                                placeholder="192.168.1.50"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">SQL Port</label>
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
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">SQL Username</label>
                                                    <input
                                                        type="text"
                                                        value={formData.username}
                                                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                                        className="app-input"
                                                        placeholder="sa"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">SQL Password</label>
                                                    <input
                                                        type="password"
                                                        value={formData.password}
                                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                                        className="app-input"
                                                        placeholder="******"
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Database Name</label>
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
                                )}

                                <div className="col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2 block">Hardware ID (Machine Index)</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.deviceId}
                                        onChange={(e) => setFormData({ ...formData, deviceId: e.target.value })}
                                        className="app-input"
                                        placeholder="e.g. 1"
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 mt-10">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-6 py-3 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-gray-600 transition-all"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="px-8 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all font-bold text-[10px] uppercase tracking-widest shadow-xl shadow-blue-100"
                                >
                                    Confirm Configuration
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
