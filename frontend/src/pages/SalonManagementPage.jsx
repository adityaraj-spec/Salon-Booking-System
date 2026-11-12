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
    Award,
    CalendarCheck,
    TrendingUp,
    Upload,
    Settings,
    MapPin,
    Image as ImageIcon
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useSocket } from "../context/SocketContext";
import useDocumentTitle from "../hooks/useDocumentTitle";
import { SalonManagementSkeleton } from "../components/skeletons/index.jsx";

const formatLabel = (value, fallback = "") => {
    if (!value) return fallback;
    return value.toString().replace(/\b\w/g, (character) => character.toUpperCase());
};

export function SalonManagementPage() {
    useDocumentTitle('Salon Management', 'Edit salon hours, staff schedules, pricing, and profile on SalonNow.');
    const { user } = useAuth();
    const socket = useSocket();
    const { showNotification } = useNotification();

    const navigate = useNavigate();
    const [salons, setSalons] = useState([]);
    const [activeSalon, setActiveSalon] = useState(null);
    const [seatAvailability, setSeatAvailability] = useState(null);
    const [services, setServices] = useState([]);
    const [staff, setStaff] = useState([]);
    const [loading, setLoading] = useState(true);
    const [tab, setTab] = useState("services"); // "services", "staff", "settings", "gallery"
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSalonSelectorOpen, setIsSalonSelectorOpen] = useState(false);
    const [salonSettings, setSalonSettings] = useState({ name: "", description: "", openingHours: "", closingHours: "", address: "", city: "", state: "", pincode: "" });
    const [newGalleryImages, setNewGalleryImages] = useState([]);
    const [newWorkImages, setNewWorkImages] = useState([]);
    const [deletingWorkImage, setDeletingWorkImage] = useState(null);

    // Editing States

    const [editingServiceId, setEditingServiceId] = useState(null);
    const [editServiceForm, setEditServiceForm] = useState({ name: "", price: "", description: "" });
    const [editingStaffId, setEditingStaffId] = useState(null);
    const [editStaffForm, setEditStaffForm] = useState({ name: "", role: "", experience: "", skills: "", profilePic: null });

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
            // silently fail — salon data still shown, items are empty
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
            socket.emit("joinSalon", activeSalon._id);
            const handleBookingUpdate = (data) => {
                // If the booking belongs to the current salon, refresh the data
                const eventSalon = data?.booking?.salon?._id || data?.booking?.salon || data?.salonId;
                if (String(eventSalon) === String(activeSalon._id)) {
                    fetchSalonDetails(activeSalon._id);
                }
            };
            const handleSeatStatus = (data) => {
                if (String(data?.salonId) === String(activeSalon._id)) setSeatAvailability(data);
            };
            socket.on("bookingUpdate", handleBookingUpdate);
            socket.on("seatStatusUpdated", handleSeatStatus);

            socket.on("salonStatusUpdate", (data) => {
                if (data.salonId === activeSalon._id) {
                    setActiveSalon(prev => ({ ...prev, isOpen: data.isOpen }));
                }
            });

            return () => {
                socket.off("bookingUpdate");
                socket.off("seatStatusUpdated", handleSeatStatus);
                socket.off("salonStatusUpdate");
                socket.emit("leaveSalon", activeSalon._id);
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
            
            const response = await axiosInstance.patch(`/salons/${activeSalon._id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
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

    const handleWorkUpload = async (e) => {
        e.preventDefault();
        if (newWorkImages.length === 0) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("transformationGallery", JSON.stringify(activeSalon?.transformationGallery || []));
            newWorkImages.forEach((file) => formData.append("transformationPhotos", file));
            const response = await axiosInstance.patch(`/salons/${activeSalon._id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (response.data.success) {
                setActiveSalon(response.data.data);
                setSalons((current) => current.map((salon) => salon._id === activeSalon._id ? response.data.data : salon));
                setNewWorkImages([]);
                showNotification("Our Work gallery updated", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to upload work photos", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRemoveWorkImage = async (imageUrl) => {
        setDeletingWorkImage(imageUrl);
        try {
            const remainingImages = (activeSalon?.transformationGallery || []).filter((url) => url !== imageUrl);
            const formData = new FormData();
            formData.append("transformationGallery", JSON.stringify(remainingImages));
            const response = await axiosInstance.patch(`/salons/${activeSalon._id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            if (response.data.success) {
                setActiveSalon(response.data.data);
                setSalons((current) => current.map((salon) => salon._id === activeSalon._id ? response.data.data : salon));
                showNotification("Work photo removed", "success");
            }
        } catch (error) {
            showNotification(error.response?.data?.message || "Failed to remove work photo", "error");
        } finally {
            setDeletingWorkImage(null);
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

            const response = await axiosInstance.post("/staff/add", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
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

            const response = await axiosInstance.patch(`/staff/${id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
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
        return <SalonManagementSkeleton />;
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 md:pt-24 pb-8 font-sans">
            <div>
                <header className="mb-6">
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">Manage your salon</h1>
                    <p className="text-gray-500 mt-2">Update your salon details, services, staff, and gallery.</p>
                    <p className="mt-2 text-sm font-medium text-emerald-700">{seatAvailability ? `${seatAvailability.availableSeats}/${seatAvailability.totalSeats} seats free` : `${activeSalon?.totalSeats || 0} total seats`}</p>
                </header>
                {/* Header & Multi-Salon Selector */}
                {/* Header & Multi-Salon Selector - Redesigned 3-Column Layout */}
                <div className="bg-white rounded-xl p-6 lg:p-10 shadow-sm border border-gray-100 mb-8 relative overflow-hidden flex flex-col lg:flex-row gap-8 lg:gap-12">
                    {/* Background decoration */}
                    <div className="absolute top-0 right-0 w-80 h-80 bg-[#D4AF37]/5 rounded-full -mr-40 -mt-20 blur-3xl"></div>
                    
                    {/* COLUMN 1: Visual (Image) */}
                    <div className="w-full lg:w-72 h-72 lg:h-auto rounded-xl overflow-hidden shrink-0 shadow-lg border border-white relative group">
                        {activeSalon?.images?.[0] ? (
                            <img 
                                src={activeSalon.images[0]} 
                                alt={activeSalon.name} 
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                            />
                        ) : (
                            <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center text-white">
                                <Store size={48} />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                    </div>

                    {/* COLUMN 2: SALON INFO (Middle) */}
                    <div className="flex-1 flex flex-col justify-center py-2 relative z-10">
                        <div className="space-y-6">
                            <div>
                                <div className="relative inline-block group">
                                    <button 
                                        onClick={() => setIsSalonSelectorOpen(!isSalonSelectorOpen)}
                                        className="flex items-center gap-3 text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 group"
                                    >
                                        {activeSalon?.name || "Salon Name"}
                                        <ChevronDown size={24} className={`text-[#D4AF37] transition-transform duration-300 ${isSalonSelectorOpen ? 'rotate-180' : ''}`} />
                                    </button>
                                    <span className="block h-1.5 w-16 bg-[#D4AF37] mt-3 rounded-full group-hover:w-32 transition-all duration-500"></span>
                                    
                                    {isSalonSelectorOpen && (
                                        <div className="absolute top-full left-0 mt-4 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 p-3 z-50 animate-in fade-in zoom-in slide-in-from-top-1 px-4">
                                            <p className="ui-label p-3 border-b border-gray-50 mb-2">My Salons</p>
                                            <div className="space-y-1 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
                                                {salons.map(s => (
                                                    <button
                                                        key={s._id}
                                                        onClick={() => {
                                                            setActiveSalon(s);
                                                            setIsSalonSelectorOpen(false);
                                                        }}
                                                        className={`w-full text-left p-3 rounded-lg flex items-center justify-between transition-all ${activeSalon?._id === s._id ? 'bg-[#D4AF37]/10 text-gray-900' : 'hover:bg-gray-50 text-gray-500'}`}
                                                    >
                                                        <span className="font-bold text-sm">{s.name}</span>
                                                        {activeSalon?._id === s._id && <Star size={12} className="fill-[#D4AF37] text-[#D4AF37]" />}
                                                    </button>
                                                ))}
                                            </div>
                                            <NavLink 
                                                to="/create-salon"
                                                className="mt-3 flex items-center gap-2 p-3 text-[#D4AF37] text-sm font-normal hover:bg-gray-50 rounded-lg transition-all"
                                            >
                                                <PlusCircle size={16} />
                                                Add New Salon
                                            </NavLink>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-3 text-gray-500 bg-gray-50/80 w-fit px-4 py-3 rounded-xl border border-gray-100 max-w-sm lg:max-w-md">
                                <MapPin size={22} className="text-[#D4AF37] shrink-0 mt-0.5" />
                                <div className="flex flex-col">
                                    <span className="text-sm font-normal leading-relaxed text-gray-600">{activeSalon?.address || "No address provided"}</span>
                                    <span className="mt-1 text-xs font-normal text-gray-500">{formatLabel(activeSalon?.city, "Location details")}</span>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-center gap-3">
                                <div className="bg-white px-3.5 py-2 rounded-xl flex items-center gap-2.5 border border-gray-200">
                                    <span className={`text-sm font-medium ${activeSalon?.isOpen ? 'text-emerald-700' : 'text-gray-500'}`}>
                                        {activeSalon?.isOpen ? 'Open' : 'Close'}
                                    </span>
                                    <button 
                                        onClick={handleUpdateSalonStatus}
                                        aria-label={activeSalon?.isOpen ? 'Pause salon' : 'Set salon live'}
                                        aria-pressed={Boolean(activeSalon?.isOpen)}
                                        className={`w-10 h-[22px] rounded-full relative transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 ${activeSalon?.isOpen ? 'bg-emerald-500' : 'bg-gray-300'}`}
                                    >
                                        <div className={`absolute top-[3px] size-4 bg-white rounded-full shadow-sm transition-all duration-200 ${activeSalon?.isOpen ? 'left-[21px]' : 'left-[3px]'}`}></div>
                                    </button>
                                </div>
                                <button 
                                    onClick={() => setTab("settings")}
                                    className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-gray-300 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4AF37]/40"
                                >
                                    <Settings size={15} strokeWidth={1.8} className="text-gray-500" />
                                    Edit Details
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* COLUMN 3: STATS & ACTIONS (Right) */}
                    <div className="lg:w-[38%] bg-gray-50/50 rounded-xl p-6 lg:p-8 border border-gray-100 flex flex-col justify-center gap-6 relative z-10">
                            <div className="grid grid-cols-2 gap-3">
                            {/* Service Menu Stat */}
                            <div className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-center gap-3 min-w-0">
                                <div className="size-9 bg-amber-50 rounded-full flex items-center justify-center text-[#B88A16] shrink-0">
                                    <Scissors size={18} strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-500 leading-none mb-1">Services</p>
                                    <h4 className="text-lg font-semibold text-gray-900">{services.length}</h4>
                                </div>
                            </div>

                            {/* Staff Stat */}
                            <div className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-center gap-3 min-w-0">
                                <div className="size-9 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-700 shrink-0">
                                    <Users size={18} strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-500 leading-none mb-1">Stylists</p>
                                    <h4 className="text-lg font-semibold text-gray-900">{staff.length}</h4>
                                </div>
                            </div>

                            {/* Performance Stat */}
                            <div className="bg-white p-3.5 rounded-xl border border-gray-100 flex items-center gap-3 min-w-0">
                                <div className="size-9 bg-amber-50 rounded-full flex items-center justify-center text-[#B88A16] shrink-0">
                                    <TrendingUp size={18} strokeWidth={1.8} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-medium text-gray-500 leading-none mb-1">Status</p>
                                    <h4 className="text-base font-semibold text-gray-900">{activeSalon?.isOpen ? "Open" : "Offline"}</h4>
                                </div>
                            </div>

                            {/* View Bookings Button (Integrated into grid) */}
                            <NavLink 
                                to="/salon/dashboard"
                                className="bg-white hover:bg-gray-50 text-gray-800 p-3.5 rounded-xl border border-gray-100 flex items-center gap-3 transition-colors"
                            >
                                <span className="size-9 bg-gray-100 rounded-full flex items-center justify-center text-[#B88A16]"><CalendarCheck size={18} strokeWidth={1.8} /></span>
                                <span className="text-xs sm:text-sm font-medium">Bookings</span>
                            </NavLink>
                        </div>
                    </div>
                </div>


                {/* Tabs */}
                <div className="flex w-full sm:w-fit flex-nowrap sm:flex-wrap gap-2 mb-4 bg-gray-100/50 p-1.5 rounded-xl mx-auto md:mx-0 overflow-x-auto sm:overflow-visible whitespace-nowrap scroll-smooth">
                    <button 
                        onClick={() => setTab("services")}
                        className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-medium sm:font-semibold md:font-bold text-xs sm:text-sm transition-all ${tab === "services" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Scissors size={18} />
                        Services List
                    </button>
                    <button 
                        onClick={() => setTab("staff")}
                        className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-medium sm:font-semibold md:font-bold text-xs sm:text-sm transition-all ${tab === "staff" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Users size={18} />
                        Team Members
                    </button>
                    <button 
                        onClick={() => setTab("settings")}
                        className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-medium sm:font-semibold md:font-bold text-xs sm:text-sm transition-all ${tab === "settings" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <Settings size={18} />
                        Salon Settings
                    </button>
                    <button 
                        onClick={() => setTab("gallery")}
                        className={`shrink-0 flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-lg font-medium sm:font-semibold md:font-bold text-xs sm:text-sm transition-all ${tab === "gallery" ? "bg-white text-[#1a1a1a] shadow-sm" : "text-gray-500 hover:text-gray-700"}`}
                    >
                        <ImageIcon size={18} />
                        Gallery
                    </button>
                </div>
                
                {tab === "settings" && (
                    <div className="bg-white rounded-xl p-4 sm:p-6 md:p-8 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6">
                            <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">Salon Settings</h2>
                            <p className="text-gray-500 text-sm">Manage your salon's basic information, location, and operational schedule.</p>
                        </div>
                        <form onSubmit={handleUpdateSalonSettings} noValidate className="space-y-6 max-w-3xl">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="ui-label">Salon Name</label>
                                    <input 
                                        className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                        value={salonSettings.name}
                                        onChange={e => setSalonSettings({...salonSettings, name: e.target.value})}
                                        placeholder="Salon Name"
                                        required
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="ui-label">Description</label>
                                    <textarea 
                                        className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all resize-none h-32"
                                        value={salonSettings.description}
                                        onChange={e => setSalonSettings({...salonSettings, description: e.target.value})}
                                        placeholder="Tell customers about your salon..."
                                    />
                                </div>
                                <div className="space-y-1.5 md:col-span-2">
                                    <label className="ui-label">Street Address</label>
                                    <input 
                                        className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                        value={salonSettings.address}
                                        onChange={e => setSalonSettings({...salonSettings, address: e.target.value})}
                                        placeholder="123 Main St"
                                        required
                                    />
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 md:col-span-2">
                                    <div className="space-y-1.5">
                                        <label className="ui-label">State</label>
                                        <select 
                                            required
                                            className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all appearance-none cursor-pointer"
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
                                        <label className="ui-label">City</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                            value={salonSettings.city}
                                            onChange={e => setSalonSettings({...salonSettings, city: e.target.value})}
                                            placeholder="Mumbai"
                                            required
                                        />
                                    </div>
                                    <div className="space-y-1.5 md:col-span-2">
                                        <label className="ui-label">Pincode / Zip Code</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                            value={salonSettings.pincode}
                                            onChange={e => setSalonSettings({...salonSettings, pincode: e.target.value})}
                                            placeholder="400053"
                                            required
                                        />
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                    <div className="space-y-1.5">
                                        <label className="ui-label">Opens At</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
                                            value={salonSettings.openingHours}
                                            onChange={e => setSalonSettings({...salonSettings, openingHours: e.target.value})}
                                            placeholder="9:00 AM"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="ui-label">Closes At</label>
                                        <input 
                                            className="w-full bg-gray-50 border-none rounded-lg px-4 py-3 font-bold text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
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
                                    className="salon-action-button salon-action-button--primary px-8 py-4 rounded-xl shadow-xl shadow-[#D4AF37]/20"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Save Changes"}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {tab === "gallery" && (
                    <div className="bg-white rounded-xl p-6 md:p-10 border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900 tracking-tight mb-4">Photo Gallery</h2>
                                <p className="text-gray-500 text-sm">Upload high-quality images to showcase your space to potential clients.</p>
                            </div>
                        </div>

                        <form onSubmit={handleGalleryUpload} noValidate className="mb-12 bg-gray-50/50 border border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors">
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
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">Click to browse images</h4>
                                <p className="text-sm text-gray-500 mb-6">PNG, JPG up to 5MB each. You selected {newGalleryImages.length} files.</p>
                            </label>
                            {newGalleryImages.length > 0 && (
                                <button 
                                    type="submit"
                                    disabled={isSubmitting}
                                    onClick={(e) => e.stopPropagation()}
                                    className="salon-action-button salon-action-button--dark px-8 rounded-xl"
                                >
                                    {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Upload Images"}
                                </button>
                            )}
                        </form>

                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                            {activeSalon?.images?.length > 0 ? (
                                activeSalon.images.map((img, idx) => (
                                    <div key={idx} className="aspect-square rounded-xl overflow-hidden shadow-sm border border-gray-100 group relative">
                                        <img src={img} alt={`Gallery Image ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    </div>
                                ))
                            ) : (
                                <div className="col-span-full text-center py-12">
                                    <p className="text-gray-400 italic">No images currently in gallery.</p>
                                </div>
                            )}
                        </div>

                        <section className="mt-8 border-t border-gray-100 pt-6">
                            <div className="mb-4">
                                <h2 className="text-lg font-semibold text-gray-900">Our Work</h2>
                                <p className="mt-1 text-sm text-gray-500">Add transformation photos and style showcases. They appear in the Our Work section on your salon page.</p>
                            </div>
                            <form onSubmit={handleWorkUpload} className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-4 sm:p-5">
                                <label htmlFor="work-upload" className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                                    <Upload size={16} className="text-[#B88A16]" /> Add Work Photos
                                    <input id="work-upload" type="file" multiple accept="image/*" className="sr-only" onChange={(event) => setNewWorkImages(Array.from(event.target.files || []))} />
                                </label>
                                <span className="ml-3 text-xs text-gray-500">{newWorkImages.length} selected</span>
                                {newWorkImages.length > 0 && <button type="submit" disabled={isSubmitting} className="ml-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#1a1a1a] px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60">{isSubmitting ? <Loader2 size={15} className="animate-spin" /> : null} Upload Photos</button>}
                            </form>
                            {activeSalon?.transformationGallery?.length > 0 ? <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">{activeSalon.transformationGallery.map((image, index) => <div key={`${image}-${index}`} className="group relative aspect-square overflow-hidden rounded-lg border border-gray-100 shadow-sm"><img src={image} alt={`Our work ${index + 1}`} className="h-full w-full object-cover" /><button type="button" onClick={() => handleRemoveWorkImage(image)} disabled={deletingWorkImage === image} aria-label={`Delete work photo ${index + 1}`} className="absolute right-2 top-2 inline-flex size-9 items-center justify-center rounded-full bg-white/95 text-gray-600 shadow-md transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-wait disabled:opacity-60"><Trash2 size={16} />{deletingWorkImage === image && <span className="sr-only">Deleting image</span>}</button></div>)}</div> : <p className="mt-4 text-sm text-gray-500">Your work photos will appear here after upload.</p>}
                        </section>
                    </div>
                )}

                {(tab === "services" || tab === "staff") && (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Form Section */}
                    <div className="lg:col-span-4">
                        <div className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm sticky top-32">
                            <h2 className="text-xl font-sans font-semibold text-gray-900 mb-4 flex items-center gap-2">
                                <Plus size={20} className="text-[#D4AF37]" />
                                {tab === "services" ? "Add New Service" : "Add Team Member"}
                            </h2>

                            {tab === "services" ? (
                                <form onSubmit={handleAddService} noValidate className="space-y-4">
                                    <div>
                                        <label className="ui-label block mb-1.5">Service Name</label>
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
                                            <label className="ui-label block mb-1.5">Price (₹)</label>
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
                                        <label className="ui-label block mb-1.5">Description</label>
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
                                        className="salon-action-button salon-action-button--dark w-full py-4 rounded-xl mt-4"
                                    >
                                        {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : "Save Service"}
                                    </button>
                                </form>
                            ) : (
                                <form onSubmit={handleAddStaff} noValidate className="space-y-4">
                                    <div>
                                        <label className="ui-label block mb-1.5">Staff Name</label>
                                        <input 
                                            required
                                            value={staffForm.name}
                                            onChange={e => setStaffForm({...staffForm, name: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="Full Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="ui-label block mb-1.5">Specialization / Role</label>
                                        <input 
                                            required
                                            value={staffForm.role}
                                            onChange={e => setStaffForm({...staffForm, role: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="e.g. Master Stylist"
                                        />
                                    </div>
                                    <div>
                                        <label className="ui-label block mb-1.5">Experience (Years)</label>
                                        <input 
                                            type="number"
                                            value={staffForm.experience}
                                            onChange={e => setStaffForm({...staffForm, experience: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="5"
                                        />
                                    </div>
                                    <div>
                                        <label className="ui-label block mb-1.5">Skills (Comma separated)</label>
                                        <input 
                                            value={staffForm.skills}
                                            onChange={e => setStaffForm({...staffForm, skills: e.target.value})}
                                            className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                                            placeholder="Fading, Coloring, Grooming"
                                        />
                                    </div>
                                    <button 
                                        disabled={isSubmitting}
                                        className="salon-action-button salon-action-button--dark w-full py-4 rounded-xl mt-4"
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
                                     <div className="grid sm:grid-cols-2 gap-3 sm:gap-4">
                                         {services.map(s => (
                                             <div key={s._id} className="bg-white p-3 sm:p-3.5 rounded-xl border border-gray-100 shadow-sm group hover:shadow-md transition-shadow flex flex-col items-start justify-between">
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
                                                             <div className="flex items-center justify-between mb-2">
                                                                 <span className="ui-badge bg-[#D4AF37]/5 px-2.5 py-1 rounded-full border border-[#D4AF37]/10">
                                                                     {formatLabel(s.category, "Premium")}
                                                                 </span>
                                                                 <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                     <button 
                                                                         onClick={() => {
                                                                             setEditingServiceId(s._id);
                                                                             setEditServiceForm({ name: s.name, price: s.price, description: s.description || "" });
                                                                         }}
                                                                         aria-label={`Edit ${s.name}`}
                                                                         className="p-1.5 text-gray-400 hover:text-[#D4AF37] hover:bg-[#D4AF37]/5 rounded-lg transition-colors"
                                                                     >
                                                                         <Edit2 size={15} strokeWidth={1.8} />
                                                                     </button>
                                                                     <button 
                                                                         onClick={() => handleDeleteService(s._id)}
                                                                         aria-label={`Delete ${s.name}`}
                                                                         className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                                     >
                                                                         <Trash2 size={15} strokeWidth={1.8} />
                                                                     </button>
                                                                 </div>
                                                             </div>
                                                             <h3 className="text-base font-semibold text-gray-900 mb-1">{formatLabel(s.name, "Service")}</h3>
                                                             <p className="text-sm font-normal leading-snug text-gray-600 line-clamp-2 mb-2">{s.description || "No service description provided."}</p>
                                                             <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                                                                 <div className="flex items-center gap-1.5 text-base font-semibold text-gray-900">
                                                                     <IndianRupee size={15} className="text-[#D4AF37]" />
                                                                     {s.price}
                                                                 </div>
                                                                 <div className="p-1.5 rounded-full bg-gray-50 text-gray-300">
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
                                     <div className="bg-white rounded-xl py-10 md:py-12 px-6 text-center border border-gray-100 shadow-sm border-dashed">
                                         <Scissors className="mx-auto text-gray-200 mb-3" size={32} />
                                         <p className="text-gray-500 font-medium italic">No services listed yet.</p>
                                     </div>
                                 )
                             ) : (
                                 staff.length > 0 ? (
                                     <div className="flex flex-wrap justify-start gap-4">
                                         {staff.map(m => (
                                             <div key={m._id} className="relative w-[200px] h-[256px] max-w-full min-w-0 bg-white p-5 rounded-xl border border-gray-100 shadow-sm group hover:border-[#D4AF37]/30 hover:shadow-md transition-all flex flex-col items-center text-center">
                                                 {editingStaffId === m._id ? (
                                                     <div className="w-full h-full flex flex-col justify-center gap-2">
                                                         <input 
                                                             aria-label="Staff member name"
                                                             className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 font-medium text-sm"
                                                             value={editStaffForm.name}
                                                             onChange={e => setEditStaffForm({...editStaffForm, name: e.target.value})}
                                                         />
                                                         <input 
                                                             aria-label="Staff member role"
                                                             className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm"
                                                             value={editStaffForm.role}
                                                             onChange={e => setEditStaffForm({...editStaffForm, role: e.target.value})}
                                                         />
                                                         <input
                                                             aria-label="Experience in years"
                                                             type="number"
                                                             min="0"
                                                             className="w-full bg-gray-50 border border-gray-100 rounded-lg px-3 py-2 text-sm"
                                                             value={editStaffForm.experience}
                                                             onChange={e => setEditStaffForm({...editStaffForm, experience: e.target.value})}
                                                             placeholder="Experience (years)"
                                                         />
                                                         <div className="flex gap-2">
                                                             <button onClick={() => handleUpdateStaff(m._id)} className="flex-1 bg-[#1a1a1a] text-white py-2 rounded-xl text-xs font-bold hover:bg-black transition-all flex items-center justify-center gap-2">
                                                                 <Save size={14} /> Save
                                                             </button>
                                                             <button onClick={() => setEditingStaffId(null)} className="px-4 bg-gray-100 rounded-xl text-gray-500 hover:bg-gray-200 transition-all font-bold text-xs"><X size={14} /></button>
                                                         </div>
                                                     </div>
                                                 ) : (
                                                     <>
                                                         <div className="absolute right-3 top-3 flex gap-1">
                                                             <button type="button" aria-label={`Delete ${m.name}`} onClick={() => handleDeleteStaff(m._id)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                                                         </div>
                                                         <div className="relative mb-4 mt-1">
                                                             {m.profilePic ? <img src={m.profilePic} alt={m.name} className="size-20 rounded-full border-2 border-amber-100 object-cover" /> : <div className="size-20 rounded-full bg-gradient-to-br from-[#1a1a1a] to-gray-700 flex items-center justify-center text-white text-2xl font-semibold border-2 border-[#D4AF37]/40">{(m.name || "?").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>}
                                                         </div>
                                                         <h3 className="w-full truncate text-sm font-semibold leading-5 text-gray-900">{m.name}</h3>
                                                         <p className="mt-0.5 w-full truncate text-xs font-medium text-[#B88A16]">{formatLabel(m.role, "Stylist")}</p>
                                                         {Number(m.experience) > 0 ? <span className="mt-2 inline-flex items-center gap-1 rounded-full border border-gray-100 bg-gray-50 px-2.5 py-1 text-[11px] font-medium text-gray-600"><Award size={11} className="text-orange-500" />{Number(m.experience)} yrs exp</span> : <span className="mt-2 text-[11px] text-gray-400">Experience not provided</span>}
                                                         {!(Number(m.experience) > 0) && m.skills?.length > 0 && <div className="mt-2 flex max-h-8 flex-wrap justify-center gap-1 overflow-hidden">{m.skills.slice(0, 2).map((skill, index) => <span key={`${skill}-${index}`} className="max-w-full truncate rounded-full border border-amber-100 bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-800">{formatLabel(skill)}</span>)}</div>}
                                                         <button type="button" onClick={() => { setEditingStaffId(m._id); setEditStaffForm({ name: m.name, role: m.role, experience: String(m.experience ?? ""), skills: m.skills?.join(", ") || "" }); }} className="mt-auto inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg bg-[#1a1a1a] px-3 py-2 text-xs font-semibold text-white hover:bg-black"><Edit2 size={12} className="text-[#D4AF37]" />Edit Profile</button>
                                                     </>
                                                 )}
                                             </div>
                                         ))}
                                     </div>
                                 ) : (
                                     <div className="bg-white rounded-xl py-10 md:py-12 px-6 text-center border border-gray-100 shadow-sm border-dashed">
                                         <Users className="mx-auto text-gray-200 mb-3" size={32} />
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

