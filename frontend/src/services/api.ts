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
  login: (username: string, password: string, companyCode: string) =>
    api.post('/auth/login', { username, password, companyCode }),
  changePassword: (username: string, currentPassword: string, newPassword: string, companyCode: string) =>
    api.post('/auth/change-password', { username, currentPassword, newPassword, companyCode }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => api.get('/dashboard/stats'),
};

// Master Data APIs
export const employeesAPI = {
  getAll: (params?: Record<string, string>) => api.get('/employees', { params }),
  getById: (id: string) => api.get(`/employees/${id}`),
  create: (data: any) => api.post('/employees', data),
  update: (id: string, data: any) => api.put(`/employees/${id}`, data),
  delete: (id: string) => api.delete(`/employees/${id}`),
  bulkUpdate: (ids: string[], data: any) => api.patch('/employees/bulk-update', { ids, data }),
  importBankDetails: (data: any) => api.post('/employees/import-bank-details', data),
  repairUserAccounts: () => api.post('/employees/repair-user-accounts'),
};

export const departmentsAPI = {
  getAll: () => api.get('/departments'),
  create: (data: any) => api.post('/departments', data),
  update: (id: string, data: any) => api.put(`/departments/${id}`, data),
  delete: (id: string) => api.delete(`/departments/${id}`),
};

export const branchesAPI = {
  getAll: () => api.get('/branches'),
  create: (data: any) => api.post('/branches', data),
  update: (id: string, data: any) => api.put(`/branches/${id}`, data),
  delete: (id: string) => api.delete(`/branches/${id}`),
};

export const shiftsAPI = {
  getAll: () => api.get('/shifts'),
  create: (data: any) => api.post('/shifts', data),
  update: (id: string, data: any) => api.put(`/shifts/${id}`, data),
  delete: (id: string) => api.delete(`/shifts/${id}`),
};

export const designationsAPI = {
  getAll: () => api.get('/designations'),
  create: (data: any) => api.post('/designations', data),
  update: (id: string, data: any) => api.put(`/designations/${id}`, data),
  delete: (id: string) => api.delete(`/designations/${id}`),
};

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  create: (data: any) => api.post('/categories', data),
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
};

export const locationsAPI = {
  getAll: () => api.get('/locations'),
  create: (data: any) => api.post('/locations', data),
  update: (id: string, data: any) => api.put(`/locations/${id}`, data),
  delete: (id: string) => api.delete(`/locations/${id}`),
};

export const attendanceAPI = {
  getAll: (params?: any) => api.get('/attendance', { params }),
  getSummary: (params?: any) => api.get('/attendance/summary', { params }),
  getMonthlyReport: (params?: any) => api.get('/attendance/monthly-report', { params }),
  update: (id: string, data: any) => api.put(`/attendance/${id}`, data),
};

export const holidaysAPI = {
  getAll: (year?: number) => api.get('/holidays', { params: { year } }),
  create: (data: any) => api.post('/holidays', data),
  update: (id: string, data: any) => api.put(`/holidays/${id}`, data),
  delete: (id: string) => api.delete(`/holidays/${id}`),
};

// Devices API
export const devicesAPI = {
  getAll: (params?: Record<string, string>) =>
    api.get('/devices', { params }),
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
};

// Sync API
export const syncAPI = {
  trigger: (fullSync?: boolean) => api.post('/sync/trigger', { fullSync }),
  reprocess: (data: { startDate?: string; endDate?: string; employeeId?: string }) =>
    api.post('/sync/reprocess-historical', data),
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
  exportTally: (id: string) => api.get(`/payroll/runs/${id}/export-tally`, { responseType: 'blob' }),
  generate: (data: any) => api.post('/payroll/generate', data),
  updateSalary: (employeeId: string, data: any) => api.put(`/payroll/salary/${employeeId}`, data),
  processPay: (data: any) => api.post('/payroll/process-pay', data),
};

export const reportsAPI = {
  downloadExcel: (type: string, params: any) =>
    api.get(`/reports/${type}/download/excel`, { params, responseType: 'blob' }),
  downloadPDF: (type: string, params: any) =>
    api.get(`/reports/${type}/download/pdf`, { params, responseType: 'blob' }),
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

// Tenants API (Superadmin only)
export const tenantsAPI = {
  getAll: () => api.get('/tenants'),
  create: (data: any) => api.post('/tenants', data),
  update: (id: string, data: any) => api.put(`/tenants/${id}`, data),
  resetPassword: (id: string, password?: string) => api.post(`/tenants/${id}/reset-admin`, { password }),
};

export const documentsAPI = {
  upload: (data: FormData) => api.post('/documents/upload', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  list: (employeeId: string) => api.get(`/documents/${employeeId}`),
  delete: (id: string) => api.delete(`/documents/${id}`),
};

export default api;
