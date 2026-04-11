import 'dotenv/config.js';
import { geocodeAddress } from './src/utils/geocoding.js';

async function test() {
    const res = await geocodeAddress("Salt Lake Sector V, Kolkata");
    console.log("Geocode Result:", res);
    process.exit(0);
}
test();
