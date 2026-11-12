import { useEffect, useRef, useState } from "react";
import { Scissors, MapPin, Clock, Camera, Plus, Trash2, Store, X, Phone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import axiosInstance from "../api/axiosConfig";

export function CreateSalonPage() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});
    const [imageFiles, setImageFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [beforeFiles, setBeforeFiles] = useState([]);
    const [afterFiles, setAfterFiles] = useState([]);
    const [beforePreviews, setBeforePreviews] = useState([]);
    const [afterPreviews, setAfterPreviews] = useState([]);
    const previewUrls = useRef(new Set());
    const navigate = useNavigate();

    useEffect(() => () => previewUrls.current.forEach(URL.revokeObjectURL), []);

    const makePreview = (file) => {
        const url = URL.createObjectURL(file);
        previewUrls.current.add(url);
        return url;
    };

    const clearFieldError = (fieldName) => {
        if (fieldErrors[fieldName]) {
            setFieldErrors(prev => ({ ...prev, [fieldName]: "" }));
        }
    };

    const handleImageChange = (e) => {
        const files = Array.from(e.target.files);
        if (files.length + imageFiles.length > 10) {
            setError("Maximum 10 images allowed");
            return;
        }

        const newPreviews = files.map(makePreview);
        setImageFiles(prev => [...prev, ...files]);
        setPreviews(prev => [...prev, ...newPreviews]);
        clearFieldError("images");
        
        // Reset the input so the same file can be selected again if needed
        e.target.value = null;
    };

    const removeImage = (index) => {
        setImageFiles(imageFiles.filter((_, i) => i !== index));
        // Revoke the URL to avoid memory leaks
        URL.revokeObjectURL(previews[index]);
        previewUrls.current.delete(previews[index]);
        setPreviews(previews.filter((_, i) => i !== index));
    };

    const handlePortfolioFiles = (event, setFiles, setFilePreviews) => {
        const selected = Array.from(event.target.files || []);
        if (selected.length + (setFiles === setBeforeFiles ? beforeFiles.length : afterFiles.length) > 10) {
            setError("Maximum 10 before and 10 after photos allowed");
            event.target.value = "";
            return;
        }
        setFiles((current) => [...current, ...selected]);
        setFilePreviews((current) => [...current, ...selected.map(makePreview)]);
        event.target.value = "";
    };

    const removePortfolioPhoto = (index, files, setFiles, filePreviews, setFilePreviews) => {
        URL.revokeObjectURL(filePreviews[index]);
        previewUrls.current.delete(filePreviews[index]);
        setFiles(files.filter((_, fileIndex) => fileIndex !== index));
        setFilePreviews(filePreviews.filter((_, fileIndex) => fileIndex !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const formElements = e.target.elements;
        const name = formElements.name.value.trim();
        const totalSeats = formElements.totalSeats.value.trim();
        const contactNumber = formElements.contactNumber.value.trim();
        const state = formElements.state.value.trim();
        const city = formElements.city.value.trim();
        const pincode = formElements.pincode.value.trim();
        const address = formElements.address.value.trim();
        const openingHours = formElements.openingHours.value.trim();
        const closingHours = formElements.closingHours.value.trim();

        const errors = {};
        if (!name) {
            errors.name = "Salon name is required.";
        }
        if (!totalSeats || Number(totalSeats) < 1) {
            errors.totalSeats = "Total chairs must be at least 1.";
        }
        if (!contactNumber) {
            errors.contactNumber = "Contact phone number is required.";
        } else if (!/^\d{10}$/.test(contactNumber)) {
            errors.contactNumber = "Enter exactly 10 digits.";
        }
        if (!state) {
            errors.state = "Please select a state.";
        }
        if (!city) {
            errors.city = "Please enter your city.";
        }
        if (!pincode) {
            errors.pincode = "Please enter a pincode.";
        } else if (!/^\d{6}$/.test(pincode)) {
            errors.pincode = "Please enter a valid 6-digit pincode.";
        }
        if (!address) {
            errors.address = "Street address is required.";
        }
        if (!openingHours) {
            errors.openingHours = "Opening time is required.";
        }
        if (!closingHours) {
            errors.closingHours = "Closing time is required.";
        }
        if (imageFiles.length === 0) {
            errors.images = "Please upload at least one salon photo.";
        }
        if (beforeFiles.length !== afterFiles.length) {
            errors.portfolio = "Add the same number of before and after photos to create matching transformations.";
        }

        if (Object.keys(errors).length > 0) {
            setFieldErrors(errors);
            return;
        }

        setFieldErrors({});
        setLoading(true);

        const formData = new FormData();
        formData.append("name", name);
        formData.append("city", city);
        formData.append("state", state);
        formData.append("pincode", pincode);
        formData.append("description", formElements.description.value.trim());
        formData.append("address", address);
        formData.append("openingHours", openingHours);
        formData.append("closingHours", closingHours);
        formData.append("totalSeats", totalSeats);
        formData.append("contactNumber", `+91${contactNumber}`);

        imageFiles.forEach(file => {
            formData.append("images", file);
        });
        beforeFiles.forEach((file) => formData.append("beforePhotos", file));
        afterFiles.forEach((file) => formData.append("afterPhotos", file));

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
        <div className="font-sans pb-20 w-full">
            {/* Header */}
            <div className="bg-white border-b border-gray-100 py-6 px-6 sticky top-0 z-10 shadow-sm rounded-t-xl md:rounded-none">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                        <div className="bg-[#1a1a1a] p-1.5 rounded-full text-white">
                            <Scissors size={20} />
                        </div>
                        <h1 className="text-xl font-sans font-bold text-black tracking-wide">
                            Salon<span className="text-[#D4AF37]">Now</span>
                        </h1>
                    </div>
                    <button 
                        onClick={() => navigate("/role-selection")}
                        className="text-gray-600 hover:text-black text-sm font-medium px-3.5 py-1.5 rounded-lg hover:bg-gray-100 transition-all"
                    >
                        Back
                    </button>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
                <div className="mb-6">
                    <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight mb-4">Register Your Salon</h2>
                    <p className="text-gray-500 max-w-xl leading-relaxed">Tell us about your business to get started.</p>
                </div>

                {error && (
                    <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm mb-8 border border-red-100">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className="space-y-6">
                    {/* Basic Info Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <Store className="mr-2 text-[#D4AF37]" size={20} />
                            Basic Information
                        </h3>
                        
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Salon Name</label>
                            <input
                                name="name"
                                type="text"
                                placeholder="Enter salon name"
                                onChange={() => clearFieldError("name")}
                                className={`w-full border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                                    fieldErrors.name
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                }`}
                            />
                            {fieldErrors.name && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.name}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <textarea
                                name="description"
                                rows="3"
                                placeholder="A brief description of your salon and services..."
                                className="w-full border border-gray-200 rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                            ></textarea>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Total Chairs / Styling Stations</label>
                            <input
                                name="totalSeats"
                                type="number"
                                min="1"
                                defaultValue="6"
                                onChange={() => clearFieldError("totalSeats")}
                                className={`w-full border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                                    fieldErrors.totalSeats
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                }`}
                            />
                            {fieldErrors.totalSeats && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.totalSeats}</p>
                            )}
                            <p className="text-xs text-gray-400 mt-2 italic">How many people can you serve at once?</p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone Number</label>
                            <div className="flex overflow-hidden rounded-xl border border-gray-200 focus-within:border-[#D4AF37] focus-within:ring-2 focus-within:ring-[#D4AF37]/20">
                                <span className="flex items-center gap-2 bg-gray-50 px-3.5 text-sm font-medium text-gray-600 border-r border-gray-200">
                                    <Phone size={16} /> +91
                                </span>
                                <input
                                    name="contactNumber"
                                    type="tel"
                                    inputMode="numeric"
                                    maxLength={10}
                                    placeholder="Enter 10-digit mobile number"
                                    onInput={(event) => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, "").slice(0, 10); }}
                                    onChange={() => clearFieldError("contactNumber")}
                                    className={`min-w-0 flex-1 p-3.5 text-gray-800 focus:outline-none ${
                                        fieldErrors.contactNumber
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                    }`}
                                />
                            </div>
                            {fieldErrors.contactNumber && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.contactNumber}</p>
                            )}
                        </div>
                    </div>

                    {/* Location Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <MapPin className="mr-2 text-[#D4AF37]" size={20} />
                            Location & Address
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">State</label>
                                <select 
                                    name="state"
                                    onChange={() => clearFieldError("state")}
                                    className={`w-full bg-white border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all appearance-none cursor-pointer ${
                                        fieldErrors.state
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                    }`}
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
                                {fieldErrors.state && (
                                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.state}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                                <input
                                    name="city"
                                    type="text"
                                    placeholder="Enter your city"
                                    onChange={() => clearFieldError("city")}
                                    className={`w-full border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                                        fieldErrors.city
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                    }`}
                                />
                                {fieldErrors.city && (
                                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.city}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Pincode / Zip Code</label>
                                <input
                                    name="pincode"
                                    type="text"
                                    placeholder="e.g., 400053"
                                    onChange={() => clearFieldError("pincode")}
                                    className={`w-full border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                                        fieldErrors.pincode
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                    }`}
                                />
                                {fieldErrors.pincode && (
                                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.pincode}</p>
                                )}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Full Address</label>
                            <input
                                    name="address"
                                type="text"
                                placeholder="Enter complete salon address"
                                onChange={() => clearFieldError("address")}
                                className={`w-full border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                                    fieldErrors.address
                                        ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                }`}
                            />
                            {fieldErrors.address && (
                                <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.address}</p>
                            )}
                        </div>
                    </div>

                    {/* Hours Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
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
                                    onChange={() => clearFieldError("openingHours")}
                                    className={`w-full border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                                        fieldErrors.openingHours
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                    }`}
                                />
                                {fieldErrors.openingHours && (
                                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.openingHours}</p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Closing Time</label>
                                <input
                                    name="closingHours"
                                    type="text"
                                    placeholder="8:00 PM"
                                    onChange={() => clearFieldError("closingHours")}
                                    className={`w-full border rounded-lg p-3.5 text-gray-800 focus:outline-none focus:ring-2 transition-all ${
                                        fieldErrors.closingHours
                                            ? "border-red-500 focus:border-red-500 focus:ring-red-500/20"
                                            : "border-gray-200 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20"
                                    }`}
                                />
                                {fieldErrors.closingHours && (
                                    <p className="text-xs text-red-600 mt-1.5 font-medium">{fieldErrors.closingHours}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Images Section */}
                    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <div className="flex justify-between items-center">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
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
                                className={`flex flex-col items-center justify-center w-full h-40 border-2 border-dashed rounded-xl cursor-pointer hover:border-[#D4AF37] hover:bg-gray-50 transition-all group ${
                                    fieldErrors.images ? "border-red-500 bg-red-50/20" : "border-gray-200"
                                }`}
                            >
                                <div className="bg-gray-100 p-3 rounded-full text-gray-400 group-hover:bg-[#D4AF37]/10 group-hover:text-[#D4AF37] transition-colors mb-2">
                                    <Plus size={24} />
                                </div>
                                <span className="text-sm font-medium text-gray-500 group-hover:text-gray-700">Click to upload salon photos</span>
                                <span className="text-xs text-gray-400 mt-1">PNG, JPG or WebP (Max 5MB each)</span>
                            </label>
                        </div>
                        {fieldErrors.images && (
                            <p className="text-xs text-red-600 mt-2 font-medium">{fieldErrors.images}</p>
                        )}

                        {previews.length > 0 && (
                            <div className="grid grid-cols-3 gap-4 mt-6">
                                {previews.map((url, index) => (
                                    <div key={index} className="relative group rounded-xl overflow-hidden aspect-video border border-gray-100 shadow-sm">
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

                    {/* Paired transformation portfolio */}
                    <div className="bg-white p-3.5 sm:p-5 md:p-6 rounded-xl shadow-sm border border-gray-100 space-y-4">
                        <div>
                            <h3 className="text-base sm:text-lg font-medium sm:font-semibold text-gray-800">Portfolio &amp; Transformation Gallery (Before &amp; After)</h3>
                            <p className="mt-1 text-xs sm:text-sm text-gray-600">Upload matching before and after photos. Each pair appears together on your salon profile.</p>
                        </div>
                        {[["Before", beforeFiles, setBeforeFiles, beforePreviews, setBeforePreviews], ["After", afterFiles, setAfterFiles, afterPreviews, setAfterPreviews]].map(([label, files, setFiles, fileUrls, setFileUrls]) => (
                            <div key={label}>
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs font-medium text-gray-700">{label} photos</span>
                                    <span className="text-xs text-gray-500">{files.length}/10</span>
                                </div>
                                <label className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-2 text-xs sm:text-sm font-medium text-gray-600 cursor-pointer hover:border-[#D4AF37]">
                                    <Plus size={16} /> Add {label.toLowerCase()} photos
                                    <input type="file" accept="image/*" multiple className="sr-only" onChange={(event) => handlePortfolioFiles(event, setFiles, setFileUrls)} />
                                </label>
                                {fileUrls.length > 0 && <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                                    {fileUrls.map((url, index) => <div key={url} className="relative aspect-square overflow-hidden rounded-lg border border-gray-100">
                                        <img src={url} alt={`${label} transformation preview ${index + 1}`} className="h-full w-full object-cover" />
                                        <button type="button" onClick={() => removePortfolioPhoto(index, files, setFiles, fileUrls, setFileUrls)} aria-label={`Remove ${label.toLowerCase()} photo ${index + 1}`} className="absolute right-1.5 top-1.5 inline-flex items-center justify-center rounded-full bg-black/65 p-1.5 text-white hover:bg-red-600"><X size={14} /></button>
                                    </div>)}
                                </div>}
                            </div>
                        ))}
                        {fieldErrors.portfolio && <p className="text-xs text-red-600">{fieldErrors.portfolio}</p>}
                    </div>

                    {/* Submit Button */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-[#1a1a1a] hover:bg-black text-white font-semibold px-5 py-2.5 sm:px-7 sm:py-3.5 text-sm sm:text-base rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 disabled:opacity-50 mt-4 min-h-12 flex items-center justify-center"
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
