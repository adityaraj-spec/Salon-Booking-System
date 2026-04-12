import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Store, Scissors, Calendar, Users, UserCheck,
  BarChart2, Settings, LogOut, Scissors as ScissorsIcon, ChevronRight
} from 'lucide-react';

const SUPER_ADMIN_NAV = [
  { to: '/super-admin/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/super-admin/salons', icon: Store, label: 'Salons' },
  { to: '/super-admin/services', icon: Scissors, label: 'Services & Prices' },
  { to: '/super-admin/bookings', icon: Calendar, label: 'Bookings' },
  { to: '/super-admin/customers', icon: Users, label: 'Customers' },
  { to: '/super-admin/owners', icon: UserCheck, label: 'Salon Owners' },
  { to: '/super-admin/reports', icon: BarChart2, label: 'Reports' },
  { to: '/super-admin/settings', icon: Settings, label: 'Settings' },
];

const OWNER_NAV = [
  { to: '/owner/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/owner/salon', icon: Store, label: 'My Salon' },
  { to: '/owner/services', icon: Scissors, label: 'My Services' },
  { to: '/owner/bookings', icon: Calendar, label: 'My Bookings' },
  { to: '/owner/staff', icon: Users, label: 'My Staff' },
  { to: '/owner/reports', icon: BarChart2, label: 'Reports' },
];

export default function Sidebar({ role }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const navItems = role === 'super_admin' ? SUPER_ADMIN_NAV : OWNER_NAV;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <aside className="fixed top-0 left-0 h-full w-64 bg-gray-900 text-white flex flex-col z-40 shadow-xl">
      {/* Logo */}
      <div className="px-6 py-5 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <ScissorsIcon size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-white text-sm leading-none">SalonNow</p>
            <p className="text-gray-400 text-[11px] mt-0.5">
              {role === 'super_admin' ? 'Super Admin' : 'Owner Panel'}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`
            }
          >
            <Icon size={17} className="shrink-0" />
            <span className="flex-1">{label}</span>
            <ChevronRight size={13} className="opacity-0 group-hover:opacity-40 transition-opacity" />
          </NavLink>
        ))}
      </nav>

      {/* User info + logout */}
      <div className="px-3 py-4 border-t border-gray-800">
        <div className="flex items-center gap-3 px-3 py-2.5 mb-2 rounded-xl bg-gray-800">
          <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
            {user?.fullName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-semibold truncate">{user?.fullName}</p>
            <p className="text-gray-400 text-[10px] truncate capitalize">{user?.role?.replace('_', ' ')}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all text-sm font-medium"
        >
          <LogOut size={17} />
          Logout
        </button>
      </div>
    </aside>
  );
}
