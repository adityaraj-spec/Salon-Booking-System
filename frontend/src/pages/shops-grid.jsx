import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Search, Star, MapPin, Users, Clock, Loader2, ChevronLeft, ChevronRight, Phone } from 'lucide-react';
import axiosInstance from '../api/axiosConfig';

export function Shops() {
    const navigate = useNavigate();
    const [salons, setSalons] = useState([]);
    const [city, setCity] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Pagination State
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalSalons, setTotalSalons] = useState(0);

    const fetchSalons = async (targetPage = page) => {
        setLoading(true);
        setError("");
        try {
            const params = {
                page: targetPage,
                limit: 8 // You can adjust this or make it dynamic
            };
            if (city) params.city = city;

            const response = await axiosInstance.get("/salons", { params });

            if (response.data.success) {
                const { salons: fetchedSalons, pagination } = response.data.data;
                setSalons(fetchedSalons);
                setTotalPages(pagination.totalPages);
                setTotalSalons(pagination.totalSalons);
                setPage(pagination.currentPage);

                // Scroll to top when page changes
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
        fetchSalons(1);
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        setPage(1); // Reset to first page on new search
        fetchSalons(1);
    };

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= totalPages) {
            setPage(newPage);
            fetchSalons(newPage);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="text-center py-16 md:py-24 px-6 md:px-12">
                <h1 className="text-4xl md:text-6xl font-serif text-gray-900 mb-4 leading-tight">
                    Discover Your <br className="hidden md:block" />
                    <span className="text-[#D4AF37]">Perfect Salon</span>
                </h1>
                <p className="text-gray-500 text-base md:text-lg mb-10 max-w-2xl mx-auto px-4">
                    Browse curated salons near you. View real-time availability and book instantly.
                </p>

                {/* Search Bar Container */}
                <form onSubmit={handleSearch} className="flex flex-row items-center justify-between gap-1 max-w-2xl mx-auto bg-white p-1 md:p-2 rounded-full shadow-sm border border-gray-100 ring-4 ring-[#1A1A1A]/5">
                    <div className="flex items-center flex-1 px-4 md:px-6 gap-2 md:gap-3">
                        <MapPin className="text-[#D4AF37] w-4 h-4 md:w-5 md:h-5 shrink-0" />
                        <input
                            type="text"
                            placeholder="Search by city..."
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full outline-none text-gray-700 placeholder-gray-400 text-sm md:text-base font-medium py-2 bg-transparent"
                        />
                    </div>
                    <button 
                        type="submit" 
                        disabled={loading}
                        className="shrink-0 bg-[#1A1A1A] text-white p-3 md:px-5 md:py-4 rounded-full font-bold uppercase text-[10px] md:text-xs tracking-widest hover:bg-black active:scale-95 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                    >
                        {loading ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                            <>
                                <div className="hidden md:flex items-center gap-1">
                                    <Search className="w-5 h-5" />
                                    <span>Search</span>
                                </div>
                                <Search className="md:hidden w-5 h-5" />
                            </>
                        )}
                    </button>
                </form>
            </div>

            <div className="w-full bg-white mx-auto px-6 md:px-12 py-8 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                        <p className="text-gray-500 animate-pulse">Finding the best salons for you...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button onClick={() => fetchSalons(page)} className="text-[#D4AF37] font-bold border-b-2 border-[#D4AF37] hover:text-[#B48F27] transition-colors">
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
                            onClick={() => { setCity(""); fetchSalons(1); }}
                            className="mt-6 text-[#D4AF37] font-bold hover:text-[#B48F27] transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center mb-16">
                            {salons.map((salon) => (
                                <div 
                                    key={salon._id} 
                                    className="w-full bg-white shadow-md rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                                    onClick={() => navigate(`/shop/${salon._id}`)}
                                >
                                    <div className="relative h-56 overflow-hidden">
                                        <img
                                            src={salon.images && salon.images.length > 0 ? salon.images[0] : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"}
                                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                                            alt={salon.name}
                                        />
                                        <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                            <span className="font-bold text-xs text-gray-800">{salon.rating || "NEW"}</span>
                                        </div>
                                    </div>

                                    <div className="p-6">
                                        {/* 1. Name */}
                                        <h3 className="text-xl font-serif font-bold text-gray-900 mb-3 truncate group-hover:text-[#D4AF37] transition-colors">
                                            {salon.name}
                                        </h3>

                                        {/* 2. Location */}
                                        <div className="flex items-center gap-2 text-gray-500 mb-2">
                                            <MapPin className="w-4 h-4 text-[#D4AF37]" />
                                            <span className="text-xs font-bold text-[#1A1A1A] truncate">
                                                {salon.city || "Location not set"}
                                            </span>
                                        </div>

                                        {/* 3. Contact No */}
                                        <div className="flex items-center gap-2 text-gray-500 mb-4">
                                            <Phone className="w-4 h-4 text-[#D4AF37]" />
                                            {salon.contactNumber || salon.owner?.phonenumber ? (
                                                <a 
                                                    href={`tel:${salon.contactNumber || salon.owner?.phonenumber}`} 
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="text-xs font-bold text-[#1A1A1A] hover:text-[#D4AF37] transition-colors"
                                                >
                                                    {salon.contactNumber || salon.owner?.phonenumber}
                                                </a>
                                            ) : (
                                                <span className="text-xs font-bold text-gray-300 italic">No contact info</span>
                                            )}
                                        </div>

                                        {/* 4. Timing and Seat in the same line */}
                                        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-[#D4AF37]" />
                                                <span className="text-[10px] font-black uppercase tracking-tight text-[#1A1A1A]">
                                                    {salon.openingHours || "9:00 AM"} - {salon.closingHours || "9:00 PM"}
                                                </span>
                                            </div>

                                            <div className={`px-2.5 py-1 rounded-lg flex items-center gap-1.5 ${salon.availableSeats > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                                                <Users size={12} />
                                                <span className="text-[10px] font-black uppercase tracking-tight">
                                                    {salon.availableSeats > 0 ? `${salon.availableSeats} LEFT` : "FULL"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 pb-12">
                                <button
                                    onClick={() => handlePageChange(page - 1)}
                                    disabled={page === 1}
                                    className="p-3 rounded-full border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronLeft size={20} />
                                </button>

                                <div className="flex items-center gap-2">
                                    {[...Array(totalPages)].map((_, i) => (
                                        <button
                                            key={i + 1}
                                            onClick={() => handlePageChange(i + 1)}
                                            className={`w-10 h-10 rounded-full font-bold text-sm transition-all ${page === i + 1
                                                ? "bg-[#1A1A1A] text-white"
                                                : "text-gray-500 hover:bg-gray-50"
                                                }`}
                                        >
                                            {i + 1}
                                        </button>
                                    ))}
                                </div>

                                <button
                                    onClick={() => handlePageChange(page + 1)}
                                    disabled={page === totalPages}
                                    className="p-3 rounded-full border border-gray-200 text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
                                >
                                    <ChevronRight size={20} />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}