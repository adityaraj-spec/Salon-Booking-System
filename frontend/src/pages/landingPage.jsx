import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { ArrowRight, ShieldCheck, Tag, Clock, MapPin, Star, ChevronLeft, ChevronRight, Heart } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from "../context/UIContext";
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import axiosInstance from '../api/axiosConfig';

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
    { city: "Chennai", state: "Tamil Nadu", img: "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=600&q=80" },
    { city: "Kolkata", state: "West Bengal", img: "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=600&q=80" },
    { city: "Hyderabad", state: "Telangana", img: "https://images.unsplash.com/photo-1626014303765-6370ff25e329?auto=format&fit=crop&w=600&q=80" },
];

const WHY_CHOOSE = [
    { icon: <Tag size={22} className="text-[#ff9f43]" />, title: "Best deals & prices", desc: "Discover the most competitive pricing across top-rated salons in your city.", bg: "bg-orange-50" },
    { icon: <Clock size={22} className="text-purple-500" />, title: "24x7 customer support", desc: "Our support team is available round the clock to assist you anytime.", bg: "bg-purple-50" },
    { icon: <MapPin size={22} className="text-green-500" />, title: "Largest selection of salons", desc: "Browse the widest range of salons — from local gems to premium chains.", bg: "bg-green-50" },
    { icon: <ShieldCheck size={22} className="text-blue-500" />, title: "Verified salons", desc: "All salons are verified and approved to ensure guaranteed quality service.", bg: "bg-blue-50" },
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
            try {
                const [salonsRes, cheapRes] = await Promise.all([
                    axiosInstance.get("/salons?limit=12"),
                    axiosInstance.get("/salons/cheapest?limit=15")
                ]);
                if (salonsRes.data.success) setFeaturedSalons(salonsRes.data.data.salons);
                if (cheapRes.data.success) setCheapestServices(cheapRes.data.data.services || []);
            } catch (e) { /* silent */ }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (user) {
            axiosInstance.get("/users/favorites")
                .then(res => { if (res.data.success) setUserFavorites(res.data.data.favorites.map(f => f._id || f)); })
                .catch(() => {});
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

    const scroll = (ref, dir) => ref.current?.scrollBy({ left: dir * 320, behavior: "smooth" });

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
                        <div className={`absolute inset-0 ${currentHero.isDark ? 'bg-black/40' : 'bg-white/20'}`}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                    </motion.div>
                </AnimatePresence>

                <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center pt-8">
                    <motion.h1 variants={fadeUpVariants} className={`text-5xl md:text-7xl font-bold mb-6 leading-tight ${isDark ? 'text-white' : 'text-gray-900'}`}>
                        Your Beauty,<br /><span className="text-[#ff9f43]">Our Priority</span>
                    </motion.h1>
                    <motion.p variants={fadeUpVariants} className={`text-lg md:text-xl mb-6 max-w-2xl font-light ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        Discover and book appointments with top-rated salons in your city.<br className="hidden md:block" /> Professional beauty services at your fingertips.
                    </motion.p>
                    <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-5">
                        <NavLink to="/home" className={`px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'}`}>
                            Browse Salons <ArrowRight size={18} />
                        </NavLink>
                        <NavLink to="/signup" className={`px-8 py-4 rounded-full font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 border ${isDark ? 'border-white/80 text-white hover:bg-white/10' : 'border-black/80 text-black hover:bg-black/5'}`}>
                            Sign Up Now
                        </NavLink>
                    </motion.div>
                </motion.div>
            </section>



            {/* ── BEST DEALS SLIDER ── */}
            {featuredSalons.length > 0 && (
                <section className="py-10 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-[#fef9ec] border border-[#f0e5c0] rounded-2xl p-5">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-[#1a1a1a]">Best Deals for Salons</h2>
                                <NavLink to="/home" className="text-[#D4AF37] font-semibold text-xs flex items-center gap-1 hover:underline">
                                    View all <ChevronRight size={14} />
                                </NavLink>
                            </div>
                            <div className="relative">
                                <button onClick={() => scroll(featuredSliderRef, -1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronLeft size={18} className="text-gray-600" />
                                </button>
                                <div ref={featuredSliderRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
                                    {featuredSalons.map((salon) => (
                                        <div key={salon._id} className="min-w-[250px] w-[250px] flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col hover:shadow-lg transition group snap-start cursor-pointer" onClick={() => navigate(`/shop/${salon._id}`)}>
                                            <div className="relative h-40 w-full overflow-hidden flex-shrink-0">
                                                <img src={salon.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={salon.name} />
                                                <button className={`absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 ${userFavorites.includes(salon._id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`} onClick={(e) => handleToggleFavorite(e, salon._id)}>
                                                    <Heart size={14} strokeWidth={userFavorites.includes(salon._id) ? 1.5 : 2} className={userFavorites.includes(salon._id) ? "fill-red-500" : ""} />
                                                </button>
                                            </div>
                                            <div className="p-3 flex flex-col flex-1">
                                                <div className="flex items-center gap-1 mb-1">
                                                    <span className="text-[10px] text-gray-500">Salon</span>
                                                    <div className="flex gap-0.5">{[...Array(5)].map((_, i) => <Star key={i} size={10} className="fill-[#febb02] text-[#febb02]" />)}</div>
                                                </div>
                                                <h3 className="text-sm font-bold text-[#1a1a1a] mb-1 line-clamp-1 hover:text-[#0071C2] transition-colors">{salon.name}</h3>
                                                <span className="text-xs text-[#0071c2] flex items-center gap-1 mb-2"><MapPin size={11} className="shrink-0" />{salon.city ? `${salon.city}, India` : "Location not set"}</span>
                                                <div className="mt-auto flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="bg-[#003b95] text-white px-1.5 py-1 font-bold rounded-t-md rounded-br-md rounded-bl-sm min-w-[28px] text-xs text-center">{salon.rating || "New"}</div>
                                                        <span className="text-[10px] font-bold text-[#1a1a1a]">{salon.rating > 4 ? "Excellent" : salon.rating > 3 ? "Very Good" : "Good"}</span>
                                                    </div>
                                                    <span className="text-[10px] text-gray-400">{salon.reviews?.length || 0} reviews</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => scroll(featuredSliderRef, 1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
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
                    <h2 className="text-2xl font-bold text-[#1a1a1a] mb-5">Popular Destinations</h2>
                    <div className="relative">
                        <button onClick={() => scroll(destSliderRef, -1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                            <ChevronLeft size={18} className="text-gray-600" />
                        </button>
                        <div ref={destSliderRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
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
                                        <p className="text-white/70 text-[10px] uppercase tracking-widest">{dest.state}</p>
                                        <p className="text-white/80 text-xs mt-1 flex items-center gap-1">
                                            Explore salons <ArrowRight size={11} />
                                        </p>
                                    </div>
                                </NavLink>
                            ))}
                        </div>
                        <button onClick={() => scroll(destSliderRef, 1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                            <ChevronRight size={18} className="text-gray-600" />
                        </button>
                    </div>
                </div>
            </section>

            {/* ── CHEAPEST SERVICES SLIDER ── */}
            {cheapestServices.length > 0 && (
                <section className="py-10 px-6">
                    <div className="max-w-6xl mx-auto">
                        <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-xl font-bold text-[#1a1a1a]">Cheapest Services</h2>
                                <span className="text-xs text-gray-400 font-medium">Best prices across salons</span>
                            </div>
                            <div className="relative">
                                <button onClick={() => scroll(cheapSliderRef, -1)} className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
                                    <ChevronLeft size={18} className="text-gray-600" />
                                </button>
                                <div ref={cheapSliderRef} className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-1" style={{ scrollbarWidth: 'none' }}>
                                    {cheapestServices.map((service) => (
                                        <div key={service._id} className="min-w-[200px] w-[200px] flex-shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col hover:shadow-md transition group snap-start cursor-pointer" onClick={() => service.salon?._id && navigate(`/shop/${service.salon._id}`)}>
                                            <div className="relative h-32 w-full overflow-hidden flex-shrink-0">
                                                <img src={service.salon?.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" alt={service.name} />
                                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                                                    <span className="text-white text-xs font-bold capitalize">{service.name}</span>
                                                </div>
                                            </div>
                                            <div className="p-3 flex flex-col gap-1">
                                                <h3 className="text-xs font-semibold text-gray-600 line-clamp-1">{service.salon?.name || "Salon"}</h3>
                                                <span className="text-xs text-gray-400 flex items-center gap-1"><MapPin size={10} className="shrink-0 text-[#0071c2]" />{service.salon?.city || "Unknown"}</span>
                                                <div className="flex items-center justify-between mt-2">
                                                    <span className="text-xs text-gray-500">₹<span className="text-base font-bold text-[#1a1a1a]">{service.price}</span></span>
                                                    <button className="bg-white border border-[#D4AF37] text-[#D4AF37] text-[10px] font-bold px-2 py-1 rounded-full hover:bg-[#D4AF37] hover:text-white transition-all" onClick={(e) => { e.stopPropagation(); service.salon?._id && navigate(`/shop/${service.salon._id}`); }}>
                                                        Book Now
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button onClick={() => scroll(cheapSliderRef, 1)} className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition">
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
                        {[["Browse Salons","Explore verified salons near you"],["Choose Service","Select from a range of services"],["Book & Pay","Secure online booking & payment"],["Enjoy Service","Visit salon and enjoy your service"]].map(([title, desc], i) => (
                            <div key={i}>
                                <div className="text-6xl font-serif text-[#ffe0cc] font-bold mb-4">{String(i + 1).padStart(2, '0')}</div>
                                <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 font-serif">{title}</h3>
                                <p className="text-gray-500 text-sm">{desc}</p>
                            </div>
                        ))}
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
