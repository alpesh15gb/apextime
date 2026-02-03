import React, { useState, useEffect } from 'react';
import { AlertTriangle, Download, Filter, Phone, Clock } from 'lucide-react';
import axios from 'axios';

/**
 * Exception Report Component
 * Shows late arrivals, early departures, and absences
 */
const ExceptionReport = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [exceptionType, setExceptionType] = useState('all');
    const [exceptions, setExceptions] = useState([]);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchExceptions = async () => {
        if (!startDate || !endDate) {
            setError('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await axios.get('/api/attendance/exceptions', {
                params: {
                    startDate,
                    endDate,
                    type: exceptionType
                }
            });

            setExceptions(response.data.data);
            setSummary(response.data.summary);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to fetch exceptions');
        } finally {
            setLoading(false);
        }
    };

    const exportToExcel = () => {
        const url = `/api/attendance/export/exceptions?startDate=${startDate}&endDate=${endDate}&type=${exceptionType}`;
        window.open(url, '_blank');
    };

    const getExceptionBadgeColor = (types) => {
        if (types.includes('Absent')) return 'bg-red-100 text-red-800 border-red-300';
        if (types.includes('Late')) return 'bg-orange-100 text-orange-800 border-orange-300';
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    };

    const formatTime = (datetime) => {
        if (!datetime) return '-';
        return new Date(datetime).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-lg shadow-md p-6">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="w-6 h-6 text-red-600" />
                        <h2 className="text-2xl font-bold text-gray-800">Exception Report</h2>
                    </div>
                    {exceptions.length > 0 && (
                        <button
                            onClick={exportToExcel}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                            <Download className="w-4 h-4" />
                            Export to Excel
                        </button>
                    )}
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Start Date
                        </label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            End Date
                        </label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Exception Type
                        </label>
                        <select
                            value={exceptionType}
                            onChange={(e) => setExceptionType(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">All Exceptions</option>
                            <option value="late">Late Arrivals</option>
                            <option value="early">Early Departures</option>
                            <option value="absent">Absences</option>
                        </select>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={fetchExceptions}
                            disabled={loading}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors flex items-center justify-center gap-2"
                        >
                            <Filter className="w-4 h-4" />
                            {loading ? 'Loading...' : 'Generate Report'}
                        </button>
                    </div>
                </div>

                {error && (
                    <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-800">{error}</p>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-2">Total Exceptions</p>
                        <p className="text-3xl font-bold text-gray-800">{summary.totalExceptions}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-2">Late Arrivals</p>
                        <p className="text-3xl font-bold text-orange-600">{summary.lateArrivals}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-2">Early Departures</p>
                        <p className="text-3xl font-bold text-yellow-600">{summary.earlyDepartures}</p>
                    </div>
                    <div className="bg-white rounded-lg shadow-md p-6">
                        <p className="text-sm text-gray-600 mb-2">Absences</p>
                        <p className="text-3xl font-bold text-red-600">{summary.absences}</p>
                    </div>
                </div>
            )}

            {/* Exception Table */}
            {exceptions.length > 0 && (
                <div className="bg-white rounded-lg shadow-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Employee
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Department
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Exception Type
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Shift Start
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        First IN
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Late By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Last OUT
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Early By
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Contact
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {exceptions.map((exception, index) => (
                                    <tr key={index} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(exception.date)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {exception.employee.name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {exception.employee.code}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {exception.employee.department || '-'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-wrap gap-1">
                                                {exception.exceptionTypes.map((type, i) => (
                                                    <span
                                                        key={i}
                                                        className={`px-2 py-1 text-xs font-semibold rounded-full border ${getExceptionBadgeColor([type])}`}
                                                    >
                                                        {type}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatTime(exception.shiftStart)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTime(exception.firstIn)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {exception.lateArrivalMinutes > 0 ? (
                                                <span className="text-sm font-semibold text-red-600">
                                                    {exception.lateArrivalMinutes} min
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatTime(exception.lastOut)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {exception.earlyDepartureMinutes > 0 ? (
                                                <span className="text-sm font-semibold text-red-600">
                                                    {exception.earlyDepartureMinutes} min
                                                </span>
                                            ) : (
                                                <span className="text-sm text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {exception.employee.phone ? (
                                                <div className="flex items-center gap-1">
                                                    <Phone className="w-3 h-3" />
                                                    {exception.employee.phone}
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {!loading && exceptions.length === 0 && startDate && endDate && (
                <div className="bg-white rounded-lg shadow-md p-12 text-center">
                    <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No exceptions found for the selected period</p>
                </div>
            )}
        </div>
    );
};

export default ExceptionReport;
