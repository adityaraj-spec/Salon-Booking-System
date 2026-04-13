import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const PAGE_TITLES = {
  dashboard: 'Dashboard',
  salons: 'Salons Management',
  services: 'Services & Prices',
  bookings: 'Bookings',
  customers: 'Customers',
  owners: 'Salon Owners',
  reports: 'Reports',
  settings: 'Settings',
  salon: 'My Salon',
  staff: 'My Staff',
};

export default function Header() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const segment = pathname.split('/').pop();
  const title = PAGE_TITLES[segment] || 'Admin Panel';

  const formatRole = (role) => {
    if (!role) return '';
    return role.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  };

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-30 shadow-sm">
      <div>
        <h1 className="text-xl font-serif font-black text-[#1a1a1a]">{title}</h1>
        <p className="text-[11px] font-bold text-[#D4AF37] uppercase tracking-widest mt-1">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors">
          <Bell size={20} />
        </button>
        <div className="w-px h-6 bg-gray-200" />
        <div className="flex flex-col items-end">
          <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none">
            {import.meta.env.VITE_APP_NAME || "SalonNow"}
          </span>
          <span className="text-[9px] text-[#D4AF37] font-black uppercase tracking-[0.2em] mt-1">
            {formatRole(user?.role)}
          </span>
        </div>
      </div>
    </header>
  );
}
