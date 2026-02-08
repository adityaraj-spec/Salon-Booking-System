import { Footer } from "../components/footerPage.jsx";

export function SignUpPage() {
    return (
        <>
            <div className="row mt-3 mb-3">
                <h1 className="col-8 offset-3">Sign Up</h1>
                <div className="col-8 offset-3">
                    <form action="/signup" method="POST">
                        <div className="mb-3">
                            <label htmlFor="username" className="form-label">Username</label>
                            <input name="username" id="username" type="text" className="form-control" />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="email" className="form-label">Email</label>
                            <input name="email" id="email" type="email" className="form-control" />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="fullName" className="form-label">Full Name</label>
                            <input name="fullName" id="fullName" type="text" className="form-control" />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="formFile" className="form-label">Avatar</label>
                            <input name="avatar" className="form-control" type="file" id="formFile" />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input name="password" id="password" type="password" className="form-control" />
                        </div>
                        <div className="mb-3">
                            <label htmlFor="Role" className="form-label">Role</label>
                            <select name="role" className="form-select" aria-label="Default select example">
                                <option value="customer">Customer</option>
                                <option value="staff">Staff</option>
                                <option value="salonOwner">Salon Owner</option>
                            </select>
                        </div>
                        <button type="submit" className="btn btn-dark ">Sign Up</button>
                    </form>
                </div>
            </div>

            <Footer />
        </>
    );
}     
