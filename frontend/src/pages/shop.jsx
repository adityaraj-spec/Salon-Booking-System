import salon1 from "../assets/salon1.jpg";
import { NavBar } from "../components/navPage";
import { Footer } from "../components/footerPage";
import { NavLink } from "react-router-dom";
import { Star, MapPin, Users, Clock, ShieldCheck, Sparkles } from "lucide-react";

export function Shop() {
    return (
        <div className="min-h-screen bg-[#fafafa] font-sans pt-20">
            <NavBar />
            
            <div className="max-w-7xl mx-auto px-6 py-10">

                {/* Title & Brand Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                             <span className="bg-orange-50 text-[#e65c00] text-xs font-bold px-2 py-1 rounded uppercase tracking-wider flex items-center gap-1">
                                <Sparkles size={12} /> Top Rated Salon
                             </span>
                        </div>
                        <h1 className="text-4xl font-serif font-bold text-[#1a1a1a]">
                            Glamour Studio Retreat
                        </h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                            <div className="flex items-center gap-1">
                                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                <span className="font-bold text-gray-900">4.9</span>
                                <span>(128 reviews)</span>
                            </div>
                            <span>•</span>
                            <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                <span>Nashik, Maharashtra</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Share</button>
                        <button className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors">Save</button>
                    </div>
                </div>

                {/* Image Gallery - Premium Style */}
                <div className="grid grid-cols-4 grid-rows-2 gap-3 mb-12 h-[500px]">
                    <div className="col-span-2 row-span-2 overflow-hidden rounded-l-2xl">
                        <img src={salon1} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon Main" />
                    </div>
                    <div className="overflow-hidden">
                        <img src={salon1} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 2" />
                    </div>
                    <div className="overflow-hidden rounded-tr-2xl">
                        <img src={salon1} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 3" />
                    </div>
                    <div className="overflow-hidden">
                        <img src={salon1} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 4" />
                    </div>
                    <div className="overflow-hidden rounded-br-2xl text-white relative">
                        <img src={salon1} className="w-full h-full object-cover hover:scale-105 transition-transform duration-700" alt="Salon 5" />
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer">
                            <span className="font-bold hover:underline">Show all photos</span>
                        </div>
                    </div>
                </div>

                {/* Main Layout */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">

                    {/* LEFT CONTENT */}
                    <div className="lg:col-span-2 space-y-10">
                        <div className="pb-8 border-b border-gray-100">
                            <h2 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-2">
                                Premium Beauty Experience in Nashik
                            </h2>
                            <p className="text-gray-500">
                                4 Senior Staff · 6 Modern Stations · Full Range of Services
                            </p>
                        </div>

                        <div className="space-y-8">
                            <div className="flex gap-4">
                                <div className="mt-1 text-[#e65c00]"><ShieldCheck size={24} /></div>
                                <div>
                                    <h3 className="font-bold text-[#1a1a1a]">Verified Professional Salon</h3>
                                    <p className="text-sm text-gray-500">This salon has passed our strict 20-point quality and hygiene check.</p>
                                </div>
                            </div>
                            <div className="flex gap-4">
                                <div className="mt-1 text-[#e65c00]"><Users size={24} /></div>
                                <div>
                                    <h3 className="font-bold text-[#1a1a1a]">Expert Staff</h3>
                                    <p className="text-sm text-gray-500">Book with specialist stylists with over 10+ years of collective experience.</p>
                                </div>
                            </div>
                        </div>

                        <div className="pt-8 border-t border-gray-100">
                             <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-4">About Glamour Studio</h3>
                             <p className="text-gray-600 leading-relaxed">
                                Welcome to Nashik's premier destination for luxury grooming and beauty. We combine traditional techniques with modern style to give you the perfect look. Our studio features state-of-the-art equipment and a relaxing atmosphere designed for your comfort.
                             </p>
                        </div>
                    </div>

                    {/* RIGHT BOOKING CARD */}
                    <div>
                        <div className="border border-gray-100 rounded-3xl shadow-sm p-8 sticky top-28 bg-white">
                            <div className="flex justify-between items-end mb-8">
                                <div>
                                    <span className="text-gray-400 text-xs uppercase font-bold tracking-wider">Starting from</span>
                                    <p className="text-3xl font-serif font-bold text-[#1a1a1a]">₹500</p>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1 text-sm font-bold text-gray-900 justify-end">
                                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" /> 4.9
                                    </div>
                                    <p className="text-xs text-gray-400">128 reviews</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="p-3 border border-gray-100 rounded-xl flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-600"><Clock size={16} /> Opening Hours</div>
                                    <span className="font-medium text-gray-900">09:00 - 21:00</span>
                                </div>
                                <div className="p-3 border border-gray-100 rounded-xl flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-gray-600"><Users size={16} /> Available Stations</div>
                                    <span className="font-medium text-gray-900">6 Slots Available</span>
                                </div>
                            </div>

                            <NavLink to="/booking" className="block">
                                <button className="w-full bg-[#1a1a1a] text-white font-bold py-4 rounded-2xl hover:bg-black transition-all active:scale-[0.98] shadow-lg shadow-black/5">
                                    Reserve Appointment
                                </button>
                            </NavLink>

                            <p className="text-center text-xs text-gray-400 mt-6 px-4">
                                Free cancellation up to 24 hours before your appointment.
                            </p>
                        </div>
                    </div>

                </div>

            </div>
            <Footer />
        </div>
    );
}