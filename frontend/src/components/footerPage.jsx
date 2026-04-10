import { motion } from 'framer-motion';
import { ArrowUp } from 'lucide-react';

export function Footer() {
    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <footer className="bg-[#111111] text-white pt-16 font-sans relative border-t border-gray-900 overflow-hidden">
            <div className="max-w-6xl mx-auto px-6 pb-16">
                <div className="grid md:grid-cols-4 gap-8">
                    {/* Column 1 */}
                    <div className="md:col-span-1">
                        <h5 className="text-xl font-bold mb-6 text-[#ff9f43] tracking-wide">
                            SalonNow
                        </h5>
                        <p className="text-sm text-gray-400 font-light leading-loose">
                            Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
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

                    {/* Column 3 */}
                    <div>
                        <h5 className="text-xl font-bold mb-6 text-white">Contact Us</h5>
                        <ul className="space-y-4">
                            <li className="text-sm text-gray-400">your location here</li>
                            <li className="text-sm text-gray-400">+12 3456789123</li>
                            <li className="text-sm text-gray-400">support@example.com</li>
                        </ul>
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
                <div className="max-w-6xl mx-auto px-6 text-center">
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
