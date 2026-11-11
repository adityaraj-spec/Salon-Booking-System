import { Link } from "react-router-dom";
import { Scissors, ArrowLeft, Search, Home } from "lucide-react";
import useDocumentTitle from "../hooks/useDocumentTitle";

export function NotFoundPage() {
  useDocumentTitle("404 - Page Not Found", "The requested page could not be found on SalonNow.");

  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6 py-16 font-sans">
      <div className="max-w-md w-full text-center">
        {/* Animated Icon Badge */}
        <div className="relative inline-block mb-6">
          <div className="w-20 h-20 rounded-full bg-[#1a1a1a] flex items-center justify-center text-[#D4AF37] shadow-xl border border-[#D4AF37]/30 mx-auto">
            <Scissors size={36} className="rotate-45" />
          </div>
          <span className="absolute -bottom-1 -right-1 bg-[#D4AF37] text-[#1a1a1a] text-xs font-black px-2 py-0.5 rounded-full shadow-md">
            404
          </span>
        </div>

        {/* Headline & Description */}
        <h1 className="text-3xl sm:text-4xl font-sans font-bold text-gray-900 tracking-tight mb-3">
          Page Not Found
        </h1>
        <p className="text-gray-500 text-sm leading-relaxed mb-8 max-w-sm mx-auto">
          We couldn&apos;t find the page you were looking for. It might have been moved, renamed, or is temporarily unavailable.
        </p>

        {/* Action Buttons: Stacked on mobile, side-by-side on sm+ */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
          <Link
            to="/"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-bold text-sm bg-[#1a1a1a] text-white hover:bg-black transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
          >
            <Home size={16} />
            <span>Back to Home</span>
          </Link>
          <Link
            to="/home"
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl font-semibold text-sm bg-white border border-gray-200 text-gray-800 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm active:scale-95 flex items-center justify-center gap-2"
          >
            <Search size={16} className="text-[#D4AF37]" />
            <span>Discover Salons</span>
          </Link>
        </div>

        {/* Quick Links Help */}
        <div className="mt-12 pt-8 border-t border-gray-100 text-xs text-gray-400">
          Need help? <Link to="/home" className="text-[#8a6500] hover:underline font-medium">Explore popular destinations</Link> or check your <Link to="/bookings" className="text-[#8a6500] hover:underline font-medium">bookings</Link>.
        </div>
      </div>
    </div>
  );
}

export default NotFoundPage;

