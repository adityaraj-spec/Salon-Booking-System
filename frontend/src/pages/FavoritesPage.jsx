import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { Star, MapPin, Heart, Search, ArrowLeft } from 'lucide-react';
import axiosInstance from '../api/axiosConfig';
import useDocumentTitle from '../hooks/useDocumentTitle';
import { useAuth } from '../context/AuthContext';
import { useNotification } from '../context/NotificationContext';
import { SalonCardSkeleton } from '../components/skeletons/index.jsx';
import salonPlaceholder from '../assets/salon1.jpg';


export function FavoritesPage() {
    useDocumentTitle('My Favorites', 'Your saved preferred salons for quick rebooking on SalonNow.');
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
            <div className="w-full min-h-screen bg-white flex flex-col items-center justify-center pt-20 pb-12 text-center">
                <Heart className="w-16 h-16 text-gray-200 mb-4" />
                <h2 className="text-2xl font-sans font-semibold text-gray-900 mb-2">Please Login</h2>
                <p className="text-gray-500 mb-6 leading-relaxed">You need to log in to view your favorite salons.</p>
                <button onClick={() => navigate("/login")} className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition-colors">
                    Login Now
                </button>
            </div>
        )
    }

    return (
        <div className="w-full min-h-screen bg-[#fafafa]">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-12">
                <div className="mb-6">
                    <NavLink to="/discover" className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 transition-colors shadow-sm">
                        <ArrowLeft size={16} /> Back to Discover
                    </NavLink>
                </div>
            
                <div className="mb-8 text-center">
                    <h1 className="text-4xl md:text-5xl font-sans font-bold tracking-tight text-gray-900 mb-3 flex items-center justify-center gap-3">
                        <Heart className="text-[#D4AF37] fill-[#D4AF37] w-10 h-10" />
                        My Favorites
                    </h1>
                    <p className="text-gray-500 max-w-2xl mx-auto leading-relaxed">
                        Your curated list of preferred salons and styling destinations.
                    </p>
                </div>

                {loading ? (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {[...Array(8)].map((_, i) => <SalonCardSkeleton key={i} />)}
                    </div>
                ) : error ? (
                    <div className="text-center py-12">
                        <p className="text-red-500 mb-4 leading-relaxed">{error}</p>
                        <button onClick={fetchFavorites} className="bg-amber-50 text-[#D4AF37] px-4 py-2 rounded-lg font-semibold hover:bg-amber-100 transition-colors">
                            Try Again
                        </button>
                    </div>
                ) : salons.length === 0 ? (
                    <div className="text-center py-10 md:py-12 px-6 bg-white rounded-xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
                        <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Heart className="text-gray-300 w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-sans font-semibold text-gray-900 mb-2">No Favorites Yet</h3>
                        <p className="text-gray-500 mb-6 max-w-md mx-auto leading-relaxed text-sm">You haven't added any salons to your favorites list. Start exploring and click the heart icon to save them here!</p>
                        <button
                            onClick={() => navigate('/home')}
                            className="bg-[#D4AF37] text-white px-6 py-2.5 rounded-xl font-bold text-xs hover:bg-[#B8962E] transition-colors shadow-lg shadow-[#D4AF37]/20 flex items-center gap-2 mx-auto"
                        >
                            <Search size={16} />
                            Discover Salons
                        </button>
                    </div>
                ) : (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {salons.map((salon) => {
                            const startingPrice = salon.startingPrice ?? (salon.services?.length ? Math.min(...salon.services.map(s => Number(s.price) || Infinity)) : null);
                            const validPrice = startingPrice != null && startingPrice !== Infinity ? startingPrice : null;
                            const operatingHours = (salon.openingHours && salon.closingHours) ? `${salon.openingHours} - ${salon.closingHours}` : "9:00 AM - 8:00 PM";

                            return (
                                <div
                                    key={salon._id}
                                    className="w-full bg-white border border-stone-200/60 rounded-xl overflow-hidden flex flex-col shadow-soft-sm hover:shadow-soft-lg hover:-translate-y-1 transition-all duration-200 group"
                                >
                                    <div className="relative h-48 md:h-52 w-full overflow-hidden flex-shrink-0 cursor-pointer" onClick={() => navigate(`/shop/${salon._id}`)}>
                                        <img
                                            src={salon.images && salon.images.length > 0 ? salon.images[0] : salonPlaceholder}
                                            alt={salon.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                        />
                                        <button
                                            aria-label="Remove from favorites"
                                            className="absolute top-3 right-3 w-8 h-8 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center text-red-500 hover:bg-white shadow-sm transition-all hover:scale-110 active:scale-95"
                                            onClick={(e) => handleToggleFavorite(e, salon._id)}
                                        >
                                            <Heart size={16} className="fill-red-500" strokeWidth={1.5} />
                                        </button>
                                        {salon.rating >= 4.5 && (
                                            <span className="absolute top-3 left-3 bg-white/95 backdrop-blur-sm text-stone-900 border border-stone-200/80 text-[11px] font-bold px-2.5 py-0.5 rounded-full shadow-xs">
                                                Top Rated
                                            </span>
                                        )}
                                    </div>
                                    <div className="p-4 flex flex-col flex-1">
                                        {/* Row 1: Title & Rating */}
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3
                                                className="text-base font-semibold text-gray-900 leading-snug cursor-pointer hover:text-[#D4AF37] transition-colors line-clamp-1"
                                                onClick={() => navigate(`/shop/${salon._id}`)}
                                                title={salon.name}
                                            >
                                                {salon.name}
                                            </h3>
                                            <div className="flex items-center gap-1 text-xs font-bold text-gray-900 shrink-0">
                                                <Star size={13} className="fill-amber-400 text-amber-400" />
                                                <span>{salon.rating ? Number(salon.rating).toFixed(1) : "New"}</span>
                                            </div>
                                        </div>

                                        {/* Row 2: Location & Price (Right beneath rating, in address row) */}
                                        <div className="flex items-center justify-between gap-2 text-xs mb-3">
                                            <p className="text-stone-500 flex items-center gap-1 truncate">
                                                <MapPin size={12} className="text-[#8a6500] shrink-0" />
                                                <span className="truncate">{salon.city ? `${salon.city}, India` : (salon.address || "Location not set")}</span>
                                            </p>
                                            {validPrice != null && (
                                                <span className="text-gray-900 font-semibold shrink-0">
                                                    From ₹{validPrice}
                                                </span>
                                            )}
                                        </div>

                                        {/* Row 3: Footer (Operating timing on left, Seat status on right) */}
                                        <div className="mt-auto pt-3 border-t border-gray-100 flex items-center justify-between gap-2 text-xs">
                                            <span className="text-gray-500 font-medium text-xs truncate">
                                                {operatingHours}
                                            </span>
                                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80 shrink-0">
                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                                <span>{Math.max(0, Number(salon.availableSeats) || 0)}/{Math.max(1, Number(salon.maxConcurrentStaff) || Number(salon.totalSeats) || 5)} seats free</span>
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

