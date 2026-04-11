import 'dotenv/config.js';
import mongoose from 'mongoose';
import { Salon } from './src/models/salon.models.js';
import { User } from './src/models/user.models.js';

async function test() {
    await mongoose.connect(process.env.MONGODB_URI);
    
    // get a user
    const user = await User.findOne({});

    const salon = new Salon({
        name: "Test Salon Mapbox",
        city: "Test City",
        description: "Testing DB Coordinates",
        address: "Test Address",
        owner: user._id,
        location: {
            type: "Point",
            coordinates: [85.21144, 25.691841]
        }
    });

    await salon.save();
    console.log("Saved Salon:", salon);

    const check = await Salon.findById(salon._id);
    console.log("Fetched Salon from DB:", check.location);
    process.exit(0);
}
test();
