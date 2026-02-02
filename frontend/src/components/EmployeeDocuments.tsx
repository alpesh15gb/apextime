
import { useState, useEffect } from 'react';
import { Upload, Trash2, FileText, Eye, Loader2, Download } from 'lucide-react';
import { documentsAPI } from '../services/api';
import { EmployeeDocument } from '../types';

interface EmployeeDocumentsProps {
    employeeId: string;
}

const DOCUMENT_TYPES = [
    'Offer letter',
    'Employee personal information form',
    'Identity proofs',
    'Educational certificates',
    'Previous employment records',
    'Company handbook',
    'Appointment letter',
    'PF and ESI forms',
    'Non-disclosure agreement',
    'Other'
];

export const EmployeeDocuments = ({ employeeId }: EmployeeDocumentsProps) => {
    const [documents, setDocuments] = useState<EmployeeDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [selectedType, setSelectedType] = useState(DOCUMENT_TYPES[0]);
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchDocuments();
    }, [employeeId]);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const res = await documentsAPI.list(employeeId);
            setDocuments(res.data);
        } catch (error) {
            console.error('Failed to load documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        try {
            setUploading(true);
            const formData = new FormData();
            formData.append('employeeId', employeeId);
            formData.append('type', selectedType);
            formData.append('file', file);
            // formData.append('name', file.name); // Optional override

            await documentsAPI.upload(formData);
            setFile(null);

            // Reset file input
            const fileInput = document.getElementById('doc-upload') as HTMLInputElement;
            if (fileInput) fileInput.value = '';

            await fetchDocuments();
        } catch (error) {
            console.error('Upload failed:', error);
            alert('Upload failed. Check console.');
        } finally {
            setUploading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Are you sure you want to delete this document?')) return;
        try {
            await documentsAPI.delete(id);
            setDocuments(prev => prev.filter(d => d.id !== id));
        } catch (error) {
            console.error('Delete failed:', error);
        }
    };

    const API_URL = import.meta.env.VITE_APP_API_URL || import.meta.env.REACT_APP_API_URL || '/api';
    const BASE_URL = API_URL === '/api' ? '' : API_URL.replace('/api', ''); // Get base for static files

    return (
        <div className="app-card overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest">Employee Documentation</h3>
            </div>

            <div className="p-10 space-y-8">
                {/* Upload Section */}
                <div className="flex flex-col md:flex-row items-end gap-4 bg-gray-50/50 p-6 rounded-2xl border border-gray-100">
                    <div className="space-y-2 flex-grow">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Document Type</label>
                        <select
                            value={selectedType}
                            onChange={(e) => setSelectedType(e.target.value)}
                            className="w-full px-5 py-3 bg-white border border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-50 outline-none transition-all font-bold text-gray-700 text-xs"
                        >
                            {DOCUMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div className="space-y-2 flex-grow">
                        <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest ml-1">Select File</label>
                        <input
                            id="doc-upload"
                            type="file"
                            onChange={handleFileChange}
                            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                            className="w-full text-xs text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                        />
                    </div>

                    <button
                        onClick={handleUpload}
                        disabled={!file || uploading}
                        className="px-6 py-3 bg-purple-600 text-white font-black text-xs uppercase tracking-widest rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 h-[42px]"
                    >
                        {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload
                    </button>
                </div>

                {/* Documents List */}
                <div className="space-y-4">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-200" />
                        </div>
                    ) : documents.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs py-8">No documents uploaded yet.</p>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {documents.map((doc) => (
                                <div key={doc.id} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-2xl hover:border-purple-100 hover:shadow-sm transition-all group">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600">
                                            <FileText className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-xs font-black text-gray-800">{doc.type}</p>
                                            <p className="text-[10px] text-gray-400 truncate max-w-[150px]">{doc.name}</p>
                                            <p className="text-[9px] text-gray-300 mt-0.5">{new Date(doc.createdAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <a
                                            href={doc.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            title="View/Download"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                        <button
                                            onClick={() => handleDelete(doc.id)}
                                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
