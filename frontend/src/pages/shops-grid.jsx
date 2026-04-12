import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, MapPin, Users, Clock, Loader2, ChevronLeft, ChevronRight, Phone, Heart, ChevronDown } from 'lucide-react';
import axiosInstance from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const INDIAN_STATES = [
    { value: "", label: "Select State" },
    // States
    { value: "Andhra Pradesh", label: "Andhra Pradesh" },
    { value: "Arunachal Pradesh", label: "Arunachal Pradesh" },
    { value: "Assam", label: "Assam" },
    { value: "Bihar", label: "Bihar" },
    { value: "Chhattisgarh", label: "Chhattisgarh" },
    { value: "Goa", label: "Goa" },
    { value: "Gujarat", label: "Gujarat" },
    { value: "Haryana", label: "Haryana" },
    { value: "Himachal Pradesh", label: "Himachal Pradesh" },
    { value: "Jharkhand", label: "Jharkhand" },
    { value: "Karnataka", label: "Karnataka" },
    { value: "Kerala", label: "Kerala" },
    { value: "Madhya Pradesh", label: "Madhya Pradesh" },
    { value: "Maharashtra", label: "Maharashtra" },
    { value: "Manipur", label: "Manipur" },
    { value: "Meghalaya", label: "Meghalaya" },
    { value: "Mizoram", label: "Mizoram" },
    { value: "Nagaland", label: "Nagaland" },
    { value: "Odisha", label: "Odisha" },
    { value: "Punjab", label: "Punjab" },
    { value: "Rajasthan", label: "Rajasthan" },
    { value: "Sikkim", label: "Sikkim" },
    { value: "Tamil Nadu", label: "Tamil Nadu" },
    { value: "Telangana", label: "Telangana" },
    { value: "Tripura", label: "Tripura" },
    { value: "Uttar Pradesh", label: "Uttar Pradesh" },
    { value: "Uttarakhand", label: "Uttarakhand" },
    { value: "West Bengal", label: "West Bengal" },
];

