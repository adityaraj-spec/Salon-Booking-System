import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosConfig";
import { Calendar, Clock, MapPin, Loader2, Scissors, CheckCircle2, Phone, User } from "lucide-react";


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
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin" />
            </div>
        );
    }

    return (
        <main className="flex-1 pb-20">

            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-28 md:pt-32 pb-12">
                <div className="mb-8 md:mb-10 text-center md:text-left">
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
                        <a href="/home" className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold tracking-widest text-sm uppercase hover:bg-black transition-colors">
                            Explore Salons
                        </a>
                    </div>
                ) : (
                    <div className="grid gap-6">
                        {bookings.map((booking) => (
                            <div key={booking._id} className="bg-white rounded-[40px] p-6 lg:p-8 shadow-sm border border-gray-100 flex flex-col lg:flex-row gap-8 lg:gap-12 hover:shadow-md transition-all duration-300">

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
                                    <div className="space-y-3">
                                        <h3 className="text-4xl lg:text-5xl font-black text-[#1a1a1a] tracking-tight leading-none group">
                                            {booking.salon?.name || "Style Station"}
                                            <span className="block h-1 w-12 bg-[#D4AF37] mt-3 rounded-full group-hover:w-20 transition-all duration-500"></span>
                                        </h3>
                                        <div className="flex items-center gap-2.5 text-gray-500 bg-gray-50/50 w-fit px-4 py-2 rounded-2xl border border-gray-100/50">
                                            <MapPin size={18} className="text-[#D4AF37]" />
                                            <span className="text-base font-bold tracking-tight">{booking.salon?.city || "Location"}</span>
                                        </div>
                                    </div>

                                    <div className="mt-8 flex items-center gap-6">
                                        <div className="flex flex-col">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Status</p>
                                            <div className="bg-[#fdfcf5] text-[#D4AF37] px-5 py-2 rounded-full text-[11px] font-black uppercase tracking-wider border border-[#D4AF37]/20 flex items-center gap-2.5 shadow-sm">
                                                <div className="w-2 h-2 rounded-full bg-[#D4AF37] animate-pulse"></div>
                                                {booking.status}
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Paid</p>
                                            <p className="text-3xl font-black text-[#1a1a1a] tracking-tighter leading-none flex items-start gap-1">
                                                <span className="text-lg font-bold text-[#D4AF37] mt-0.5">₹</span>
                                                {booking.totalAmount}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* PART 3: REMAINING THINGS (Right - Details Grid) */}
                                <div className="lg:w-[42%] bg-gray-50/50 rounded-[32px] p-6 border border-gray-100/50 flex flex-col justify-center">
                                    <div className="grid grid-cols-2 gap-y-8 gap-x-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100">
                                                <Calendar size={22} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5">Date</p>
                                                <p className="text-sm font-bold text-gray-900">{new Date(booking.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100">
                                                <Clock size={22} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5">Time Slot</p>
                                                <p className="text-sm font-bold text-gray-900">{booking.time}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100">
                                                <Scissors size={22} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5">Service</p>
                                                <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]">
                                                    {booking.serviceNames?.length > 0 ? booking.serviceNames.join(", ") : "Visit"}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="w-11 h-11 bg-white rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-gray-100">
                                                <User size={22} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5">Stylist</p>
                                                <p className="text-sm font-bold text-gray-900 truncate max-w-[140px]">
                                                    {booking.staff?.name || (typeof booking.staff === 'string' && booking.staff.length > 20 ? "Any Available" : booking.staff || "Any Available")}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4 col-span-2 mt-2 pt-6 border-t border-gray-100/10">
                                            <div className="w-11 h-11 bg-[#D4AF37]/10 rounded-2xl flex items-center justify-center text-[#D4AF37] shadow-sm border border-[#D4AF37]/5">
                                                <Phone size={22} />
                                            </div>
                                            <div className="flex-1">
                                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5">Emergency Contact</p>
                                                <a href={`tel:${booking.salon?.contactNumber}`} className="text-base font-black text-[#1a1a1a] hover:text-[#D4AF37] transition-colors">
                                                    {booking.salon?.contactNumber || booking.salon?.owner?.phonenumber || "N/A"}
                                                </a>
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
