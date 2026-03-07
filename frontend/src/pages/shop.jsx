import salon1 from "../assets/salon1.jpg";
import { NavBar } from "../components/navPage";
import { Footer } from "../components/footerPage";
import { NavLink } from "react-router-dom";

export function Shop() {
    return (
        <>
            <NavBar />
            <div className="max-w-7xl mx-auto px-6 py-6">

                {/* Title */}
                <h1 className="text-black text-3xl font-semibold mb-4">
                    Nashik City Center Retreat Apt.
                </h1>

                {/* Image Gallery */}
                <div className="grid grid-cols-4 gap-2 mb-8">

                    <img
                        src={salon1}
                        className="col-span-2 row-span-2 w-full h-full object-cover rounded-l-xl"
                    />

                    <img src={salon1} className="w-full h-full object-cover" />
                    <img src={salon1} className="w-full h-full object-cover rounded-tr-xl" />
                    <img src={salon1} className="w-full h-full object-cover" />
                    <img src={salon1} className="w-full h-full object-cover rounded-br-xl" />

                </div>

                {/* Main Layout */}
                <div className="grid grid-cols-3 gap-12">

                    {/* LEFT CONTENT */}
                    <div className="col-span-2">

                        <h2 className="text-black text-xl font-semibold">
                            Entire apartment in Nashik, India
                        </h2>

                        <p className="text-gray-500 mb-6">
                            4 Staffs · 4 chairs · 5 services
                        </p>
                    </div>

                    {/* RIGHT BOOKING CARD */}
                    <div>

                        <div className="border rounded-xl shadow-lg p-6 sticky top-20">

                            <h3 className="text-xl font-semibold mb-4">
                                ₹5,421 <span className="text-gray-500 text-sm">for 2 nights</span>
                            </h3>

                            {/* Check in */}
                            <div className="border rounded-lg mb-3">

                                <div className="grid grid-cols-2 border-b">

                                    <div className="p-3">
                                        <p className="text-black text-xs font-semibold">CHECK-IN</p>
                                        <p>3/13/2026</p>
                                    </div>

                                    <div className="p-3 border-l">
                                        <p className="text-black text-xs font-semibold">CHECKOUT</p>
                                        <p>3/15/2026</p>
                                    </div>

                                </div>

                                <div className="p-3">
                                    <p className="text-black text-xs font-semibold">GUESTS</p>
                                    <p>1 guest</p>
                                </div>

                            </div>
                            <NavLink to="/booking">
                                <button className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-full">
                                    Booking
                                </button>
                            </NavLink>

                            <p className="text-center text-sm text-gray-500 mt-3">
                                You won't be charged yet
                            </p>

                        </div>

                    </div>

                </div>

            </div>
            <Footer />
        </>
    );
}