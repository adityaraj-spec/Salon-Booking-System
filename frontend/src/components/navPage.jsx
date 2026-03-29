import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Scissors, LogOut, ChevronDown, User, Calendar, Settings } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function NavBar() {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Close menu when clicking outside
    useEffect(() => {
        function handleClickOutside(event) {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsMenuOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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

                {user?.role === "salonOwner" && (
                    <NavLink to="/create-salon" className="bg-[#1a1a1a] hover:bg-black text-white px-5 py-2 rounded-full font-medium text-xs tracking-widest uppercase transition-colors flex items-center gap-2">
                        Add Your Shop
                    </NavLink>
                )}

                {user ? (
                    <div className="relative ml-4" ref={menuRef}>
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="flex items-center gap-2 group focus:outline-none"
                        >
                            <div className="w-10 h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-lg border-2 border-[#D4AF37] group-hover:scale-105 transition-transform">
                                {user.fullName?.charAt(0).toUpperCase()}
                            </div>
                            <ChevronDown size={16} className={`text-gray-500 transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                <div className="px-4 py-3 border-b border-gray-50 mb-1">
                                    <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Account</p>
                                    <p className="text-sm font-bold text-gray-800 truncate">{user.fullName}</p>
                                </div>
                                
                                <NavLink 
                                    to="/profile" 
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <User size={18} />
                                    Profile
                                </NavLink>
                                
                                <NavLink 
                                    to="/bookings" 
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Calendar size={18} />
                                    Booking Details
                                </NavLink>
                                
                                <NavLink 
                                    to="/settings" 
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                    onClick={() => setIsMenuOpen(false)}
                                >
                                    <Settings size={18} />
                                    Settings
                                </NavLink>
                                
                                <div className="h-px bg-gray-100 my-1 mx-2"></div>
                                
                                <button 
                                    onClick={() => {
                                        setIsMenuOpen(false);
                                        logout();
                                    }}
                                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <LogOut size={18} />
                                    Logout
                                </button>
                            </div>
                        )}
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