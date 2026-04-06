import { useState } from "react";
import { Scissors, MapPin, Clock, Camera, Plus, Trash2, Store, X, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";

export function CreateSalonPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [imageFiles, setImageFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const navigate = useNavigate();

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + imageFiles.length > 10) {
            setError("Maximum 10 images allowed");
            return;
        }

        const newPreviews = files.map(file => URL.createObjectURL(file));
        setImageFiles(prev => [...prev, ...files]);
        setPreviews(prev => [...prev, ...newPreviews]);
        
        // Reset the input so the same file can be selected again if needed
        e.target.value = null;
    };

    const removeImage = (index) => {
        setImageFiles(imageFiles.filter((_, i) => i !== index));
        // Revoke the URL to avoid memory leaks
        URL.revokeObjectURL(previews[index]);
        setPreviews(previews.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");

        const formElements = e.target.elements;
        const formData = new FormData();
        
        formData.append("name", formElements.name.value);
        formData.append("city", formElements.city.value);
        formData.append("description", formElements.description.value);
        formData.append("address", formElements.address.value);
        formData.append("openingHours", formElements.openingHours.value);
        formData.append("closingHours", formElements.closingHours.value);
        formData.append("totalSeats", formElements.totalSeats.value);
        formData.append("contactNumber", formElements.contactNumber.value);

        imageFiles.forEach(file => {
            formData.append("images", file);
        });

        try {
            const response = await axiosInstance.post("/salons/register", formData, {
                withCredentials: true,
                headers: {
                    "Content-Type": "multipart/form-data",
                },
            });

            if (response.status === 200 || response.status === 201) {
                navigate("/home");
            } else {
                setError(response.data.message || "Failed to register salon");
            }
        } catch (err) {
            setError(err.response?.data?.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#fcfcfc] font-sans pb-20">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 py-6 px-6 sticky top-0 z-10 shadow-sm">
                <div className="max-w-5xl mx-auto flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="bg-[#1a1a1a] p-1.5 rounded-full text-white">
                            <Scissors size={20} />
                        </div>
                        <h1 className="text-xl font-serif font-bold text-black tracking-wide">
                            Salon<span className="text-[#D4AF37]">Now</span>
                        </h1>
                    </div>
                    <button 
                        onClick={() => navigate("/role-selection")}
                        className="text-gray-500 hover:text-black text-sm font-medium transition-colors"
                    >
                        Back
                    </button>
                </div>
            </div>

            <div className="max-w-3xl mx-auto mt-12 px-6">
                <div className="mb-10">
                    <h2 className="text-4xl font-serif font-bold text-[#1a1a1a] mb-3">Register Your Salon</h2>
                    <p className="text-gray-500">Tell us about your business to get started.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-8 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-8">
                    {/* Basic Info Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Store className="mr-2 text-[#D4AF37]" size={20} />
                            Basic Information
                        </h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Salon Name</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Enter your salon name"
                                required
                                className="w-full border border-gray-200 rounded-xl p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                name="description"
                                rows="3"
                                placeholder="A brief description of your salon and services..."
                                className="w-full border border-gray-200 rounded-xl p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Seats (Capacity)</label>
                            <input
                                name="totalSeats"
                                type="number"
                                min="1"
                                defaultValue="6"
                                required
                                className="w-full border border-gray-200 rounded-xl p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                            />
                            <p className="text-xs text-gray-400 mt-2 italic">How many people can you serve at once?</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone Number</label>
                            <div className="relative">
                                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-gray-400">
                                    <Phone size={18} />
                                </span>
                                <input
                                    name="contactNumber"
                                    type="text"
                                    placeholder="Enter salon contact number"
                                    required
                                    className="w-full border border-gray-200 rounded-xl p-3.5 pl-11 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <MapPin className="mr-2 text-[#D4AF37]" size={20} />
                            Location & Address
                        </h3>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                            <input
                                name="city"
                                type="text"
                                placeholder="Enter your city"
                                required
                                className="w-full border border-gray-200 rounded-xl p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all mb-4"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                            <input
                                name="address"
                                type="text"
                                placeholder="Enter your salon address"
                                required
                                className="w-full border border-gray-200 rounded-xl p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                            />
                        </div>
                    </div>

                    {/* Hours Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center">
                            <Clock className="mr-2 text-[#D4AF37]" size={20} />
                            Operating Hours
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Opening Time</label>
                                <input
                                    name="openingHours"
                                    type="text"
                                    placeholder="9:00 AM"
                                    className="w-full border border-gray-200 rounded-xl p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Closing Time</label>
                                <input
                                    name="closingHours"
                                    type="text"
                                    placeholder="8:00 PM"
                                    className="w-full border border-gray-200 rounded-xl p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Images Section */}
                    <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-6">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-bold text-gray-800 flex items-center">
                                <Camera className="mr-2 text-[#D4AF37]" size={20} />
                                Salon Images
                            </h3>
                            <span className="text-xs text-gray-400">{imageFiles.length}/10 images selected</span>
                        </div>

                        <div className="relative">
                            <input
                                type="file"
                                id="salon-images"
                                multiple
                                accept="image/*"
                                onChange={handleImageChange}
                                className="hidden"
                            />
                            <label
                                htmlFor="salon-images"
                                className="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-200 rounded-3xl cursor-pointer hover:border-[#D4AF37] hover:bg-gray-50 transition-all group"
                            >
                                <div className="bg-gray-100 p-3 rounded-full text-gray-400 group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-colors mb-2">
                                    <Plus size={24} />
                                </div>
                                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700">Click to upload salon photos</span>
                                <span className="text-xs text-gray-400 mt-1">PNG, JPG or WebP (Max 5MB each)</span>
                            </label>
                        </div>

                        {previews.length > 0 && (
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                {previews.map((url, index) => (
                                    <div key={index} className="relative group rounded-2xl overflow-hidden aspect-video border border-gray-100 shadow-sm">
                                        <img src={url} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            onClick={() => removeImage(index)}
                                            className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1a1a1a] hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 mt-4 h-16 text-lg flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
                                Registering your business...
                            </>
                        ) : "Complete Registration"}
                    </button>
                </form>
            </div>
        </div>
    );
}
