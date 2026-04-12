import { useLocation } from 'react-router-dom';
import { Bell } from 'lucide-react';

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
  const segment = pathname.split('/').pop();
  const title = PAGE_TITLES[segment] || 'Admin Panel';

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 z-30 shadow-sm">
      <div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        <p className="text-xs text-gray-400">
          {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button className="relative p-2 rounded-xl hover:bg-gray-50 text-gray-500 transition-colors">
          <Bell size={20} />
        </button>
        <div className="w-px h-6 bg-gray-200" />
        <span className="text-xs text-gray-400 font-medium">
          {import.meta.env.VITE_APP_NAME}
        </span>
      </div>
    </header>
  );
}
