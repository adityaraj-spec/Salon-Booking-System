import { useState, useEffect, useRef } from 'react';
import { NavLink, useNavigate, useSearchParams } from 'react-router-dom';
import { Search, Star, MapPin, Users, Clock, Loader2, ChevronLeft, ChevronRight, Phone, Heart, ChevronDown } from 'lucide-react';
import axiosInstance from '../api/axiosConfig';

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

    const [salons, setSalons] = useState([]);
    const [cityQuery, setCityQuery] = useState(cityParam);
    const [selectedState, setSelectedState] = useState(stateParam);
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
                <div className="flex flex-col md:flex-row items-center justify-center gap-3 max-w-3xl mx-auto">
                    <form onSubmit={handleSearch} className="flex flex-row items-center justify-between gap-1 w-full md:w-[65%] bg-white p-1 md:p-1.5 rounded-full shadow-sm border border-gray-100 ring-4 ring-[#1A1A1A]/5">
                        <div className="flex items-center flex-1 px-4 md:px-5 gap-2 md:gap-3">
                            <MapPin className="text-[#D4AF37] w-4 h-4 md:w-5 md:h-5 shrink-0" />
                            <input
                                type="text"
                                placeholder="Search by city..."
                                value={cityQuery}
                                onChange={(e) => setCityQuery(e.target.value)}
                                className="w-full outline-none text-gray-700 placeholder-gray-400 text-sm font-medium py-1.5 bg-transparent"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="shrink-0 bg-[#1A1A1A] text-white p-2 md:px-4 md:py-2.5 rounded-full font-bold uppercase text-[10px] tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-1.5"
                        >
                            {loading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <>
                                    <div className="hidden md:flex items-center gap-1">
                                        <Search className="w-4 h-4" />
                                        <span>Search</span>
                                    </div>
                                    <Search className="md:hidden w-4 h-4" />
                                </>
                            )}
                        </button>
                    </form>
                    
                    {/* Custom State Dropdown */}
                    <div className="relative w-full md:w-44" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                            className="w-full bg-white border border-gray-100 text-gray-700 py-2 md:py-[12px] px-5 rounded-full shadow-sm outline-none font-medium text-sm cursor-pointer ring-4 ring-[#1A1A1A]/5 hover:border-[#D4AF37] transition-colors flex items-center justify-between gap-2"
                        >
                            <span className="truncate">
                                {INDIAN_STATES.find(s => s.value === (selectedState || ""))?.label || "All States"}
                            </span>
                            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu */}
                        {isDropdownOpen && (
                            <div className="absolute z-50 w-full mt-2 bg-white border border-gray-100 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <ul className="max-h-64 overflow-y-auto py-2 scroll-smooth">
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
                                                className={`w-full text-left px-5 py-3 text-sm transition-colors hover:bg-gray-50 flex items-center justify-between ${
                                                    (selectedState || "") === state.value ? 'text-[#D4AF37] font-bold bg-orange-50/50' : 'text-gray-700 font-medium'
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
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-10">
                            {salons.map((salon) => (
                                <div
                                    key={salon._id}
                                    className="w-full bg-white border border-gray-200 rounded-lg overflow-hidden flex flex-col transition hover:shadow-md group"
                                >
                                    {/* Image Section */}
                                    <div
                                        className="relative h-56 w-full overflow-hidden flex-shrink-0 cursor-pointer"
                                        onClick={() => navigate(`/shop/${salon._id}`)}
                                    >
                                        <img
                                            src={salon.images && salon.images.length > 0 ? salon.images[0] : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            alt={salon.name}
                                        />
                                        {/* Heart Icon */}
                                        <button className="absolute top-3 right-3 w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-400 hover:text-red-500 shadow-sm transition-colors" onClick={(e) => { e.stopPropagation(); /* Add to wishlist logic */ }}>
                                            <Heart size={16} strokeWidth={2} />
                                        </button>
                                    </div>

                                    {/* Content Section */}
                                    <div className="p-4 flex flex-col flex-1">
                                        {/* Salon Type & Stars */}
                                        <div className="flex items-center gap-1 mb-2">
                                            <span className="text-xs text-gray-500">Salon</span>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} size={11} className="fill-[#febb02] text-[#febb02]" />
                                                ))}
                                            </div>
                                            {/* Top Rated Badge */}
                                            {salon.rating >= 4.5 && (
                                                <span className="ml-1 bg-[#0071c2] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-sm tracking-wide">
                                                    Top Rated
                                                </span>
                                            )}
                                        </div>

                                        {/* Name */}
                                        <h3
                                            className="text-[1.1rem] font-bold text-[#1a1a1a] leading-tight mb-1 cursor-pointer hover:text-[#0071C2] transition-colors"
                                            onClick={() => navigate(`/shop/${salon._id}`)}
                                        >
                                            {salon.name}
                                        </h3>

                                        {/* Location & Phone */}
                                        <div className="mb-4 flex flex-col gap-1">
                                            <span className="text-sm text-[#0071c2] flex items-center gap-1">
                                                <MapPin size={13} className="shrink-0" />
                                                {salon.city ? `${salon.city}, India` : "Location not set"}
                                            </span>
                                            <span className="text-sm text-gray-500 flex items-center gap-1">
                                                <Phone size={13} className="shrink-0" />
                                                {salon.contactNumber || salon.owner?.phonenumber || "+91 Unavailable"}
                                            </span>
                                        </div>

                                        {/* Bottom row aligning rating left and timing/seats right */}
                                        <div className="mt-auto flex items-end justify-between">
                                            {/* Left: Rating block */}
                                            <div className="flex items-center gap-2">
                                                <div className="bg-[#003b95] text-white px-2 py-2 font-bold flex items-center justify-center rounded-t-md rounded-br-md rounded-bl-sm min-w-[32px] text-sm">
                                                    {salon.rating || "New"}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-[#1a1a1a] leading-none mb-1">
                                                        {salon.rating > 4 ? "Excellent" : (salon.rating > 3 ? "Very Good" : "Good")}
                                                    </span>
                                                    <span className="text-[11px] text-gray-500 leading-none">
                                                        {salon.reviews?.length || "0"} reviews
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Right: Timing and Seats */}
                                            <div className="text-right flex flex-col items-end">
                                                <div className="text-[11px] text-gray-500 mb-1">
                                                    Timing <span className="font-bold text-gray-800">{salon.openingHours || "09:00"} - {salon.closingHours || "21:00"}</span>
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Available Seats <span className="text-lg font-bold text-[#1a1a1a] ml-1">{salon.availableSeats || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                    </>
                )}
                </div>
            </div>
        </div>
    );
}