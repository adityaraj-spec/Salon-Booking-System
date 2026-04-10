import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { ArrowRight, Star, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useUI } from "../context/UIContext";

const heroImages = [
    { url: "/adam-winger-KVVjmb3IIL8-unsplash.jpg", isDark: true },
    { url: "/benyamin-bohlouli-_C-S7LqxHPw-unsplash.jpg", isDark: false },
    { url: "/greg-trowman-jsuWg7IXx1k-unsplash.jpg", isDark: true },
    { url: "/guilherme-petri-PtOfbGkU3uI-unsplash.jpg", isDark: false }
];

const projectList = [
    {
        id: 1,
        image: "/adam-winger-KVVjmb3IIL8-unsplash.jpg",
        description: "Professional grooming tools and premium hairstyling for a modern look."
    },
    {
        id: 2,
        image: "/david-trinks-fTxpLS0i9H4-unsplash.jpg",
        description: "Classic straight razor shaves and precision beard grooming."
    },
    {
        id: 3,
        image: "/shari-sirotnak-oM5YoMhTf8E-unsplash.jpg",
        description: "State-of-the-art equipment for the perfect salon experience."
    },
    {
        id: 4,
        image: "/taylor-heery-_TyrA1RUaiI-unsplash.jpg",
        description: "Relaxing therapeutic treatments and luxury spa services."
    },
    {
        id: 5,
        image: "/rosa-rafael-Pe9IXUuC6QU-unsplash.jpg",
        description: "Personalized skincare and facial treatments for a radiant glow."
    }
];

const serviceData = {
    'Haircut': [
        { name: 'Classic Haircut', img: '/adam-winger-KVVjmb3IIL8-unsplash.jpg' },
        { name: 'Fade Style', img: '/istockphoto-1255774805-1024x1024.jpg' },
        { name: 'Scissor Cut', img: '/istockphoto-1333978076-1024x1024.jpg' },
        { name: 'Buzz Cut', img: '/istockphoto-1590247969-1024x1024.jpg' }
    ],
    'Shaving': [
        { name: 'Hot Towel Shave', img: '/david-trinks-fTxpLS0i9H4-unsplash.jpg' },
        { name: 'Clean Shave', img: '/istockphoto-872361244-1024x1024.jpg' },
        { name: 'Beard Grooming', img: '/istockphoto-2199596955-1024x1024.jpg' },
        { name: 'Mustache Trim', img: '/istockphoto-2257621132-1024x1024.jpg' }
    ],
    'Trimming': [
        { name: 'Beard Trimming', img: '/istockphoto-532028212-1024x1024.jpg' },
        { name: 'Edge Up', img: '/shari-sirotnak-oM5YoMhTf8E-unsplash.jpg' },
        { name: 'Neck Clean', img: '/istockphoto-1158069594-1024x1024.jpg' },
        { name: 'Line Up', img: '/istockphoto-2199596955-1024x1024.jpg' }
    ],
    'Hairstyling': [
        { name: 'Blowout', img: '/giorgio-trovato-wSpkThmoZQc-unsplash.jpg' },
        { name: 'Coloring', img: '/rosa-rafael-Pe9IXUuC6QU-unsplash.jpg' },
        { name: 'Perm', img: '/engin-akyurt-g-m8EDc4X6Q-unsplash.jpg' },
        { name: 'Keratin Treatment', img: '/taylor-heery-_TyrA1RUaiI-unsplash.jpg' }
    ]
};

