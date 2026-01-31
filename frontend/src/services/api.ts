import axios from 'axios';

const API_URL = import.meta.env.REACT_APP_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
<<<<<<< HEAD
  login: (username: string, password: string, companyCode: string) =>
    api.post('/auth/login', { username, password, companyCode }),
  changePassword: (username: string, currentPassword: string, newPassword: string, companyCode: string) =>
    api.post('/auth/change-password', { username, currentPassword, newPassword, companyCode }),
=======
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  changePassword: (username: string, currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { username, currentPassword, newPassword }),
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
};

// Employees API
export const employeesAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/employees', { params }),
  getById: (id: string) =>
    api.get(`/employees/${id}`),
  create: (data: any) =>
    api.post('/employees', data),
  update: (id: string, data: any) =>
    api.put(`/employees/${id}`, data),
  bulkUpdate: (ids: string[], data: any) =>
    api.post('/employees/bulk-update', { ids, data }),
  delete: (id: string) =>
    api.delete(`/employees/${id}`),
  importBankDetails: (data: { records: any[] }) =>
    api.post('/employees/import-bank-details', data),
  repairUserAccounts: () =>
    api.post('/employees/repair-user-accounts'),
};

// Holidays API
export const holidaysAPI = {
  getAll: (year?: number) => api.get('/holidays', { params: year ? { year } : undefined }),
  getMonthly: (month: number, year: number) => api.get('/holidays/monthly', { params: { month, year } }),
  create: (data: any) => api.post('/holidays', data),
  update: (id: string, data: any) => api.put(`/holidays/${id}`, data),
  delete: (id: string) => api.delete(`/holidays/${id}`),
};

// Departments API
export const departmentsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/departments', { params }),
  getById: (id: string) =>
    api.get(`/departments/${id}`),
  create: (data: any) =>
    api.post('/departments', data),
  update: (id: string, data: any) =>
    api.put(`/departments/${id}`, data),
  delete: (id: string) =>
    api.delete(`/departments/${id}`),
};

// Designations API
export const designationsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/designations', { params }),
  getById: (id: string) =>
    api.get(`/designations/${id}`),
  create: (data: any) =>
    api.post('/designations', data),
  update: (id: string, data: any) =>
    api.put(`/designations/${id}`, data),
  delete: (id: string) =>
    api.delete(`/designations/${id}`),
};

// Shifts API
export const shiftsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/shifts', { params }),
  getById: (id: string) =>
    api.get(`/shifts/${id}`),
  create: (data: any) =>
    api.post('/shifts', data),
  update: (id: string, data: any) =>
    api.put(`/shifts/${id}`, data),
  delete: (id: string) =>
    api.delete(`/shifts/${id}`),
};

// Locations API
export const locationsAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/locations', { params }),
  getById: (id: string) =>
    api.get(`/locations/${id}`),
  create: (data: any) =>
    api.post('/locations', data),
  update: (id: string, data: any) =>
    api.put(`/locations/${id}`, data),
  delete: (id: string) =>
    api.delete(`/locations/${id}`),
};

// Branches API
export const branchesAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/branches', { params }),
  getById: (id: string) =>
    api.get(`/branches/${id}`),
  create: (data: any) =>
    api.post('/branches', data),
  update: (id: string, data: any) =>
    api.put(`/branches/${id}`, data),
  delete: (id: string) =>
    api.delete(`/branches/${id}`),
};

// Attendance API
export const attendanceAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/attendance', { params }),
  getSummary: (employeeId: string, params?: Record<string, string>) =>
    api.get(`/attendance/summary/${employeeId}`, { params }),
  getToday: () =>
    api.get('/attendance/today/all'),
  createManual: (data: any) =>
    api.post('/attendance/manual', data),
  getMonthlyReport: (params?: Record<string, string>) =>
    api.get('/attendance/monthly-report', { params }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () =>
    api.get('/dashboard/stats'),
  getRecentActivity: () =>
    api.get('/dashboard/recent-activity'),
  getChartData: () =>
    api.get('/dashboard/chart-data'),
};

// Reports API
export const reportsAPI = {
  getDaily: (params: Record<string, string>) =>
    api.get('/reports/daily', { params }),
  getWeekly: (params: Record<string, string>) =>
    api.get('/reports/weekly', { params }),
  getMonthly: (params: Record<string, string>) =>
    api.get('/reports/monthly', { params }),
  downloadExcel: (type: string, params: Record<string, string>) =>
    api.get(`/reports/${type}`, {
      params: { ...params, format: 'excel' },
      responseType: 'blob',
    }),
  downloadPDF: (type: string, params: Record<string, string>) =>
    api.get(`/reports/${type}`, {
      params: { ...params, format: 'pdf' },
      responseType: 'blob',
    }),
};

