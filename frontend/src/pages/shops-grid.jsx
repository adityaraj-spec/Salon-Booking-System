import { NavLink } from 'react-router';
import salon1 from "../assets/salon1.jpg";
import salon2 from "../assets/salon2.jpg";
import salon3 from "../assets/salon3.jpg";
import salon4 from "../assets/salon4.jpg";
import salon5 from "../assets/salon5.avif";
import "./shops-grid.css";

export function Shops() {
    return (
        <>
            <div className="container main-content">
                <div className="row justify-content-center">
                    <div className="col-md-3 mb-4 d-flex justify-content-center">
                        <div className="card card-info" >
                            <NavLink to="/shop">
                                <img src={salon1} className="card-img-top" alt="..." />
                                <div className="card-body">
                                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card’s content.</p>
                                </div>
                            </NavLink>
                        </div>
                    </div>
                    <div className="col-md-3 mb-4 d-flex justify-content-center">
                        <div className="card card-info" >
                           <NavLink to="/shop">
                                <img src={salon2} className="card-img-top" alt="..." />
                                <div className="card-body">
                                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card’s content.</p>
                                </div>
                            </NavLink> 
                        </div>
                    </div>
                    <div className="col-md-3 mb-4 d-flex justify-content-center">
                        <div className="card card-info" >
                            <NavLink to="/shop">
                                <img src={salon3} className="card-img-top" alt="..." />
                                <div className="card-body">
                                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card’s content.</p>
                                </div>
                            </NavLink>
                        </div>
                    </div>
                    <div className="col-md-3 mb-4 d-flex justify-content-center">
                        <div className="card card-info" >
                            <NavLink to="/shop">
                                <img src={salon4} className="card-img-top" alt="..." />
                                <div className="card-body">
                                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card’s content.</p>
                                </div>
                            </NavLink>
                        </div>
                    </div>
                    <div className="col-md-3 mb-4 d-flex justify-content-center">
                        <div className="card card-info" >
                            <NavLink to="/shop">
                                <img src={salon5} className="card-img-top" alt="..." />
                                <div className="card-body">
                                    <p className="card-text">Some quick example text to build on the card title and make up the bulk of the card’s content.</p>
                                </div>
                            </NavLink>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}