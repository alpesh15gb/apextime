import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  ClipboardCheck,
  Calendar,
  DollarSign,
  FileSpreadsheet,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  Mail,
  ChevronDown,
  ClipboardList,
  Briefcase,
  MapPin,
  Building2,
  Award,
  Database,
  FolderKanban,
  Cpu,
  CreditCard,
  Package,
  GraduationCap,
  BookOpen,
  Bus,
  Library

} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['Masters']); // Default expand Masters
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'employee'
    ? (user?.tenantType === 'SCHOOL'
      ? [
        { path: '/portal', icon: LayoutDashboard, label: 'Teacher Portal' },
        { path: '/attendance', icon: ClipboardCheck, label: 'My Attendance' },
        { path: '/leaves', icon: Calendar, label: 'My Leaves' },
        { path: '/outdoor-entry', icon: MapPin, label: 'Outdoor Entry' },
      ]
      : [
        { path: '/portal', icon: LayoutDashboard, label: 'Portal' },
        { path: '/attendance', icon: ClipboardCheck, label: 'My Attendance' },
        { path: '/leaves', icon: Calendar, label: 'My Leaves' },
        { path: '/field-logs', icon: ClipboardList, label: 'Field Punch' },
      ]
    )
    : user?.role === 'manager'
      ? (user?.tenantType === 'SCHOOL'
        ? [
          {
            label: 'My Class',
            icon: GraduationCap,
            children: [
              { path: '/student-attendance', icon: ClipboardCheck, label: 'Daily Register' },
              { path: '/outdoor-entry', icon: MapPin, label: 'Outdoor Entry' },
              { path: '/outdoor-attendance', icon: ClipboardList, label: 'Pending Logs' },
            ]
          },
          {
            label: 'My Portal',
            icon: Users,
            children: [
              { path: '/portal', icon: LayoutDashboard, label: 'My Stats' },
              { path: '/attendance', icon: ClipboardCheck, label: 'My Attendance' },
              { path: '/leaves', icon: Calendar, label: 'My Leaves' },
            ]
          }
        ]
        : [
          {
            label: 'Staff Leaves',
            icon: Briefcase,
            children: [
              { path: '/leaves', icon: Calendar, label: 'Leave Approvals' },
              { path: '/attendance', icon: ClipboardCheck, label: 'Staff Attendance' },
            ]
          },
          {
            label: 'My Info',
            icon: Users,
            children: [
              { path: '/leaves', icon: Calendar, label: 'My Leaves' },
              { path: '/field-logs', icon: ClipboardList, label: 'Field Punch' },
              { path: '/portal', icon: LayoutDashboard, label: 'My Portal' },
            ]
          }
        ]
      )
      : user?.role === 'superadmin'
        ? [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
          { path: '/tenants', icon: Building2, label: 'Tenants' },
          { path: '/settings', icon: Settings, label: 'System Settings' },
        ]
        : user?.tenantType === 'SCHOOL'
          ? [
            { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', module: 'core' },
            {
              label: 'Students',
              icon: GraduationCap,
              module: 'employees',
              children: [
                { path: '/students', icon: Users, label: 'All Students' },
                { path: '/admissions', icon: ClipboardList, label: 'New Admission' },
                { path: '/outdoor-attendance', icon: MapPin, label: 'Outdoor Logs' },
              ]
            },
            {
              label: 'Academics',
              icon: BookOpen,
              module: 'employees',
              children: [
                { path: '/sessions', icon: Calendar, label: 'Sessions' },
                { path: '/classes', icon: Building2, label: 'Classes' },
                { path: '/subjects', icon: BookOpen, label: 'Subjects' },
                { path: '/timetable', icon: Calendar, label: 'Timetable' },
              ]
            },
            { path: '/student-attendance', icon: ClipboardCheck, label: 'Student Attendance', module: 'attendance' },
            {
              label: 'Accounts',
              icon: DollarSign,
              module: 'payroll',
              children: [
                { path: '/fees', icon: DollarSign, label: 'Fee Collection' },
                { path: '/fees/setup', icon: Settings, label: 'Fee Setup' },
                { path: '/invoices', icon: FileSpreadsheet, label: 'Invoices' },
              ]
            },
            {
              label: 'Staff & Teachers',
              icon: Users,
              module: 'employees',
              children: [
                { path: '/employees', icon: Users, label: 'All Staff' },
                { path: '/attendance', icon: ClipboardCheck, label: 'Staff Attendance' },
                { path: '/leaves', icon: Calendar, label: 'Staff Leaves' },
              ]
            },
            { path: '/transport', icon: Bus, label: 'Transport', module: 'core' },
            { path: '/library', icon: Library, label: 'Library', module: 'core' },
            { path: '/devices', icon: Cpu, label: 'Attendance Devices', module: 'devices' },
            { path: '/reports', icon: FileSpreadsheet, label: 'Reports', module: 'reports' },
            { path: '/settings', icon: Settings, label: 'Settings', module: 'core' },
          ].filter(item => { /* Copy filter logic or reuse function */
            if (item.module === 'core') return true;
            if (!user?.modules) return false;
            return user.modules.includes(item.module);
          })
          : [
            { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard', module: 'core' },
            { path: '/employees', icon: Users, label: 'Employees', module: 'employees' },

            // Master Data Group (Only show if employees or core modules enabled)
            {
              label: 'Masters',
              icon: Database,
              module: 'employees',
              children: [
                { path: '/branches', icon: Building2, label: 'Branches' },
                { path: '/locations', icon: MapPin, label: 'Locations' },
                { path: '/designations', icon: Award, label: 'Designations' },
                { path: '/departments', icon: Briefcase, label: 'Departments' },
              ]
            },
            { path: '/attendance', icon: ClipboardCheck, label: 'Attendance', module: 'attendance' },
            { path: '/leaves', icon: Calendar, label: 'Leave', module: 'leaves' },
            { path: '/field-logs', icon: ClipboardList, label: 'Field Logs', module: 'field_logs' },
            { path: '/payroll', icon: DollarSign, label: 'Payroll', module: 'payroll' },
            { path: '/loans', icon: CreditCard, label: 'Loans', module: 'payroll' },
            { path: '/reports', icon: FileSpreadsheet, label: 'Reports', module: 'reports' },
            { path: '/projects', icon: FolderKanban, label: 'Projects', module: 'projects' },
            { path: '/assets', icon: Package, label: 'Assets', module: 'core' },

            { path: '/devices', icon: Cpu, label: 'Attendance Devices', module: 'devices' },
            { path: '/settings', icon: Settings, label: 'Settings', module: 'core' },
          ].filter(item => {
            // If item is core, always show
            if (item.module === 'core') return true;

            // If modules is undefined, assume NO extra modules (strict mode)
            if (!user?.modules) return false;

            // If modules is empty array (explicitly no modules), show only core (handled above)
            // So if we reach here and array is empty, return false.
            if (user.modules.length === 0) return false;

            return user.modules.includes(item.module);
          });

  const toggleMenu = (label: string) => {
    setExpandedMenus(prev =>
      prev.includes(label) ? prev.filter(p => p !== label) : [...prev, label]
    );
  };

  if (user?.role === 'employee') {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F3F4F6] flex font-sans">
      {/* Sidebar */}
      <aside
        className={`bg-[#111827] text-white transition-all duration-300 fixed h-full z-30 print:hidden flex flex-col ${sidebarOpen ? 'w-64' : 'w-20'
          }`}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800">
          <div className="flex items-center space-x-3 min-w-0 w-full">
            <div className="w-8 h-8 flex-shrink-0 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-lg">
                {user?.tenantName?.[0]?.toUpperCase() || 'A'}
              </span>
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg tracking-wide text-white truncate">
                {user?.tenantName?.toUpperCase() || 'APEXTIME'}
              </span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item: any) => (
            item.children ? (
              <div key={item.label} className="space-y-1">
                <button
                  onClick={() => toggleMenu(item.label)}
                  className={`flex items-center w-full px-3 py-3 rounded-lg text-gray-400 hover:bg-gray-800 hover:text-white transition-colors justify-between group`}
                >
                  <div className="flex items-center">
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </div>
                  {sidebarOpen && (
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedMenus.includes(item.label) ? 'rotate-180' : ''}`} />
                  )}
                </button>

                {/* Submenu */}
                {expandedMenus.includes(item.label) && sidebarOpen && (
                  <div className="pl-4 space-y-1 mt-1 bg-gray-800/20 rounded-xl pb-2">
                    {item.children.map((child: any) => (
                      <NavLink
                        key={child.path}
                        to={child.path}
                        className={({ isActive }) =>
                          `flex items-center px-3 py-2 rounded-lg transition-colors text-xs font-bold ${isActive
                            ? 'text-blue-400 bg-blue-900/10'
                            : 'text-gray-500 hover:text-white hover:bg-gray-800'
                          }`
                        }
                      >
                        <div className="w-1.5 h-1.5 rounded-full bg-current mr-3 opacity-50"></div>
                        <span>{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center px-3 py-3 rounded-lg transition-colors group ${isActive
                    ? 'bg-blue-600 text-white font-medium'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
                  }`
                }
              >
                <item.icon className={`w-5 h-5 flex-shrink-0 ${sidebarOpen ? 'mr-3' : 'mx-auto'}`} />
                {sidebarOpen && <span className="text-sm">{item.label}</span>}
              </NavLink>
            )
          ))}
        </nav>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className={`flex items-center w-full px-3 py-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors ${!sidebarOpen && 'justify-center'}`}
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="ml-3 text-sm">Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className={`flex-1 flex flex-col min-h-screen transition-all duration-300 ${sidebarOpen ? 'ml-64' : 'ml-20'}`}>

        {/* Header */}
        <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 sticky top-0 z-20">

          {/* Search Bar */}
          <div className="flex items-center flex-1 max-w-lg">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="mr-4 text-gray-500 hover:text-gray-700 md:hidden">
              <Menu className="w-6 h-6" />
            </button>
            <div className="relative w-full max-w-md hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-lg focus:ring-2 focus:ring-blue-500 text-sm transition-all"
              />
            </div>
          </div>

          {/* Right Area */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-500 hover:text-gray-700 relative">
              <Mail className="w-5 h-5" />
            </button>
            <button className="text-gray-500 hover:text-gray-700 relative">
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="h-8 w-px bg-gray-200 mx-2"></div>
            <div className="flex items-center space-x-3 cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm">
                {user?.username?.[0]?.toUpperCase() || 'A'}
              </div>
              <div className="hidden md:block">
                <ChevronDown className="w-4 h-4 text-gray-500" />
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="p-6 bg-[#F3F4F6] flex-1">
          {children}
        </main>
      </div>
    </div>
  );
};
