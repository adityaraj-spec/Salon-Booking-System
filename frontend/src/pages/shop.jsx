import { useState, useEffect } from 'react';
import { useParams, NavLink } from "react-router-dom";
import { NavBar } from "../components/navPage";
import { Footer } from "../components/footerPage";
import { Star, MapPin, Users, Clock, ShieldCheck, Sparkles, Loader2, ArrowLeft, MessageSquare, Send } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosConfig";

export function Shop() {
    const { user } = useAuth();
    const { id } = useParams();
    const [salon, setSalon] = useState(null);
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    
    // Review form state
    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [reviewError, setReviewError] = useState("");

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

        if (id) {
            fetchSalonDetails();
            fetchReviews();
        }
    }, [id]);

    const handleReviewSubmit = async (e) => {
        e.preventDefault();
        if (!user) return;
        
        setIsSubmitting(true);
        setReviewError("");
        try {
            const response = await axiosInstance.post(`/reviews`, {
                salonId: id,
                rating,
                reviewText
            });

            if (response.data.success) {
                setReviews([response.data.data, ...reviews]);
                setReviewText("");
                setRating(5);
                // Refresh salon to get new average rating
                const salonRes = await axiosInstance.get(`/salons/${id}`);
                setSalon(salonRes.data.data);
            }
        } catch (err) {
            setReviewError(err.response?.data?.message || "Failed to post review. You might have already reviewed this salon.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <NavBar />
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Loading salon details...</p>
            </div>
        );
    }

    if (error || !salon) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 text-center">
                <NavBar />
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

    // Fill the gallery array to exactly 5 for the grid layout
    const galleryImages = [...displayImages];
    while (galleryImages.length < 5) {
        galleryImages.push(displayImages[0]);
    }

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans pt-20">
            <NavBar />

            <div className="max-w-7xl mx-auto px-6 py-10">
                {/* Navigation Breadcrumb */}
                <NavLink to="/home" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#D4AF37] mb-8 transition-colors text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Discover
                </NavLink>

                {/* Title & Brand Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-orange-50 text-[#e65c00] text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={12} /> {salon.rating > 4.5 ? "Top Rated Salon" : "Verified Salon"}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-serif font-bold text-[#1a1a1a]">
                            {salon.name}
                        </h1>
                        <div className="flex items-center gap-4 mt-3 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-bold text-gray-900">{salon.rating || "NEW"}</span>
                                <span>(Verified Reviews)</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>{salon.city}, India</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold hover:bg-gray-50 transition-all shadow-sm">Share</button>
                        <button className="px-5 py-2.5 bg-white border border-gray-200 rounded-full text-sm font-bold hover:bg-gray-50 transition-all shadow-sm">Save</button>
                    </div>
                </div>

                {/* Image Gallery - Premium Style */}
                <div className="grid grid-cols-1 md:grid-cols-4 md:grid-rows-2 gap-3 mb-12 min-h-[400px] md:h-[500px]">
                    <div className="md:col-span-2 md:row-span-2 overflow-hidden rounded-2xl md:rounded-l-2xl md:rounded-r-none">
                        <img src={galleryImages[0]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon Main" />
                    </div>
                    <div className="hidden md:block overflow-hidden">
                        <img src={galleryImages[1]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 2" />
                    </div>
                    <div className="hidden md:block overflow-hidden rounded-tr-2xl">
                        <img src={galleryImages[2]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 3" />
                    </div>
                    <div className="hidden md:block overflow-hidden">
                        <img src={galleryImages[3]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 4" />
                    </div>
                    <div className="hidden md:block overflow-hidden rounded-br-2xl text-white relative">
                        <img src={galleryImages[4]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 5" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                            <span className="font-bold hover:underline">Show all photos</span>
                        </div>
                    </div>
                </div>

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">

                    {/* LEFT CONTENT */}
                    <div className="lg:col-span-2 space-y-12">
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
                            <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-6">Location & Address</h3>
                            <div className="flex gap-4 items-start bg-white p-6 rounded-3xl border border-gray-100 shadow-sm mb-12">
                                <div className="p-3 bg-gray-50 rounded-xl text-[#D4AF37]"><MapPin size={24} /></div>
                                <div>
                                    <p className="text-[#1a1a1a] font-bold text-lg mb-1">{salon.city}</p>
                                    <p className="text-gray-500">{salon.address}</p>
                                </div>
                            </div>
                        </div>

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

                        <div className="pt-10 border-t border-gray-100">
                            <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-6">About the Studio</h3>
                            <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-line">
                                {salon.description || "Welcome to our premier destination for luxury grooming and beauty. We combine traditional techniques with modern style to give you the perfect look. Our studio features state-of-the-art equipment and a relaxing atmosphere designed for your comfort."}
                            </p>
                        </div>

                        {/* REVIEWS SECTION */}
                        <div className="pt-16 border-t border-gray-100 pb-20">
                            <div className="flex items-center justify-between mb-10">
                                <div>
                                    <h3 className="text-3xl font-serif font-bold text-[#1a1a1a]">Customer Reviews</h3>
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
                            <div className="space-y-8 mb-16">
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
                                                        <span className="text-xs text-gray-400 font-medium">{new Date(rev.createdAt).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}</span>
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
                                            className="bg-[#1a1a1a] text-white px-8 py-3.5 rounded-full font-bold text-sm tracking-widest uppercase hover:bg-black transition-colors flex items-center gap-2 group disabled:opacity-50"
                                        >
                                            {isSubmitting ? "Posting..." : "Post Review"}
                                            <Send size={16} className="group-hover:translate-x-1 transition-transform" />
                                        </button>
                                    </form>
                                </div>
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
                    <div className="relative">
                        <div className="border border-gray-100 rounded-[32px] shadow-xl shadow-black/5 p-8 lg:sticky lg:top-32 bg-white">
                            <div className="flex justify-between items-end mb-10">
                                <div>
                                    <span className="text-gray-400 text-[10px] uppercase font-bold tracking-[0.2em]">Service Starting</span>
                                    <p className="text-4xl font-serif font-bold text-[#1a1a1a] mt-1">₹499</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 text-lg font-bold text-gray-900 justify-end">
                                        <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 border-none" /> {salon.rating || "NEW"}
                                    </div>
                                    <p className="text-xs text-[#D4AF37] font-bold uppercase tracking-wider">Top Rated</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10">
                                <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3 text-gray-600 font-medium"><Clock size={18} className="text-[#D4AF37]" /> Opening Hours</div>
                                    <span className="font-bold text-[#1a1a1a]">{salon.openingHours || "09:00 AM"} - {salon.closingHours || "09:00 PM"}</span>
                                </div>
                                <div className="p-4 bg-gray-50/50 border border-gray-100 rounded-2xl flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-3 text-gray-600 font-medium"><Sparkles size={18} className="text-[#D4AF37]" /> Availability</div>
                                    <span className="font-bold text-[#1a1a1a]">Instant Booking</span>
                                </div>
                            </div>

                            <NavLink to={`/booking/${salon._id}`} className="block">
                                <button className="w-full bg-[#1a1a1a] text-white font-bold py-5 rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-xl shadow-black/10 text-lg uppercase tracking-widest">
                                    Check Slots
                                </button>
                            </NavLink>

                            <div className="flex items-center justify-center gap-2 mt-6">
                                <ShieldCheck size={14} className="text-green-500" />
                                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest text-center">
                                    Price Match Guarantee
                                </p>
                            </div>
                        </div>
                    </div>

                </div>

            </div>
            <Footer />
        </div>
    );
}