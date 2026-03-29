import { useState, useEffect } from 'react';
import { NavLink } from 'react-router';
import { Search, Star, MapPin, Users, Clock, Loader2 } from 'lucide-react';

export function Shops() {
    const [salons, setSalons] = useState([]);
    const [city, setCity] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchSalons = async () => {
        setLoading(true);
        setError("");
        try {
            const queryParams = new URLSearchParams();
            if (city) queryParams.append("city", city);

            const response = await fetch(`http://localhost:8000/api/v1/salons?${queryParams.toString()}`);
            const data = await response.json();

            if (response.ok) {
                setSalons(data.data);
            } else {
                setError(data.message || "Failed to fetch salons");
            }
        } catch (err) {
            setError("Failed to connect to the server. Please ensure the backend is running.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSalons();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchSalons();
    };

    return (
        <div className="min-h-screen bg-[#fafafa]">
            <div className="text-center py-20 px-4">
                <h1 className="text-6xl font-serif text-gray-900 mb-2">
                    Discover Your <br />
                    <span className="text-[#D4AF37]">Perfect Salon</span>
                </h1>
                <p className="text-gray-500 text-lg mb-12 max-w-2xl mx-auto">
                    Browse curated salons near you. View real-time availability and book instantly.
                </p>

                {/* Search Bar Container */}
                <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center justify-center gap-4 max-w-2xl mx-auto bg-white p-2 rounded-full shadow-sm border border-gray-100">
                    <div className="flex items-center flex-1 px-6 gap-3">
                        <MapPin className="text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="City"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            className="w-full outline-none text-gray-700 placeholder-gray-400"
                        />
                    </div>
                    <button type="submit" className="bg-[#1A1A1A] text-white px-10 py-4 rounded-full font-bold uppercase text-xs tracking-widest hover:bg-black transition-colors disabled:opacity-70">
                        {loading ? <Loader2 className="w-4 h-4 animate-spin inline mr-2" /> : "Search"}
                    </button>
                </form>
            </div>

            <div className="w-full bg-white mx-auto px-4 py-8 min-h-[400px]">
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="w-12 h-12 text-[#D4AF37] animate-spin mb-4" />
                        <p className="text-gray-500 animate-pulse">Finding the best salons for you...</p>
                    </div>
                ) : error ? (
                    <div className="text-center py-20">
                        <p className="text-red-500 mb-4">{error}</p>
                        <button onClick={fetchSalons} className="text-[#D4AF37] font-bold border-b-2 border-[#D4AF37] hover:text-[#B48F27] transition-colors">
                            Try Again
                        </button>
                    </div>
                ) : salons.length === 0 ? (
                    <div className="text-center py-20">
                        <div className="bg-gray-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Search className="text-gray-300 w-10 h-10" />
                        </div>
                        <h3 className="text-2xl font-serif font-bold text-gray-900 mb-2">No Salons Found</h3>
                        <p className="text-gray-500">We couldn't find any salons matching your search criteria.</p>
                        <button 
                            onClick={() => {setCity(""); fetchSalons();}} 
                            className="mt-6 text-[#D4AF37] font-bold hover:text-[#B48F27] transition-colors"
                        >
                            Clear Filters
                        </button>
                    </div>
                ) : (
                    <div className="w-full grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 justify-items-center">
                        {salons.map((salon) => (
                            <div key={salon._id} className="w-full bg-white shadow-md rounded-2xl overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1">
                                <NavLink to={`/shop/${salon._id}`} className="block">
                                    <div className="relative h-56 overflow-hidden">
                                        <img 
                                            src={salon.images && salon.images.length > 0 ? salon.images[0] : "https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=400&q=80"} 
                                            className="w-full h-full object-cover hover:scale-110 transition-transform duration-700" 
                                            alt={salon.name} 
                                        />
                                        <div className="absolute top-4 right-4 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-full shadow-sm">
                                            <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                                            <span className="font-bold text-xs text-gray-800">{salon.rating || "NEW"}</span>
                                        </div>
                                    </div>
                                    
                                    <div className="p-6">
                                        <h3 className="text-xl font-serif font-bold text-gray-900 mb-2 truncate group-hover:text-[#D4AF37] transition-colors">{salon.name}</h3>
                                        <div className="flex items-center gap-2 text-gray-400 mb-4">
                                            <MapPin className="w-4 h-4" />
                                            <span className="text-sm font-medium">{salon.city}</span>
                                        </div>
                                        
                                        <p className="text-gray-400 text-xs mb-6 line-clamp-2 h-8">
                                            {salon.description || "Premium beauty and grooming services."}
                                        </p>

                                        <div className="flex items-center justify-between pt-5 border-t border-gray-50 text-gray-600">
                                            <div className="flex items-center gap-1.5">
                                                <Users className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-medium">Available</span>
                                            </div>
                                            <div className="flex items-center gap-1.5">
                                                <Clock className="w-4 h-4 text-gray-400" />
                                                <span className="text-xs font-medium">
                                                    {salon.openingHours || "9:00 AM"} - {salon.closingHours || "9:00 PM"}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </NavLink>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}