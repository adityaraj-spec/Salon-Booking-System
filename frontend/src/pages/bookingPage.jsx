import { useState, useMemo } from "react";
import { NavBar } from "../components/navPage";
import { Footer } from "../components/footerPage";
import {
    Calendar as CalendarIcon,
    Clock,
    User,
    Check,
    ChevronRight,
    Sparkles,
    Scissors,
    Phone,
    ArrowLeft
} from "lucide-react";
import { NavLink } from "react-router-dom";

// Mock Data - To be replaced by API calls in production
const AVAILABLE_SERVICES = [
    { id: "s1", name: "Executive Haircut", price: 30, duration: "45 min", description: "Precision cut with styling and rinse." },
    { id: "s2", name: "Beard Sculpture", price: 20, duration: "30 min", description: "Complete trim and shape with hot towel." },
    { id: "s3", name: "Advanced Styling", price: 45, duration: "60 min", description: "Blowout and specialty styling." },
    { id: "s4", name: "Hydrating Facial", price: 60, duration: "50 min", description: "Deep cleansing and hydration treatment." },
    { id: "s5", name: "Full Color", price: 100, duration: "120 min", description: "Premium permanent color application." },
];

const STAFF_MEMBERS = [
    { id: "st1", name: "Alex Rivera", role: "Master Stylist", avatar: "https://i.pravatar.cc/150?u=alex" },
    { id: "st2", name: "Sam Chen", role: "Senior Barber", avatar: "https://i.pravatar.cc/150?u=sam" },
    { id: "st3", name: "Jordan Smith", role: "Color Expert", avatar: "https://i.pravatar.cc/150?u=jordan" },
];

const TIME_SLOTS = [
    "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
    "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM", "06:00 PM"
];

