import { NavLink } from 'react-router';
import { Search, Star, MapPin, Users, Clock } from 'lucide-react';
import salon1 from "../assets/salon1.jpg";
import salon2 from "../assets/salon2.jpg";
import salon3 from "../assets/salon3.jpg";
import salon4 from "../assets/salon4.jpg";
import salon5 from "../assets/salon5.avif";

export function Shops() {
    return (
        <>
            <div className="text-center py-20 px-4">
                <h1 className="text-6xl font-serif text-gray-900 mb-2">
                    Discover Your <br />
                    <span className="text-[#D4AF37]">Perfect Salon</span>
                </h1>
                <p className="text-gray-500 text-lg mb-12 max-w-2xl mx-auto">
                    Browse curated salons near you. View real-time availability and book instantly.
                </p>

                {/* Search Bar Container */}
                <div className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-4xl mx-auto bg-white p-2 rounded-full shadow-sm border border-gray-100">
                    <div className="flex items-center flex-1 px-6 gap-3 border-r border-gray-200">
                        <Search className="text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Search salons or services..."
                            className="w-full outline-none text-gray-700 placeholder-gray-400"
                        />
                    </div>
                    <div className="flex items-center flex-1 px-6 gap-3">
                        <svg className="text-gray-400 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <input
                            type="text"
                            placeholder="City"
                            className="w-full outline-none text-gray-700 placeholder-gray-400"
                        />
                    </div>
                    <button className="bg-[#1A1A1A] text-white px-10 py-4 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-black transition-colors">
                        Search
                    </button>
                </div>
            </div>

            <div className="w-full bg-white mx-auto px-4 py-8">
                <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">

                    {/* Card 1 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop/1">
                            <img src={salon1} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" alt="Salon" />
                        </NavLink>
                        <div className="p-8 flex flex-col grow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-serif font-semibold text-gray-900">Glamour Studio</h3>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-sm text-gray-700">4.5</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-medium">Howrah, west Bengal</span>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span className="text-sm font-medium">4 seats available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium">09:00 AM - 21:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 2 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop/2">
                            <img src={salon2} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" alt="Salon" />
                        </NavLink>
                        <div className="p-8 flex flex-col grow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-serif font-semibold text-gray-900">Urban Cuts</h3>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-sm text-gray-700">4.5</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-medium">Howrah, west Bengal</span>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span className="text-sm font-medium">4 seats available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium">09:00 AM - 21:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 3 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop/3">
                            <img src={salon3} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" alt="Salon" />
                        </NavLink>
                        <div className="p-8 flex flex-col grow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-serif font-semibold text-gray-900">Serenity Spa & Salon</h3>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-sm text-gray-700">4.5</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-medium">Howrah, west Bengal</span>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span className="text-sm font-medium">4 seats available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium">09:00 AM - 21:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 4 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop/4">
                            <img src={salon4} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" alt="Salon" />
                        </NavLink>
                        <div className="p-8 flex flex-col grow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-serif font-semibold text-gray-900">Style Zone</h3>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-sm text-gray-700">4.5</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-medium">Kolkata, west Bengal</span>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span className="text-sm font-medium">4 seats available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium">09:00 AM - 21:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Card 5 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop/5">
                            <img src={salon5} className="w-full h-48 object-cover hover:scale-105 transition-transform duration-500" alt="Salon" />
                        </NavLink>
                        <div className="p-8 flex flex-col grow">
                            <div className="flex justify-between items-start mb-4">
                                <h3 className="text-2xl font-serif font-semibold text-gray-900">Royal Grooming Lounge</h3>
                                <div className="flex items-center gap-1 bg-yellow-50 px-2 py-1 rounded-lg">
                                    <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                    <span className="font-bold text-sm text-gray-700">4.5</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-gray-400 mb-4">
                                <MapPin className="w-4 h-4" />
                                <span className="text-sm font-medium">Vaishali, Bihar</span>
                            </div>
                            <div className="flex items-center justify-between pt-6 border-t border-gray-100 text-gray-600">
                                <div className="flex items-center gap-2">
                                    <Users className="w-4 h-4" />
                                    <span className="text-sm font-medium">4 seats available</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    <span className="text-sm font-medium">09:00 AM - 21:00 PM</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}