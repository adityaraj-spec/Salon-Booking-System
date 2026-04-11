import 'dotenv/config.js';
import mongoose from 'mongoose';
import { Salon } from './src/models/salon.models.js';
import { geocodeAddress } from './src/utils/geocoding.js';

async function migrateGeocoding() {
    console.log("Starting Geocoding Migration...");
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        const salons = await Salon.find({});
        console.log(`Found ${salons.length} salons.`);

        let updatedCount = 0;
        for (const salon of salons) {
            if (!salon.location || !salon.location.coordinates || salon.location.coordinates.length === 0) {
                console.log(`Geocoding salon: ${salon.name}`);
                const fullAddress = `${salon.address}, ${salon.city}`;
                const coords = await geocodeAddress(fullAddress);
                
                if (coords) {
                    salon.location = {
                        type: "Point",
                        coordinates: coords
                    };
                    await salon.save();
                    console.log(`  Updated ${salon.name} with coordinates: ${coords}`);
                    updatedCount++;
                } else {
                    console.log(`  Could not geocode address for ${salon.name}: ${fullAddress}`);
                }
                
                // Add a small delay to respect MapBox rate limits
                await new Promise(resolve => setTimeout(resolve, 300));
            } else {
                console.log(`Salon ${salon.name} already has coordinates.`);
            }
        }
        console.log(`Migration complete! Successfully updated ${updatedCount} salons.`);
    } catch (error) {
        console.error("Migration failed:", error);
    } finally {
        process.exit(0);
    }
}

migrateGeocoding();
