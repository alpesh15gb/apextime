import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { EmployeeForm } from './pages/EmployeeForm';
import { Departments } from './pages/Departments';
import { Shifts } from './pages/Shifts';
import { Locations } from './pages/Locations';
import { Branches } from './pages/Branches';
import { Attendance } from './pages/Attendance';
import { Reports } from './pages/Reports';
import { MonthlyReport } from './pages/MonthlyReport';
import { SyncDiagnostics } from './pages/SyncDiagnostics';
import { Holidays } from './pages/Holidays';
import { Payroll } from './pages/Payroll';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <Layout>
                  <Routes>
                    <Route path="/" element={<Navigate to="/dashboard" replace />} />
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/employees" element={<Employees />} />
                    <Route path="/employees/new" element={<EmployeeForm />} />
                    <Route path="/employees/edit/:id" element={<EmployeeForm />} />
                    <Route path="/departments" element={<Departments />} />
                    <Route path="/shifts" element={<Shifts />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/branches" element={<Branches />} />
                    <Route path="/attendance" element={<Attendance />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/monthly-report" element={<MonthlyReport />} />
                    <Route path="/holidays" element={<Holidays />} />
                    <Route path="/sync-diagnostics" element={<SyncDiagnostics />} />
                    <Route path="/payroll" element={<Payroll />} />
                  </Routes>
                </Layout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
