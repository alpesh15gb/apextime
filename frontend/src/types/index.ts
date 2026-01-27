export interface User {
  id: string;
  username: string;
  role: string;
}

export interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export interface Employee {
  id: string;
  employeeCode: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  branchId?: string;
  departmentId?: string;
  designationId?: string;
  categoryId?: string;
  shiftId?: string;
  deviceUserId?: string;
  dateOfJoining?: string;
  isActive: boolean;
  department?: Department;
  branch?: Branch;
  shift?: Shift;
  designation?: Designation;
  category?: Category;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  branchId?: string;
  branch?: Branch;
  isActive: boolean;
}

export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  gracePeriodIn: number;
  gracePeriodOut: number;
  isNightShift: boolean;
  isActive: boolean;
}

export interface Location {
  id: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  zipCode?: string;
  isActive: boolean;
  branches?: Branch[];
}

export interface Branch {
  id: string;
  name: string;
  code: string;
  locationId?: string;
  location?: Location;
  isActive: boolean;
}

export interface Designation {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

export interface AttendanceLog {
  id: string;
  employeeId: string;
  date: string;
  firstIn?: string;
  lastOut?: string;
  workingHours?: number;
  shiftStart?: string;
  shiftEnd?: string;
  lateArrival: number;
  earlyDeparture: number;
  status: string;
  totalPunches: number;
  employee?: Employee;
}

export interface DashboardStats {
  counts: {
    totalEmployees: number;
    activeEmployees: number;
    totalDepartments: number;
    totalBranches: number;
    devicesCount: number;
  };
  today: {
    present: number;
    absent: number;
    lateArrivals: number;
    attendanceRate: number;
  };
  yesterdayAttendance: number;
  lastSync: {
    lastSyncTime: string;
    recordsSynced: number;
    status: string;
  } | null;
}

export interface SyncStatus {
  id: string;
  lastSyncTime: string;
  recordsSynced: number;
  status: string;
  message: string;
  createdAt: string;
}
