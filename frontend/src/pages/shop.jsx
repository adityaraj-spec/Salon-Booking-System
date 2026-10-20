import { useState, useEffect, useRef } from 'react';
import { useParams, NavLink, useNavigate } from "react-router-dom";
import { Star, MapPin, Users, Clock, ShieldCheck, Sparkles, ArrowLeft, MessageSquare, Send, Trash2, Heart, Phone, Scissors, Award, ChevronLeft, ChevronRight, X, Images, Settings, Share2, Check, Plus, ShoppingBag, ChevronUp, ChevronDown } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import { useBookingCart } from "../context/BookingCartContext";
import axiosInstance from "../api/axiosConfig";
import { SalonMap } from "../components/SalonMap";
import { ShopDetailSkeleton } from "../components/skeletons/index.jsx";

// Sprint 2.3: Staff / Stylist Profile Cards — horizontally scrollable, interactive
function StaffSection({ staff, salonId, navigate, user, formatLabel }) {
    const scrollRef = useRef(null);

    const scrollLeft = () => scrollRef.current?.scrollBy({ left: -280, behavior: 'smooth' });
    const scrollRight = () => scrollRef.current?.scrollBy({ left: 280, behavior: 'smooth' });

    // Map role/skills to a human-friendly specialization label
    const getSpecialization = (member) => {
        if (member.skills && member.skills.length > 0) {
            const skill = member.skills[0];
            const labelMap = {
                haircut: 'Hair Specialist',
                hair: 'Hair Specialist',
                colour: 'Color Expert',
                color: 'Color Expert',
                spa: 'Spa & Wellness',
                nails: 'Nail Artist',
                facial: 'Skin Specialist',
                bridal: 'Bridal Expert',
                shave: 'Grooming Expert',
                massage: 'Massage Therapist',
            };
            return labelMap[skill.toLowerCase()] || formatLabel(skill, 'Stylist');
        }
        return formatLabel(member.role, 'Stylist');
    };

    const handleBookWith = (e, member) => {
        e.stopPropagation();
        if (!user) {
            navigate('/login');
        } else {
            navigate(`/booking/${salonId}?staffId=${member._id}&staffName=${encodeURIComponent(member.name)}`);
        }
    };

    return (
        <div className="py-8 border-b border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-2xl font-serif font-bold text-[#1a1a1a]">Meet Our Team</h3>
                    <p className="text-sm text-gray-500 mt-1">Book directly with your preferred stylist</p>
                </div>
                {/* Desktop scroll arrows */}
                <div className="hidden md:flex items-center gap-2">
                    <button
                        type="button"
                        aria-label="Scroll staff left"
                        onClick={scrollLeft}
                        className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all active:scale-95 text-gray-600"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        aria-label="Scroll staff right"
                        onClick={scrollRight}
                        className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all active:scale-95 text-gray-600"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Horizontally scrollable staff strip */}
            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto pb-3 scroll-smooth no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {staff.map((member) => {
                    const specialization = getSpecialization(member);
                    const hasPhoto = Boolean(member.profilePic);
                    const initials = member.name
                        ? member.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
                        : '?';

                    return (
                        <div
                            key={member._id}
                            className="group shrink-0 w-[200px] bg-white border border-gray-100 rounded-3xl p-5 flex flex-col items-center text-center shadow-sm hover:shadow-md hover:border-[#D4AF37]/30 transition-all duration-300"
                        >
                            {/* Photo / Avatar */}
                            <div className="relative mb-4">
                                {hasPhoto ? (
                                    <img
                                        src={member.profilePic}
                                        alt={member.name}
                                        className="w-20 h-20 rounded-full object-cover border-2 border-gray-100 group-hover:border-[#D4AF37]/40 transition-all"
                                    />
                                ) : (
                                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#1a1a1a] to-[#3a3a3a] flex items-center justify-center text-white font-serif font-bold text-2xl border-2 border-[#D4AF37]/20 group-hover:border-[#D4AF37]/50 transition-all shadow-lg">
                                        {initials}
                                    </div>
                                )}
                                {/* Online / Active indicator dot */}
                                <span className="absolute bottom-1 right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-white shadow-sm" title="Available" />
                            </div>

                            {/* Name */}
                            <h4 className="font-bold text-[#1a1a1a] text-sm leading-tight mb-1 truncate w-full">
                                {member.name}
                            </h4>

                            {/* Specialization */}
                            <p className="text-xs text-[#D4AF37] font-semibold mb-2 truncate w-full">
                                {specialization}
                            </p>

                            {/* Experience badge or Skills tags */}
                            {member.experience > 0 ? (
                                <div className="inline-flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full mb-4">
                                    <Award size={11} className="text-orange-400 shrink-0" />
                                    <span>{member.experience}+ yrs exp</span>
                                </div>
                            ) : member.skills && member.skills.length > 0 ? (
                                <div className="flex flex-wrap gap-1 justify-center mb-4">
                                    {member.skills.slice(0, 2).map((sk) => (
                                        <span key={sk} className="text-[10px] bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full font-medium capitalize">
                                            {sk}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <div className="mb-4" />
                            )}

                            {/* Book with CTA */}
                            <button
                                type="button"
                                onClick={(e) => handleBookWith(e, member)}
                                className="w-full py-2 rounded-xl text-xs font-bold bg-[#1a1a1a] text-white hover:bg-black active:scale-95 transition-all shadow-sm flex items-center justify-center gap-1.5"
                            >
                                <Scissors size={12} className="text-[#D4AF37]" />
                                <span>Book with {member.name.split(' ')[0]}</span>
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// Sprint 3.3: Transformation Gallery / Before & After Section
function BeforeAfterCard({ item }) {
    const [sliderPos, setSliderPos] = useState(50);
    const [isInteracting, setIsInteracting] = useState(false);
    const containerRef = useRef(null);

    const updateSlider = (clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const percentage = Math.max(5, Math.min(95, (offsetX / rect.width) * 100));
        setSliderPos(percentage);
    };

    const handlePointerDown = (e) => {
        setIsInteracting(true);
        updateSlider(e.clientX);
    };

    const handlePointerMove = (e) => {
        if (isInteracting) {
            updateSlider(e.clientX);
        }
    };

    const handlePointerUp = () => setIsInteracting(false);

    return (
        <div className="shrink-0 w-[290px] sm:w-[330px] bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 flex flex-col">
            {/* Interactive Image Split Container */}
            <div
                ref={containerRef}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="relative h-64 sm:h-72 w-full select-none cursor-ew-resize overflow-hidden bg-gray-100"
            >
                {/* AFTER image (Full background) */}
                <img
                    src={item.afterUrl}
                    alt={`${item.serviceName || 'Transformation'} After`}
                    className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                    loading="lazy"
                />
                <span className="absolute top-3 right-3 bg-black/60 backdrop-blur-md text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 uppercase tracking-wider">
                    After
                </span>

                {/* BEFORE image (Clipped to slider percentage) */}
                <div
                    className="absolute inset-0 overflow-hidden pointer-events-none"
                    style={{ width: `${sliderPos}%` }}
                >
                    <img
                        src={item.beforeUrl}
                        alt={`${item.serviceName || 'Transformation'} Before`}
                        className="absolute inset-0 h-full object-cover max-w-none pointer-events-none"
                        style={{ width: containerRef.current ? `${containerRef.current.offsetWidth}px` : '330px' }}
                        loading="lazy"
                    />
                    <span className="absolute top-3 left-3 bg-[#1a1a1a]/80 backdrop-blur-md text-[#D4AF37] text-[10px] font-bold px-2 py-0.5 rounded-full z-10 uppercase tracking-wider">
                        Before
                    </span>
                </div>

                {/* Slider divider line and draggable handle */}
                <div
                    className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg pointer-events-none"
                    style={{ left: `${sliderPos}%` }}
                >
                    <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-md border-2 border-[#D4AF37] flex items-center justify-center text-[#1a1a1a]">
                        <div className="flex gap-0.5">
                            <ChevronLeft size={12} strokeWidth={3} className="text-gray-600" />
                            <ChevronRight size={12} strokeWidth={3} className="text-gray-600" />
                        </div>
                    </div>
                </div>

                {/* Hidden range input for accessibility */}
                <input
                    type="range"
                    min="5"
                    max="95"
                    value={sliderPos}
                    onChange={(e) => setSliderPos(Number(e.target.value))}
                    className="absolute inset-x-0 bottom-0 opacity-0 h-10 cursor-ew-resize z-20"
                    aria-label={`Compare Before and After for ${item.serviceName || 'transformation'}`}
                />
            </div>

            {/* Info footer */}
            <div className="p-4 flex flex-col gap-1.5 flex-1 justify-between bg-white">
                <div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4AF37] bg-amber-50 px-2 py-0.5 rounded-md inline-block truncate max-w-[190px]">
                            {item.serviceName || "Transformation"}
                        </span>
                        {item.stylistName && (
                            <span className="text-[11px] font-medium text-gray-500 truncate max-w-[120px]">
                                By {item.stylistName}
                            </span>
                        )}
                    </div>
                    {item.title && (
                        <h4 className="text-sm font-bold text-gray-900 mt-1 line-clamp-1">
                            {item.title}
                        </h4>
                    )}
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-gray-50 text-[11px] text-gray-400">
                    <span>Slide to compare</span>
                    <button
                        type="button"
                        onClick={() => setSliderPos(sliderPos > 50 ? 5 : 95)}
                        className="text-[#1a1a1a] hover:text-[#D4AF37] font-semibold underline text-[11px]"
                    >
                        {sliderPos > 50 ? "Show Before" : "Show After"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function TransformationGallerySection({ photos = [] }) {
    const scrollRef = useRef(null);

    const defaultItems = [
        {
            beforeUrl: "https://images.unsplash.com/photo-1580618672591-eb180b1a973f?auto=format&fit=crop&w=600&q=80",
            afterUrl: "https://images.unsplash.com/photo-1560869713-7d0a29430803?auto=format&fit=crop&w=600&q=80",
            serviceName: "Balayage & Gloss",
            stylistName: "Senior Colorist",
            title: "Sun-Kissed Blonde Transformation",
        },
        {
            beforeUrl: "https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=600&q=80",
            afterUrl: "https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=600&q=80",
            serviceName: "Fade & Beard Sculpt",
            stylistName: "Master Barber",
            title: "Precision Taper & Beard Line-up",
        },
        {
            beforeUrl: "https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=600&q=80",
            afterUrl: "https://images.unsplash.com/photo-1562322140-8baeececf3df?auto=format&fit=crop&w=600&q=80",
            serviceName: "Keratin Smoothening",
            stylistName: "Texture Specialist",
            title: "Intense Frizz-Free Glass Hair",
        },
    ];

    const displayPhotos = photos && photos.length > 0 ? photos : defaultItems;

    const scrollLeft = () => scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
    const scrollRight = () => scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' });

    return (
        <div className="py-8 border-b border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center gap-2">
                        <Sparkles size={18} className="text-[#D4AF37]" />
                        <h3 className="text-2xl font-serif font-bold text-[#1a1a1a]">Transformation Gallery</h3>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">Real before & after results crafted by our artists</p>
                </div>
                {/* Scroll arrows */}
                <div className="hidden md:flex items-center gap-2">
                    <button
                        type="button"
                        aria-label="Scroll transformations left"
                        onClick={scrollLeft}
                        className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all active:scale-95 text-gray-600"
                    >
                        <ChevronLeft size={18} />
                    </button>
                    <button
                        type="button"
                        aria-label="Scroll transformations right"
                        onClick={scrollRight}
                        className="w-9 h-9 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-gray-50 transition-all active:scale-95 text-gray-600"
                    >
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            {/* Scrollable track */}
            <div
                ref={scrollRef}
                className="flex gap-5 overflow-x-auto pb-4 scroll-smooth no-scrollbar"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {displayPhotos.map((item, idx) => (
                    <BeforeAfterCard key={item._id || idx} item={item} />
                ))}
            </div>
        </div>
    );
}

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

    // Save and Share state
    const [isFavorite, setIsFavorite] = useState(false);
    const [copied, setCopied] = useState(false);

    // Multi-Service Selection Cart state
    const {
        items: cartItems,
        totalCount,
        totalDurationMin,
        totalPrice,
        toggleService,
        isServiceInCart,
        removeService,
        clearCart,
        setSalonConflictModal,
        salonId: cartSalonId,
    } = useBookingCart();

    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const handleToggleService = (service) => {
        if (!salon) return;
        const res = toggleService(salon, service);
        if (res?.conflict) {
            setSalonConflictModal(res);
        }
    };

    const handleShare = async () => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: salon?.name || "SalonNow",
                    text: `Book an appointment at ${salon?.name || "this salon"} on SalonNow!`,
                    url: window.location.href,
                });
                return;
            } catch (err) {
                // fallback to clipboard
            }
        }
        navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleToggleFavorite = async () => {
        if (!user) {
            navigate("/login");
            return;
        }
        try {
            const res = await axiosInstance.post(`/users/favorites/${id}`);
            if (res.data.success) {
                setIsFavorite(res.data.data.isFavorited);
            }
        } catch (e) {
            // fallback toggle
            setIsFavorite(prev => !prev);
        }
    };

    const formatServiceName = (name) => {
        if (!name) return "Service";
        return name
            .replace(/\bhaicut\b/gi, "Haircut")
            .toLowerCase()
            .replace(/\b\w/g, (character) => character.toUpperCase());
    };

    const formatLabel = (value, fallback = "") => {
        if (!value) return fallback;
        return value.toString().toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
    };

    const formatAddress = (address) => (address || "No address provided")
        .replace(/\bpost\b/gi, "Post")
        .replace(/\bdisct\b/gi, "District")
        .replace(/\bdist\b/gi, "District")
        .replace(/\bpincode\b/gi, "Pincode")
        .replace(/\bcity\b/gi, "City")
        .replace(/\bstate\b/gi, "State");

    const getCleanDescription = (desc) => {
        const fallback = "Welcome to our premier destination for luxury grooming and beauty. We combine traditional techniques with modern style to give you the perfect look. Our studio features state-of-the-art equipment and a relaxing atmosphere designed for your comfort.";
        if (!desc || typeof desc !== "string" || desc.trim().length < 15) {
            return fallback;
        }
        const trimmed = desc.trim();
        const words = trimmed.split(/\s+/);
        const hasLongGibberish = words.some(w => w.length > 18);
        const vowelCount = (trimmed.match(/[aeiou]/gi) || []).length;
        const vowelRatio = vowelCount / trimmed.length;
        if (hasLongGibberish || vowelRatio < 0.15) {
            return fallback;
        }
        return trimmed;
    };

    useEffect(() => {
        const fetchSalonDetails = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get(`/salons/${id}`);
                if (response.data.success) {
                    setSalon(response.data.data);
                }
            } catch (err) {
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
                // silently fail — reviews are non-critical
            }
        };

        const fetchServices = async () => {
            try {
                const response = await axiosInstance.get(`/services/salon/${id}`);
                if (response.data.success) {
                    setServices(response.data.data);
                }
            } catch (err) {
                // silently fail — services are listed as empty
            }
        };

        const fetchStaff = async () => {
            try {
                const response = await axiosInstance.get(`/staff/salon/${id}`);
                if (response.data.success) {
                    setStaff(response.data.data);
                }
            } catch (err) {
                // silently fail — staff is listed as empty
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
            // silently fail — review already removed from UI state
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
            // revert optimistic update on failure
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

    if (loading) return <ShopDetailSkeleton />;


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

    // Build a 5-slot mosaic array (fills from available images, no random seed needed)
    const mosaicImages = Array.from({ length: 5 }, (_, i) => displayImages[i % displayImages.length]);

    // Fill the gallery array to exactly 8 for mobile carousel
    const galleryImages = [...displayImages];
    while (galleryImages.length < 8) {
        galleryImages.push(displayImages[Math.floor(Math.random() * displayImages.length)]);
    }

    return (
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 pb-6 md:pt-24">
            <div className="flex items-center justify-between mb-6">
                <NavLink to="/home" className="inline-flex items-center gap-2 text-gray-500 hover:text-[#D4AF37] transition-colors text-sm font-medium">
                    <ArrowLeft size={16} /> Back to Discover
                </NavLink>

                {/* Owner Magic Button: Only visible if isOwner */}
                {user?._id === salon?.owner && (
                    <NavLink 
                        to="/salon/manage" 
                        className="inline-flex items-center gap-2.5 px-6 py-2.5 bg-[#1a1a1a] text-white rounded-full text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-black/10 hover:scale-105"
                    >
                        <Settings size={14} className="text-[#D4AF37]" />
                        Manage This Salon
                    </NavLink>
                )}
            </div>

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
                    <div className="px-6 py-2 bg-red-100 rounded-full text-red-600 text-sm font-normal">
                        Closed
                    </div>
                </div>
            )}


            {/* Title & Brand Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="ui-badge bg-orange-50 px-2 py-1 rounded flex items-center gap-1">
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
                <div className="flex items-center gap-3">
                    <button 
                        onClick={handleToggleFavorite}
                        aria-label="Save to favorites"
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-full border transition-all text-xs font-bold shadow-sm active:scale-95 ${
                            isFavorite 
                                ? 'border-rose-200 bg-rose-50 text-rose-600' 
                                : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-rose-500'
                        }`}
                    >
                        <Heart size={16} className={isFavorite ? "fill-rose-500 text-rose-500" : ""} />
                        <span>{isFavorite ? "Saved" : "Save"}</span>
                    </button>
                    <button 
                        onClick={handleShare}
                        aria-label="Share salon"
                        className="flex items-center gap-2 px-4 py-2.5 rounded-full border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-[#003b95] transition-all text-xs font-bold shadow-sm active:scale-95"
                    >
                        {copied ? <Check size={16} className="text-emerald-600" /> : <Share2 size={16} />}
                        <span>{copied ? "Link Copied!" : "Share"}</span>
                    </button>
                </div>
            </div>

            {/* Sprint 2.2: Airbnb-Style 5-Photo Mosaic Gallery + Sidebar */}
            <div className="hidden md:flex flex-col lg:flex-row gap-4 mb-10">

                {/* LEFT: Airbnb Mosaic (1 large hero + 2×2 thumbnails) */}
                <div className="lg:w-[72%] xl:w-[75%]">
                    <div className="relative rounded-2xl overflow-hidden h-[460px] grid grid-cols-[60%_40%] grid-rows-2 gap-1.5">

                        {/* Hero image — spans 2 rows on left */}
                        <div
                            className="row-span-2 overflow-hidden relative group cursor-pointer"
                            onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                        >
                            <img
                                src={mosaicImages[0]}
                                alt="Salon hero photo"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        {/* Top-right thumb */}
                        <div
                            className="overflow-hidden relative group cursor-pointer"
                            onClick={() => { setLightboxIndex(1); setLightboxOpen(true); }}
                        >
                            <img
                                src={mosaicImages[1]}
                                alt="Salon photo 2"
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                            />
                        </div>

                        {/* Bottom-right area: 2 side-by-side thumbs */}
                        <div className="grid grid-cols-2 gap-1.5 overflow-hidden">
                            <div
                                className="overflow-hidden relative group cursor-pointer"
                                onClick={() => { setLightboxIndex(2); setLightboxOpen(true); }}
                            >
                                <img
                                    src={mosaicImages[2]}
                                    alt="Salon photo 3"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                            <div
                                className="overflow-hidden relative group cursor-pointer"
                                onClick={() => { setLightboxIndex(3); setLightboxOpen(true); }}
                            >
                                <img
                                    src={mosaicImages[3]}
                                    alt="Salon photo 4"
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                />
                            </div>
                        </div>

                        {/* "Show all X photos" floating button — bottom right corner */}
                        <button
                            type="button"
                            aria-label="Show all salon photos"
                            onClick={() => { setLightboxIndex(0); setLightboxOpen(true); }}
                            className="absolute bottom-4 right-4 z-10 inline-flex items-center gap-2 bg-white/95 hover:bg-white backdrop-blur-sm text-[#1a1a1a] font-bold text-xs px-4 py-2.5 rounded-full shadow-lg border border-gray-200 hover:border-gray-300 transition-all active:scale-95 hover:shadow-xl"
                        >
                            <Images size={14} className="text-[#D4AF37]" />
                            Show all {displayImages.length} photo{displayImages.length !== 1 ? 's' : ''}
                        </button>
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
                            aria-label="Close photo viewer"
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
                                aria-label="Previous salon photo"
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
                                aria-label="Next salon photo"
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
                                        aria-label={`Show salon photo ${idx + 1}`}
                                        aria-pressed={idx === lightboxIndex}
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

                {/* RIGHT: Sidebar (Rating + Map) */}
                <div className="lg:w-[28%] xl:w-[25%] flex flex-col gap-3 h-[460px]">
                    {/* Rating Card */}
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 flex justify-between items-start shadow-sm h-fit">
                        <div className="flex flex-col">
                            <span className="font-bold text-[#1a1a1a] text-base leading-tight">
                                {salon.rating >= 4.5 ? "Excellent" : salon.rating >= 4 ? "Very Good" : salon.rating > 0 ? "Good" : "New"}
                            </span>
                            <span className="text-xs text-gray-500">{reviews.length || 0} reviews</span>
                        </div>
                        <div className="bg-[#003b95] text-white w-9 h-9 rounded-t-lg rounded-br-lg flex items-center justify-center font-bold text-sm">
                            {salon.rating > 0 ? salon.rating.toFixed(1) : "New"}
                        </div>
                    </div>

                    {/* Location Preview Card */}
                    <div
                        className="flex-1 overflow-hidden rounded-2xl border border-gray-200 shadow-sm relative group bg-gradient-to-br from-amber-50/50 via-white to-gray-50 p-4 flex flex-col justify-between cursor-pointer hover:border-[#D4AF37]/50 hover:shadow-md transition-all"
                        onClick={() => document.getElementById('salon-location-section')?.scrollIntoView({ behavior: 'smooth' })}
                    >
                        <div className="flex-1 min-h-[280px] pointer-events-none">
                            <div className="h-full min-h-[280px] rounded-xl overflow-hidden">
                                <SalonMap salons={[salon]} zoom={14} />
                            </div>
                        </div>
                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between mt-auto">
                            <span className="text-xs font-bold text-[#006ce4] group-hover:underline flex items-center gap-1">
                                View full map below ↓
                            </span>
                            <span className="text-[11px] font-medium text-gray-400">Interactive Map</span>
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
                    aria-label="Previous salon gallery image"
                    onClick={() => setCurrentImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/70 backdrop-blur-md text-black rounded-full flex items-center justify-center shadow-md active:scale-95 transition-transform z-10 hover:bg-white"
                >
                    <ChevronLeft size={20} />
                </button>
                <button 
                    aria-label="Next salon gallery image"
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
                                    <p className="ui-subtext text-lg mb-1 truncate">{salon.city}</p>
                                    <p className="ui-subtext break-words">{formatAddress(salon.address)}</p>
                                    </div>
                                </div>
                                {salon.owner && (
                                    <div className="flex-1 flex gap-4 items-start bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                                        <div className="p-3 bg-gray-50 rounded-xl text-[#D4AF37]"><Phone size={24} /></div>
                                        <div className="min-w-0">
                                            <p className="text-[#1a1a1a] font-bold text-lg mb-1">Contact Salon</p>
                                            <p className="ui-subtext truncate">{salon.owner?.fullName || "Salon Staff"}</p>
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
                                <span className="ui-badge bg-gray-50 px-3 py-1 rounded-full">
                                    {services.length} {services.length === 1 ? 'Service' : 'Services'}
                                </span>
                            </div>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {services.map((service) => {
                                    const inCart = cartSalonId === salon?._id && isServiceInCart(service._id);
                                    const duration = service.durationMin || service.duration || 30;
                                    return (
                                        <div 
                                            key={service._id} 
                                            className={`p-5 bg-white border rounded-2xl transition-all group flex justify-between items-center shadow-sm ${
                                                inCart 
                                                    ? 'border-[#D4AF37] ring-1 ring-[#D4AF37]/30 bg-amber-50/10' 
                                                    : 'border-gray-100 hover:border-[#D4AF37]/40'
                                            }`}
                                        >
                                            <div className="min-w-0 flex-1 pr-3">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Scissors size={15} className="text-[#D4AF37] shrink-0" />
                                                    <h4 className="font-bold text-[#1a1a1a] text-sm truncate">{formatServiceName(service.name)}</h4>
                                                </div>
                                                <p className="ui-subtext line-clamp-1 mb-2">{service.description || "Professional salon service"}</p>
                                                <div className="flex items-center gap-2 text-xs text-gray-500">
                                                    <span className="inline-flex items-center gap-1 font-medium bg-gray-50 border border-gray-100 px-2 py-0.5 rounded-md text-gray-600">
                                                        <Clock size={11} className="text-[#D4AF37]" />
                                                        {duration} min
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="text-right shrink-0 flex flex-col justify-center items-end min-h-[50px]">
                                                <p className="text-base font-serif font-bold text-[#1a1a1a] leading-none mb-2">₹{service.price}</p>
                                                <button
                                                    type="button"
                                                    onClick={() => handleToggleService(service)}
                                                    className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-xs ${
                                                        inCart
                                                            ? 'bg-[#D4AF37] text-white hover:bg-[#c59e2a]'
                                                            : 'bg-gray-100 text-gray-800 hover:bg-[#1a1a1a] hover:text-white'
                                                    }`}
                                                >
                                                    {inCart ? (
                                                        <>
                                                            <Check size={13} className="stroke-[3]" />
                                                            <span>Added</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Plus size={13} className="stroke-[2.5]" />
                                                            <span>Add to Cart</span>
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* MEET OUR TEAM SECTION — Sprint 2.3 */}
                    {staff.length > 0 && (
                        <StaffSection
                            staff={staff}
                            salonId={salon._id}
                            navigate={navigate}
                            user={user}
                            formatLabel={formatLabel}
                        />
                    )}

                    {/* TRANSFORMATION GALLERY (BEFORE & AFTER) — Sprint 3.3 */}
                    <TransformationGallerySection photos={salon?.beforeAfterPhotos} />

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
                        <p className="text-gray-600 leading-relaxed text-base whitespace-pre-line">
                            {getCleanDescription(salon.description)}
                        </p>
                    </div>

                    {/* REVIEWS SECTION */}
                    <div className="pt-12 border-t border-gray-100 pb-16">
                        {/* Reviews Header: Score + Breakdown Bars (Sprint 3.2) */}
                        <div className="mb-10">
                            <h3 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a] mb-6">Customer Reviews</h3>
                            <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 bg-white border border-gray-100 rounded-3xl p-6 shadow-sm">

                                {/* Left: Overall Score */}
                                <div className="flex flex-col items-center justify-center text-center sm:border-r sm:border-gray-100 sm:pr-10 shrink-0">
                                    <span className="text-6xl font-serif font-black text-[#1a1a1a] leading-none">
                                        {salon.rating > 0 ? salon.rating.toFixed(1) : "—"}
                                    </span>
                                    <div className="flex items-center gap-0.5 mt-2">
                                        {[...Array(5)].map((_, i) => (
                                            <Star key={i} size={16} className={i < Math.floor(salon.rating || 0) ? "fill-yellow-400 text-yellow-400" : "text-gray-200"} />
                                        ))}
                                    </div>
                                    <p className="text-xs text-gray-400 font-medium mt-2">
                                        {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
                                    </p>
                                </div>

                                {/* Right: Per-Star Breakdown Bars */}
                                <div className="flex-1 flex flex-col justify-center gap-2">
                                    {[5, 4, 3, 2, 1].map((star) => {
                                        const count = reviews.filter(r => r.rating === star).length;
                                        const pct = reviews.length > 0 ? Math.round((count / reviews.length) * 100) : 0;
                                        return (
                                            <div key={star} className="flex items-center gap-3">
                                                {/* Star label */}
                                                <div className="flex items-center gap-1 w-10 shrink-0 justify-end">
                                                    <span className="text-xs font-bold text-gray-700 tabular-nums">{star}</span>
                                                    <Star size={11} className="fill-yellow-400 text-yellow-400 shrink-0" />
                                                </div>
                                                {/* Bar track */}
                                                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full rounded-full transition-all duration-700"
                                                        style={{
                                                            width: `${pct}%`,
                                                            backgroundColor: star >= 4 ? '#22c55e' : star === 3 ? '#D4AF37' : star === 2 ? '#f97316' : '#ef4444',
                                                        }}
                                                    />
                                                </div>
                                                {/* Percentage + count */}
                                                <div className="flex items-center gap-1.5 w-16 shrink-0">
                                                    <span className="text-xs font-bold text-gray-700 tabular-nums">{pct}%</span>
                                                    <span className="text-[11px] text-gray-400">({count})</span>
                                                </div>
                                            </div>
                                        );
                                    })}
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
                                                    <h4 className="font-bold text-sm text-[#1a1a1a]">{rev.user?.fullName || "Anonymous"}</h4>
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
                                            <p className="ui-label mb-3">Select Rating</p>
                                            <div className="flex gap-2">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <button 
                                                        key={star}
                                                        type="button"
                                                        aria-label={`Rate ${star} out of 5`}
                                                        aria-pressed={rating === star}
                                                        onClick={() => setRating(star)}
                                                        className={`p-2 rounded-xl transition-all ${rating >= star ? "text-[#D4AF37] bg-orange-50/50" : "text-gray-200 bg-gray-50/30"}`}
                                                    >
                                                        <Star size={24} className={rating >= star ? "fill-current" : ""} />
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <label htmlFor="review-text" className="ui-label">Your Experience</label>
                                            <textarea 
                                                id="review-text"
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
                                <span className="text-gray-500 text-xs font-semibold">Starting from</span>
                                <p className="text-3xl font-serif font-bold text-[#1a1a1a] mt-0.5">
                                    {services.length > 0 ? `₹${Math.min(...services.map(s => s.price))}` : "₹—"}
                                </p>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1.5 text-base font-bold text-gray-900 justify-end">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 border-none" /> {salon.rating || "NEW"}
                                </div>
                                <p className="text-xs text-[#D4AF37] font-semibold mt-0.5">Top Rated Studio</p>
                            </div>
                        </div>

                        <div className="space-y-3 mb-6">
                            <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5 text-gray-600 font-medium"><Clock size={16} className="text-[#D4AF37]" /> Opening Hours</div>
                                <span className="font-semibold text-[#1a1a1a]">{salon.openingHours || "09:00 AM"} - {salon.closingHours || "09:00 PM"}</span>
                            </div>
                            <div className="p-3.5 bg-gray-50/70 border border-gray-100 rounded-xl flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2.5 text-gray-600 font-medium">
                                    <Sparkles size={16} className={salon.availableSeats > 0 ? "text-emerald-500" : "text-rose-500"} /> 
                                    Live Availability
                                </div>
                                <span className={`font-semibold ${salon.availableSeats > 0 ? "text-emerald-700" : "text-rose-600"}`}>
                                    {salon.availableSeats > 0 ? `${salon.availableSeats} Seats Available` : "Full House"}
                                </span>
                            </div>
                        </div>

                        {/* Cancellation Policy Trust Banner */}
                        <div className="mb-5 p-3.5 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-start gap-2.5">
                            <span className="text-emerald-600 mt-0.5 shrink-0 text-base leading-none">✅</span>
                            <p className="text-xs text-emerald-800 font-medium leading-relaxed">
                                {salon.cancellationPolicy || "Free cancellation up to 24 hours before your appointment. A 20% fee applies thereafter."}
                            </p>
                        </div>

                        {/* Primary Customer CTA: Always Book Appointment */}
                        <button 
                            onClick={() => {
                                if (!user) {
                                    navigate("/login");
                                } else if (salon.isOpen) {
                                    navigate(`/booking/${salon._id}`);
                                }
                            }}
                            disabled={!salon.isOpen}
                            className={`w-full font-bold py-4 rounded-xl transition-all active:scale-[0.98] shadow-md text-base flex items-center justify-center gap-2 ${
                                salon.isOpen 
                                    ? 'bg-[#1a1a1a] text-white hover:bg-black shadow-black/10' 
                                    : 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none'
                            }`}
                        >
                            <Scissors size={18} className="text-[#D4AF37]" />
                            {salon.isOpen ? 'Book Appointment' : 'Temporarily Closed'}
                        </button>

                        {/* Owner Indicator Pill: Non-obtrusive */}
                        {user?._id === salon?.owner && (
                            <div className="mt-3 w-full bg-amber-50/80 border border-amber-200/60 py-2 px-3 rounded-lg text-center flex items-center justify-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-[#D4AF37]"></span>
                                <p className="text-xs font-semibold text-amber-900">Owner View: Active</p>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 mt-5">
                            <ShieldCheck size={16} className="text-emerald-500" />
                            <p className="text-xs text-gray-500 font-medium text-center">
                                Price Match Guarantee & Verified Hygiene
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

            {/* STICKY BOTTOM CART BAR & EXPANDABLE DRAWER */}
            {cartSalonId === salon?._id && totalCount > 0 && (
                <>
                    {/* Backdrop */}
                    {isDrawerOpen && (
                        <div 
                            className="fixed inset-0 bg-black/40 backdrop-blur-xs z-40 transition-opacity animate-fade-in"
                            onClick={() => setIsDrawerOpen(false)}
                        />
                    )}

                    {/* Expandable Drawer */}
                    {isDrawerOpen && (
                        <div className="fixed bottom-24 left-4 right-4 max-w-xl mx-auto z-50 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col animate-slide-up max-h-[70vh]">
                            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-gray-50/80">
                                <div className="flex items-center gap-2.5">
                                    <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center font-bold">
                                        <ShoppingBag size={16} />
                                    </div>
                                    <div>
                                        <h4 className="font-serif font-bold text-base text-[#1a1a1a] leading-tight">Selected Services</h4>
                                        <p className="text-xs text-gray-500">{totalCount} {totalCount === 1 ? 'service' : 'services'} in booking cart</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={clearCart}
                                        className="text-xs text-rose-500 hover:text-rose-700 font-semibold flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                                    >
                                        <Trash2 size={13} />
                                        <span>Clear</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setIsDrawerOpen(false)}
                                        className="p-1.5 rounded-full hover:bg-gray-200 text-gray-500 transition-colors"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>
                            </div>

                            {/* Service Items List */}
                            <div className="p-5 overflow-y-auto space-y-3 divide-y divide-gray-100 max-h-[42vh]">
                                {cartItems.map((item) => (
                                    <div key={item._id} className="pt-3 first:pt-0 flex items-center justify-between gap-3">
                                        <div className="min-w-0 flex-1">
                                            <h5 className="font-bold text-sm text-[#1a1a1a] truncate">{formatServiceName(item.name)}</h5>
                                            <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                                <span className="flex items-center gap-1 text-gray-600">
                                                    <Clock size={11} className="text-[#D4AF37]" />
                                                    {item.durationMin} min
                                                </span>
                                                <span>·</span>
                                                <span className="font-semibold text-[#1a1a1a]">₹{item.price}</span>
                                            </div>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => removeService(item._id)}
                                            className="p-2 text-gray-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-colors"
                                            title="Remove service"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>

                            {/* Drawer Summary & Action */}
                            <div className="p-5 border-t border-gray-100 bg-gray-50/70 flex items-center justify-between gap-4">
                                <div>
                                    <span className="text-xs text-gray-500 block leading-none mb-1">Total Estimated</span>
                                    <div className="flex items-baseline gap-2">
                                        <span className="font-serif font-bold text-2xl text-[#1a1a1a]">₹{totalPrice}</span>
                                        <span className="text-xs text-gray-500 font-medium">({totalDurationMin} min)</span>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsDrawerOpen(false);
                                        if (!user) {
                                            navigate("/login");
                                        } else {
                                            navigate(`/booking/${salon._id}`);
                                        }
                                    }}
                                    className="bg-[#1a1a1a] hover:bg-black text-white font-bold px-6 py-3 rounded-xl text-sm transition-all shadow-md active:scale-95 flex items-center gap-2"
                                >
                                    <span>Continue</span>
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Sticky Bottom Summary Bar */}
                    <div className="fixed bottom-4 left-4 right-4 max-w-3xl mx-auto z-40 bg-[#1a1a1a]/95 backdrop-blur-md text-white rounded-2xl shadow-2xl border border-white/10 px-5 py-3.5 flex items-center justify-between gap-3 animate-fade-in">
                        <button
                            type="button"
                            onClick={() => setIsDrawerOpen((prev) => !prev)}
                            className="flex items-center gap-3 text-left group hover:opacity-95 transition-opacity min-w-0"
                        >
                            <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/20 text-[#D4AF37] flex items-center justify-center shrink-0">
                                <ShoppingBag size={20} />
                            </div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <span className="font-bold text-sm sm:text-base text-white">
                                        {totalCount} {totalCount === 1 ? 'service' : 'services'}
                                    </span>
                                    <span className="text-gray-400">·</span>
                                    <span className="text-gray-300 text-xs sm:text-sm font-medium">
                                        {totalDurationMin} min
                                    </span>
                                    <span className="text-gray-400">·</span>
                                    <span className="text-[#D4AF37] font-bold text-sm sm:text-base">
                                        ₹{totalPrice}
                                    </span>
                                </div>
                                <p className="text-[11px] text-gray-400 group-hover:text-white transition-colors flex items-center gap-1 mt-0.5">
                                    <span>{isDrawerOpen ? "Hide services" : "View selection & adjust"}</span>
                                    {isDrawerOpen ? <ChevronDown size={12} /> : <ChevronUp size={12} />}
                                </p>
                            </div>
                        </button>

                        <button
                            type="button"
                            onClick={() => {
                                if (!user) {
                                    navigate("/login");
                                } else {
                                    navigate(`/booking/${salon._id}`);
                                }
                            }}
                            className="bg-[#D4AF37] hover:bg-[#c59e2a] text-[#1a1a1a] font-bold px-5 sm:px-6 py-2.5 rounded-xl text-sm sm:text-base transition-all shadow-md active:scale-95 flex items-center gap-2 shrink-0"
                        >
                            <span>Continue</span>
                            <Scissors size={15} />
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}
