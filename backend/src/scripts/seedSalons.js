import 'dotenv/config';
import connectDB from '../db/index.js';
import { Salon } from '../models/salon.models.js';
import { User } from '../models/user.models.js';

const seedSalons = async () => {
    try {
        // Connect to DB
        await connectDB();

        // 1. Get or create a test owner
        let owner = await User.findOne({ role: "salonOwner" });
        if (!owner) {
            owner = await User.findOne({}); // Try to find any existing user
            if (owner) {
                owner.role = "salonOwner";
                await owner.save();
                console.log(`Using existing user "${owner.username}" as salon owner.`);
            } else {
                // Create a test user if none exists
                owner = await User.create({
                    username: "testowner",
                    email: "test@example.com",
                    fullName: "Test Owner",
                    phonenumber: "1234567890",
                    password: "password123",
                    role: "salonOwner"
                });
                console.log("Created a new test owner user.");
            }
        } else {
            console.log(`Using existing salon owner "${owner.username}".`);
        }

        const sampleSalons = [
            {
                name: "The Velvet Lounge",
                city: "Kolkata",
                description: "Experience luxury grooming and world-class styling in a serene environment. Our experts specialize in modern cuts and classic charm.",
                address: "Park Street, Kolkata, West Bengal",
                openingHours: "09:00 AM",
                closingHours: "08:00 PM",
                images: ["https://images.unsplash.com/photo-1560066984-138dadb4c035?auto=format&fit=crop&w=800&q=80"],
                owner: owner._id,
                rating: 4.8
            },
            {
                name: "Urban Fade Studio",
                city: "Kolkata",
                description: "The ultimate destination for urban styles and precision fades. We bring the latest trends to your neighborhood.",
                address: "Salt Lake Sector V, Kolkata, West Bengal",
                openingHours: "10:00 AM",
                closingHours: "09:00 PM",
                images: ["https://images.unsplash.com/photo-1532710093739-9470acff878f?auto=format&fit=crop&w=800&q=80"],
                owner: owner._id,
                rating: 4.5
            },
            {
                name: "Zen Oasis Spa & Salon",
                city: "Mumbai",
                description: "Rejuvenate your soul with our organic hair treatments and calming spa services. Natural beauty redefined.",
                address: "Ballygunge Circular Road, Mumbai, Maharashtra",
                openingHours: "08:00 AM",
                closingHours: "07:00 PM",
                images: ["https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?auto=format&fit=crop&w=800&q=80"],
                owner: owner._id,
                rating: 4.9
            },
            {
                name: "Glow & Go Express",
                city: "Delhi",
                description: "Quick, efficient, and stunning beauty services for the busy professional. Quality results in record time.",
                address: "New Town, Delhi",
                openingHours: "09:00 AM",
                closingHours: "08:30 PM",
                images: ["https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?auto=format&fit=crop&w=800&q=80"],
                owner: owner._id,
                rating: 4.2
            }
        ];

        // 2. Optional: Clear existing salons
        await Salon.deleteMany({}); 

        // 3. Insert sample salons
        await Salon.insertMany(sampleSalons);

        console.log(`Successfully seeded ${sampleSalons.length} salons!`);
        process.exit(0);
    } catch (error) {
        console.error("Error seeding salons:", error);
        process.exit(1);
    }
};

seedSalons();
