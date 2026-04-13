import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, MapPin, Loader2, Phone, Heart, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight, SlidersHorizontal, Filter, X, Map } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { State, City } from 'country-state-city';
import axiosInstance from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';


export function Shops() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();
    const cityParam = searchParams.get("city") || "";
    const stateParam = searchParams.get("state") || "";
    const topRatedParam = searchParams.get("topRated") === "true";
    const sortByParam = searchParams.get("sortBy") || "rating";

    const [salons, setSalons] = useState([]);
    const [userFavorites, setUserFavorites] = useState([]);
    const [cityQuery, setCityQuery] = useState(cityParam);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Independent Preferences
    const [preferTopRated, setPreferTopRated] = useState(topRatedParam);
    const [sortBy, setSortBy] = useState(sortByParam);
    const [sortOrder, setSortOrder] = useState("asc");

    const [isSortModalOpen, setIsSortModalOpen] = useState(false);

    // Smart Location State (Modal Internal)
    const [selectedState, setSelectedState] = useState(null); // { name, isoCode }
    const [stateSearch, setStateSearch] = useState(stateParam || "");
    const [citySearch, setCitySearch] = useState(cityParam || "");
    const [isStateListOpen, setIsStateListOpen] = useState(false);
    const [isCityListOpen, setIsCityListOpen] = useState(false);

    const dropdownRef = useRef(null);
    const stateListRef = useRef(null);
    const cityListRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                // Reserved for future dropdowns
            }
            if (stateListRef.current && !stateListRef.current.contains(event.target)) {
                setIsStateListOpen(false);
            }
            if (cityListRef.current && !cityListRef.current.contains(event.target)) {
                setIsCityListOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const fetchSalons = async (targetCity = cityQuery, targetState = selectedState, targetPage = currentPage) => {
        setLoading(true);
        setError("");
        try {
            const params = {
                limit: 12,
                page: targetPage,
                city: targetCity,
                search: targetState || stateParam,
                sortBy: sortBy,
                sortOrder: sortOrder,
                topRated: preferTopRated
            };
            const response = await axiosInstance.get("/salons", { params });
            if (response.data.success) {
                setSalons(response.data.data.salons);
                setTotalPages(response.data.data.pagination.totalPages);
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to find salons matching your criteria.");
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
                    // silent
                }
            } else {
                setUserFavorites([]);
            }
        };
        fetchUserFavorites();
    }, [user]);

    // Reset all filters on mount (Hard Refresh)
    useEffect(() => {
        setSearchParams({}, { replace: true });
        setCityQuery("");
        setStateSearch("");
        setCitySearch("");
        setPreferTopRated(false);
        setSortBy("rating");
    }, []);

    // Reset to first page when search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [cityParam, stateParam, sortBy, sortOrder, preferTopRated]);

    // Fetch salons when search, state, sorting, or page changes
    useEffect(() => {
        fetchSalons(cityParam, stateParam, currentPage);
    }, [cityParam, stateParam, sortBy, sortOrder, currentPage, preferTopRated]);

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

                    {/* Search Bar & Unified Filter Trigger */}
                    <div className="flex items-center justify-center gap-3 md:gap-4 max-w-3xl mx-auto w-full px-4 md:px-0">
                        <form onSubmit={handleSearch} className="flex items-center justify-between gap-1 flex-1 bg-white p-1 md:p-1.5 rounded-full shadow-sm border border-gray-100 ring-4 ring-[#1A1A1A]/5">
                            <div className="flex items-center flex-1 px-3 md:px-5 gap-2">
                                <MapPin className="text-[#D4AF37] w-4 h-4 shrink-0" />
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
                                className="shrink-0 bg-[#1A1A1A] text-white p-2.5 md:px-6 md:py-3 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                                    <>
                                        <div className="hidden md:flex items-center gap-1.5"><Search className="w-4 h-4" /><span>Search Salons</span></div>
                                        <div className="md:hidden flex items-center gap-1.5 px-2">
                                            <Search className="w-4 h-4" />
                                            <span className="sm:hidden font-bold">Search</span>
                                        </div>
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Unified Filter/Sort Button */}
                        <button
                            type="button"
                            title="Discovery Settings"
                            onClick={() => setIsSortModalOpen(true)}
                            className={`w-12 h-12 md:w-14 md:h-14 flex items-center justify-center rounded-full transition-all border shrink-0 relative ${isSortModalOpen
                                ? "bg-[#1A1A1A] text-white border-[#1A1A1A] shadow-md ring-4 ring-[#1A1A1A]/5"
                                : "bg-white text-gray-700 border-gray-100 shadow-sm ring-4 ring-[#1A1A1A]/5 hover:border-gray-200"
                                }`}
                        >
                            <SlidersHorizontal className={`w-4 h-4 md:w-5 md:h-5 ${stateParam ? "text-[#D4AF37]" : ""}`} />
                            {stateParam && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D4AF37] text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                                    !
                                </span>
                            )}
                        </button>
                    </div>
                </div>

                {/* Grid Heading */}
                <div className="mt-12 mb-4">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">
                        Discover salons in <span className="text-[#D4AF37] capitalize">{cityParam || "your city"}</span>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Based on your preferences and location</p>
                </div>

                {/* Discovery Settings Modal */}
                <AnimatePresence>
                    {isSortModalOpen && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-6 bg-black/80 backdrop-blur-xl"
                            onClick={() => setIsSortModalOpen(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, y: 20, opacity: 0 }}
                                animate={{ scale: 1, y: 0, opacity: 1 }}
                                exit={{ scale: 0.9, y: 20, opacity: 0 }}
                                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                                className="bg-white w-full max-w-md rounded-[32px] overflow-hidden shadow-2xl relative"
                                onClick={(e) => e.stopPropagation()}
                            >
                                {/* Modal Header */}
                                <div className="px-6 pt-6 pb-4 flex items-center justify-between border-b border-gray-50">
                                    <div>
                                        <h2 className="text-xl font-serif font-bold text-gray-900">Discovery Settings</h2>
                                        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Refine your search</p>
                                    </div>
                                    <button
                                        onClick={() => setIsSortModalOpen(false)}
                                        className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-full text-gray-400 hover:text-gray-900 hover:bg-gray-100 transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto no-scrollbar">
                                    {/* Location Selectors (Form + Dropdown) */}
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-2 px-1">
                                            <MapPin size={14} className="text-[#D4AF37]" />
                                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Discovery Location</h3>
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            {/* State Selector */}
                                            <div className="relative" ref={stateListRef}>
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">State</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder="State..."
                                                        value={stateSearch}
                                                        onChange={(e) => {
                                                            setStateSearch(e.target.value);
                                                            setIsStateListOpen(true);
                                                        }}
                                                        onFocus={() => setIsStateListOpen(true)}
                                                        className="w-full bg-white border border-gray-100 px-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all pr-10"
                                                    />
                                                    <Search size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                                </div>

                                                <AnimatePresence>
                                                    {isStateListOpen && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute z-[110] left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto no-scrollbar"
                                                        >
                                                            {State.getStatesOfCountry('IN')
                                                                .filter(s => s.name.toLowerCase().includes(stateSearch.toLowerCase()))
                                                                .map(state => (
                                                                    <button
                                                                        key={state.isoCode}
                                                                        onClick={() => {
                                                                            setSelectedState(state);
                                                                            setStateSearch(state.name);
                                                                            setIsStateListOpen(false);
                                                                            setCitySearch(""); // Clear city on state change
                                                                        }}
                                                                        className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors font-medium text-gray-700 block border-b border-gray-50 last:border-0"
                                                                    >
                                                                        {state.name}
                                                                    </button>
                                                                ))
                                                            }
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>

                                            {/* City Selector */}
                                            <div className="relative" ref={cityListRef}>
                                                <label className="text-[9px] font-black text-gray-400 uppercase tracking-widest pl-1 mb-1 block">City</label>
                                                <div className="relative">
                                                    <input
                                                        type="text"
                                                        placeholder={selectedState ? "City..." : "Wait..."}
                                                        disabled={!selectedState}
                                                        value={citySearch}
                                                        onChange={(e) => {
                                                            setCitySearch(e.target.value);
                                                            setIsCityListOpen(true);
                                                        }}
                                                        onFocus={() => setIsCityListOpen(true)}
                                                        className="w-full bg-white border border-gray-100 px-4 py-3 rounded-xl text-sm font-medium focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] outline-none transition-all pr-10 disabled:bg-gray-50 disabled:cursor-not-allowed"
                                                    />
                                                    <Map size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-300" />
                                                </div>

                                                <AnimatePresence>
                                                    {isCityListOpen && selectedState && (
                                                        <motion.div
                                                            initial={{ opacity: 0, y: -10 }}
                                                            animate={{ opacity: 1, y: 0 }}
                                                            exit={{ opacity: 0, y: -10 }}
                                                            className="absolute z-[110] left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden max-h-48 overflow-y-auto no-scrollbar"
                                                        >
                                                            {City.getCitiesOfState('IN', selectedState.isoCode)
                                                                .filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase()))
                                                                .map(city => (
                                                                    <button
                                                                        key={city.name}
                                                                        onClick={() => {
                                                                            setCitySearch(city.name);
                                                                            setIsCityListOpen(false);
                                                                        }}
                                                                        className="w-full text-left px-5 py-3 text-sm hover:bg-gray-50 transition-colors font-medium text-gray-700 block border-b border-gray-50 last:border-0"
                                                                    >
                                                                        {city.name}
                                                                    </button>
                                                                ))
                                                            }
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Preference Sections - Independent Selection */}
                                    <div className="space-y-4 pt-4 border-t border-gray-50">
                                        <div className="flex items-center gap-2 px-1">
                                            <SlidersHorizontal size={14} className="text-[#D4AF37]" />
                                            <h3 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Service Preferences</h3>
                                        </div>

                                        <div className="grid grid-cols-1 gap-2">
                                            {/* Top Rated Toggle */}
                                            <button
                                                onClick={() => setPreferTopRated(!preferTopRated)}
                                                className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between border ${preferTopRated
                                                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-lg'
                                                    : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <Star size={16} className={preferTopRated ? "text-[#D4AF37]" : "text-gray-300"} fill={preferTopRated ? "#D4AF37" : "transparent"} />
                                                    <div className="text-left">
                                                        <p className="leading-none text-xs">Top Rated Salons</p>
                                                        <p className="text-[9px] mt-1 font-medium text-gray-400">4.0+ star ratings</p>
                                                    </div>
                                                </div>
                                                {preferTopRated && <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>}
                                            </button>

                                            {/* Price Sort Toggle */}
                                            <button
                                                onClick={() => setSortBy(sortBy === "price" ? "rating" : "price")}
                                                className={`w-full px-5 py-3.5 rounded-2xl text-sm font-bold transition-all flex items-center justify-between border ${sortBy === "price"
                                                    ? 'bg-[#1a1a1a] text-white border-[#1a1a1a] shadow-lg'
                                                    : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                                                    }`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <ArrowUpDown size={16} className={sortBy === "price" ? "text-[#D4AF37]" : "text-gray-300"} />
                                                    <div className="text-left">
                                                        <p className="leading-none text-xs">Best Value</p>
                                                        <p className="text-[9px] mt-1 font-medium text-gray-400">Lowest price first</p>
                                                    </div>
                                                </div>
                                                {sortBy === "price" && <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>}
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Section */}
                                <div className="p-6 bg-gray-50/50 border-t border-gray-100">
                                    <div className="flex items-center justify-between p-4 bg-white rounded-2xl border border-gray-100 mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center shadow-lg shadow-[#D4AF37]/20">
                                                <span className="text-lg font-serif font-black text-white">{salons.length}</span>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-[#D4AF37] font-black uppercase tracking-widest leading-none mb-0.5">Total</p>
                                                <p className="text-sm font-bold text-gray-900 leading-none">Salons found</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Apply Button */}
                                    <button
                                        onClick={() => {
                                            setSearchParams(prev => {
                                                const newParams = new URLSearchParams(prev);
                                                if (stateSearch) newParams.set("state", stateSearch);
                                                else newParams.delete("state");
                                                if (citySearch) newParams.set("city", citySearch);
                                                else newParams.delete("city");

                                                newParams.set("topRated", preferTopRated);
                                                newParams.set("sortBy", sortBy);
                                                return newParams;
                                            });
                                            setCityQuery(citySearch);
                                            setIsSortModalOpen(false);
                                        }}
                                        className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-black active:scale-[0.98] transition-all"
                                    >
                                        Apply Settings
                                    </button>
                                </div>
                            </motion.div>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Salon Grid */}
                <div className="w-full py-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                            <p className="text-gray-500 animate-pulse">Finding the best salons for you...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-20">
                            <p className="text-red-500 mb-4">{error}</p>
                            <button onClick={() => fetchSalons()} className="text-[#D4AF37] font-bold border-b-2 border-[#D4AF37] hover:text-[#B48F27] transition-colors">Try Again</button>
                        </div>
                    ) : salons.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                                <Search className="text-gray-300 w-10 h-10" />
                            </div>
                            <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">No Salons Found</h3>
                            <p className="text-gray-500">We couldn't find any salons matching your search criteria.</p>
                            <button onClick={() => setSearchParams({})} className="mt-6 text-[#D4AF37] font-bold hover:text-[#B48F27] transition-colors">Clear Filters</button>
                        </div>
                    ) : (
                        <>
                            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
                                {salons.map((salon) => (
                                    <div key={salon._id} className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col transition hover:shadow-md group">
                                        <div className="relative h-56 w-full overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => navigate(`/shop/${salon._id}`)}>
                                            <img
                                                src={salon.images && salon.images.length > 0 ? salon.images[0] : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                alt={salon.name}
                                            />
                                            <button
                                                className={`absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-sm transition-all hover:scale-110 active:scale-95 ${userFavorites.includes(salon._id) ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                                                onClick={(e) => handleToggleFavorite(e, salon._id)}
                                            >
                                                <Heart size={16} strokeWidth={userFavorites.includes(salon._id) ? 1.5 : 2} className={userFavorites.includes(salon._id) ? "fill-red-500" : ""} />
                                            </button>
                                        </div>
                                        <div className="p-4 flex flex-col flex-1">
                                            <div className="flex items-center gap-1 mb-2">
                                                <span className="text-xs text-gray-500">Salon</span>
                                                <div className="flex gap-0.5">
                                                    {[...Array(5)].map((_, i) => <Star key={i} size={11} className="fill-[#febb02] text-[#febb02]" />)}
                                                </div>
                                                {salon.rating >= 4.5 && <span className="ml-1 bg-[#0071c2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm tracking-wide">Top Rated</span>}
                                            </div>
                                            <h3 className="text-[1.1rem] font-bold text-[#1a1a1a] leading-tight mb-1 cursor-pointer hover:text-[#0071C2] transition-colors" onClick={() => navigate(`/shop/${salon._id}`)}>
                                                {salon.name}
                                            </h3>
                                            <div className="mb-4 flex flex-col gap-1">
                                                <span className="text-sm text-[#0071c2] flex items-center gap-1"><MapPin size={13} className="shrink-0" />{salon.city ? `${salon.city}, India` : "Location not set"}</span>
                                                <span className="text-sm text-gray-500 flex items-center gap-1"><Phone size={13} className="shrink-0" />{salon.contactNumber || salon.owner?.phonenumber || "+91 Unavailable"}</span>
                                            </div>
                                            <div className="mt-auto flex items-end justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div className="bg-[#003b95] text-white px-2 py-2 font-bold flex items-center justify-center rounded-t-md rounded-br-md rounded-bl-sm min-w-[32px] text-sm">{salon.rating || "New"}</div>
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-bold text-[#1a1a1a] leading-none mb-1">{salon.rating > 4 ? "Excellent" : (salon.rating > 3 ? "Very Good" : "Good")}</span>
                                                        <span className="text-[11px] text-gray-500 leading-none">{salon.reviews?.length || "0"} reviews</span>
                                                    </div>
                                                </div>
                                                <div className="text-right flex flex-col items-end">
                                                    <div className="text-[11px] text-gray-500 mb-1">Timing <span className="font-bold text-gray-800">{salon.openingHours || "09:00"} - {salon.closingHours || "21:00"}</span></div>
                                                    <div className="text-xs text-gray-500">Available Seats <span className="text-lg font-bold text-[#1a1a1a] ml-1">{salon.availableSeats || 0}</span></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-2 py-10 border-t border-gray-100 mt-6">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                                    >
                                        <ChevronLeft size={20} className="text-gray-600 group-hover:text-[#1a1a1a]" />
                                    </button>

                                    <div className="flex items-center gap-1.5 mx-2">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const pageNumber = i + 1;
                                            // Show only first, last, and pages around current
                                            if (
                                                pageNumber === 1 ||
                                                pageNumber === totalPages ||
                                                (pageNumber >= currentPage - 1 && pageNumber <= currentPage + 1)
                                            ) {
                                                return (
                                                    <button
                                                        key={pageNumber}
                                                        onClick={() => setCurrentPage(pageNumber)}
                                                        className={`min-w-[40px] h-10 rounded-full text-sm font-bold transition-all ${currentPage === pageNumber ? 'bg-[#1a1a1a] text-white shadow-lg scale-105' : 'text-gray-500 hover:bg-gray-100'}`}
                                                    >
                                                        {pageNumber}
                                                    </button>
                                                );
                                            } else if (
                                                (pageNumber === 2 && currentPage > 3) ||
                                                (pageNumber === totalPages - 1 && currentPage < totalPages - 2)
                                            ) {
                                                return <span key={pageNumber} className="text-gray-300 px-1">...</span>;
                                            }
                                            return null;
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="w-10 h-10 rounded-full border border-gray-200 flex items-center justify-center hover:bg-gray-50 transition-all disabled:opacity-30 disabled:cursor-not-allowed group"
                                    >
                                        <ChevronRight size={20} className="text-gray-600 group-hover:text-[#1a1a1a]" />
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}