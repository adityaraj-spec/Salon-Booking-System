import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Phone, Shield, Calendar, Edit2, Check, X, Loader2, Award, Sparkles, Coins, Gift, ArrowUpRight, ArrowDownLeft, Copy, History } from "lucide-react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";

export function ProfilePage() {
    const { user, login } = useAuth();
    const { showNotification } = useNotification();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [loyaltyData, setLoyaltyData] = useState(null);
    const [loyaltyLoading, setLoyaltyLoading] = useState(true);
    const [copiedReferral, setCopiedReferral] = useState(false);
    const [formData, setFormData] = useState({
        fullName: user?.fullName || "",
        phonenumber: user?.phonenumber || ""
    });

    useEffect(() => {
        const fetchLoyalty = async () => {
            try {
                const res = await axiosInstance.get("/loyalty/summary")
                    .catch(() => axiosInstance.get("/growth/loyalty"));
                if (res.data?.success) {
                    setLoyaltyData(res.data.data);
                }
            } catch (err) {
                console.error("Failed to load loyalty summary", err);
            } finally {
                setLoyaltyLoading(false);
            }
        };
        if (user) {
            fetchLoyalty();
        }
    }, [user]);

    const copyReferralCode = () => {
        const code = loyaltyData?.referralCode || user?.referralCode;
        if (code) {
            navigator.clipboard.writeText(code);
            setCopiedReferral(true);
            showNotification("Referral code copied to clipboard!", "success");
            setTimeout(() => setCopiedReferral(false), 2000);
        }
    };

    if (!user) return null;

    const handleUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await axiosInstance.patch("/users/update-account", formData);
            if (response.data.success) {
                login(response.data.data);
                setIsEditing(false);
                showNotification("Profile updated successfully!", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to update profile", "error");
        } finally {
            setLoading(false);
        }
    };

    return (
        <main className="flex-1 pb-12">
            <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-8">
                <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100">
                    {/* Header/Cover */}
                    <div className="h-32 bg-[#1a1a1a] flex items-end px-6 md:px-12 relative">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#D4AF37] border-4 border-white translate-y-10 md:translate-y-12 flex items-center justify-center text-white text-2xl md:text-3xl font-bold z-0">
                            {user.fullName?.charAt(0).toUpperCase() || "U"}
                        </div>
                        {!isEditing && (
                            <button 
                                onClick={() => setIsEditing(true)}
                                className="absolute bottom-4 right-6 md:right-12 bg-white/10 hover:bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border border-white/20"
                            >
                                <Edit2 size={14} />
                                Edit Profile
                            </button>
                        )}
                    </div>

                    <div className="px-6 md:px-12 pt-14 md:pt-16 pb-12">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-6 gap-4">
                            <div className="w-full">
                                {isEditing ? (
                                    <div className="space-y-4 max-w-sm">
                                        <div>
                                            <label className="text-[10px] text-gray-400 font-bold block mb-1">Full Name</label>
                                            <input
                                                type="text"
                                                value={formData.fullName}
                                                onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                                                className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-[#1a1a1a] font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 border-[#D4AF37]/20"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a]">{user.fullName || "User"}</h1>
                                        <p className="text-gray-400 font-medium text-sm">@{user.username}</p>
                                    </>
                                )}
                            </div>
                            <span className="bg-[#f9f5e8] text-[#D4AF37] px-4 py-1 rounded-full text-[10px] md:text-xs font-bold border border-[#D4AF37]/20 capitalize">
                                {user.role === 'unassigned' ? 'Not Selected' : user.role}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 border-b border-gray-50 pb-2">Information</h3>
                                
                                <div className="flex items-center gap-4 group opacity-60">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Email Address (Read Only)</p>
                                        <p className="text-[#1a1a1a] font-bold">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${isEditing ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'bg-gray-50 text-gray-400 group-hover:bg-[#1a1a1a] group-hover:text-white'}`}>
                                        <Phone size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-xs text-gray-400 font-medium">Phone Number</p>
                                        {isEditing ? (
                                            <input
                                                type="text"
                                                value={formData.phonenumber}
                                                onChange={(e) => setFormData({...formData, phonenumber: e.target.value})}
                                                placeholder="Enter your phone number"
                                                className="w-full mt-1 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2 text-[#1a1a1a] font-bold focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 border-[#D4AF37]/20"
                                            />
                                        ) : (
                                            <p className="text-[#1a1a1a] font-bold">{user.phonenumber || "Not added"}</p>
                                        )}
                                    </div>
                                </div>

                                {isEditing && (
                                    <div className="flex gap-3 pt-4">
                                        <button 
                                            onClick={handleUpdate}
                                            disabled={loading}
                                            className="bg-[#1a1a1a] text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-black disabled:opacity-50 transition-all shadow-lg shadow-black/10"
                                        >
                                            {loading ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                            Save Changes
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setIsEditing(false);
                                                setFormData({ fullName: user.fullName || "", phonenumber: user.phonenumber || "" });
                                            }}
                                            className="bg-gray-100 text-gray-500 px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-gray-200 transition-all font-sans"
                                        >
                                            <X size={14} />
                                            Cancel
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-gray-400 border-b border-gray-50 pb-2">Account Security</h3>
                                
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Role Access</p>
                                        <p className="text-[#1a1a1a] font-bold">Verified {user.role === 'unassigned' ? 'User' : user.role}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Member Since</p>
                                        <p className="text-[#1a1a1a] font-bold">{new Date(user.createdAt || new Date()).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* LOYALTY POINTS & REWARDS WIDGET — Sprint 3.4 */}
                        <div className="mt-12 pt-8 border-t border-gray-100">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <Sparkles size={20} className="text-[#D4AF37]" />
                                        <h3 className="text-xl md:text-2xl font-serif font-bold text-[#1a1a1a]">Loyalty Points & Rewards</h3>
                                    </div>
                                    <p className="text-xs md:text-sm text-gray-500 mt-1">
                                        Earn 1 point per ₹10 spent on completed bookings. Redeem at checkout for instant discounts.
                                    </p>
                                </div>
                                {(loyaltyData?.referralCode || user?.referralCode) && (
                                    <div className="flex items-center gap-2 bg-amber-50/80 border border-amber-200/70 rounded-2xl px-4 py-2 self-start md:self-auto">
                                        <Gift size={16} className="text-[#D4AF37]" />
                                        <div className="text-left">
                                            <p className="text-[10px] uppercase font-bold text-amber-700">Your Referral Code</p>
                                            <p className="text-xs font-mono font-bold text-gray-900 tracking-wider">
                                                {loyaltyData?.referralCode || user?.referralCode}
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={copyReferralCode}
                                            aria-label="Copy referral code"
                                            className="ml-2 p-1.5 hover:bg-amber-100 rounded-lg text-amber-800 transition-colors"
                                        >
                                            {copiedReferral ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Summary Cards */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
                                <div className="bg-gradient-to-br from-[#1a1a1a] to-[#2d2d2d] rounded-2xl p-5 text-white shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-300">Current Balance</span>
                                        <Coins size={18} className="text-[#D4AF37]" />
                                    </div>
                                    <div className="my-3">
                                        <p className="text-3xl font-serif font-bold text-white">
                                            {loyaltyLoading ? "..." : (loyaltyData?.loyaltyPoints ?? user.loyaltyPoints ?? 0)}
                                        </p>
                                        <p className="text-xs text-[#D4AF37] font-medium mt-0.5">Loyalty Points</p>
                                    </div>
                                    <div className="pt-2 border-t border-white/10 text-[11px] text-gray-300">
                                        1 Point = ₹0.50 Discount
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500">Cashback Equivalent</span>
                                        <Award size={18} className="text-emerald-600" />
                                    </div>
                                    <div className="my-3">
                                        <p className="text-3xl font-serif font-bold text-emerald-600">
                                            ₹{loyaltyLoading ? "..." : (((loyaltyData?.loyaltyPoints ?? user.loyaltyPoints ?? 0) * 0.50).toFixed(2))}
                                        </p>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">Available to redeem</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 text-[11px] text-gray-500">
                                        Apply up to 20% off bookings
                                    </div>
                                </div>

                                <div className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm flex flex-col justify-between">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs font-semibold text-gray-500">Earn Rate</span>
                                        <Sparkles size={18} className="text-orange-500" />
                                    </div>
                                    <div className="my-3">
                                        <p className="text-2xl font-serif font-bold text-gray-900">
                                            1 pt / ₹10
                                        </p>
                                        <p className="text-xs text-gray-400 font-medium mt-0.5">On every completed visit</p>
                                    </div>
                                    <div className="pt-2 border-t border-gray-50 text-[11px] text-gray-500">
                                        +50 pts per referred friend
                                    </div>
                                </div>
                            </div>

                            {/* Recent Ledger History */}
                            <div>
                                <div className="flex items-center gap-2 mb-4">
                                    <History size={16} className="text-gray-400" />
                                    <h4 className="text-sm font-bold text-gray-700 uppercase tracking-wider">Points Ledger & History</h4>
                                </div>

                                {loyaltyLoading ? (
                                    <div className="flex items-center justify-center py-10 bg-gray-50 rounded-2xl">
                                        <Loader2 size={24} className="animate-spin text-[#D4AF37]" />
                                    </div>
                                ) : (loyaltyData?.transactions && loyaltyData.transactions.length > 0) ? (
                                    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden shadow-sm divide-y divide-gray-50">
                                        {loyaltyData.transactions.map((tx, idx) => {
                                            const isEarn = tx.type === "earn" || tx.type === "earned" || tx.type === "referral_bonus";
                                            const isRedeem = tx.type === "redeem" || tx.type === "redeemed";
                                            const pointsDisplay = Math.abs(tx.points);

                                            return (
                                                <div key={tx._id || idx} className="p-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                                            isEarn ? "bg-emerald-50 text-emerald-600" :
                                                            isRedeem ? "bg-amber-50 text-amber-600" :
                                                            "bg-blue-50 text-blue-600"
                                                        }`}>
                                                            {isEarn ? <ArrowDownLeft size={16} /> : <ArrowUpRight size={16} />}
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-bold text-gray-900 leading-tight">
                                                                {tx.description || (isEarn ? "Points Earned" : "Points Redeemed")}
                                                            </p>
                                                            <p className="text-xs text-gray-400 mt-0.5">
                                                                {new Date(tx.createdAt || Date.now()).toLocaleDateString(undefined, {
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                    hour: '2-digit',
                                                                    minute: '2-digit'
                                                                })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className={`text-sm font-bold ${
                                                            isEarn ? "text-emerald-600" : "text-amber-600"
                                                        }`}>
                                                            {isEarn ? `+${pointsDisplay}` : `-${pointsDisplay}`} pts
                                                        </p>
                                                        {tx.balanceAfter !== undefined && (
                                                            <p className="text-[11px] text-gray-400">
                                                                Bal: {tx.balanceAfter} pts
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-gray-50/70 border border-dashed border-gray-200 rounded-2xl text-gray-400">
                                        <Coins size={32} className="mx-auto mb-2 text-gray-300" />
                                        <p className="text-sm font-medium">No loyalty transactions yet.</p>
                                        <p className="text-xs text-gray-400 mt-1">Book and complete appointments to start stacking rewards!</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    );
}
