import 'dotenv/config.js';
import mongoose from 'mongoose';
import { Salon } from './src/models/salon.models.js';

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    const salons = await Salon.find({});
    console.log("All salons:");
    salons.forEach(s => console.log(s.name, s.location, s.city, s.address));
    process.exit(0);
}
test();
