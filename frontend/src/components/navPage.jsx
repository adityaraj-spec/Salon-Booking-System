import { NavLink } from 'react-router-dom';
import { Scissors, LogOut } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function NavBar() {
    const { user, logout } = useAuth();
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-12 py-4 bg-white/70 backdrop-blur-lg border-b border-gray-100/50 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2">
                <NavLink to="/home" className="text-[#D4AF37] cursor-pointer" >
                    <div className="bg-[#1a1a1a] p-2 rounded-full text-white">
                        <Scissors size={24} />
                    </div>
                </NavLink>
                <span className="text-2xl font-serif font-semibold tracking-tight">Salon<span className="text-[#D4AF37]">Now</span></span>
            </div>

            <div className="flex items-center gap-6">
                <NavLink to="/home" className="text-[#D4AF37] font-medium text-sm tracking-widest uppercase hover:opacity-80 transition-opacity">
                    Discover
                </NavLink>
                <NavLink to="/shops" className="text-gray-800 font-medium text-sm tracking-widest uppercase hover:text-black transition-colors">
                    Shops
                </NavLink>

                {user ? (
                    <div className="flex items-center gap-6 ml-2">
                        <div className="flex items-center gap-3">
                            <span className="text-sm font-medium text-gray-700">
                                Welcome, <span className="text-[#D4AF37] font-semibold">{user.fullName}</span>
                            </span>
                            <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-lg border-2 border-[#D4AF37]">
                                {user.fullName?.charAt(0).toUpperCase()}
                            </div>
                        </div>
                        <button 
                            onClick={logout}
                            className="flex items-center gap-2 text-gray-600 hover:text-red-600 font-medium text-sm tracking-widest uppercase transition-colors"
                        >
                            <LogOut size={18} />
                            Logout
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 ml-2">
                        <NavLink to="/login" className="text-gray-800 font-medium text-sm tracking-widest uppercase hover:text-[#e65c00] transition-colors">
                            Login
                        </NavLink>
                        <NavLink to="/signup" className="bg-[#1a1a1a] hover:bg-black text-white px-6 py-2.5 rounded-full font-medium text-sm tracking-widest uppercase transition-colors">
                            Sign Up
                        </NavLink>
                    </div>
                )}
            </div>
        </nav>
    );
}