export function Footer() {
    return (
        <>
            <footer className="bg-gray-900 text-white py-8 mt-auto">
                <div className="max-w-6xl mx-auto px-4">

                    <div className="grid md:grid-cols-3 gap-8">

                        {/* Column 1 */}
                        <div>
                            <h5 className="text-lg font-semibold mb-2">Salon<span className="text-[#D4AF37]">Now</span></h5>
                            <p className="text-sm text-gray-300">
                                We make salon booking simple, secure, and convenient.
                            </p>
                        </div>

                        {/* Column 2 */}
                        <div>
                            <ul className="space-y-2">
                                <li>
                                    <a href="#" className="text-gray-300 hover:text-white transition">
                                        Home
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-300 hover:text-white transition">
                                        About
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-300 hover:text-white transition">
                                        Services
                                    </a>
                                </li>
                                <li>
                                    <a href="#" className="text-gray-300 hover:text-white transition">
                                        Contact
                                    </a>
                                </li>
                            </ul>
                        </div>

                        {/* Column 3 */}
                        <div>
                            <h5 className="text-lg font-semibold mb-2">Contact</h5>
                            <p className="text-sm text-gray-300">Email: support@example.com</p>
                            <p className="text-sm text-gray-300">Phone: +91 9876543210</p>
                            <p className="text-sm text-gray-300">Location: India</p>
                        </div>

                    </div>

                    {/* Divider */}
                    <hr className="border-gray-700 my-6" />

                    {/* Copyright */}
                    <div className="text-center">
                        <p className="text-sm text-gray-400">
                            &copy; {new Date().getFullYear()} Salon Now. All rights reserved.
                        </p>
                    </div>

                </div>
            </footer>
        </>
    );
}
