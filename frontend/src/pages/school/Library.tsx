import { useState, useEffect } from 'react';
import { Book, Plus, Search, Filter, BookOpen, CheckCircle2, AlertCircle } from 'lucide-react';

export const Library = () => {
    const [books, setBooks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Mock data
        setBooks([
            { id: '1', title: 'Fundamentals of Physics', author: 'Halliday', isbn: '978-1118230718', quantity: 10, available: 8, category: 'Science' },
            { id: '2', title: 'Advanced Calculus', author: 'Gerald B. Folland', isbn: '978-0130652652', quantity: 5, available: 0, category: 'Mathematics' },
            { id: '3', title: 'A Tale of Two Cities', author: 'Charles Dickens', isbn: '978-0141439600', quantity: 12, available: 12, category: 'Literature' },
        ]);
        setLoading(false);
    }, []);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Library Management</h2>
                    <p className="text-gray-500 text-sm">Track book inventory and student issues</p>
                </div>
                <div className="flex gap-2">
                    <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-xl flex items-center gap-2 font-medium hover:bg-gray-50 transition-all">
                        <Filter className="w-5 h-5" /> Filters
                    </button>
                    <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center gap-2 font-medium transition-all shadow-sm">
                        <Plus className="w-5 h-5" /> Add Book
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
                        <Book className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Total Titles</p>
                        <h3 className="text-2xl font-bold text-gray-900">{books.length}</h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-green-50 text-green-600 rounded-2xl">
                        <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Available</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {books.reduce((acc, book) => acc + book.available, 0)}
                        </h3>
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4">
                    <div className="p-4 bg-orange-50 text-orange-600 rounded-2xl">
                        <AlertCircle className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 font-medium">Issued</p>
                        <h3 className="text-2xl font-bold text-gray-900">
                            {books.reduce((acc, book) => acc + (book.quantity - book.available), 0)}
                        </h3>
                    </div>
                </div>
            </div>

            {/* Book Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                    <h3 className="font-bold text-gray-800 tracking-tight">Book Catalog</h3>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search by title or author..."
                            className="pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm w-64 focus:ring-2 focus:ring-blue-500 transition-all"
                        />
                    </div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                <th className="px-6 py-4">Title & Author</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">ISBN</th>
                                <th className="px-6 py-4 text-center">In Stock</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {books.map((book) => (
                                <tr key={book.id} className="hover:bg-gray-50 transition-colors cursor-pointer group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-gray-100 text-gray-500 rounded-lg group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                                <BookOpen className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="font-bold text-gray-900 group-hover:text-blue-600">{book.title}</p>
                                                <p className="text-xs text-gray-500">{book.author}</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs font-medium">
                                            {book.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-500">{book.isbn}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className="font-bold text-gray-900">{book.available}</span>
                                        <span className="text-gray-400"> / {book.quantity}</span>
                                    </td>
                                    <td className="px-6 py-4">
                                        {book.available > 0 ? (
                                            <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold uppercase">
                                                Available
                                            </span>
                                        ) : (
                                            <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold uppercase">
                                                Out of Stock
                                            </span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
