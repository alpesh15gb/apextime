import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { ModuleRoute } from './components/ModuleRoute';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { EmployeeForm } from './pages/EmployeeForm';
import { Departments } from './pages/Departments';
import { Shifts } from './pages/Shifts';
import { Locations } from './pages/Locations';
import { Branches } from './pages/Branches';
import { Designations } from './pages/Designations';
import { Attendance } from './pages/Attendance';
import { Reports } from './pages/Reports';
import { MonthlyReport } from './pages/MonthlyReport';
import { SyncDiagnostics } from './pages/SyncDiagnostics';
import { Holidays } from './pages/Holidays';
import { Payroll } from './pages/Payroll';
import { Leaves } from './pages/Leaves';
import { EmployeePortal } from './pages/EmployeePortal';
import { Settings } from './pages/Settings';
import { CEOAnalytics } from './pages/CEOAnalytics';
import { FieldLogs } from './pages/FieldLogs';
import { Projects } from './pages/Projects';
import { Loans } from './pages/Loans';
import Tenants from './pages/Tenants';
import Devices from './pages/Devices';
import { useAuth } from './contexts/AuthContext';
import Assets from './pages/Assets';


const HomeRedirect = () => {
  const { user } = useAuth();
  if (user?.role === 'employee') {
    return <Navigate to="/portal" replace />;
  }
  if (user?.role === 'manager') {
    return <Navigate to="/leaves" replace />;
  }
  // Remove strict superadmin redirect to allow dashboard access
  return <Navigate to="/dashboard" replace />;
};

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
                    <Route
                      path="/"
                      element={<HomeRedirect />}
                    />
                    <Route path="/dashboard" element={<ModuleRoute module="core"><Dashboard /></ModuleRoute>} />
                    <Route path="/employees" element={<ModuleRoute module="employees"><Employees /></ModuleRoute>} />
                    <Route path="/employees/new" element={<ModuleRoute module="employees"><EmployeeForm /></ModuleRoute>} />
                    <Route path="/employees/edit/:id" element={<ModuleRoute module="employees"><EmployeeForm /></ModuleRoute>} />

                    {/* Masters - Linked to Employees */}
                    <Route path="/departments" element={<ModuleRoute module="employees"><Departments /></ModuleRoute>} />
                    <Route path="/shifts" element={<ModuleRoute module="employees"><Shifts /></ModuleRoute>} />
                    <Route path="/locations" element={<ModuleRoute module="employees"><Locations /></ModuleRoute>} />
                    <Route path="/branches" element={<ModuleRoute module="employees"><Branches /></ModuleRoute>} />
                    <Route path="/designations" element={<ModuleRoute module="employees"><Designations /></ModuleRoute>} />

                    <Route path="/attendance" element={<ModuleRoute module="attendance"><Attendance /></ModuleRoute>} />
                    <Route path="/reports" element={<ModuleRoute module="reports"><Reports /></ModuleRoute>} />
                    <Route path="/monthly-report" element={<ModuleRoute module="reports"><MonthlyReport /></ModuleRoute>} />
                    <Route path="/holidays" element={<ModuleRoute module="attendance"><Holidays /></ModuleRoute>} />
                    <Route path="/sync-diagnostics" element={<ModuleRoute module="attendance"><SyncDiagnostics /></ModuleRoute>} />

                    <Route path="/payroll" element={<ModuleRoute module="payroll"><Payroll /></ModuleRoute>} />
                    <Route path="/leaves" element={<ModuleRoute module="leaves"><Leaves /></ModuleRoute>} />
                    <Route path="/field-logs" element={<ModuleRoute module="field_logs"><FieldLogs /></ModuleRoute>} />
                    <Route path="/loans" element={<ModuleRoute module="payroll"><Loans /></ModuleRoute>} />

                    <Route path="/portal" element={<ModuleRoute module="core"><EmployeePortal /></ModuleRoute>} />
                    <Route path="/settings" element={<ModuleRoute module="core"><Settings /></ModuleRoute>} />
                    <Route path="/ceo-vault" element={<ModuleRoute module="reports"><CEOAnalytics /></ModuleRoute>} />
                    <Route path="/projects" element={<ModuleRoute module="projects"><Projects /></ModuleRoute>} />
                    <Route path="/devices" element={<ModuleRoute module="devices"><Devices /></ModuleRoute>} />
                    <Route path="/assets" element={<ModuleRoute module="core"><Assets /></ModuleRoute>} />
                    <Route path="/tenants" element={<Tenants />} />

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
