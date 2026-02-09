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
import PayrollSettings from './pages/PayrollSettings';
import PayrollAdjustments from './pages/PayrollAdjustments';
import Form16 from './pages/Form16';
import LocationPayroll from './pages/LocationPayroll';
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
import { Students } from './pages/school/Students';
import { Admissions } from './pages/school/Admissions';
import { Sessions } from './pages/school/Sessions';
import { Classes } from './pages/school/Classes';
import { Subjects } from './pages/school/Subjects';
import { FeeSetup } from './pages/school/finance/FeeSetup';
import { FeeCollection } from './pages/school/finance/FeeCollection';
import { StudentAttendance } from './pages/school/StudentAttendance';
import { Transport } from './pages/school/Transport';
import { Library } from './pages/school/Library';
import { Timetable } from './pages/school/Timetable';
import { Invoices } from './pages/school/finance/Invoices';
import { OutdoorAttendance } from './pages/school/OutdoorAttendance';
import { MarkOutdoorAttendance } from './pages/school/MarkOutdoorAttendance';
import { Recruitment, Performance, Expenses, Training, Helpdesk, Visitors, Onboarding } from './pages/hcm/HCMModules';

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

                    {/* School Routes */}
                    <Route path="/students" element={<ModuleRoute module="employees"><Students /></ModuleRoute>} />
                    <Route path="/admissions" element={<ModuleRoute module="employees"><Admissions /></ModuleRoute>} />
                    <Route path="/student-attendance" element={<ModuleRoute module="employees"><StudentAttendance /></ModuleRoute>} />
                    <Route path="/outdoor-attendance" element={<ModuleRoute module="employees"><OutdoorAttendance /></ModuleRoute>} />
                    <Route path="/outdoor-entry" element={<ModuleRoute module="employees"><MarkOutdoorAttendance /></ModuleRoute>} />

                    {/* Academics */}
                    <Route path="/sessions" element={<ModuleRoute module="employees"><Sessions /></ModuleRoute>} />
                    <Route path="/classes" element={<ModuleRoute module="employees"><Classes /></ModuleRoute>} />
                    <Route path="/subjects" element={<ModuleRoute module="employees"><Subjects /></ModuleRoute>} />
                    <Route path="/timetable" element={<ModuleRoute module="employees"><Timetable /></ModuleRoute>} />

                    {/* Finance */}
                    <Route path="/fees" element={<ModuleRoute module="payroll"><FeeCollection /></ModuleRoute>} />
                    <Route path="/fees/setup" element={<ModuleRoute module="payroll"><FeeSetup /></ModuleRoute>} />
                    <Route path="/invoices" element={<ModuleRoute module="payroll"><Invoices /></ModuleRoute>} />

                    {/* School Services */}
                    <Route path="/transport" element={<ModuleRoute module="core"><Transport /></ModuleRoute>} />
                    <Route path="/library" element={<ModuleRoute module="core"><Library /></ModuleRoute>} />

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

                    {/* HCM Modules */}
                    <Route path="/recruitment" element={<ModuleRoute module="recruitment"><Recruitment /></ModuleRoute>} />
                    <Route path="/performance" element={<ModuleRoute module="performance"><Performance /></ModuleRoute>} />
                    <Route path="/expenses" element={<ModuleRoute module="expenses"><Expenses /></ModuleRoute>} />
                    <Route path="/training" element={<ModuleRoute module="training"><Training /></ModuleRoute>} />
                    <Route path="/helpdesk" element={<ModuleRoute module="helpdesk"><Helpdesk /></ModuleRoute>} />
                    <Route path="/visitors" element={<ModuleRoute module="visitors"><Visitors /></ModuleRoute>} />
                    <Route path="/onboarding" element={<ModuleRoute module="onboarding"><Onboarding /></ModuleRoute>} />
                    <Route path="/tenants" element={<Tenants />} />
                    <Route path="/payroll/settings" element={<ModuleRoute module="payroll"><PayrollSettings /></ModuleRoute>} />
                    <Route path="/payroll/adjustments" element={<ModuleRoute module="payroll"><PayrollAdjustments /></ModuleRoute>} />
                    <Route path="/payroll/form16" element={<ModuleRoute module="payroll"><Form16 /></ModuleRoute>} />
                    <Route path="/payroll/location" element={<ModuleRoute module="payroll"><LocationPayroll /></ModuleRoute>} />

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
