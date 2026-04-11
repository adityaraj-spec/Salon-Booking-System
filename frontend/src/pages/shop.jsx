import { useState, useEffect } from 'react';
import { useParams, NavLink, useNavigate } from "react-router-dom";
import { Star, MapPin, Users, Clock, ShieldCheck, Sparkles, Loader2, ArrowLeft, MessageSquare, Send, Trash2, Heart, Phone, Scissors, Award, ChevronLeft, ChevronRight, X, Images } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import axiosInstance from "../api/axiosConfig";
import { SalonMap } from "../components/SalonMap";

export function Shop() {
    const { user } = useAuth();
    const socket = useSocket();
    const { id } = useParams();
    const navigate = useNavigate();

    const [salon, setSalon] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Review form state
    const [rating, setRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState("");
    const [isDeletingReview, setIsDeletingReview] = useState(null);
    const [isLikingReview, setIsLikingReview] = useState(null);
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    
    // Services & Staff state
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);

    // Lightbox state
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    useEffect(() => {
        const fetchSalonDetails = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get(`/salons/${id}`);
                if (response.data.success) {
                    setSalon(response.data.data);
                }
            } catch (err) {
                console.error("Error fetching salon details:", err);
                setError("Failed to load salon details. Please try again later.");
            } finally {
                setLoading(false);
            }
        };

        const fetchReviews = async () => {
            try {
                const response = await axiosInstance.get(`/reviews/salon/${id}`);
                if (response.data.success) {
                    setReviews(response.data.data);
                }
            } catch (err) {
                console.error("Error fetching reviews:", err);
            }
        };

        const fetchServices = async () => {
            try {
                const response = await axiosInstance.get(`/services/salon/${id}`);
                if (response.data.success) {
                    setServices(response.data.data);
                }
            } catch (err) {
                console.error("Error fetching services:", err);
            }
        };

        const fetchStaff = async () => {
            try {
                const response = await axiosInstance.get(`/staff/salon/${id}`);
                if (response.data.success) {
                    setStaff(response.data.data);
                }
            } catch (err) {
                console.error("Error fetching staff:", err);
            }
        };

        if (id) {
            fetchSalonDetails();
            fetchReviews();
            fetchServices();
            fetchStaff();
        }
    }, [id]);

    useEffect(() => {
        if (socket && id) {
            socket.on("salonStatusUpdate", (data) => {
                if (data.salonId === id) {
                    setSalon(prev => ({ ...prev, isOpen: data.isOpen }));
                }
            });

            return () => {
                socket.off("salonStatusUpdate");
            };
        }
    }, [socket, id]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        setReviewError("");

        if (rating === 0) {
            setReviewError("Please select a star rating before posting.");
            setIsSubmitting(false);
            return;
        }
        try {
            const response = await axiosInstance.post(`/reviews`, {
                salonId: id,
                rating,
                reviewText
            });

            if (response.data.success) {
                setReviewText("");
                setRating(0);
                // Re-fetch reviews (populated with user._id & fullName) + salon rating
                const [reviewsRes, salonRes] = await Promise.all([
                    axiosInstance.get(`/reviews/salon/${id}`),
                    axiosInstance.get(`/salons/${id}`)
                ]);
                setReviews(reviewsRes.data.data);
                setSalon(salonRes.data.data);
            }
        } catch (err) {
            setReviewError(err.response?.data?.message || "Failed to post review. You might have already reviewed this salon.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteReview = async (reviewId) => {
        if (!user) return;
        setIsDeletingReview(reviewId);
        try {
            await axiosInstance.delete(`/reviews/${reviewId}`);
            const updatedReviews = reviews.filter((r) => r._id !== reviewId);
            setReviews(updatedReviews);
            // Recalculate average rating locally
            if (updatedReviews.length > 0) {
                const avg = (updatedReviews.reduce((sum, r) => sum + r.rating, 0) / updatedReviews.length).toFixed(1);
                setSalon((prev) => ({ ...prev, rating: Number(avg) }));
            } else {
                setSalon((prev) => ({ ...prev, rating: 0 }));
            }
        } catch (err) {
            console.error("Error deleting review:", err);
        } finally {
            setIsDeletingReview(null);
        }
    };

    const handleToggleLike = async (reviewId) => {
        if (!user) return;
        if (isLikingReview === reviewId) return;
        setIsLikingReview(reviewId);

        // Optimistic UI update
        setReviews((prev) =>
            prev.map((r) => {
                if (r._id !== reviewId) return r;
                const alreadyLiked = r.likes?.some((id) => String(id) === String(user._id));
                return {
                    ...r,
                    likes: alreadyLiked
                        ? r.likes.filter((id) => String(id) !== String(user._id))
                        : [...(r.likes || []), user._id]
                };
            })
        );

        try {
            await axiosInstance.post(`/reviews/${reviewId}/like`);
        } catch (err) {
            console.error("Error toggling like:", err);
            // Revert on failure
            setReviews((prev) =>
                prev.map((r) => {
                    if (r._id !== reviewId) return r;
                    const wasLiked = r.likes?.some((id) => String(id) === String(user._id));
                    return {
                        ...r,
                        likes: wasLiked
                            ? r.likes.filter((id) => String(id) !== String(user._id))
                            : [...(r.likes || []), user._id]
                    };
                })
            );
        } finally {
            setIsLikingReview(null);
        }
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Loading salon details...</p>
            </div>
        );
    }

    if (error || !salon) {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="bg-red-50 p-8 rounded-3xl max-w-md">
                    <h2 className="text-2xl font-serif font-bold text-red-600 mb-4 text-[#1a1a1a]">Oops!</h2>
                    <p className="text-gray-600 mb-8">{error || "Salon not found."}</p>
                    <NavLink to="/home" className="inline-flex items-center gap-2 text-[#D4AF37] font-bold hover:underline">
                        <ArrowLeft size={18} /> Back to Salons
                    </NavLink>
                </div>
            </div>
        );
    }

    // Use seeded images or fallback
    const displayImages = salon.images && salon.images.length > 0
        ? salon.images
        : ["https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=1200&q=80"];

    // Fill the gallery array to exactly 8 for the Booking-style layout
    const galleryImages = [...displayImages];
    while (galleryImages.length < 8) {
        galleryImages.push(displayImages[Math.floor(Math.random() * displayImages.length)]);
    }

    return (
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 pb-6 md:pt-24">
            {/* Navigation Breadcrumb */}
            <NavLink to="/home" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#D4AF37] mb-6 transition-colors text-sm font-medium">
                <ArrowLeft size={16} /> Back to Discover
            </NavLink>

            {/* Salon Closed Banner */}
            {salon.isOpen === false && (
                <div className="mb-10 bg-red-50 border border-red-100 p-6 rounded-[32px] flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-top-4 duration-500">
                    <div className="flex items-center gap-4 text-center md:text-left">
                        <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-red-500 shadow-sm shadow-red-100">
                            <Clock size={28} />
                        </div>
                        <div>
                            <h4 className="text-xl font-serif font-black text-red-600">Currently Offline</h4>
                            <p className="text-red-400 text-sm font-medium">This salon is not accepting immediate bookings right now.</p>
                        </div>
                    </div>
                    <div className="px-6 py-2 bg-red-100 rounded-full text-red-600 text-[10px] font-black uppercase tracking-widest">
                        Closed
                    </div>
                </div>
            )}


            {/* Title & Brand Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="bg-orange-50 text-[#e65c00] text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                            <Sparkles size={12} /> {salon.rating > 4.5 ? "Top Rated Salon" : "Verified Salon"}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-serif font-bold text-[#1a1a1a] leading-tight">
                        {salon.name}
                    </h1>
                    <div className="flex flex-wrap items-center gap-4 mt-3 text-sm text-gray-500">
                        <div className="flex items-center gap-1">
                            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-bold text-gray-900">{salon.rating || "NEW"}</span>
                            <span>(Verified Reviews)</span>
                        </div>
                        <span className="hidden md:inline text-gray-300">•</span>
                        <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-[#D4AF37]" />
                            <span className="text-[#1a1a1a] font-medium">{salon.city}, India</span>
                        </div>
                        <span className="hidden md:inline text-gray-300">•</span>
                        <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-[#D4AF37]" />
                            <span className="text-[#1a1a1a] font-medium">{salon.openingHours || "9:00 AM"} - {salon.closingHours || "9:00 PM"}</span>
                        </div>
                    </div>
                </div>
                <div className="flex gap-6">
                    <button className="flex items-center gap-2 text-[#D4AF37] hover:opacity-80 transition-opacity font-medium">
                        <span>Save</span>
                        <Heart size={20} />
                    </button>
                    <button className="flex items-center gap-2 text-[#D4AF37] hover:opacity-80 transition-opacity font-medium">
                        <span>Share</span>
                        <svg 
                            width="20" 
                            height="20" 
                            viewBox="0 0 24 24" 
                            fill="none" 
                            stroke="currentColor" 
                            strokeWidth="2" 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                        >
                            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                            <polyline points="16 6 12 2 8 6" />
                            <line x1="12" y1="2" x2="12" y2="15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Booking.com Style Gallery & Sidebar */}
            <div className="hidden md:flex flex-col lg:flex-row gap-4 mb-10">
                
                {/* LEFT: Photo Gallery Section (1 Large + 2 Stacked + 5 Thumbnails) */}
                <div className="lg:w-[72%] xl:w-[75%] space-y-2">
                    {/* Top: 1 Large + 2 Stacked Grid */}
                    <div className="grid grid-cols-12 gap-2 h-[440px]">
                        <div className="col-span-8 overflow-hidden rounded-l-md shadow-sm">
                            <img src={galleryImages[0]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon Main" />
                        </div>
                        <div className="col-span-4 flex flex-col gap-2">
                            <div className="h-[216px] overflow-hidden shadow-sm">
                                <img src={galleryImages[1]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 border-none" alt="Salon 2" />
                            </div>
                            {/* Last image with See all photos overlay */}
                            <div
                                className="h-[216px] overflow-hidden shadow-sm rounded-br-md relative group cursor-pointer"
                                onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                            >
                                <img src={galleryImages[2]} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 border-none" alt="Salon 3" />
                                <div className="absolute inset-0 bg-black/40 group-hover:bg-black/55 transition-colors flex flex-col items-center justify-center gap-2">
                                    <Images size={24} className="text-white" />
                                    <span className="text-white font-bold text-sm text-center leading-tight">
                                        See all {displayImages.length} photo{displayImages.length !== 1 ? 's' : ''}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
</div>

            {/* Lightbox Modal */}
            {lightboxOpen && (
                <div
                    className="fixed inset-0 z-[9999] bg-black/95 flex items-center justify-center"
                    onClick={() => setLightboxOpen(false)}
                    onKeyDown={(e) => {
                        if (e.key === 'ArrowRight') setLightboxIndex(i => (i + 1) % displayImages.length);
                        if (e.key === 'ArrowLeft') setLightboxIndex(i => (i - 1 + displayImages.length) % displayImages.length);
                        if (e.key === 'Escape') setLightboxOpen(false);
                    }}
                    tabIndex={0}
                    autoFocus
                >
                    {/* Close Button */}
                    <button
                        className="absolute top-5 right-5 z-10 bg-white/10 hover:bg-white/20 text-white p-2 rounded-full transition-colors"
                        onClick={(e) => { e.stopPropagation(); setLightboxOpen(false); }}
                    >
                        <X size={24} />
                    </button>

                    {/* Counter */}
                    <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium">
                        {lightboxIndex + 1} / {displayImages.length}
                    </div>

                    {/* Prev Button */}
                    {displayImages.length > 1 && (
                        <button
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-10"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i - 1 + displayImages.length) % displayImages.length); }}
                        >
                            <ChevronLeft size={28} />
                        </button>
                    )}

                    {/* Main Image */}
                    <div className="max-w-5xl max-h-[85vh] w-full px-20" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={displayImages[lightboxIndex]}
                            alt={`Photo ${lightboxIndex + 1}`}
                            className="w-full h-full max-h-[85vh] object-contain rounded-lg select-none"
                        />
                    </div>

                    {/* Next Button */}
                    {displayImages.length > 1 && (
                        <button
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/20 text-white p-3 rounded-full transition-colors z-10"
                            onClick={(e) => { e.stopPropagation(); setLightboxIndex(i => (i + 1) % displayImages.length); }}
                        >
                            <ChevronRight size={28} />
                        </button>
                    )}

                    {/* Thumbnail Strip */}
                    {displayImages.length > 1 && (
                        <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-2 px-4 overflow-x-auto max-w-full" onClick={(e) => e.stopPropagation()}>
                            {displayImages.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setLightboxIndex(idx)}
                                    className={`w-12 h-12 rounded-md overflow-hidden shrink-0 border-2 transition-all ${
                                        idx === lightboxIndex ? 'border-white opacity-100' : 'border-transparent opacity-50 hover:opacity-75'
                                    }`}
                                >
                                    <img src={img} alt={`thumb ${idx}`} className="w-full h-full object-cover" />
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}

                {/* RIGHT: Booking Sidebar (Rating + Location + Map) */}
                <div className="lg:w-[28%] xl:w-[25%] flex flex-col gap-3 h-[440px]">
                    {/* Rating Card */}
                    <div className="bg-white border border-gray-200 rounded-md p-3 flex justify-between items-start shadow-sm h-fit">
                        <div className="flex flex-col">
                            <span className="font-bold text-[#1a1a1a] text-base leading-tight">
                                {salon.rating >= 4.5 ? "Excellent" : salon.rating >= 4 ? "Very Good" : salon.rating > 0 ? "Good" : "New"}
                            </span>
                            <span className="text-xs text-gray-500">{reviews.length || 0} reviews</span>
                        </div>
                        <div className="bg-[#003b95] text-white w-8 h-8 rounded-t-md rounded-br-md flex items-center justify-center font-bold text-sm">
                            {salon.rating > 0 ? salon.rating.toFixed(1) : "New"}
                        </div>
                    </div>

                    {/* Integrated Map (Placeholder linking to bottom map) */}
                    <div className="flex-1 overflow-hidden rounded-md border border-gray-200 shadow-sm relative group bg-gray-50 cursor-pointer"
                         onClick={() => document.getElementById('salon-location-section')?.scrollIntoView({ behavior: 'smooth' })}>
                        <div className="w-full h-full opacity-60 filter grayscale-[0.5]">
                            <SalonMap salons={[salon]} zoom={15} interactive={false} />
                        </div>
                        <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors"></div>
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                            <button className="bg-[#006ce4] text-white px-4 py-2 rounded-md font-bold text-sm shadow-lg whitespace-nowrap opacity-100 transition-opacity">
                                Show on map
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Image Gallery - Mobile Carousel */}
            <div className="md:hidden relative w-full h-[400px] mb-8 rounded-2xl overflow-hidden shadow-sm">
                <img 
                    src={galleryImages[currentImageIndex]} 
                    className="w-full h-full object-cover transition-opacity duration-300" 
                    alt={`Salon Photo ${currentImageIndex + 1}`} 
                />
                
                {/* Navigation Arrows */}
                <button 
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/70 backdrop-blur-md text-black rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform z-10 hover:bg-white"
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    onClick={() => setCurrentImageIndex((prev) => (prev === galleryImages.length - 1 ? 0 : prev + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/70 backdrop-blur-md text-black rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform z-10 hover:bg-white"
                >
                    <ChevronRight size={20} />
                </button>

                {/* Dot Indicators */}
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10">
                    {galleryImages.map((_, idx) => (
                        <div 
                            key={idx} 
                            className={`h-1.5 rounded-full transition-all duration-300 ${idx === currentImageIndex ? "w-4 bg-white" : "w-1.5 bg-white/50"}`}
                        />
                    ))}
                </div>
            </div>

            {/* Main Layout */}
            <div className="flex flex-col lg:flex-row gap-4">

                {/* LEFT CONTENT */}
                <div className="lg:w-[72%] xl:w-[75%] space-y-8 order-last lg:order-first">
                    <div className="pb-4 border-b border-gray-100">
                        <h2 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a] mb-4">
                            Premium Experience in {salon.city}
                        </h2>
                        <div className="flex flex-wrap gap-6 text-gray-500 font-medium">
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
                                Professional Staff
                            </span>
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
                                Modern Interior
                            </span>
                            <span className="flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37]"></div>
                                Purity Certified
                            </span>
                        </div>
                    </div>

                    <div className="pb-4 border-b border-gray-100">
                        <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-4">Location & Contact</h3>
                        <div className="grid md:grid-cols-1 gap-6">
                            <div className="flex flex-col md:flex-row gap-6">
                                <div className="flex-1 flex gap-4 items-start bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                    <div className="p-3 bg-gray-50 rounded-xl text-[#D4AF37]"><MapPin size={24} /></div>
                                    <div className="min-w-0">
                                        <p className="text-[#1a1a1a] font-bold text-lg mb-1 truncate">{salon.city}</p>
                                        <p className="text-gray-500 break-words">{salon.address}</p>
                                    </div>
                                </div>
                                {salon.owner && (
                                    <div className="flex-1 flex gap-4 items-start bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <div className="p-3 bg-gray-50 rounded-xl text-[#D4AF37]"><Phone size={24} /></div>
                                        <div className="min-w-0">
                                            <p className="text-[#1a1a1a] font-bold text-lg mb-1">Contact Salon</p>
                                            <p className="text-gray-900 font-medium truncate">{salon.owner?.fullName || "Salon Staff"}</p>
                                            <a href={`tel:${salon.contactNumber || salon.owner?.phonenumber}`} className="text-[#D4AF37] font-bold hover:underline">
                                                {salon.contactNumber || salon.owner?.phonenumber}
                                            </a>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* OUR SERVICES SECTION */}
                    {services.length > 0 && (
                        <div className="py-6 border-b border-gray-100">
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-serif font-bold text-[#1a1a1a]">Our Services</h3>
                                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest bg-gray-50 px-3 py-1 rounded-full">
                                    {services.length} {services.length === 1 ? 'Service' : 'Services'}
                                </span>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {services.map((service) => (
                                    <div key={service._id} className="p-6 bg-white border border-gray-100 rounded-3xl hover:border-[#D4AF37]/30 transition-all group flex justify-between items-center shadow-sm">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Scissors size={14} className="text-[#D4AF37]" />
                                                <h4 className="font-bold text-[#1a1a1a] truncate">{service.name}</h4>
                                            </div>
                                            <p className="text-xs text-gray-500 line-clamp-1 mb-2">{service.description || "Professional salon service"}</p>

                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-lg font-serif font-bold text-[#1a1a1a]">₹{service.price}</p>
                                            <p className="text-[10px] font-bold text-[#D4AF37] uppercase tracking-tighter">Premium</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* MEET OUR TEAM SECTION */}
                    {staff.length > 0 && (
                        <div className="py-6 border-b border-gray-100">
                            <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-6">Meet Our Team</h3>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
                                {staff.map((member) => (
                                    <div key={member._id} className="text-center group">
                                        <div className="w-24 h-24 mx-auto rounded-full bg-gray-50 border-2 border-gray-50 p-1 mb-4 group-hover:border-[#D4AF37]/30 transition-all overflow-hidden">
                                            <div className="w-full h-full rounded-full bg-[#fafafa] flex items-center justify-center text-gray-300">
                                                <Users size={40} />
                                            </div>
                                        </div>
                                        <h4 className="font-bold text-[#1a1a1a] text-sm mb-1">{member.name}</h4>
                                        <p className="text-[10px] text-[#D4AF37] font-black uppercase tracking-widest">{member.role}</p>
                                        <div className="flex items-center justify-center gap-1 mt-2">
                                            <Award size={10} className="text-orange-400" />
                                            <span className="text-[10px] font-medium text-gray-400">{member.experience}+ Years</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="grid sm:grid-cols-2 gap-8">
                        <div className="flex gap-5">
                            <div className="p-3 bg-orange-50 rounded-2xl text-[#e65c00] h-fit"><ShieldCheck size={28} /></div>
                            <div>
                                <h3 className="font-bold text-[#1a1a1a] mb-1">Verified Professional Salon</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">This salon has passed our strict quality and hygiene checks.</p>
                            </div>
                        </div>
                        <div className="flex gap-5">
                            <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 h-fit"><Users size={28} /></div>
                            <div>
                                <h3 className="font-bold text-[#1a1a1a] mb-1">Expert Stylists</h3>
                                <p className="text-sm text-gray-500 leading-relaxed">Book with specialists having industry-leading expertise.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-8 border-t border-gray-100">
                        <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-4">About the Studio</h3>
                        <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                            {salon.description || "Welcome to our premier destination for luxury grooming and beauty. We combine traditional techniques with modern style to give you the perfect look. Our studio features state-of-the-art equipment and a relaxing atmosphere designed for your comfort."}
                        </p>
                    </div>

                    {/* REVIEWS SECTION */}
                    <div className="pt-12 border-t border-gray-100 pb-16">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a]">Customer Reviews</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <div className="flex items-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={14} className={i < Math.floor(salon.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                                        ))}
                                    </div>
                                    <span className="text-sm font-bold text-gray-900">{salon.rating || "NEW"}</span>
                                    <span className="text-sm text-gray-400">({reviews.length} Verified Reviews)</span>
                                </div>
                            </div>
                        </div>

                        {/* REVIEWS LIST */}
                        <div className="space-y-4 mb-10">
                            {reviews.length > 0 ? (
                                reviews.map((rev) => (
                                    <div key={rev._id} className="group">
                                        <div className="flex gap-4 items-start">
                                            <div className="w-12 h-12 rounded-full bg-[#1a1a1a] flex items-center justify-center text-white font-bold text-lg border-2 border-[#D4AF37]/30 shrink-0 capitalize">
                                                {rev.user?.fullName?.charAt(0)}
                                            </div>
                                            <div className={rev.user?.fullName ? "flex-1" : "flex-1 text-gray-400 italic"}>
                                                <div className="flex items-center justify-between mb-1">
                                                    <h5 className="font-bold text-[#1a1a1a]">{rev.user?.fullName || "Anonymous"}</h5>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs text-gray-400 font-medium">{new Date(rev.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}</span>
                                                        
                                                        {/* Actions: (Delete and Like) */}
                                                        <div className="flex items-center gap-1.5">
                                                            {user && String(rev.user?._id) === String(user._id) && (
                                                                <button
                                                                    onClick={() => handleDeleteReview(rev._id)}
                                                                    disabled={isDeletingReview === rev._id}
                                                                    title="Delete your review"
                                                                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs font-semibold text-red-500 bg-red-50 hover:bg-red-100 hover:text-red-700 transition-all duration-200 disabled:opacity-40 border border-red-100"
                                                                >
                                                                    {isDeletingReview === rev._id
                                                                        ? <Loader2 size={12} className="animate-spin" />
                                                                        : <Trash2 size={12} />}
                                                                    <span>Delete</span>
                                                                </button>
                                                            )}

                                                            {/* Like Button - Moved here */}
                                                            <button
                                                                onClick={() => user ? handleToggleLike(rev._id) : null}
                                                                disabled={isLikingReview === rev._id}
                                                                title={user ? (rev.likes?.some((id) => String(id) === String(user._id)) ? "Unlike this review" : "Like this review") : "Log in to like"}
                                                                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 border ${
                                                                    !user
                                                                        ? "text-gray-300 border-gray-100 cursor-not-allowed bg-gray-50"
                                                                        : rev.likes?.some((id) => String(id) === String(user._id))
                                                                            ? "text-rose-500 bg-rose-50 border-rose-100 hover:bg-rose-100"
                                                                            : "text-gray-400 bg-gray-100 border-gray-100 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100"
                                                                } disabled:opacity-50`}
                                                            >
                                                                {isLikingReview === rev._id ? (
                                                                    <Loader2 size={12} className="animate-spin" />
                                                                ) : (
                                                                    <Heart
                                                                        size={12}
                                                                        className={user && rev.likes?.some((id) => String(id) === String(user._id)) ? "fill-current" : ""}
                                                                    />
                                                                )}
                                                                <span>{rev.likes?.length || 0}</span>
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-0.5 mb-3">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star key={i} size={12} className={i < rev.rating ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                                                    ))}
                                                </div>
                                                <p className="text-gray-600 text-[15px] leading-relaxed italic border-l-2 border-[#D4AF37]/20 pl-4 py-1 bg-white/50 rounded-r-lg group-hover:bg-white/80 transition-colors">
                                                    "{rev.reviewText}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="text-center py-20 bg-white rounded-3xl border border-gray-50 shadow-sm">
                                    <p className="text-gray-400">No reviews yet. Be the first to share your experience!</p>
                                </div>
                            )}
                        </div>

                        {/* REVIEW FORM */}
                        {user ? (
                            user.role !== "salonOwner" ? (
                                <div className="bg-white border border-gray-100 rounded-[32px] p-8 mb-12 shadow-sm">
                                    <h4 className="text-lg font-bold text-[#1a1a1a] mb-6">Write a Review</h4>
                                    <form onSubmit={handleReviewSubmit} className="space-y-6">
                                        <div>
                                            <p className="text-xs text-gray-400 uppercase font-black mb-3 tracking-widest">Select Rating</p>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button 
                                                        key={star}
                                                        type="button"
                                                        onClick={() => setRating(star)}
                                                        className={`p-2 rounded-xl transition-all ${rating >= star ? "text-[#D4AF37] bg-orange-50/50" : "text-gray-200 bg-gray-50/30"}`}
                                                    >
                                                        <Star size={24} className={rating >= star ? "fill-current" : ""} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs text-gray-400 uppercase font-black tracking-widest">Your Experience</label>
                                            <textarea 
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-5 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all h-32"
                                                placeholder="Share your experience at this salon..."
                                                value={reviewText}
                                                onChange={(e) => setReviewText(e.target.value)}
                                            />
                                        </div>
                                        {reviewError && <p className="text-red-500 text-xs font-bold">{reviewError}</p>}
                                        <button 
                                            disabled={isSubmitting}
                                            className="bg-[#1a1a1a] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-black transition-colors flex items-center gap-2 group disabled:opacity-50 mx-auto md:mx-0"
                                        >
                                            {isSubmitting ? "Posting..." : "Post Review"}
                                            <Send size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </form>
                                </div>
                            ) : (
                                <div className="bg-white/50 border border-gray-100 rounded-[32px] p-8 mb-12 text-center">
                                    <p className="text-gray-500 font-medium italic">Reviews are reserved for customers. Thank you for maintaining the platform's integrity!</p>
                                </div>
                            )
                        ) : (
                            <div className="bg-gray-50/50 border border-dashed border-gray-200 rounded-[32px] p-10 text-center mb-12">
                                <MessageSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                <h4 className="text-lg font-bold text-gray-900">Want to share your experience?</h4>
                                <p className="text-gray-500 text-sm mb-6">Please log in to leave a rating and review for this salon.</p>
                                <NavLink to="/login" className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-black transition-colors">Login to Review</NavLink>
                            </div>
                        )}
                    </div>


                </div>

                {/* RIGHT BOOKING CARD */}
                <div className="lg:w-[28%] xl:w-[25%] relative order-first lg:order-last">
                    <div className="border border-gray-100 rounded-[32px] shadow-xl shadow-black/5 p-6 md:p-8 lg:sticky lg:top-32 bg-white">
                        <div className="flex justify-between items-end mb-6">
                            <div>
                                <span className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">Service Starting</span>
                                <p className="text-4xl font-serif font-bold text-[#1a1a1a] mt-1">
                                    {services.length > 0 ? `₹${Math.min(...services.map(s => s.price))}` : "₹—"}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900 justify-end">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 border-none" /> {salon.rating || "NEW"}
                                </div>
                                <p className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">Top Rated</p>
                            </div>
                        </div>

                        <div className="space-y-4 mb-6">
                            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 text-gray-600 font-medium"><Clock size={18} className="text-[#D4AF37]" /> Opening Hours</div>
                                <span className="font-bold text-[#1a1a1a]">{salon.openingHours || "09:00 AM"} - {salon.closingHours || "09:00 PM"}</span>
                            </div>
                            <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center justify-between text-sm">
                                <div className="flex items-center gap-3 text-gray-600 font-medium">
                                    <Sparkles size={18} className={salon.availableSeats > 0 ? "text-green-500" : "text-red-500"} /> 
                                    Availability
                                </div>
                                <span className={`font-bold ${salon.availableSeats > 0 ? "text-[#1a1a1a]" : "text-red-600"}`}>
                                    {salon.availableSeats > 0 ? `${salon.availableSeats} Seats Available` : "Full House"}
                                </span>
                            </div>
                        </div>

                        {user?.role !== "salonOwner" ? (
                            <button 
                                onClick={() => {
                                    if (!user) {
                                        navigate("/login");
                                    } else if (salon.isOpen) {
                                        navigate(`/booking/${salon._id}`);
                                    }
                                }}
                                disabled={!salon.isOpen}
                                className={`w-full font-bold py-5 rounded-2xl transition-all active:scale-[0.98] shadow-xl text-lg uppercase tracking-widest ${salon.isOpen ? 'bg-[#1a1a1a] text-white hover:bg-black shadow-black/10' : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'}`}
                            >
                                {salon.isOpen ? 'Check Slots' : 'Temporarily Closed'}
                            </button>
                        ) : (
                            <div className="w-full bg-gray-50 border border-gray-100 py-5 rounded-2xl text-center">
                                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Owner View Only</p>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 mt-6">
                            <ShieldCheck size={14} className="text-green-500" />
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                                Price Match Guarantee
                            </p>
                        </div>
                    </div>
                </div>

            </div>

            {/* FULL WIDTH BOTTOM MAP SECTION */}
            <div id="salon-location-section" className="mt-16 pt-16 border-t border-gray-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
                    <div>
                        <h3 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">Salon Location</h3>
                        <p className="text-gray-500 flex items-center gap-2">
                            <MapPin size={16} className="text-[#D4AF37]" />
                            {salon.address}, {salon.city}
                        </p>
                    </div>
                    <button 
                        onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.address + ' ' + salon.city)}`, '_blank')}
                        className="bg-white border border-gray-200 px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 mx-auto md:mx-0"
                    >
                        Get Directions
                    </button>
                </div>
                <div className="h-[500px] w-full rounded-[32px] overflow-hidden border border-gray-100 shadow-lg ring-1 ring-gray-50 relative">
                    <SalonMap salons={[salon]} zoom={15} />
                </div>
            </div>
        </div>
    );
}