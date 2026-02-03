import { useEffect, useState } from 'react';
import { Calendar, Plus, Check, Star } from 'lucide-react';
import { schoolAPI } from '../../services/api';

interface Session {
    id: string;
    name: string;
    code: string;
    startDate: string;
    endDate: string;
    isCurrent: boolean;
}

export const Sessions = () => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        startDate: '',
        endDate: '',
        isCurrent: false
    });

    useEffect(() => {
        fetchSessions();
    }, []);

    const fetchSessions = async () => {
        try {
            setLoading(true);
            const res = await schoolAPI.getSessions();
            setSessions(res.data.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await schoolAPI.createSession(formData);
            setShowModal(false);
            fetchSessions();
            setFormData({ name: '', code: '', startDate: '', endDate: '', isCurrent: false });
        } catch (error) {
            alert('Failed to create session');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Calendar className="w-8 h-8 text-blue-600" />
                        Academic Sessions
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage academic years and terms</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> New Session
                </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {sessions.map(session => (
                    <div key={session.id} className={`bg-white p-6 rounded-xl border-2 transition-all ${session.isCurrent ? 'border-blue-500 shadow-md ring-2 ring-blue-100' : 'border-transparent shadow-sm'}`}>
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-gray-900">{session.name}</h3>
                                <span className="text-sm text-gray-500">{session.code}</span>
                            </div>
                            {session.isCurrent && (
                                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-current" /> Current
                                </span>
                            )}
                        </div>

                        <div className="space-y-2 text-sm text-gray-600">
                            <div className="flex justify-between border-b border-gray-100 pb-2">
                                <span>Start Date</span>
                                <span className="font-medium text-gray-900">{new Date(session.startDate).toLocaleDateString()}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>End Date</span>
                                <span className="font-medium text-gray-900">{new Date(session.endDate).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl max-w-md w-full p-6">
                        <h2 className="text-xl font-bold mb-4">New Academic Session</h2>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Session Name (e.g. 2025-2026)</label>
                                <input
                                    required
                                    type="text"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full rounded-lg border-gray-300"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Short Code (e.g. 25-26)</label>
                                <input
                                    type="text"
                                    value={formData.code}
                                    onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    className="w-full rounded-lg border-gray-300"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Start Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.startDate}
                                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                                        className="w-full rounded-lg border-gray-300"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">End Date</label>
                                    <input
                                        required
                                        type="date"
                                        value={formData.endDate}
                                        onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                        className="w-full rounded-lg border-gray-300"
                                    />
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="isCurrent"
                                    checked={formData.isCurrent}
                                    onChange={e => setFormData({ ...formData, isCurrent: e.target.checked })}
                                    className="rounded text-blue-600"
                                />
                                <label htmlFor="isCurrent" className="text-sm font-medium">Set as Current Session</label>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Create Session</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
