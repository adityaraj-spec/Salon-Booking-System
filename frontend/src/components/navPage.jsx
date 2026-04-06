import { useState, useRef, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Scissors, LogOut, ChevronDown, User, Calendar, Settings, Menu, X, Bell, CheckCircle2, Clock, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import axiosInstance from "../api/axiosConfig";

export function NavBar() {
    const { user, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [hasSalon, setHasSalon] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);
    const menuRef = useRef(null);
    const notificationsRef = useRef(null);

    // Check if salon owner already has a shop
    useEffect(() => {
        const checkOwnership = async () => {
            if (user?.role === "salonOwner") {
                try {
                    const response = await axiosInstance.get("/salons/owner/my-salon");
                    if (response.data.success && response.data.data) {
                        setHasSalon(true);
                    }
                } catch (error) {
                    console.error("Error checking salon ownership:", error);
                }
            }
        };
        checkOwnership();
    }, [user]);

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
            if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
                setIsNotificationsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Fetch notifications
    const fetchNotifications = async () => {
        if (!user) return;
        try {
            const response = await axiosInstance.get("/notifications");
            if (response.data.success) {
                setNotifications(response.data.data);
                setUnreadCount(response.data.data.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error("Error fetching notifications:", error);
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
            // Polling every 1 minute for a "real-time" feel without web-sockets
            const interval = setInterval(fetchNotifications, 60000);
            return () => clearInterval(interval);
        }
    }, [user]);

    const markAsRead = async (id) => {
        try {
            await axiosInstance.patch(`/notifications/${id}/read`);
            setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (error) {
            console.error("Error marking notification as read:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            await axiosInstance.patch("/notifications/mark-all-read");
            setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            setUnreadCount(0);
        } catch (error) {
            console.error("Error marking all as read:", error);
        }
    };

    return (
        <>
            <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 py-4 bg-white/80 dark:bg-[#121212]/80 backdrop-blur-lg border-b border-gray-100/50 dark:border-gray-800/50 shadow-sm transition-all duration-300">
                <div className="flex items-center gap-2">
                    <NavLink to="/home" className="text-[#D4AF37] cursor-pointer" >
                        <div className="bg-[#1a1a1a] dark:bg-white p-2 rounded-full text-white dark:text-[#1a1a1a]">
                            <Scissors size={20} className="md:w-6 md:h-6" />
                        </div>
                    </NavLink>
                    <span className="text-xl md:text-2xl font-serif font-semibold tracking-tight dark:text-gray-100">Salon<span className="text-[#D4AF37]">Now</span></span>
                </div>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-6">
                    <NavLink to="/home" className="text-[#1a1a1a] dark:text-gray-300 font-medium text-sm tracking-widest uppercase hover:text-[#D4AF37] transition-colors">
                        Discover
                    </NavLink>

                    {user?.role === "salonOwner" && (
                        <div className="flex items-center gap-6">
                            {!hasSalon && (
                                <NavLink to="/create-salon" className="bg-[#1a1a1a] dark:bg-white hover:bg-black dark:hover:bg-gray-200 text-white dark:text-[#1a1a1a] px-5 py-2 rounded-full font-medium text-xs tracking-widest uppercase transition-colors flex items-center gap-2">
                                    Add Shop
                                </NavLink>
                            )}
                            <NavLink to="/salon/dashboard" className="text-[#1a1a1a] dark:text-gray-300 font-medium text-sm tracking-widest uppercase hover:text-[#D4AF37] transition-colors">
                                Requests
                            </NavLink>
                            <NavLink to="/salon/manage" className="text-[#1a1a1a] dark:text-gray-300 font-medium text-sm tracking-widest uppercase hover:text-[#D4AF37] transition-colors">
                                Manage
                            </NavLink>
                        </div>
                    )}

                    {user ? (
                        <div className="flex items-center gap-4">
                            {/* Theme Toggle */}
                            <button 
                                onClick={toggleTheme}
                                className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all"
                            >
                                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
                            </button>

                            {/* Notifications Bell */}
                            <div className="relative" ref={notificationsRef}>
                                <button 
                                    onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                    className="p-2.5 bg-gray-50 dark:bg-gray-800 rounded-full text-gray-500 dark:text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all relative group"
                                >
                                    <Bell size={20} />
                                    {unreadCount > 0 && (
                                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-[#121212] ring-1 ring-red-500/20">
                                            {unreadCount}
                                        </span>
                                    )}
                                </button>

                                {isNotificationsOpen && (
                                    <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white dark:bg-[#1e1e1e] rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                        <div className="p-5 border-b border-gray-50 dark:border-gray-800 flex items-center justify-between bg-gray-50/30 dark:bg-white/5">
                                            <h3 className="font-bold text-gray-900 dark:text-gray-100">Notifications</h3>
                                            {unreadCount > 0 && (
                                                <button 
                                                    onClick={markAllAsRead}
                                                    className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37] hover:text-black dark:hover:text-white transition-colors"
                                                >
                                                    Mark all read
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[400px] overflow-y-auto">
                                            {notifications.length > 0 ? (
                                                <div className="divide-y divide-gray-50 dark:divide-gray-800">
                                                    {notifications.map((notif) => (
                                                        <div 
                                                            key={notif._id} 
                                                            onClick={() => !notif.isRead && markAsRead(notif._id)}
                                                            className={`p-4 hover:bg-gray-50 dark:hover:bg-white/5 transition-colors cursor-pointer flex gap-4 ${!notif.isRead ? 'bg-[#D4AF37]/5' : ''}`}
                                                        >
                                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                                                notif.type.includes('confirmed') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 
                                                                notif.type.includes('rejected') ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 
                                                                'bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400'
                                                            }`}>
                                                                <Clock size={18} />
                                                            </div>
                                                            <div className="flex-1">
                                                                <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900 dark:text-gray-100' : 'text-gray-600 dark:text-gray-400'}`}>
                                                                    {notif.title}
                                                                </p>
                                                                <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                                                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 font-medium">
                                                                    {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                            {!notif.isRead && <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2 shrink-0"></div>}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="p-10 text-center text-gray-400 dark:text-gray-600">
                                                    <Bell className="mx-auto mb-3 opacity-20" size={32} />
                                                    <p className="text-sm font-medium">Your notification center is empty</p>
                                                </div>
                                            )}
                                        </div>
                                        {notifications.length > 0 && (
                                            <div className="p-3 bg-gray-50/50 dark:bg-white/5 border-t border-gray-50 dark:border-gray-800 text-center">
                                                <button className="text-[10px] font-bold text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-gray-100 uppercase tracking-widest">
                                                    View all activity
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="relative ml-2" ref={menuRef}>
                                <button 
                                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                                    className="flex items-center gap-3 p-1.5 pr-4 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-all group"
                                >
                                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1a1a1a] dark:bg-white flex items-center justify-center text-white dark:text-[#1a1a1a] font-bold text-sm md:text-base border-2 border-[#D4AF37]/30 group-hover:border-[#D4AF37] transition-all">
                                        {user.fullName?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="hidden lg:block text-left">
                                        <p className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-none mb-1 capitalize truncate max-w-[100px]">
                                            {user.fullName.split(' ')[0]}
                                        </p>
                                        <p className="text-[10px] font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wider leading-none">
                                            {user.role}
                                        </p>
                                    </div>
                                    <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
                                </button>

                            {isMenuOpen && (
                                <div className="absolute right-0 mt-3 w-56 bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-100 dark:border-gray-800 py-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                    <div className="px-4 py-3 border-b border-gray-50 dark:border-gray-800 mb-1">
                                        <p className="text-xs text-gray-400 dark:text-gray-500 font-semibold uppercase tracking-wider">Account</p>
                                        <p className="text-sm font-bold text-gray-800 dark:text-gray-100 truncate">{user.fullName}</p>
                                    </div>
                                    
                                    <NavLink 
                                        to="/profile" 
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#D4AF37] transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <User size={18} />
                                        Profile
                                    </NavLink>
                                    
                                    <NavLink 
                                        to="/bookings" 
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#D4AF37] transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Calendar size={18} />
                                        Booking Details
                                    </NavLink>
                                    
                                    <NavLink 
                                        to="/settings" 
                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-white/5 hover:text-[#D4AF37] transition-colors"
                                        onClick={() => setIsMenuOpen(false)}
                                    >
                                        <Settings size={18} />
                                        Settings
                                    </NavLink>
                                    
                                    <div className="h-px bg-gray-100 dark:bg-gray-800 my-1 mx-2"></div>
                                    
                                    <button 
                                        onClick={() => {
                                            setIsMenuOpen(false);
                                            logout();
                                        }}
                                        className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                                    >
                                        <LogOut size={18} />
                                        Logout
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center gap-4 ml-2">
                            <NavLink to="/login" className="text-gray-800 dark:text-gray-300 font-medium text-sm tracking-widest uppercase hover:text-[#e65c00] transition-colors">
                                Login
                            </NavLink>
                            <NavLink to="/signup" className="bg-[#1a1a1a] dark:bg-white hover:bg-black dark:hover:bg-gray-100 text-white dark:text-[#1a1a1a] px-6 py-2.5 rounded-full font-medium text-sm tracking-widest uppercase transition-colors">
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
                        <>
                            {!hasSalon && (
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
                                to="/salon/dashboard" 
                                className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                                    isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                                }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Requests
                            </NavLink>
                            <NavLink 
                                to="/salon/manage" 
                                className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${
                                    isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                                }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Manage
                            </NavLink>
                        </>
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