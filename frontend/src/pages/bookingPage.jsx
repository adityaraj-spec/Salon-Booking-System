import { Footer } from "../components/footerPage";
import { useState } from "react";
export function BookingPage() {
    const [service, setService] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [name, setName] = useState("");
    const [phone, setPhone] = useState("");

    const services = [
        "Haircut",
        "Beard Trim",
        "Hair Styling",
        "Facial",
        "Hair Coloring"
    ];

    const times = [
        "10:00 AM",
        "11:00 AM",
        "12:00 PM",
        "1:00 PM",
        "3:00 PM",
        "4:00 PM",
        "5:00 PM"
    ];

    const handleSubmit = (e) => {
        e.preventDefault();

        const booking = {
            name,
            phone,
            service,
            date,
            time,
        };

        console.log("Booking Data:", booking);
        alert("Appointment Booked!");
    };

    return (
    <>
        <div className="min-h-screen bg-gray-100 flex justify-center items-center p-6">
            <div className="bg-white shadow-lg rounded-xl w-full max-w-lg p-8">

                <h2 className="text-black text-2xl font-bold mb-6 text-center">
                    Book Appointment
                </h2>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Name */}
                    <div>
                        <label className="text-black block mb-1 font-medium">Full Name</label>
                        <input
                            type="text"
                            required
                            className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* Phone */}
                    <div>
                        <label className="text-black block mb-1 font-medium">Phone</label>
                        <input
                            type="tel"
                            required
                            className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                        />
                    </div>

                    {/* Service */}
                    <div>
                        <label className="text-black block mb-1 font-medium">Select Service</label>
                        <select
                            required
                            className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            value={service}
                            onChange={(e) => setService(e.target.value)}
                        >
                            <option value="">Choose service</option>
                            {services.map((s, i) => (
                                <option key={i} value={s}>
                                    {s}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Date */}
                    <div>
                        <label className="text-black block mb-1 font-medium">Select Date</label>
                        <input
                            type="date"
                            required
                            className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                        />
                    </div>

                    {/* Time */}
                    <div>
                        <label className="text-black block mb-1 font-medium">Select Time</label>
                        <div className="grid grid-cols-3 gap-2">
                            {times.map((t, i) => (
                                <button
                                    type="button"
                                    key={i}
                                    onClick={() => setTime(t)}
                                    className={`p-2 border rounded-lg ${time === t
                                            ? "bg-gray-500 text-black rounded-lg border-none"
                                            : "bg-black text-white rounded-lg hover:bg-gray-800"
                                        }`}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Button */}
                    <button
                        type="submit"
                        className="w-full bg-black text-white py-3 rounded-lg hover:bg-gray-800"
                    >
                        Confirm Booking
                    </button>

                </form>
            </div>
        </div>
        <Footer />
    </>
    );
}