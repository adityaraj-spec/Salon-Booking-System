import React from 'react';
import { ExternalLink } from 'lucide-react';

export function MapPlaceholder() {
    return (
        <div className="w-full h-full flex items-center justify-center bg-gray-50 p-4 md:p-8">
            {/* Map Preview Card - Styled exactly like the user's reference */}
            <div className="w-full max-w-md bg-white rounded-[32px] border border-gray-100 shadow-xl shadow-black/5 overflow-hidden transition-transform duration-500 hover:scale-[1.02] cursor-pointer group">
                {/* Map Image Area */}
                <div className="relative h-64 w-full bg-[#f0f0f0] overflow-hidden">
                    <img 
                        src="/google_map_snippet_mockup_1775851699415.png" 
                        alt="Map Preview" 
                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                    />
                    
                    {/* Subtle Overlay Gradients */}
                    <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/05 to-transparent pointer-events-none"></div>

                    {/* Logo Mockup (optional but adds realism) */}
                    <div className="absolute bottom-4 left-4">
                        <span className="text-xl font-bold tracking-tight text-gray-400 opacity-50 select-none">Google</span>
                    </div>
                </div>

                {/* Footer Link Area */}
                <div className="bg-white py-5 flex items-center justify-center border-t border-gray-50">
                    <button className="flex items-center gap-2 text-[#ff8c00] font-semibold text-lg hover:text-[#e67e00] transition-colors tracking-wide">
                        View on Map
                        <ExternalLink size={16} strokeWidth={2.5} className="opacity-70" />
                    </button>
                </div>
            </div>
        </div>
    );
}
