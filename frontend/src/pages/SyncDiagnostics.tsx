import { useEffect, useState } from 'react';
import { RefreshCw, Database, AlertCircle, CheckCircle, Play, Eye, List, Users, RotateCcw, DatabaseBackup, UserCheck } from 'lucide-react';
import { syncAPI } from '../services/api';

interface TableInfo {
  name: string;
  rowCount: number | null;
  error?: string;
}

interface UnmatchedUsersData {
  totalUniqueUsers: number;
  matchedCount: number;
  unmatchedCount: number;
  unmatchedUserIds: string[];
  matchedEmployees: Array<{
    id: string;
    deviceUserId: string;
    firstName: string;
    lastName: string;
  }>;
}

interface SyncStatusData {
  lastSync?: {
    status: string;
    message: string;
    recordsSynced: number;
    createdAt: string;
  };
  stats?: {
    employeesWithDeviceId: number;
    totalEmployees: number;
  };
}

interface PreviewData {
  lastSyncTime: string;
  table: string;
  logsFound: number;
  logs: Array<{
    DeviceLogId: number;
    UserId: string;
    LogDate: string;
  }>;
}

interface SqlDeviceUser {
  DeviceId: number;
  UserId: string;
  Name: string;
  UserName: string;
  CardNumber: string;
  IsActive: boolean;
}

interface SqlTableInfo {
  error?: string;
}

interface DuplicateData {
  nameDuplicates: [string, any[]][];
  hoMappings: { numeric: any, ho: any }[];
}