export function LandingPage() {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [activeProject, setActiveProject] = useState(1);
    const [activeCategory, setActiveCategory] = useState("Haircut");
    const { setNavbarTheme } = useUI();

    const currentHero = heroImages[currentImageIndex];
    const isDark = currentHero.isDark;

    useEffect(() => {
        setNavbarTheme(isDark ? 'dark' : 'light');
    }, [isDark, setNavbarTheme]);

    const nextProject = () => setActiveProject(prev => (prev + 1) % projectList.length);
    const prevProject = () => setActiveProject(prev => (prev - 1 + projectList.length) % projectList.length);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % heroImages.length);
        }, 6000); // Slightly longer interval for premium feel
        return () => clearInterval(interval);
    }, []);

    const fadeUpVariants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: "easeOut" } }
    };

    const staggerContainer = {
        hidden: { opacity: 0 },
        visible: {
            opacity: 1,
            transition: {
                staggerChildren: 0.2
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#fafafa] font-sans">
            {/* HERO SECTION */}
            <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden transition-colors duration-1000">
                <AnimatePresence mode="popLayout" initial={false}>
                    <motion.div
                        key={currentHero.url}
                        initial={{ x: "-100%" }}
                        animate={{ x: 0 }}
                        exit={{ x: "100%" }}
                        transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
                        className="absolute inset-0 bg-cover bg-center"
                        style={{ backgroundImage: `url('${currentHero.url}')` }}
                    />
                </AnimatePresence>

                {/* Dynamic Overlay */}
                <div className={`absolute inset-0 z-0 transition-opacity duration-1000 ${isDark ? 'bg-black/40' : 'bg-white/20'}`}></div>
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent z-0"></div>

                <motion.div
                    variants={staggerContainer}
                    initial="hidden"
                    animate="visible"
                    className="relative z-10 px-6 max-w-4xl mx-auto flex flex-col items-center pt-16"
                >
                    <motion.h1
                        variants={fadeUpVariants}
                        className={`text-5xl md:text-7xl font-bold mb-6 leading-tight transition-colors duration-1000 ${isDark ? 'text-white' : 'text-gray-900'}`}
                    >
                        Your Beauty,<br />
                        <span className="text-[#ff9f43]">Our Priority</span>
                    </motion.h1>
                    <motion.p
                        variants={fadeUpVariants}
                        className={`text-lg md:text-xl mb-10 max-w-2xl font-light transition-colors duration-1000 ${isDark ? 'text-gray-200' : 'text-gray-700'}`}
                    >
                        Discover and book appointments with top-rated salons in your city.<br className="hidden md:block" /> Professional beauty services at your fingertips.
                    </motion.p>
                    <motion.div variants={fadeUpVariants} className="flex flex-col sm:flex-row gap-5">
                        <NavLink
                            to="/home"
                            className={`px-8 py-4 rounded-full font-medium flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#1a1a1a] text-white hover:bg-black'
                                }`}
                        >
                            Browse Salons <ArrowRight size={18} />
                        </NavLink>
                        <NavLink
                            to="/signup"
                            className={`px-8 py-4 rounded-full font-medium transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300 border ${isDark
                                ? 'border-white/80 text-white hover:bg-white/10'
                                : 'border-black/80 text-black hover:bg-black/5'
                                }`}
                        >
                            Sign Up Now
                        </NavLink>
                    </motion.div>
                </motion.div>
            </section>

            {/* SERVICES SECTION */}
            <section id="services" className="py-24 bg-white px-6 pt-40 scroll-mt-20">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="max-w-6xl mx-auto"
                >
                    <motion.div variants={fadeUpVariants} className="text-center mb-12">
                        <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3">Services</h2>
                        <p className="text-gray-500 font-light text-sm max-w-md mx-auto">
                            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Cras eu dui nisl. Maecenas posuere
                        </p>
                    </motion.div>

                    {/* Tabs */}
                    <motion.div variants={fadeUpVariants} className="flex flex-wrap justify-center gap-4 mb-14">
                        {Object.keys(serviceData).map((category) => (
                            <div
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`${activeCategory === category ? 'bg-[#ff9f43] text-white shadow-md' : 'bg-[#222222] text-white hover:bg-gray-800'} px-10 py-2.5 rounded-lg font-medium text-sm cursor-pointer transition`}
                            >
                                {category}
                            </div>
                        ))}
                    </motion.div>

                    {/* Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 min-h-[300px]">
                        <AnimatePresence mode="popLayout">
                            {serviceData[activeCategory].map((service, idx) => (
                                <motion.div
                                    key={service.name + activeCategory}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ duration: 0.3 }}
                                    className="flex flex-col items-center"
                                >
                                    <img src={service.img} alt={service.name} className="w-full aspect-[4/5] object-cover rounded-2xl mb-4 shadow-sm" />
                                    <h3 className="font-bold text-[#1a1a1a] text-center">{service.name}</h3>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                </motion.div>
            </section>

            {/* OUR PROJECT SECTION */}
            <section id="projects" className="py-24 bg-white px-6 pt-40 scroll-mt-20 border-t border-gray-50">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="max-w-6xl mx-auto"
                >
                    <div className="flex justify-between items-end mb-12">
                        <motion.div variants={fadeUpVariants}>
                            <h2 className="text-3xl font-bold text-[#1a1a1a] mb-2">Our Project</h2>
                            <p className="text-gray-500 font-light text-sm">
                                Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                            </p>
                        </motion.div>
                        <motion.div variants={fadeUpVariants} className="flex gap-2 relative z-30 pt-10">
                            <button onClick={prevProject} className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-md hover:bg-gray-800 transition shadow-lg">
                                <ChevronLeft size={20} />
                            </button>
                            <button onClick={nextProject} className="w-10 h-10 bg-black text-white flex items-center justify-center rounded-md hover:bg-gray-800 transition shadow-lg">
                                <ChevronRight size={20} />
                            </button>
                        </motion.div>
                    </div>

                    <div className="relative w-full overflow-hidden py-10 h-[450px] md:h-[550px] flex items-center justify-center">
                        {projectList.map((proj, idx) => {
                            let offset = idx - activeProject;
                            const total = projectList.length;

                            // Unravel circular offset logically
                            if (offset > Math.floor(total / 2)) {
                                offset -= total;
                            } else if (offset < -Math.floor(total / 2)) {
                                offset += total;
                            }

                            const dist = Math.abs(offset);
                            const isActive = offset === 0;

                            const x = `${offset * 105}%`;
                            const scale = isActive ? 1.05 : (dist === 1 ? 0.95 : 0.8);
                            const zIndex = 10 - dist;
                            const opacity = isActive ? 1 : (dist === 1 ? 0.6 : 0);

                            return (
                                <motion.div
                                    key={proj.id}
                                    initial={false}
                                    animate={{ x, scale, zIndex, opacity }}
                                    transition={{ duration: 0.3, ease: "easeInOut" }}
                                    style={{ pointerEvents: dist > 1 ? 'none' : 'auto' }}
                                    onClick={() => { if (dist !== 0) setActiveProject(idx); }}
                                    className="absolute w-[75%] md:w-[30%] aspect-[3/4] md:aspect-[4/5] rounded-2xl overflow-hidden shadow-xl cursor-pointer bg-black"
                                >
                                    <img src={proj.image} alt={`Project ${proj.id}`} className="w-full h-full object-cover" />

                                    <div className={`absolute inset-0 transition-opacity duration-500 ${isActive ? 'bg-gradient-to-t from-black via-black/40 to-transparent' : 'bg-gradient-to-t from-black/80 to-transparent'}`}></div>

                                    {isActive && (
                                        <>
                                            <div className="absolute top-1/2 left-6 -translate-y-1/2 cursor-pointer z-50" onClick={(e) => { e.stopPropagation(); nextProject(); }}>
                                                <div className="w-10 h-10 bg-[#ff9f43] rounded-full flex items-center justify-center text-white shadow-lg  hover:scale-110 transition-transform">
                                                    <ChevronRight size={20} />
                                                </div>
                                            </div>

                                            <div className="absolute bottom-0 left-0 w-full p-8 text-white">
                                                <hr className="border-white/30 mb-4" />
                                                <p className="font-bold text-lg mb-2 leading-snug">
                                                    {proj.description}
                                                </p>
                                                <p className="text-xs text-gray-300">
                                                    Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed
                                                </p>
                                            </div>
                                        </>
                                    )}
                                </motion.div>
                            )
                        })}
                    </div>
                </motion.div>
            </section>

            {/* TESTIMONIALS SECTION */}
            <section className="py-24 bg-[#fafafa] px-6">
                <motion.div
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, margin: "-100px" }}
                    variants={staggerContainer}
                    className="max-w-6xl mx-auto"
                >
                    <motion.div variants={fadeUpVariants} className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-[#1a1a1a] mb-3">What our Client Says About Us</h2>
                        <p className="text-gray-500 font-light text-sm max-w-sm mx-auto">
                            Lorem Ipsum is simply dummy text of the printing and typesetting industry.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Testimonial 1 */}
                        <motion.div variants={fadeUpVariants} className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] relative border border-gray-50">
                            <div className="flex gap-1 text-[#ffc107] mb-6">
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} className="text-gray-300" />
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-8 relative z-10">
                                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
                            </p>
                            <div className="flex items-center gap-4">
                                <img src="https://randomuser.me/api/portraits/women/44.jpg" alt="Kristan Watson" className="w-12 h-12 rounded-lg object-cover" />
                                <div>
                                    <h4 className="font-bold text-[#1a1a1a] text-sm">Kristan Watson</h4>
                                    <p className="text-xs text-gray-500">Business Manager</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Testimonial 2 */}
                        <motion.div variants={fadeUpVariants} className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] relative border border-gray-50">
                            <div className="flex gap-1 text-[#ffc107] mb-6">
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} className="text-gray-300" />
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-8 relative z-10">
                                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
                            </p>
                            <div className="flex items-center gap-4">
                                <img src="https://randomuser.me/api/portraits/women/68.jpg" alt="Kristan Watson" className="w-12 h-12 rounded-lg object-cover" />
                                <div>
                                    <h4 className="font-bold text-[#1a1a1a] text-sm">Kristan Watson</h4>
                                    <p className="text-xs text-gray-500">Ui Developer</p>
                                </div>
                            </div>
                        </motion.div>

                        {/* Testimonial 3 */}
                        <motion.div variants={fadeUpVariants} className="bg-white rounded-2xl p-8 shadow-[0_4px_20px_rgba(0,0,0,0.05)] relative border border-gray-50">
                            <div className="flex gap-1 text-[#ffc107] mb-6">
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} />
                                <Star fill="currentColor" size={18} className="text-gray-300" />
                            </div>
                            <p className="text-gray-600 text-sm leading-relaxed mb-8 relative z-10">
                                Lorem Ipsum is simply dummy text of the printing and typesetting industry. Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.
                            </p>
                            <div className="flex items-center gap-4">
                                <img src="https://randomuser.me/api/portraits/men/32.jpg" alt="Kristan Watson" className="w-12 h-12 rounded-lg object-cover" />
                                <div>
                                    <h4 className="font-bold text-[#1a1a1a] text-sm">Kristan Watson</h4>
                                    <p className="text-xs text-gray-500">Business Ceo</p>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* READY TO GET STARTED CTA */}
            <section className="py-24 bg-[#111111] px-6 text-center overflow-hidden relative">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className="max-w-3xl mx-auto flex flex-col items-center relative z-10"
                >
                    <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                        Ready to Get Started?
                    </h2>
                    <p className="text-gray-400 text-sm mb-10 font-light">
                        Join thousands of satisfied customers who book their beauty appointments with us.
                    </p>
                    <NavLink to="/home" className="bg-[#ff9f43] text-white px-8 py-3 rounded-full font-medium flex items-center justify-center gap-2 hover:bg-orange-500 transition-colors shadow-lg hover:shadow-xl transform hover:-translate-y-1 duration-300">
                        Start Booking Now
                    </NavLink>
                </motion.div>
            </section>
        </div>
    );
}
