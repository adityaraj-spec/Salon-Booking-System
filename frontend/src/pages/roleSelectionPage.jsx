import { useState } from "react";
import { User, Store, Scissors, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

export function RoleSelectionPage() {
    const [loading, setLoading] = useState(null); // 'customer' or 'salonOwner'
    const navigate = useNavigate();
    const { updateUserRole } = useAuth();
    const { showNotification } = useNotification();

    const handleRoleSelect = async (role) => {
        setLoading(role);
        try {
            const response = await axiosInstance.patch("/users/update-role", { role }, {
                withCredentials: true,
            });

            if (response.status === 200 || response.status === 201) {
                updateUserRole(role);
                showNotification(`Role updated to ${role === 'salonOwner' ? 'Salon Owner' : 'Customer'}!`, "success");
                
                if (role === 'salonOwner') {
                    navigate("/create-salon");
                } else {
                    navigate("/home");
                }
            }
        } catch (error) {
            console.error("Role update failed:", error);
            showNotification(error.response?.data?.message || "Something went wrong while setting your role.", "error");
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="flex flex-col items-center justify-center px-6 py-12 w-full h-full min-h-[80vh]">

            <div className="max-w-4xl w-full">
                {/* Logo */}
                <div className="flex justify-center items-center space-x-2 mb-12">
                    <div className="bg-[#1a1a1a] p-2 rounded-full text-white">
                        <Scissors size={24} />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-black tracking-wide">
                        Salon<span className="text-[#D4AF37]">Now</span>
                    </h1>
                </div>

                <div className="text-center mb-12">
                    <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-4">How will you use SalonNow?</h2>
                    <p className="text-gray-600 text-lg">Choose the account type that best fits your needs.</p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 mt-8">
                    {/* Customer Option */}
                    <button
                        onClick={() => handleRoleSelect("customer")}
                        disabled={loading !== null}
                        className={`group relative bg-white p-10 rounded-3xl shadow-sm border-2 transition-all duration-300 text-left flex flex-col h-full ${
                            loading === "customer" ? "border-[#D4AF37] scale-95" : "border-transparent hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1"
                        }`}
                    >
                        <div className="bg-blue-50 text-blue-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors duration-300">
                            <User size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">I'm a Customer</h3>
                        <p className="text-gray-500 mb-8 flex-grow">Book appointments, discover new salons, and manage your beauty routine with ease.</p>
                        <div className="flex items-center text-[#1a1a1a] font-semibold group-hover:text-[#D4AF37] transition-colors">
                            <span>Get Started</span>
                            <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>

                    {/* Salon Owner Option */}
                    <button
                        onClick={() => handleRoleSelect("salonOwner")}
                        disabled={loading !== null}
                        className={`group relative bg-white p-10 rounded-3xl shadow-sm border-2 transition-all duration-300 text-left flex flex-col h-full ${
                            loading === "salonOwner" ? "border-[#D4AF37] scale-95" : "border-transparent hover:border-[#D4AF37] hover:shadow-xl hover:-translate-y-1"
                        }`}
                    >
                        <div className="bg-orange-50 text-orange-600 p-4 rounded-2xl w-fit mb-6 group-hover:bg-orange-600 group-hover:text-white transition-colors duration-300">
                            <Store size={32} />
                        </div>
                        <h3 className="text-2xl font-bold text-[#1a1a1a] mb-3">I'm a Salon Owner</h3>
                        <p className="text-gray-500 mb-8 flex-grow">Register your salon, manage staff, accept bookings, and grow your beauty business.</p>
                        <div className="flex items-center text-[#1a1a1a] font-semibold group-hover:text-[#D4AF37] transition-colors">
                            <span>Register Your Salon</span>
                            <ArrowRight size={20} className="ml-2 transform group-hover:translate-x-1 transition-transform" />
                        </div>
                    </button>
                </div>

                {loading && (
                    <div className="mt-8 text-center text-gray-500 animate-pulse">
                        Setting up your account...
                    </div>
                )}
            </div>
        </div>
    );
}
