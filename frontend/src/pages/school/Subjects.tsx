import { useEffect, useState } from 'react';
import { BookOpen, Plus, Filter, Search } from 'lucide-react';
import { schoolAPI } from '../../services/api';

interface Subject {
    id: string;
    name: string;
    code: string;
    type: string;
    credits: number;
    course?: {
        name: string;
    };
}

interface Course {
    id: string;
    name: string;
}

export const Subjects = () => {
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState('');
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        code: '',
        type: 'THEORY',
        credits: 0,
        courseId: ''
    });

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        fetchSubjects();
    }, [selectedCourse]);

    const fetchCourses = async () => {
        const res = await schoolAPI.getCourses();
        setCourses(res.data.data);
    };

    const fetchSubjects = async () => {
        try {
            setLoading(true);
            const res = await schoolAPI.getSubjects(selectedCourse || undefined);
            setSubjects(res.data.data);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await schoolAPI.createSubject(formData);
            setShowModal(false);
            setFormData({ name: '', code: '', type: 'THEORY', credits: 0, courseId: '' });
            fetchSubjects();
        } catch (e) {
            alert('Failed to create subject');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <BookOpen className="w-8 h-8 text-blue-600" />
                        Subjects
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage curriculum subjects</p>
                </div>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Add Subject
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-4 items-center">
                <Filter className="text-gray-400 w-5 h-5" />
                <select
                    value={selectedCourse}
                    onChange={e => setSelectedCourse(e.target.value)}
                    className="border-none bg-transparent focus:ring-0 text-gray-700 font-medium cursor-pointer"
                >
                    <option value="">All Classes</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div className="h-6 w-px bg-gray-200 mx-2"></div>
                <div className="relative flex-1">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input type="text" placeholder="Search subjects..." className="w-full pl-8 py-1 bg-transparent border-none focus:ring-0 text-sm" />
                </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {loading ? (
                    <div className="col-span-full py-12 text-center text-gray-500">Loading subjects...</div>
                ) : subjects.length > 0 ? (
                    subjects.map(subject => (
                        <div key={subject.id} className="bg-white p-5 rounded-xl border border-gray-100 hover:shadow-md transition-shadow relative overflow-hidden group">
                            <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                            <div className="flex justify-between items-start mb-2 pl-3">
                                <div>
                                    <h3 className="font-bold text-gray-900 line-clamp-1" title={subject.name}>{subject.name}</h3>
                                    <div className="text-xs text-gray-500 font-mono mt-0.5">{subject.code}</div>
                                </div>
                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${subject.type === 'THEORY' ? 'bg-indigo-50 text-indigo-600' : 'bg-orange-50 text-orange-600'}`}>
                                    {subject.type}
                                </span>
                            </div>
                            <div className="pl-3 mt-4 pt-3 border-t border-gray-50 flex justify-between text-xs text-gray-500">
                                <span>{subject.course?.name || 'All Classes'}</span>
                                <span>{subject.credits} Credits</span>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full py-12 text-center text-gray-400">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <BookOpen className="w-8 h-8 text-gray-300" />
                        </div>
                        No subjects found. Add one to get started.
                    </div>
                )}
            </div>

            {showModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-md p-6">
                        <h3 className="text-xl font-bold mb-4">Add New Subject</h3>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">Subject Name</label>
                                <input required type="text" className="w-full rounded-lg border-gray-300" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Code</label>
                                    <input type="text" className="w-full rounded-lg border-gray-300" value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Credits</label>
                                    <input type="number" className="w-full rounded-lg border-gray-300" value={formData.credits} onChange={e => setFormData({ ...formData, credits: Number(e.target.value) })} />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">Type</label>
                                    <select className="w-full rounded-lg border-gray-300" value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })}>
                                        <option value="THEORY">Theory</option>
                                        <option value="PRACTICAL">Practical</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">Class</label>
                                    <select required className="w-full rounded-lg border-gray-300" value={formData.courseId} onChange={e => setFormData({ ...formData, courseId: e.target.value })}>
                                        <option value="">Select Class</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex justify-end gap-3 mt-6">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 bg-gray-100 rounded-lg text-gray-700">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create Subject</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
