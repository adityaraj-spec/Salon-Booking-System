import { useState, useRef, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { Scissors, LogOut, ChevronDown, User, Calendar, Settings, Menu, X, Bell, CheckCircle2, Clock, LayoutDashboard, Heart } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useUI } from "../context/UIContext";
import { useNotification } from "../context/NotificationContext";
import axiosInstance from "../api/axiosConfig";


export function NavBar() {
    const { user, logout } = useAuth();
    const { navbarTheme } = useUI();
    const socket = useSocket();
    const { showNotification } = useNotification();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [scrolled, setScrolled] = useState(false);

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

    // Track scroll for transparent navbar
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20);
        };
        window.addEventListener('scroll', handleScroll);
        // initialize
        handleScroll();
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

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
            // If we get a 401, it means the session cookie is invalid/expired
            if (error.response?.status === 401) {
                console.warn("Notification fetch failed with 401. Session may have expired.");
                // We'll call logout to ensure the frontend state matches the backend
                logout();
            } else {
                console.error("Error fetching notifications:", error);
            }
        }
    };

    useEffect(() => {
        if (user) {
            fetchNotifications();
        }
    }, [user]);

    useEffect(() => {
        if (socket) {
            socket.on("newNotification", (notification) => {
                setNotifications(prev => [notification, ...prev]);
                setUnreadCount(prev => prev + 1);

                // Trigger real-time popup
                showNotification(
                    notification.message,
                    notification.type?.includes("confirmed") ? "success" : "info"
                );
            });

            return () => {
                socket.off("newNotification");
            };
        }
    }, [socket]);


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

    const isLandingPage = location.pathname === '/';
    const isTransparent = isLandingPage && !scrolled;
    const isDark = navbarTheme === 'dark';

    return (
        <>
            <nav className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${isTransparent
                    ? 'bg-transparent border-transparent'
                    : 'bg-white/90 backdrop-blur-xl border-b border-gray-100/50 shadow-sm'
                }`}>
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <NavLink to="/home" className="text-[#D4AF37] cursor-pointer" >
                            <div className="bg-[#1a1a1a] p-2 rounded-full text-white">
                                <Scissors size={20} className="md:w-6 md:h-6" />
                            </div>
                        </NavLink>
                        <span className={`text-xl md:text-2xl font-serif font-semibold tracking-tight transition-colors duration-1000 ${isTransparent ? (isDark ? 'text-white' : 'text-gray-900') : 'text-[#1a1a1a]'}`}>Salon<span className="text-[#D4AF37]">Now</span></span>
                    </div>

                    {/* Desktop Navigation */}
                    <div className="hidden md:flex items-center gap-6">
                        <NavLink to="/home" className={`${isTransparent ? (isDark ? 'text-white' : 'text-gray-900') : 'text-[#1a1a1a]'} font-medium text-sm tracking-widest uppercase hover:text-[#D4AF37] transition-colors duration-1000`}>
                            Discover
                        </NavLink>

                        {user?.role === "salonOwner" && (
                            <div className="flex items-center gap-6">
                                {!hasSalon && (
                                    <NavLink to="/create-salon" className="bg-[#1a1a1a] hover:bg-black text-white px-5 py-2 rounded-full font-medium text-xs tracking-widest uppercase transition-colors flex items-center gap-2">
                                        Add Your Shop
                                    </NavLink>
                                )}
                                <NavLink to="/salon/dashboard" className="text-[#1a1a1a] font-medium text-sm tracking-widest uppercase hover:text-[#D4AF37] transition-colors">
                                    Requests
                                </NavLink>

                            </div>
                        )}

                        {user ? (
                            <div className="flex items-center gap-4">
                                {/* Notifications Bell */}
                                <div className="relative" ref={notificationsRef}>
                                    <button
                                        onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                                        className="p-2.5 bg-gray-50 rounded-full text-gray-500 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 transition-all relative group"
                                    >
                                        <Bell size={20} />
                                        {unreadCount > 0 && (
                                            <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white ring-1 ring-red-500/20">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {isNotificationsOpen && (
                                        <div className="absolute right-0 mt-3 w-80 md:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-[60] animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                                            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-gray-50/30">
                                                <h3 className="font-bold text-gray-900">Notifications</h3>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={markAllAsRead}
                                                        className="text-[10px] uppercase font-black tracking-widest text-[#D4AF37] hover:text-black transition-colors"
                                                    >
                                                        Mark all as read
                                                    </button>
                                                )}
                                            </div>
                                            <div className="max-h-[400px] overflow-y-auto">
                                                {notifications.length > 0 ? (
                                                    <div className="divide-y divide-gray-50">
                                                        {notifications.map((notif) => (
                                                            <div
                                                                key={notif._id}
                                                                onClick={() => !notif.isRead && markAsRead(notif._id)}
                                                                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer flex gap-4 ${!notif.isRead ? 'bg-[#D4AF37]/5' : ''}`}
                                                            >
                                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${notif.type.includes('confirmed') ? 'bg-emerald-50 text-emerald-600' :
                                                                        notif.type.includes('rejected') ? 'bg-red-50 text-red-600' :
                                                                            'bg-blue-50 text-blue-600'
                                                                    }`}>
                                                                    <Clock size={18} />
                                                                </div>
                                                                <div className="flex-1">
                                                                    <p className={`text-sm ${!notif.isRead ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
                                                                        {notif.title}
                                                                    </p>
                                                                    <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{notif.message}</p>
                                                                    <p className="text-[10px] text-gray-400 mt-2 font-medium">
                                                                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {new Date(notif.createdAt).toLocaleDateString()}
                                                                    </p>
                                                                </div>
                                                                {!notif.isRead && <div className="w-2 h-2 rounded-full bg-[#D4AF37] mt-2 shrink-0"></div>}
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="p-10 text-center text-gray-400">
                                                        <Bell className="mx-auto mb-3 opacity-20" size={32} />
                                                        <p className="text-sm font-medium">Your notification center is empty</p>
                                                    </div>
                                                )}
                                            </div>
                                            {notifications.length > 0 && (
                                                <div className="p-3 bg-gray-50/50 border-t border-gray-50 text-center">
                                                    <button className="text-[10px] font-bold text-gray-400 hover:text-gray-900 uppercase tracking-widest">
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
                                        className="flex items-center gap-3 p-1.5 pr-4 bg-gray-50 hover:bg-gray-100 rounded-full transition-all group"
                                    >
                                        <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-sm md:text-base border-2 border-[#D4AF37]/30 group-hover:border-[#D4AF37] transition-all">
                                            {user.fullName?.charAt(0).toUpperCase()}
                                        </div>
                                        <div className="hidden lg:block text-left">
                                            <p className="text-xs font-bold text-gray-900 leading-none mb-1 capitalize truncate max-w-[100px]">
                                                {user.fullName?.split(' ')[0] || "User"}
                                            </p>
                                            <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider leading-none">
                                                {user.role}
                                            </p>
                                        </div>
                                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-300 ${isMenuOpen ? "rotate-180" : ""}`} />
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

                                            {user?.role === "user" && (
                                                <>
                                                    <NavLink
                                                        to="/bookings"
                                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                                        onClick={() => setIsMenuOpen(false)}
                                                    >
                                                        <Calendar size={18} />
                                                        Booking Details
                                                    </NavLink>

                                                    <NavLink
                                                        to="/favorites"
                                                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                                        onClick={() => setIsMenuOpen(false)}
                                                    >
                                                        <Heart size={18} />
                                                        My Favorites
                                                    </NavLink>
                                                </>
                                            )}

                                            <NavLink
                                                to="/settings"
                                                className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                                onClick={() => setIsMenuOpen(false)}
                                            >
                                                <Settings size={18} />
                                                Settings
                                            </NavLink>

                                            {user?.role === "salonOwner" && (
                                                <>
                                                    <button
                                                        onClick={() => {
                                                            setIsMenuOpen(false);
                                                            const token = localStorage.getItem('authToken');
                                                            window.open(`http://localhost:5174?token=${token}`, '_blank');
                                                        }}
                                                        className="w-full flex items-center justify-start gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                                    >
                                                        <LayoutDashboard size={18} />
                                                        Owner Dashboard
                                                    </button>
                                                    <NavLink
                                                        to="/salon/manage"
                                                        className="w-full flex items-center justify-start gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37] transition-colors"
                                                        onClick={() => setIsMenuOpen(false)}
                                                    >
                                                        <Scissors size={18} />
                                                        Edit Salon
                                                    </NavLink>
                                                </>
                                            )}

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
                            </div>
                        ) : (
                            <div className="flex items-center gap-4 ml-2">
                                <NavLink to="/login" className={`${isTransparent ? (isDark ? 'text-white hover:text-white/80' : 'text-gray-800 hover:text-black') : 'text-gray-800 hover:text-[#e65c00]'} font-medium text-sm tracking-widest uppercase transition-colors duration-1000`}>
                                    Login
                                </NavLink>
                                <NavLink to="/signup" className={`${isTransparent ? (isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-black') : 'bg-[#1a1a1a] text-white hover:bg-black'} px-6 py-2.5 rounded-full font-medium text-sm tracking-widest uppercase transition-colors duration-1000 shadow-md`}>
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
                </div>
            </nav>

            {/* Mobile Menu Sidebar & Backdrop - OUTSIDE the <nav> element to fix stacking context issues */}
            <div
                className={`fixed inset-0 bg-black/60 backdrop-blur-md z-[110] transition-opacity duration-300 md:hidden ${isMobileMenuOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
                    }`}
                onClick={() => setIsMobileMenuOpen(false)}
            />

            <div className={`fixed inset-y-0 right-0 w-[280px] bg-white z-[120] shadow-2xl transform transition-transform duration-300 ease-in-out md:hidden flex flex-col ${isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
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
                        className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
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
                                    className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                                        }`}
                                    onClick={() => setIsMobileMenuOpen(false)}
                                >
                                    Add Your Shop
                                </NavLink>
                            )}
                            <NavLink
                                to="/salon/dashboard"
                                className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                Requests
                            </NavLink>
                            <button
                                onClick={() => {
                                    setIsMobileMenuOpen(false);
                                    const token = localStorage.getItem('authToken');
                                    window.open(`http://localhost:5174?token=${token}`, '_blank');
                                }}
                                className="w-full flex items-center justify-start gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37] transition-all"
                            >
                                Admin Dashboard
                            </button>
                            <NavLink
                                to="/salon/manage"
                                className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                <Scissors size={18} className="shrink-0" />
                                Edit Salon
                            </NavLink>
                        </>
                    )}

                    {user?.role === "user" && (
                        <>
                            <NavLink
                                to="/bookings"
                                className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                My Bookings
                            </NavLink>

                            <NavLink
                                to="/favorites"
                                className={({ isActive }) => `flex items-center gap-4 px-4 py-3.5 rounded-2xl font-bold text-sm transition-all ${isActive ? "bg-[#1a1a1a] text-white shadow-lg shadow-black/10" : "text-gray-600 hover:bg-gray-50 hover:text-[#D4AF37]"
                                    }`}
                                onClick={() => setIsMobileMenuOpen(false)}
                            >
                                My Favorites
                            </NavLink>
                        </>
                    )}

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