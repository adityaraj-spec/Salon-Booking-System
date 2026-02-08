import "./loginPage.css";

export function LoginPage() {
    return (
        <>
            <div className=" col-6 offset-3 row mt-3 mb-3 login-form">
                <h1 className="col-8 offset-3 ">
                    Login</h1>
                <div className="col-8 offset-3 ">
                    <form method="POST" action="/login" >
                        <div className="mb-3">
                            <label htmlFor="username" className="form-label" >Username</label>
                            <input name="username" id="username" type="text" placeholder="Enter a valid username" className="form-control" />
                        </div>
                        <div className="mb-3 ">
                            <label htmlFor="email" className="form-label" >Email</label>
                            <input name="email" id="email" type="email" placeholder="Enter a valid email" className="form-control" />
                        </div>
                        <div className="mb-3 ">
                            <label htmlFor="password" className="form-label" >Password</label>
                            <input name="password" id="password" type="password" placeholder="Enter a valid password" className="form-control" />
                        </div>
                        <button className="btn btn-dark mb-3">Login</button>
                    </form>
                </div>
            </div>
        </>
    );
}