import { NavBar } from '../components/navPage.jsx'
import { Footer } from '../components/footerPage.jsx'
import { Shops } from './shops-grid.jsx'

export function HomePage() {
    return (
        <>
           <NavBar />
            <Shops />
           <Footer />
        </>
    );
}