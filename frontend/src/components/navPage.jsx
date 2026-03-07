import { NavLink } from 'react-router';

export function NavBar() {
    return (
        <>
            {/* <nav className="navbar navbar-expand-lg bg-body-tertiary fixed-top">
                <div className="container-fluid">
                    <NavLink className="navbar-brand" to="/">
                        Salon Now
                    </NavLink>
                    <form className="d-flex" role="search">
                        <input className="form-control me-2" type="search" placeholder="Search" aria-label="Search" />
                        <button className="btn btn-outline-success" type="submit">Search</button>
                    </form>
                </div>
            </nav> */}
            <nav className="bg-white shadow-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo */}
                        <NavLink className="navbar-brand" to="/">
                            <div className="text-2xl font-bold text-pink-500">
                                Salon Now
                            </div>
                        </NavLink>

                        <form className="flex items-center border border-gray-300 rounded-full shadow-sm hover:shadow-md px-2 py-1 bg-white max-w-xl">

                            <input
                                type="search"
                                placeholder="Search..."
                                aria-label="Search"
                                className="grow px-4 py-2 outline-none text-gray-700 bg-transparent"
                            />

                            <button
                                type="submit"
                                className="bg-pink-500 hover:bg-pink-600 text-white p-3 rounded-full flex items-center justify-center transition"
                            >
                            </button>

                        </form>

                        {/* Button */}
                        <ul className=" flex space-x-4">
                            <li className="">
                                <NavLink className="text-black px-4 py-2 hover:text-gray-500 transition" aria-current="page" to="/login">
                                    Login
                                </NavLink>
                            </li>
                            <li className="">
                                <NavLink className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition" to="/signup">
                                    SignUp
                                </NavLink>
                            </li>
                            <li className="">
                                <NavLink className="bg-pink-500 text-white px-4 py-2 rounded-lg hover:bg-pink-600 transition" to="/logout">
                                    Logout
                                </NavLink>
                            </li>
                        </ul>
                    </div>
                </div>
            </nav>
        </>
    );
}