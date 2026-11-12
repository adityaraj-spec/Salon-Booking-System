import { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Tag, Clock, MapPin, Star, ChevronLeft, ChevronRight, Heart, Sparkles, ChevronDown, Navigation, Loader2, Search, X, Scissors, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from "../context/UIContext";
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useCityResolution } from '../hooks/useCityResolution';
import axiosInstance from '../api/axiosConfig';
import { MiniSalonCardSkeleton, DestinationCardSkeleton } from '../components/skeletons/index.jsx';
import { getDynamicCities } from '../data/featuredCities.js';
import salonPlaceholder from '../assets/salon1.jpg';
import useDocumentTitle from '../hooks/useDocumentTitle';

const heroImages = [
    { url: "/adam-winger-KVVjmb3IIL8-unsplash.jpg", isDark: true },
    { url: "/benyamin-bohlouli-_C-S7LqxHPw-unsplash.jpg", isDark: false },
    { url: "/greg-trowman-jsuWg7IXx1k-unsplash.jpg", isDark: true },
    { url: "/guilherme-petri-PtOfbGkU3uI-unsplash.jpg", isDark: false }
];


const WHY_CHOOSE = [
    { icon: <Clock size={22} className="text-[#D4AF37]" />, title: "Live Line & Zero Waiting", desc: "Save your spot in line before stepping out and track your wait time in real time.", bg: "bg-amber-50" },
    { icon: <Scissors size={22} className="text-purple-500" />, title: "Available Chairs & Stylists", desc: "See open chairs and pick your preferred stylist with guaranteed timings.", bg: "bg-purple-50" },
    { icon: <Tag size={22} className="text-[#ff9f43]" />, title: "Upfront Best Prices", desc: "Clear, transparent service menus with verified pricing and no surprise checkout fees.", bg: "bg-orange-50" },
    { icon: <ShieldCheck size={22} className="text-emerald-500" />, title: "Verified Partner Salons", desc: "Every salon is handpicked and hygiene-certified to ensure guaranteed quality care.", bg: "bg-emerald-50" },
    { icon: <CheckCircle2 size={22} className="text-blue-500" />, title: "Quick Booking Codes", desc: "Just show your 4-digit code at the salon when you arrive.", bg: "bg-blue-50" },
    { icon: <Heart size={22} className="text-red-500" />, title: "Save Favorites & Points", desc: "Bookmark your go-to salons and earn loyalty reward points on every completed visit.", bg: "bg-red-50" },
];

