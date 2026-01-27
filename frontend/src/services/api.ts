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
  login: (username: string, password: string) =>
    api.post('/auth/login', { username, password }),
  changePassword: (username: string, currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { username, currentPassword, newPassword }),
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
  delete: (id: string) =>
    api.delete(`/employees/${id}`),
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
  syncUsers: () =>
    api.post('/devices/sync-users'),
};

// Sync API
export const syncAPI = {
  trigger: () => api.post('/sync/trigger'),
  testConnection: () => api.get('/sync/test-connection'),
  getStatus: () => api.get('/sync/status'),
  preview: (limit?: number) => api.get('/sync/preview', { params: { limit } }),
};

export default api;
