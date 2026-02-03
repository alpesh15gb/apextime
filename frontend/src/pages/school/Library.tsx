import { useState, useEffect } from 'react';
import { Library as LibraryIcon, Plus, Search, Book, User, Hash, X } from 'lucide-react';
import { schoolAPI } from '../../services/api';

export const Library = () => {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        title: '',
        author: '',
        isbn: '',
        category: '',
        quantity: 1
    });

    useEffect(() => {
        fetchBooks();
    }, []);

    const fetchBooks = async () => {
        try {
            setLoading(true);
            const res = await schoolAPI.getLibraryBooks();
            setBooks(res.data);
        } catch (error) {
            console.error('Failed to fetch books', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await schoolAPI.createLibraryBook({
                ...formData,
                available: formData.quantity
            });
            setIsModalOpen(false);
            setFormData({ title: '', author: '', isbn: '', category: '', quantity: 1 });
            fetchBooks();
        } catch (error) {
            alert('Failed to add book');
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <LibraryIcon className="w-8 h-8 text-blue-600" />
                        Library Management
                    </h2>
                    <p className="text-gray-500 text-sm">Manage book catalog and inventory</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-sm"
                >
                    <Plus className="w-5 h-5" /> Add Book
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 mb-6">
                <Search className="w-5 h-5 text-gray-400 ml-2" />
                <input
                    type="text"
                    placeholder="Search by title, author, or ISBN..."
                    className="flex-1 bg-transparent border-none focus:ring-0 text-gray-700 font-medium"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {loading ? (
                    <div className="col-span-full py-20 text-center text-gray-500">Loading catalog...</div>
                ) : books.length > 0 ? books.map((book) => (
                    <div key={book.id} className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow relative group">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500"></div>
                        <div className="flex items-start justify-between mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Book className="w-6 h-6" />
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${book.available > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {book.available > 0 ? 'Available' : 'Issued'}
                            </span>
                        </div>
                        <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors line-clamp-2 min-h-[3rem] text-sm">{book.title}</h3>
                        <p className="text-xs text-gray-500 flex items-center gap-2 mt-2">
                            <User className="w-3 h-3" /> {book.author || 'Unknown Author'}
                        </p>
                        <p className="text-[10px] text-gray-400 flex items-center gap-2 mt-1">
                            <Hash className="w-3 h-3" /> {book.isbn || 'No ISBN'}
                        </p>

                        <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
                            <div className="text-[10px]">
                                <span className="text-gray-400">Sec: </span>
                                <span className="font-semibold text-gray-700">{book.category || 'General'}</span>
                            </div>
                            <div className="text-[10px] font-bold text-blue-600">
                                {book.available}/{book.quantity}
                            </div>
                        </div>
                    </div>
                )) : (
                    <div className="col-span-full py-20 text-center bg-white rounded-2xl border-2 border-dashed border-gray-200">
                        <LibraryIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                        <p className="text-gray-500">Your library catalog is empty.</p>
                    </div>
                )}
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Catalogue New Book</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Book Title</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all font-medium"
                                    value={formData.title}
                                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Author</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.author}
                                        onChange={e => setFormData({ ...formData, author: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                    <input
                                        type="text"
                                        placeholder="e.g. Science"
                                        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.category}
                                        onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ISBN</label>
                                    <input
                                        type="text"
                                        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.isbn}
                                        onChange={e => setFormData({ ...formData, isbn: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-full rounded-xl border-gray-300 focus:ring-2 focus:ring-blue-500 transition-all"
                                        value={formData.quantity}
                                        onChange={e => setFormData({ ...formData, quantity: Number(e.target.value) })}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-all">Cancel</button>
                                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Add to Catalog</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