export function BookingPage() {
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    const toggleService = (service) => {
        setSelectedServices(prev =>
            prev.find(s => s.id === service.id)
                ? prev.filter(s => s.id !== service.id)
                : [...prev, service]
        );
    };

    const totalAmount = useMemo(() =>
        selectedServices.reduce((sum, s) => sum + s.price, 0),
        [selectedServices]);

    const handleConfirm = () => {
        if (selectedServices.length === 0 || !date || !time) {
            alert("Please select at least one service, a date, and a time.");
            return;
        }

        const bookingData = {
            services: selectedServices.map(s => s.id),
            staff: selectedStaff?.id,
            date,
            time,
            totalAmount,
            status: "pending"
        };

        console.log("Submitting Booking:", bookingData);
        alert(`Reservation Confirmed for ₹${totalAmount}!`);
    };

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans pt-24">
            <NavBar />

            <div className="max-w-6xl mx-auto px-6 pb-24">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-10">
                    <NavLink to="/home" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </NavLink>
                    <div>
                        <h1 className="text-4xl font-serif font-bold text-[#1a1a1a]">Secure Your Appointment</h1>
                        <p className="text-gray-500 mt-1">Experience the difference with SalonNow at Glamour Studio</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">

                    {/* LEFT COLUMN: SELECTIONS */}
                    <div className="lg:col-span-2 space-y-12">

                        {/* 1. Services Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">1</span>
                                <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">Select Services</h2>
                            </div>
                            <div className="grid gap-4">
                                {AVAILABLE_SERVICES.map(service => (
                                    <div
                                        key={service.id}
                                        onClick={() => toggleService(service)}
                                        className={`group cursor-pointer p-5 rounded-2xl border-2 transition-all flex items-center justify-between ${selectedServices.find(s => s.id === service.id)
                                            ? "border-[#e65c00] bg-orange-50/30"
                                            : "border-gray-100 bg-white hover:border-gray-200"
                                            }`}
                                    >
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-bold text-gray-900">{service.name}</h3>
                                                <span className="text-xs text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full">{service.duration}</span>
                                            </div>
                                            <p className="text-sm text-gray-500 line-clamp-1">{service.description}</p>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className={`font-bold transition-colors ${selectedServices.find(s => s.id === service.id) ? "text-[#e65c00]" : "text-gray-900"
                                                }`}>
                                                ₹{service.price}
                                            </p>
                                            <div className={`mt-2 w-5 h-5 rounded-full border flex items-center justify-center transition-all ${selectedServices.find(s => s.id === service.id)
                                                ? "bg-[#e65c00] border-[#e65c00]"
                                                : "border-gray-200"
                                                }`}>
                                                {selectedServices.find(s => s.id === service.id) && <Check size={12} className="text-white" />}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 2. Staff Section */}
                        <section>
                            <div className="flex items-center gap-2 mb-6">
                                <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">2</span>
                                <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">Choose Stylist (Optional)</h2>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                {STAFF_MEMBERS.map(staff => (
                                    <div
                                        key={staff.id}
                                        onClick={() => setSelectedStaff(selectedStaff?.id === staff.id ? null : staff)}
                                        className={`cursor-pointer p-4 rounded-2xl border-2 transition-all text-center ${selectedStaff?.id === staff.id
                                            ? "border-[#e65c00] bg-orange-50/30 shadow-sm"
                                            : "border-gray-100 bg-white hover:border-gray-200"
                                            }`}
                                    >
                                        <div className="relative inline-block mb-3">
                                            <img src={staff.avatar} alt={staff.name} className="w-16 h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                                            {selectedStaff?.id === staff.id && (
                                                <div className="absolute -bottom-1 -right-1 bg-[#e65c00] p-1 rounded-full text-white">
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-sm">{staff.name}</h3>
                                        <p className="text-xs text-gray-400 mt-0.5">{staff.role}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. Date & Time Section */}
                        <section className="grid md:grid-cols-2 gap-8">
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">3</span>
                                    <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">Pick a Date</h2>
                                </div>
                                <div className="relative">
                                    <CalendarIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                    <input
                                        type="date"
                                        className="w-full bg-white border border-gray-100 rounded-2xl p-4 pl-12 focus:outline-none focus:border-gray-300 transition-colors"
                                        onChange={(e) => setDate(e.target.value)}
                                        value={date}
                                        min={new Date().toISOString().split('T')[0]}
                                    />
                                </div>
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">4</span>
                                    <h2 className="text-xl font-serif font-bold text-[#1a1a1a]">Select Time</h2>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    {TIME_SLOTS.map(t => (
                                        <button
                                            key={t}
                                            onClick={() => setTime(t)}
                                            className={`py-3 rounded-xl text-sm font-medium transition-all ${time === t
                                                ? "bg-[#1a1a1a] text-white shadow-md"
                                                : "bg-white text-gray-600 border border-gray-100 hover:border-gray-200"
                                                }`}
                                        >
                                            {t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </section>

                    </div>

                    {/* RIGHT COLUMN: BOOKING SUMMARY */}
                    <div className="lg:col-span-1">
                        <div className="bg-white border border-gray-100 rounded-3xl p-8 sticky top-28 shadow-sm">
                            <h2 className="text-xl font-serif font-bold text-[#1a1a1a] mb-6 border-b border-gray-50 pb-4">Booking Summary</h2>

                            <div className="space-y-4 mb-8">
                                {selectedServices.length > 0 ? (
                                    selectedServices.map(s => (
                                        <div key={s.id} className="flex justify-between items-start text-sm">
                                            <span className="text-gray-600">{s.name}</span>
                                            <span className="font-bold text-gray-900">₹{s.price}</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-gray-400 italic">No services selected yet</p>
                                )}
                            </div>

                            {selectedStaff && (
                                <div className="mb-8 pt-4 border-t border-gray-50">
                                    <p className="text-xs text-gray-400 uppercase tracking-widest mb-2 font-bold">Your Stylist</p>
                                    <div className="flex items-center gap-3">
                                        <img src={selectedStaff.avatar} className="w-8 h-8 rounded-full" alt="" />
                                        <span className="text-sm font-bold text-gray-900">{selectedStaff.name}</span>
                                    </div>
                                </div>
                            )}

                            {(date || time) && (
                                <div className="mb-8 pt-4 border-t border-gray-50 space-y-2">
                                    {date && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <CalendarIcon size={14} />
                                            <span>{new Date(date).toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                                        </div>
                                    )}
                                    {time && (
                                        <div className="flex items-center gap-2 text-sm text-gray-600">
                                            <Clock size={14} />
                                            <span>{time}</span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="pt-6 border-t border-gray-100 mt-6">
                                <div className="flex justify-between items-center mb-6">
                                    <span className="text-lg font-bold text-[#1a1a1a]">Total</span>
                                    <span className="text-2xl font-serif font-bold text-[#e65c00]">₹{totalAmount}</span>
                                </div>
                                <button
                                    onClick={handleConfirm}
                                    className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                    disabled={selectedServices.length === 0 || !date || !time}
                                >
                                    Confirm Reservation <ChevronRight size={18} />
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-4">
                                    Payment will be handled at the salon.
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