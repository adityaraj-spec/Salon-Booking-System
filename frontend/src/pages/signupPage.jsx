import { useState } from "react";
import { Scissors, Eye, EyeOff } from "lucide-react";
import { Link } from "react-router-dom";

export function SignUpPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    return (
        <div className="min-h-screen grid md:grid-cols-2 bg-white font-sans">
            {/* LEFT SIDE: FORM */}
            <div className="flex flex-col justify-center items-center px-6 py-10 overflow-y-auto">
                <div className="w-full max-w-md mt-4 mb-4">
                    {/* Logo Section */}
                    <div className="flex justify-center items-center space-x-2 mb-8 mt-4">
                        <div className="bg-[#1a1a1a] p-2 rounded-full text-white">
                            <Scissors size={24} />
                        </div>
                        <h1 className="text-2xl font-serif font-bold text-black tracking-wide">Salon<span className="text-[#D4AF37]">Now</span></h1>
                    </div>

                    {/* Titles */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">Create Account</h2>
                        <p className="text-gray-500 text-sm">Join us to book your beauty appointments</p>
                    </div>

                    <form
                        action="/signup"
                        method="POST"
                        className="space-y-4"
                        encType="multipart/form-data"
                    >
                        {/* Full Name */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Full Name</label>
                            <input
                                name="fullName"
                                type="text"
                                placeholder="John Doe"
                                required
                                className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                            />
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Username</label>
                            <input
                                name="username"
                                type="text"
                                placeholder="johndoe123"
                                required
                                className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="your.email@example.com"
                                required
                                className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                            />
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Phone</label>
                            <input
                                name="phone"
                                type="text"
                                placeholder="+91 98765 43210"
                                className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                            />
                        </div>

                        {/* Account Type / Role */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Account Type</label>
                            <select
                                name="role"
                                className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 bg-white transition-colors appearance-none"
                            >
                                <option value="customer">Customer</option>
                                <option value="staff">Staff</option>
                                <option value="salonOwner">Salon Owner</option>
                            </select>
                        </div>

                        {/* Avatar */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Avatar</label>
                            <input
                                name="avatar"
                                type="file"
                                className="w-full border border-gray-200 rounded-lg p-2 text-gray-600 file:mr-4 file:py-2 file:px-4 file:border-0 file:text-sm file:font-medium file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 cursor-pointer"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Create a strong password"
                                    required
                                    className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Password Confirm */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="Re-enter your password"
                                    className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-3 flex items-center text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Sign Up Button */}
                        <button
                            type="submit"
                            className="w-full bg-[#1a1a1a] hover:bg-black text-white font-medium py-3.5 rounded-full transition-colors mt-6"
                        >
                            Sign Up
                        </button>

                        <div className="text-center mt-6 text-sm text-gray-500">
                            Already have an account? <Link to="/login" className="text-[#e65c00] hover:text-[#cc5200] font-medium transition-colors">Login</Link>
                        </div>
                    </form>
                </div>
            </div>

            {/* RIGHT SIDE: IMAGE */}
            <div className="hidden md:block relative bg-gray-100">
                <img
                    src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                    alt="Facial Treatment"
                    className="absolute inset-0 h-full w-full object-cover"
                />
            </div>
        </div>
    );
}