export function LandingPage() {
    useDocumentTitle('Premium Grooming & Instant Salon Booking', 'Book top salons and wellness studios in 60 seconds. View live seat availability, verified stylists, and transparent pricing on SalonNow.');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { setNavbarTheme } = useUI();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const [featuredSalons, setFeaturedSalons] = useState([]);
    const [cheapestServices, setCheapestServices] = useState([]);
    const [dbCities, setDbCities] = useState([]);
    const [userFavorites, setUserFavorites] = useState([]);
    const [loading, setLoading] = useState(true);

    // City Resolution & Modal State (H1)
    const {
        resolvedCity,
        selectCity,
        detectLocation,
        detectingLocation,
        availableCities,
    } = useCityResolution();
    const [isCityModalOpen, setIsCityModalOpen] = useState(false);
    const [cityFilterText, setCityFilterText] = useState("");

    const handleUseLocation = async () => {
        const res = await detectLocation();
        if (res?.success) {
            showNotification(`Location detected: ${res.city}`, "success");
        } else {
            showNotification("Could not detect location. Please choose a city manually.", "info");
        }
    };

    const cheapSliderRef = useRef(null);
    const destSliderRef = useRef(null);

        // Dynamically derive active destination cities from active salons & database cities
    const dynamicCities = useMemo(() => {
        return getDynamicCities(featuredSalons, dbCities);
    }, [featuredSalons, dbCities]);

    const currentHero = heroImages[currentImageIndex];

    useEffect(() => {
        setNavbarTheme('dark'); // Force dark/white navigation links over the hero background
    }, [setNavbarTheme]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
        }, 6000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [salonsRes, cheapRes, citiesRes] = await Promise.all([
                    axiosInstance.get("/salons?limit=12"),
                    axiosInstance.get("/salons/cheapest?limit=15"),
                    axiosInstance.get("/salons/cities")
                ]);
                if (salonsRes.data?.success) setFeaturedSalons(salonsRes.data.data.salons);
                if (cheapRes.data?.success) setCheapestServices(cheapRes.data.data.services || []);
                if (citiesRes.data?.success) setDbCities(citiesRes.data.data || []);
            } catch (e) { /* silent */ }
            finally { setLoading(false); }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (user) {
            axiosInstance.get("/users/favorites")
                .then(res => { if (res.data.success) setUserFavorites(res.data.data.favorites.map(f => f._id || f)); })
                .catch(() => { });
        }
    }, [user]);

    const handleToggleFavorite = async (e, salonId) => {
        e.stopPropagation();
        if (!user) { showNotification("Please log in to save favorites.", "error"); navigate("/login"); return; }
        try {
            const res = await axiosInstance.post(`/users/favorites/${salonId}`);
            if (res.data.success) {
                const fav = res.data.data.isFavorited;
                setUserFavorites(prev => fav ? [...prev, salonId] : prev.filter(id => id !== salonId));
                showNotification(fav ? "Added to favorites!" : "Removed from favorites.", fav ? "success" : "info");
            }
        } catch (e) { showNotification("Failed to update favorites.", "error"); }
    };

    const scroll = (ref, dir) => {
        if (!ref.current) return;
        const firstChild = ref.current.children[0];
        if (!firstChild) return;
        const style = window.getComputedStyle(ref.current);
        const gap = parseInt(style.gap) || 16;
        const scrollAmount = firstChild.offsetWidth + gap;
        ref.current.scrollBy({ left: dir * scrollAmount, behavior: "smooth" });
    };

    const fadeUpVariants = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } } };
    const staggerContainer = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: 0.2 } } };

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans">

            {/* ── HERO SECTION ── */}
            <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={currentHero.url}
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "-100%", opacity: 0 }}
                        transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${currentHero.url}')` }}
                    >
                        {/* Consistent heavy backing tint for guaranteed text contrast */}
                        <div className="absolute inset-0 bg-black/65"></div>
                        <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/70"></div>
                    </motion.div>
                </AnimatePresence>

                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative z-10 px-4 sm:px-6 max-w-4xl mx-auto flex flex-col items-center pt-8">
                    {/* Brand Eyebrow Badge (L3) */}
                    <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-[#D4AF37]/50 text-[#ffd166] text-xs sm:text-sm font-semibold mb-5 shadow-xl">
                        <Scissors size={15} className="text-[#ffd166]" />
                        <span>SalonNow • Premium Grooming & Salons</span>
                    </motion.div>

                    {/* Dynamic H1 Headline */}
                    <motion.h1 
                        variants={fadeUpVariants} 
                        className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-white flex flex-wrap items-center justify-center gap-2 text-center leading-snug mb-6 drop-shadow-lg !text-white" 
                        style={{ color: '#ffffff' }}
                    >
                        <span>Book top salons in</span>
                        <span className="inline-flex items-center">
                            <button
                                type="button"
                                onClick={() => setIsCityModalOpen(true)}
                                className="inline-flex items-center gap-1.5 text-[#ffd166] hover:text-[#ffe49e] border-b-2 border-dashed border-[#ffd166]/70 hover:border-[#ffd166] transition-all cursor-pointer px-2.5 py-0.5 rounded-xl hover:bg-white/10 active:scale-95"
                                title="Change City"
                            >
                                <span>{resolvedCity}</span>
                                <ChevronDown size={22} className="text-[#ffd166] stroke-[2.5] inline-block -mb-0.5" />
                            </button>
                        </span>
                        <span>in 60 seconds</span>
                    </motion.h1>

                    {/* CTAs: Primary & Secondary (Use my location) */}
                    <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-3 sm:gap-4 w-full">
                        <NavLink 
                            to={`/home?city=${encodeURIComponent(resolvedCity)}`} 
                            className="w-full max-w-[260px] sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold rounded-xl flex items-center justify-center gap-2 transition-all duration-300 shadow-xl hover:shadow-2xl hover:-translate-y-0.5 hover:scale-[1.02] bg-[#ffd166] text-[#1a1a1a] hover:bg-[#ffc633]"
                        >
                            <span>Find Salons in {resolvedCity}</span>
                            <ArrowRight size={18} />
                        </NavLink>

                        <button 
                            type="button"
                            onClick={handleUseLocation}
                            disabled={detectingLocation}
                            className="w-full max-w-[260px] sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02] border border-white/80 text-white hover:bg-white/15 backdrop-blur-sm flex items-center justify-center gap-2 disabled:opacity-75"
                        >
                            {detectingLocation ? (
                                <>
                                    <Loader2 size={18} className="animate-spin text-[#ffd166]" />
                                    <span>Locating...</span>
                                </>
                            ) : (
                                <>
                                    <Navigation size={18} className="text-[#ffd166]" />
                                    <span>Use my location</span>
                                </>
                            )}
                        </button>

                        {!user && (
                            <NavLink 
                                to="/signup" 
                                className="w-full max-w-[260px] sm:w-auto px-5 py-2.5 sm:px-6 sm:py-3.5 text-sm sm:text-base font-semibold rounded-xl transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5 hover:scale-[1.02] border border-white/50 hover:border-white bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm flex items-center justify-center"
                            >
                                Sign up
                            </NavLink>
                        )}
                    </motion.div>
                </motion.div>
            </section>

            {/* City Selector Modal */}
            <AnimatePresence>
                {isCityModalOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/75 backdrop-blur-md"
                        onClick={() => setIsCityModalOpen(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, y: 15 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 15 }}
                            className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 tracking-tight">Select Your City</h3>
                                    <p className="text-xs text-gray-500 mt-0.5">Explore premier salons in your area</p>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setIsCityModalOpen(false)}
                                    className="p-2 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            {/* Search and GPS shortcut */}
                            <div className="py-4 space-y-3">
                                <div className="relative">
                                    <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                        type="text"
                                        placeholder="Search city by name..."
                                        value={cityFilterText}
                                        onChange={(e) => setCityFilterText(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                        autoFocus
                                    />
                                </div>

                                <button
                                    type="button"
                                    onClick={async () => {
                                        await handleUseLocation();
                                        setIsCityModalOpen(false);
                                    }}
                                    className="w-full py-2.5 px-3.5 rounded-xl bg-amber-50 hover:bg-amber-100/80 text-amber-900 border border-amber-200/60 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Navigation size={14} className="text-[#D4AF37]" />
                                    <span>Detect current city using GPS</span>
                                </button>
                            </div>

                            {/* Cities List */}
                            <div className="overflow-y-auto flex-1 pr-1 space-y-4 max-h-[50vh]">
                                {/* Active Cities with Salons */}
                                {availableCities.length > 0 && (
                                    <div>
                                        <p className="text-xs font-semibold text-gray-500 mb-2">
                                            Active Hubs (Salons Live)
                                        </p>
                                        <div className="grid grid-cols-2 gap-2">
                                            {availableCities
                                                .filter((c) =>
                                                    c.name.toLowerCase().includes(cityFilterText.toLowerCase())
                                                )
                                                .map((city) => (
                                                    <button
                                                        key={city.id || city.name}
                                                        type="button"
                                                        onClick={() => {
                                                            selectCity(city.name);
                                                            setIsCityModalOpen(false);
                                                        }}
                                                        className={`p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                                                            resolvedCity.toLowerCase() === city.name.toLowerCase()
                                                                ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                                                                : "bg-white hover:bg-gray-50 border-gray-100 text-[#1a1a1a]"
                                                        }`}
                                                    >
                                                        <span className="font-bold text-sm truncate">{city.name}</span>
                                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                                                            resolvedCity.toLowerCase() === city.name.toLowerCase()
                                                                ? "bg-[#D4AF37] text-white"
                                                                : "bg-gray-100 text-gray-600"
                                                        }`}>
                                                            {city.salonCount} {city.salonCount === 1 ? 'salon' : 'salons'}
                                                        </span>
                                                    </button>
                                                ))}
                                        </div>
                                    </div>
                                )}

                                {/* Dynamic Major Destinations */}
                                <div>
                                    <p className="text-xs font-semibold text-gray-500 mb-2">
                                        Active City Hubs
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {dynamicCities
                                            .filter((d) =>
                                                d.name.toLowerCase().includes(cityFilterText.toLowerCase())
                                            )
                                            .map((dest) => (
                                                <button
                                                    key={dest.name}
                                                    type="button"
                                                    onClick={() => {
                                                        selectCity(dest.name);
                                                        setIsCityModalOpen(false);
                                                    }}
                                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                                        resolvedCity.toLowerCase() === dest.name.toLowerCase()
                                                            ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                                                            : "bg-white hover:bg-gray-50 border-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    <p className="font-semibold text-xs truncate">{dest.name}</p>
                                                    <p className="text-[10px] text-gray-400 truncate">{dest.state}</p>
                                                </button>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>



            {/* ── POPULAR CITIES ── */}
            <section className="py-10 px-4 sm:px-6 lg:px-8 bg-white">
                <div className="max-w-7xl mx-auto">
                    <div className="my-12">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-4">Popular Cities</h2>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                            {dynamicCities.map((city) => (
                                <div 
                                    key={city.name}
                                    onClick={() => navigate(`/discover?city=${encodeURIComponent(city.name)}`)}
                                    className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all duration-300"
                                >
                                    <img src={city.image} alt={city.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-4">
                                        <h3 className="text-base sm:text-lg font-semibold text-white">{city.name}</h3>
                                        <p className="text-gray-300 text-xs">{city.state}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CHEAPEST SERVICES SLIDER ── */}
            {(loading || cheapestServices.length > 0) && (
                <section className="py-10 px-4 sm:px-6 lg:px-8">
                    <div className="max-w-7xl mx-auto">
                        <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4 gap-2">
                                <div className="flex items-baseline gap-3">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">Cheapest Services</h2>
                                    <NavLink to="/home" className="text-xs text-[#8a6500] hover:text-[#1a1a1a] font-semibold bg-stone-100 hover:bg-stone-200 px-3 py-1 rounded-lg transition-all flex items-center gap-1">
                                        View all <ChevronRight size={14} />
                                    </NavLink>
                                </div>
                                <span className="text-xs text-gray-400 font-medium hidden sm:inline">Best verified prices across salons</span>
                            </div>
                            <div className="relative">
                                <button aria-label="Show previous services" onClick={() => scroll(cheapSliderRef, -1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-xl shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronLeft size={18} className="text-gray-600" />
                                </button>
                                <div ref={cheapSliderRef} className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
                                    {loading ? (
                                        [...Array(6)].map((_, i) => <MiniSalonCardSkeleton key={i} />)
                                    ) : (
                                        cheapestServices.map((service) => (
                                            <div key={service._id} className="min-w-[210px] w-[210px] flex-shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition group snap-start cursor-pointer" onClick={() => service.salon?._id && navigate(`/shop/${service.salon._id}`)}>
                                                <div className="relative h-36 w-full overflow-hidden flex-shrink-0">
                                                    <img src={service.salon?.images?.[0] || salonPlaceholder} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={service.name} />
                                                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/75 to-transparent px-3 py-2">
                                                        <span className="text-white text-xs font-bold capitalize">{service.name}</span>
                                                    </div>
                                                </div>
                                                <div className="p-3.5 flex flex-col gap-1.5 flex-1">
                                                    <h3 className="text-xs font-semibold text-gray-700 line-clamp-1">{service.salon?.name || "Salon"}</h3>
                                                    <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={12} className="shrink-0 text-[#8a6500]" />{service.salon?.city || "Unknown"}</span>
                                                    <div className="flex items-center justify-between mt-auto pt-2">
                                                        <span className="text-xs text-gray-500">₹<span className="text-base font-bold text-[#1a1a1a]">{service.price}</span></span>
                                                        <button 
                                                            className="min-h-[40px] px-4 py-2 border border-[#D4AF37] bg-white text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white text-xs font-bold rounded-xl transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0" 
                                                            onClick={(e) => { e.stopPropagation(); service.salon?._id && navigate(`/shop/${service.salon._id}`); }}
                                                        >
                                                            Book Now
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button aria-label="Show next services" onClick={() => scroll(cheapSliderRef, 1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-xl shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronRight size={18} className="text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── WHY CHOOSE US ── */}
            <section className="py-12 md:py-16 bg-white px-4 sm:px-6 lg:px-8 border-t border-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 tracking-tight mb-4">Why Choose SalonNow?</h2>
                        <p className="text-gray-500 text-base md:text-lg max-w-xl mx-auto leading-relaxed">We make salon booking simple, secure, and convenient.</p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {WHY_CHOOSE.map((card, i) => (
                            <div key={i} className="bg-[#fafafa] border border-gray-100 p-6 rounded-xl shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center shrink-0`}>{card.icon}</div>
                                <div>
                                    <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1">{card.title}</h3>
                                    <p className="text-gray-500 leading-relaxed text-sm">{card.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="py-12 md:py-16 bg-white px-4 sm:px-6 lg:px-8 border-t border-gray-50">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center mb-8">
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mb-6">How It Works</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 text-center">
                        {[
                            ["Find Your Salon", "Explore top-rated verified salons and open chairs near you"],
                            ["Choose Services", "Pick haircuts, styling, or treatments with upfront pricing"],
                            ["Book a Time or Join Line", "Reserve an available chair slot or save your spot in line"],
                            ["Show Code & Enjoy", "Arrive, share your 4-digit booking code, and relax"]
                        ].map(([title, desc], i) => (
                            <div key={i}>
                                <div className="text-5xl md:text-6xl font-sans text-[#ffe0cc] font-bold mb-3">{String(i + 1).padStart(2, '0')}</div>
                                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-1.5">{title}</h3>
                                <p className="text-gray-500 text-sm leading-relaxed">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── INFORMATIONAL FEATURE SECTION ── */}
            <section className="py-12 md:py-16 bg-white px-4 sm:px-6 lg:px-8 border-t border-gray-100">
                <div className="max-w-7xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-8">
                        <span className="text-[#D4AF37] font-semibold text-xs bg-amber-50 px-3 py-1 rounded-full">Discover SalonNow</span>
                        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight mt-3 mb-4">Online Salon Booking Made Effortless</h2>
                        <p className="text-gray-500 text-sm md:text-base leading-relaxed">
                            Book top-rated salons across India with clear prices, live wait times, and instant booking codes.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6 md:gap-8">
                        {/* Left: Why book with us cards */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-4 flex items-center gap-2">
                                <Sparkles size={20} className="text-[#D4AF37]" /> Why Book with SalonNow?
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-3.5">
                                {[
                                    { title: "Curated Salons", desc: "Handpicked verified salons and spas across popular cities in India." },
                                    { title: "Upfront Best Prices", desc: "No hidden charges. Transparent menu prices and optional extra services." },
                                    { title: "Flexible Payment", desc: "Pay securely online via UPI/cards or directly at the salon counter." },
                                    { title: "Live Chair Availability", desc: "See open chairs and live wait times so you never have to wait." },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 bg-[#fafafa] border border-gray-100 rounded-xl flex flex-col gap-1 hover:border-[#D4AF37]/30 transition-all">
                                        <h4 className="text-base font-semibold text-gray-900">{item.title}</h4>
                                        <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-amber-50/60 border border-amber-200/50 rounded-xl flex items-center gap-3 mt-4">
                                <ShieldCheck size={22} className="text-[#D4AF37] shrink-0" />
                                <p className="text-xs text-amber-950 font-medium leading-relaxed">
                                    <strong className="font-semibold">100% Quality Assured:</strong> Verified salons, professional hygiene standards, and instant 4-digit booking code check-ins.
                                </p>
                            </div>
                        </div>

                        {/* Right: How to book steps */}
                        <div className="bg-[#fafafa] p-6 md:p-8 rounded-xl border border-gray-100 h-fit">
                            <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-4 flex items-center gap-2">
                                <Clock size={20} className="text-[#D4AF37]" /> 4 Simple Steps to Book
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { step: "Find Your Salon", desc: "Choose your city or find top-rated salons nearby with open chairs." },
                                    { step: "Pick Your Service", desc: "Browse haircut, styling, spa, and beauty treatments from transparent menus." },
                                    { step: "Reserve Time or Join Line", desc: "Choose your preferred time slot and available stylist, or save your spot in line." },
                                    { step: "Instant Confirmation", desc: "Receive your 4-digit booking code and live line updates instantly." },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-3.5 items-start">
                                        <span className="w-7 h-7 rounded-full bg-[#1a1a1a] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <h4 className="text-base font-semibold text-gray-900">{item.step}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
                                <span className="text-xs text-gray-500">Need immediate booking?</span>
                                <NavLink to="/home" className="text-xs font-semibold text-[#8a6500] hover:text-[#1a1a1a] bg-stone-100 hover:bg-stone-200 px-3.5 py-1.5 rounded-lg transition-all flex items-center gap-1">
                                    Find Salons Now <ChevronRight size={14} />
                                </NavLink>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-12 md:py-16 bg-[#1f1e1d] px-4 sm:px-6 lg:px-8 text-center">
                <div className="max-w-3xl mx-auto flex flex-col items-center">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-4">Ready to Get Started?</h2>
                    <p className="text-gray-300 text-base md:text-lg mb-6 font-normal max-w-xl leading-relaxed">Join thousands of satisfied customers who book their beauty appointments with us.</p>
                    <NavLink to="/home" className="w-full sm:w-auto bg-white text-black px-5 py-3 sm:px-6 sm:py-3.5 text-sm sm:text-base rounded-xl font-semibold flex items-center justify-center gap-2 hover:bg-gray-100 hover:scale-[1.02] transition-all duration-300">
                        Start Booking Now <ArrowRight size={18} />
                    </NavLink>
                </div>
            </section>
        </div>
    );
}

