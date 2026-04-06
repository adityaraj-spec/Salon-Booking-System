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

                <div className="max-w-5xl mx-auto px-6 py-8 md:py-12">
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
                                <div key={booking._id} className="bg-white rounded-3xl p-5 md:p-6 border border-gray-100 shadow-sm hover:shadow-md transition-shadow flex flex-col md:flex-row gap-6 md:gap-8 items-center group">
                                    <div className="w-full md:w-32 h-40 md:h-32 rounded-2xl overflow-hidden shrink-0 border border-gray-50">
                                        <img 
                                            src={booking.salon?.images?.[0] || "https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=300&h=300&auto=format&fit=crop"} 
                                            alt={booking.salon?.name} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                                        />
                                    </div>

                                    <div className="flex-1 space-y-4 text-center md:text-left">
                                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                            <div>
                                                <h3 className="text-xl font-extrabold text-[#1a1a1a] group-hover:text-[#D4AF37] transition-colors">{booking.salon?.name}</h3>
                                                <div className="flex items-center gap-2 text-gray-400 text-sm justify-center md:justify-start mt-1">
                                                    <MapPin size={14} className="text-[#D4AF37]" />
                                                    <span className="font-medium text-xs font-serif">{booking.salon?.city}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-center md:items-end">
                                                <span className="bg-[#f9f5e8] text-[#D4AF37] px-4 py-1.5 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest border border-[#D4AF37]/20 flex items-center gap-2">
                                                    <CheckCircle2 size={12} />
                                                    {booking.status}
                                                </span>
                                                <p className="text-xl md:text-2xl font-black text-[#1a1a1a] mt-2 flex items-baseline gap-1">
                                                    <span className="text-base md:text-lg font-medium text-[#D4AF37]">₹</span>
                                                    {booking.totalAmount}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 pt-4 border-t border-gray-50">
                                            <div className="flex items-center gap-2 md:gap-3 justify-start">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D4AF37] shrink-0">
                                                    <Calendar size={16} />
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Date</p>
                                                    <p className="text-xs font-bold text-[#1a1a1a] truncate">{new Date(booking.date).toLocaleDateString(undefined, { dateStyle: 'medium' })}</p>
                                                </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-2 md:gap-3 justify-start">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D4AF37] shrink-0">
                                                    <Clock size={16} />
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Time</p>
                                                    <p className="text-xs font-bold text-[#1a1a1a] truncate">{booking.time}</p>
                                                </div>
                                            </div>


                                            <div className="flex items-center gap-2 md:gap-3 justify-start col-span-2 lg:col-span-1 border-t md:border-t-0 pt-4 md:pt-0">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D4AF37] shrink-0">
                                                    <Scissors size={16} />
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Service</p>
                                                    <p className="text-xs font-bold text-[#1a1a1a] truncate">
                                                        {booking.serviceNames?.length > 0 
                                                            ? booking.serviceNames.join(", ") 
                                                            : "Confirmed Visit"}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-2 md:gap-3 justify-start border-t md:border-t-0 pt-4 md:pt-0">
                                                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-[#D4AF37] shrink-0">
                                                    <Phone size={16} />
                                                </div>
                                                <div className="text-left min-w-0">
                                                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Contact Salon</p>
                                                    {booking.salon?.contactNumber || booking.salon?.owner?.phonenumber ? (
                                                        <a href={`tel:${booking.salon.contactNumber || booking.salon.owner.phonenumber}`} className="text-xs font-bold text-[#D4AF37] hover:underline truncate block">
                                                            {booking.salon.contactNumber || booking.salon.owner.phonenumber}
                                                        </a>
                                                    ) : (
                                                        <p className="text-xs font-bold text-gray-300 italic">No number listed</p>
                                                    )}
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
