import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Star, MapPin, Phone, Heart, Search } from 'lucide-react';
import axiosInstance from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { SalonCardSkeleton } from '../components/skeletons/index.jsx';


export function FavoritesPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { showNotification } = useNotification();
    
    const [salons, setSalons] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchFavorites = async () => {
        if (!user) return;
        setLoading(true);
        try {
            const response = await axiosInstance.get("/users/favorites");
            if (response.data.success) {
                setSalons(response.data.data.favorites || []);
            }
        } catch (err) {
            setError(err.response?.data?.message || "Failed to load favorites.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFavorites();
    }, [user]);

    const handleToggleFavorite = async (e, salonId) => {
        e.stopPropagation();
        try {
            const response = await axiosInstance.post(`/users/favorites/${salonId}`);
            if (response.data.success) {
                // Remove it from the list immediately
                const isFavorited = response.data.data.isFavorited;
                if (!isFavorited) {
                    setSalons(prev => prev.filter(s => s._id !== salonId));
                    showNotification("Removed from favorites", "info");
                }
            }
        } catch (error) {
            showNotification("Failed to update favorites.", "error");
        }
    };

    if (!user) {
        return (
            <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center pt-24 text-center">
                <Heart className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Please Login</h2>
                <p className="text-gray-500 mb-6">You need to log in to view your favorite salons.</p>
                <button onClick={() => navigate("/login")} className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold uppercase tracking-widest text-xs hover:bg-black transition-colors">
                    Login Now
                </button>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen bg-[#fafafa]">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-32 pb-12">
            
                <div className="mb-10 text-center">
                    <h1 className="text-4xl md:text-5xl font-serif font-bold text-gray-900 mb-4 flex items-center justify-center gap-3">
                        <Heart className="text-[#D4AF37] fill-[#D4AF37] w-10 h-10" />
                        My Favorites
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto">
                        Your curated list of preferred salons and styling destinations.
                    </p>
                </div>

                {loading ? (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => <SalonCardSkeleton key={i} />)}
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button onClick={fetchFavorites} className="text-[#D4AF37] font-bold border-b-2 border-[#D4AF37] hover:text-[#B48F27] transition-colors">
                            Try Again
                        </button>
                    </div>
                ) : salons.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Heart className="text-gray-300 w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-3">No Favorites Yet</h3>
                        <p className="text-gray-500 mb-8 max-w-md mx-auto">You haven't added any salons to your favorites list. Start exploring and click the heart icon to save them here!</p>
                        <button
                            onClick={() => navigate('/home')}
                            className="bg-[#D4AF37] text-white px-8 py-3.5 rounded-full font-bold tracking-widest text-xs uppercase hover:bg-[#B8962E] transition-colors shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 mx-auto"
                        >
                            <Search size={16} />
                            Discover Salons
                        </button>
                    </div>
                ) : (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {salons.map((salon) => (
                            <div
                                key={salon._id}
                                className="w-full bg-white border border-gray-100 rounded-2xl overflow-hidden flex flex-col transition-all hover:shadow-xl hover:shadow-[#D4AF37]/5 hover:-translate-y-1 group"
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
                                    {/* Removing Favorite Button */}
                                    <button 
                                        className="absolute top-4 right-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-lg transition-all hover:scale-110 active:scale-95" 
                                        onClick={(e) => handleToggleFavorite(e, salon._id)}
                                    >
                                        <Heart size={20} className="fill-red-500" strokeWidth={1.5} />
                                    </button>
                                </div>

                                {/* Content Section */}
                                <div className="p-5 flex flex-col flex-1">
                                    {/* Salon Type & Stars */}
                                    <div className="flex items-center gap-1 mb-2">
                                        <span className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-widest bg-[#D4AF37]/10 px-2 py-1 rounded-md">Salon</span>
                                        <div className="flex gap-0.5 ml-2">
                                            {[...Array(5)].map((_, i) => (
                                                <Star key={i} size={11} className="fill-[#D4AF37] text-[#D4AF37]" />
                                            ))}
                                        </div>
                                    </div>

                                    {/* Name */}
                                    <h3
                                        className="text-lg font-bold text-gray-900 leading-tight mb-2 cursor-pointer hover:text-[#D4AF37] transition-colors line-clamp-1"
                                        onClick={() => navigate(`/shop/${salon._id}`)}
                                    >
                                        {salon.name}
                                    </h3>

                                    {/* Location & Phone */}
                                    <div className="mb-5 flex flex-col gap-1.5 border-b border-gray-50 pb-4">
                                        <span className="text-sm text-gray-500 flex items-center gap-2 font-medium">
                                            <MapPin size={14} className="text-[#D4AF37] shrink-0" />
                                            {salon.city ? `${salon.city}, India` : "Location not set"}
                                        </span>
                                        <span className="text-sm text-gray-500 flex items-center gap-2">
                                            <Phone size={14} className="text-[#D4AF37] shrink-0" />
                                            {salon.contactNumber || "+91 Unavailable"}
                                        </span>
                                    </div>

                                    {/* Bottom row aligning rating left and timing/seats right */}
                                    <div className="mt-auto flex items-end justify-between">
                                        {/* Left: Rating block */}
                                        <div className="flex items-center gap-2.5">
                                            <div className="bg-[#1a1a1a] text-white px-2.5 py-1.5 font-bold flex items-center justify-center rounded-lg text-sm shadow-sm ring-1 ring-gray-900/5">
                                                {salon.rating || "New"}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-bold text-gray-900 leading-none mb-1 uppercase tracking-wider">
                                                    {salon.rating > 4 ? "Excellent" : (salon.rating > 3 ? "Great" : "Good")}
                                                </span>
                                                <span className="text-[10px] text-gray-400 leading-none">
                                                    {salon.reviews?.length || "0"} reviews
                                                </span>
                                            </div>
                                        </div>

                                        {/* Right: Timing and Seats */}
                                        <div className="text-right flex flex-col items-end">
                                            <div className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">
                                                Timing
                                            </div>
                                            <div className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded-md">
                                                {salon.openingHours || "09:00"} - {salon.closingHours || "21:00"}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

