import { useState, useEffect } from "react";
import axiosInstance from "../api/axiosConfig";
import { Calendar, Clock, MapPin, Loader2, Scissors, CheckCircle2, Phone } from "lucide-react";


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
                                <div key={booking._id} className="bg-white rounded-[32px] p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                                    <div className="flex flex-col md:flex-row gap-8 items-start">
                                        {/* Left: Image */}
                                        <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl overflow-hidden shrink-0 border border-gray-50">
                                            <img 
                                                src={booking.salon?.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300&h=300&auto=format&fit=crop"} 
                                                alt={booking.salon?.name} 
                                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                            />
                                        </div>

                                        {/* Middle: Details */}
                                        <div className="flex-1 space-y-6">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h3 className="text-2xl font-black text-[#D4AF37] mb-1">{booking.salon?.name || "Style Station"}</h3>
                                                    <div className="flex items-center gap-1.5 text-gray-400">
                                                        <MapPin size={16} className="text-[#D4AF37] fill-[#D4AF37]/10" />
                                                        <span className="text-sm font-medium">{booking.salon?.city || "panapur"}</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex flex-col items-end gap-3">
                                                    <span className="bg-[#f9f5e8] text-[#D4AF37] px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest border border-[#D4AF37]/10 flex items-center gap-2">
                                                        <CheckCircle2 size={14} />
                                                        {booking.status}
                                                    </span>
                                                    <p className="text-2xl font-black text-[#1a1a1a]">
                                                        <span className="text-lg font-medium text-[#D4AF37] mr-1">₹</span>
                                                        {booking.totalAmount}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Info Grid */}
                                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 pt-6 border-t border-gray-50">
                                                <div className="flex items-center gap-3">
                                                    <Calendar size={18} className="text-[#D4AF37] shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                                                        <p className="text-sm font-bold text-[#1a1a1a]">{new Date(booking.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-center gap-3">
                                                    <Clock size={18} className="text-[#D4AF37] shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Time</p>
                                                        <p className="text-sm font-bold text-[#1a1a1a]">{booking.time}</p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Scissors size={18} className="text-[#D4AF37] shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Service</p>
                                                        <p className="text-sm font-bold text-[#1a1a1a] truncate">
                                                            {booking.serviceNames?.length > 0 
                                                                ? booking.serviceNames.join(", ") 
                                                                : "Confirmed Visit"}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3">
                                                    <Phone size={18} className="text-[#D4AF37] shrink-0" />
                                                    <div>
                                                        <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Contact Salon</p>
                                                        <p className="text-sm font-bold text-[#D4AF37]">
                                                            {booking.salon?.contactNumber || booking.salon?.owner?.phonenumber || "No number"}
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
