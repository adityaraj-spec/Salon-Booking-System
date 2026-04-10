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
                console.error("Error fetching bookings:", err);
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
                            <div key={booking._id} className="bg-white rounded-[40px] p-8 shadow-sm border border-gray-100 flex flex-col gap-10 hover:shadow-md transition-shadow">
                                {/* Top Section */}
                                <div className="flex flex-col md:flex-row items-center md:items-start gap-8">
                                    <div className="w-32 h-32 rounded-[28px] overflow-hidden shrink-0 shadow-sm border border-gray-50">
                                        <img
                                            src={booking.salon?.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300&h=300&auto=format&fit=crop"}
                                            alt={booking.salon?.name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>

                                    <div className="flex-grow flex flex-col md:flex-row justify-between items-center md:items-start w-full">
                                        <div className="text-center md:text-left">
                                            <h3 className="text-3xl font-black text-[#D4AF37] tracking-tight">{booking.salon?.name || "Style Station"}</h3>
                                            <div className="flex items-center justify-center md:justify-start gap-1.5 text-gray-400 mt-1">
                                                <MapPin size={16} className="text-[#D4AF37]/50" />
                                                <span className="text-sm font-semibold">{booking.salon?.city || "panapur"}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col items-end gap-3 mt-6 md:mt-0">
                                            <div className="bg-[#fdfcf5] text-[#D4AF37] px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.1em] border border-[#D4AF37]/10 flex items-center gap-2 shadow-sm">
                                                <div className="w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse"></div>
                                                {booking.status}
                                            </div>
                                            <p className="text-3xl font-black text-black tracking-tight">
                                                <span className="text-lg font-bold text-[#D4AF37] mr-1">₹</span>
                                                {booking.totalAmount}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Bottom Info Grid */}
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-8 pt-8 border-t border-gray-100">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#fdfcf5] rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/5">
                                            <Calendar size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Date</p>
                                            <p className="text-sm font-bold text-black">{new Date(booking.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#fdfcf5] rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/5">
                                            <Clock size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Time</p>
                                            <p className="text-sm font-bold text-black">{booking.time}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#fdfcf5] rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/5">
                                            <Scissors size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Service</p>
                                            <p className="text-sm font-bold text-black truncate max-w-[120px]">
                                                {booking.serviceNames?.length > 0
                                                    ? booking.serviceNames.join(", ")
                                                    : "Confirmed Visit"}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#fdfcf5] rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/5">
                                            <User size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Stylist</p>
                                            <p className="text-sm font-bold text-black truncate max-w-[120px]">
                                                {booking.staff?.name || (typeof booking.staff === 'string' ? booking.staff : "Any Available")}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 bg-[#fdfcf5] rounded-xl flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/5">
                                            <Phone size={20} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Contact Salon</p>
                                            <p className="text-sm font-bold text-[#D4AF37]">
                                                {booking.salon?.contactNumber || booking.salon?.owner?.phonenumber || "No number"}
                                            </p>
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
