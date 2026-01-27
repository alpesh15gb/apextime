import { useEffect, useState } from 'react';
import { RefreshCw, Database, AlertCircle, CheckCircle, Play, Eye } from 'lucide-react';
import { syncAPI } from '../services/api';

export const SyncDiagnostics = () => {
  const [connectionStatus, setConnectionStatus] = useState<any>(null);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState({
    connection: false,
    sync: false,
    trigger: false,
    preview: false,
  });

  const testConnection = async () => {
    try {
      setLoading((prev) => ({ ...prev, connection: true }));
      const response = await syncAPI.testConnection();
      setConnectionStatus(response.data);
    } catch (error) {
      setConnectionStatus({ status: 'failed', error: 'Connection failed' });
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
      fetchSyncStatus();
    } catch (error) {
      console.error('Failed to trigger sync:', error);
    } finally {
      setLoading((prev) => ({ ...prev, trigger: false }));
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

  useEffect(() => {
    testConnection();
    fetchSyncStatus();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Sync Diagnostics</h1>
      </div>

      {/* SQL Server Connection */}
      <div className="card mb-6">
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
                  {connectionStatus.deviceLogsCount !== undefined && (
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
            className="btn-secondary flex items-center space-x-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading.connection ? 'animate-spin' : ''}`} />
            <span>Test Connection</span>
          </button>
        </div>
      </div>

      {/* Sync Status */}
      <div className="card mb-6">
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
                  {syncStatus.stats?.employeesWithDeviceId || 0} / {syncStatus.stats?.totalEmployees || 0}
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Last Sync</p>
                <p className="text-lg font-medium">
                  {syncStatus.lastSync
                    ? new Date(syncStatus.lastSync.createdAt).toLocaleString()
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
                    <p className="text-xl font-bold">{syncStatus.lastSync.recordsSynced}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex space-x-3">
              <button
                onClick={fetchSyncStatus}
                disabled={loading.sync}
                className="btn-secondary flex items-center space-x-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading.sync ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              <button
                onClick={triggerSync}
                disabled={loading.trigger}
                className="btn-primary flex items-center space-x-2"
              >
                <Play className="w-4 h-4" />
                <span>{loading.trigger ? 'Syncing...' : 'Trigger Sync Now'}</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        )}
      </div>

      {/* Preview Logs */}
      <div className="card">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <Eye className="w-5 h-5 mr-2" />
          Preview Logs from SQL Server
        </h2>
        <button
          onClick={fetchPreview}
          disabled={loading.preview}
          className="btn-secondary mb-4"
        >
          {loading.preview ? 'Loading...' : 'Load Preview'}
        </button>

        {preview && (
          <div>
            <p className="text-sm text-gray-500 mb-2">
              Last sync time: {new Date(preview.lastSyncTime).toLocaleString()}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Logs found since last sync: {preview.logsFound}
            </p>

            {preview.logs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">DeviceLogId</th>
                      <th className="text-left py-2">UserId</th>
                      <th className="text-left py-2">LogDate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.logs.map((log: any) => (
                      <tr key={log.DeviceLogId} className="border-b border-gray-100">
                        <td className="py-2 font-mono">{log.DeviceLogId}</td>
                        <td className="py-2">{log.UserId}</td>
                        <td className="py-2">{new Date(log.LogDate).toLocaleString()}</td>
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
    </div>
  );
};
