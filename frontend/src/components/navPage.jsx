import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Scissors, LogOut, ChevronDown, User, Calendar, Settings, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";

export function NavBar() {
    const { user, logout } = useAuth();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const menuRef = useRef(null);

    // Lock body scroll when mobile menu is open
    useEffect(() => {
        if (isMobileMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => { document.body.style.overflow = 'unset'; };
    }, [isMobileMenuOpen]);

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
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-white/80 backdrop-blur-lg border-b border-gray-100/50 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                    <NavLink to="/home" className="text-[#D4AF37] cursor-pointer" >
                        <div className="bg-[#1a1a1a] p-2 rounded-full text-white">
                            <Scissors size={20} className="md:w-6 md:h-6" />
                        </div>
                    </NavLink>
                    <span className="text-xl md:text-2xl font-serif font-semibold tracking-tight">Salon<span className="text-[#D4AF37]">Now</span></span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <NavLink to="/home" className="text-[#1a1a1a] font-medium text-sm tracking-widest uppercase hover:text-[#D4AF37] transition-colors">
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

                {/* Mobile Menu Button */}
                <div className="md:hidden flex items-center gap-4">
                    {user && (
                        <NavLink to="/profile" className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-xs border border-[#D4AF37]">
                            {user.fullName?.charAt(0).toUpperCase()}
                        </NavLink>
                    )}
                    <button 
                        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        className="text-gray-900 focus:outline-none p-1"
                    >
                        {isMobileMenuOpen ? <X size={28} /> : <Menu size={28} />}
                    </button>
                </div>
            </nav>

            {/* Mobile Menu Sidebar & Backdrop - OUTSIDE the <nav> element to fix stacking context issues */}
            <div 
                className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[60] transition-opacity duration-300 md:hidden ${
                    isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                }`}
                onClick={() => setIsMobileMenuOpen(false)}
            />
            
            <div className={`fixed inset-y-0 right-0 w-[280px] bg-white z-[70] shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${
                isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
            }`}>
                {/* Sidebar Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
                    <div className="flex items-center gap-2">
                        <div className="bg-[#1a1a1a] p-1.5 rounded-full text-white shadow-sm">
                            <Scissors size={16} />
                        </div>
                        <span className="text-lg font-serif font-bold tracking-tight text-gray-900">
                            Salon<span className="text-[#D4AF37]">Now</span>
                        </span>
                    </div>
                    <button 
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Sidebar Links */}
                <div className="flex-1 overflow-y-auto py-6 px-4 space-y-2 bg-white">
                    
                    <NavLink 
                        to="/home" 
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                            isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        Discover
                    </NavLink>
                    
                    {user?.role === "salonOwner" && (
                        <NavLink 
                            to="/create-salon" 
                            className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                                isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                            }`}
                            onClick={() => setIsMobileMenuOpen(false)}
                        >
                            Add Your Shop
                        </NavLink>
                    )}

                    <NavLink 
                        to="/bookings" 
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                            isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                        }`}
                        onClick={() => setIsMobileMenuOpen(false)}
                    >
                        My Bookings
                    </NavLink>

                    {user ? (
                        <>
                            <NavLink 
                                to="/profile" 
                                className="flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37] transition-all"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Profile
                            </NavLink>
                            <button 
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    logout();
                                }}
                                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm text-red-600 hover:bg-red-50 transition-all"
                            >
                                <LogOut size={18} />
                                Logout
                            </button>
                        </>
                    ) : (
                        <div className="space-y-3 px-2 pt-2">
                            <NavLink 
                                to="/login" 
                                className="block w-full text-center border-2 border-gray-100 py-3.5 rounded-2xl font-bold uppercase tracking-widest text-xs hover:border-[#1a1a1a] transition-all"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Login
                            </NavLink>
                            <NavLink 
                                to="/signup" 
                                className="block w-full text-center bg-[#1a1a1a] text-white py-3.5 rounded-2xl font-bold uppercase tracking-widest text-xs shadow-lg shadow-black/10 active:scale-[0.98] transition-all"
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Sign Up
                            </NavLink>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}