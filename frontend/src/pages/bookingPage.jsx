import { useState, useMemo, useEffect } from "react";
import { useParams, NavLink, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { NavBar } from "../components/navPage";
import { Footer } from "../components/footerPage";
import {
    Calendar as CalendarIcon,
    Clock,
    User,
    Check,
    Sparkles,
    Scissors,
    Phone,
    ArrowLeft,
    Loader2,
    ChevronLeft,
    ChevronRight
} from "lucide-react";

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

function CustomCalendar({ selectedDate, onDateSelect }) {
    const [viewDate, setViewDate] = useState(new Date());
    const daysOfWeek = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

    const currentYear = viewDate.getFullYear();
    const currentMonth = viewDate.getMonth();

    const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    const prevMonth = () => setViewDate(new Date(currentYear, currentMonth - 1, 1));
    const nextMonth = () => setViewDate(new Date(currentYear, currentMonth + 1, 1));

    const isToday = (day) => {
        const today = new Date();
        return today.getDate() === day && today.getMonth() === currentMonth && today.getFullYear() === currentYear;
    };

    const isSelected = (day) => {
        if (!selectedDate) return false;
        const sel = new Date(selectedDate);
        return sel.getDate() === day && sel.getMonth() === currentMonth && sel.getFullYear() === currentYear;
    };

    const isPast = (day) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const current = new Date(currentYear, currentMonth, day);
        return current < today;
    };

    return (
        <div className="bg-white border border-gray-100 rounded-[24px] p-6 shadow-sm">
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-serif font-bold text-lg text-gray-900">
                    {viewDate.toLocaleString('default', { month: 'long' })} {currentYear}
                </h3>
                <div className="flex gap-2">
                    <button onClick={prevMonth} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <ChevronLeft size={18} />
                    </button>
                    <button onClick={nextMonth} className="p-2 hover:bg-gray-50 rounded-full transition-colors">
                        <ChevronRight size={18} />
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 mb-2">
                {daysOfWeek.map(day => (
                    <div key={day} className="text-center text-[10px] font-bold text-gray-400 uppercase tracking-widest py-2">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDayOfMonth }).map((_, i) => (
                    <div key={`empty-${i}`} className="aspect-square"></div>
                ))}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const disabled = isPast(day);
                    return (
                        <button
                            key={day}
                            disabled={disabled}
                            onClick={() => {
                                const formattedDate = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                onDateSelect(formattedDate);
                            }}
                            className={`
                                aspect-square rounded-full flex items-center justify-center text-sm font-medium transition-all relative
                                ${disabled ? "text-gray-200 cursor-not-allowed" : "text-gray-700 hover:bg-gray-50 hover:text-[#D4AF37]"}
                                ${isSelected(day) ? "bg-[#1a1a1a] text-white hover:bg-black hover:text-white" : ""}
                                ${isToday(day) && !isSelected(day) ? "border border-[#D4AF37] text-[#D4AF37]" : ""}
                            `}
                        >
                            {day}
                            {isToday(day) && !isSelected(day) && (
                                <span className="absolute bottom-1 w-1 h-1 bg-[#D4AF37] rounded-full"></span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function BookingPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const [salon, setSalon] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookingLoading, setBookingLoading] = useState(false);
    const [bookingSuccess, setBookingSuccess] = useState(false);
    const [bookingError, setBookingError] = useState("");
    const [selectedServices, setSelectedServices] = useState([]);
    const [selectedStaff, setSelectedStaff] = useState(null);
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");

    useEffect(() => {
        const fetchSalonDetails = async () => {
            setLoading(true);
            try {
                const response = await axiosInstance.get(`/salons/${id}`);
                if (response.data.success) {
                    setSalon(response.data.data);
                }
            } catch (err) {
                console.error("Error fetching salon in booking:", err);
            } finally {
                setLoading(false);
            }
        };

        if (id) {
            fetchSalonDetails();
        }
    }, [id]);

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

    const handleConfirm = async () => {
        if (selectedServices.length === 0 || !date || !time) {
            setBookingError("Please select at least one service, a date, and a time.");
            return;
        }
        setBookingLoading(true);
        setBookingError("");
        try {
            const response = await axiosInstance.post("/bookings", {
                salonId: id,
                services: selectedServices.map(s => s.id),
                staff: selectedStaff?.id || null,
                serviceNames: selectedServices.map(s => s.name),
                staffName: selectedStaff?.name || "Any Available",
                date,
                time,
                totalAmount,
            }, { withCredentials: true });

            if (response.data.success) {
                setBookingSuccess(true);
            }
        } catch (err) {
            setBookingError(err.response?.data?.message || "Booking failed. Please try again.");
        } finally {
            setBookingLoading(false);
        }
    };

    if (bookingSuccess) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center text-center px-6">
                <NavBar />
                <div className="max-w-md">
                    <div className="w-20 h-20 rounded-full bg-[#D4AF37]/10 flex items-center justify-center mx-auto mb-6">
                        <Check className="text-[#D4AF37] w-10 h-10" strokeWidth={3} />
                    </div>
                    <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-3">Booking Confirmed!</h2>
                    <p className="text-gray-500 mb-2">Your appointment at <strong>{salon?.name}</strong> is all set.</p>
                    <p className="text-gray-400 text-sm mb-8">A confirmation email has been sent to your inbox.</p>
                    <NavLink to="/home" className="inline-block bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold tracking-widest text-sm uppercase hover:bg-black transition-colors">
                        Back to Home
                    </NavLink>
                </div>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center">
                <NavBar />
                <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                <p className="text-gray-500 animate-pulse">Setting up your booking experience...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
            <NavBar />

            <main className="flex-1 pt-24">
                <div className="max-w-6xl mx-auto px-6 pb-24">
                {/* Header Section */}
                <div className="flex items-center gap-4 mb-10">
                    <NavLink to={`/shop/${id}`} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} className="text-gray-600" />
                    </NavLink>
                    <div>
                        <h1 className="text-3xl md:text-4xl font-serif font-bold text-[#1a1a1a] leading-tight">Secure Your Appointment</h1>
                        <p className="text-gray-500 mt-2 uppercase tracking-widest text-[10px] md:text-xs font-bold leading-relaxed">
                            Experience the difference with SalonNow at <span className="text-[#D4AF37]">{salon?.name || "Glamour Studio"}</span>
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 md:gap-16">
                    {/* LEFT COLUMN: SELECTIONS */}
                    <div className="lg:col-span-2 space-y-10 md:space-y-16">

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
                                <h2 className="text-lg md:text-xl font-serif font-bold text-[#1a1a1a]">Choose Stylist (Optional)</h2>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 md:gap-4">
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
                                            <img src={staff.avatar} alt={staff.name} className="w-12 h-12 md:w-16 md:h-16 rounded-full object-cover border-2 border-white shadow-sm" />
                                            {selectedStaff?.id === staff.id && (
                                                <div className="absolute -bottom-1 -right-1 bg-[#e65c00] p-1 rounded-full text-white">
                                                    <Check size={10} strokeWidth={4} />
                                                </div>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-gray-900 text-xs md:text-sm truncate">{staff.name}</h3>
                                        <p className="text-[10px] text-gray-400 mt-0.5 truncate">{staff.role}</p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* 3. Date & Time Section */}
                        <section className="grid md:grid-cols-2 gap-10 md:gap-8">
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">3</span>
                                    <h2 className="text-lg md:text-xl font-serif font-bold text-[#1a1a1a]">Pick a Date</h2>
                                </div>
                                <CustomCalendar 
                                    selectedDate={date} 
                                    onDateSelect={(newDate) => setDate(newDate)} 
                                />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 mb-6">
                                    <span className="bg-[#1a1a1a] text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-serif">4</span>
                                    <h2 className="text-lg md:text-xl font-serif font-bold text-[#1a1a1a]">Select Time</h2>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
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
                    <div className="lg:col-span-1 order-first lg:order-last">
                        <div className="bg-white border border-gray-100 rounded-3xl p-6 md:p-8 lg:sticky lg:top-28 shadow-sm">
                            <h2 className="text-lg font-serif font-bold text-[#1a1a1a] mb-6 border-b border-gray-50 pb-4">Booking Summary</h2>

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
                                {bookingError && (
                                    <p className="text-red-500 text-sm mb-3 text-center">{bookingError}</p>
                                )}
                                <button
                                    onClick={handleConfirm}
                                    className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-black transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                                    disabled={selectedServices.length === 0 || !date || !time || bookingLoading}
                                >
                                    {bookingLoading ? (
                                        <><Loader2 className="w-5 h-5 animate-spin" /> Confirming...</>
                                    ) : (
                                        <>Confirm Reservation <ChevronRight size={18} /></>
                                    )}
                                </button>
                                <p className="text-center text-xs text-gray-400 mt-4">
                                    Payment will be handled at the salon.
                                </p>
                            </div>
                        </div>
                    </div>

                </div>
                </div>
            </main>

            <Footer />
        </div>
    );
}