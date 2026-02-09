import React, { useState, useEffect } from 'react';
import { FileText, Download, Users, Search, ChevronDown, Building2 } from 'lucide-react';
import { payrollAPI, branchesAPI } from '../services/api';

interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    employeeCode: string;
    panNumber?: string;
    totalTDS: number;
}

interface Branch {
    id: string;
    name: string;
    code: string;
}

const Form16 = () => {
    const [financialYear, setFinancialYear] = useState('');
    const [employees, setEmployees] = useState<Employee[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [downloading, setDownloading] = useState<string | null>(null);

    // Generate financial year options (last 5 years)
    const fyOptions = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const startFY = currentMonth >= 4 ? currentYear : currentYear - 1;
    
    for (let i = 0; i < 5; i++) {
        const year = startFY - i;
        fyOptions.push(`${year}-${(year + 1).toString().slice(-2)}`);
    }

    useEffect(() => {
        if (!financialYear && fyOptions.length > 0) {
            setFinancialYear(fyOptions[0]);
        }
    }, []);

    useEffect(() => {
        if (financialYear) {
            loadEligibleEmployees();
        }
    }, [financialYear]);

    const loadEligibleEmployees = async () => {
        setLoading(true);
        try {
            const res = await payrollAPI.getForm16Eligible(financialYear);
            setEmployees(res.data.employees || []);
        } catch (error) {
            console.error('Error loading employees:', error);
            setEmployees([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadSingle = async (employeeId: string) => {
        setDownloading(employeeId);
        try {
            const res = await payrollAPI.downloadForm16(employeeId, financialYear);
            const blob = new Blob([res.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const emp = employees.find(e => e.id === employeeId);
            a.download = `Form16_${emp?.employeeCode || employeeId}_${financialYear}.pdf`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error downloading Form 16:', error);
            alert('Failed to download Form 16');
        } finally {
            setDownloading(null);
        }
    };

    const handleBulkDownload = async () => {
        if (selectedEmployees.length === 0) {
            alert('Please select employees to download');
            return;
        }
        
        setDownloading('bulk');
        try {
            const res = await payrollAPI.downloadForm16Bulk(selectedEmployees, financialYear);
            const blob = new Blob([res.data], { type: 'application/zip' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Form16_Bulk_${financialYear}.zip`;
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error bulk downloading:', error);
            alert('Failed to download Form 16 files');
        } finally {
            setDownloading(null);
        }
    };

    const toggleSelectAll = () => {
        if (selectedEmployees.length === filteredEmployees.length) {
            setSelectedEmployees([]);
        } else {
            setSelectedEmployees(filteredEmployees.map(e => e.id));
        }
    };

    const toggleEmployee = (id: string) => {
        if (selectedEmployees.includes(id)) {
            setSelectedEmployees(selectedEmployees.filter(e => e !== id));
        } else {
            setSelectedEmployees([...selectedEmployees, id]);
        }
    };

    const filteredEmployees = employees.filter(emp =>
        `${emp.firstName} ${emp.lastName} ${emp.employeeCode}`
            .toLowerCase()
            .includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 bg-gray-50 min-h-screen">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Form 16 Generation</h1>
                    <p className="text-sm text-gray-500">Generate and download Form 16 (TDS Certificate) for employees</p>
                </div>
            </div>

            {/* Filters */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
                <div className="flex flex-wrap items-center gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Financial Year</label>
                        <div className="relative">
                            <select
                                value={financialYear}
                                onChange={(e) => setFinancialYear(e.target.value)}
                                data-testid="select-financial-year"
                                className="block w-48 border border-gray-300 rounded-md py-2 px-3 bg-white appearance-none focus:ring-blue-500 focus:border-blue-500"
                            >
                                {fyOptions.map(fy => (
                                    <option key={fy} value={fy}>FY {fy}</option>
                                ))}
                            </select>
                            <ChevronDown size={16} className="absolute right-3 top-3 text-gray-400 pointer-events-none" />
                        </div>
                    </div>

                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Search Employee</label>
                        <div className="relative">
                            <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search by name or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="block w-full border border-gray-300 rounded-md py-2 pl-10 pr-3"
                            />
                        </div>
                    </div>

                    <div className="flex items-end">
                        <button
                            onClick={handleBulkDownload}
                            disabled={selectedEmployees.length === 0 || downloading === 'bulk'}
                            data-testid="bulk-download-btn"
                            className={`flex items-center px-4 py-2 rounded-md font-medium ${
                                selectedEmployees.length > 0
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Download size={16} className="mr-2" />
                            {downloading === 'bulk' ? 'Downloading...' : `Download Selected (${selectedEmployees.length})`}
                        </button>
                    </div>
                </div>
            </div>

            {/* Info Card */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <h3 className="font-medium text-blue-800 mb-2">About Form 16</h3>
                <p className="text-sm text-blue-700">
                    Form 16 is a TDS certificate issued by employers to employees. It contains details of:
                </p>
                <ul className="text-sm text-blue-700 mt-2 list-disc list-inside">
                    <li>Part A: Details of tax deducted and deposited quarterly</li>
                    <li>Part B: Details of salary paid and tax computation</li>
                </ul>
                <p className="text-sm text-blue-700 mt-2">
                    <strong>Note:</strong> Form 16 is generated for employees who had TDS deducted during the selected financial year.
                </p>
            </div>

            {/* Employees Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Users size={18} className="text-gray-500 mr-2" />
                            <span className="font-medium text-gray-700">
                                {loading ? 'Loading...' : `${filteredEmployees.length} Employees with TDS`}
                            </span>
                        </div>
                        <div className="text-sm text-gray-500">
                            Total TDS: ₹{filteredEmployees.reduce((sum, e) => sum + (e.totalTDS || 0), 0).toLocaleString('en-IN')}
                        </div>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-4 py-3 text-left">
                                    <input
                                        type="checkbox"
                                        checked={selectedEmployees.length === filteredEmployees.length && filteredEmployees.length > 0}
                                        onChange={toggleSelectAll}
                                        className="h-4 w-4 text-blue-600 rounded"
                                    />
                                </th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">PAN</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total TDS</th>
                                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        Loading employees...
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                                        <FileText size={48} className="mx-auto mb-4 text-gray-300" />
                                        <p>No employees with TDS deduction found for FY {financialYear}</p>
                                        <p className="text-sm mt-2">Process payroll with TDS deduction to generate Form 16</p>
                                    </td>
                                </tr>
                            ) : filteredEmployees.map((emp) => (
                                <tr key={emp.id} className="hover:bg-gray-50">
                                    <td className="px-4 py-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmployees.includes(emp.id)}
                                            onChange={() => toggleEmployee(emp.id)}
                                            className="h-4 w-4 text-blue-600 rounded"
                                        />
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="font-medium text-gray-900">{emp.firstName} {emp.lastName}</div>
                                    </td>
                                    <td className="px-4 py-3 text-sm text-gray-600">{emp.employeeCode}</td>
                                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">
                                        {emp.panNumber || 'Not Available'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                                        ₹{(emp.totalTDS || 0).toLocaleString('en-IN')}
                                    </td>
                                    <td className="px-4 py-3 text-right">
                                        <button
                                            onClick={() => handleDownloadSingle(emp.id)}
                                            disabled={downloading === emp.id}
                                            data-testid={`download-form16-${emp.employeeCode}`}
                                            className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                        >
                                            <Download size={14} className="mr-1" />
                                            {downloading === emp.id ? 'Downloading...' : 'Download'}
                                        </button>
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

export default Form16;
