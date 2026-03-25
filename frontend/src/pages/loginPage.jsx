import { useState } from "react";
import { Scissors, Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

export function LoginPage() {
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formData = new FormData(e.target);
        const email = formData.get("email");
        const password = formData.get("password");

        try {
            const response = await fetch("http://localhost:8000/api/v1/users/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, password }),
                credentials: "include",
            });

            const data = await response.json();

            if (response.ok) {
                // If user already has a role, we could redirect to home, 
                // but let's go to role-selection to ensure consistency as requested
                navigate("/role-selection");
            } else {
                setError(data.message || "Login failed");
            }
        } catch (err) {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid md:grid-cols-2 bg-white font-sans">
            {/* LEFT SIDE: FORM */}
            <div className="flex flex-col justify-center items-center px-6 py-10 overflow-y-auto">
                <div className="w-full max-w-sm">
                    {/* Logo Section */}
                    <div className="flex justify-center items-center space-x-2 mb-8">
                        <div className="bg-[#1a1a1a] p-2 rounded-full text-white">
                            <Scissors size={24} />
                        </div>
                        <h1 className="text-2xl font-serif font-bold text-black tracking-wide">Salon<span className="text-[#D4AF37]">Now</span></h1>
                    </div>

                    {/* Titles */}
                    <div className="text-center mb-8">
                        <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">Welcome Back</h2>
                        <p className="text-gray-500 text-sm">Login to your account to continue</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Email</label>
                            <input
                                name="email"
                                type="email"
                                required
                                placeholder="Enter your email"
                                className="w-full border border-gray-200 rounded-lg p-3 text-gray-800 placeholder-gray-400 focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm text-gray-700 mb-1">Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    required
                                    placeholder="Enter your password"
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

                        {/* Forgot Password */}
                        <div className="flex justify-start pt-1 pb-2">
                            <a href="#" className="text-sm text-[#e65c00] hover:text-[#cc5200] font-medium transition-colors">
                                Forgot password?
                            </a>
                        </div>

                        {/* Login Button */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#1a1a1a] hover:bg-black text-white font-medium py-3.5 rounded-full transition-colors mt-2 disabled:opacity-50"
                        >
                            {loading ? "Logging in..." : "Login"}
                        </button>

                        <div className="text-center mt-6 text-sm text-gray-500">
                            Don't have an account? <Link to="/signup" className="text-[#e65c00] hover:text-[#cc5200] font-medium transition-colors">Sign up</Link>
                        </div>

                        <div className="text-center mt-8 text-xs text-gray-400">
                            <Link to="/" className="hover:text-gray-600 transition-colors">&larr; Back to Home</Link>
                        </div>
                    </form>
                </div>
            </div>

            {/* RIGHT SIDE: IMAGE */}
            <div className="hidden md:block relative bg-gray-100">
                <img
                    src="https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                    alt="Hair Styling"
                    className="absolute inset-0 h-full w-full object-cover"
                />
            </div>
        </div>
    );
}