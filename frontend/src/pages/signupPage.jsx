import { useState } from "react";
import { Scissors, Eye, EyeOff, Loader2, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export function SignUpPage() {
    useDocumentTitle("Sign Up", "Create an account to book top-rated salons instantly.");
    const { showNotification } = useNotification();
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [rawPhone, setRawPhone] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const navigate = useNavigate();

    const handlePhoneChange = (e) => {
        let val = e.target.value.replace(/\D/g, "");
        if (val.length === 12 && val.startsWith("91")) {
            val = val.slice(2);
        } else if (val.length === 11 && val.startsWith("0")) {
            val = val.slice(1);
        }
        val = val.slice(0, 10);
        setRawPhone(val);
        if (fieldErrors.phonenumber) {
            setFieldErrors(prev => ({ ...prev, phonenumber: "" }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!data.fullName?.trim()) {
            errors.fullName = "Please enter your full name.";
        }
        if (!data.username?.trim()) {
            errors.username = "Please choose a username.";
        }
        if (!data.email?.trim()) {
            errors.email = "Please enter your email address.";
        } else if (!emailRegex.test(data.email.trim())) {
            errors.email = "Enter a valid email address.";
        }
        
        const cleanPhone = rawPhone.trim();
        if (!cleanPhone) {
            errors.phonenumber = "Please enter your phone number.";
        } else if (cleanPhone.length !== 10) {
            errors.phonenumber = "Please enter a valid 10-digit mobile number.";
        }

        if (!data.password) {
            errors.password = "Please enter a password.";
        } else if (data.password.length < 8) {
            errors.password = "Password must be at least 8 characters.";
        }
        if (!data.confirmPassword) {
            errors.confirmPassword = "Please confirm your password.";
        } else if (data.password !== data.confirmPassword) {
            errors.confirmPassword = "Passwords don't match. Please try again.";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        data.phonenumber = `+91${cleanPhone}`;

        setLoading(true);

        try {
            const response = await axiosInstance.post("/users/register", data, {
                withCredentials: true,
            });

            if (response.status === 200 || response.status === 201) {
                const registeredEmail = response.data.data.email || data.email;
                showNotification("Account created! Please check your email for the verification code.", "success");
                // Redirect to email verification page — no login yet
                navigate("/verify-email", { state: { email: registeredEmail } });
            } else {
                const msg = response.data.message || "Registration failed";
                setError(msg);
                showNotification(msg, "error");
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Registration failed. Please check your details and try again.";
            setError(msg);
            showNotification(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid md:grid-cols-2 bg-white font-sans">
            {/* LEFT SIDE: FORM */}
            <div className="flex flex-col justify-center items-center px-6 py-8 overflow-y-auto">
                <div className="w-full max-w-md my-auto">
                    {/* Clickable Header Logo -> Home */}
                    <div className="flex justify-center mb-6">
                        <Link to="/" className="flex items-center justify-center gap-2.5 group transition-transform active:scale-95" title="Return to SalonNow Home">
                            <img src="/logo.jpg" alt="SalonNow" className="w-10 h-10 rounded-full object-cover shadow-sm border border-[#D4AF37]/30 group-hover:scale-105 transition-transform" />
                            <span className="text-2xl font-bold tracking-tight text-gray-900">
                                Salon<span className="text-[#D4AF37]">Now</span>
                            </span>
                        </Link>
                    </div>

                    {/* Titles */}
                    <div className="text-center mb-5">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">Create Account</h2>
                        <p className="text-gray-500 text-sm leading-relaxed">Join thousands of happy clients booking top-rated salons.</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-sm mb-4 flex items-center gap-2">
                            <span>{error}</span>
                        </div>
                    )}

                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        className="space-y-3.5"
                    >
                        {/* Full Name */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Full Name</label>
                            <input
                                name="fullName"
                                type="text"
                                placeholder="Enter your full name"
                                onChange={() => setFieldErrors(prev => ({ ...prev, fullName: "" }))}
                                className={`w-full border rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
                                    fieldErrors.fullName
                                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                }`}
                            />
                            {fieldErrors.fullName && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.fullName}</p>
                            )}
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
                            <input
                                name="username"
                                type="text"
                                placeholder="Choose a unique username"
                                onChange={() => setFieldErrors(prev => ({ ...prev, username: "" }))}
                                className={`w-full border rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
                                    fieldErrors.username
                                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                }`}
                            />
                            {fieldErrors.username && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.username}</p>
                            )}
                        </div>

                        {/* Email */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                placeholder="name@example.com"
                                onChange={() => setFieldErrors(prev => ({ ...prev, email: "" }))}
                                className={`w-full border rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all ${
                                    fieldErrors.email
                                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                }`}
                            />
                            {fieldErrors.email && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Phone */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Phone Number</label>
                            <div
                                className={`flex items-center border rounded-xl overflow-hidden transition-all bg-white ${
                                    fieldErrors.phonenumber
                                        ? "border-red-500 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-500/20"
                                        : "border-gray-200 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20"
                                }`}
                            >
                                <span className="bg-gray-50 border-r border-gray-200 px-3.5 py-3 text-sm font-semibold text-gray-700 select-none flex items-center justify-center shrink-0">
                                    +91
                                </span>
                                <input
                                    name="rawPhone"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    placeholder="Enter 10-digit mobile number"
                                    value={rawPhone}
                                    onChange={handlePhoneChange}
                                    className="w-full p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none bg-transparent"
                                />
                                <input type="hidden" name="phonenumber" value={rawPhone ? `+91${rawPhone}` : ""} />
                            </div>
                            {fieldErrors.phonenumber && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.phonenumber}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label className="block text-xs font-semibold text-gray-700">Password</label>
                                <span className="text-[11px] text-gray-400 font-medium">Must be at least 8 characters</span>
                            </div>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    onChange={() => setFieldErrors(prev => ({ ...prev, password: "" }))}
                                    className={`w-full border rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all pr-10 ${
                                        fieldErrors.password
                                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                    }`}
                                />
                                <button
                                    type="button"
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute inset-y-0 right-1 flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] text-gray-400 hover:text-gray-600"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.password && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.password}</p>
                            )}
                        </div>

                        {/* Password Confirm */}
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 mb-1">Confirm Password</label>
                            <div className="relative">
                                <input
                                    name="confirmPassword"
                                    type={showConfirmPassword ? "text" : "password"}
                                    placeholder="••••••••"
                                    onChange={() => setFieldErrors(prev => ({ ...prev, confirmPassword: "" }))}
                                    className={`w-full border rounded-xl p-3 text-sm text-gray-800 placeholder-gray-400 focus:outline-none transition-all pr-10 ${
                                        fieldErrors.confirmPassword
                                            ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                    }`}
                                />
                                <button
                                    type="button"
                                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute inset-y-0 right-1 flex items-center justify-center p-2.5 min-w-[44px] min-h-[44px] text-gray-400 hover:text-gray-600"
                                >
                                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                            {fieldErrors.confirmPassword && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.confirmPassword}</p>
                            )}
                        </div>

                        {/* Sign Up Button */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-[#1a1a1a] hover:bg-black text-white font-semibold py-3 sm:py-3.5 h-11 sm:h-12 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] mt-4 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
                                    <span>Creating Account...</span>
                                </>
                            ) : (
                                "Sign Up"
                            )}
                        </button>

                        <div className="text-center mt-5 text-sm text-gray-500">
                            Already have an account?{" "}
                            <Link to="/login" className="text-[#8a6500] hover:text-[#b8962e] font-bold transition-colors">
                                Login
                            </Link>
                        </div>

                        <div className="text-center mt-4 text-xs text-gray-400">
                            <Link to="/" className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all font-medium">
                                <ArrowLeft size={14} />
                                <span>Back to Home</span>
                            </Link>
                        </div>
                    </form>
                </div>
            </div>

            {/* RIGHT SIDE: IMAGE HERO */}
            <div className="hidden md:block relative bg-gray-100">
                <img
                    src="https://images.unsplash.com/photo-1515377905703-c4788e51af15?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                    alt="Salon Ambience"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="absolute bottom-10 left-10 right-10 text-white z-10">
                    <p className="text-xs uppercase tracking-widest text-[#ffd166] font-bold mb-2">Priority Booking &amp; Fast Line</p>
                    <p className="text-2xl font-sans font-bold leading-snug">Instant seat reservation with transparent salon pricing</p>
                </div>
            </div>
        </div>
    );
}

export default SignUpPage;
