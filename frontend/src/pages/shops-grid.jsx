import { NavLink } from 'react-router';
import salon1 from "../assets/salon1.jpg";
import salon2 from "../assets/salon2.jpg";
import salon3 from "../assets/salon3.jpg";
import salon4 from "../assets/salon4.jpg";
import salon5 from "../assets/salon5.avif";

export function Shops() {
    return (
        <>
            <div className="w-full bg-white max-w-7xl mx-auto px-4 py-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 justify-items-center">

                    {/* Card 1 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop">
                            <img src={salon1} className="w-full h-48 object-cover" alt="Salon" />
                            <div className="p-4">
                                <p className="text-gray-600 text-sm">
                                    Some quick example text to build on the card title and make up the bulk of the card’s content.
                                </p>
                            </div>
                        </NavLink>
                    </div>

                    {/* Card 2 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop">
                            <img src={salon2} className="w-full h-48 object-cover" alt="Salon" />
                            <div className="p-4">
                                <p className="text-gray-600 text-sm">
                                    Some quick example text to build on the card title and make up the bulk of the card’s content.
                                </p>
                            </div>
                        </NavLink>
                    </div>

                    {/* Card 3 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop">
                            <img src={salon3} className="w-full h-48 object-cover" alt="Salon" />
                            <div className="p-4">
                                <p className="text-gray-600 text-sm">
                                    Some quick example text to build on the card title and make up the bulk of the card’s content.
                                </p>
                            </div>
                        </NavLink>
                    </div>

                    {/* Card 4 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop">
                            <img src={salon4} className="w-full h-48 object-cover" alt="Salon" />
                            <div className="p-4">
                                <p className="text-gray-600 text-sm">
                                    Some quick example text to build on the card title and make up the bulk of the card’s content.
                                </p>
                            </div>
                        </NavLink>
                    </div>

                    {/* Card 5 */}
                    <div className="w-full max-w-xs bg-white shadow-md rounded-xl overflow-hidden hover:shadow-lg transition">
                        <NavLink to="/shop">
                            <img src={salon5} className="w-full h-48 object-cover" alt="Salon" />
                            <div className="p-4">
                                <p className="text-gray-600 text-sm">
                                    Some quick example text to build on the card title and make up the bulk of the card’s content.
                                </p>
                            </div>
                        </NavLink>
                    </div>
                </div>
            </div>
        </>
    );
}