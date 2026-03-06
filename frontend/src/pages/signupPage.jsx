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
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                className="w-full text-sm text-gray-500 border border-gray-300 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
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
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400"
                            >
                                <option value="customer">Customer</option>
                                <option value="staff">Staff</option>
                                <option value="salonOwner">Salon Owner</option>
                            </select>
                        </div>

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition"
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
