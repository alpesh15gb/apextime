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

export const SyncDiagnostics = () => {
  const [connectionStatus, setConnectionStatus] = useState<{status: string; deviceLogsCount?: number; error?: string} | null>(null);
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

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        testConnection(),
        fetchSyncStatus(),
        discoverTables(),
        fetchUnmatchedUsers(),
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
                      className={`font-medium ${
                        syncStatus.lastSync.status === 'success'
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
