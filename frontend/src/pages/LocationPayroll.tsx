import React, { useState, useEffect } from 'react';
import { Building2, Play, DollarSign, Users, ChevronDown, FileSpreadsheet, MapPin } from 'lucide-react';
import { payrollAPI, branchesAPI } from '../services/api';

interface Branch {
    id: string;
    name: string;
    code: string;
}

interface LocationSummary {
    branchId: string;
    branchName: string;
    branchCode: string;
    employeeCount: number;
    processedCount: number;
    totalGross: number;
    totalNet: number;
    totalTDS: number;
    totalPF: number;
    totalESI: number;
}

const LocationPayroll = () => {
    const [branches, setBranches] = useState<Branch[]>([]);
    const [summary, setSummary] = useState<LocationSummary[]>([]);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState<string | null>(null);
    
    // Form state
    const [selectedBranch, setSelectedBranch] = useState('');
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [showCreateModal, setShowCreateModal] = useState(false);

    const months = [
        { value: 1, label: 'January' }, { value: 2, label: 'February' },
        { value: 3, label: 'March' }, { value: 4, label: 'April' },
        { value: 5, label: 'May' }, { value: 6, label: 'June' },
        { value: 7, label: 'July' }, { value: 8, label: 'August' },
        { value: 9, label: 'September' }, { value: 10, label: 'October' },
        { value: 11, label: 'November' }, { value: 12, label: 'December' }
    ];

    useEffect(() => {
        loadBranches();
        loadSummary();
    }, [month, year]);

    const loadBranches = async () => {
        try {
            const res = await branchesAPI.getAll();
            setBranches(res.data);
        } catch (error) {
            console.error('Error loading branches:', error);
        }
    };

    const loadSummary = async () => {
        setLoading(true);
        try {
            const res = await payrollAPI.getSummaryByLocation({ month, year });
            setSummary(res.data);
        } catch (error) {
            console.error('Error loading summary:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProcessLocation = async (branchId: string) => {
        setProcessing(branchId);
        try {
            // First create a run
            const branch = branches.find(b => b.id === branchId);
            const periodStart = new Date(year, month - 1, 1);
            const periodEnd = new Date(year, month, 0);

            const runRes = await payrollAPI.createLocationRun({
                month,
                year,
                branchId,
                batchName: `${branch?.name || 'Location'} Payroll ${month}/${year}`,
                periodStart: periodStart.toISOString(),
                periodEnd: periodEnd.toISOString()
            });

            // Then process it
            await payrollAPI.processLocationPayroll(runRes.data.id, { branchId });
            
            alert(`Payroll processed for ${branch?.name || 'location'}`);
            loadSummary();
        } catch (error: any) {
            console.error('Error processing payroll:', error);
            alert(error.response?.data?.error || 'Failed to process payroll');
        } finally {
            setProcessing(null);
        }
    };

    const totalStats = summary.reduce((acc, s) => ({
        employees: acc.employees + (s.employeeCount || 0),
        gross: acc.gross + (s.totalGross || 0),
        net: acc.net + (s.totalNet || 0),
        tds: acc.tds + (s.totalTDS || 0),
        pf: acc.pf + (s.totalPF || 0),
        esi: acc.esi + (s.totalESI || 0)
    }), { employees: 0, gross: 0, net: 0, tds: 0, pf: 0, esi: 0 });

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Location-wise Payroll</h1>
                    <p className="text-sm text-gray-500">Process and view payroll by branch/location</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap items-end gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
                        <div className="relative">
                            <select
                                value={month}
                                onChange={(e) => setMonth(parseInt(e.target.value))}
                                data-testid="select-month"
                                className="block w-40 border border-gray-300 rounded-md py-2 px-3 bg-white appearance-none"
                            >
                                {months.map(m => (
                                    <option key={m.value} value={m.value}>{m.label}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                        <div className="relative">
                            <select
                                value={year}
                                onChange={(e) => setYear(parseInt(e.target.value))}
                                data-testid="select-year"
                                className="block w-32 border border-gray-300 rounded-md py-2 px-3 bg-white appearance-none"
                            >
                                {[2024, 2025, 2026, 2027].map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <button
                        onClick={loadSummary}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 font-medium"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                        <Users size={14} className="mr-1" />
                        Total Employees
                    </div>
                    <div className="text-2xl font-bold text-gray-800">{totalStats.employees}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                        <DollarSign size={14} className="mr-1" />
                        Gross Salary
                    </div>
                    <div className="text-xl font-bold text-gray-800">₹{(totalStats.gross / 100000).toFixed(1)}L</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                        <DollarSign size={14} className="mr-1" />
                        Net Salary
                    </div>
                    <div className="text-xl font-bold text-green-600">₹{(totalStats.net / 100000).toFixed(1)}L</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                        TDS
                    </div>
                    <div className="text-xl font-bold text-orange-600">₹{totalStats.tds.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                        PF
                    </div>
                    <div className="text-xl font-bold text-blue-600">₹{totalStats.pf.toLocaleString('en-IN')}</div>
                </div>
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center text-gray-500 text-sm mb-1">
                        ESI
                    </div>
                    <div className="text-xl font-bold text-purple-600">₹{totalStats.esi.toLocaleString('en-IN')}</div>
                </div>
            </div>

            {/* Location-wise Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center">
                        <Building2 size={18} className="text-gray-500 mr-2" />
                        <span className="font-medium text-gray-700">
                            Payroll by Location - {months.find(m => m.value === month)?.label} {year}
                        </span>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Branch/Location</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Employees</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Gross Salary</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Net Salary</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">TDS</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">PF</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">ESI</th>
                                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        Loading...
                                    </td>
                                </tr>
                            ) : summary.length === 0 ? (
                                <tr>
                                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                        <MapPin size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p>No branches/locations found</p>
                                        <p className="text-sm mt-2">Add branches in Master Data to enable location-wise payroll</p>
                                    </td>
                                </tr>
                            ) : summary.map((loc) => (
                                <tr key={loc.branchId} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <div className="flex items-center">
                                            <Building2 size={16} className="text-gray-400 mr-2" />
                                            <div>
                                                <div className="font-medium text-gray-900">{loc.branchName}</div>
                                                <div className="text-xs text-gray-500">{loc.branchCode}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {loc.employeeCount}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium">
                                        ₹{(loc.totalGross || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-green-600">
                                        ₹{(loc.totalNet || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        ₹{(loc.totalTDS || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        ₹{(loc.totalPF || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-right text-sm">
                                        ₹{(loc.totalESI || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <button
                                            onClick={() => handleProcessLocation(loc.branchId)}
                                            disabled={processing === loc.branchId || loc.employeeCount === 0}
                                            data-testid={`process-${loc.branchCode}`}
                                            className={`inline-flex items-center px-3 py-1.5 text-sm font-medium rounded ${
                                                loc.employeeCount === 0
                                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                    : 'bg-blue-600 text-white hover:bg-blue-700'
                                            }`}
                                        >
                                            <Play size={14} className="mr-1" />
                                            {processing === loc.branchId ? 'Processing...' : 'Process'}
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        {summary.length > 0 && (
                            <tfoot className="bg-gray-100">
                                <tr>
                                    <td className="px-4 py-3 font-bold text-gray-900">TOTAL</td>
                                    <td className="px-4 py-3 text-center font-bold">{totalStats.employees}</td>
                                    <td className="px-4 py-3 text-right font-bold">₹{totalStats.gross.toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right font-bold text-green-600">₹{totalStats.net.toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right font-bold">₹{totalStats.tds.toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right font-bold">₹{totalStats.pf.toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3 text-right font-bold">₹{totalStats.esi.toLocaleString('en-IN')}</td>
                                    <td className="px-4 py-3"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
            </div>

            {/* Instructions */}
            <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="font-medium text-yellow-800 mb-2">How Location-wise Payroll Works</h3>
                <ul className="text-sm text-yellow-700 list-disc list-inside space-y-1">
                    <li>Each branch/location can have its own payroll run</li>
                    <li>Click "Process" to generate payroll for all employees in that location</li>
                    <li>Useful for companies with multiple offices or locations with different pay dates</li>
                    <li>After processing, you can export bank files specific to each location</li>
                </ul>
            </div>
        </div>
    );
};

export default LocationPayroll;
