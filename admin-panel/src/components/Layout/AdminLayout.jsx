import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

export default function AdminLayout({ role }) {
  return (
    <div className="min-h-screen bg-[#fcfcfc]">
      <Sidebar role={role} />
      <Header />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
