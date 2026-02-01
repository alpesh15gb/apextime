import { useEffect, useState } from 'react';
import { RefreshCw, Database, AlertCircle, CheckCircle, Play, Eye, List, Users, RotateCcw, DatabaseBackup, UserCheck, Terminal, Disc, ShieldCheck, Search, ChevronRight, Activity } from 'lucide-react';
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
  name: string;
  rowCount: number | null;
}

interface DuplicateData {
  nameDuplicates: [string, any[]][];
  hoMappings: { numeric: any, ho: any }[];
  sourceIdDuplicates: [string, any[]][];
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
  const [reprocessDates, setReprocessDates] = useState({ start: '', end: '' });
  const [reprocessing, setReprocessing] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try { await testConnection(); } catch (e) { console.error(e); }
      try { await fetchSyncStatus(); } catch (e) { console.error(e); }
      try { await discoverTables(); } catch (e) { console.error(e); }
      try { await fetchUnmatchedUsers(); } catch (e) { console.error(e); }
      try { await fetchDuplicates(); } catch (e) { console.error(e); }
    };
    loadData();
  }, []);

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
      await syncAPI.trigger(true);
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

  const fetchDuplicates = async () => {
    try {
      setLoadingDuplicates(true);
      const response = await syncAPI.getDuplicates();
      setDuplicates(response.data);
    } catch (error: any) {
      console.error('Failed to fetch duplicates:', error);
      alert('Failed to scan for duplicates.');
    } finally {
      setLoadingDuplicates(false);
    }
  };

  const mergeDuplicates = async () => {
    if (!confirm('This will merge all detected duplicates and migrate their attendance data. Continue?')) {
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
      alert('Merge failed.');
    } finally {
      setMerging(false);
    }
  };

  const triggerHistoricalReprocess = async () => {
    if (!reprocessDates.start) {
      alert('Please select a start date');
      return;
    }
    try {
      setReprocessing(true);
      const res = await syncAPI.reprocess({
        startDate: reprocessDates.start,
        endDate: reprocessDates.end || undefined,
      });
      alert(`Success! Processed ${res.data.pairsProcessed} sessions and updated ${res.data.recordsUpdated} records.`);
    } catch (e) {
      console.error(e);
      alert('Reprocessing failed');
    } finally {
      setReprocessing(false);
    }
  };

  return (
    <div className="space-y-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight flex items-center gap-3">
            <Terminal className="w-8 h-8 text-blue-600" />
            Sync Control Center
          </h1>
          <p className="text-sm font-bold text-gray-400 mt-1 uppercase tracking-tighter italic">Precision diagnostic matrix for biometric data ingestion</p>
        </div>

        <div className="flex bg-white rounded-2xl border border-gray-100 p-1.5 shadow-sm">
          <button onClick={fetchSyncStatus} className="p-3 text-gray-400 hover:text-blue-600 transition-all"><RefreshCw className={`w-5 h-5 ${loading.sync ? 'animate-spin' : ''}`} /></button>
          <button onClick={triggerSync} disabled={loading.trigger} className="btn-app btn-app-primary">
            <Play className="w-4 h-4" />
            <span>{loading.trigger ? 'Ingesting...' : 'Hot Sync'}</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-10">
          {/* Connection & Status */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="app-card p-10 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Database className="w-4 h-4 text-blue-600" /> SQL Tunnel</h3>
                <div className={`w-3 h-3 rounded-full ${connectionStatus?.status === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`}></div>
              </div>
              {connectionStatus?.status === 'connected' ? (
                <div>
                  <p className="text-2xl font-black text-gray-900 tracking-tighter">Verified Connection</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 italic">Scan density: {connectionStatus.deviceLogsCount?.toLocaleString()} Records</p>
                </div>
              ) : (
                <div>
                  <p className="text-2xl font-black text-red-600 tracking-tighter">Connection Failed</p>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 line-clamp-1">{connectionStatus?.error || 'Protocol Timeout'}</p>
                </div>
              )}
              <button onClick={testConnection} className="w-full py-4 bg-gray-50 text-gray-400 font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all">Pulse Test</button>
            </div>

            <div className="app-card p-10 space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-600" /> Sync Velocity</h3>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase">Success Rate</p>
                  <p className="text-xl font-black text-gray-900">{syncStatus?.stats?.employeesWithDeviceId} / {syncStatus?.stats?.totalEmployees}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black text-gray-400 uppercase">Last Entry</p>
                  <p className="text-xl font-black text-gray-900">{syncStatus?.lastSync?.recordsSynced || 0}</p>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-2xl italic">
                <p className="text-[10px] font-bold text-gray-400 line-clamp-1">Last: {syncStatus?.lastSync?.createdAt || 'Never Indexed'}</p>
              </div>
            </div>
          </div>

          {/* Unmatched Mapping */}
          <div className="app-card overflow-hidden">
            <div className="p-8 border-b border-gray-50 flex justify-between items-center bg-gray-50/20">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> Identity Resolver Matrix</h3>
              <div className="flex items-center space-x-3">
                <button onClick={syncEmployeeNames} className="px-4 py-2 bg-white border border-gray-100 text-gray-400 font-black text-[9px] uppercase tracking-widest rounded-xl hover:text-blue-600 transition-all">Push SQL Names</button>
                <button onClick={fetchUnmatchedUsers} className="p-2 text-gray-300 hover:text-red-500"><RotateCcw className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid grid-cols-3 gap-6">
                <div className="p-6 bg-gray-50 rounded-[32px] text-center">
                  <p className="text-[9px] font-black text-gray-400 uppercase mb-1">Census</p>
                  <p className="text-2xl font-black text-gray-900">{unmatchedUsers?.totalUniqueUsers}</p>
                </div>
                <div className="p-6 bg-emerald-50 rounded-[32px] text-center border border-emerald-100">
                  <p className="text-[9px] font-black text-emerald-600 uppercase mb-1">Mapped</p>
                  <p className="text-2xl font-black text-emerald-600">{unmatchedUsers?.matchedCount}</p>
                </div>
                <div className="p-6 bg-red-50 rounded-[32px] text-center border border-red-100">
                  <p className="text-[9px] font-black text-red-600 uppercase mb-1">Signal Loss</p>
                  <p className="text-2xl font-black text-red-600">{unmatchedUsers?.unmatchedCount}</p>
                </div>
              </div>

              {unmatchedUsers?.unmatchedUserIds?.length ? (
                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Unmatched Segment (Pending Auto-Creation)</h4>
                  <div className="flex flex-wrap gap-2">
                    {unmatchedUsers.unmatchedUserIds.slice(0, 50).map(id => (
                      <span key={id} className="px-3 py-1 bg-white border border-gray-100 rounded-lg text-[10px] font-black text-red-600">{id}</span>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          {/* Duplicate Detection */}
          <div className="app-card border-none bg-gray-900 text-white overflow-hidden shadow-2xl shadow-gray-200">
            <div className="p-8 border-b border-white/5 bg-white/5 flex justify-between items-center">
              <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><Disc className="w-4 h-4 text-blue-600" /> Conflict Management</h3>
              <div className="flex items-center space-x-3">
                <button onClick={fetchDuplicates} className="px-4 py-2 bg-white/5 border border-white/10 text-gray-400 font-black text-[9px] uppercase tracking-widest rounded-xl hover:text-white transition-all">Scan Registry</button>
                <button onClick={mergeDuplicates} disabled={merging || !duplicates} className="px-6 py-2 bg-blue-600 text-white font-black text-[9px] uppercase tracking-widest rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-900/40">Authorize Merge</button>
              </div>
            </div>
            <div className="p-10">
              {duplicates ? (
                <div className="space-y-10">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">HO Matrix Conflicts</h4>
                      <div className="space-y-3">
                        {duplicates.hoMappings.map((map, i) => (
                          <div key={i} className="flex items-center space-x-3 bg-white/5 p-4 rounded-[20px] group transition-all hover:bg-white/10 border border-white/5">
                            <div className="text-[10px] font-black text-red-500">{map.numeric.deviceUserId}</div>
                            <ChevronRight className="w-3 h-3 text-white/10" />
                            <div className="text-[10px] font-black text-white">{map.ho.firstName} {map.ho.lastName}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Name Collisions</h4>
                      <div className="space-y-3">
                        {duplicates.nameDuplicates.map(([name, emps], i) => (
                          <div key={i} className="bg-white/5 p-4 rounded-[20px] border border-white/5">
                            <div className="text-[10px] font-black text-emerald-500 uppercase mb-2">{name}</div>
                            <div className="flex flex-wrap gap-2">
                              {emps.map((e: any, j: number) => (
                                <span key={j} className="text-[8px] font-bold text-gray-500 bg-black/40 px-2 py-0.5 rounded-md">{e.deviceUserId}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-20 text-center space-y-4 opacity-30">
                  <Search className="w-12 h-12 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]">Matrix Clear - No Conflicts Scanned</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-8">
          {/* Database Exploration */}
          <div className="app-card p-10 space-y-8">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2"><List className="w-4 h-4 text-blue-600" /> Operational Shards</h3>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {discoveredTables.map(t => (
                <div key={t.name} className="flex justify-between items-center p-4 bg-gray-50 rounded-2xl border border-transparent hover:border-blue-100 group transition-all">
                  <div>
                    <p className="text-[10px] font-black text-gray-800 line-clamp-1 group-hover:text-blue-600 transition-colors uppercase tracking-widest">{t.name}</p>
                    <p className="text-[8px] font-bold text-gray-400 mt-1">Status: Indexed</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-gray-900 group-hover:scale-110 transition-transform origin-right">{t.rowCount?.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
            <button onClick={discoverTables} className="w-full py-4 bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all flex items-center justify-center space-x-2">
              <RotateCcw className="w-4 h-4" />
              <span>Rescan Shards</span>
            </button>
          </div>

          <div className="app-card p-10 bg-blue-600 text-white space-y-6 relative overflow-hidden">
            <div className="absolute bottom-[-20%] left-[-20%] w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
            <h3 className="text-xl font-extrabold italic relative z-10">Advanced <span className="text-blue-200">Ingestion</span></h3>
            <p className="text-[10px] font-bold text-blue-100/70 leading-relaxed relative z-10 uppercase tracking-widest">Full sequence historical scan from 2020 registry. Total timeline reconstruction.</p>
            <button onClick={triggerFullSync} className="w-full py-4 bg-white text-blue-600 font-black text-[11px] uppercase tracking-widest rounded-2xl hover:scale-105 transition-all shadow-2xl shadow-blue-900/40 relative z-10">
              Initiate Deep Scan
            </button>
          </div>

          <div className="app-card p-10 space-y-4 border-dashed border-2">
            <div className="flex items-center space-x-2 text-blue-600">
              <ShieldCheck className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest">Security Protocol</span>
            </div>
            <p className="text-xs font-bold text-gray-500 leading-relaxed">
              Sync diagnostics bypass encryption to verify raw device logs. Ensure unauthorized sessions are terminated before performing <strong className="text-gray-900">Deep Scan</strong> or <strong className="text-gray-900">Authorization Merges</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
