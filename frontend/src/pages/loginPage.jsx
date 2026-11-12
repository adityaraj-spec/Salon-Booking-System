import { useState } from "react";
import { Scissors, Eye, EyeOff, X, Mail, Loader2, ArrowLeft, CheckCircle2 } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";
import useDocumentTitle from "../hooks/useDocumentTitle";

export function LoginPage() {
    useDocumentTitle("Login", "Sign in to your SalonNow account to manage appointments, live queue positions, and member rewards.");
    const { login } = useAuth();
    const { showNotification } = useNotification();
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    
    // Forgot Password Modal State
    const [isForgotOpen, setIsForgotOpen] = useState(false);
    const [forgotEmail, setForgotEmail] = useState("");
    const [forgotLoading, setForgotLoading] = useState(false);
    const [forgotStatus, setForgotStatus] = useState(null); // { type: 'success'|'error', text: '' }
    const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
    const [forgotError, setForgotError] = useState("");

    const navigate = useNavigate();
    const location = useLocation();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const formData = new FormData(e.target);
        const email = (formData.get("email") || "").trim();
        const password = formData.get("password") || "";

        const errors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            errors.email = "Please enter your email address.";
        } else if (!emailRegex.test(email)) {
            errors.email = "Please enter a valid email address.";
        }
        if (!password) {
            errors.password = "Please enter your password.";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setLoading(true);

        try {
            const response = await axiosInstance.post("/users/login", { email, password }, {
                withCredentials: true,
            });

            if (response.status === 200 || response.status === 201) {
                // Store authToken to be passed to admin panel
                const token = response.data.data.accessToken;
                if (token) localStorage.setItem('authToken', token);

                const user = response.data.data.user;
                login(user);
                showNotification("Welcome back! Login successful.", "success");
                
                if (user.role === 'unassigned') {
                    navigate("/role-selection", { replace: true });
                } else {
                    const destination = typeof location.state?.from === "string"
                        ? location.state.from
                        : "/home";
                    navigate(destination, { replace: true });
                }
            } else {
                const msg = response.data.message || "Login failed";
                setError(msg);
                showNotification(msg, "error");
            }
        } catch (err) {
            // 403 = email not verified — redirect to verification page
            if (err.response?.status === 403) {
                const msg = err.response?.data?.message || "Please verify your email before logging in.";
                showNotification(msg, "error");
                navigate("/verify-email", { state: { email } });
                return;
            }
            const msg = err.response?.data?.message || "Incorrect email or password. Please try again.";
            setError(msg);
            showNotification(msg, "error");
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPasswordSubmit = async (e) => {
        e.preventDefault();
        setForgotStatus(null);
        setForgotError("");

        const email = (forgotEmail || "").trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email) {
            setForgotError("Please enter your email address.");
            return;
        }
        if (!emailRegex.test(email)) {
            setForgotError("Please enter a valid email address.");
            return;
        }

        setForgotLoading(true);

        try {
            const res = await axiosInstance.post("/users/forgot-password", { email: forgotEmail });
            const message = res.data?.message || "If an account with that email exists, reset instructions have been dispatched.";
            setForgotStatus({ type: "success", text: message });
        } catch (err) {
            const errMessage = err.response?.data?.message || "Unable to send reset instructions. Please try again later.";
            setForgotStatus({ type: "error", text: errMessage });
            showNotification(errMessage, "error");
        } finally {
            setForgotLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid md:grid-cols-2 bg-white font-sans">
            {/* LEFT SIDE: FORM */}
            <div className="flex flex-col justify-center items-center px-6 py-8 overflow-y-auto">
                <div className="w-full max-w-sm">
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
                    <div className="text-center mb-6">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-2">Welcome Back</h2>
                        <p className="text-gray-500 text-sm leading-relaxed">Login  to manage your bookings</p>
                    </div>

                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3.5 rounded-xl text-sm mb-5 flex items-center gap-2">
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                            <input
                                name="email"
                                type="email"
                                onChange={() => setFieldErrors(prev => ({ ...prev, email: "" }))}
                                placeholder="name@example.com"
                                className={`w-full border rounded-xl p-3.5 text-gray-800 placeholder-gray-400 focus:outline-none transition-all text-sm ${
                                    fieldErrors.email
                                        ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                }`}
                            />
                            {fieldErrors.email && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.email}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    name="password"
                                    type={showPassword ? "text" : "password"}
                                    onChange={() => setFieldErrors(prev => ({ ...prev, password: "" }))}
                                    placeholder="Enter your password"
                                    className={`w-full border rounded-xl p-3.5 text-gray-800 placeholder-gray-400 focus:outline-none transition-all text-sm pr-11 ${
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

                        {/* Forgot Password Action */}
                        <div className="flex justify-end pt-1">
                            <button
                                type="button"
                                onClick={() => {
                                    setIsForgotOpen(true);
                                    setForgotStatus(null);
                                }}
                                className="text-xs text-[#8a6500] hover:text-[#b8962e] font-semibold transition-colors focus:outline-none"
                            >
                                Forgot password?
                            </button>
                        </div>

                        {/* Login Button */}
                        <button 
                            type="submit" 
                            disabled={loading}
                            className="w-full bg-[#1a1a1a] hover:bg-black text-white font-semibold py-3 sm:py-3.5 h-11 sm:h-12 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] mt-3 disabled:opacity-50 flex items-center justify-center gap-2 text-sm sm:text-base"
                        >
                            {loading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
                                    <span>Logging in...</span>
                                </>
                            ) : (
                                "Login"
                            )}
                        </button>

                        <div className="text-center mt-6 text-sm text-gray-500">
                            Don&apos;t have an account?{" "}
                            <Link to="/signup" className="text-[#8a6500] hover:text-[#b8962e] font-bold transition-colors">
                                Sign up
                            </Link>
                        </div>

                        <div className="text-center mt-6 text-xs text-gray-400">
                            <Link to="/" className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-all font-medium">
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
                    src="https://images.unsplash.com/photo-1562322140-8baeececf3df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1000&q=80"
                    alt="Salon Experience"
                    className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="absolute bottom-10 left-10 right-10 text-white z-10">
                    <p className="text-xs uppercase tracking-widest text-[#ffd166] font-bold mb-2">Verified Salons</p>
                    <p className="text-2xl font-sans font-bold leading-snug">Experience effortless beauty &amp; grooming scheduling</p>
                </div>
            </div>

            {/* FORGOT PASSWORD MODAL */}
            {isForgotOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100 relative">
                        <button
                            type="button"
                            onClick={() => {
                                setIsForgotOpen(false);
                                setForgotStatus(null);
                            }}
                            className="absolute top-4 right-4 p-1.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
                            aria-label="Close modal"
                        >
                            <X size={18} />
                        </button>

                        {forgotStatus?.type === "success" ? (
                            <div className="text-center py-4">
                                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                                    <CheckCircle2 size={28} />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 tracking-tight mb-2">Check Your Inbox</h3>
                                <p className="text-xs sm:text-sm text-gray-500 max-w-xs mx-auto mb-6 leading-relaxed">
                                    Check your inbox for reset instructions. If an account is registered with <strong className="text-gray-800 font-semibold">{forgotEmail}</strong>, you'll receive a link shortly.
                                </p>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsForgotOpen(false);
                                        setForgotStatus(null);
                                        setForgotEmail("");
                                    }}
                                    className="w-full py-3 rounded-xl bg-[#1a1a1a] hover:bg-black text-white font-bold text-xs transition-colors"
                                >
                                    Done
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-10 h-10 rounded-full bg-amber-50 text-[#8a6500] flex items-center justify-center shrink-0">
                                        <Mail size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-bold text-gray-900 tracking-tight">Reset Password</h3>
                                        <p className="text-xs text-gray-500">We will send instructions to your email</p>
                                    </div>
                                </div>

                                {forgotStatus && (
                                    <div className="p-3 rounded-xl text-xs font-semibold mb-4 bg-red-50 border border-red-200 text-red-700">
                                        {forgotStatus.text}
                                    </div>
                                )}

                                <form onSubmit={handleForgotPasswordSubmit} noValidate className="space-y-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-1">Account Email</label>
                                        <input
                                            type="email"
                                            value={forgotEmail}
                                            onChange={(e) => {
                                                setForgotEmail(e.target.value);
                                                setForgotError("");
                                            }}
                                            placeholder="Enter your registered email"
                                            className={`w-full border rounded-xl p-3 text-sm focus:outline-none transition-all ${
                                                forgotError
                                                    ? "border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                                                    : "border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20"
                                            }`}
                                        />
                                        {forgotError && (
                                            <p className="text-xs text-red-600 mt-1.5 font-medium">{forgotError}</p>
                                        )}
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setIsForgotOpen(false);
                                                setForgotStatus(null);
                                            }}
                                            className="w-1/2 py-2.5 rounded-xl border border-gray-200 font-semibold text-xs text-gray-700 hover:bg-gray-50 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={forgotLoading || !forgotEmail}
                                            className="w-1/2 py-2.5 rounded-xl bg-[#1a1a1a] hover:bg-black text-white font-bold text-xs transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                                        >
                                            {forgotLoading ? <Loader2 size={14} className="animate-spin text-[#D4AF37]" /> : "Send Link"}
                                        </button>
                                    </div>
                                </form>
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default LoginPage;
