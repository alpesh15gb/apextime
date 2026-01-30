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
  ClipboardList
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

  const navItems = user?.role === 'employee'
    ? [
      { path: '/portal', icon: LayoutDashboard, label: 'Portal' },
      { path: '/attendance', icon: ClipboardCheck, label: 'My Attendance' },
      { path: '/leaves', icon: Calendar, label: 'My Leaves' },
    ]
    : [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/employees', icon: Users, label: 'Employees' },
      { path: '/attendance', icon: ClipboardCheck, label: 'Attendance' },
      { path: '/leaves', icon: Calendar, label: 'Leave' },
      { path: '/field-logs', icon: ClipboardList, label: 'Field Logs' },
      { path: '/payroll', icon: DollarSign, label: 'Payroll' },
      { path: '/reports', icon: FileSpreadsheet, label: 'Reports' },
      { path: '/settings', icon: Settings, label: 'Settings' },
    ];

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
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white text-lg">A</span>
            </div>
            {sidebarOpen && (
              <span className="font-bold text-xl tracking-wide text-white">APEXTIME</span>
            )}
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
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
              <img
                src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80"
                alt="Profile"
                className="w-8 h-8 rounded-full object-cover"
              />
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
