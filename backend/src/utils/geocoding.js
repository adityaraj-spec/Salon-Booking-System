import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding.js";

const mapBoxToken = process.env.MAPBOX_ACCESS_TOKEN;
const geocodingClient = mapBoxToken ? mbxGeocoding({ accessToken: mapBoxToken }) : null;

/**
 * Geocode an address to [longitude, latitude]
 * @param {string} address - The address to geocode
 * @returns {Promise<number[]>} - Returns [longitude, latitude]
 */
export const geocodeAddress = async (address) => {
    if (!geocodingClient) {
        return null;
    }
    try {
        const response = await geocodingClient
            .forwardGeocode({
                query: address,
                limit: 1,
            })
            .send();

        if (
            response &&
            response.body &&
            response.body.features &&
            response.body.features.length > 0
        ) {
            return response.body.features[0].geometry.coordinates; // [lng, lat]
        }
        return null;
    } catch (error) {
        console.error("Geocoding error:", error);
        return null;
    }
};
