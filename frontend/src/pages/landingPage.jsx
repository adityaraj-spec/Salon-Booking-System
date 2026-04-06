import { NavBar } from '../components/navPage.jsx';
import { NavLink } from 'react-router';
import { Calendar, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

export function LandingPage() {
    return (
        <div className="min-h-screen bg-[#fafafa] font-sans pt-16">
            <NavBar />

            {/* HERO SECTION */}
            <section className="relative h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center">
                {/* Background Image with Dark Overlay */}
                <div
                    className="absolute inset-0 z-0 bg-cover bg-center"
                    style={{ backgroundImage: "url('https://images.unsplash.com/photo-1560066984-138dadb4c035?ixlib=rb-4.0.3&auto=format&fit=crop&w=1920&q=80')" }}
                >
                    <div className="absolute inset-0 bg-black/65"></div>
                </div>

                {/* Content */}
                <div className="relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center pt-16">
                    <h1 className="text-4xl md:text-7xl font-serif font-bold text-white mb-6 leading-tight">
                        Your Beauty,<br />
                        <span className="text-[#e65c00]">Our Priority</span>
                    </h1>
                    <p className="text-lg md:text-xl text-gray-200 mb-10 max-w-2xl font-light">
                        Discover and book appointments with top-rated salons in your city.<br className="hidden md:block" /> Professional beauty services at your fingertips.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-5">
                        <NavLink to="/home" className="bg-white text-black px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                            Browse Salons <ArrowRight size={18} />
                        </NavLink>
                        <NavLink to="/signup" className="border border-white/80 text-white px-8 py-4 rounded-full font-medium hover:bg-white/10 transition-colors">
                            Sign Up Now
                        </NavLink>
                    </div>
                </div>
            </section>

            {/* WHY CHOOSE US SECTION */}
            <section className="py-24 bg-white px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">Why Choose SalonNow?</h2>
                        <p className="text-gray-500 text-lg">We make salon booking simple, secure, and convenient.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="bg-[#fafafa] border border-gray-100/50 p-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#e65c00] mb-6">
                                <Calendar size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-3">Easy Booking</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">Book your appointment in just a few clicks with our intuitive booking system.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-[#fafafa] border border-gray-100/50 p-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#e65c00] mb-6">
                                <ShieldCheck size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-3">Verified Salons</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">All salons are verified and approved to ensure quality service.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-[#fafafa] border border-gray-100/50 p-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#e65c00] mb-6">
                                <Sparkles size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-3">Premium Services</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">Access to premium beauty services at competitive prices.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS SECTION */}
            <section className="py-24 bg-white px-6 border-t border-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-20">
                        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a]">How It Works</h2>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                        <div>
                            <div className="text-6xl font-serif text-[#ffe0cc] font-bold mb-4">01</div>
                            <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 font-serif">Browse Salons</h3>
                            <p className="text-gray-500 text-sm">Explore verified salons near you</p>
                        </div>
                        <div>
                            <div className="text-6xl font-serif text-[#ffe0cc] font-bold mb-4">02</div>
                            <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 font-serif">Choose Service</h3>
                            <p className="text-gray-500 text-sm">Select from a range of services</p>
                        </div>
                        <div>
                            <div className="text-6xl font-serif text-[#ffe0cc] font-bold mb-4">03</div>
                            <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 font-serif">Book & Pay</h3>
                            <p className="text-gray-500 text-sm">Secure online booking & payment</p>
                        </div>
                        <div>
                            <div className="text-6xl font-serif text-[#ffe0cc] font-bold mb-4">04</div>
                            <h3 className="text-lg font-bold text-[#1a1a1a] mb-2 font-serif">Enjoy Service</h3>
                            <p className="text-gray-500 text-sm">Visit salon and enjoy your service</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* READY TO GET STARTED CTA */}
            <section className="py-32 bg-[#1f1e1d] px-6 text-center">
                <div className="max-w-3xl mx-auto flex flex-col items-center">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
                        Ready to Get Started?
                    </h2>
                    <p className="text-gray-300 text-lg mb-10 font-light">
                        Join thousands of satisfied customers who book their beauty appointments with us.
                    </p>
                    <NavLink to="/home" className="bg-white text-black px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                        Start Booking Now
                    </NavLink>
                </div>
            </section>
        </div>
    );
}
