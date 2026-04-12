import { useState, useEffect } from "react";
import { useNavigate, NavLink } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";
import { useNotification } from "../context/NotificationContext";
import { 
    Scissors, 
    Users, 
    Plus, 
    Trash2, 
    IndianRupee, 
    Loader2,
    Store,
    Zap,
    Phone,
    Edit2,
    Save,
    X,
    ChevronDown,
    PlusCircle,
    Star,
    CalendarCheck,
    TrendingUp,
    Upload,
    Settings,
    Image as ImageIcon
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";


export function SalonManagementPage() {
    const { user } = useAuth();
    const socket = useSocket();
    const { showNotification } = useNotification();

    const navigate = useNavigate();
    const [salons, setSalons] = useState([]);
    const [activeSalon, setActiveSalon] = useState(null);
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("services"); // "services", "staff", "settings", "gallery"
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSalonSelectorOpen, setIsSalonSelectorOpen] = useState(false);
    const [salonSettings, setSalonSettings] = useState({ name: "", description: "", openingHours: "", closingHours: "", address: "", city: "", state: "", pincode: "" });
    const [newGalleryImages, setNewGalleryImages] = useState([]);

    // Editing States

    const [editingServiceId, setEditingServiceId] = useState(null);
    const [editServiceForm, setEditServiceForm] = useState({ name: "", price: "", description: "" });
    const [editingStaffId, setEditingStaffId] = useState(null);
    const [editStaffForm, setEditStaffForm] = useState({ name: "", role: "", skills: "", profilePic: null });

    // Form States
    const [serviceForm, setServiceForm] = useState({ name: "", category: "Haircut", price: "", description: "" });
    const [staffForm, setStaffForm] = useState({ name: "", role: "", experience: "", skills: "", profilePic: null });

    const fetchData = async () => {
        setLoading(true);
        try {
            const salonRes = await axiosInstance.get("/salons/owner/my-salon");
            if (salonRes.data.success && salonRes.data.data.length > 0) {
                const salonsData = salonRes.data.data;
                setSalons(salonsData);
                
                // Set first salon as active if none selected
                if (!activeSalon) {
                    setActiveSalon(salonsData[0]);
                    setSalonSettings({ 
                        name: salonsData[0].name || "",
                        description: salonsData[0].description || "",
                        openingHours: salonsData[0].openingHours || "", 
                        closingHours: salonsData[0].closingHours || "",
                        address: salonsData[0].address || "",
                        city: salonsData[0].city || "",
                        state: salonsData[0].state || "",
                        pincode: salonsData[0].pincode || ""
                    });
                }

            } else {
                showNotification("No salon found. Please register one first.", "error");
                navigate("/create-salon");
            }
        } catch (error) {
            console.error("Error fetching salons:", error);
            showNotification("Failed to load salon details.", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchSalonDetails = async (salonId) => {
        try {
            const [servRes, staffRes] = await Promise.all([
                axiosInstance.get(`/services/salon/${salonId}`),
                axiosInstance.get(`/staff/salon/${salonId}`)
            ]);

            if (servRes.data.success) setServices(servRes.data.data);
            if (staffRes.data.success) setStaff(staffRes.data.data);
        } catch (error) {
            console.error("Error fetching salon items:", error);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (activeSalon) {
            fetchSalonDetails(activeSalon._id);
            setSalonSettings({ 
                name: activeSalon.name || "",
                description: activeSalon.description || "",
                openingHours: activeSalon.openingHours || "", 
                closingHours: activeSalon.closingHours || "",
                address: activeSalon.address || "",
                city: activeSalon.city || "",
                state: activeSalon.state || "",
                pincode: activeSalon.pincode || ""
            });
        }
    }, [activeSalon]);

    useEffect(() => {
        if (socket && activeSalon) {
            socket.on("bookingUpdate", (data) => {
                // If the booking belongs to the current salon, refresh the data
                if (data.booking.salon === activeSalon._id || data.booking.salon?._id === activeSalon._id) {
                    fetchSalonDetails(activeSalon._id);
                }
            });

            socket.on("salonStatusUpdate", (data) => {
                if (data.salonId === activeSalon._id) {
                    setActiveSalon(prev => ({ ...prev, isOpen: data.isOpen }));
                }
            });

            return () => {
                socket.off("bookingUpdate");
                socket.off("salonStatusUpdate");
            };
        }
    }, [socket, activeSalon]);




    const handleAddService = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await axiosInstance.post("/services/add", {
                ...serviceForm,
                salonId: activeSalon._id
            });
            if (response.data.success) {
                setServices([...services, response.data.data]);
                setServiceForm({ name: "", category: "Haircut", price: "", description: "" });
                showNotification("Service added successfully!", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add service", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateSalonStatus = async () => {
        try {
            const newStatus = !activeSalon.isOpen;
            const response = await axiosInstance.patch(`/salons/${activeSalon._id}`, { isOpen: newStatus });
            if (response.data.success) {
                const updatedSalon = response.data.data;
                setActiveSalon(updatedSalon);
                setSalons(salons.map(s => s._id === updatedSalon._id ? updatedSalon : s));
                showNotification(`Salon is now ${newStatus ? 'Open' : 'Closed'}`, "success");
            }
        } catch (error) {
            showNotification("Failed to update status", "error");
        }
    };

    const handleUpdateSalonSettings = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const response = await axiosInstance.patch(`/salons/${activeSalon._id}`, salonSettings);
            if (response.data.success) {
                const updatedSalon = response.data.data;
                setActiveSalon(updatedSalon);
                setSalons(salons.map(s => s._id === updatedSalon._id ? updatedSalon : s));
                showNotification("Salon details updated", "success");
            }
        } catch (error) {
            showNotification("Failed to update details", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGalleryUpload = async (e) => {
        e.preventDefault();
        if (newGalleryImages.length === 0) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            newGalleryImages.forEach(file => {
                formData.append("images", file);
            });
            
            const response = await axiosInstance.patch(`/salons/${activeSalon._id}`, formData);
            if (response.data.success) {
                setActiveSalon(response.data.data);
                setSalons(salons.map(s => s._id === activeSalon._id ? response.data.data : s));
                setNewGalleryImages([]);
                showNotification("Gallery updated successfully!", "success");
            }
        } catch (error) {
            showNotification("Failed to upload images", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateService = async (id) => {

        setIsSubmitting(true);
        try {
            const response = await axiosInstance.patch(`/services/${id}`, editServiceForm);
            if (response.data.success) {
                setServices(services.map(s => s._id === id ? response.data.data : s));
                setEditingServiceId(null);
                showNotification("Service updated", "success");
            }
        } catch (error) {
            showNotification("Failed to update service", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleAddStaff = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", staffForm.name);
            formData.append("role", staffForm.role);
            formData.append("experience", staffForm.experience);
            formData.append("skills", staffForm.skills);
            formData.append("salonId", activeSalon._id);
            if (staffForm.profilePic) {
                formData.append("profilePic", staffForm.profilePic);
            }

            const response = await axiosInstance.post("/staff/add", formData);
            if (response.data.success) {
                setStaff([...staff, response.data.data]);
                setStaffForm({ name: "", role: "", experience: "", skills: "", profilePic: null });
                showNotification("Staff member added!", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to add staff", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleUpdateStaff = async (id) => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("name", editStaffForm.name);
            formData.append("role", editStaffForm.role);
            formData.append("experience", editStaffForm.experience || "");
            formData.append("skills", editStaffForm.skills);
            if (editStaffForm.profilePic) {
                formData.append("profilePic", editStaffForm.profilePic);
            }

            const response = await axiosInstance.patch(`/staff/${id}`, formData);
            if (response.data.success) {
                setStaff(staff.map(s => s._id === id ? response.data.data : s));
                setEditingStaffId(null);
                showNotification("Staff updated", "success");
            }
        } catch (error) {
            showNotification("Failed to update staff member", "error");
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
        <div className="max-w-[1280px] mx-auto px-6 md:px-10 pt-20 md:pt-24 pb-8 font-sans">
            <div>
                {/* Header & Multi-Salon Selector */}
                <div className="bg-white rounded-[40px] p-6 md:p-10 shadow-sm border border-gray-100 mb-6 relative">
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full -mr-40 -mt-20 blur-3xl"></div>
                    
                    <div className="flex flex-col md:flex-row justify-between items-start lg:items-center gap-8 relative z-10">
                        <div className="flex items-center gap-6">
                            <div className="w-20 h-20 bg-[#1a1a1a] rounded-[28px] flex items-center justify-center text-white border-2 border-[#D4AF37] shadow-xl shadow-[#D4AF37]/10">
                                <Store size={36} />
                            </div>
                            <div>
                                <div className="relative">
                                    <button 
                                        onClick={() => setIsSalonSelectorOpen(!isSalonSelectorOpen)}
                                        className="flex items-center gap-3 text-3xl md:text-4xl font-serif font-black text-gray-900 group"
                                    >
                                        {activeSalon?.name}
                                        <ChevronDown size={28} className={`text-[#D4AF37] transition-transform duration-300 ${isSalonSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    
                                    {isSalonSelectorOpen && (
                                        <div className="absolute top-full left-0 mt-4 w-72 bg-white rounded-3xl shadow-2xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in slide-in-from-top-1 px-4">
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest p-3 border-b border-gray-50 mb-2">My Salons</p>
                                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                                {salons.map(s => (
                                                    <button
                                                        key={s._id}
                                                        onClick={() => {
                                                            setActiveSalon(s);
                                                            setIsSalonSelectorOpen(false);
                                                        }}
                                                        className={`w-full text-left p-3 rounded-2xl flex items-center justify-between transition-all ${activeSalon._id === s._id ? 'bg-[#D4AF37]/10 text-gray-900' : 'hover:bg-gray-50 text-gray-500'}`}
                                                    >
                                                        <span className="font-bold text-sm">{s.name}</span>
                                                        {activeSalon._id === s._id && <Star size={12} className="fill-[#D4AF37] text-[#D4AF37]" />}
                                                    </button>
                                                ))}
                                            </div>
                                            <NavLink 
                                                to="/create-salon"
                                                className="mt-3 flex items-center gap-2 p-3 text-[#D4AF37] font-bold text-xs uppercase tracking-widest hover:bg-gray-50 rounded-2xl transition-all"
                                            >
                                                <PlusCircle size={16} />
                                                Add New Salon
                                            </NavLink>
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-wrap items-center gap-6 mt-3">
                                    <p className="text-gray-400 flex items-center gap-2 font-bold text-[11px] uppercase tracking-wider">
                                        <Zap size={14} className="text-[#D4AF37]" />
                                        Elite Dashboard
                                    </p>
                                    <div className="h-1 w-1 bg-gray-200 rounded-full"></div>
                                    <p className="text-gray-700 flex items-center gap-2 font-bold text-xs">
                                        <Phone size={14} className="text-[#D4AF37]" />
                                        {activeSalon?.contactNumber || "Contact not set"}
                                    </p>
                                    <div className="h-1 w-1 bg-gray-200 rounded-full"></div>
                                    <button 
                                        onClick={() => setTab("settings")}
                                        className="text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#D4AF37] transition-colors"
                                    >
                                        Edit Details
                                    </button>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-4 w-full md:w-auto">
                            {/* Live Status Toggle */}
                            <div className="bg-gray-50 p-2 rounded-2xl flex items-center gap-3">
                                <span className={`text-[10px] font-black uppercase tracking-widest pl-2 ${activeSalon?.isOpen ? 'text-emerald-500' : 'text-red-400'}`}>
                                    {activeSalon?.isOpen ? 'Live Now' : 'Offline'}
                                </span>
                                <button 
                                    onClick={handleUpdateSalonStatus}
                                    className={`w-12 h-6 rounded-full relative transition-all duration-300 ${activeSalon?.isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                >
                                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${activeSalon?.isOpen ? 'left-7' : 'left-1'}`}></div>
                                </button>
                            </div>
                            
                            <NavLink 
                                to="/salon/dashboard"
                                className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold text-xs uppercase tracking-[0.2em] hover:bg-black hover:scale-[1.02] transition-all shadow-xl shadow-black/10"
                            >
                                <CalendarCheck size={18} className="text-[#D4AF37]" />
                                View Bookings
                            </NavLink>
                        </div>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8 pt-6 border-t border-gray-50">
                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-transparent hover:border-[#D4AF37]/20 transition-all group">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Service Menu</p>
                            <div className="flex items-end justify-between">
                                <h4 className="text-3xl font-serif font-black text-gray-900">{services.length}</h4>
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-amber-500">
                                    <Scissors size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-transparent hover:border-[#D4AF37]/20 transition-all">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Master Stylists</p>
                            <div className="flex items-end justify-between">
                                <h4 className="text-3xl font-serif font-black text-gray-900">{staff.length}</h4>
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-emerald-500">
                                    <Users size={20} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gray-50/50 p-6 rounded-3xl border border-transparent hover:border-[#D4AF37]/20 transition-all">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Active Performance</p>
                            <div className="flex items-end justify-between">
                                <h4 className="text-3xl font-serif font-black text-gray-900">Good</h4>
                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm text-blue-500">
                                    <TrendingUp size={20} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>


                {/* Tabs */}
                <div className="flex flex-wrap gap-2 mb-4 bg-gray-100/50 p-1.5 rounded-2xl w-fit mx-auto md:mx-0">
                    <button 
                        onClick={() => setTab("services")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${tab === "services" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Scissors size={18} />
                        Services List
                    </button>
                    <button 
                        onClick={() => setTab("staff")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${tab === "staff" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Users size={18} />
                        Team Members
                    </button>
                    <button 
                        onClick={() => setTab("settings")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${tab === "settings" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Settings size={18} />
                        Salon Settings
                    </button>
                    <button 
                        onClick={() => setTab("gallery")}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${tab === "gallery" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <ImageIcon size={18} />
                        Gallery
                    </button>
                </div>
                
                {tab === "settings" && (
                    <div className="bg-white rounded-[40px] p-6 md:p-10 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6">
                            <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Salon Settings</h2>
                            <p className="text-gray-500 text-sm">Manage your salon's basic information, location, and operational schedule.</p>
                        </div>
                        <form onSubmit={handleUpdateSalonSettings} className="space-y-6 max-w-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Salon Name</label>
                                    <input 
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                        value={salonSettings.name}
                                        onChange={e => setSalonSettings({...salonSettings, name: e.target.value})}
                                        placeholder="Salon Name"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Description</label>
                                    <textarea 
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all resize-none h-32"
                                        value={salonSettings.description}
                                        onChange={e => setSalonSettings({...salonSettings, description: e.target.value})}
                                        placeholder="Tell customers about your salon..."
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Street Address</label>
                                    <input 
                                        className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                        value={salonSettings.address}
                                        onChange={e => setSalonSettings({...salonSettings, address: e.target.value})}
                                        placeholder="123 Main St"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">State</label>
                                        <select 
                                            required
                                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all appearance-none cursor-pointer"
                                            value={salonSettings.state}
                                            onChange={e => setSalonSettings({...salonSettings, state: e.target.value})}
                                            style={{
                                                backgroundImage: "url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%231A1A1A%22%20d%3D%22M287%2069.4a17.6%2017.6%200%200%200-13-5.4H18.4c-5%200-9.3%201.8-12.9%205.4A17.6%2017.6%200%200%200%200%2082.2c0%205%201.8%209.3%205.4%2012.9l128%20127.9c3.6%203.6%207.8%205.4%2012.8%205.4s9.2-1.8%2012.8-5.4L287%2095c3.5-3.5%205.4-7.8%205.4-12.8%200-5-1.9-9.2-5.5-12.8z%22%2F%3E%3C%2Fsvg%3E')",
                                                backgroundRepeat: 'no-repeat',
                                                backgroundPosition: 'right 1.25rem top 50%',
                                                backgroundSize: '0.65rem auto',
                                                paddingRight: '2.5rem'
                                            }}
                                        >
                                            <option value="">Select State</option>
                                            <option value="Andhra Pradesh">Andhra Pradesh</option>
                                            <option value="Arunachal Pradesh">Arunachal Pradesh</option>
                                            <option value="Assam">Assam</option>
                                            <option value="Bihar">Bihar</option>
                                            <option value="Chhattisgarh">Chhattisgarh</option>
                                            <option value="Goa">Goa</option>
                                            <option value="Gujarat">Gujarat</option>
                                            <option value="Haryana">Haryana</option>
                                            <option value="Himachal Pradesh">Himachal Pradesh</option>
                                            <option value="Jharkhand">Jharkhand</option>
                                            <option value="Karnataka">Karnataka</option>
                                            <option value="Kerala">Kerala</option>
                                            <option value="Madhya Pradesh">Madhya Pradesh</option>
                                            <option value="Maharashtra">Maharashtra</option>
                                            <option value="Manipur">Manipur</option>
                                            <option value="Meghalaya">Meghalaya</option>
                                            <option value="Mizoram">Mizoram</option>
                                            <option value="Nagaland">Nagaland</option>
                                            <option value="Odisha">Odisha</option>
                                            <option value="Punjab">Punjab</option>
                                            <option value="Rajasthan">Rajasthan</option>
                                            <option value="Sikkim">Sikkim</option>
                                            <option value="Tamil Nadu">Tamil Nadu</option>
                                            <option value="Telangana">Telangana</option>
                                            <option value="Tripura">Tripura</option>
                                            <option value="Uttar Pradesh">Uttar Pradesh</option>
                                            <option value="Uttarakhand">Uttarakhand</option>
                                            <option value="West Bengal">West Bengal</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">City</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                            value={salonSettings.city}
                                            onChange={e => setSalonSettings({...salonSettings, city: e.target.value})}
                                            placeholder="Mumbai"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Pincode / Zip Code</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                            value={salonSettings.pincode}
                                            onChange={e => setSalonSettings({...salonSettings, pincode: e.target.value})}
                                            placeholder="400053"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Opens At</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                            value={salonSettings.openingHours}
                                            onChange={e => setSalonSettings({...salonSettings, openingHours: e.target.value})}
                                            placeholder="9:00 AM"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Closes At</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-2xl px-5 py-4 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                            value={salonSettings.closingHours}
                                            onChange={e => setSalonSettings({...salonSettings, closingHours: e.target.value})}
                                            placeholder="8:00 PM"
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="pt-6 border-t border-gray-50">
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="px-8 bg-[#D4AF37] text-white py-4 rounded-2xl font-bold text-sm tracking-widest uppercase hover:bg-[#B8962E] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#D4AF37]/20"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {tab === "gallery" && (
                    <div className="bg-white rounded-[40px] p-6 md:p-10 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h2 className="text-2xl font-serif font-bold text-gray-900 mb-2">Photo Gallery</h2>
                                <p className="text-gray-500 text-sm">Upload high-quality images to showcase your space to potential clients.</p>
                            </div>
                        </div>

                        <form onSubmit={handleGalleryUpload} className="mb-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-[32px] p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors">
                            <input 
                                type="file" 
                                multiple
                                accept="image/*"
                                onChange={(e) => setNewGalleryImages(Array.from(e.target.files))}
                                className="hidden"
                                id="gallery-upload"
                            />
                            <label htmlFor="gallery-upload" className="cursor-pointer block">
                                <div className="w-16 h-16 mx-auto bg-white rounded-full flex items-center justify-center text-[#D4AF37] shadow-sm mb-4">
                                    <Upload size={24} />
                                </div>
                                <h4 className="text-lg font-bold text-gray-900 mb-1">Click to browse images</h4>
                                <p className="text-sm text-gray-500 mb-6">PNG, JPG up to 5MB each. You selected {newGalleryImages.length} files.</p>
                            </label>
                            {newGalleryImages.length > 0 && (
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    onClick={(e) => e.stopPropagation()}
                                    className="bg-[#1a1a1a] text-white px-8 py-3 rounded-full font-bold text-sm uppercase tracking-widest inline-flex items-center gap-2 hover:bg-black transition-colors"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Upload Images"}
                                </button>
                            )}
                        </form>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {activeSalon?.images?.length > 0 ? (
                                activeSalon.images.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-2xl overflow-hidden shadow-sm border border-gray-100 group relative">
                                        <img src={img} alt={`Gallery Image ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-gray-400 italic">No images currently in gallery.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {(tab === "services" || tab === "staff") && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Form Section */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-[28px] p-6 border border-gray-100 shadow-sm sticky top-32">
                            <h2 className="text-xl font-serif font-bold text-gray-900 mb-4 flex items-center gap-2">
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
                                    <div className="grid grid-cols-1 gap-4">
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
                        <div className="space-y-2">
                             {tab === "services" ? (
                                 services.length > 0 ? (
                                     <div className="grid sm:grid-cols-2 gap-6">
                                         {services.map(s => (
                                             <div key={s._id} className="bg-white p-4 rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-xl hover:-translate-y-1 transition-all flex flex-col items-start justify-between">
                                                 {editingServiceId === s._id ? (
                                                     <div className="w-full space-y-4">
                                                         <input 
                                                             className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-sm"
                                                             value={editServiceForm.name}
                                                             onChange={e => setEditServiceForm({...editServiceForm, name: e.target.value})}
                                                         />
                                                         <input 
                                                             className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm"
                                                             type="number"
                                                             value={editServiceForm.price}
                                                             onChange={e => setEditServiceForm({...editServiceForm, price: e.target.value})}
                                                         />
                                                         <textarea 
                                                             className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-xs"
                                                             value={editServiceForm.description}
                                                             onChange={e => setEditServiceForm({...editServiceForm, description: e.target.value})}
                                                         />
                                                         <div className="flex gap-2">
                                                             <button onClick={() => handleUpdateService(s._id)} className="flex-1 bg-[#1a1a1a] text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
                                                                 <Save size={14} /> Save
                                                             </button>
                                                             <button onClick={() => setEditingServiceId(null)} className="px-4 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition-all font-bold text-xs"><X size={14} /></button>
                                                         </div>
                                                     </div>
                                                 ) : (
                                                     <>
                                                         <div className="w-full">
                                                             <div className="flex items-center justify-between mb-4">
                                                                 <span className="bg-[#D4AF37]/5 text-[#D4AF37] px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border border-[#D4AF37]/10">
                                                                     {s.category || "Premium"}
                                                                 </span>
                                                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                     <button 
                                                                         onClick={() => {
                                                                             setEditingServiceId(s._id);
                                                                             setEditServiceForm({ name: s.name, price: s.price, description: s.description || "" });
                                                                         }}
                                                                         className="p-2 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 rounded-xl transition-all"
                                                                     >
                                                                         <Edit2 size={16} />
                                                                     </button>
                                                                     <button 
                                                                         onClick={() => handleDeleteService(s._id)}
                                                                         className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                                     >
                                                                         <Trash2 size={16} />
                                                                     </button>
                                                                 </div>
                                                             </div>
                                                             <h3 className="text-lg font-bold text-gray-900 mb-2">{s.name}</h3>
                                                             <p className="text-xs text-gray-400 leading-relaxed line-clamp-3 mb-4">{s.description || "Indulge in our premium signature treatment designed for excellence."}</p>
                                                             <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                                                                 <div className="flex items-center gap-1.5 text-lg font-black text-gray-900">
                                                                     <IndianRupee size={16} className="text-[#D4AF37]" />
                                                                     {s.price}
                                                                 </div>
                                                                 <div className="p-2 rounded-full bg-gray-50 text-gray-300">
                                                                     <Scissors size={14} />
                                                                 </div>
                                                             </div>
                                                         </div>
                                                     </>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm border-dashed">
                                         <Scissors className="mx-auto text-gray-200 mb-4" size={40} />
                                         <p className="text-gray-500 font-medium italic">No services listed yet.</p>
                                     </div>
                                 )
                             ) : (
                                 staff.length > 0 ? (
                                     <div className="grid sm:grid-cols-2 gap-6">
                                         {staff.map(m => (
                                             <div key={m._id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm group hover:shadow-xl transition-all">
                                                 {editingStaffId === m._id ? (
                                                     <div className="space-y-4">
                                                         <input 
                                                             className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 font-bold text-sm"
                                                             value={editStaffForm.name}
                                                             onChange={e => setEditStaffForm({...editStaffForm, name: e.target.value})}
                                                         />
                                                         <input 
                                                             className="w-full bg-gray-50 border-none rounded-xl px-4 py-2 text-sm"
                                                             value={editStaffForm.role}
                                                             onChange={e => setEditStaffForm({...editStaffForm, role: e.target.value})}
                                                         />
                                                         <div className="flex gap-2">
                                                             <button onClick={() => handleUpdateStaff(m._id)} className="flex-1 bg-[#1a1a1a] text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
                                                                 <Save size={14} /> Save
                                                             </button>
                                                             <button onClick={() => setEditingStaffId(null)} className="px-4 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition-all font-bold text-xs"><X size={14} /></button>
                                                         </div>
                                                     </div>
                                                 ) : (
                                                     <div className="flex items-start justify-between">
                                                         <div className="flex gap-4">
                                                             <div className="w-14 h-14 rounded-2xl bg-gray-900 flex items-center justify-center text-[#D4AF37] border-2 border-[#D4AF37]/20">
                                                                 <Users size={24} />
                                                             </div>
                                                             <div>
                                                                 <h3 className="font-bold text-gray-900 text-lg">{m.name}</h3>
                                                                 <p className="text-xs text-[#D4AF37] font-black uppercase tracking-widest mt-1">{m.role}</p>
                                                                 <div className="flex flex-wrap gap-1 mt-3">
                                                                     {m.skills?.map((skill, index) => (
                                                                         <span key={index} className="text-[10px] bg-gray-50 px-3 py-1 rounded-full text-gray-500 font-bold border border-gray-100">{skill}</span>
                                                                     ))}
                                                                 </div>
                                                             </div>
                                                         </div>
                                                         <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                             <button 
                                                                 onClick={() => {
                                                                     setEditingStaffId(m._id);
                                                                     setEditStaffForm({ name: m.name, role: m.role, skills: m.skills?.join(", ") });
                                                                 }}
                                                                 className="p-2 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 rounded-xl transition-all"
                                                             >
                                                                 <Edit2 size={16} />
                                                             </button>
                                                             <button 
                                                                 onClick={() => handleDeleteStaff(m._id)}
                                                                 className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                             >
                                                                 <Trash2 size={16} />
                                                             </button>
                                                         </div>
                                                     </div>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-sm border-dashed">
                                         <Users className="mx-auto text-gray-200 mb-4" size={40} />
                                         <p className="text-gray-500 font-medium italic">Your team is empty.</p>
                                     </div>
                                 )
                             )}

                        </div>
                    </div>
                </div>
                )}
            </div>
        </div>
    );
}