// Devices API
export const devicesAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/devices', { params }),
<<<<<<< HEAD
  create: (data: any) =>
    api.post('/devices', data),
  update: (id: string, data: any) =>
    api.put(`/devices/${id}`, data),
  delete: (id: string) =>
    api.delete(`/devices/${id}`),
  syncUsers: () =>
    api.post('/devices/sync-users'),
  recoveryLogs: (id: string, startDate: string) =>
    api.post(`/devices/${id}/log-recovery`, { startDate }),
=======
  syncUsers: () =>
    api.post('/devices/sync-users'),
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
};

// Sync API
export const syncAPI = {
  trigger: (fullSync?: boolean) => api.post('/sync/trigger', { fullSync }),
<<<<<<< HEAD
  reprocess: (data: { startDate?: string; endDate?: string; employeeId?: string }) =>
    api.post('/sync/reprocess-historical', data),
=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
  reset: () => api.post('/sync/reset'),
  testConnection: () => api.get('/sync/test-connection'),
  getStatus: () => api.get('/sync/status'),
  preview: (limit?: number, table?: string) => api.get('/sync/preview', { params: { limit, table } }),
  discoverTables: () => api.get('/sync/discover-tables'),
  getUnmatchedUsers: (table?: string) => api.get('/sync/unmatched-users', { params: { table } }),
  syncNames: () => api.post('/sync/sync-names'),
  discoverAllTables: () => api.get('/sync/discover-all-tables'),
  getSqlDeviceUsers: () => api.get('/sync/sql-device-users'),
  queryTable: (tableName: string, limit?: number) => api.get(`/sync/query-table/${tableName}`, { params: { limit } }),
  getDuplicates: () => api.get('/fix-duplicates', {
    params: { format: 'json' },
    headers: { 'Accept': 'application/json' }
  }),
  mergeDuplicates: () => api.post('/fix-duplicates'),
};

export const leavesAPI = {
  getTypes: () => api.get('/leaves/types'),
  createType: (data: any) => api.post('/leaves/types', data),
  getAll: (params?: any) => api.get('/leaves', { params }),
  create: (data: any) => api.post('/leaves', data),
  approveManager: (id: string) => api.patch(`/leaves/${id}/approve-manager`),
  approveCEO: (id: string) => api.patch(`/leaves/${id}/approve-ceo`),
  reject: (id: string, reason?: string) => api.patch(`/leaves/${id}/reject`, { reason }),
  delete: (id: string) => api.delete(`/leaves/${id}`),
};

export const payrollAPI = {
  get: (params: any) => api.get('/payroll', { params }), // legacy
  getRuns: () => api.get('/payroll/runs'),
  createRun: (data: any) => api.post('/payroll/runs', data),
  processRun: (id: string) => api.post(`/payroll/runs/${id}/process`),
  processSingle: (runId: string, employeeId: string) => api.post(`/payroll/runs/${runId}/process-single`, { employeeId }),
  getRunDetails: (id: string) => api.get(`/payroll/runs/${id}`),
  finalizeRun: (id: string) => api.post(`/payroll/runs/${id}/finalize`),
  deleteRun: (id: string) => api.delete(`/payroll/runs/${id}`),
  exportBank: (id: string) => api.get(`/payroll/runs/${id}/export-bank`, { responseType: 'blob' }),
  generate: (data: any) => api.post('/payroll/generate', data),
  updateSalary: (employeeId: string, data: any) => api.put(`/payroll/salary/${employeeId}`, data),
  processPay: (data: any) => api.post('/payroll/process-pay', data),
};

export const fieldLogsAPI = {
  punch: (data: { type: 'IN' | 'OUT', location?: string, image?: string, remarks?: string }) =>
    api.post('/field-logs/punch', data),
  getMyPunches: () => api.get('/field-logs/my-punches'),
  getPending: () => api.get('/field-logs/pending'),
  approve: (data: { logId: string, status: 'approved' | 'rejected', remarks?: string }) =>
    api.post('/field-logs/approve', data),
};

export const settingsAPI = {
  get: () => api.get('/settings'),
  update: (data: any) => api.post('/settings', data),
};

<<<<<<< HEAD
// Tenants API (Superadmin only)
export const tenantsAPI = {
  getAll: () => api.get('/tenants'),
  create: (data: any) => api.post('/tenants', data),
  update: (id: string, data: any) => api.put(`/tenants/${id}`, data),
};

=======
>>>>>>> 3d0eb0a04349ba3760c3b41b88ef47f345d6486e
export default api;
