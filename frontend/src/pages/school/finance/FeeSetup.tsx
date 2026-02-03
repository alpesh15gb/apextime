import { useEffect, useState } from 'react';
import { DollarSign, Plus, Settings } from 'lucide-react';
import { financeAPI, schoolAPI } from '../../../services/api';

export const FeeSetup = () => {
    const [heads, setHeads] = useState<any[]>([]);
    const [structures, setStructures] = useState<any[]>([]);
    const [courses, setCourses] = useState<any[]>([]);

    // Modals
    const [showHeadModal, setShowHeadModal] = useState(false);
    const [showStructModal, setShowStructModal] = useState(false);
    const [loading, setLoading] = useState(true);

    const [headForm, setHeadForm] = useState({ name: '', type: 'RECURRING', frequency: 'MONTHLY' });
    const [structForm, setStructForm] = useState({ courseId: '', headId: '', amount: 0, dueDateOffset: 10 });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [headsRes, coursesRes, structsRes] = await Promise.all([
                financeAPI.getFeeHeads(),
                schoolAPI.getCourses(),
                financeAPI.getFeeStructures()
            ]);
            setHeads(headsRes.data.data);
            setCourses(coursesRes.data.data);
            setStructures(structsRes.data.data);
        } finally {
            setLoading(false);
        }
    };

    const createHead = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeAPI.createFeeHead(headForm);
            setShowHeadModal(false);
            setHeadForm({ name: '', type: 'RECURRING', frequency: 'MONTHLY' });
            fetchData();
        } catch (e) { alert('Failed'); }
    }

    const createStruct = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await financeAPI.createFeeStructure({ ...structForm, amount: Number(structForm.amount) });
            setShowStructModal(false);
            fetchData();
        } catch (e) { alert('Failed'); }
    }

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold flex items-center gap-2">
                <Settings className="w-8 h-8 text-blue-600" /> Fee Configuration
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Fee Heads Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-gray-800">Fee Heads</h2>
                        <button onClick={() => setShowHeadModal(true)} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100">
                            <Plus className="w-4 h-4" /> Add Head
                        </button>
                    </div>
                    <div className="space-y-2">
                        {heads.map(head => (
                            <div key={head.id} className="p-3 bg-gray-50 rounded-lg flex justify-between items-center text-sm">
                                <span className="font-medium">{head.name}</span>
                                <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">{head.type === 'RECURRING' ? head.frequency : 'ONE TIME'}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Fee Structures Card */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="font-bold text-gray-800">Fee Structures</h2>
                        <button onClick={() => setShowStructModal(true)} className="text-sm bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg flex items-center gap-1 hover:bg-blue-100">
                            <Plus className="w-4 h-4" /> Assign Fee
                        </button>
                    </div>
                    <div className="space-y-2 h-64 overflow-y-auto pr-2">
                        {structures.map(struct => (
                            <div key={struct.id} className="p-3 border border-gray-100 rounded-lg hover:shadow-sm transition-shadow">
                                <div className="flex justify-between font-medium text-gray-900">
                                    <span>{struct.course?.name || 'All Classes'}</span>
                                    <span>₹{struct.amount}</span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1 flex justify-between">
                                    <span>{struct.head?.name}</span>
                                    <span className={struct.head?.type === 'RECURRING' ? 'text-blue-600' : 'text-orange-600'}>
                                        {struct.head?.type === 'RECURRING' ? struct.head?.frequency : 'One Time'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {showHeadModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                        <h3 className="font-bold mb-4">Add Fee Head</h3>
                        <form onSubmit={createHead} className="space-y-3">
                            <input required placeholder="Name (e.g. Tuition Fee)" className="w-full rounded-lg border-gray-300"
                                value={headForm.name} onChange={e => setHeadForm({ ...headForm, name: e.target.value })} />
                            <select className="w-full rounded-lg border-gray-300"
                                value={headForm.type} onChange={e => setHeadForm({ ...headForm, type: e.target.value })}>
                                <option value="RECURRING">Recurring</option>
                                <option value="ONE_TIME">One Time</option>
                            </select>
                            {headForm.type === 'RECURRING' && (
                                <select className="w-full rounded-lg border-gray-300"
                                    value={headForm.frequency} onChange={e => setHeadForm({ ...headForm, frequency: e.target.value })}>
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="QUARTERLY">Quarterly</option>
                                    <option value="ANNUALLY">Annually</option>
                                </select>
                            )}
                            <button className="w-full bg-blue-600 text-white py-2 rounded-lg mt-2">Save</button>
                            <button type="button" onClick={() => setShowHeadModal(false)} className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg">Cancel</button>
                        </form>
                    </div>
                </div>
            )}

            {showStructModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white p-6 rounded-xl w-full max-w-sm">
                        <h3 className="font-bold mb-4">Assign Fee to Class</h3>
                        <form onSubmit={createStruct} className="space-y-3">
                            <select required className="w-full rounded-lg border-gray-300"
                                value={structForm.courseId} onChange={e => setStructForm({ ...structForm, courseId: e.target.value })}>
                                <option value="">Select Class</option>
                                {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                            <select required className="w-full rounded-lg border-gray-300"
                                value={structForm.headId} onChange={e => setStructForm({ ...structForm, headId: e.target.value })}>
                                <option value="">Select Fee Head</option>
                                {heads.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                            </select>
                            <input required type="number" placeholder="Amount" className="w-full rounded-lg border-gray-300"
                                value={structForm.amount} onChange={e => setStructForm({ ...structForm, amount: Number(e.target.value) })} />
                            <button className="w-full bg-blue-600 text-white py-2 rounded-lg mt-2">Save Assignment</button>
                            <button type="button" onClick={() => setShowStructModal(false)} className="w-full bg-gray-100 text-gray-600 py-2 rounded-lg">Cancel</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
