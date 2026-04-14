import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Mail, Phone, Shield, Calendar, Edit2, Check, X, Loader2 } from "lucide-react";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";

export function ProfilePage() {
    const { user, login } = useAuth();
    const { showNotification } = useNotification();
    const [isEditing, setIsEditing] = useState(false);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: user?.fullName || "",
        phonenumber: user?.phonenumber || ""
    });

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
                    </div>
                </div>
            </div>
        </main>
    );
}
