export function Footer() {
    return (
        <>
            <footer className="bg-dark text-light py-4 mt-auto">
                <div className="container">
                    <div className="row">
                        <div className="col-md-4">
                            <h5>Salon Now</h5>
                            <p className="small">
                                Building modern web applications using React and Bootstrap.
                            </p>
                        </div>
                        <div className="col-md-4">
                            <ul className="list-unstyled">
                                <li>
                                    <a href="#" className="text-light text-decoration-none">Home</a>
                                </li>
                                <li>
                                    <a href="#" className="text-light text-decoration-none">About</a>
                                </li>
                                <li>
                                    <a href="#" className="text-light text-decoration-none">Services</a>
                                </li>
                                <li>
                                    <a href="#" className="text-light text-decoration-none">Contact</a>
                                </li>
                            </ul>
                        </div>
                        <div className="col-md-4">
                            <h5>Contact</h5>
                            <p className="small mb-1">Email: support@example.com</p>
                            <p className="small mb-1">Phone: +91 9876543210</p>
                            <p className="small">Location: India</p>
                        </div>

                    </div>
                    <hr className="border-light" />
                    <div className="text-center">
                        <p className="mb-0 small">
                            &copy;{new Date().getFullYear()} Salon Now. All rights reserved.
                        </p>
                    </div>

                </div>
            </footer>
        </>
    );
}
  