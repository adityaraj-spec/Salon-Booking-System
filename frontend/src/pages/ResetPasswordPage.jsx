import { useState } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight } from "lucide-react";
import axiosInstance from "../api/axiosConfig";
import useDocumentTitle from "../hooks/useDocumentTitle";

export function ResetPasswordPage() {
    useDocumentTitle("Reset Password", "Create a new secure password for your SalonNow account.");
    const { token: paramToken } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = paramToken || searchParams.get("token") || "";

    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!token) {
            setError("Invalid or missing password reset link. Please request a new link.");
            return;
        }

        if (newPassword.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (newPassword !== confirmPassword) {
            setError("Passwords do not match. Please ensure both fields are identical.");
            return;
        }

        setLoading(true);
        try {
            const res = await axiosInstance.post("/users/reset-password", {
                token: token.trim(),
                newPassword,
            });

            if (res.data?.success) {
                setSuccess(true);
            } else {
                setError(res.data?.message || "Failed to reset password. Please try again.");
            }
        } catch (err) {
            setError(
                err.response?.data?.message ||
                "This password reset link is invalid or has expired. Please request a new link."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#FBFBFA] flex flex-col justify-center items-center px-4 py-12 font-sans">
            <div className="w-full max-w-md">
                {/* Header Logo */}
                <div className="flex justify-center mb-6">
                    <Link
                        to="/"
                        className="flex items-center justify-center gap-2.5 group transition-transform active:scale-95"
                        title="Return to SalonNow Home"
                    >
                        <img
                            src="/logo.jpg"
                            alt="SalonNow"
                            className="w-10 h-10 rounded-full object-cover shadow-sm border border-[#D4AF37]/30 group-hover:scale-105 transition-transform"
                        />
                        <span className="text-2xl font-bold tracking-tight text-gray-900">
                            Salon<span className="text-[#D4AF37]">Now</span>
                        </span>
                    </Link>
                </div>

                {/* Main Card */}
                <div className="bg-white rounded-2xl shadow-soft-lg border border-stone-200/60 p-6 sm:p-8">
                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-100 shadow-sm">
                                <CheckCircle2 size={30} />
                            </div>
                            <h2 className="text-2xl font-bold text-gray-900 tracking-tight mb-2">Password Reset Complete</h2>
                            <p className="text-sm text-gray-500 max-w-sm mx-auto mb-6 leading-relaxed">
                                Your password has been successfully updated. You can now sign in using your new credentials.
                            </p>
                            <button
                                type="button"
                                onClick={() => navigate("/login")}
                                className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl font-bold text-xs hover:bg-black active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2"
                            >
                                <span>Sign In to Your Account</span>
                                <ArrowRight size={14} />
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className="text-center mb-6">
                                <div className="w-12 h-12 rounded-xl bg-amber-50 text-[#8a6500] flex items-center justify-center mx-auto mb-3">
                                    <Lock size={22} />
                                </div>
                                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Password</h1>
                                <p className="text-xs text-gray-500 mt-1">
                                    Choose a secure password of at least 8 characters
                                </p>
                            </div>

                            {/* Token check alert */}
                            {!token && (
                                <div className="mb-5 p-3.5 rounded-xl bg-amber-50 border border-amber-200/60 text-amber-900 text-xs flex items-start gap-2.5">
                                    <AlertCircle size={16} className="text-[#8a6500] shrink-0 mt-0.5" />
                                    <span>
                                        No reset token found in this link. If you copied the link, please ensure you included the full address.
                                    </span>
                                </div>
                            )}

                            {/* Error Alert */}
                            {error && (
                                <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-rose-800 text-xs flex items-start gap-2.5">
                                    <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
                                    <div className="flex-1">
                                        <p className="font-semibold">{error}</p>
                                        {error.toLowerCase().includes("expired") && (
                                            <Link
                                                to="/login"
                                                className="inline-block mt-1 font-bold text-rose-900 underline hover:text-black"
                                            >
                                                Request a new password reset link &rarr;
                                            </Link>
                                        )}
                                    </div>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? "text" : "password"}
                                            required
                                            minLength={8}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="At least 8 characters"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-sm pr-10 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                            aria-label={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                                        Confirm New Password
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showConfirmPassword ? "text" : "password"}
                                            required
                                            minLength={8}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            placeholder="Re-enter your new password"
                                            className="w-full bg-white border border-gray-200 rounded-xl px-3.5 py-3 text-sm pr-10 focus:outline-none focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                                            aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading || !token || !newPassword || !confirmPassword}
                                    className="w-full bg-[#1A1A1A] text-white py-3.5 rounded-xl font-bold text-xs hover:bg-black active:scale-[0.99] transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                                >
                                    {loading ? (
                                        <>
                                            <Loader2 size={16} className="animate-spin text-[#D4AF37]" />
                                            <span>Updating Password...</span>
                                        </>
                                    ) : (
                                        <span>Update Password</span>
                                    )}
                                </button>
                            </form>

                            <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                                <Link
                                    to="/login"
                                    className="text-xs font-semibold text-gray-500 hover:text-gray-900 transition-colors"
                                >
                                    &larr; Back to Login
                                </Link>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default ResetPasswordPage;

