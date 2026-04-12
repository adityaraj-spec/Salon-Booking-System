import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, MapPin, Loader2, Phone, Heart, ChevronDown, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import axiosInstance from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';

const INDIAN_STATES = [
    { value: "", label: "Select State" },
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
    const { user } = useAuth();
    const { showNotification } = useNotification();
    const [searchParams, setSearchParams] = useSearchParams();
    const cityParam = searchParams.get("city") || "";

    const [salons, setSalons] = useState([]);
    const [userFavorites, setUserFavorites] = useState([]);
    const [cityQuery, setCityQuery] = useState(cityParam);
    const [selectedState, setSelectedState] = useState("");
    const [sortBy, setSortBy] = useState("price");
    const [sortOrder, setSortOrder] = useState("asc");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsDropdownOpen(false);
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
                search: targetState,
                sortBy: sortBy,
                sortOrder: sortOrder
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

    // Sync search input with URL city param only when URL changes
    useEffect(() => {
        setCityQuery(cityParam);
    }, [cityParam]);

    // Reset to first page when search filters change
    useEffect(() => {
        setCurrentPage(1);
    }, [cityParam, selectedState, sortBy, sortOrder]);

    // Fetch salons when search, state, sorting, or page changes
    useEffect(() => {
        fetchSalons(cityParam, selectedState, currentPage);
    }, [cityParam, selectedState, sortBy, sortOrder, currentPage]);

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

                    {/* Search Bar & Filter */}
                    <div className="flex flex-row items-center justify-center gap-2 md:gap-3 max-w-3xl mx-auto w-full px-2 md:px-0">
                        <form onSubmit={handleSearch} className="flex flex-row items-center justify-between gap-1 flex-1 bg-white p-1 md:p-1.5 rounded-full shadow-sm border border-gray-100 ring-4 ring-[#1A1A1A]/5">
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
                                className="shrink-0 bg-[#1A1A1A] text-white p-2.5 md:px-4 md:py-2.5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-1.5"
                            >
                                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : (
                                    <>
                                        <div className="hidden md:flex items-center gap-1"><Search className="w-4 h-4" /><span>Search</span></div>
                                        <Search className="md:hidden w-3.5 h-3.5" />
                                    </>
                                )}
                            </button>
                        </form>

                        {/* State Dropdown */}
                        <div className="relative w-[135px] sm:w-40 md:w-48 shrink-0" ref={dropdownRef}>
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
                            {isDropdownOpen && (
                                <div className="absolute z-50 min-w-[200px] right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden">
                                    <ul className="max-h-64 overflow-y-auto overflow-x-hidden py-2 w-full">
                                        {INDIAN_STATES.map((state) => (
                                            <li key={state.value}>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedState(state.value);
                                                        fetchSalons(cityQuery, state.value);
                                                        setIsDropdownOpen(false);
                                                    }}
                                                    className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-gray-50 flex items-center justify-between ${(selectedState || "") === state.value ? 'text-[#D4AF37] font-bold bg-orange-50/50' : 'text-gray-700 font-medium'}`}
                                                >
                                                    {state.label}
                                                    {(selectedState || "") === state.value && <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>}
                                                </button>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 3-Column Sorting Row */}
                    <div className="grid grid-cols-1 md:grid-cols-[200px_1fr_200px] items-center gap-6 mt-10 px-6 py-6 bg-gray-50/50 rounded-[40px] border border-gray-100 shadow-sm">
                        {/* Column 1: Label */}
                        <div className="flex flex-col gap-1 text-center md:text-left">
                            <h2 className="text-2xl font-serif font-bold text-gray-900 leading-tight">Sort by</h2>
                        </div>

                        {/* Column 2: Buttons (Wide) */}
                        <div className="flex justify-center">
                            <div className="flex bg-white p-1.5 rounded-full border border-gray-100 shadow-sm flex-wrap justify-center gap-1 group">
                                <button 
                                    onClick={() => { setSortBy("price"); setSortOrder("asc"); }}
                                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${sortBy === "price" && sortOrder === "asc" ? 'bg-[#1a1a1a] text-white shadow-lg scale-105' : 'text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-50'}`}
                                >
                                    Price: Low to High
                                </button>
                                <button 
                                    onClick={() => { setSortBy("price"); setSortOrder("desc"); }}
                                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${sortBy === "price" && sortOrder === "desc" ? 'bg-[#1a1a1a] text-white shadow-lg scale-105' : 'text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-50'}`}
                                >
                                    Price: High to Low
                                </button>
                                <button 
                                    onClick={() => { setSortBy("rating"); setSortOrder("desc"); }}
                                    className={`px-6 py-2.5 rounded-full text-xs font-bold transition-all duration-300 ${sortBy === "rating" ? 'bg-[#1a1a1a] text-white shadow-lg scale-105' : 'text-gray-400 hover:text-[#1a1a1a] hover:bg-gray-50'}`}
                                >
                                    Top Rated
                                </button>
                            </div>
                        </div>
                        
                        {/* Column 3: Total Count */}
                        <div className="flex flex-col items-center md:items-end gap-1">
                            <div className="text-[10px] text-gray-400 font-bold uppercase tracking-[0.2em]">Salons Found</div>
                            <div className="flex items-baseline gap-1">
                                <span className="text-4xl font-serif font-bold text-[#D4AF37] leading-none">{salons.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid Heading */}
                <div className="mt-12 mb-4">
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gray-900">
                        Discover salons in <span className="text-[#D4AF37] capitalize">{cityParam || "your city"}</span>
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Based on your preferences and location</p>
                </div>

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