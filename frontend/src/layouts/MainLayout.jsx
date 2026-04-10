import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { NavBar } from '../components/navPage';
import { Footer } from '../components/footerPage';

const MainLayout = () => {
    const location = useLocation();
    const isLandingPage = location.pathname === '/';

    return (
        <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans selection:bg-[#D4AF37]/30 selection:text-black">
            <NavBar />
            
            <main className={`flex-1 w-full relative ${isLandingPage ? '' : 'pt-20'}`}>
                <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="w-full"
                >
                    <Outlet />
                </motion.div>
            </main>

            <Footer />
        </div>
    );
};

export default MainLayout;
