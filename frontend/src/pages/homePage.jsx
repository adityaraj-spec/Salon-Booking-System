import { NavBar } from '../components/navPage.jsx';
import { Footer } from '../components/footerPage.jsx';
import { Shops } from './shops-grid.jsx';

export function HomePage() {
    return (
        <div className="min-h-screen flex flex-col">
            <NavBar />
            <main className="flex-1">
                <Shops />
            </main>
            <Footer />
        </div>
    );
}