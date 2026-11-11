export const CITY_IMAGES = {
  "Hajipur": "https://images.unsplash.com/photo-1590001155093-a3c68ab0acfb?auto=format&fit=crop&w=800&q=80",
  "Howrah": "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=800&q=80",
  "Patna": "https://images.unsplash.com/photo-1621645532561-d242784742e8?auto=format&fit=crop&w=800&q=80",
  "Kolkata": "https://images.unsplash.com/photo-1558431382-27e303142255?auto=format&fit=crop&w=800&q=80",
  "Delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80",
  "New Delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=800&q=80",
  "Mumbai": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=800&q=80",
  "Bangalore": "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80",
  "Bengaluru": "https://images.unsplash.com/photo-1596464716127-f2a82984de30?auto=format&fit=crop&w=800&q=80",
  "Chennai": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=800&q=80",
  "Hyderabad": "https://images.unsplash.com/photo-1600100397561-433ff982df91?auto=format&fit=crop&w=800&q=80",
  "Jaipur": "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=800&q=80",
  "Goa": "https://images.unsplash.com/photo-1614082242765-7c98ca0f3df3?auto=format&fit=crop&w=800&q=80",
  "Pune": "https://images.unsplash.com/photo-1588416936097-41850ab3d86d?auto=format&fit=crop&w=800&q=80"
};

export const DEFAULT_CITY_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=800&q=80";

export const getCityImage = (cityName) => {
  if (!cityName) return DEFAULT_CITY_IMAGE;
  const normalized = String(cityName).trim();
  const key = Object.keys(CITY_IMAGES).find((k) => k.toLowerCase() === normalized.toLowerCase());
  return key ? CITY_IMAGES[key] : DEFAULT_CITY_IMAGE;
};

export const toTitleCaseCity = (str) => {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

/**
 * Dynamically extract unique cities from active salons and database /salons/cities API data
 */
export const getDynamicCities = (salons = [], dbCities = []) => {
  const map = new Map();

  // 1. Populate from dbCities (from /salons/cities endpoint)
  if (Array.isArray(dbCities)) {
    dbCities.forEach((item) => {
      const rawName = item.name || item._id;
      if (!rawName) return;
      const cleanName = toTitleCaseCity(rawName);
      if (!map.has(cleanName)) {
        map.set(cleanName, {
          name: cleanName,
          state: item.state || "India",
          salonCount: Number(item.salonCount) || 1,
          image: getCityImage(cleanName),
        });
      }
    });
  }

  // 2. Populate / merge from active salons list
  if (Array.isArray(salons)) {
    salons.forEach((salon) => {
      if (!salon?.city) return;
      const cleanName = toTitleCaseCity(salon.city);
      if (map.has(cleanName)) {
        const existing = map.get(cleanName);
        if (salon.state && (!existing.state || existing.state === "India")) {
          existing.state = salon.state;
        }
      } else {
        map.set(cleanName, {
          name: cleanName,
          state: salon.state || "India",
          salonCount: 1,
          image: getCityImage(cleanName),
        });
      }
    });
  }

  // 3. Fallback to curated major hubs if no registered cities are available yet
  if (map.size === 0) {
    const defaultHubs = [
      { name: "Hajipur", state: "Bihar" },
      { name: "Howrah", state: "West Bengal" },
      { name: "Patna", state: "Bihar" },
      { name: "Kolkata", state: "West Bengal" },
      { name: "Delhi", state: "Delhi NCR" },
      { name: "Mumbai", state: "Maharashtra" },
    ];
    defaultHubs.forEach(({ name, state }) => {
      map.set(name, {
        name,
        state,
        salonCount: 0,
        image: getCityImage(name),
      });
    });
  }

  return Array.from(map.values());
};
