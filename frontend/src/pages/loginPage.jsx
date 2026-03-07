export function LoginPage() {
    return (
        <>
            <div className="bg-white flex justify-center h-screen">
                <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md mt-4 mb-4">

                    <h1 className="text-black text-3xl font-bold text-center mb-6">
                        Login
                    </h1>

                    <form method="POST" action="/login" className="space-y-4">

                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-black text-sm font-medium mb-1">
                                Username
                            </label>
                            <input
                                name="username"
                                id="username"
                                type="text"
                                placeholder="Enter a valid username"
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
                                placeholder="Enter a valid email"
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
                                placeholder="Enter a valid password"
                                className="w-full border rounded-lg text-black p-2 focus:outline-none focus:ring-2 focus:ring-black"
                            />
                        </div>

                        {/* Button */}
                        <button className="w-full bg-pink-500 hover:bg-pink-600 text-white font-semibold py-3 rounded-full">
                            Login
                        </button>

                    </form>

                </div>
            </div>
        </>
    );
}