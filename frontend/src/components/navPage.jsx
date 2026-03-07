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
            <nav className="bg-white shadow-md">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo */}
                        <NavLink className="navbar-brand" to="/">
                            <div className="text-2xl font-bold text-blue-600">
                                Salon Now
                            </div>
                        </NavLink>

                        <form className="flex space-x-2" role="search">
                            <input className="text-black border border-gray-300 rounded-full py-2 px-4 focus:outline-none focus:ring-2 focus:ring-black" type="search" placeholder="Search..." aria-label="Search" />
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-full hover:bg-blue-700 transition" type="submit">Search</button>
                        </form>

                        {/* Button */}
                        <ul className=" flex space-x-4">
                            <li className="">
                                <NavLink className="text-black px-4 py-2 hover:text-gray-500 transition" aria-current="page" to="/login">
                                    Login
                                </NavLink>
                            </li>
                            <li className="">
                                <NavLink className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" to="/signup">
                                    SignUp
                                </NavLink>
                            </li>
                            <li className="">
                                <NavLink className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition" to="/logout">
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