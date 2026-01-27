import { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Filter,
  FileSpreadsheet,
  File as FilePdf,
} from 'lucide-react';
import { reportsAPI } from '../services/api';

export const Reports = () => {
  const [reportType, setReportType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    month: (new Date().getMonth() + 1).toString(),
    year: new Date().getFullYear().toString(),
    departmentId: '',
    branchId: '',
    employeeId: '',
  });
  const [generating, setGenerating] = useState(false);

  const handleDownload = async (format: 'excel' | 'pdf') => {
    try {
      setGenerating(true);
      const params: Record<string, string> = {};

      if (reportType === 'daily') {
        params.date = filters.date;
      } else if (reportType === 'monthly') {
        params.month = filters.month;
        params.year = filters.year;
      }

      if (filters.departmentId) params.departmentId = filters.departmentId;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.employeeId) params.employeeId = filters.employeeId;

      let response;
      if (format === 'excel') {
        response = await reportsAPI.downloadExcel(reportType, params);
      } else {
        response = await reportsAPI.downloadPDF(reportType, params);
      }

      // Create blob and download
      const blob = new Blob([response.data], {
        type: format === 'excel'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `attendance_${reportType}_${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download report:', error);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Reports</h1>
      </div>

      {/* Report Type Selection */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4">Select Report Type</h2>
        <div className="flex space-x-4">
          {(['daily', 'weekly', 'monthly'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setReportType(type)}
              className={`px-6 py-3 rounded-lg font-medium capitalize transition-colors ${
                reportType === type
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {type} Report
            </button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div className="card mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2" />
          Filters
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {reportType === 'daily' && (
            <div>
              <label className="form-label">Date</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="form-input pl-10"
                />
              </div>
            </div>
          )}

          {reportType === 'monthly' && (
            <>
              <div>
                <label className="form-label">Month</label>
                <select
                  value={filters.month}
                  onChange={(e) => setFilters({ ...filters, month: e.target.value })}
                  className="form-input"
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {new Date(2000, month - 1).toLocaleString('default', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Year</label>
                <select
                  value={filters.year}
                  onChange={(e) => setFilters({ ...filters, year: e.target.value })}
                  className="form-input"
                >
                  {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - 2 + i).map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {reportType === 'weekly' && (
            <div>
              <label className="form-label">Week Starting</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={filters.date}
                  onChange={(e) => setFilters({ ...filters, date: e.target.value })}
                  className="form-input pl-10"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Download Options */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4">Download Report</h2>
        <div className="flex space-x-4">
          <button
            onClick={() => handleDownload('excel')}
            disabled={generating}
            className="flex items-center space-x-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <FileSpreadsheet className="w-5 h-5" />
            <span>{generating ? 'Generating...' : 'Download Excel'}</span>
          </button>
          <button
            onClick={() => handleDownload('pdf')}
            disabled={generating}
            className="flex items-center space-x-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
          >
            <FilePdf className="w-5 h-5" />
            <span>{generating ? 'Generating...' : 'Download PDF'}</span>
          </button>
        </div>
      </div>

      {/* Report Preview Info */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Report Contents</h2>
        <ul className="space-y-2 text-gray-600">
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Employee name and code
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Department and Branch information
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Date range coverage
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            First IN and Last OUT times
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Total working hours
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Shift information
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Late arrival indicators
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Early departure indicators
          </li>
          <li className="flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Absent/Present status
          </li>
        </ul>
      </div>
    </div>
  );
};
