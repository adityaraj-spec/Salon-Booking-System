import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";

const CART_STORAGE_KEY = "salonnow_booking_cart";

const BookingCartContext = createContext(null);

const readCartFromStorage = () => {
    try {
        const stored = sessionStorage.getItem(CART_STORAGE_KEY);
        if (!stored) return { salonId: null, salonName: "", items: [] };
        const parsed = JSON.parse(stored);
        if (parsed && Array.isArray(parsed.items)) {
            return {
                salonId: parsed.salonId || null,
                salonName: parsed.salonName || "",
                items: parsed.items,
            };
        }
    } catch (err) {
        console.warn("Failed to read booking cart from sessionStorage:", err);
    }
    return { salonId: null, salonName: "", items: [] };
};

export const BookingCartProvider = ({ children }) => {
    const [cartState, setCartState] = useState(readCartFromStorage);
    const [salonConflictModal, setSalonConflictModal] = useState(null);

    // Synchronize to sessionStorage whenever cartState changes
    useEffect(() => {
        try {
            if (!cartState.salonId || cartState.items.length === 0) {
                sessionStorage.removeItem(CART_STORAGE_KEY);
            } else {
                sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartState));
            }
        } catch (err) {
            console.warn("Failed to persist booking cart to sessionStorage:", err);
        }
    }, [cartState]);

    const normalizeService = useCallback((service) => {
        const serviceId = service._id || service.serviceId;
        const durationMin = Number(service.durationMin || service.duration) || 30;
        const price = Number(service.price) || 0;
        return {
            _id: serviceId,
            serviceId,
            name: service.name || "Service",
            price,
            durationMin,
            duration: durationMin,
            category: service.category || "other",
            description: service.description || "",
        };
    }, []);

    const isServiceInCart = useCallback((serviceId) => {
        if (!serviceId) return false;
        return cartState.items.some(
            (item) => item._id === serviceId || item.serviceId === serviceId
        );
    }, [cartState.items]);

    const clearCart = useCallback(() => {
        setCartState({ salonId: null, salonName: "", items: [] });
        try {
            sessionStorage.removeItem(CART_STORAGE_KEY);
        } catch {}
    }, []);

    const addService = useCallback((salon, service, force = false) => {
        const salonId = typeof salon === "string" ? salon : (salon?._id || salon?.id);
        const salonName = typeof salon === "object" ? (salon?.name || "") : "";
        const normalized = normalizeService(service);

        // Check if there is an existing cart for a different salon
        if (cartState.salonId && cartState.salonId !== salonId && cartState.items.length > 0) {
            if (!force) {
                // Trigger conflict modal
                return {
                    conflict: true,
                    currentSalonId: cartState.salonId,
                    currentSalonName: cartState.salonName,
                    newSalonId: salonId,
                    newSalonName: salonName,
                    pendingService: normalized,
                };
            }
            // If forced, overwrite cart with new salon and this service
            setCartState({
                salonId,
                salonName,
                items: [normalized],
            });
            return { conflict: false, added: true };
        }

        // Same salon or empty cart: add if not duplicate
        setCartState((prev) => {
            const alreadyExists = prev.items.some(
                (item) => item._id === normalized._id || item.serviceId === normalized.serviceId
            );
            if (alreadyExists) return prev;
            return {
                salonId,
                salonName: salonName || prev.salonName,
                items: [...prev.items, normalized],
            };
        });

        return { conflict: false, added: true };
    }, [cartState.salonId, cartState.salonName, cartState.items.length, normalizeService]);

    const removeService = useCallback((serviceId) => {
        setCartState((prev) => {
            const nextItems = prev.items.filter(
                (item) => item._id !== serviceId && item.serviceId !== serviceId
            );
            if (nextItems.length === 0) {
                return { salonId: null, salonName: "", items: [] };
            }
            return {
                ...prev,
                items: nextItems,
            };
        });
    }, []);

    const toggleService = useCallback((salon, service) => {
        const serviceId = service._id || service.serviceId;
        if (isServiceInCart(serviceId)) {
            removeService(serviceId);
            return { removed: true };
        } else {
            return addService(salon, service);
        }
    }, [isServiceInCart, removeService, addService]);

    const setCartServices = useCallback((salon, servicesList) => {
        const salonId = typeof salon === "string" ? salon : (salon?._id || salon?.id);
        const salonName = typeof salon === "object" ? (salon?.name || "") : "";
        const normalizedList = (servicesList || []).map(normalizeService);

        if (normalizedList.length === 0) {
            clearCart();
            return;
        }

        setCartState({
            salonId,
            salonName,
            items: normalizedList,
        });
    }, [normalizeService, clearCart]);

    const totalCount = useMemo(() => cartState.items.length, [cartState.items]);

    const totalPrice = useMemo(() => {
        return cartState.items.reduce((sum, item) => sum + (Number(item.price) || 0), 0);
    }, [cartState.items]);

    const totalDurationMin = useMemo(() => {
        return cartState.items.reduce((sum, item) => sum + (Number(item.durationMin) || 30), 0);
    }, [cartState.items]);

    const snapshotServices = useMemo(() => {
        return cartState.items.map((item) => ({
            serviceId: item._id || item.serviceId,
            name: item.name,
            price: Number(item.price) || 0,
            durationMin: Number(item.durationMin) || 30,
        }));
    }, [cartState.items]);

    const value = useMemo(() => ({
        salonId: cartState.salonId,
        salonName: cartState.salonName,
        items: cartState.items,
        totalCount,
        totalPrice,
        totalDurationMin,
        snapshotServices,
        isServiceInCart,
        addService,
        removeService,
        toggleService,
        clearCart,
        setCartServices,
        salonConflictModal,
        setSalonConflictModal,
    }), [
        cartState.salonId,
        cartState.salonName,
        cartState.items,
        totalCount,
        totalPrice,
        totalDurationMin,
        snapshotServices,
        isServiceInCart,
        addService,
        removeService,
        toggleService,
        clearCart,
        setCartServices,
        salonConflictModal,
    ]);

    return (
        <BookingCartContext.Provider value={value}>
            {children}
            {/* Salon Switch Confirmation Modal */}
            {salonConflictModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
                        <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#D4AF37] flex items-center justify-center font-bold text-xl mb-4">
                            ⚠️
                        </div>
                        <h3 className="font-serif font-bold text-xl text-[#1a1a1a] mb-2">
                            Replace Cart Items?
                        </h3>
                        <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                            Your cart currently contains services from{" "}
                            <span className="font-semibold text-gray-900">
                                {salonConflictModal.currentSalonName || "another salon"}
                            </span>
                            . Adding services from{" "}
                            <span className="font-semibold text-gray-900">
                                {salonConflictModal.newSalonName || "this salon"}
                            </span>{" "}
                            will clear your previous selections.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setSalonConflictModal(null)}
                                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-semibold text-sm hover:bg-gray-50 transition-colors"
                            >
                                Keep Existing
                            </button>
                            <button
                                onClick={() => {
                                    if (salonConflictModal.pendingService) {
                                        addService(
                                            { _id: salonConflictModal.newSalonId, name: salonConflictModal.newSalonName },
                                            salonConflictModal.pendingService,
                                            true
                                        );
                                    }
                                    setSalonConflictModal(null);
                                }}
                                className="flex-1 py-3 px-4 rounded-xl bg-[#1a1a1a] text-white font-semibold text-sm hover:bg-black transition-colors"
                            >
                                Replace Cart
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </BookingCartContext.Provider>
    );
};

export const useBookingCart = () => {
    const context = useContext(BookingCartContext);
    if (!context) {
        throw new Error("useBookingCart must be used within a BookingCartProvider");
    }
    return context;
};

export default BookingCartContext;
