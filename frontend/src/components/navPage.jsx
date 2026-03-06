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
                    <ul className="nav nav-pills">
                        <li className="nav-item">
                            <NavLink className="nav-link active" aria-current="page" to="/login">
                               Login
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/signup">
                                SignUp
                            </NavLink>
                        </li>
                        <li className="nav-item">
                            <NavLink className="nav-link" to="/logout">
                                Logout
                            </NavLink>
                        </li>
                    </ul>
                </div>
            </nav> */}
            <nav className="bg-white shadow-md">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="flex justify-between items-center h-16">

                        {/* Logo */}
                        <div className="text-2xl font-bold text-blue-600">
                            Salon Now
                        </div>

                        {/* Menu Links */}
                        <div className="hidden md:flex space-x-8 text-gray-700">
                            <a href="#" className="hover:text-blue-600">Home</a>
                            <a href="#" className="hover:text-blue-600">About</a>
                            <a href="#" className="hover:text-blue-600">Services</a>
                            <a href="#" className="hover:text-blue-600">Contact</a>
                        </div>

                        {/* Button */}
                        <div>
                            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition">
                                Login
                            </button>
                        </div>

                    </div>
                </div>
            </nav>
        </>
    );
}