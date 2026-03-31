import { useAuth } from "../context/AuthContext";
import { NavBar } from "../components/navPage";
import { Footer } from "../components/footerPage";
import { User, Mail, Phone, Shield, Calendar } from "lucide-react";

export function ProfilePage() {
    const { user } = useAuth();

    if (!user) return null;

    return (
        <div className="min-h-screen flex flex-col bg-[#fafafa]">
            <NavBar />
            
            <main className="flex-1 pt-24 pb-12">
                <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="bg-white rounded-[32px] overflow-hidden shadow-sm border border-gray-100">
                    {/* Header/Cover */}
                    <div className="h-32 bg-[#1a1a1a] flex items-end px-6 md:px-12">
                        <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-[#D4AF37] border-4 border-white translate-y-10 md:translate-y-12 flex items-center justify-center text-white text-2xl md:text-3xl font-bold">
                            {user.fullName.charAt(0).toUpperCase()}
                        </div>
                    </div>

                    <div className="px-6 md:px-12 pt-14 md:pt-16 pb-12">
                        <div className="flex flex-col md:flex-row justify-between items-start mb-10 gap-4">
                            <div>
                                <h1 className="text-2xl md:text-3xl font-serif font-bold text-[#1a1a1a]">{user.fullName}</h1>
                                <p className="text-gray-400 font-medium text-sm">@{user.username}</p>
                            </div>
                            <span className="bg-[#f9f5e8] text-[#D4AF37] px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest border border-[#D4AF37]/20">
                                {user.role}
                            </span>
                        </div>

                        <div className="grid md:grid-cols-2 gap-8">
                            <div className="space-y-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Information</h3>
                                
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                                        <Mail size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Email Address</p>
                                        <p className="text-[#1a1a1a] font-bold">{user.email}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                                        <Phone size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Phone Number</p>
                                        <p className="text-[#1a1a1a] font-bold">{user.phonenumber || "Not added"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-6">
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Account Security</h3>
                                
                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                                        <Shield size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Role Access</p>
                                        <p className="text-[#1a1a1a] font-bold">Verified {user.role}</p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-4 group">
                                    <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#1a1a1a] group-hover:text-white transition-all">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-400 font-medium">Member Since</p>
                                        <p className="text-[#1a1a1a] font-bold">{new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                </div>
            </main>
            
            <Footer />
        </div>
    );
}