export function Shops() {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const cityParam = searchParams.get("city") || "";
    const stateParam = searchParams.get("state") || "";

    const { user } = useAuth();
    const { showNotification } = useNotification();

    const [salons, setSalons] = useState([]);
    const [userFavorites, setUserFavorites] = useState([]);
    const [cityQuery, setCityQuery] = useState(cityParam);
    const [selectedState, setSelectedState] = useState(stateParam);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);
    const sliderRef = useRef(null);
    const cheapSliderRef = useRef(null);
    const [cheapestServices, setCheapestServices] = useState([]);

    // Derive unique cities from fetched salons — only after a state is selected
    const availableCities = selectedState
        ? [...new Set(salons.map(s => s.city).filter(Boolean))]
        : [];

    // Active city pill stays in sync with URL
    const activeCity = cityParam;

    const handleCityPill = (city) => {
        setCityQuery(city);
        setSearchParams(prev => {
            const p = new URLSearchParams(prev);
            p.set("city", city);
            return p;
        });
    };

    const scrollSlider = (dir) => {
        if (sliderRef.current) {
            sliderRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
        }
    };

    const scrollCheapSlider = (dir) => {
        if (cheapSliderRef.current) {
            cheapSliderRef.current.scrollBy({ left: dir * 320, behavior: "smooth" });
        }
    };

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const fetchCheapest = async () => {
            try {
                const res = await axiosInstance.get("/salons/cheapest?limit=15");
                if (res.data.success) {
                    setCheapestServices(res.data.data.services || []);
                }
            } catch (e) {
                // silently fail – this section is optional
            }
        };
        fetchCheapest();
    }, []);

    const fetchSalons = async (targetCity = cityParam, targetState = stateParam) => {
        setLoading(true);
        setError("");
        try {
            const params = {
                limit: 100 // Removed pagination limit
            };
            if (targetCity) params.city = targetCity;
            if (targetState) params.search = targetState; // Use backend's search param to match state in address

            const response = await axiosInstance.get("/salons", { params });

            if (response.data.success) {
                const { salons: fetchedSalons } = response.data.data;
                setSalons(fetchedSalons);

                // Scroll to top when params change
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to connect to the server. Please ensure the backend is running.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleToggleFavorite = async (e, salonId) => {
        e.stopPropagation();
        if (!user) {
            showNotification("Please log in to save favorites.", "error");
            navigate("/login");
            return;
        }

        try {
            const response = await axiosInstance.post(`/users/favorites/${salonId}`);
            if (response.data.success) {
                const isFavorited = response.data.data.isFavorited;
                if (isFavorited) {
                    setUserFavorites(prev => [...prev, salonId]);
                    showNotification("Added to favorites!", "success");
                } else {
                    setUserFavorites(prev => prev.filter(id => id !== salonId));
                    showNotification("Removed from favorites.", "info");
                }
            }
        } catch (error) {
            console.error("Error toggling favorite:", error);
            showNotification("Failed to update favorites.", "error");
        }
    };

    useEffect(() => {
        const fetchUserFavorites = async () => {
            if (user) {
                try {
                    const response = await axiosInstance.get("/users/favorites");
                    if (response.data.success) {
                        const favoriteIds = response.data.data.favorites.map(f => f._id || f);
                        setUserFavorites(favoriteIds);
                    }
                } catch (error) {
                    console.error("Error fetching favorites:", error);
                }
            } else {
                setUserFavorites([]);
            }
        };
        fetchUserFavorites();
    }, [user]);

    useEffect(() => {
        setCityQuery(cityParam); // Synchronize input field with URL
        setSelectedState(stateParam);
        fetchSalons(cityParam, stateParam);
    }, [cityParam, stateParam]);

    const handleSearch = (e) => {
        e.preventDefault();
        setSearchParams(prev => {
            const newParams = new URLSearchParams(prev);
            if (cityQuery) newParams.set("city", cityQuery);
            else newParams.delete("city");
            return newParams;
        });
    };

    return (
        <div className="w-full min-h-screen bg-white">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10">
                <div className="text-center pt-20 pb-8 md:pt-24 md:pb-12">

                    <h1 className="text-4xl md:text-6xl font-serif text-gray-900 mb-4 leading-tight">
                        Discover Your <br className="hidden md:block" />
                        <span className="text-[#D4AF37]">Perfect Salon</span>
                    </h1>
                    <p className="text-gray-500 text-base md:text-lg mb-6 max-w-2xl mx-auto px-4">
                        Browse curated salons near you. View real-time availability and book instantly.
                    </p>

                    {/* Search Bar & Filter Container */}
                    <div className="flex flex-row items-center justify-center gap-2 md:gap-3 max-w-3xl mx-auto w-full px-2 md:px-0">
                        <form onSubmit={handleSearch} className="flex flex-row items-center justify-between gap-1 flex-1 md:w-[65%] bg-white p-1 md:p-1.5 rounded-full shadow-sm border border-gray-100 ring-4 ring-[#1A1A1A]/5">
                            <div className="flex items-center flex-1 px-3 md:px-5 gap-2 md:gap-3">
                                <MapPin className="text-[#D4AF37] w-4 h-4 md:w-5 md:h-5 shrink-0" />
                                <input
                                    type="text"
                                    placeholder="Search by city..."
                                    value={cityQuery}
                                    onChange={(e) => setCityQuery(e.target.value)}
                                    className="w-full outline-none text-gray-700 placeholder-gray-400 text-xs md:text-sm font-medium py-1.5 bg-transparent"
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="shrink-0 bg-[#1A1A1A] text-white p-2.5 md:px-4 md:py-2.5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-1.5"
                            >
                                {loading ? (
                                    <Loader2 className="w-3.5 h-3.5 md:w-4 md:h-4 animate-spin" />
                                ) : (
                                    <>
                                        <div className="hidden md:flex items-center gap-1">
                                            <Search className="w-4 h-4" />
                                            <span>Search</span>
                                        </div>
                                        <Search className="md:hidden w-3.5 h-3.5" />
                                    </>
                                )}
                            </button>
                        </form>

                        <div className="relative w-[110px] sm:w-36 md:w-44 shrink-0" ref={dropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                                className="w-full bg-white border border-gray-100 text-gray-700 py-[11px] md:py-[12px] px-4 md:px-5 rounded-full shadow-sm outline-none font-medium text-sm md:text-base cursor-pointer ring-4 ring-[#1A1A1A]/5 hover:border-[#D4AF37] transition-colors flex items-center justify-between gap-2"
                            >
                                <span className="truncate">
                                    {INDIAN_STATES.find(s => s.value === (selectedState || ""))?.label || "Select State"}
                                </span>
                                <ChevronDown className={`w-3 h-3 md:w-4 md:h-4 text-gray-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {/* Dropdown Menu */}
                            {isDropdownOpen && (
                                <div className="absolute z-50 min-w-[200px] right-0 md:auto md:left-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <ul className="max-h-64 overflow-y-auto overflow-x-hidden py-2 scroll-smooth w-full">
                                        {INDIAN_STATES.map((state) => (
                                            <li key={state.value}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedState(state.value);
                                                        setSearchParams(prev => {
                                                            const newParams = new URLSearchParams(prev);
                                                            if (state.value) newParams.set("state", state.value);
                                                            else newParams.delete("state");
                                                            return newParams;
                                                        });
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-gray-50 flex items-center justify-between ${(selectedState || "") === state.value ? 'text-[#D4AF37] font-bold bg-orange-50/50' : 'text-gray-700 font-medium'
                                                        }`}
                                                >
                                                    {state.label}
                                                    {(selectedState || "") === state.value && (
                                                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
                                                    )}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Main Content: Full Width Grid */}
                <div className="w-full py-6">

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                            <p className="text-gray-500 animate-pulse">Finding the best salons for you...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button onClick={() => fetchSalons(cityQuery, selectedState)} className="text-[#D4AF37] font-bold border-b-2 border-[#D4AF37] hover:text-[#B48F27] transition-colors">
                                Try Again
                            </button>
                        </div>
                    ) : salons.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="text-gray-300 w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">No Salons Found</h3>
                            <p className="text-gray-500">We couldn't find any salons matching your search criteria.</p>
                            <button
                                onClick={() => setSearchParams({})}
                                className="mt-6 text-[#D4AF37] font-bold hover:text-[#B48F27] transition-colors"
                            >
                                Clear Filters
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Booking.com-style slider section */}
                            <div className="bg-[#fef9ec] border border-[#f0e5c0] rounded-2xl p-5 mb-10">
                                {/* Header row */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                                    <h2 className="text-xl font-bold text-[#1a1a1a]">Best Deals for Salons</h2>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        {availableCities.map(city => (
                                            <button
                                                key={city}
                                                onClick={() => handleCityPill(city)}
                                                className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                                                    activeCity === city
                                                        ? 'bg-[#1a1a1a] text-white border-[#1a1a1a]'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:border-gray-500'
                                                }`}
                                            >
                                                {city}
                                            </button>
                                        ))}
                                        {(activeCity || selectedState) && (
                                            <button
                                                onClick={() => { setCityQuery(""); setSelectedState(""); setSearchParams({}); }}
                                                className="text-[#D4AF37] font-semibold text-xs flex items-center gap-1 hover:underline"
                                            >
                                                View all <ChevronRight size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* Scrollable slider with arrow buttons */}
                                <div className="relative">
                                    {/* Left arrow */}
                                    <button
                                        onClick={() => scrollSlider(-1)}
                                        className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition"
                                    >
                                        <ChevronLeft size={18} className="text-gray-600" />
                                    </button>

                                    {/* Card slider track */}
                                    <div
                                        ref={sliderRef}
                                        className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-1"
                                        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                    >
                                        {salons.map((salon) => (
                                            <div
                                                key={salon._id}
                                                className="min-w-[260px] w-[260px] flex-shrink-0 bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col transition hover:shadow-lg group snap-start"
                                            >
                                                {/* Image Section */}
                                                <div
                                                    className="relative h-44 w-full overflow-hidden flex-shrink-0 cursor-pointer"
                                                    onClick={() => navigate(`/shop/${salon._id}`)}
                                                >
                                                    <img
                                                        src={salon.images && salon.images.length > 0 ? salon.images[0] : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"}
                                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                        alt={salon.name}
                                                    />
                                                    {/* Heart Icon */}
                                                    <button
                                                        className={`absolute top-2.5 right-2.5 w-7 h-7 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 active:scale-95 ${
                                                            userFavorites.includes(salon._id) ? 'text-red-500 hover:bg-white' : 'text-gray-400 hover:text-red-500'
                                                        }`}
                                                        onClick={(e) => handleToggleFavorite(e, salon._id)}
                                                    >
                                                        <Heart size={14} strokeWidth={userFavorites.includes(salon._id) ? 1.5 : 2} className={userFavorites.includes(salon._id) ? "fill-red-500" : ""} />
                                                    </button>
                                                </div>

                                                {/* Content Section */}
                                                <div className="p-3 flex flex-col flex-1">
                                                    {/* Salon Type & Stars */}
                                                    <div className="flex items-center gap-1 mb-1.5">
                                                        <span className="text-[10px] text-gray-500">Salon</span>
                                                        <div className="flex gap-0.5">
                                                            {[...Array(5)].map((_, i) => (
                                                                <Star key={i} size={10} className="fill-[#febb02] text-[#febb02]" />
                                                            ))}
                                                        </div>
                                                        {salon.rating >= 4.5 && (
                                                            <span className="ml-1 bg-[#0071c2] text-white text-[9px] font-bold px-1 py-0.5 rounded-sm tracking-wide">
                                                                Top Rated
                                                            </span>
                                                        )}
                                                    </div>

                                                    {/* Name */}
                                                    <h3
                                                        className="text-sm font-bold text-[#1a1a1a] leading-tight mb-1 cursor-pointer hover:text-[#0071C2] transition-colors line-clamp-1"
                                                        onClick={() => navigate(`/shop/${salon._id}`)}
                                                    >
                                                        {salon.name}
                                                    </h3>

                                                    {/* Location */}
                                                    <span className="text-xs text-[#0071c2] flex items-center gap-1 mb-3">
                                                        <MapPin size={11} className="shrink-0" />
                                                        {salon.city ? `${salon.city}, India` : "Location not set"}
                                                    </span>

                                                    {/* Bottom row */}
                                                    <div className="mt-auto flex items-center justify-between">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="bg-[#003b95] text-white px-1.5 py-1 font-bold flex items-center justify-center rounded-t-md rounded-br-md rounded-bl-sm min-w-[28px] text-xs">
                                                                {salon.rating || "New"}
                                                            </div>
                                                            <span className="text-[10px] font-bold text-[#1a1a1a]">
                                                                {salon.rating > 4 ? "Excellent" : salon.rating > 3 ? "Very Good" : "Good"}
                                                            </span>
                                                        </div>
                                                        <span className="text-[10px] text-gray-400">{salon.reviews?.length || 0} reviews</span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Right arrow */}
                                    <button
                                        onClick={() => scrollSlider(1)}
                                        className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition"
                                    >
                                        <ChevronRight size={18} className="text-gray-600" />
                                    </button>
                                </div>
                            </div>

                            {/* ── Cheapest Services Section ── */}
                            {cheapestServices.length > 0 && (
                                <div className="bg-white border border-gray-100 rounded-2xl p-5 mb-10 shadow-sm">
                                    {/* Header */}
                                    <div className="flex items-center justify-between mb-4">
                                        <h2 className="text-xl font-bold text-[#1a1a1a]">Cheapest Services</h2>
                                        <span className="text-xs text-gray-400 font-medium">Best prices across salons</span>
                                    </div>

                                    <div className="relative">
                                        {/* Left arrow */}
                                        <button
                                            onClick={() => scrollCheapSlider(-1)}
                                            className="absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition"
                                        >
                                            <ChevronLeft size={18} className="text-gray-600" />
                                        </button>

                                        {/* Service card track */}
                                        <div
                                            ref={cheapSliderRef}
                                            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 px-1"
                                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                                        >
                                            {cheapestServices.map((service) => (
                                                <div
                                                    key={service._id}
                                                    className="min-w-[200px] w-[200px] flex-shrink-0 bg-white border border-gray-100 rounded-xl overflow-hidden flex flex-col transition hover:shadow-md group snap-start cursor-pointer"
                                                    onClick={() => service.salon?._id && navigate(`/shop/${service.salon._id}`)}
                                                >
                                                    {/* Salon image */}
                                                    <div className="relative h-32 w-full overflow-hidden flex-shrink-0">
                                                        <img
                                                            src={service.salon?.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"}
                                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                            alt={service.name}
                                                        />
                                                        {/* Service name badge */}
                                                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent px-2 py-1.5">
                                                            <span className="text-white text-xs font-bold capitalize">{service.name}</span>
                                                        </div>
                                                    </div>

                                                    {/* Info */}
                                                    <div className="p-3 flex flex-col gap-1">
                                                        <h3 className="text-xs font-semibold text-gray-600 line-clamp-1">{service.salon?.name || "Salon"}</h3>
                                                        <span className="text-xs text-gray-400 flex items-center gap-1">
                                                            <MapPin size={10} className="shrink-0 text-[#0071c2]" />
                                                            {service.salon?.city || "Unknown"}
                                                        </span>
                                                        <div className="flex items-center justify-between mt-2">
                                                            <span className="text-xs text-gray-500">
                                                                ₹<span className="text-base font-bold text-[#1a1a1a]">{service.price}</span>
                                                            </span>
                                                            <button
                                                                className="bg-white border border-[#D4AF37] text-[#D4AF37] text-[10px] font-bold px-2 py-1 rounded-full hover:bg-[#D4AF37] hover:text-white transition-all"
                                                                onClick={(e) => { e.stopPropagation(); service.salon?._id && navigate(`/shop/${service.salon._id}`); }}
                                                            >
                                                                Book Now
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Right arrow */}
                                        <button
                                            onClick={() => scrollCheapSlider(1)}
                                            className="absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 bg-white border border-gray-200 rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition"
                                        >
                                            <ChevronRight size={18} className="text-gray-600" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}