import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosConfig";
import { Calendar, Clock, MapPin, Scissors, CheckCircle2, Phone, User } from "lucide-react";
import { BookingCardSkeleton } from "../components/skeletons/index.jsx";


export function MyBookingsPage() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchBookings = async () => {
            try {
                const response = await axiosInstance.get("/bookings/my-bookings");
                if (response.data.success) {
                    setBookings(response.data.data);
                }
            } catch (err) {
                // silently fail - empty state is shown
            } finally {
                setLoading(false);
            }
        };
        fetchBookings();
    }, []);

    if (loading) {
        return (
            <main className="flex-1 pb-20">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-10">
                    <div className="mb-6">
                        <div className="skeleton h-9 w-48 rounded-lg" />
                        <div className="skeleton h-4 w-72 rounded-full mt-3" />
                    </div>
                    <div className="grid gap-4">
                        {[...Array(4)].map((_, i) => <BookingCardSkeleton key={i} />)}
                    </div>
                </div>
            </main>
        );
    }

    return (
        <main className="flex-1 pb-20">

            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-10">
                <div className="mb-6 text-center md:text-left">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1a1a1a]">My Bookings</h1>
                    <p className="text-gray-400 mt-2 font-medium text-sm md:text-base">Manage your upcoming and past appointments</p>
                </div>

                {bookings.length === 0 ? (
                    <div className="bg-white rounded-3xl p-20 text-center border border-gray-100 shadow-sm">
                        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6 text-gray-300">
                            <Calendar size={40} />
                        </div>
                        <h3 className="text-xl font-serif font-bold text-gray-900 mb-2">No bookings yet</h3>
                        <p className="text-gray-500 mb-8 max-w-sm mx-auto">Ready for your next salon experience? Browse our collection of top-rated parlors.</p>
                        <a href="/home" className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-sm hover:bg-black transition-colors">
                            Explore Salons
                        </a>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {bookings.map((booking) => (
                            <div key={booking._id} className="relative bg-white rounded-[40px] p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-6 lg:gap-8 hover:shadow-md transition-all duration-300">

                                {/* Status Badge - Top Right */}
                                <div className="absolute top-6 right-6 md:top-8 md:right-8 z-10">
                                    <div className="bg-[#fdfcf5] text-[#D4AF37] px-4 py-1.5 rounded-full text-[10px] font-bold border border-[#D4AF37]/20 flex items-center gap-2 shadow-sm capitalize">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></div>
                                        {booking.status}
                                    </div>
                                </div>

                                {/* PART 1: IMAGE (Left) */}
                                <div className="w-full lg:w-56 h-56 lg:h-auto rounded-[32px] overflow-hidden shrink-0 shadow-lg border border-white relative group">
                                    <img
                                        src={booking.salon?.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300&h=300&auto=format&fit=crop"}
                                        alt={booking.salon?.name}
                                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                                </div>

                                {/* PART 2: SALON INFO (Middle) */}
                                <div className="flex-1 flex flex-col justify-center py-2">
                                    <div className="space-y-4">
                                        <h3 className="text-2xl lg:text-3xl font-black text-[#1a1a1a] tracking-tight leading-none group">
                                            {booking.salon?.name || "Style Station"}
                                            <span className="block h-1 w-12 bg-[#D4AF37] mt-3 rounded-full group-hover:w-20 transition-all duration-500"></span>
                                        </h3>
                                        <div className="flex items-start gap-3 text-gray-500 bg-gray-50/50 w-fit px-4 py-2.5 rounded-2xl border border-gray-100/50 max-w-sm lg:max-w-md">
                                            <MapPin size={18} className="text-[#D4AF37] shrink-0 mt-0.5" />
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold tracking-tight text-gray-900 leading-snug">{booking.salon?.address || "No address provided"}</span>
                                                <span className="text-[10px] font-bold text-gray-400 mt-1">{booking.salon?.city}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-6 grid grid-cols-2 gap-4">
                                        <div className="flex items-center gap-3 bg-gray-50/50 px-4 py-3 rounded-2xl border border-gray-100/50">
                                            <Clock size={18} className="text-[#D4AF37]" />
                                            <div className="flex flex-col">
                                                <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">Time</p>
                                                <p className="text-sm font-bold text-gray-900 leading-none">{booking.time}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-gray-50/50 px-4 py-3 rounded-2xl border border-gray-100/50">
                                            <Calendar size={18} className="text-[#D4AF37]" />
                                            <div className="flex flex-col">
                                                <p className="text-[10px] text-gray-400 font-bold leading-none mb-1">Date</p>
                                                <p className="text-sm font-bold text-gray-900 leading-none">{new Date(booking.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* PART 3: REMAINING THINGS (Right - Details Grid) */}
                                <div className="lg:w-[48%] bg-gray-50/50 rounded-[32px] p-6 lg:p-8 border border-gray-100/50 flex flex-col justify-center gap-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {/* Column 1: Services */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100 shrink-0">
                                                <Scissors size={22} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold leading-none mb-3">Services</p>
                                                <div className="flex flex-col gap-2">
                                                    {booking.serviceNames?.length > 0 ? (
                                                        booking.serviceNames.map((service, index) => (
                                                            <div key={index} className="flex items-center gap-2">
                                                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] shrink-0"></div>
                                                                <p className="text-sm font-bold text-gray-900 leading-tight">{service}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-sm font-bold text-gray-900">Standard Salon Visit</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Column 2: Stylist */}
                                        <div className="flex items-start gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100 shrink-0">
                                                <User size={22} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-bold leading-none mb-3">Stylist</p>
                                                <p className="text-sm font-bold text-gray-900 leading-snug">
                                                    {booking.staff?.name || (typeof booking.staff === 'string' && booking.staff.length > 20 ? "Any Available Professional" : booking.staff || "Any Available Professional")}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t border-gray-200/50 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-[#D4AF37]/5 shrink-0">
                                                <Phone size={22} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-gray-400 font-bold leading-none mb-1.5">Contact Support</p>
                                                <a href={`tel:${booking.salon?.contactNumber}`} className="text-base font-black text-[#1a1a1a] hover:text-[#D4AF37] transition-colors">
                                                    {booking.salon?.contactNumber || booking.salon?.owner?.phonenumber || "N/A"}
                                                </a>
                                            </div>
                                        </div>

                                        <div className="shrink-0 pt-2 md:pt-0">
                                            <div className="flex items-center gap-4">
                                                <div className="w-11 h-11 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-[#D4AF37]/5 shrink-0">
                                                    <span className="text-xl font-bold">₹</span>
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-[10px] text-gray-400 font-bold leading-none mb-1.5">Total Paid</p>
                                                    <p className="text-xl font-black text-[#1a1a1a] tracking-tighter leading-none">
                                                        <span className="text-xl mr-1">₹</span>{booking.totalAmount}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}
