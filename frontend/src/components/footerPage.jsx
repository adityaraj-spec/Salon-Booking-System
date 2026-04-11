import { motion } from 'framer-motion';
import { ArrowUp, Instagram, Twitter, Facebook, Mail, Phone } from 'lucide-react';

export function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-[#111111] text-white pt-16 font-sans relative border-t border-gray-900 overflow-hidden">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pb-16">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* Column 1 */}
                    <div className="md:col-span-1">
                        <h5 className="text-xl font-bold mb-6 text-[#ff9f43] tracking-wide">
                            SalonNow
                        </h5>
                        <p className="text-sm text-gray-400 font-light leading-loose">
                            SalonNow is a mobile application designed to connect customers with beauty and wellness providers for last-minute appointments. Unlike traditional booking systems that schedule days or weeks in advance, this platform focuses on filling immediate service gaps.
                        </p>
                    </div>

                    {/* Column 2 */}
                    <div>
                        <h5 className="text-xl font-bold mb-6 text-white">Our Link</h5>
                        <ul className="space-y-4">
                            <li><a href="#" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">About Us</a></li>
                            <li><a href="#" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">Services</a></li>
                            <li><a href="#" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">FAQ</a></li>
                            <li><a href="#" className="text-sm text-gray-400 hover:text-[#ff9f43] transition-colors">Blog</a></li>
                        </ul>
                    </div>

                    <div>
                        <h5 className="text-xl font-bold mb-6 text-white">Connect With Us</h5>
                        <div className="flex items-center gap-4 mb-8">
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:text-[#ff9f43] hover:bg-black transition-all border border-gray-800">
                                <Instagram size={20} />
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:text-[#ff9f43] hover:bg-black transition-all border border-gray-800">
                                <svg viewBox="0 0 24 24" aria-hidden="true" className="w-5 h-5 fill-current"><g><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.25h-6.657l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"></path></g></svg>
                            </a>
                            <a href="#" className="w-10 h-10 rounded-full bg-gray-900 flex items-center justify-center text-gray-400 hover:text-[#ff9f43] hover:bg-black transition-all border border-gray-800">
                                <Facebook size={20} />
                            </a>
                        </div>
                        
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Mail size={16} className="text-[#ff9f43]" />
                                <span>{import.meta.env.VITE_EMAIL || 'support@salonnow.com'}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-400">
                                <Phone size={16} className="text-[#ff9f43]" />
                                <span>{import.meta.env.VITE_PHONE || '+91 98765 43210'}</span>
                            </div>
                        </div>
                    </div>

                    {/* Column 4 */}
                    <div>
                        <h5 className="text-xl font-bold mb-6 text-white">Our Gallery</h5>
                        <div className="grid grid-cols-2 gap-2">
                            <img src="https://images.unsplash.com/photo-1599351431202-1e0f0137899a?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Gallery 1" className="w-full h-16 object-cover rounded shadow-sm" />
                            <img src="https://images.unsplash.com/photo-1585747860715-2ba37e788b70?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Gallery 2" className="w-full h-16 object-cover rounded shadow-sm" />
                            <img src="https://images.unsplash.com/photo-1503951914875-452162b0f3f1?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Gallery 3" className="w-full h-16 object-cover rounded shadow-sm" />
                            <img src="https://images.unsplash.com/photo-1622286342621-4bd786c2447c?ixlib=rb-4.0.3&auto=format&fit=crop&w=150&q=80" alt="Gallery 4" className="w-full h-16 object-cover rounded shadow-sm" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Bottom Bar */}
            <div className="bg-[#ff9f43] py-4 relative">
                <div className="max-w-[1280px] mx-auto px-6 md:px-10 text-center">
                    <p className="text-white text-sm font-medium">
                        SalonNow. All Rights Reserved.
                    </p>
                </div>
                {/* Scroll to Top Button */}
                <button 
                    onClick={scrollToTop}
                    className="absolute right-6 -top-5 w-10 h-10 bg-[#ff9f43] border border-white/20 rounded-full flex items-center justify-center text-white shadow-lg hover:bg-orange-500 transition-colors z-10"
                >
                    <ArrowUp size={20} strokeWidth={2.5} />
                </button>
            </div>
        </footer>
    );
}
