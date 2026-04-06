import { useState, useEffect } from "react";
import { useParams, useNavigate, NavLink } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";
import { 
    Scissors, 
    Users, 
    Plus, 
    Trash2, 
    Clock, 
    IndianRupee, 
    ArrowLeft,
    Loader2,
    Store,
    Briefcase,
    Zap,
    LayoutDashboard
} from "lucide-react";

export function SalonManagementPage() {
    const { showNotification } = useNotification();
    const navigate = useNavigate();
    const [salon, setSalon] = useState(null);
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("services"); // "services" or "staff"

    // Form States
    const [serviceForm, setServiceForm] = useState({ name: "", category: "Haircut", price: "", duration: "", description: "" });
    const [staffForm, setStaffForm] = useState({ name: "", role: "", experience: "", skills: "" });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const fetchData = async () => {
        setLoading(true);
        try {
            // First get the owner's salon
            const salonRes = await axiosInstance.get("/salons/owner/salon");
            if (salonRes.data.success && salonRes.data.data) {
                const salonData = salonRes.data.data;
                setSalon(salonData);

                // Fetch its services and staff
                const [servRes, staffRes] = await Promise.all([
                    axiosInstance.get(`/services/salon/${salonData._id}`),
                    axiosInstance.get(`/staff/salon/${salonData._id}`)
                ]);

                if (servRes.data.success) setServices(servRes.data.data);
                if (staffRes.data.success) setStaff(staffRes.data.data);
            } else {
                showNotification("No salon found. Please register one first.", "error");
                navigate("/create-salon");
            }
        } catch (error) {
            console.error("Error fetching management data:", error);
            showNotification("Failed to load salon details.", "error");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleAddService = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post("/services/add", {
                ...serviceForm,
                salonId: salon._id
            });
            if (response.data.success) {
                setServices([...services, response.data.data]);
                setServiceForm({ name: "", category: "Haircut", price: "", duration: "", description: "" });
                showNotification("Service added successfully!", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add service", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post("/staff/add", {
                ...staffForm,
                salonId: salon._id,
                skills: staffForm.skills.split(",").map(s => s.trim())
            });
            if (response.data.success) {
                setStaff([...staff, response.data.data]);
                setStaffForm({ name: "", role: "", experience: "", skills: "" });
                showNotification("Staff member added!", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add staff", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteService = async (id) => {
        try {
            const response = await axiosInstance.delete(`/services/${id}`);
            if (response.data.success) {
                setServices(services.filter(s => s._id !== id));
                showNotification("Service removed", "success");
            }
        } catch (error) {
            showNotification("Failed to delete service", "error");
        }
    };

    const handleDeleteStaff = async (id) => {
        try {
            const response = await axiosInstance.delete(`/staff/${id}`);
            if (response.data.success) {
                setStaff(staff.filter(s => s._id !== id));
                showNotification("Staff member removed", "success");
            }
        } catch (error) {
            showNotification("Failed to delete staff", "error");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
                <Loader2 className="w-10 h-10 text-[#D4AF37] animate-spin" />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#fafafa] pt-24 pb-12 px-4 md:px-12 font-sans">
            <div className="max-w-6xl mx-auto">
                {/* Header Card */}
                <div className="bg-white rounded-[32px] p-8 md:p-12 shadow-sm border border-gray-100 mb-8 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-[#D4AF37]/5 rounded-full -mr-32 -mt-32 blur-3xl"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-[#1a1a1a] rounded-[24px] flex items-center justify-center text-white border-2 border-[#D4AF37]">
                                <Store size={32} />
                            </div>
                            <div>
                                <h1 className="text-3xl md:text-4xl font-serif font-bold text-gray-900">{salon?.name}</h1>
                                <p className="text-gray-500 mt-1 flex items-center gap-2">
                                    <Zap size={14} className="text-[#D4AF37]" />
                                    Salon Management Center
                                </p>
                            </div>
                        </div>
                        
                        <div className="flex gap-4">
                            <NavLink 
                                to="/salon/dashboard"
                                className="flex items-center gap-2 px-6 py-3 bg-white border-2 border-gray-100 rounded-2xl text-gray-700 font-bold text-sm hover:border-[#D4AF37] transition-all"
                            >
                                <LayoutDashboard size={18} />
                                View Bookings
                            </NavLink>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-2 mb-8 bg-gray-100/50 p-1.5 rounded-2xl w-fit mx-auto md:mx-0">
                    <button 
                        onClick={() => setTab("services")}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all ${tab === "services" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Scissors size={18} />
                        Services List
                    </button>
                    <button 
                        onClick={() => setTab("staff")}
                        className={`flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-sm transition-all ${tab === "staff" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Users size={18} />
                        Team Members
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    {/* Form Section */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-[28px] p-8 border border-gray-100 shadow-sm sticky top-32">
                            <h2 className="text-xl font-serif font-bold text-gray-900 mb-6 flex items-center gap-2">
                                <Plus size={20} className="text-[#D4AF37]" />
                                {tab === "services" ? "Add New Service" : "Add Team Member"}
                            </h2>

                            {tab === "services" ? (
                                <form onSubmit={handleAddService} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Service Name</label>
                                        <input 
                                            required
                                            value={serviceForm.name}
                                            onChange={e => setServiceForm({...serviceForm, name: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 placeholder-gray-400 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="e.g. Signature Haircut"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Price (₹)</label>
                                            <input 
                                                required
                                                type="number"
                                                value={serviceForm.price}
                                                onChange={e => setServiceForm({...serviceForm, price: e.target.value})}
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                                placeholder="499"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Mins</label>
                                            <input 
                                                required
                                                type="number"
                                                value={serviceForm.duration}
                                                onChange={e => setServiceForm({...serviceForm, duration: e.target.value})}
                                                className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                                placeholder="45"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Description</label>
                                        <textarea 
                                            rows="3"
                                            value={serviceForm.description}
                                            onChange={e => setServiceForm({...serviceForm, description: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none"
                                            placeholder="Tell customers what to expect..."
                                        ></textarea>
                                    </div>
                                    <button 
                                        disabled={isSubmitting}
                                        className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-black transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Save Service"}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleAddStaff} className="space-y-4">
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Staff Name</label>
                                        <input 
                                            required
                                            value={staffForm.name}
                                            onChange={e => setStaffForm({...staffForm, name: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Specialization / Role</label>
                                        <input 
                                            required
                                            value={staffForm.role}
                                            onChange={e => setStaffForm({...staffForm, role: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="e.g. Master Stylist"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Exp (Years)</label>
                                        <input 
                                            type="number"
                                            value={staffForm.experience}
                                            onChange={e => setStaffForm({...staffForm, experience: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="5"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1.5">Skills (Comma separated)</label>
                                        <input 
                                            value={staffForm.skills}
                                            onChange={e => setStaffForm({...staffForm, skills: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="Fading, Coloring, Grooming"
                                        />
                                    </div>
                                    <button 
                                        disabled={isSubmitting}
                                        className="w-full bg-[#1a1a1a] text-white py-4 rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-black transition-all flex items-center justify-center gap-2 mt-4"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Add to Team"}
                                    </button>
                                </form>
                            )}
                        </div>
                    </div>

                    {/* List Section */}
                    <div className="lg:col-span-8">
                        <div className="space-y-4">
                            {tab === "services" ? (
                                services.length > 0 ? (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {services.map(s => (
                                            <div key={s._id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm group hover:shadow-md transition-all flex items-start justify-between">
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-2">
                                                        <span className="bg-orange-50 text-[#D4AF37] px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider border border-orange-100/50">
                                                            {s.category || "General"}
                                                        </span>
                                                        <h3 className="font-bold text-gray-900">{s.name}</h3>
                                                    </div>
                                                    <p className="text-xs text-gray-400 leading-relaxed line-clamp-2">{s.description || "No description provided."}</p>
                                                    <div className="flex items-center gap-4 pt-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-700">
                                                            <IndianRupee size={12} className="text-[#D4AF37]" />
                                                            {s.price}
                                                        </div>
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-gray-400">
                                                            <Clock size={12} />
                                                            {s.duration} min
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteService(s._id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm border-dashed">
                                        <Scissors className="mx-auto text-gray-200 mb-4" size={40} />
                                        <p className="text-gray-500 font-medium italic">No services listed yet. Start adding your menu!</p>
                                    </div>
                                )
                            ) : (
                                staff.length > 0 ? (
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {staff.map(m => (
                                            <div key={m._id} className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm group hover:shadow-md transition-all flex items-start justify-between">
                                                <div className="flex gap-4">
                                                    <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-400">
                                                        <Users size={20} />
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-gray-900">{m.name}</h3>
                                                        <p className="text-xs text-[#D4AF37] font-bold mb-2">{m.role}</p>
                                                        <div className="flex flex-wrap gap-1">
                                                            {m.skills?.map((skill, index) => (
                                                                <span key={index} className="text-[9px] bg-gray-50 px-2 py-0.5 rounded-full text-gray-400 font-medium">{skill}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <button 
                                                    onClick={() => handleDeleteStaff(m._id)}
                                                    className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm border-dashed">
                                        <Users className="mx-auto text-gray-200 mb-4" size={40} />
                                        <p className="text-gray-500 font-medium italic">Your team is empty. Add your expert stylists!</p>
                                    </div>
                                )
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
