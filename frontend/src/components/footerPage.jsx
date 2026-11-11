import { Link } from "react-router-dom";
import salonLogo from "/logo.jpg";
import { ArrowUp, Instagram, Mail, Phone } from 'lucide-react';

export function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const contactEmail = import.meta.env.VITE_EMAIL || "support@salonnow.in";
    const contactPhone = import.meta.env.VITE_PHONE || "+91 98765 43210";
    const telLink = `tel:${contactPhone.replace(/\s+/g, '')}`;

    return (
        <footer className="bg-[#111111] text-white pt-16 font-sans relative border-t border-gray-900 overflow-hidden">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pb-16">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* Column 1: Brand & Bio */}
                    <div className="md:col-span-1">
                        <Link to="/" className="inline-flex items-center gap-3 mb-6 group">
                            <img src={salonLogo} alt="SalonNow" className="w-10 h-10 rounded-full object-cover border border-[#D4AF37]/40 group-hover:scale-105 transition-transform" />
                            <h3 className="text-xl font-semibold text-[#ff9f43] tracking-wide">SalonNow</h3>
                        </Link>
                        <p className="text-sm text-gray-400 font-normal leading-relaxed">
                            SalonNow connects customers with beauty and wellness providers for scheduled and last-minute appointments with guaranteed seats and verified salon quality.
                        </p>
                    </div>

                    {/* Column 2: Navigation Links */}
                    <div>
                        <h3 className="text-xl font-semibold mb-6 text-white">Quick Links</h3>
                        <ul className="space-y-4">
                            <li><Link to="/home" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">Discover Salons</Link></li>
                            <li><Link to="/favorites" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">Saved Salons</Link></li>
                            <li><Link to="/bookings" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">My Appointments</Link></li>
                            <li><Link to="/signup" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">Register as Partner</Link></li>
                        </ul>
                    </div>

                    {/* Column 3: Contact & Social */}
                    <div>
                        <h3 className="text-xl font-semibold mb-6 text-white">Connect With Us</h3>
                        <div className="flex items-center gap-4 mb-8">
                            <a aria-label="SalonNow on Instagram" href="https://www.instagram.com/aaditya_raj_2310?igsh=enRtZmpvN3RnZTV4" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:text-[#ff9f43] hover:bg-black transition-all border border-gray-800">
                                <Instagram size={20} />
                            </a>
                            <a aria-label="SalonNow on X" href="https://x.com/Aaditya_raj_70?t=qvI4FEr3TKf1D2lPsHRWow&s=09" target="_blank" rel="noopener noreferrer" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:text-[#ff9f43] hover:bg-black transition-all border border-gray-800">
                                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.25h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
                            </a>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <a 
                                    href={`mailto:${contactEmail}`}
                                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#ff9f43] transition-colors group"
                                    title="Send us an email"
                                >
                                    <Mail size={16} className="text-[#ff9f43] shrink-0 group-hover:scale-110 transition-transform" />
                                    <span className="truncate max-w-[220px]">{contactEmail}</span>
                                </a>
                            </div>
                            <div>
                                <a 
                                    href={telLink}
                                    className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-[#ff9f43] transition-colors group"
                                    title="Call SalonNow customer care"
                                >
                                    <Phone size={16} className="text-[#ff9f43] shrink-0 group-hover:scale-110 transition-transform" />
                                    <span>{contactPhone}</span>
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Column 4: Gallery */}
                    <div>
                        <h3 className="text-xl font-semibold mb-6 text-white">Our Gallery</h3>
                        <div className="grid grid-cols-2 gap-2.5">
                            <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Studio ambiance 1" className="w-full h-20 aspect-square object-cover rounded-xl shadow-sm hover:scale-105 transition-transform duration-300 border border-gray-800" />
                            <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Studio ambiance 2" className="w-full h-20 aspect-square object-cover rounded-xl shadow-sm hover:scale-105 transition-transform duration-300 border border-gray-800" />
                            <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Studio ambiance 3" className="w-full h-20 aspect-square object-cover rounded-xl shadow-sm hover:scale-105 transition-transform duration-300 border border-gray-800" />
                            <img src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?ixlib=rb-4.0.3&auto=format&fit=crop&w=300&q=80" alt="Studio ambiance 4" className="w-full h-20 aspect-square object-cover rounded-xl shadow-sm hover:scale-105 transition-transform duration-300 border border-gray-800" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-[#ff9f43] py-4 relative">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 text-center">
                    <p className="text-white text-sm font-medium">
                        &copy; {new Date().getFullYear()} SalonNow. All Rights Reserved.
                    </p>
                </div>
                {/* Scroll to Top Button */}
                <button aria-label="Scroll to top"
                    onClick={scrollToTop}
                    className="absolute right-6 -top-5 w-10 h-10 bg-[#ff9f43] border border-white/20 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-orange-500 transition-colors z-10"
                >
                    <ArrowUp size={20} strokeWidth={2.5} />
                </button>
            </div>
        </footer>
    );
}
