import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Tag, Clock, MapPin, Star, ChevronLeft, ChevronRight, Heart, Sparkles, ChevronDown, Navigation, Loader2, Search, X, Scissors } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from "../context/UIContext";
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { useCityResolution } from '../hooks/useCityResolution';
import axiosInstance from '../api/axiosConfig';
import { MiniSalonCardSkeleton, DestinationCardSkeleton } from '../components/skeletons/index.jsx';
import salonPlaceholder from '../assets/salon1.jpg';

const heroImages = [
    { url: "/adam-winger-KVVjmb3IIL8-unsplash.jpg", isDark: true },
    { url: "/benyamin-bohlouli-_C-S7LqxHPw-unsplash.jpg", isDark: false },
    { url: "/greg-trowman-jsuWg7IXx1k-unsplash.jpg", isDark: true },
    { url: "/guilherme-petri-PtOfbGkU3uI-unsplash.jpg", isDark: false }
];

const POPULAR_DESTINATIONS = [
    { city: "New Delhi", state: "Delhi", img: "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=600&q=80" },
    { city: "Mumbai", state: "Maharashtra", img: "https://images.unsplash.com/photo-1567157577867-05ccb1388e66?auto=format&fit=crop&w=600&q=80" },
    { city: "Goa", state: "Goa", img: "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=600&q=80" },
    { city: "Bangalore", state: "Karnataka", img: "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=600&q=80" },
    { city: "Chennai", state: "Tamil Nadu", img: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80" },
    { city: "Kolkata", state: "West Bengal", img: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=600&q=80" },
    { city: "Hyderabad", state: "Telangana", img: "https://images.unsplash.com/photo-1600100397561-433ff982df91?auto=format&fit=crop&w=600&q=80" },
    { city: "Jaipur", state: "Rajasthan", img: "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=600&q=80" },
    { city: "Kochi", state: "Kerala", img: "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=600&q=80" },
    { city: "Ahmedabad", state: "Gujarat", img: "https://images.unsplash.com/photo-1621259640428-21d7b054238e?auto=format&fit=crop&w=600&q=80" },
    { city: "Pune", state: "Maharashtra", img: "https://images.unsplash.com/photo-1562979314-bee7453e911c?auto=format&fit=crop&w=600&q=80" },
    { city: "Chandigarh", state: "Punjab", img: "https://images.unsplash.com/photo-1595603659228-56df02919420?auto=format&fit=crop&w=600&q=80" },
    { city: "Shimla", state: "Himachal Pradesh", img: "https://images.unsplash.com/photo-1605649440416-43f942f6f1f9?auto=format&fit=crop&w=600&q=80" },
    { city: "Rishikesh", state: "Uttarakhand", img: "https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=600&q=80" },
    { city: "Lucknow", state: "Uttar Pradesh", img: "https://images.unsplash.com/photo-1571216559385-056dbbf9e9c8?auto=format&fit=crop&w=600&q=80" },
    { city: "Indore", state: "Madhya Pradesh", img: "https://images.unsplash.com/photo-1590050752117-2346761665a5?auto=format&fit=crop&w=600&q=80" },
    { city: "Guwahati", state: "Assam", img: "https://images.unsplash.com/photo-1571556094706-e069176395ec?auto=format&fit=crop&w=600&q=80" },
    { city: "Bhubaneswar", state: "Odisha", img: "https://images.unsplash.com/photo-1588667681979-99d543503b44?auto=format&fit=crop&w=600&q=80" },
    { city: "Srinagar", state: "Jammu & Kashmir", img: "https://images.unsplash.com/photo-1566114061559-994f7943586b?auto=format&fit=crop&w=600&q=80" },
    { city: "Patna", state: "Bihar", img: "https://images.unsplash.com/photo-1622312686842-1e7a5067201c?auto=format&fit=crop&w=600&q=80" },
    { city: "Ranchi", state: "Jharkhand", img: "https://images.unsplash.com/photo-1595818944447-49520892095b?auto=format&fit=crop&w=600&q=80" },
    { city: "Raipur", state: "Chhattisgarh", img: "https://images.unsplash.com/photo-1596402184320-417d7178b2cd?auto=format&fit=crop&w=600&q=80" },
    { city: "Amritsar", state: "Punjab", img: "https://images.unsplash.com/photo-1588127333419-b9d7de223dcf?auto=format&fit=crop&w=600&q=80" },
    { city: "Visakhapatnam", state: "Andhra Pradesh", img: "https://images.unsplash.com/photo-1589133405670-578d930ec7ee?auto=format&fit=crop&w=600&q=80" },
    { city: "Shillong", state: "Meghalaya", img: "https://images.unsplash.com/photo-1581452932599-2329e4dfd0f1?auto=format&fit=crop&w=600&q=80" },
    { city: "Gangtok", state: "Sikkim", img: "https://images.unsplash.com/photo-1589133644787-8890259f8073?auto=format&fit=crop&w=600&q=80" }
];

const WHY_CHOOSE = [
    { icon: <Tag size={22} className="text-[#ff9f43]" />, title: "Best deals & prices", desc: "Discover the most competitive pricing across top-rated salons in your city.", bg: "bg-orange-50" },
    { icon: <Clock size={22} className="text-purple-500" />, title: "24x7 customer support", desc: "Our support team is available round the clock to assist you anytime.", bg: "bg-purple-50" },
    { icon: <MapPin size={22} className="text-green-500" />, title: "Largest selection of salons", desc: "Browse the widest range of salons — from local gems to premium chains.", bg: "bg-green-50" },
    { icon: <ShieldCheck size={22} className="text-[#D4AF37]" />, title: "Verified salons", desc: "All salons are verified and approved to ensure guaranteed quality service.", bg: "bg-amber-50" },
    { icon: <Heart size={22} className="text-red-500" />, title: "Save favourites", desc: "Save your favourite salons and plan your next visit with ease.", bg: "bg-red-50" },
];

export function LandingPage() {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { setNavbarTheme } = useUI();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();

    const [featuredSalons, setFeaturedSalons] = useState([]);
    const [cheapestServices, setCheapestServices] = useState([]);
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

    const featuredSliderRef = useRef(null);
    const cheapSliderRef = useRef(null);
    const destSliderRef = useRef(null);

    const currentHero = heroImages[currentImageIndex];
    const isDark = currentHero.isDark;

    useEffect(() => { setNavbarTheme(isDark ? 'dark' : 'light'); }, [isDark, setNavbarTheme]);

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
                const [salonsRes, cheapRes] = await Promise.all([
                    axiosInstance.get("/salons?limit=12"),
                    axiosInstance.get("/salons/cheapest?limit=15")
                ]);
                if (salonsRes.data.success) setFeaturedSalons(salonsRes.data.data.salons);
                if (cheapRes.data.success) setCheapestServices(cheapRes.data.data.services || []);
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
                        <div className={`absolute inset-0 ${currentHero.isDark ? 'bg-black/60' : 'bg-black/40'}`}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-black/25"></div>
                    </motion.div>
                </AnimatePresence>

                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center pt-8">
                    {/* Brand Eyebrow Badge (L3) */}
                    <motion.div variants={fadeUpVariants} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/50 backdrop-blur-md border border-[#D4AF37]/50 text-[#ffd166] text-xs sm:text-sm font-semibold tracking-wider uppercase mb-5 shadow-xl">
                        <Scissors size={15} className="text-[#ffd166]" />
                        <span>SalonNow • Premium Grooming & Salons</span>
                    </motion.div>

                    {/* Dynamic H1 Headline */}
                    <motion.h1 variants={fadeUpVariants} className="text-4xl sm:text-6xl md:text-7xl font-serif font-bold mb-6 leading-tight drop-shadow-md text-white">
                        Book top salons in{" "}
                        <button
                            type="button"
                            onClick={() => setIsCityModalOpen(true)}
                            className="inline-flex items-center gap-1.5 text-[#ffd166] hover:text-[#ffe49e] border-b-2 border-dashed border-[#ffd166]/70 hover:border-[#ffd166] transition-all cursor-pointer px-2.5 py-0.5 rounded-xl hover:bg-white/10 active:scale-95"
                            title="Change City"
                        >
                            <span>{resolvedCity}</span>
                            <ChevronDown size={30} className="text-[#ffd166] stroke-[2.5] inline-block -mb-1" />
                        </button>{" "}
                        in 60 seconds
                    </motion.h1>

                    <motion.p variants={fadeUpVariants} className="text-base sm:text-lg md:text-xl mb-8 max-w-2xl font-light text-gray-100 drop-shadow-sm">
                        Discover and book appointments with verified salons in {resolvedCity}. Guaranteed seat locking, zero wait time, and instant confirmations.
                    </motion.p>

                    {/* CTAs: Primary & Secondary (Use my location) */}
                    <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row flex-wrap justify-center items-center gap-4 w-full sm:w-auto">
                        <NavLink 
                            to={`/home?city=${encodeURIComponent(resolvedCity)}`} 
                            className="w-full sm:w-auto px-8 py-4 rounded-full font-bold flex items-center justify-center gap-2 transition-all shadow-xl hover:shadow-2xl transform hover:-translate-y-1 duration-300 bg-[#ffd166] text-[#1a1a1a] hover:bg-[#ffc633]"
                        >
                            <span>Find Salons in {resolvedCity}</span>
                            <ArrowRight size={18} />
                        </NavLink>

                        <button 
                            type="button"
                            onClick={handleUseLocation}
                            disabled={detectingLocation}
                            className="w-full sm:w-auto px-7 py-4 rounded-full font-semibold transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 border border-white/80 text-white hover:bg-white/15 backdrop-blur-sm flex items-center justify-center gap-2 disabled:opacity-75"
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
                            <NavLink to="/signup" className="w-full sm:w-auto px-6 py-4 rounded-full font-medium transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1 duration-300 text-center text-white/90 hover:text-white hover:underline text-sm">
                                Create Account
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
                            className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 max-h-[85vh] flex flex-col"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
                                <div>
                                    <h3 className="font-serif font-bold text-xl text-[#1a1a1a]">Select Your City</h3>
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
                                        <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
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

                                {/* Major Destinations */}
                                <div>
                                    <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2">
                                        Popular Metro Cities
                                    </p>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                        {POPULAR_DESTINATIONS
                                            .filter((d) =>
                                                d.city.toLowerCase().includes(cityFilterText.toLowerCase())
                                            )
                                            .map((dest) => (
                                                <button
                                                    key={dest.city}
                                                    type="button"
                                                    onClick={() => {
                                                        selectCity(dest.city);
                                                        setIsCityModalOpen(false);
                                                    }}
                                                    className={`p-2.5 rounded-xl border text-left transition-all ${
                                                        resolvedCity.toLowerCase() === dest.city.toLowerCase()
                                                            ? "bg-[#1a1a1a] text-white border-[#1a1a1a]"
                                                            : "bg-white hover:bg-gray-50 border-gray-100 text-gray-800"
                                                    }`}
                                                >
                                                    <p className="font-semibold text-xs truncate">{dest.city}</p>
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



            {/* ── BEST DEALS SLIDER ── */}
            {(loading || featuredSalons.length > 0) && (
                <section className="py-10 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-[#fef9ec] border border-[#f0e5c0] rounded-2xl p-5 md:p-6 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4 gap-2">
                                <div className="flex items-baseline gap-3">
                                    <h2 className="text-xl md:text-2xl font-bold text-[#1a1a1a]">Best Deals for Salons</h2>
                                    <NavLink to="/home" className="text-[#D4AF37] hover:text-[#b89528] font-bold text-xs flex items-center gap-0.5 hover:underline">
                                        View all <ChevronRight size={14} />
                                    </NavLink>
                                </div>
                                <span className="text-xs text-gray-500 font-medium hidden sm:inline">Handpicked premium discounts</span>
                            </div>
                            <div className="relative">
                                <button aria-label="Show previous featured salons" onClick={() => scroll(featuredSliderRef, -1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronLeft size={18} className="text-gray-600" />
                                </button>
                                <div ref={featuredSliderRef} className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
                                    {loading ? (
                                        [...Array(6)].map((_, i) => <MiniSalonCardSkeleton key={i} />)
                                    ) : (
                                        featuredSalons.map((salon) => (
                                            <div key={salon._id} className="min-w-[250px] w-[250px] flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition group snap-start cursor-pointer" onClick={() => navigate(`/shop/${salon._id}`)}>
                                                <div className="relative h-40 w-full overflow-hidden flex-shrink-0">
                                                    <img src={salon.images?.[0] || salonPlaceholder} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={salon.name} />
                                                    <button aria-label={`${userFavorites.includes(salon._id) ? 'Remove' : 'Save'} ${salon.name} from favorites`} aria-pressed={userFavorites.includes(salon._id)} className={`absolute top-2.5 right-2.5 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 ${userFavorites.includes(salon._id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`} onClick={(e) => handleToggleFavorite(e, salon._id)}>
                                                        <Heart size={14} strokeWidth={userFavorites.includes(salon._id) ? 1.5 : 2} className={userFavorites.includes(salon._id) ? "fill-red-500" : ""} />
                                                    </button>
                                                </div>
                                                <div className="p-3 flex flex-col flex-1">
                                                    <div className="flex items-center gap-1 mb-1">
                                                        <span className="text-[10px] text-gray-500">Salon</span>
                                                        <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={10} className="fill-[#febb02] text-[#febb02]" />)}</div>
                                                    </div>
                                                    <h3 className="text-sm font-bold text-[#1a1a1a] mb-1 line-clamp-1 hover:text-[#8a6500] transition-colors">{salon.name}</h3>
                                                    <span className="text-xs text-[#8a6500] flex items-center gap-1 mb-2"><MapPin size={11} className="shrink-0" />{salon.city ? `${salon.city}, India` : "Location not set"}</span>
                                                    <div className="mt-auto flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="bg-[#1a1a1a] text-[#D4AF37] px-1.5 py-1 font-bold rounded-t-md rounded-br-md rounded-bl-sm min-w-[28px] text-xs text-center">{salon.rating || "New"}</div>
                                                            <span className="text-[10px] font-bold text-[#1a1a1a]">{salon.rating > 4 ? "Excellent" : salon.rating > 3 ? "Very Good" : "Good"}</span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">{salon.reviews?.length || 0} reviews</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <button aria-label="Show next featured salons" onClick={() => scroll(featuredSliderRef, 1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronRight size={18} className="text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── POPULAR DESTINATIONS ── */}
            <section className="py-10 px-6 bg-white">
                <div className="max-w-6xl mx-auto">
                    <h2 className="text-2xl font-bold text-[#1a1a1a] mb-5">Find Top Salons in Your Favorite Cities</h2>
                    <div className="relative">
                        <button aria-label="Show previous destinations" onClick={() => scroll(destSliderRef, -1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                            <ChevronLeft size={18} className="text-gray-600" />
                        </button>
                        <div ref={destSliderRef} className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
                            {POPULAR_DESTINATIONS.map((dest) => (
                                <NavLink
                                    key={dest.city}
                                    to={`/home?city=${dest.city}`}
                                    className="min-w-[180px] w-[180px] flex-shrink-0 rounded-2xl overflow-hidden relative group snap-start cursor-pointer"
                                >
                                    <div className="h-52 w-full overflow-hidden">
                                        <img src={dest.img} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt={dest.city} />
                                    </div>
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex flex-col justify-end p-3">
                                        <p className="text-white font-bold text-base leading-tight">{dest.city}</p>
                                        <p className="text-white/70 text-[10px] font-bold">{dest.state}</p>
                                        <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
                                            Explore salons <ArrowRight size={11} />
                                        </p>
                                    </div>
                                </NavLink>
                            ))}
                        </div>
                        <button aria-label="Show next destinations" onClick={() => scroll(destSliderRef, 1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                            <ChevronRight size={18} className="text-gray-600" />
                        </button>
                    </div>
                </div>
            </section>

            {/* ── CHEAPEST SERVICES SLIDER ── */}
            {(loading || cheapestServices.length > 0) && (
                <section className="py-10 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-baseline justify-between mb-4 gap-2">
                                <div className="flex items-baseline gap-3">
                                    <h2 className="text-xl md:text-2xl font-bold text-[#1a1a1a]">Cheapest Services</h2>
                                    <NavLink to="/home" className="text-[#D4AF37] hover:text-[#b89528] font-bold text-xs flex items-center gap-0.5 hover:underline">
                                        View all <ChevronRight size={14} />
                                    </NavLink>
                                </div>
                                <span className="text-xs text-gray-400 font-medium hidden sm:inline">Best verified prices across salons</span>
                            </div>
                            <div className="relative">
                                <button aria-label="Show previous services" onClick={() => scroll(cheapSliderRef, -1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronLeft size={18} className="text-gray-600" />
                                </button>
                                <div ref={cheapSliderRef} className="flex gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
                                    {loading ? (
                                        [...Array(6)].map((_, i) => <MiniSalonCardSkeleton key={i} />)
                                    ) : (
                                        cheapestServices.map((service) => (
                                            <div key={service._id} className="min-w-[210px] w-[210px] flex-shrink-0 bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col hover:shadow-md transition group snap-start cursor-pointer" onClick={() => service.salon?._id && navigate(`/shop/${service.salon._id}`)}>
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
                                                            className="min-h-[40px] px-4 py-2 border border-[#D4AF37] bg-white text-[#D4AF37] hover:bg-[#D4AF37] hover:text-white text-xs font-bold rounded-full transition-all shadow-sm active:scale-95 flex items-center justify-center shrink-0" 
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
                                <button aria-label="Show next services" onClick={() => scroll(cheapSliderRef, 1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronRight size={18} className="text-gray-600" />
                                </button>
                            </div>
                        </div>
                    </div>
                </section>
            )}

            {/* ── WHY CHOOSE US ── */}
            <section className="py-16 bg-white px-6 border-t border-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">Why Choose SalonNow?</h2>
                        <p className="text-gray-500 text-lg">We make salon booking simple, secure, and convenient.</p>
                    </div>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                        {WHY_CHOOSE.map((card, i) => (
                            <div key={i} className="bg-[#fafafa] border border-gray-100 p-7 rounded-2xl shadow-sm hover:shadow-md transition-shadow flex flex-col gap-4">
                                <div className={`w-10 h-10 ${card.bg} rounded-xl flex items-center justify-center shrink-0`}>{card.icon}</div>
                                <div>
                                    <h3 className="text-base font-bold text-[#1a1a1a] mb-1">{card.title}</h3>
                                    <p className="text-gray-500 leading-relaxed text-sm">{card.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── HOW IT WORKS ── */}
            <section className="py-16 bg-white px-6 border-t border-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a]">How It Works</h2>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        {[["Browse Salons", "Explore verified salons near you"], ["Choose Service", "Select from a range of services"], ["Book & Pay", "Secure online booking & payment"], ["Enjoy Service", "Visit salon and enjoy your service"]].map(([title, desc], i) => (
                            <div key={i}>
                                <div className="text-6xl font-serif text-[#ffe0cc] font-bold mb-4">{String(i + 1).padStart(2, '0')}</div>
                                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 font-serif">{title}</h3>
                                <p className="text-gray-500 text-sm">{desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>


            {/* ── INFORMATIONAL FEATURE SECTION ── */}
            <section className="py-20 bg-white px-6 border-t border-gray-100">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center max-w-2xl mx-auto mb-14">
                        <span className="text-[#D4AF37] font-bold text-xs uppercase tracking-widest bg-amber-50 px-3 py-1 rounded-full">Discover SalonNow</span>
                        <h2 className="text-3xl md:text-4xl font-serif font-bold text-[#1a1a1a] mt-3 mb-3">Online Salon Booking Made Effortless</h2>
                        <p className="text-gray-500 text-sm md:text-base leading-relaxed">
                            Connecting customers with premier salons and wellness providers across India with live slot availability, upfront transparent pricing, and instant confirmations.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-10">
                        {/* Left: Why book with us cards */}
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-[#1a1a1a] mb-2 flex items-center gap-2">
                                <Sparkles size={20} className="text-[#D4AF37]" /> Why Book with SalonNow?
                            </h3>
                            <div className="grid sm:grid-cols-2 gap-3.5">
                                {[
                                    { title: "Curated Salons", desc: "Handpicked verified salons and spas across popular cities in India." },
                                    { title: "Upfront Best Prices", desc: "No hidden charges. Transparent service menu prices and exclusive deals." },
                                    { title: "Flexible Payment", desc: "Pay securely online via UPI/cards or directly at the salon." },
                                    { title: "Real-Time Slots", desc: "Live seat availability ensures zero waiting and guaranteed appointments." },
                                ].map((item, i) => (
                                    <div key={i} className="p-4 bg-[#fafafa] border border-gray-100 rounded-2xl flex flex-col gap-1 hover:border-[#D4AF37]/30 transition-all">
                                        <h4 className="font-bold text-[#1a1a1a] text-sm">{item.title}</h4>
                                        <p className="text-gray-500 text-xs leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="p-4 bg-amber-50/60 border border-amber-200/50 rounded-2xl flex items-center gap-3 mt-4">
                                <ShieldCheck size={22} className="text-[#D4AF37] shrink-0" />
                                <p className="text-xs text-amber-950 font-medium">
                                    <strong className="font-bold">100% Quality Assured:</strong> All partnered salons adhere to strict hygiene and professional standards.
                                </p>
                            </div>
                        </div>

                        {/* Right: How to book steps */}
                        <div className="bg-[#fafafa] p-6 md:p-8 rounded-3xl border border-gray-100 h-fit">
                            <h3 className="text-xl font-bold text-[#1a1a1a] mb-4 font-serif flex items-center gap-2">
                                <Clock size={20} className="text-[#D4AF37]" /> 4 Simple Steps to Book
                            </h3>
                            <div className="space-y-4">
                                {[
                                    { step: "Select Location", desc: "Choose your city or find top-rated salons nearby." },
                                    { step: "Pick Your Service", desc: "Browse haircut, styling, spa, and beauty treatments." },
                                    { step: "Reserve Your Slot", desc: "Choose your preferred time and available stylist." },
                                    { step: "Instant Confirmation", desc: "Receive immediate booking confirmation and reminder." },
                                ].map((item, i) => (
                                    <div key={i} className="flex gap-3.5 items-start">
                                        <span className="w-7 h-7 rounded-full bg-[#1a1a1a] text-white text-xs font-bold flex items-center justify-center shrink-0">
                                            {i + 1}
                                        </span>
                                        <div>
                                            <h4 className="text-sm font-bold text-[#1a1a1a]">{item.step}</h4>
                                            <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-6 pt-5 border-t border-gray-200 flex items-center justify-between">
                                <span className="text-xs text-gray-500">Need immediate booking?</span>
                                <NavLink to="/home" className="text-xs font-bold text-[#8a6500] hover:underline flex items-center gap-1">
                                    Find Salons Now <ChevronRight size={14} />
                                </NavLink>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section className="py-20 bg-[#1f1e1d] px-6 text-center">
                <div className="max-w-3xl mx-auto flex flex-col items-center">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">Ready to Get Started?</h2>
                    <p className="text-gray-300 text-lg mb-8 font-light">Join thousands of satisfied customers who book their beauty appointments with us.</p>
                    <NavLink to="/home" className="bg-white text-black px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                        Start Booking Now <ArrowRight size={18} />
                    </NavLink>
                </div>
            </section>
        </div>
    );
}
