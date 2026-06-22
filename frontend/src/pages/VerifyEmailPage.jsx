import { useState, useEffect, useRef } from "react";
import { Scissors, MailCheck, RefreshCw, ArrowLeft, CheckCircle } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useAuth } from "../context/AuthContext";
import { useNotification } from "../context/NotificationContext";

export function VerifyEmailPage() {
    const { login } = useAuth();
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const location = useLocation();

    // Get email from navigation state or query params
    const emailFromState = location.state?.email || new URLSearchParams(location.search).get("email") || "";

    const [email] = useState(emailFromState);
    const [code, setCode] = useState(["", "", "", ""]);
    const [loading, setLoading] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [cooldown, setCooldown] = useState(0); // seconds remaining on resend cooldown

    const inputRefs = useRef([]);

    // Redirect if no email is provided
    useEffect(() => {
        if (!email) {
            navigate("/signup", { replace: true });
        }
    }, [email, navigate]);

    // Countdown timer for resend cooldown
    useEffect(() => {
        if (cooldown <= 0) return;
        const timer = setInterval(() => {
            setCooldown(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [cooldown]);

    const handleDigitChange = (index, value) => {
        // Only allow digits
        if (value && !/^\d$/.test(value)) return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);
        setError("");

        // Auto-focus next input
        if (value && index < 3) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleKeyDown = (index, e) => {
        // On backspace with empty field, go to previous input
        if (e.key === "Backspace" && !code[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
        // Allow pasting a full 4-digit code
        if (e.key === "v" && (e.ctrlKey || e.metaKey)) return;
    };

    const handlePaste = (e) => {
        const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
        if (pasted.length === 4) {
            setCode(pasted.split(""));
            inputRefs.current[3]?.focus();
            e.preventDefault();
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        const fullCode = code.join("");
        if (fullCode.length !== 4) {
            setError("Please enter the complete 4-digit code.");
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await axiosInstance.post("/users/verify-email", { email, code: fullCode }, {
                withCredentials: true,
            });

            if (response.status === 200) {
                setSuccess(true);
                const { user, accessToken } = response.data.data;
                if (accessToken) localStorage.setItem("authToken", accessToken);
                login(user);
                showNotification("Email verified! Welcome to SalonNow 🎉", "success");

                setTimeout(() => {
                    navigate("/role-selection", { replace: true });
                }, 1500);
            }
        } catch (err) {
            const msg = err.response?.data?.message || "Verification failed. Please try again.";
            setError(msg);
            showNotification(msg, "error");
            // Clear the code inputs on failure
            setCode(["", "", "", ""]);
            inputRefs.current[0]?.focus();
        } finally {
            setLoading(false);
        }
    };

    const handleResend = async () => {
        if (cooldown > 0 || resendLoading) return;
        setResendLoading(true);
        setError("");

        try {
            await axiosInstance.post("/users/resend-verification", { email });
            showNotification("A new verification code has been sent to your email.", "success");
            setCooldown(60); // 60 second cooldown
            setCode(["", "", "", ""]);
            inputRefs.current[0]?.focus();
        } catch (err) {
            const msg = err.response?.data?.message || "Could not resend code. Please try again.";
            setError(msg);
            showNotification(msg, "error");
        } finally {
            setResendLoading(false);
        }
    };

    const maskedEmail = email
        ? email.replace(/^(.{2})(.*)(@.*)$/, (_, a, b, c) => a + "*".repeat(Math.max(0, b.length)) + c)
        : "";

    return (
        <div className="min-h-screen grid md:grid-cols-2 bg-white font-sans">
            {/* LEFT SIDE: FORM */}
            <div className="flex flex-col justify-center items-center px-6 py-12 overflow-y-auto">
                <div className="w-full max-w-sm">

                    {/* Logo */}
                    <div className="flex justify-center items-center space-x-2 mb-8">
                        <div className="bg-[#1a1a1a] p-2 rounded-full text-white">
                            <Scissors size={24} />
                        </div>
                        <h1 className="text-2xl font-serif font-bold text-black tracking-wide">
                            Salon<span className="text-[#D4AF37]">Now</span>
                        </h1>
                    </div>

                    {/* Icon + Title */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            {success ? (
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center animate-bounce-once">
                                    <CheckCircle size={36} className="text-green-500" />
                                </div>
                            ) : (
                                <div className="w-16 h-16 bg-[#f9f5e8] border-2 border-[#D4AF37] rounded-full flex items-center justify-center">
                                    <MailCheck size={32} className="text-[#D4AF37]" />
                                </div>
                            )}
                        </div>
                        <h2 className="text-3xl font-serif font-bold text-[#1a1a1a] mb-2">
                            {success ? "Verified!" : "Check Your Email"}
                        </h2>
                        {!success && (
                            <p className="text-gray-500 text-sm leading-relaxed">
                                We sent a 4-digit verification code to<br />
                                <span className="font-semibold text-gray-700">{maskedEmail}</span>
                            </p>
                        )}
                    </div>

                    {/* Error message */}
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm mb-5 text-center">
                            {error}
                        </div>
                    )}

                    {!success && (
                        <form onSubmit={handleVerify} className="space-y-6">
                            {/* 4-digit code inputs */}
                            <div>
                                <label className="block text-sm text-gray-700 mb-3 text-center font-medium">
                                    Enter Verification Code
                                </label>
                                <div
                                    className="flex justify-center gap-3"
                                    onPaste={handlePaste}
                                >
                                    {code.map((digit, index) => (
                                        <input
                                            key={index}
                                            ref={(el) => (inputRefs.current[index] = el)}
                                            id={`code-digit-${index}`}
                                            type="text"
                                            inputMode="numeric"
                                            maxLength={1}
                                            value={digit}
                                            onChange={(e) => handleDigitChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-14 h-14 text-center text-2xl font-bold border-2 rounded-xl text-[#1a1a1a] 
                                                       transition-all duration-200 outline-none
                                                       border-gray-200 focus:border-[#D4AF37] focus:ring-2 focus:ring-[#D4AF37]/30
                                                       bg-white shadow-sm"
                                            autoFocus={index === 0}
                                        />
                                    ))}
                                </div>
                                <p className="text-xs text-gray-400 text-center mt-2">
                                    Code expires in 15 minutes
                                </p>
                            </div>

                            {/* Verify Button */}
                            <button
                                type="submit"
                                disabled={loading || code.join("").length !== 4}
                                className="w-full bg-[#1a1a1a] hover:bg-black text-white font-medium py-3.5 rounded-full 
                                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed
                                           flex items-center justify-center gap-2"
                            >
                                {loading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Verifying...
                                    </>
                                ) : (
                                    "Verify Email"
                                )}
                            </button>

                            {/* Divider */}
                            <div className="flex items-center gap-3">
                                <div className="flex-1 h-px bg-gray-200" />
                                <span className="text-xs text-gray-400">or</span>
                                <div className="flex-1 h-px bg-gray-200" />
                            </div>

                            {/* Resend Code */}
                            <div className="text-center">
                                <p className="text-sm text-gray-500 mb-2">Didn't receive the code?</p>
                                <button
                                    type="button"
                                    onClick={handleResend}
                                    disabled={cooldown > 0 || resendLoading}
                                    className="inline-flex items-center gap-2 text-sm font-medium 
                                               text-[#D4AF37] hover:text-[#b8942e] 
                                               disabled:text-gray-400 disabled:cursor-not-allowed
                                               transition-colors"
                                >
                                    <RefreshCw
                                        size={14}
                                        className={resendLoading ? "animate-spin" : ""}
                                    />
                                    {cooldown > 0
                                        ? `Resend in ${cooldown}s`
                                        : resendLoading
                                        ? "Sending..."
                                        : "Resend Verification Code"
                                    }
                                </button>
                            </div>

                            {/* Back to signup */}
                            <div className="text-center pt-2">
                                <Link
                                    to="/signup"
                                    className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 transition-colors"
                                >
                                    <ArrowLeft size={12} />
                                    Back to Sign Up
                                </Link>
                            </div>
                        </form>
                    )}

                    {success && (
                        <div className="text-center space-y-4">
                            <p className="text-gray-500 text-sm">
                                Redirecting you to your account setup...
                            </p>
                            <div className="flex justify-center">
                                <div className="w-6 h-6 border-2 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT SIDE: DECORATIVE PANEL */}
            <div className="hidden md:flex flex-col items-center justify-center bg-[#1a1a1a] relative overflow-hidden">
                {/* Background decorative circles */}
                <div className="absolute top-[-80px] right-[-80px] w-64 h-64 bg-[#D4AF37]/10 rounded-full" />
                <div className="absolute bottom-[-60px] left-[-60px] w-48 h-48 bg-[#D4AF37]/10 rounded-full" />

                <div className="relative z-10 text-center px-12">
                    {/* Gold icon */}
                    <div className="w-20 h-20 bg-[#D4AF37]/20 border-2 border-[#D4AF37] rounded-full flex items-center justify-center mx-auto mb-8">
                        <MailCheck size={36} className="text-[#D4AF37]" />
                    </div>

                    <h2 className="text-3xl font-serif font-bold text-white mb-4">
                        Almost <span className="text-[#D4AF37]">There!</span>
                    </h2>
                    <p className="text-gray-400 text-sm leading-relaxed max-w-xs mx-auto mb-8">
                        Verifying your email keeps your account secure and ensures you receive important booking confirmations.
                    </p>

                    {/* Steps */}
                    <div className="space-y-4 text-left max-w-xs mx-auto">
                        {[
                            { step: "1", text: "Check your inbox for the code" },
                            { step: "2", text: "Enter the 4-digit code" },
                            { step: "3", text: "Start booking your appointments" }
                        ].map(({ step, text }) => (
                            <div key={step} className="flex items-center gap-3">
                                <div className="w-8 h-8 bg-[#D4AF37] text-[#1a1a1a] rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0">
                                    {step}
                                </div>
                                <span className="text-gray-300 text-sm">{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