export const SyncDiagnostics = () => {
  const [connectionStatus, setConnectionStatus] = useState<{ status: string; deviceLogsCount?: number; error?: string } | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatusData | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [discoveredTables, setDiscoveredTables] = useState<TableInfo[]>([]);
  const [unmatchedUsers, setUnmatchedUsers] = useState<UnmatchedUsersData | null>(null);
  const [loading, setLoading] = useState({
    connection: false,
    sync: false,
    trigger: false,
    preview: false,
    tables: false,
    unmatched: false,
    syncNames: false,
  });
  const [syncNamesResult, setSyncNamesResult] = useState<{ updated: number; failed: number } | null>(null);
  const [sqlDeviceUsers, setSqlDeviceUsers] = useState<{ count: number; users: SqlDeviceUser[] } | null>(null);
  const [loadingSqlUsers, setLoadingSqlUsers] = useState(false);
  const [allTables, setAllTables] = useState<{ totalTables: number; tables: SqlTableInfo[] } | null>(null);
  const [loadingAllTables, setLoadingAllTables] = useState(false);
  const [selectedTable, setSelectedTable] = useState('');
  const [tableQueryResult, setTableQueryResult] = useState<{ table: string; rowCount: number; data: any[] } | null>(null);
  const [loadingTableQuery, setLoadingTableQuery] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateData | null>(null);
  const [loadingDuplicates, setLoadingDuplicates] = useState(false);
  const [merging, setMerging] = useState(false);

  const testConnection = async () => {
    try {
      setLoading((prev) => ({ ...prev, connection: true }));
      const response = await syncAPI.testConnection();
      setConnectionStatus(response.data);
    } catch (error: any) {
      setConnectionStatus({ status: 'failed', error: error?.response?.data?.error || 'Connection failed' });
    } finally {
      setLoading((prev) => ({ ...prev, connection: false }));
    }
  };

  const fetchSyncStatus = async () => {
    try {
      setLoading((prev) => ({ ...prev, sync: true }));
      const response = await syncAPI.getStatus();
      setSyncStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch sync status:', error);
    } finally {
      setLoading((prev) => ({ ...prev, sync: false }));
    }
  };

  const triggerSync = async () => {
    try {
      setLoading((prev) => ({ ...prev, trigger: true }));
      await syncAPI.trigger();
      await fetchSyncStatus();
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setLoading((prev) => ({ ...prev, trigger: false }));
    }
  };

  const triggerFullSync = async () => {
    if (!confirm('Full Sync will process ALL historical data from 2020 onwards. This may take several minutes. Continue?')) {
      return;
    }
    try {
      setLoading((prev) => ({ ...prev, trigger: true }));
      await syncAPI.trigger(true); // fullSync = true
      await fetchSyncStatus();
    } catch (error) {
      console.error('Failed to trigger full sync:', error);
    } finally {
      setLoading((prev) => ({ ...prev, trigger: false }));
    }
  };

  const resetSync = async () => {
    if (!confirm('Reset sync status? This will clear the last sync time so next sync processes all data.')) {
      return;
    }
    try {
      await syncAPI.reset();
      await fetchSyncStatus();
    } catch (error) {
      console.error('Failed to reset sync:', error);
    }
  };

  const fetchPreview = async () => {
    try {
      setLoading((prev) => ({ ...prev, preview: true }));
      const response = await syncAPI.preview(10);
      setPreview(response.data);
    } catch (error) {
      console.error('Failed to fetch preview:', error);
    } finally {
      setLoading((prev) => ({ ...prev, preview: false }));
    }
  };

  const discoverTables = async () => {
    try {
      setLoading((prev) => ({ ...prev, tables: true }));
      const response = await syncAPI.discoverTables();
      setDiscoveredTables(response.data?.tables || []);
    } catch (error) {
      console.error('Failed to discover tables:', error);
      setDiscoveredTables([]);
    } finally {
      setLoading((prev) => ({ ...prev, tables: false }));
    }
  };

  const fetchUnmatchedUsers = async () => {
    try {
      setLoading((prev) => ({ ...prev, unmatched: true }));
      const response = await syncAPI.getUnmatchedUsers();
      const data = response.data;
      setUnmatchedUsers({
        totalUniqueUsers: data?.totalUniqueUsers || 0,
        matchedCount: data?.matchedCount || 0,
        unmatchedCount: data?.unmatchedCount || 0,
        unmatchedUserIds: data?.unmatchedUserIds || [],
        matchedEmployees: data?.matchedEmployees || [],
      });
    } catch (error) {
      console.error('Failed to fetch unmatched users:', error);
      setUnmatchedUsers({
        totalUniqueUsers: 0,
        matchedCount: 0,
        unmatchedCount: 0,
        unmatchedUserIds: [],
        matchedEmployees: [],
      });
    } finally {
      setLoading((prev) => ({ ...prev, unmatched: false }));
    }
  };

  const syncEmployeeNames = async () => {
    if (!confirm('This will sync employee names from SQL Server DeviceUsers table. Continue?')) {
      return;
    }
    try {
      setLoading((prev) => ({ ...prev, syncNames: true }));
      const response = await syncAPI.syncNames();
      setSyncNamesResult({
        updated: response.data?.updated || 0,
        failed: response.data?.failed || 0,
      });
      // Refresh unmatched users to show updated names
      await fetchUnmatchedUsers();
    } catch (error) {
      console.error('Failed to sync employee names:', error);
      alert('Failed to sync employee names. Check console for details.');
    } finally {
      setLoading((prev) => ({ ...prev, syncNames: false }));
    }
  };

  const fetchSqlDeviceUsers = async () => {
    try {
      setLoadingSqlUsers(true);
      const response = await syncAPI.getSqlDeviceUsers();
      setSqlDeviceUsers({
        count: response.data?.count || 0,
        users: response.data?.users || [],
      });
    } catch (error) {
      console.error('Failed to fetch SQL device users:', error);
      setSqlDeviceUsers({ count: 0, users: [] });
    } finally {
      setLoadingSqlUsers(false);
    }
  };

  const discoverAllTables = async () => {
    try {
      setLoadingAllTables(true);
      const response = await syncAPI.discoverAllTables();
      setAllTables({
        totalTables: response.data?.totalTables || 0,
        tables: response.data?.tables || [],
      });
    } catch (error) {
      console.error('Failed to discover tables:', error);
      setAllTables({ totalTables: 0, tables: [] });
    } finally {
      setLoadingAllTables(false);
    }
  };

  const queryTable = async () => {
    if (!selectedTable) return;
    try {
      setLoadingTableQuery(true);
      const response = await syncAPI.queryTable(selectedTable, 10);
      setTableQueryResult({
        table: response.data?.table || selectedTable,
        rowCount: response.data?.rowCount || 0,
        data: response.data?.data || [],
      });
    } catch (error) {
      console.error('Failed to query table:', error);
      setTableQueryResult({ table: selectedTable, rowCount: 0, data: [] });
    } finally {
      setLoadingTableQuery(false);
    }
  };

  const fetchDuplicates = async () => {
    try {
      setLoadingDuplicates(true);
      const response = await syncAPI.getDuplicates();
      // The current API returns HTML for /api/fix-duplicates
      // We need to either parse it or update the API to return JSON
      setDuplicates(response.data);
    } catch (error) {
      console.error('Failed to fetch duplicates:', error);
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const mergeDuplicates = async () => {
    if (!confirm('This will merge all detected duplicates and migrate their attendance data. This action cannot be undone. Continue?')) {
      return;
    }
    try {
      setMerging(true);
      await syncAPI.mergeDuplicates();
      alert('Duplicates merged successfully!');
      await fetchDuplicates();
      await fetchUnmatchedUsers();
    } catch (error) {
      console.error('Failed to merge duplicates:', error);
      alert('Merge failed. Check console for details.');
    } finally {
      setMerging(false);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        testConnection(),
        fetchSyncStatus(),
        discoverTables(),
        fetchUnmatchedUsers(),
        fetchDuplicates(),
      ]);
    };
    loadData();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sync Diagnostics</h1>
      </div>

      {/* SQL Server Connection */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Database className="w-5 h-5 mr-2" />
          SQL Server Connection
        </h2>
        <div className="flex items-center justify-between">
          <div>
            {connectionStatus ? (
              <div className="flex items-center">
                {connectionStatus.status === 'connected' ? (
                  <CheckCircle className="w-6 h-6 text-green-500 mr-2" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500 mr-2" />
                )}
                <div>
                  <p className="font-medium">
                    {connectionStatus.status === 'connected' ? 'Connected' : 'Failed'}
                  </p>
                  {typeof connectionStatus.deviceLogsCount === 'number' && (
                    <p className="text-sm text-gray-500">
                      DeviceLogs table: {connectionStatus.deviceLogsCount} records
                    </p>
                  )}
                  {connectionStatus.error && (
                    <p className="text-sm text-red-500">{connectionStatus.error}</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-gray-500">Click test to check connection</p>
            )}
          </div>
          <button
            onClick={testConnection}
            disabled={loading.connection}
            className="btn-secondary flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading.connection ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {/* Sync Status */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <RefreshCw className="w-5 h-5 mr-2" />
          Sync Status
        </h2>
        {syncStatus ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Employees with Device ID</p>
                <p className="text-2xl font-bold">
                  {syncStatus.stats?.employeesWithDeviceId ?? 0} / {syncStatus.stats?.totalEmployees ?? 0}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Last Sync</p>
                <p className="text-lg font-medium">
                  {syncStatus.lastSync?.createdAt
                    ? syncStatus.lastSync.createdAt.replace('T', ' ').substring(0, 19)
                    : 'Never'}
                </p>
              </div>
            </div>

            {syncStatus.lastSync && (
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">Last Sync Result</p>
                    <p
                      className={`font-medium ${syncStatus.lastSync.status === 'success'
                        ? 'text-green-600'
                        : 'text-red-600'
                        }`}
                    >
                      {syncStatus.lastSync.status === 'success' ? 'Success' : 'Failed'}
                    </p>
                    <p className="text-sm text-gray-600">{syncStatus.lastSync.message}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Records Synced</p>
                    <p className="text-xl font-bold">{syncStatus.lastSync.recordsSynced ?? 0}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Sync Stats Summary */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-blue-600 font-medium mb-2">How Sync Works:</p>
              <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                <li>Queries ALL DeviceLogs partition tables automatically</li>
                <li>Auto-creates employees if they don't exist (named "Employee {'{UserId}'}")</li>
                <li>Matches logs to employees by UserId from biometric device</li>
                <li>Calculates First IN / Last OUT attendance</li>
              </ul>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={fetchSyncStatus}
                disabled={loading.sync}
                className="btn-secondary flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading.sync ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={triggerSync}
                disabled={loading.trigger}
                className="btn-primary flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>{loading.trigger ? 'Syncing...' : 'Trigger Sync Now'}</span>
              </button>
              <button
                onClick={triggerFullSync}
                disabled={loading.trigger}
                className="btn-primary flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg transition-colors"
              >
                <DatabaseBackup className="w-4 h-4" />
                <span>{loading.trigger ? 'Syncing...' : 'Full Sync (All Data)'}</span>
              </button>
              <button
                onClick={resetSync}
                disabled={loading.trigger}
                className="btn-secondary flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Reset Sync</span>
              </button>
              <button
                onClick={syncEmployeeNames}
                disabled={loading.syncNames}
                className="btn-primary flex items-center space-x-2 px-4 py-2 bg-green-600 text-white hover:bg-green-700 rounded-lg transition-colors"
              >
                <UserCheck className="w-4 h-4" />
                <span>{loading.syncNames ? 'Syncing Names...' : 'Sync Names from SQL'}</span>
              </button>
            </div>

            {syncNamesResult && (
              <div className="bg-green-50 border border-green-200 p-4 rounded-lg">
                <p className="text-sm text-green-800 font-medium">Name Sync Complete</p>
                <p className="text-sm text-green-700">
                  Updated: {syncNamesResult.updated} employees | Failed: {syncNamesResult.failed}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        )}
      </div>

      {/* Discovered Tables */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <List className="w-5 h-5 mr-2" />
          Discovered DeviceLogs Tables
        </h2>
        {discoveredTables.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left py-2 px-4">Table Name</th>
                  <th className="text-left py-2 px-4">Row Count</th>
                </tr>
              </thead>
              <tbody>
                {discoveredTables.map((table) => (
                  <tr key={table.name} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-2 px-4 font-mono">{table.name}</td>
                    <td className="py-2 px-4">
                      {table.rowCount !== null && table.rowCount !== undefined
                        ? table.rowCount.toLocaleString()
                        : <span className="text-red-500">Error</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">
            {loading.tables ? 'Discovering tables...' : 'No DeviceLogs tables found'}
          </p>
        )}
      </div>

      {/* Preview Logs */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Preview Logs from SQL Server
        </h2>
        <button
          onClick={fetchPreview}
          disabled={loading.preview}
          className="btn-secondary mb-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          {loading.preview ? 'Loading...' : 'Load Preview'}
        </button>

        {preview && (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Last sync time: {preview.lastSyncTime ? preview.lastSyncTime.replace('T', ' ').substring(0, 19) : 'N/A'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Logs found since last sync: {preview.logsFound ?? 0}
            </p>

            {preview.logs && preview.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-4">DeviceLogId</th>
                      <th className="text-left py-2 px-4">UserId</th>
                      <th className="text-left py-2 px-4">LogDate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.logs.map((log) => (
                      <tr key={log.DeviceLogId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-mono">{log.DeviceLogId}</td>
                        <td className="py-2 px-4">{log.UserId}</td>
                        <td className="py-2 px-4">{log.LogDate ? log.LogDate.replace('T', ' ').substring(0, 19) : 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No new logs found since last sync</p>
            )}
          </div>
        )}
      </div>

      {/* Unmatched Users */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Users className="w-5 h-5 mr-2" />
          Device User ID Mapping
        </h2>
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-500">
            Shows which device user IDs from SQL Server have matching employees
          </p>
          <button
            onClick={fetchUnmatchedUsers}
            disabled={loading.unmatched}
            className="btn-secondary flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading.unmatched ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {unmatchedUsers ? (
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <p className="text-sm text-gray-500">Total Unique Users</p>
                <p className="text-2xl font-bold">{unmatchedUsers.totalUniqueUsers}</p>
              </div>
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <p className="text-sm text-green-600">Matched</p>
                <p className="text-2xl font-bold text-green-600">{unmatchedUsers.matchedCount}</p>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <p className="text-sm text-red-600">Unmatched</p>
                <p className="text-2xl font-bold text-red-600">{unmatchedUsers.unmatchedCount}</p>
              </div>
            </div>

            {unmatchedUsers.unmatchedUserIds && unmatchedUsers.unmatchedUserIds.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Unmatched Device User IDs (will be auto-created during sync):
                </p>
                <div className="bg-gray-100 p-3 rounded-lg overflow-x-auto">
                  <code className="text-sm whitespace-nowrap">
                    {unmatchedUsers.unmatchedUserIds.join(', ')}
                  </code>
                </div>
              </div>
            )}

            {unmatchedUsers.matchedEmployees && unmatchedUsers.matchedEmployees.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Matched Employees:</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left py-2 px-4">Device User ID</th>
                        <th className="text-left py-2 px-4">Employee Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {unmatchedUsers.matchedEmployees.map((emp) => (
                        <tr key={emp.id} className="border-b border-gray-100 hover:bg-gray-50">
                          <td className="py-2 px-4 font-mono">{emp.deviceUserId}</td>
                          <td className="py-2 px-4">
                            {emp.firstName} {emp.lastName}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Loading user mapping status...</p>
        )}
      </div>

      {/* Duplicate Employees */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6 border-l-4 border-yellow-500">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Users className="w-5 h-5 mr-2 text-yellow-500" />
            Duplicate Employee Detection
          </h2>
          <div className="flex space-x-2">
            <button
              onClick={fetchDuplicates}
              disabled={loadingDuplicates}
              className="btn-secondary flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loadingDuplicates ? 'animate-spin' : ''}`} />
              <span>Scan for Duplicates</span>
            </button>
            {duplicates && (duplicates.nameDuplicates.length > 0 || duplicates.hoMappings.length > 0) && (
              <button
                onClick={mergeDuplicates}
                disabled={merging}
                className="btn-primary flex items-center space-x-2 px-4 py-2 bg-yellow-600 text-white hover:bg-yellow-700 rounded-lg transition-colors"
              >
                <Play className="w-4 h-4" />
                <span>{merging ? 'Merging...' : 'Merge All Duplicates'}</span>
              </button>
            )}
          </div>
        </div>

        {duplicates ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-yellow-50 p-4 rounded-lg">
                <p className="text-sm text-yellow-700">Name Duplicates</p>
                <p className="text-2xl font-bold text-yellow-700">{duplicates.nameDuplicates.length}</p>
              </div>
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-700">Numeric → HO Mappings</p>
                <p className="text-2xl font-bold text-blue-700">{duplicates.hoMappings.length}</p>
              </div>
            </div>

            {duplicates.nameDuplicates.length > 0 && (
              <div>
                <h3 className="text-md font-medium mb-3">Duplicate Names (Different IDs)</h3>
                <div className="space-y-3">
                  {duplicates.nameDuplicates.map(([name, emps], idx) => (
                    <div key={idx} className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                      <p className="font-bold text-gray-800 mb-1">{name.toUpperCase()}</p>
                      <div className="flex flex-wrap gap-2">
                        {emps.map((e: any, i: number) => (
                          <span key={i} className="text-xs bg-white border border-gray-300 px-2 py-1 rounded">
                            ID: {e.deviceUserId} | Code: {e.employeeCode}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {duplicates.hoMappings.length > 0 && (
              <div>
                <h3 className="text-md font-medium mb-3">Numeric → HO Code Pairs</h3>
                <div className="space-y-2">
                  {duplicates.hoMappings.map((map, idx) => (
                    <div key={idx} className="flex items-center text-sm bg-blue-50 p-2 rounded border border-blue-100">
                      <code className="bg-white px-2 py-1 rounded">{map.numeric.deviceUserId}</code>
                      <span className="mx-3 text-gray-400">→</span>
                      <span className="font-medium text-blue-800">{map.ho.firstName} {map.ho.lastName}</span>
                      <code className="ml-2 bg-white px-2 py-1 rounded text-xs">{map.ho.deviceUserId}</code>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {duplicates.nameDuplicates.length === 0 && duplicates.hoMappings.length === 0 && (
              <div className="text-center py-6 bg-green-50 rounded-lg border border-green-100">
                <CheckCircle className="w-10 h-10 text-green-500 mx-auto mb-2" />
                <p className="text-green-800 font-medium">No duplicates found!</p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-4">Click "Scan for Duplicates" to analyze the database</p>
        )}
      </div>

      {/* SQL Server Device Users */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <Database className="w-5 h-5 mr-2" />
            SQL Server Device Users
          </h2>
          <button
            onClick={fetchSqlDeviceUsers}
            disabled={loadingSqlUsers}
            className="btn-secondary flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingSqlUsers ? 'animate-spin' : ''}`} />
            <span>Load from SQL</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Shows user data from the SQL Server DeviceUsers table (Name field is used for employee names)
        </p>

        {sqlDeviceUsers ? (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Total users in SQL Server: <strong>{sqlDeviceUsers.count}</strong>
            </p>
            {sqlDeviceUsers.users.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-4">UserId</th>
                      <th className="text-left py-2 px-4">Name</th>
                      <th className="text-left py-2 px-4">UserName</th>
                      <th className="text-left py-2 px-4">CardNumber</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sqlDeviceUsers.users.map((user) => (
                      <tr key={user.UserId} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-mono">{user.UserId}</td>
                        <td className="py-2 px-4 font-medium text-blue-600">{user.Name || <span className="text-gray-400 italic">null</span>}</td>
                        <td className="py-2 px-4">{user.UserName || '-'}</td>
                        <td className="py-2 px-4">{user.CardNumber || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                <p className="text-yellow-800 font-medium">No users found in DeviceUsers table</p>
                <p className="text-sm text-yellow-700 mt-1">
                  This is unusual. Employee names might be stored in a different table. Use the "Discover All Tables" section below to find the employee master data.
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Load from SQL" to view DeviceUsers from SQL Server</p>
        )}
      </div>

      {/* Discover All Tables */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center">
            <List className="w-5 h-5 mr-2" />
            Discover All SQL Server Tables
          </h2>
          <button
            onClick={discoverAllTables}
            disabled={loadingAllTables}
            className="btn-secondary flex items-center space-x-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loadingAllTables ? 'animate-spin' : ''}`} />
            <span>Discover Tables</span>
          </button>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Find all tables in the SQL Server database to locate employee master data (names, departments, designations)
        </p>

        {allTables ? (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Total tables found: <strong>{allTables.totalTables}</strong>
            </p>
            {allTables.tables.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-2 px-4">Table Name</th>
                      <th className="text-left py-2 px-4">Columns</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allTables.tables.map((table) => (
                      <tr key={table.name} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-2 px-4 font-mono font-medium">{table.name}</td>
                        <td className="py-2 px-4">
                          {table.error ? (
                            <span className="text-red-500">{table.error}</span>
                          ) : (
                            <span className="text-xs">
                              {table.columns.map((c) => c.COLUMN_NAME).join(', ')}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No tables found</p>
            )}
          </div>
        ) : (
          <p className="text-gray-500">Click "Discover Tables" to see all tables in SQL Server</p>
        )}
      </div>

      {/* Query Specific Table */}
      <div className="card bg-white shadow rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Query Table Data
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Preview data from any table to find employee information
        </p>

        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={selectedTable}
            onChange={(e) => setSelectedTable(e.target.value)}
            placeholder="Enter table name (e.g., Employees, Users)"
            className="flex-1 px-3 py-2 border rounded-lg"
          />
          <button
            onClick={queryTable}
            disabled={loadingTableQuery || !selectedTable}
            className="btn-primary flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg transition-colors"
          >
            {loadingTableQuery ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Querying...</span>
              </>
            ) : (
              <>
                <Eye className="w-4 h-4" />
                <span>Query</span>
              </>
            )}
          </button>
        </div>

        {tableQueryResult && (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Table: <strong>{tableQueryResult.table}</strong> | Rows: {tableQueryResult.rowCount}
            </p>
            {tableQueryResult.data.length > 0 ? (
              <div className="overflow-x-auto max-h-96">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white">
                    <tr className="border-b bg-gray-50">
                      {Object.keys(tableQueryResult.data[0]).map((key) => (
                        <th key={key} className="text-left py-2 px-4">{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableQueryResult.data.map((row, idx) => (
                      <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                        {Object.values(row).map((val: any, i) => (
                          <td key={i} className="py-2 px-4">
                            {val === null ? <span className="text-gray-400 italic">null</span> :
                              typeof val === 'object' ? JSON.stringify(val).substring(0, 50) :
                                String(val).substring(0, 50)}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-gray-500">No data in table</p>
            )}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="card bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <h2 className="text-lg font-semibold mb-2 flex items-center text-yellow-800">
          <AlertCircle className="w-5 h-5 mr-2" />
          Setup Instructions
        </h2>
        <ul className="list-disc list-inside text-sm text-yellow-700 space-y-1">
          <li>Each employee needs a <strong>Device User ID</strong> to match biometric logs</li>
          <li>Edit employees and set their Device User ID to match the UserId from the biometric device</li>
          <li>If DeviceLogs table is empty, data may be in monthly partition tables (e.g., DeviceLogs_1_2026)</li>
          <li>Contact your biometric device administrator to get the UserId mappings</li>
        </ul>
      </div>
    </div>
  );
};
