import React, { useState } from 'react';
import { Calendar, Download, RefreshCw, AlertTriangle, Clock, Users } from 'lucide-react';
import axios from 'axios';

/**
 * Attendance Recalculation Component
 * Allows users to recalculate attendance for a date range
 */
const AttendanceRecalculation = () => {
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    const handleRecalculate = async () => {
        if (!startDate || !endDate) {
            setError('Please select both start and end dates');
            return;
        }

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const response = await axios.post('/api/attendance/recalculate', {
                startDate,
                endDate
            });

            setResult(response.data.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to recalculate attendance');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-6">
                <RefreshCw className="w-6 h-6 text-blue-600" />
                <h2 className="text-2xl font-bold text-gray-800">Recalculate Attendance</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date
                    </label>
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                </div>
            </div>

            <button
                onClick={handleRecalculate}
                disabled={loading}
                className="w-full md:w-auto px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
                {loading ? (
                    <>
                        <RefreshCw className="w-5 h-5 animate-spin" />
                        Recalculating...
                    </>
                ) : (
                    <>
                        <RefreshCw className="w-5 h-5" />
                        Recalculate Attendance
                    </>
                )}
            </button>

            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {result && (
                <div className="mt-6 p-6 bg-green-50 border border-green-200 rounded-lg">
                    <h3 className="text-lg font-semibold text-green-800 mb-4">
                        ✅ Recalculation Complete!
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Employees Processed</p>
                            <p className="text-2xl font-bold text-gray-800">{result.processed}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Logs Created</p>
                            <p className="text-2xl font-bold text-green-600">{result.created}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Logs Updated</p>
                            <p className="text-2xl font-bold text-blue-600">{result.updated}</p>
                        </div>
                        <div className="bg-white p-4 rounded-lg">
                            <p className="text-sm text-gray-600">Errors</p>
                            <p className="text-2xl font-bold text-red-600">{result.errors}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AttendanceRecalculation;
