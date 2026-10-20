import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import axiosInstance from "../api/axiosConfig";

const CITY_STORAGE_KEY = "salonnow_city";

const KNOWN_CITY_COORDINATES = {
    mumbai: { lat: 19.0760, lng: 72.8777, name: "Mumbai" },
    delhi: { lat: 28.6139, lng: 77.2090, name: "New Delhi" },
    "new delhi": { lat: 28.6139, lng: 77.2090, name: "New Delhi" },
    bangalore: { lat: 12.9716, lng: 77.5946, name: "Bangalore" },
    bengaluru: { lat: 12.9716, lng: 77.5946, name: "Bangalore" },
    hyderabad: { lat: 17.3850, lng: 78.4867, name: "Hyderabad" },
    chennai: { lat: 13.0827, lng: 80.2707, name: "Chennai" },
    kolkata: { lat: 22.5726, lng: 88.3639, name: "Kolkata" },
    howrah: { lat: 22.5958, lng: 88.2636, name: "Howrah" },
    hajipur: { lat: 25.6858, lng: 85.2096, name: "Hajipur" },
    patna: { lat: 25.5941, lng: 85.1376, name: "Patna" },
    pune: { lat: 18.5204, lng: 73.8567, name: "Pune" },
    ahmedabad: { lat: 23.0225, lng: 72.5714, name: "Ahmedabad" },
    jaipur: { lat: 26.9124, lng: 75.7873, name: "Jaipur" },
    goa: { lat: 15.2993, lng: 74.1240, name: "Goa" },
    chandigarh: { lat: 30.7333, lng: 76.7794, name: "Chandigarh" },
    lucknow: { lat: 26.8467, lng: 80.9462, name: "Lucknow" },
    kochi: { lat: 9.9312, lng: 76.2673, name: "Kochi" },
    indore: { lat: 22.7196, lng: 75.8577, name: "Indore" },
};

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

export function useCityResolution() {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();

    const [resolvedCity, setResolvedCity] = useState(() => {
        // 1. URL Query Parameter
        const urlCity = searchParams.get("city");
        if (urlCity && urlCity.trim()) return urlCity.trim();

        // 2. Local Storage
        try {
            const saved = localStorage.getItem(CITY_STORAGE_KEY);
            if (saved && saved.trim()) return saved.trim();
        } catch {}

        // User profile city
        if (user?.city && user.city.trim()) return user.city.trim();

        // Default initial fallback
        return "Mumbai";
    });

    const [availableCities, setAvailableCities] = useState([]);
    const [detectingLocation, setDetectingLocation] = useState(false);
    const [locationMessage, setLocationMessage] = useState("");

    // Fetch active cities from backend
    useEffect(() => {
        let isMounted = true;
        axiosInstance
            .get("/salons/cities")
            .then((res) => {
                if (!isMounted) return;
                if (res.data?.success && Array.isArray(res.data.data) && res.data.data.length > 0) {
                    const fetchedCities = res.data.data.map((c) => ({
                        id: c._id,
                        name: c.name,
                        salonCount: c.salonCount || 0,
                        coordinates: c.coordinates,
                    }));
                    setAvailableCities(fetchedCities);

                    // If resolved city is still the initial default and no URL or storage was set, pick the top city
                    const urlCity = searchParams.get("city");
                    const savedCity = localStorage.getItem(CITY_STORAGE_KEY);
                    if (!urlCity && !savedCity && !user?.city && fetchedCities[0]?.name) {
                        setResolvedCity(fetchedCities[0].name);
                    }
                }
            })
            .catch(() => {
                // Keep default list
            });

        return () => {
            isMounted = false;
        };
    }, [searchParams, user]);

    // Update resolvedCity if ?city= changes in URL
    useEffect(() => {
        const urlCity = searchParams.get("city");
        if (urlCity && urlCity.trim() && urlCity !== resolvedCity) {
            setResolvedCity(urlCity.trim());
            try {
                localStorage.setItem(CITY_STORAGE_KEY, urlCity.trim());
            } catch {}
        }
    }, [searchParams]);

    const selectCity = useCallback((cityName) => {
        if (!cityName) return;
        const formatted = cityName.trim();
        setResolvedCity(formatted);
        try {
            localStorage.setItem(CITY_STORAGE_KEY, formatted);
        } catch {}
    }, []);

    const detectLocation = useCallback(async () => {
        if (!navigator.geolocation) {
            setLocationMessage("Geolocation is not supported by your browser.");
            return { success: false, message: "Geolocation not supported" };
        }

        setDetectingLocation(true);
        setLocationMessage("Detecting your location...");

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    // 1. Try to match against cities with salons
                    let bestCity = null;
                    let minDistance = Infinity;

                    // Combine backend cities and known cities
                    const candidateCities = [];

                    if (availableCities.length > 0) {
                        availableCities.forEach((c) => {
                            let lat = null;
                            let lng = null;
                            if (Array.isArray(c.coordinates) && c.coordinates.length === 2 && (c.coordinates[0] !== 0 || c.coordinates[1] !== 0)) {
                                lng = c.coordinates[0];
                                lat = c.coordinates[1];
                            } else {
                                const known = KNOWN_CITY_COORDINATES[c.name.toLowerCase()];
                                if (known) {
                                    lat = known.lat;
                                    lng = known.lng;
                                }
                            }
                            if (lat !== null && lng !== null) {
                                candidateCities.push({ name: c.name, lat, lng });
                            }
                        });
                    }

                    // Also add default popular cities if candidates are sparse
                    Object.entries(KNOWN_CITY_COORDINATES).forEach(([k, v]) => {
                        if (!candidateCities.some((c) => c.name.toLowerCase() === v.name.toLowerCase())) {
                            candidateCities.push({ name: v.name, lat: v.lat, lng: v.lng });
                        }
                    });

                    candidateCities.forEach((city) => {
                        const dist = calculateDistance(latitude, longitude, city.lat, city.lng);
                        if (dist < minDistance) {
                            minDistance = dist;
                            bestCity = city.name;
                        }
                    });

                    const matched = bestCity || "Mumbai";
                    selectCity(matched);
                    setDetectingLocation(false);
                    setLocationMessage(`Found nearest city: ${matched}`);
                    resolve({ success: true, city: matched });
                },
                (err) => {
                    console.warn("Geolocation error:", err);
                    setDetectingLocation(false);
                    setLocationMessage("Unable to retrieve your location.");
                    resolve({ success: false, error: err.message });
                },
                { timeout: 10000, enableHighAccuracy: true }
            );
        });
    }, [availableCities, selectCity]);

    return {
        resolvedCity,
        selectCity,
        detectLocation,
        detectingLocation,
        locationMessage,
        availableCities,
    };
}
