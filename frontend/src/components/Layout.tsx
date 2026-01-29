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
      { path: '/portal', icon: LayoutDashboard, label: 'Personal Portal' },
    ]
    : [
      { path: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/employees', icon: Users, label: 'Employees' },
      { path: '/attendance', icon: Clock, label: 'Attendance' },
      { path: '/leaves', icon: Calendar, label: 'Approvals' },
      { path: '/monthly-report', icon: FileSpreadsheet, label: 'Monthly Report' },
      { path: '/payroll', icon: DollarSign, label: 'Payroll' },
      { path: '/sync-diagnostics', icon: RefreshCw, label: 'Sync Diagnostics' },
    ];

  const masterDataItems = user?.role !== 'employee' ? [
    { path: '/locations', icon: MapPin, label: 'Locations' },
    { path: '/branches', icon: Building2, label: 'Branches' },
    { path: '/departments', icon: Briefcase, label: 'Departments' },
    { path: '/shifts', icon: Calendar, label: 'Shifts' },
    { path: '/holidays', icon: Sparkles, label: 'Holidays' },
  ] : [];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex">
      {/* Sidebar */}
      <aside
        className={`bg-slate-900 text-white transition-all duration-300 fixed h-full z-20 print:hidden shadow-2xl ${sidebarOpen ? 'w-64' : 'w-20'
          }`}
      >
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/5">
          {sidebarOpen ? (
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/40">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <span className="font-black text-xl tracking-tighter">APEX<span className="text-indigo-400">TIME</span></span>
            </div>
          ) : (
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto shadow-lg shadow-indigo-500/40">
              <Sparkles className="w-6 h-6 text-white" />
            </div>
          )}
        </div>

        <nav className="p-4 space-y-2 mt-4">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${isActive
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold scale-[1.02]'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`
              }
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 transition-transform duration-300 group-hover:scale-110`} />
              {sidebarOpen && <span className="text-sm tracking-wide">{item.label}</span>}
            </NavLink>
          ))}

          {/* Master Data Dropdown */}
          <div className="pt-4 mt-4 border-t border-white/5">
            <button
              onClick={() => setMasterDataOpen(!masterDataOpen)}
              className="w-full flex items-center justify-between px-4 py-3 rounded-2xl text-slate-400 hover:bg-white/5 hover:text-white transition-all group"
            >
              <div className="flex items-center space-x-3">
                <Building2 className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                {sidebarOpen && <span className="text-sm font-medium tracking-wide">Master Data</span>}
              </div>
              {sidebarOpen && (
                <ChevronDown
                  className={`w-4 h-4 transition-transform duration-300 ${masterDataOpen ? 'rotate-180' : ''}`}
                />
              )}
            </button>

            {sidebarOpen && masterDataOpen && (
              <div className="ml-4 mt-2 space-y-1 animate-in slide-in-from-top-2 duration-300">
                {masterDataItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    className={({ isActive }) =>
                      `flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 ${isActive
                        ? 'text-indigo-400 font-bold'
                        : 'text-slate-500 hover:text-white hover:bg-white/5'
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
        </nav>

        {/* User Profile */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/5 bg-slate-900/50 backdrop-blur-md">
          <div className="flex items-center justify-between bg-white/5 p-3 rounded-2xl">
            {sidebarOpen && (
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-400 flex items-center justify-center font-black text-xs">
                  {user?.username?.[0]?.toUpperCase() || 'A'}
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-black truncate uppercase tracking-tighter">{user?.username}</p>
                  <p className="text-[10px] text-slate-500 capitalize font-bold">{user?.role}</p>
                </div>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl text-slate-400 hover:bg-rose-500 hover:text-white transition-all"
              title="Logout"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 transition-all duration-300 print:m-0 print:p-0 ${sidebarOpen ? 'ml-64' : 'ml-20'
          }`}
      >
        <div className="p-10 print:p-0 print:m-0 max-w-[1600px] mx-auto">{children}</div>
      </main>
    </div>
  );
};
