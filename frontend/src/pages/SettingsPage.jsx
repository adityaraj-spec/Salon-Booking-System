import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useNotification } from "../context/NotificationContext";
import axiosInstance from "../api/axiosConfig";
import { NavBar } from "../components/navPage";
import { 
    User, 
    Lock, 
    Sun, 
    Moon, 
    Shield, 
    Bell, 
    Save, 
    Loader2, 
    CheckCircle2,
    Eye,
    EyeOff
} from "lucide-react";

export function SettingsPage() {
    const { user } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const { showNotification } = useNotification();
    
    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || "",
        email: user?.email || "",
        phonenumber: user?.phonenumber || ""
    });

    const [passwordData, setPasswordData] = useState({
        oldPassword: "",
        newPassword: "",
        confirmPassword: ""
    });

    const [showPasswords, setShowPasswords] = useState(false);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [isSavingPassword, setIsSavingPassword] = useState(false);

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setIsSavingProfile(true);
        try {
            const response = await axiosInstance.patch("/users/update-account", profileData);
            if (response.data.success) {
                showNotification("Profile updated successfully!", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to update profile", "error");
        } finally {
            setIsSavingProfile(false);
        }
    };

    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            return showNotification("New passwords do not match", "error");
        }
        setIsSavingPassword(true);
        try {
            const response = await axiosInstance.post("/users/change-password", {
                oldPassword: passwordData.oldPassword,
                newPassword: passwordData.newPassword
            });
            if (response.data.success) {
                showNotification("Password changed successfully!", "success");
                setPasswordData({ oldPassword: "", newPassword: "", confirmPassword: "" });
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to change password", "error");
        } finally {
            setIsSavingPassword(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] dark:bg-[#121212] transition-colors duration-300">
            <NavBar />
            
            <main className="max-w-4xl mx-auto pt-32 pb-20 px-6">
                <div className="mb-10">
                    <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-gray-100 mb-2">Settings</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage your profile, security, and appearance</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Sidebar Tabs (Optional UI) */}
                    <div className="md:col-span-1 space-y-2">
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-[#1e1e1e] text-[#D4AF37] border border-gray-100 dark:border-gray-800 shadow-sm font-bold text-sm transition-all">
                            <User size={18} />
                            Account Profile
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#181818] font-bold text-sm transition-all text-left">
                            <Shield size={18} />
                            Security
                        </button>
                        <button className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#181818] font-bold text-sm transition-all text-left">
                            <Bell size={18} />
                            Notifications
                        </button>
                    </div>

                    {/* Content Area */}
                    <div className="md:col-span-2 space-y-8">
                        
                        {/* Theme Section */}
                        <section className="bg-white dark:bg-[#1e1e1e] p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                                <Sun className="text-[#D4AF37]" size={20} />
                                Appearance
                            </h2>
                            <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-[#252525] rounded-2xl">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white dark:bg-[#1e1e1e] rounded-xl shadow-sm text-gray-700 dark:text-gray-300">
                                        {theme === "dark" ? <Moon size={18} /> : <Sun size={18} />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-gray-900 dark:text-gray-100">Dark Mode</p>
                                        <p className="text-xs text-gray-500 dark:text-gray-400">Switch between light and dark themes</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={toggleTheme}
                                    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${theme === "dark" ? "bg-[#D4AF37]" : "bg-gray-200"}`}
                                >
                                    <div className={`absolute top-1 left-1 w-5 h-5 bg-white rounded-full transition-transform duration-300 shadow-md ${theme === "dark" ? "translate-x-7" : ""}`} />
                                </button>
                            </div>
                        </section>

                        {/* Profile Section */}
                        <section className="bg-white dark:bg-[#1e1e1e] p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                                <User className="text-[#D4AF37]" size={20} />
                                Profile Information
                            </h2>
                            <form onSubmit={handleProfileUpdate} className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Full Name</label>
                                        <input 
                                            type="text"
                                            value={profileData.fullName}
                                            onChange={e => setProfileData({...profileData, fullName: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Phone Number</label>
                                        <input 
                                            type="text"
                                            value={profileData.phonenumber}
                                            onChange={e => setProfileData({...profileData, phonenumber: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Email Address</label>
                                    <input 
                                        type="email"
                                        value={profileData.email}
                                        onChange={e => setProfileData({...profileData, email: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                    />
                                </div>
                                <div className="pt-4">
                                    <button 
                                        type="submit"
                                        disabled={isSavingProfile}
                                        className="inline-flex items-center gap-2 bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                                    >
                                        {isSavingProfile ? <Loader2 size={16} className="animate-spin" /> : <><Save size={16} /> Save Changes</>}
                                    </button>
                                </div>
                            </form>
                        </section>

                        {/* Security Section */}
                        <section className="bg-white dark:bg-[#1e1e1e] p-8 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6 flex items-center gap-2">
                                <Lock className="text-[#D4AF37]" size={20} />
                                Security
                            </h2>
                            <form onSubmit={handlePasswordUpdate} className="space-y-4">
                                <div className="relative">
                                    <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Current Password</label>
                                    <input 
                                        type={showPasswords ? "text" : "password"}
                                        value={passwordData.oldPassword}
                                        onChange={e => setPasswordData({...passwordData, oldPassword: e.target.value})}
                                        className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                        placeholder="••••••••"
                                    />
                                    <button 
                                        type="button"
                                        onClick={() => setShowPasswords(!showPasswords)}
                                        className="absolute right-4 bottom-3.5 text-gray-400 hover:text-[#D4AF37]"
                                    >
                                        {showPasswords ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">New Password</label>
                                        <input 
                                            type={showPasswords ? "text" : "password"}
                                            value={passwordData.newPassword}
                                            onChange={e => setPasswordData({...passwordData, newPassword: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                    <div className="col-span-2 sm:col-span-1">
                                        <label className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1.5 ml-1">Confirm New Password</label>
                                        <input 
                                            type={showPasswords ? "text" : "password"}
                                            value={passwordData.confirmPassword}
                                            onChange={e => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                                            className="w-full bg-gray-50 dark:bg-[#252525] border-none rounded-xl px-4 py-3.5 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="••••••••"
                                        />
                                    </div>
                                </div>
                                <div className="pt-4">
                                    <button 
                                        type="submit"
                                        disabled={isSavingPassword}
                                        className="inline-flex items-center gap-2 bg-[#1a1a1a] dark:bg-white text-white dark:text-[#1a1a1a] px-8 py-3.5 rounded-2xl font-bold text-xs uppercase tracking-widest hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-black/10 disabled:opacity-50"
                                    >
                                        {isSavingPassword ? <Loader2 size={16} className="animate-spin" /> : "Update Password"}
                                    </button>
                                </div>
                            </form>
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
}
