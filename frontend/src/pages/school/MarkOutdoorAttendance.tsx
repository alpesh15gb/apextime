import { useState, useEffect } from 'react';
import {
    MapPin,
    Camera,
    Bus,
    User,
    CheckCircle,
    ChevronRight,
    Navigation,
    Clock,
    Search,
    Loader2
} from 'lucide-react';
import { studentFieldLogAPI, schoolAPI } from '../../services/api';

export const MarkOutdoorAttendance = () => {
    const [batches, setBatches] = useState<any[]>([]);
    const [students, setStudents] = useState<any[]>([]);
    const [routes, setRoutes] = useState<any[]>([]);

    const [selectedBatch, setSelectedBatch] = useState('');
    const [selectedStudent, setSelectedStudent] = useState('');
    const [selectedRoute, setSelectedRoute] = useState('');
    const [type, setType] = useState('PICKUP');
    const [remarks, setRemarks] = useState('');
    const [location, setLocation] = useState<any>(null);
    const [image, setImage] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchInitialData();
        captureLocation();
    }, []);

    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [bRes, rRes] = await Promise.all([
                schoolAPI.getBatches(),
                schoolAPI.getTransportRoutes()
            ]);
            setBatches(bRes.data.data);
            setRoutes(rRes.data.data);
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchStudents = async (batchId: string) => {
        try {
            const res = await schoolAPI.getStudents({ batchId });
            setStudents(res.data.data);
        } catch (error) {
            console.error('Failed to fetch students', error);
        }
    };

    const captureLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                setLocation({
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                    address: "Auto-detected GPS Location"
                });
            });
        }
    };

    const handleBatchChange = (id: string) => {
        setSelectedBatch(id);
        setSelectedStudent('');
        fetchStudents(id);
    };

    const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStudent || !type) return alert('Select Student and Type');

        try {
            setSubmitting(true);
            await studentFieldLogAPI.create({
                studentId: selectedStudent,
                type,
                routeId: selectedRoute || null,
                remarks,
                location: JSON.stringify(location),
                image
            });
            alert('Outdoor entry submitted for approval!');
            // Reset
            setSelectedStudent('');
            setImage(null);
            setRemarks('');
        } catch (error) {
            alert('Submission failed');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredStudents = students.filter(s =>
        `${s.firstName} ${s.lastName} ${s.admissionNo}`.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-700 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm">
                        <Navigation className="w-8 h-8" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold">Outdoor Entry</h1>
                        <p className="text-indigo-100 text-sm opacity-90">Mark student pickup, drop, or trip status</p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* 1. Selection Step */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">1</div>
                        <h2 className="font-bold text-gray-800">Student Selection</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Class/Section</label>
                            <select
                                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={selectedBatch}
                                onChange={(e) => handleBatchChange(e.target.value)}
                                required
                            >
                                <option value="">Select Class</option>
                                {batches.map(b => (
                                    <option key={b.id} value={b.id}>{b.course?.name} - {b.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Event Type</label>
                            <select
                                className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={type}
                                onChange={(e) => setType(e.target.value)}
                                required
                            >
                                <option value="PICKUP">Morning Pickup (Bus)</option>
                                <option value="DROP">Evening Drop (Bus)</option>
                                <option value="TRIP_CHECKIN">Trip Check-in</option>
                                <option value="TRIP_CHECKOUT">Trip Check-out</option>
                            </select>
                        </div>
                    </div>

                    {selectedBatch && (
                        <div className="mt-4 animate-in fade-in slide-in-from-top-2">
                            <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Select Student</label>
                            <div className="relative mb-2">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                                <input
                                    type="text"
                                    placeholder="Filter by name or admission no..."
                                    className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                            <div className="max-h-48 overflow-y-auto grid grid-cols-1 gap-2 p-1">
                                {filteredStudents.map(student => (
                                    <div
                                        key={student.id}
                                        onClick={() => setSelectedStudent(student.id)}
                                        className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${selectedStudent === student.id
                                                ? 'border-indigo-600 bg-indigo-50 shadow-sm'
                                                : 'border-transparent bg-gray-50 hover:bg-gray-100'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">
                                                {student.firstName[0]}
                                            </div>
                                            <div>
                                                <div className="font-bold text-sm text-gray-900">{student.firstName} {student.lastName}</div>
                                                <div className="text-[10px] text-gray-500">{student.admissionNo}</div>
                                            </div>
                                        </div>
                                        {selectedStudent === student.id && <CheckCircle className="w-5 h-5 text-indigo-600" />}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* 2. Details Step */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">2</div>
                        <h2 className="font-bold text-gray-800">Entry Details & Evidence</h2>
                    </div>

                    <div className="space-y-4">
                        {(type === 'PICKUP' || type === 'DROP') && (
                            <div>
                                <label className="block text-xs font-bold text-gray-500 mb-1 uppercase tracking-wider">Bus Route</label>
                                <select
                                    className="w-full px-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                                    value={selectedRoute}
                                    onChange={(e) => setSelectedRoute(e.target.value)}
                                >
                                    <option value="">Select Route (Recommended)</option>
                                    {routes.map(r => (
                                        <option key={r.id} value={r.id}>{r.name} - {r.vehicleNo}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Identity Verification</label>
                                {image ? (
                                    <div className="relative rounded-2xl overflow-hidden aspect-video bg-gray-100 border-2 border-indigo-200">
                                        <img src={image} className="w-full h-full object-cover" alt="Verification" />
                                        <button
                                            type="button"
                                            onClick={() => setImage(null)}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1 rounded-full hover:bg-black/70"
                                        >
                                            <XCircle className="w-5 h-5" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative h-24 rounded-2xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center text-gray-400 bg-gray-50 hover:bg-white hover:border-indigo-400 cursor-pointer transition-all">
                                        <input
                                            type="file"
                                            accept="image/*"
                                            capture="environment"
                                            onChange={handlePhoto}
                                            className="absolute inset-0 opacity-0 cursor-pointer"
                                        />
                                        <Camera className="w-8 h-8 opacity-50 mb-1" />
                                        <span className="text-[10px] font-bold">TAP TO SNAP</span>
                                    </div>
                                )}
                            </div>
                            <div className="space-y-2">
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Location Status</label>
                                <div className="bg-gray-50 p-4 rounded-2xl flex items-center gap-3">
                                    <div className="bg-red-100 p-2 rounded-xl">
                                        <MapPin className="w-5 h-5 text-red-600" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] font-bold text-gray-400">GPS ACCURACY</div>
                                        <div className="text-sm font-bold text-gray-700">{location ? 'Live Detection OK' : 'Waiting...'}</div>
                                    </div>
                                </div>
                                <textarea
                                    placeholder="Add any additional remarks (optional)"
                                    className="w-full p-3 bg-gray-50 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 min-h-[60px]"
                                    value={remarks}
                                    onChange={(e) => setRemarks(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <button
                    disabled={submitting || !selectedStudent}
                    className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white rounded-3xl font-bold text-lg shadow-xl shadow-indigo-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <Loader2 className="w-6 h-6 animate-spin" />
                            Processing Entry...
                        </>
                    ) : (
                        <>
                            <CheckCircle className="w-6 h-6" />
                            Submit Outdoor Log
                        </>
                    )}
                </button>
            </form>
        </div>
    );
};

const XCircle = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="12" cy="12" r="10" /><path d="m15 9-6 6" /><path d="m9 9 6 6" /></svg>
);
