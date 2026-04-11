import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, Calendar, ShieldCheck, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from "../context/UIContext";

const heroImages = [
    { url: "/adam-winger-KVVjmb3IIL8-unsplash.jpg", isDark: true },
    { url: "/benyamin-bohlouli-_C-S7LqxHPw-unsplash.jpg", isDark: false },
    { url: "/greg-trowman-jsuWg7IXx1k-unsplash.jpg", isDark: true },
    { url: "/guilherme-petri-PtOfbGkU3uI-unsplash.jpg", isDark: false }
];

export function LandingPage() {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const { setNavbarTheme } = useUI();

    const currentHero = heroImages[currentImageIndex];
    const isDark = currentHero.isDark;

    useEffect(() => {
        setNavbarTheme(isDark ? 'dark' : 'light');
    }, [isDark, setNavbarTheme]);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
        }, 6000); // Slightly longer interval for premium feel
        return () => clearInterval(interval);
    }, []);

    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans">
            {/* HERO SECTION */}
            <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden transition-colors duration-1000">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={currentHero.url}
                        initial={{ x: "100%", opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: "-100%", opacity: 0 }}
                        transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${currentHero.url}')` }}
                    >
                        {/* Slide-specific Overlays */}
                        <div className={`absolute inset-0 transition-opacity duration-1000 ${currentHero.isDark ? 'bg-black/40' : 'bg-white/20'}`}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
                    </motion.div>
                </AnimatePresence>

                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center pt-8"
                >
                    <motion.h1
                        variants={fadeUpVariants}
                        className={`text-5xl md:text-7xl font-bold mb-6 leading-tight transition-colors duration-1000 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                        Your Beauty,<br />
                        <span className="text-[#ff9f43]">Our Priority</span>
                    </motion.h1>
                    <motion.p
                        variants={fadeUpVariants}
                        className={`text-lg md:text-xl mb-6 max-w-2xl font-light transition-colors duration-1000 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                    >
                        Discover and book appointments with top-rated salons in your city.<br className="hidden md:block" /> Professional beauty services at your fingertips.
                    </motion.p>
                    <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-5">
                        <NavLink
                            to="/home"
                            className={`px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'
                                }`}
                        >
                            Browse Salons <ArrowRight size={18} />
                        </NavLink>
                        <NavLink
                            to="/signup"
                            className={`px-8 py-4 rounded-full font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 border ${isDark
                                ? 'border-white/80 text-white hover:bg-white/10'
                                : 'border-black/80 text-black hover:bg-black/5'
                                }`}
                        >
                            Sign Up Now
                        </NavLink>
                    </motion.div>
                </motion.div>
            </section>

            {/* WHY CHOOSE US SECTION */}
            <section className="py-16 bg-white px-6">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-10">
                        <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">Why Choose SalonNow?</h2>
                        <p className="text-gray-500 text-lg">We make salon booking simple, secure, and convenient.</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Card 1 */}
                        <div className="bg-[#fafafa] border border-gray-100/50 p-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#ff9f43] mb-6">
                                <Calendar size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-3">Easy Booking</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">Book your appointment in just a few clicks with our intuitive booking system.</p>
                        </div>

                        {/* Card 2 */}
                        <div className="bg-[#fafafa] border border-gray-100/50 p-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#ff9f43] mb-6">
                                <ShieldCheck size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-3">Verified Salons</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">All salons are verified and approved to ensure quality service.</p>
                        </div>

                        {/* Card 3 */}
                        <div className="bg-[#fafafa] border border-gray-100/50 p-10 rounded-3xl shadow-sm hover:shadow-md transition-shadow">
                            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center text-[#ff9f43] mb-6">
                                <Sparkles size={24} strokeWidth={1.5} />
                            </div>
                            <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-3">Premium Services</h3>
                            <p className="text-gray-500 leading-relaxed text-sm">Access to premium beauty services at competitive prices.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* HOW IT WORKS SECTION */}
            <section className="py-16 bg-white px-6 border-t border-gray-50">
                <div className="max-w-6xl mx-auto">
                    <div className="text-center mb-12">
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
            <section className="py-20 bg-[#1f1e1d] px-6 text-center">
                <div className="max-w-3xl mx-auto flex flex-col items-center">
                    <h2 className="text-4xl md:text-5xl font-serif font-bold text-white mb-6">
                        Ready to Get Started?
                    </h2>
                    <p className="text-gray-300 text-lg mb-8 font-light">
                        Join thousands of satisfied customers who book their beauty appointments with us.
                    </p>
                    <NavLink to="/home" className="bg-white text-black px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-gray-100 transition-colors">
                        Start Booking Now <ArrowRight size={18} />
                    </NavLink>
                </div>
            </section>
        </div>
    );
}
