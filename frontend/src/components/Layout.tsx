import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Building2,
  MapPin,
  Briefcase,
  Clock,
  Calendar,
  FileText,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  ChevronDown,
  RefreshCw,
  Sparkles,
  DollarSign,
  Settings,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [masterDataOpen, setMasterDataOpen] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = user?.role === 'employee'
    ? [
      { path: '/portal', icon: LayoutDashboard, label: 'Portal' },
      { path: '/leaves', icon: Calendar, label: 'Leave' },
    ]
    : [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Home' },
      { path: '/employees', icon: Users, label: 'Team' },
      { path: '/attendance', icon: Clock, label: 'Logs' },
      { path: '/leaves', icon: Calendar, label: 'Approval' },
      { path: '/payroll', icon: DollarSign, label: 'Payroll' },
    ];

  const adminNavItems = user?.role !== 'employee' ? [
    { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/employees', icon: Users, label: 'Employees' },
    { path: '/attendance', icon: Clock, label: 'Attendance' },
    { path: '/leaves', icon: Calendar, label: 'Approvals' },
    { path: '/monthly-report', icon: FileSpreadsheet, label: 'Reports' },
    { path: '/payroll', icon: DollarSign, label: 'Payroll' },
    { path: '/ceo-vault', icon: ShieldCheck, label: 'Exec Vault' },
    { path: '/settings', icon: Settings, label: 'Settings' },
    { path: '/sync-diagnostics', icon: RefreshCw, label: 'Sync' },
  ] : [];

  const masterDataItems = [
    { path: '/locations', icon: MapPin, label: 'Locations' },
    { path: '/branches', icon: Building2, label: 'Branches' },
    { path: '/departments', icon: Briefcase, label: 'Departments' },
    { path: '/shifts', icon: Calendar, label: 'Shifts' },
    { path: '/holidays', icon: Sparkles, label: 'Holidays' },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row">
      {/* Sidebar - Desktop Only */}
      <aside
        className={`bg-white border-r border-gray-200 transition-all duration-300 fixed h-full z-20 print:hidden ${sidebarOpen ? 'w-64' : 'w-20'
          } hidden md:block`}
      >
        <div className="h-16 flex items-center px-6 border-b border-gray-100">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {sidebarOpen && (
              <span className="font-bold text-lg text-gray-800 tracking-tight">APEXTIME</span>
            )}
          </div>
        </div>

        <nav className="p-4 space-y-1 mt-2">
          {(user?.role === 'employee' ? navItems : adminNavItems).map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-colors group ${isActive
                  ? 'bg-indigo-50 text-indigo-700 font-semibold'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
                }`
              }
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {sidebarOpen && <span className="text-sm">{item.label}</span>}
            </NavLink>
          ))}

          {user?.role !== 'employee' && (
            <div className="pt-4 mt-4 border-t border-gray-100">
              <button
                onClick={() => setMasterDataOpen(!masterDataOpen)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors group"
              >
                <div className="flex items-center space-x-3">
                  <Building2 className="w-5 h-5 flex-shrink-0" />
                  {sidebarOpen && <span className="text-sm font-medium">Master Data</span>}
                </div>
                {sidebarOpen && (
                  <ChevronDown
                    className={`w-4 h-4 transition-transform ${masterDataOpen ? 'rotate-180' : ''}`}
                  />
                )}
              </button>

              {sidebarOpen && masterDataOpen && (
                <div className="ml-9 mt-1 space-y-1">
                  {masterDataItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center space-x-3 px-3 py-2 rounded-md transition-colors ${isActive
                          ? 'text-indigo-600 font-semibold'
                          : 'text-gray-400 hover:text-gray-700 hover:bg-gray-50'
                        }`
                      }
                    >
                      <item.icon className="w-4 h-4 flex-shrink-0" />
                      <span className="text-xs">{item.label}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>
          )}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded bg-gray-200 flex items-center justify-center font-bold text-gray-500 text-xs">
                  {user?.username?.[0] || 'A'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-gray-700 truncate">{user?.username}</p>
                  <p className="text-[10px] text-gray-400 capitalize">{user?.role}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 flex items-center justify-around md:hidden z-50">
        {navItems.slice(0, 4).map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) =>
              `flex flex-col items-center justify-center w-full h-full ${isActive ? 'text-indigo-600' : 'text-gray-400'}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium mt-1">{item.label}</span>
          </NavLink>
        ))}
        <button onClick={handleLogout} className="flex flex-col items-center justify-center w-full h-full text-gray-400">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-medium mt-1">Exit</span>
        </button>
      </nav>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 print:m-0 print:p-0 mb-16 md:mb-0 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'
          }`}
      >
        <div className="p-4 md:p-8 print:p-0 print:m-0 max-w-[1400px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
