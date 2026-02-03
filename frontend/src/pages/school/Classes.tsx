import { useEffect, useState } from 'react';
import { Building2, Plus, Users, ChevronRight } from 'lucide-react';
import { schoolAPI } from '../../services/api';

interface Course {
    id: string;
    name: string;
    code: string;
    _count?: {
        batches: number;
        subjects: number;
    };
}

interface Batch {
    id: string;
    name: string;
    capacity: number;
    _count?: {
        students: number;
    };
}

export const Classes = () => {
    const [courses, setCourses] = useState<Course[]>([]);
    const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
    const [batches, setBatches] = useState<Batch[]>([]);

    // Modals
    const [showCourseModal, setShowCourseModal] = useState(false);
    const [showBatchModal, setShowBatchModal] = useState(false);

    const [courseForm, setCourseForm] = useState({ name: '', code: '', description: '' });
    const [batchForm, setBatchForm] = useState({ name: '', capacity: 40 });

    useEffect(() => {
        fetchCourses();
    }, []);

    useEffect(() => {
        if (selectedCourse) {
            fetchBatches(selectedCourse.id);
        } else {
            setBatches([]);
        }
    }, [selectedCourse]);

    const fetchCourses = async () => {
        const res = await schoolAPI.getCourses();
        setCourses(res.data.data);
        if (res.data.data.length > 0 && !selectedCourse) {
            setSelectedCourse(res.data.data[0]);
        }
    };

    const fetchBatches = async (courseId: string) => {
        const res = await schoolAPI.getBatches(courseId);
        setBatches(res.data.data);
    };

    const handleCreateCourse = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await schoolAPI.createCourse(courseForm);
            setShowCourseModal(false);
            setCourseForm({ name: '', code: '', description: '' });
            fetchCourses();
        } catch (e) { alert('Error creating class'); }
    };

    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedCourse) return;
        try {
            await schoolAPI.createBatch({ ...batchForm, courseId: selectedCourse.id });
            setShowBatchModal(false);
            setBatchForm({ name: '', capacity: 40 });
            fetchBatches(selectedCourse.id);
        } catch (e) { alert('Error creating section'); }
    };

    return (
        <div className="h-[calc(100vh-6rem)] flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Building2 className="w-8 h-8 text-blue-600" />
                        Classes & Sections
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Manage classes (courses) and sections (batches)</p>
                </div>
            </div>

            <div className="flex-1 flex gap-6 overflow-hidden">
                {/* Left: Courses List */}
                <div className="w-1/3 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <h2 className="font-bold text-gray-700">Classes</h2>
                        <button onClick={() => setShowCourseModal(true)} className="p-1.5 hover:bg-gray-200 rounded-lg text-blue-600">
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2 space-y-2">
                        {courses.map(course => (
                            <div
                                key={course.id}
                                onClick={() => setSelectedCourse(course)}
                                className={`p-4 rounded-lg cursor-pointer transition-all flex items-center justify-between group ${selectedCourse?.id === course.id ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'hover:bg-gray-50 border border-transparent'
                                    }`}
                            >
                                <div>
                                    <div className="font-semibold text-gray-900">{course.name}</div>
                                    <div className="text-xs text-gray-500 flex gap-2">
                                        <span>Code: {course.code}</span>
                                        <span>•</span>
                                        <span>{course._count?.batches || 0} Sections</span>
                                    </div>
                                </div>
                                <ChevronRight className={`w-4 h-4 text-gray-400 ${selectedCourse?.id === course.id ? 'text-blue-600' : 'opacity-0 group-hover:opacity-100'}`} />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Right: Batches List */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                        <h2 className="font-bold text-gray-700">
                            Sections <span className="text-gray-400 font-normal">for {selectedCourse?.name || '...'}</span>
                        </h2>
                        <button
                            onClick={() => setShowBatchModal(true)}
                            disabled={!selectedCourse}
                            className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm flex items-center gap-2 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                        >
                            <Plus className="w-4 h-4" /> Add Section
                        </button>
                    </div>

                    <div className="p-6 grid gap-4 grid-cols-2 lg:grid-cols-3">
                        {batches.length > 0 ? batches.map(batch => (
                            <div key={batch.id} className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="font-bold text-lg">{batch.name}</div>
                                    <div className="bg-green-100 text-green-700 text-xs px-2 py-1 rounded-full">{batch._count?.students || 0} Students</div>
                                </div>
                                <div className="text-sm text-gray-500 flex items-center gap-1">
                                    <Users className="w-3 h-3" /> Capacity: {batch.capacity}
                                </div>
                            </div>
                        )) : (
                            <div className="col-span-full h-64 flex flex-col items-center justify-center text-gray-400">
                                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                                    <Building2 className="w-6 h-6 text-gray-300" />
                                </div>
                                <p>No sections found for this class</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Course Modal */}
            {showCourseModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold mb-4">Add Class</h3>
                        <form onSubmit={handleCreateCourse} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Class Name (e.g. Class 10)</label>
                                <input required type="text" className="w-full rounded-lg border-gray-300" value={courseForm.name} onChange={e => setCourseForm({ ...courseForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Code (e.g. X)</label>
                                <input type="text" className="w-full rounded-lg border-gray-300" value={courseForm.code} onChange={e => setCourseForm({ ...courseForm, code: e.target.value })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowCourseModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Batch Modal */}
            {showBatchModal && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl w-full max-w-sm p-6">
                        <h3 className="text-lg font-bold mb-4">Add Section</h3>
                        <form onSubmit={handleCreateBatch} className="space-y-4">
                            <div>
                                <label className="text-sm font-medium">Section Name (e.g. A)</label>
                                <input required type="text" className="w-full rounded-lg border-gray-300" value={batchForm.name} onChange={e => setBatchForm({ ...batchForm, name: e.target.value })} />
                            </div>
                            <div>
                                <label className="text-sm font-medium">Capacity</label>
                                <input type="number" className="w-full rounded-lg border-gray-300" value={batchForm.capacity} onChange={e => setBatchForm({ ...batchForm, capacity: Number(e.target.value) })} />
                            </div>
                            <div className="flex justify-end gap-2 mt-4">
                                <button type="button" onClick={() => setShowBatchModal(false)} className="px-4 py-2 text-gray-600 bg-gray-100 rounded-lg">Cancel</button>
                                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">Create</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
};
