import { Footer } from "../components/footerPage.jsx";

export function SignUpPage() {
    return (
        <>
            <div className="bg-white flex justify-center h-screen">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md mt-4 mb-4">

                    <h1 className="text-black text-3xl font-bold text-center mb-6">Sign Up</h1>

                    <form action="/signup" method="POST" className="space-y-4">

                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-black text-sm font-medium mb-1">
                                Username
                            </label>
                            <input
                                name="username"
                                id="username"
                                type="text"
                                className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-black text-sm font-medium mb-1">
                                Email
                            </label>
                            <input
                                name="email"
                                id="email"
                                type="email"
                                className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        {/* Full Name */}
                        <div>
                            <label htmlFor="fullName" className="block text-black text-sm font-medium mb-1">
                                Full Name
                            </label>
                            <input
                                name="fullName"
                                id="fullName"
                                type="text"
                                className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        {/* Avatar */}
                        <div>
                            <label htmlFor="formFile" className="block text-black text-sm font-medium mb-1">
                                Avatar
                            </label>
                            <input
                                name="avatar"
                                id="formFile"
                                type="file"
                                className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-black text-sm font-medium mb-1">
                                Password
                            </label>
                            <input
                                name="password"
                                id="password"
                                type="password"
                                className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        {/* Role */}
                        <div>
                            <label htmlFor="Role" className="block text-black text-sm font-medium mb-1">
                                Role
                            </label>
                            <select
                                name="role"
                                id="Role"
                                className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            >
                                <option value="customer">Customer</option>
                                <option value="staff">Staff</option>
                                <option value="salonOwner">Salon Owner</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-full transition"
                        >
                            Sign Up
                        </button>

                    </form>
                </div>
            </div>

            <Footer />
        </>
    );
}     
