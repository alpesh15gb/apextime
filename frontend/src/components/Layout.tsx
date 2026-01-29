import { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
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
  Search,
  Bell,
  ChevronRight,
  ClipboardList,
  CheckCircle,
  Filter,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const menuGroups = user?.role === 'employee'
    ? [
      {
        title: 'Main Menu',
        items: [
          { path: '/portal', icon: LayoutDashboard, label: 'Portal' },
          { path: '/leaves', icon: Calendar, label: 'Leave' },
        ]
      }
    ]
    : [
      {
        title: 'Main Menu',
        items: [
          { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
          { path: '/attendance', icon: ClipboardList, label: 'Attendance' },
          { path: '/payroll', icon: DollarSign, label: 'Payroll' },
        ]
      },
      {
        title: 'Management',
        items: [
          { path: '/employees', icon: Users, label: 'Employees' },
          { path: '/departments', icon: Briefcase, label: 'Departments' },
          { path: '/branches', icon: Building2, label: 'Branches' },
        ]
      },
      {
        title: 'Reports & Sync',
        items: [
          { path: '/monthly-report', icon: FileSpreadsheet, label: 'Reports' },
          { path: '/ceo-vault', icon: ShieldCheck, label: 'Exec Vault' },
          { path: '/sync-diagnostics', icon: RefreshCw, label: 'Sync' },
        ]
      },
      {
        title: 'System',
        items: [
          { path: '/settings', icon: Settings, label: 'Settings' },
        ]
      }
    ];

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/dashboard') return 'Dashboard';
    if (path === '/employees') return 'Employees';
    if (path === '/attendance') return 'Attendance';
    if (path === '/payroll') return 'Payroll';
    return 'Human Resources';
  };

  return (
    <div className="min-h-screen bg-[#F9FAFB] flex flex-col md:flex-row">
      {/* Sidebar */}
      <aside
        className={`bg-white border-r border-gray-100 transition-all duration-300 fixed h-full z-20 print:hidden ${sidebarOpen ? 'w-64' : 'w-20'
          } hidden md:block`}
      >
        <div className="h-20 flex items-center px-8">
          <div className="flex items-center space-x-3 overflow-hidden">
            <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-red-600" />
            </div>
            {sidebarOpen && (
              <span className="font-extrabold text-xl text-gray-900 tracking-tight">EasyHR</span>
            )}
          </div>
        </div>

        <nav className="px-4 pb-20 space-y-8 overflow-y-auto h-[calc(100vh-80px)] custom-scrollbar">
          {menuGroups.map((group, idx) => (
            <div key={idx} className="space-y-2">
              {sidebarOpen && (
                <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
                  {group.title}
                </p>
              )}
              <div className="space-y-1">
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center group transition-all duration-200 ${isActive ? 'nav-item-active' : 'nav-item'
                      }`
                    }
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${sidebarOpen ? '' : 'mx-auto'}`} />
                    {sidebarOpen && <span className="text-sm font-medium">{item.label}</span>}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}

          {/* Master Data as a special group for Admin */}
          {user?.role !== 'employee' && sidebarOpen && (
            <div className="space-y-2">
              <p className="px-4 text-[10px] font-bold text-gray-400 uppercase tracking-widest leading-loose">
                Support Tool
              </p>
              <NavLink to="/locations" className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                <MapPin className="w-5 h-5" />
                <span className="text-sm font-medium">Locations</span>
              </NavLink>
              <NavLink to="/shifts" className={({ isActive }) => `nav-item ${isActive ? 'nav-item-active' : ''}`}>
                <Calendar className="w-5 h-5" />
                <span className="text-sm font-medium">Work Calendar</span>
              </NavLink>
            </div>
          )}
        </nav>

        {/* User Sidebar Bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-50">
          <button
            onClick={handleLogout}
            className="w-full nav-item text-red-600 hover:bg-red-50"
          >
            <LogOut className="w-5 h-5" />
            {sidebarOpen && <span className="text-sm font-bold">Logout Session</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'md:ml-64' : 'md:ml-20'}`}>
        {/* Header Bar */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-gray-100 flex items-center justify-between px-8 sticky top-0 z-10 print:hidden">
          <div className="flex items-center space-x-6 flex-1">
            <div className="relative w-full max-w-md hidden lg:block">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search for employees, tasks, reports..."
                className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-red-100 transition-all text-sm"
              />
            </div>
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 text-gray-400 hover:bg-gray-50 rounded-xl md:hidden">
              <Menu className="w-6 h-6" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
              <Calendar className="w-4 h-4 text-gray-500" />
              <span className="text-xs font-bold text-gray-600">1 Oct - 30 Oct, 2025</span>
              <ChevronDown className="w-3 h-3 text-gray-400" />
            </div>

            <button className="relative p-2.5 bg-gray-50 text-gray-500 rounded-2xl hover:bg-gray-100 transition-colors">
              <Bell className="w-5 h-5" />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>

            <div className="h-10 w-px bg-gray-100 mx-2"></div>

            <div className="flex items-center space-x-3 pl-2">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-gray-900">{user?.username}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">{user?.role}</p>
              </div>
              <div className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center font-bold text-gray-500 overflow-hidden ring-2 ring-gray-50">
                {user?.username?.[0] || 'U'}
              </div>
            </div>
          </div>
        </header>

        {/* Content Container */}
        <main className="p-8 max-w-[1600px] mx-auto min-h-[calc(100vh-80px)]">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-100 flex items-center justify-around md:hidden z-50 print:hidden">
        <NavLink to="/dashboard" className={({ isActive }) => `flex flex-col items-center flex-1 ${isActive ? 'text-red-600' : 'text-gray-400'}`}>
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Home</span>
        </NavLink>
        <NavLink to="/employees" className={({ isActive }) => `flex flex-col items-center flex-1 ${isActive ? 'text-red-600' : 'text-gray-400'}`}>
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Team</span>
        </NavLink>
        <button onClick={handleLogout} className="flex flex-col items-center flex-1 text-gray-400">
          <LogOut className="w-5 h-5" />
          <span className="text-[10px] font-bold mt-1">Exit</span>
        </button>
      </nav>
    </div>
  );
};
